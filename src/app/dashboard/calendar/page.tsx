'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import EnhancedCalendar from '@/components/EnhancedCalendar'
import ReservationModal from '@/components/ReservationModal'

interface Reservation {
  id: string
  customer_name: string
  customer_phone: string
  table_number: number
  date: string
  time: string
  party_size: number
  status: string
  notes: string | null
  tenant_id: string
  created_by: string
}

export default function CalendarPage() {
  const { user } = useAuth()
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date
    end: Date
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [calendarKey, setCalendarKey] = useState(0) // For forcing calendar refresh

  const handleSelectEvent = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setSelectedSlot(null)
    setIsModalOpen(true)
  }

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setSelectedReservation(null)
    setSelectedSlot(slotInfo)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedReservation(null)
    setSelectedSlot(null)
  }

  const handleSaveReservation = (reservation: Reservation) => {
    // Refresh the calendar by changing the key
    setCalendarKey(prev => prev + 1)
  }

  const handleDeleteReservation = (reservationId: string) => {
    // Refresh the calendar by changing the key
    setCalendarKey(prev => prev + 1)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Please log in to view the calendar.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-xl font-semibold text-gray-900 hover:text-blue-600"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Reservations Calendar
            </h2>
            <p className="text-gray-600">
              View and manage reservations in calendar format. Click on a
              reservation to edit, or click on an empty slot to create a new
              reservation.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <EnhancedCalendar
              refreshKey={calendarKey}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
            />
          </div>
        </div>
      </main>

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reservation={selectedReservation}
        selectedDate={selectedSlot?.start}
        selectedTime={
          selectedSlot?.start
            ? `${selectedSlot.start.getHours().toString().padStart(2, '0')}:${selectedSlot.start.getMinutes().toString().padStart(2, '0')}`
            : undefined
        }
        onSave={handleSaveReservation}
        onDelete={handleDeleteReservation}
      />
    </div>
  )
}
