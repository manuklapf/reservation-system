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
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
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
              <Link href="/dashboard" className="text-xl font-semibold text-gray-900 hover:text-blue-600">
                ← Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <Link
                href="/dashboard/reservations/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Reservation
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reservations Calendar</h2>
            <p className="text-gray-600">
              View and manage reservations in calendar format. Click on a reservation to edit, or click on an empty slot to create a new reservation.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <EnhancedCalendar
              key={calendarKey}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
            />
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <div>
                  <p className="text-sm text-gray-600">Status Legend</p>
                  <p className="text-xs text-gray-500">Click reservations to edit • Click empty slots to create</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">Multiple Views</p>
                <p className="text-xs text-gray-500">Month • Week • Day • Agenda</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">Real-time Updates</p>
                <p className="text-xs text-gray-500">Changes reflect immediately</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reservation={selectedReservation}
        selectedDate={selectedSlot?.start}
        selectedTime={selectedSlot?.start ? 
          `${selectedSlot.start.getHours().toString().padStart(2, '0')}:${selectedSlot.start.getMinutes().toString().padStart(2, '0')}` : 
          undefined
        }
        onSave={handleSaveReservation}
        onDelete={handleDeleteReservation}
      />
    </div>
  )
}