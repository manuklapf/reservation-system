'use client'

import { useState } from 'react'
import Link from 'next/link'
import EnhancedCalendar from '@/components/EnhancedCalendar'
import DemoReservationModal from '@/components/DemoReservationModal'
import { useDemo } from '@/contexts/DemoContext'
import { Reservation } from '@/types/reservation'
import { useI18n } from '@/contexts/I18nContext'

export default function DemoCalendarPage() {
  const { reservations } = useDemo()
  const { messages } = useI18n()
  const t = messages.calendarPage

  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date
    end: Date
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/demo"
                className="text-xl font-semibold text-gray-900 hover:text-blue-600"
              >
                ← {t.backToDashboard}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.title}</h2>
            <p className="text-gray-600">{t.description}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <EnhancedCalendar
              demoReservations={reservations}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
            />
          </div>
        </div>
      </main>

      <DemoReservationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reservation={selectedReservation}
        selectedDate={selectedSlot?.start}
        selectedTime={
          selectedSlot
            ? `${String(selectedSlot.start.getHours()).padStart(2, '0')}:${String(selectedSlot.start.getMinutes()).padStart(2, '0')}`
            : undefined
        }
      />
    </div>
  )
}
