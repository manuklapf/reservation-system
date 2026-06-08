'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { Reservation } from '@/types/reservation'
import { useDemo, DEMO_TENANT_ID } from '@/contexts/DemoContext'
import { useI18n } from '@/contexts/I18nContext'

interface DemoReservationModalProps {
  isOpen: boolean
  onClose: () => void
  reservation?: Reservation | null
  selectedDate?: Date
  selectedTime?: string
}

export default function DemoReservationModal({
  isOpen,
  onClose,
  reservation,
  selectedDate,
  selectedTime,
}: DemoReservationModalProps) {
  const {
    tables,
    addReservation,
    updateReservation,
    deleteReservation,
    reservations,
  } = useDemo()
  const { messages } = useI18n()
  const t = messages.reservationModal
  const common = messages.common

  const activeTables = useMemo(() => tables.filter(t => t.is_active), [tables])

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    table_id: '',
    date: '',
    time: '',
    party_size: '2',
    notes: '',
    status: 'confirmed',
  })

  // Available tables: exclude those booked at the same date+time (except current reservation)
  const availableTables = useMemo(() => {
    if (!formData.date || !formData.time) return activeTables
    const takenIds = reservations
      .filter(
        r =>
          r.date === formData.date &&
          r.time === formData.time &&
          r.table_id &&
          r.id !== reservation?.id
      )
      .map(r => r.table_id)
    return activeTables.filter(t => !takenIds.includes(t.id))
  }, [activeTables, reservations, formData.date, formData.time, reservation])

  // Initialise form when opening
  useEffect(() => {
    if (!isOpen) return
    if (reservation) {
      setFormData({
        customer_name: reservation.customer_name,
        customer_phone: reservation.customer_phone,
        table_id: reservation.table_id || '',
        date: reservation.date,
        time: reservation.time,
        party_size: reservation.party_size.toString(),
        notes: reservation.notes || '',
        status: reservation.status,
      })
    } else {
      const defaultDate = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
      setFormData({
        customer_name: '',
        customer_phone: '',
        table_id: '',
        date: defaultDate,
        time: selectedTime || '18:00',
        party_size: '2',
        notes: '',
        status: 'confirmed',
      })
    }
  }, [isOpen, reservation, selectedDate, selectedTime])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.table_id) {
      alert(t.errors.selectTable)
      return
    }

    const payload = {
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      table_id: formData.table_id,
      table_number: null,
      date: formData.date,
      time: formData.time,
      party_size: parseInt(formData.party_size),
      notes: formData.notes,
      status: formData.status,
      tenant_id: DEMO_TENANT_ID,
      created_by: 'demo',
    }

    if (reservation) {
      updateReservation(reservation.id, payload)
    } else {
      addReservation(payload)
    }

    onClose()
  }

  const handleDelete = () => {
    if (!reservation) return
    if (!confirm(t.confirmDelete)) return
    deleteReservation(reservation.id)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {reservation ? t.editReservation : t.newReservation}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {reservation ? t.updateDetails : t.createNew}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-3xl font-light hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center"
              aria-label={t.closeModal}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label
                  htmlFor="customer_name"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {t.customerName}
                </label>
                <input
                  type="text"
                  name="customer_name"
                  id="customer_name"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.customerNamePlaceholder}
                  value={formData.customer_name}
                  onChange={handleChange}
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="customer_phone"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {t.phoneNumber}
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  id="customer_phone"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.phonePlaceholder}
                  value={formData.customer_phone}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="table_id"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {t.table}
                </label>
                {availableTables.length === 0 && activeTables.length > 0 ? (
                  <div className="w-full px-4 py-3 border border-red-300 rounded-lg bg-red-50 text-red-700 text-sm">
                    {t.noTablesForSlot}
                  </div>
                ) : activeTables.length === 0 ? (
                  <div className="w-full px-4 py-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                    {t.noTablesConfigured}
                  </div>
                ) : (
                  <select
                    name="table_id"
                    id="table_id"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.table_id}
                    onChange={handleChange}
                  >
                    <option value="">{t.selectTable}</option>
                    {availableTables.map(table => (
                      <option key={table.id} value={table.id}>
                        {table.table_identifier} ({t.seats} {table.capacity})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label
                  htmlFor="party_size"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {t.partySize}
                </label>
                <input
                  type="number"
                  name="party_size"
                  id="party_size"
                  required
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2"
                  value={formData.party_size}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {t.date}
                </label>
                <input
                  type="date"
                  name="date"
                  id="date"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="time"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {t.time}
                </label>
                <input
                  type="time"
                  name="time"
                  id="time"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.time}
                  onChange={handleChange}
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="status"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {t.status}
                </label>
                <select
                  name="status"
                  id="status"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="confirmed">{common.confirmed}</option>
                  <option value="pending">{common.pending}</option>
                  <option value="cancelled">{common.cancelled}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="notes"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {t.specialNotes}
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder={t.specialNotesPlaceholder}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
              <div>
                {reservation && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                    aria-label={t.deleteReservation}
                    title={t.deleteReservation}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
                >
                  {common.cancel}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
                >
                  {reservation ? t.updateReservation : t.createReservation}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
