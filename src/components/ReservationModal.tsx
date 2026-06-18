'use client'

import { Reservation } from '@/types/reservation'
import ReservationEditModal from './ReservationEditModal'
import ReservationCreateModal from './ReservationCreateModal'

interface Table {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
}

interface ReservationModalProps {
  isOpen: boolean
  onClose: () => void
  reservation?: Reservation | null
  selectedDate?: Date
  selectedTime?: string
  onSave: (reservation: Reservation) => void
  onDelete?: (reservationId: string) => void
  demoTables?: Table[]
  demoReservations?: Reservation[]
  onDemoSave?: (
    data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>
  ) => Reservation
  onDemoDelete?: (id: string) => void
}

export default function ReservationModal({
  isOpen,
  onClose,
  reservation,
  selectedDate,
  selectedTime,
  onSave,
  onDelete,
  demoTables,
  demoReservations,
  onDemoSave,
  onDemoDelete,
}: ReservationModalProps) {
  if (reservation) {
    return (
      <ReservationEditModal
        isOpen={isOpen}
        onClose={onClose}
        reservation={reservation}
        onSave={onSave}
        onDelete={onDelete}
        demoTables={demoTables}
        demoReservations={demoReservations}
        onDemoSave={onDemoSave}
        onDemoDelete={onDemoDelete}
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
      demoTables={demoTables}
      demoReservations={demoReservations}
      onDemoSave={onDemoSave}
    />
  )
}
