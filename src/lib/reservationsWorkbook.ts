import ExcelJS from 'exceljs'

export interface ExportReservationRow {
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  date: string | null
  time: string | null
  end_time: string | null
  party_size: number | null
  table_identifiers: string[] | null
  table_number: number | null
  status: string | null
  notes: string | null
  is_requested: boolean | null
  created_at: string | null
}

function tablesLabel(r: ExportReservationRow): string {
  if (r.table_identifiers && r.table_identifiers.length > 0) {
    return r.table_identifiers.join(', ')
  }
  if (r.table_number != null) return String(r.table_number)
  return ''
}

/**
 * Build a styled .xlsx workbook of reservations and return it as a Buffer.
 */
export async function buildReservationsWorkbook(
  rows: ExportReservationRow[]
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reservation System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Reservations', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  ws.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Time', key: 'time', width: 10 },
    { header: 'End', key: 'end_time', width: 10 },
    { header: 'Guest', key: 'customer_name', width: 24 },
    { header: 'Phone', key: 'customer_phone', width: 18 },
    { header: 'Email', key: 'customer_email', width: 26 },
    { header: 'Party', key: 'party_size', width: 8 },
    { header: 'Table(s)', key: 'tables', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Source', key: 'source', width: 12 },
    { header: 'Notes', key: 'notes', width: 40 },
    { header: 'Created', key: 'created_at', width: 20 },
  ]

  for (const r of rows) {
    ws.addRow({
      date: r.date ?? '',
      time: r.time ? r.time.slice(0, 5) : '',
      end_time: r.end_time ? r.end_time.slice(0, 5) : '',
      customer_name: r.customer_name ?? '',
      customer_phone: r.customer_phone ?? '',
      customer_email: r.customer_email ?? '',
      party_size: r.party_size ?? '',
      tables: tablesLabel(r),
      status: r.status ?? '',
      source: r.is_requested ? 'Guest request' : 'Staff',
      notes: r.notes ?? '',
      created_at: r.created_at ? new Date(r.created_at).toLocaleString() : '',
    })
  }

  // Header styling
  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.alignment = { vertical: 'middle' }
  header.height = 20
  header.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    }
  })

  ws.autoFilter = { from: 'A1', to: 'L1' }

  const buffer = await wb.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}
