import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoTenant } from '@/lib/demo/provision'

function makeAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getCallerTenantAndRole(
  admin: ReturnType<typeof makeAdminClient>,
  req: NextRequest
): Promise<{ tenantId: string; isAdmin: boolean } | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token)
  if (error || !user?.email) return null

  const { data } = await admin
    .from('staff')
    .select('tenant_id, role')
    .eq('email', user.email)
    .single()

  if (!data) return null
  return { tenantId: data.tenant_id, isAdmin: data.role === 'admin' }
}

export async function GET(req: NextRequest) {
  const admin = makeAdminClient()
  const caller = await getCallerTenantAndRole(admin, req)
  if (!caller)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!caller.isAdmin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await admin
    .from('staff')
    .select('id, email, name, role, created_at')
    .eq('tenant_id', caller.tenantId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const admin = makeAdminClient()
  const caller = await getCallerTenantAndRole(admin, req)
  if (!caller)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!caller.isAdmin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { email, password, name } = body ?? {}

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: 'email, password, and name are required' },
      { status: 400 }
    )
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 }
    )
  }

  // Logins created inside a demo sandbox are tagged so the cleanup sweep can
  // remove them along with the sandbox itself.
  const demo = await isDemoTenant(admin, caller.tenantId)

  const { error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    ...(demo && {
      user_metadata: { demo: true, demo_tenant_id: caller.tenantId },
    }),
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const { data: staffRecord, error: staffError } = await admin
    .from('staff')
    .insert({ email, name, role: 'staff', tenant_id: caller.tenantId })
    .select('id, email, name, role, created_at')
    .single()

  if (staffError) {
    await admin.auth.admin.deleteUser(
      (await admin.auth.admin.listUsers()).data.users.find(
        u => u.email === email
      )?.id ?? ''
    )
    return NextResponse.json({ error: staffError.message }, { status: 500 })
  }

  return NextResponse.json(staffRecord, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const admin = makeAdminClient()
  const caller = await getCallerTenantAndRole(admin, req)
  if (!caller)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!caller.isAdmin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('id')
  if (!staffId)
    return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: staffRecord, error: fetchErr } = await admin
    .from('staff')
    .select('email, role, tenant_id')
    .eq('id', staffId)
    .single()

  if (fetchErr || !staffRecord) {
    return NextResponse.json(
      { error: 'Staff member not found' },
      { status: 404 }
    )
  }
  if (staffRecord.tenant_id !== caller.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (staffRecord.role === 'admin') {
    return NextResponse.json(
      { error: 'Cannot delete admin users' },
      { status: 403 }
    )
  }

  const {
    data: { users },
  } = await admin.auth.admin.listUsers()
  const authUser = users.find(u => u.email === staffRecord.email)

  const { error: deleteStaffErr } = await admin
    .from('staff')
    .delete()
    .eq('id', staffId)
  if (deleteStaffErr)
    return NextResponse.json({ error: deleteStaffErr.message }, { status: 500 })

  if (authUser) await admin.auth.admin.deleteUser(authUser.id)

  return NextResponse.json({ success: true })
}
