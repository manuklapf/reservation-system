import { supabase } from '@/lib/supabase'

/**
 * Create a LemonSqueezy checkout for the current tenant and redirect to it.
 * The server resolves the tenant from the user's access token and embeds it
 * as custom data so the webhook can mark the right account as paid.
 */
export async function startCheckout(): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')

  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.url) {
    throw new Error(body.error ?? 'Could not start checkout')
  }

  window.location.href = body.url as string
}
