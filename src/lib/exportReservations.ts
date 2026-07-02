import { supabase } from '@/lib/supabase'

/**
 * Download all of the current tenant's reservations as an .xlsx workbook.
 * Authorizes via the logged-in user's access token; the server resolves the
 * tenant from that token. Available regardless of plan status.
 */
export async function downloadReservationsXlsx(): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')

  const res = await fetch('/api/export/reservations', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Export failed')
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] ?? 'reservations.xlsx'

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
