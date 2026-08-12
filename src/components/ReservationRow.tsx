'use client'

import { Pencil } from '@/components/icons'
import { Reservation } from '@/types/reservation'
import { useI18n } from '@/contexts/I18nContext'
import { useDisplayPrefs } from '@/contexts/DisplayPrefsContext'

interface ReservationRowProps {
  reservation: Reservation
  onEdit: (reservation: Reservation) => void
  /** Show the date alongside the time (use when not grouped by day) */
  showDate?: boolean
}

export default function ReservationRow({
  reservation,
  onEdit,
  showDate = false,
}: ReservationRowProps) {
  const { messages } = useI18n()
  const t = messages.dashboard
  const { prefs } = useDisplayPrefs()

  const tableLabel = (() => {
    // Prefer stored identifiers array (multi-table support)
    if (reservation.table_identifiers?.length) {
      return reservation.table_identifiers.join(', ')
    }
    // Fall back to the joined single-table relation or legacy table_number
    return (
      reservation.tables?.table_identifier ||
      (reservation.table_number ? String(reservation.table_number) : null)
    )
  })()

  return (
    <li
      onClick={() => onEdit(reservation)}
      className="cursor-pointer hover:bg-gray-25"
    >
      <div className="px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-md font-bold text-gray-900 truncate">
              {reservation.customer_name}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {prefs.showTime && (
                <span className="inline-flex items-center rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                  {showDate ? `${reservation.date} · ` : ''}
                  {reservation.time?.slice(0, 5)}
                  {reservation.end_time
                    ? ` – ${reservation.end_time.slice(0, 5)}`
                    : ''}
                </span>
              )}
              {prefs.showPartySize && (
                <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                  {reservation.party_size} {t.guests}
                </span>
              )}
              {prefs.showTable && tableLabel && (
                <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                  {t.table} {tableLabel}
                </span>
              )}
              {prefs.showPhone && reservation.customer_phone && (
                <span className="inline-flex items-center rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                  {reservation.customer_phone}
                </span>
              )}
            </div>
            {prefs.showNotes && reservation.notes && (
              <div className="max-w-full w-fit">
                <p className="mt-2 py-0.5 px-2.5 bg-gray-100 text-xs rounded-full font-semibold truncate">
                  {reservation.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
