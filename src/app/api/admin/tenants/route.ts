import { NextRequest, NextResponse } from 'next/server'
import { makeAdminClient } from '@/lib/supabaseAdmin'

async function verifyPlatformAdmin(
  admin: ReturnType<typeof makeAdminClient>,
  req: NextRequest
): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return false

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token)
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
    .select('id, name, slug, created_at, plan_status, trial_ends_at')
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
  const {
    restaurantName,
    slug: rawSlug,
    adminName,
    adminEmail,
    adminPassword,
  } = body ?? {}

  if (!restaurantName || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json(
      {
        error:
          'restaurantName, adminName, adminEmail, and adminPassword are required',
      },
      { status: 400 }
    )
  }
  if (adminPassword.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 }
    )
  }

  const slug = rawSlug ? slugify(rawSlug) : slugify(restaurantName)

  // 1. Create tenant
  const { data: tenant, error: tenantErr } = await admin
    .from('tenants')
    .insert({ name: restaurantName, slug })
    .select('id, name, slug, created_at, plan_status, trial_ends_at')
    .single()

  if (tenantErr) {
    const msg =
      tenantErr.message.includes('unique') || tenantErr.code === '23505'
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

export async function PATCH(req: NextRequest) {
  const admin = makeAdminClient()
  if (!(await verifyPlatformAdmin(admin, req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const { id, planStatus, extendTrialDays } = body ?? {}

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (planStatus !== undefined) {
    if (!['trial', 'active', 'expired'].includes(planStatus)) {
      return NextResponse.json({ error: 'Invalid planStatus' }, { status: 400 })
    }
    update.plan_status = planStatus
    // Starting/resetting a trial gives a fresh 14-day window.
    if (planStatus === 'trial') {
      update.trial_ends_at = new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString()
    }
  }

  if (extendTrialDays !== undefined) {
    const days = Number(extendTrialDays)
    if (!Number.isFinite(days) || days <= 0) {
      return NextResponse.json(
        { error: 'Invalid extendTrialDays' },
        { status: 400 }
      )
    }
    update.trial_ends_at = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString()
    if (update.plan_status === undefined) update.plan_status = 'trial'
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('tenants')
    .update(update)
    .eq('id', id)
    .select('id, name, slug, created_at, plan_status, trial_ends_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
