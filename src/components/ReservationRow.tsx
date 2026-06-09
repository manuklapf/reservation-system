'use client'

import { Pencil } from 'lucide-react'
import { Reservation } from '@/types/reservation'
import { useI18n } from '@/contexts/I18nContext'

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
  const common = messages.common

  return (
    <li>
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center">
              <p className="text-sm font-medium text-gray-900 truncate">
                {reservation.customer_name}
              </p>
            </div>
            <div className="mt-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-gray-500">
                  {t.table}{' '}
                  {reservation.tables?.table_identifier ||
                    reservation.table_number ||
                    common.notAvailable}{' '}
                  • {reservation.party_size} {t.guests}
                </p>
                <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                  {showDate ? `${reservation.date} ` : ''}
                  {t.at} {reservation.time}
                </p>
              </div>
            </div>
            {reservation.notes && (
              <p className="mt-2 text-sm text-gray-600">
                {t.notes}: {reservation.notes}
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
