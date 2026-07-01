import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function makeAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function verifyPlatformAdmin(
  admin: ReturnType<typeof makeAdminClient>,
  req: NextRequest
): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return false

  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user?.email) return false

  const { data } = await admin
    .from('staff')
    .select('role')
    .eq('email', user.email)
    .single()

  return data?.role === 'platform_admin'
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function GET(req: NextRequest) {
  const admin = makeAdminClient()
  if (!(await verifyPlatformAdmin(admin, req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: tenants, error } = await admin
    .from('tenants')
    .select('id, name, slug, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach staff count to each tenant
  const withCounts = await Promise.all(
    (tenants ?? []).map(async t => {
      const { count } = await admin
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', t.id)
      return { ...t, staffCount: count ?? 0 }
    })
  )

  return NextResponse.json(withCounts)
}

export async function POST(req: NextRequest) {
  const admin = makeAdminClient()
  if (!(await verifyPlatformAdmin(admin, req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { restaurantName, slug: rawSlug, adminName, adminEmail, adminPassword } = body ?? {}

  if (!restaurantName || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json(
      { error: 'restaurantName, adminName, adminEmail, and adminPassword are required' },
      { status: 400 }
    )
  }
  if (adminPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const slug = rawSlug ? slugify(rawSlug) : slugify(restaurantName)

  // 1. Create tenant
  const { data: tenant, error: tenantErr } = await admin
    .from('tenants')
    .insert({ name: restaurantName, slug })
    .select('id, name, slug, created_at')
    .single()

  if (tenantErr) {
    const msg = tenantErr.message.includes('unique') || tenantErr.code === '23505'
      ? `Slug "${slug}" is already taken. Try a different name or slug.`
      : tenantErr.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 2. Create auth user for the restaurant admin
  const { error: authErr } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  })

  if (authErr) {
    await admin.from('tenants').delete().eq('id', tenant.id)
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  // 3. Create staff record linking the admin to the new tenant
  const { error: staffErr } = await admin.from('staff').insert({
    email: adminEmail,
    name: adminName,
    role: 'admin',
    tenant_id: tenant.id,
  })

  if (staffErr) {
    await admin.from('tenants').delete().eq('id', tenant.id)
    const users = await admin.auth.admin.listUsers()
    const u = users.data.users.find(u => u.email === adminEmail)
    if (u) await admin.auth.admin.deleteUser(u.id)
    return NextResponse.json({ error: staffErr.message }, { status: 500 })
  }

  return NextResponse.json({ ...tenant, staffCount: 1 }, { status: 201 })
}
