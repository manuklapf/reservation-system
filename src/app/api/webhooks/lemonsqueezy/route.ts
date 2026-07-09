import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { makeAdminClient } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

// LemonSqueezy subscription statuses that mean the account should have access.
const ACTIVE_STATUSES = new Set([
  'active',
  'on_trial',
  'paid',
  'past_due',
  'cancelled', // still active until the paid period actually ends (-> subscription_expired)
])
const EXPIRED_STATUSES = new Set(['expired', 'unpaid'])

function verifySignature(raw: string, signature: string, secret: string) {
  const digest = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  const a = Buffer.from(digest, 'hex')
  const b = Buffer.from(signature, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[LS webhook] LEMONSQUEEZY_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const raw = await req.text()
  const signature = req.headers.get('x-signature') ?? ''
  const validSig = signature && verifySignature(raw, signature, secret)
  console.log('[LS webhook] received', {
    hasSignature: Boolean(signature),
    validSignature: Boolean(validSig),
    bytes: raw.length,
  })
  if (!validSig) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventName: string = event?.meta?.event_name ?? ''
  const tenantId: string | undefined = event?.meta?.custom_data?.tenant_id
  const attributes = event?.data?.attributes ?? {}

  console.log('[LS webhook] event', {
    eventName,
    tenantId,
    status: attributes.status,
    testMode: attributes.test_mode,
  })

  if (!tenantId) {
    // Nothing we can map this to; acknowledge so LS stops retrying.
    console.warn('[LS webhook] no tenant_id in meta.custom_data — ignoring')
    return NextResponse.json({ received: true, ignored: 'no tenant_id' })
  }

  let planStatus: 'active' | 'expired' | null = null

  if (eventName === 'order_created') {
    planStatus = 'active'
  } else if (eventName.startsWith('subscription_')) {
    const status: string = attributes.status ?? ''
    if (EXPIRED_STATUSES.has(status)) planStatus = 'expired'
    else if (ACTIVE_STATUSES.has(status)) planStatus = 'active'
  }

  if (!planStatus) {
    return NextResponse.json({ received: true, ignored: eventName })
  }

  const admin = makeAdminClient()
  const update: Record<string, unknown> = { plan_status: planStatus }
  // Once paid, the trial is over for good — clear the deadline so the account
  // is unambiguously off trial (and can't fall back into a trial banner).
  if (planStatus === 'active') update.trial_ends_at = null
  if (event?.data?.id) update.ls_subscription_id = String(event.data.id)
  if (attributes.customer_id != null) {
    update.ls_customer_id = String(attributes.customer_id)
  }

  const { error } = await admin
    .from('tenants')
    .update(update)
    .eq('id', tenantId)

  if (error) {
    console.error('[LS webhook] tenant update failed', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[LS webhook] tenant updated', { tenantId, planStatus })
  return NextResponse.json({ received: true, plan_status: planStatus })
}
