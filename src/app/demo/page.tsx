'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { useDemo } from '@/contexts/DemoContext'
import { Reservation } from '@/types/reservation'
import DemoReservationModal from '@/components/DemoReservationModal'
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
                  <li key={reservation.id}>
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
                                {reservation.date} {t.at} {reservation.time}
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
                            onClick={() => handleOpenEditModal(reservation)}
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
