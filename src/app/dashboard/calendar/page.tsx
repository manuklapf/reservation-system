'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EnhancedCalendar from '@/components/EnhancedCalendar'
import ReservationModal from '@/components/ReservationModal'
import { Reservation } from '@/types/reservation'
import { useI18n } from '@/contexts/I18nContext'

export default function CalendarPage() {
  const { user } = useAuth()
  const { messages } = useI18n()
  const t = messages.calendarPage
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
        <div className="text-xl">{t.loginRequired}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label={t.backToDashboard}
                title={t.backToDashboard}
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.title}</h2>
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
