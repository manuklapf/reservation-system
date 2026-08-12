import { NextRequest, NextResponse } from 'next/server'
import { makeAdminClient, getRequestStaff } from '@/lib/supabaseAdmin'
import { isDemoTenant } from '@/lib/demo/provision'

export const runtime = 'nodejs'

const LS_API = 'https://api.lemonsqueezy.com/v1/checkouts'

export async function POST(req: NextRequest) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  const storeId = process.env.LEMONSQUEEZY_STORE_ID
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!apiKey || !storeId || !variantId) {
    return NextResponse.json(
      { error: 'Billing is not configured.' },
      { status: 500 }
    )
  }

  const admin = makeAdminClient()
  const staff = await getRequestStaff(admin, req)
  if (!staff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Demo sandboxes must never reach a real payment page.
  if (await isDemoTenant(admin, staff.tenantId)) {
    return NextResponse.json(
      { error: 'Billing is disabled in the demo.' },
      { status: 403 }
    )
  }

  const redirectUrl =`${appUrl ?? new URL(req.url).origin}/dashboard?upgraded=1`

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: staff.email,
          custom: { tenant_id: staff.tenantId, user_id: staff.userId },
        },
        product_options: {
          redirect_url: redirectUrl,
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: String(storeId) } },
        variant: { data: { type: 'variants', id: String(variantId) } },
      },
    },
  }

  const res = await fetch(LS_API, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      body?.errors?.[0]?.detail ?? 'Failed to create checkout session.'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const url = body?.data?.attributes?.url
  if (!url) {
    return NextResponse.json(
      { error: 'Checkout URL missing from provider response.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ url })
}
