'use client'

import { Pencil } from 'lucide-react'
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

  const tableLabel =
    reservation.tables?.table_identifier ||
    (reservation.table_number ? String(reservation.table_number) : null)

  return (
    <li>
      <div className="px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {reservation.customer_name}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {prefs.showTime && (
                <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                  {showDate ? `${reservation.date} · ` : ''}
                  {reservation.time?.slice(0, 5)}
                </span>
              )}
              {prefs.showPartySize && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                  {reservation.party_size} {t.guests}
                </span>
              )}
              {prefs.showTable && tableLabel && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {t.table} {tableLabel}
                </span>
              )}
              {prefs.showPhone && reservation.customer_phone && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  {reservation.customer_phone}
                </span>
              )}
            </div>
            {prefs.showNotes && reservation.notes && (
              <p className="mt-1.5 text-xs text-gray-500 truncate">
                {reservation.notes}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => onEdit(reservation)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-800"
              aria-label={t.editReservation}
              title={t.editReservation}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}
