// Shared types for reservations
export interface Reservation {
  id: string
  customer_name: string
  customer_phone: string
  table_number: number | null
  table_id: string | null
  table_ids: string[] | null
  table_identifiers: string[] | null
  date: string
  time: string
  party_size: number
  notes: string | null
  created_at: string
  updated_at: string
  tenant_id: string
  created_by: string
  tables?: {
    table_identifier: string
    capacity: number
  }
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Reservation
}
