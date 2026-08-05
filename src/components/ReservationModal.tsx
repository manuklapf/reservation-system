'use client'

import { Reservation } from '@/types/reservation'
import ReservationEditModal from './ReservationEditModal'
import ReservationCreateModal from './ReservationCreateModal'

interface ReservationModalProps {
  isOpen: boolean
  onClose: () => void
  reservation?: Reservation | null
  selectedDate?: Date
  selectedTime?: string
  onSave: (reservation: Reservation) => void
  onDelete?: (reservationId: string) => void
}

export default function ReservationModal({
  isOpen,
  onClose,
  reservation,
  selectedDate,
  selectedTime,
  onSave,
  onDelete,
}: ReservationModalProps) {
  if (reservation) {
    return (
      <ReservationEditModal
        isOpen={isOpen}
        onClose={onClose}
        reservation={reservation}
        onSave={onSave}
        onDelete={onDelete}
      />
    )
  }

  return (
    <ReservationCreateModal
      isOpen={isOpen}
      onClose={onClose}
      selectedDate={selectedDate}
      selectedTime={selectedTime}
      onSave={onSave}
    />
  )
}
