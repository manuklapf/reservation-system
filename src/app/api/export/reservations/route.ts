import { NextRequest, NextResponse } from 'next/server'
import { makeAdminClient, getRequestStaff } from '@/lib/supabaseAdmin'
import {
  buildReservationsWorkbook,
  type ExportReservationRow,
} from '@/lib/reservationsWorkbook'

// Export is intentionally available for any plan status (including expired
// trials) — it is the "take your data and go" escape hatch.
export async function GET(req: NextRequest) {
  const admin = makeAdminClient()
  const staff = await getRequestStaff(admin, req)
  if (!staff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenant } = await admin
    .from('tenants')
    .select('name, slug')
    .eq('id', staff.tenantId)
    .single()

  const { data: rows, error } = await admin
    .from('reservations')
    .select(
      'customer_name, customer_phone, customer_email, date, time, end_time, party_size, table_identifiers, table_number, status, notes, is_requested, created_at'
    )
    .eq('tenant_id', staff.tenantId)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const buffer = await buildReservationsWorkbook(
    (rows ?? []) as ExportReservationRow[]
  )

  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `reservations-${tenant?.slug ?? 'export'}-${dateStr}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
