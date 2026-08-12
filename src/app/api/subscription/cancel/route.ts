import { NextRequest, NextResponse } from 'next/server'
import { makeAdminClient, getRequestStaff } from '@/lib/supabaseAdmin'
import { isDemoTenant } from '@/lib/demo/provision'

export const runtime = 'nodejs'

const LS_API = 'https://api.lemonsqueezy.com/v1/subscriptions'

// Cancels the signed-in admin's subscription in Lemon Squeezy. The plan stays
// active until the end of the paid period (status -> cancelled, ends_at set);
// subscription_expired later locks the account via the LS webhook. The
// free-text reason is stored best-effort and never blocks the cancellation.
export async function POST(req: NextRequest) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Billing is not configured.' },
      { status: 500 }
    )
  }

  let admin
  try {
    admin = makeAdminClient()
  } catch {
    return NextResponse.json(
      { error: 'Server is not configured.' },
      { status: 500 }
    )
  }

  const staff = await getRequestStaff(admin, req)
  if (!staff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (staff.role !== 'admin' && staff.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // Demo sandboxes have no real subscription behind them.
  if (await isDemoTenant(admin, staff.tenantId)) {
    return NextResponse.json(
      { error: 'Billing is disabled in the demo.' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => null)
  const reason =
    typeof body?.reason === 'string' ? body.reason.trim().slice(0, 1000) : ''

  // Find the Lemon Squeezy subscription id. The app tags the tenant at
  // checkout, so prefer the tenant record; fall back to the marketing site's
  // subscriptions table (keyed by user) for accounts billed from there.
  const { data: tenantRow } = await admin
    .from('tenants')
    .select('ls_subscription_id')
    .eq('id', staff.tenantId)
    .maybeSingle()

  let lsSubscriptionId: string | null = tenantRow?.ls_subscription_id ?? null

  if (!lsSubscriptionId) {
    const { data: subRow } = await admin
      .from('subscriptions')
      .select('ls_subscription_id')
      .eq('user_id', staff.userId)
      .maybeSingle()
    lsSubscriptionId = subRow?.ls_subscription_id ?? null
  }

  if (!lsSubscriptionId) {
    return NextResponse.json(
      { error: 'No active subscription to cancel.' },
      { status: 404 }
    )
  }

  const res = await fetch(`${LS_API}/${lsSubscriptionId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!res.ok && res.status !== 404) {
    const detail = await res
      .json()
      .then(b => b?.errors?.[0]?.detail)
      .catch(() => null)
    return NextResponse.json(
      { error: detail ?? 'Could not cancel the subscription.' },
      { status: 502 }
    )
  }

  // Record the reason for product feedback. Best-effort only.
  await admin
    .from('subscription_cancellations')
    .insert({
      user_id: staff.userId,
      tenant_id: staff.tenantId,
      ls_subscription_id: lsSubscriptionId,
      reason: reason || null,
    })
    .then(({ error }) => {
      if (error) {
        console.warn('[cancel] could not store reason:', error.message)
      }
    })

  return NextResponse.json({ ok: true })
}
