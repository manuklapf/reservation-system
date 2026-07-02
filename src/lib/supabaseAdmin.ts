import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

/** Service-role Supabase client for server routes (bypasses RLS). */
export function makeAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface RequestStaff {
  email: string
  tenantId: string
  role: string
}

/**
 * Resolve the staff record (tenant + role) for the bearer token on a request.
 * Returns null when the token is missing/invalid or the user is not staff.
 */
export async function getRequestStaff(
  admin: SupabaseClient,
  req: NextRequest
): Promise<RequestStaff | null> {
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

  if (!data?.tenant_id) return null
  return { email: user.email, tenantId: data.tenant_id, role: data.role }
}
