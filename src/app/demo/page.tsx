'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDemo } from '@/contexts/DemoContext'
import { Reservation } from '@/types/reservation'
import DemoReservationModal from '@/components/DemoReservationModal'
import ReservationRow from '@/components/ReservationRow'
import { useI18n, Language } from '@/contexts/I18nContext'

export default function DemoDashboardPage() {
  const { reservations } = useDemo()
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { language, setLanguage, messages } = useI18n()

  const t = messages.dashboard
  const common = messages.common

  const handleOpenEditModal = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsModalOpen(true)
  }

  const handleOpenNewModal = () => {
    setSelectedReservation(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedReservation(null)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">{t.title}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="demo-language"
                  className="text-sm text-gray-600"
                >
                  {common.language}
                </label>
                <select
                  id="demo-language"
                  value={language}
                  onChange={e => setLanguage(e.target.value as Language)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={common.language}
                >
                  <option value="en">{common.english}</option>
                  <option value="de">{common.german}</option>
                </select>
              </div>
              <span className="text-sm text-gray-400 italic">Demo user</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {t.reservations}
            </h2>
            <div className="space-x-2">
              <Link
                href="/demo/setup"
                className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t.setupTables}
              </Link>
              <Link
                href="/demo/calendar"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t.calendarView}
              </Link>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {reservations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">{t.noReservations}</p>
                <button
                  onClick={handleOpenNewModal}
                  className="mt-2 inline-block text-blue-600 hover:text-blue-800"
                >
                  {t.createFirstReservation}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {reservations.map(reservation => (
                  <ReservationRow
                    key={reservation.id}
                    reservation={reservation}
                    onEdit={handleOpenEditModal}
                    showDate
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Add new reservation button */}
          <div className="mt-4 text-center">
            <button
              onClick={handleOpenNewModal}
              className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + New Reservation
            </button>
          </div>
        </div>
      </main>

      <DemoReservationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reservation={selectedReservation}
      />
    </div>
  )
}
