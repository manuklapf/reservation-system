'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Picker from 'react-mobile-picker'
import { Trash2, Check, ChevronDown } from 'lucide-react'
import { Reservation } from '@/types/reservation'
import { useI18n } from '@/contexts/I18nContext'

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
  const { user, tenantId } = useAuth()
  const { messages } = useI18n()
  const t = messages.reservationModal
  const common = messages.common
  const [loading, setLoading] = useState(false)
  const [showPickerModal, setShowPickerModal] = useState(false)
  const [tempPartySize, setTempPartySize] = useState('')
  const [isManualInput, setIsManualInput] = useState(false)
  const [tables, setTables] = useState<Table[]>([])
  const [availableTables, setAvailableTables] = useState<Table[]>([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [showAdditional, setShowAdditional] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    table_id: '',
    date: '',
    time: '',
    party_size: '',
    notes: '',
  })

  const [width, setWidth] = useState<number>(window.innerWidth)

  function handleWindowSizeChange() {
    setWidth(window.innerWidth)
  }

  useEffect(() => {
    window.addEventListener('resize', handleWindowSizeChange)
    return () => {
      window.removeEventListener('resize', handleWindowSizeChange)
    }
  }, [])

  const isMobile = width <= 1400

  const fetchTables = React.useCallback(async () => {
    if (!supabase || !tenantId) return

    try {
      setLoadingTables(true)
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('table_identifier')

      if (error) throw error
      setTables(data || [])
    } catch (err) {
      console.error('Error fetching tables:', err)
    } finally {
      setLoadingTables(false)
    }
  }, [tenantId])

  // Fetch all tables for the tenant
  useEffect(() => {
    if (isOpen && tenantId && supabase) {
      fetchTables()
    }
  }, [isOpen, tenantId, fetchTables])

  const filterAvailableTables = React.useCallback(async () => {
    if (!supabase || !tenantId || !formData.date || !formData.time) return

    try {
      // Fetch reservations for the selected date and time
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('table_id')
        .eq('tenant_id', tenantId)
        .eq('date', formData.date)
        .eq('time', formData.time)
        .not('table_id', 'is', null)

      if (error) throw error

      // Get list of reserved table IDs (exclude current reservation if editing)
      const reservedTableIds = (reservations || [])
        .filter(r => !reservation || r.table_id !== reservation.table_id)
        .map(r => r.table_id)

      // Filter out reserved tables
      const available = tables.filter(
        table => !reservedTableIds.includes(table.id)
      )

      setAvailableTables(available)
    } catch (err) {
      console.error('Error filtering available tables:', err)
      setAvailableTables(tables) // Fallback to all tables if error
    }
  }, [tenantId, formData.date, formData.time, tables, reservation])

  // Filter available tables based on date, time, and existing reservations
  useEffect(() => {
    if (isOpen && tables.length > 0 && formData.date && formData.time) {
      filterAvailableTables()
    }
  }, [isOpen, tables, formData.date, formData.time, filterAvailableTables])

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (reservation) {
        // Editing existing reservation
        setFormData({
          customer_name: reservation.customer_name,
          customer_phone: reservation.customer_phone,
          table_id: reservation.table_id || '',
          date: reservation.date,
          time: reservation.time,
          party_size: reservation.party_size.toString(),
          notes: reservation.notes || '',
        })
      } else {
        // Creating new reservation
        // Fix timezone issue by using local date formatting instead of UTC
        const defaultDate = selectedDate
          ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
          : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
        const defaultTime = selectedTime || '18:00'

        setFormData({
          customer_name: '',
          customer_phone: '',
          table_id: '',
          date: defaultDate,
          time: defaultTime,
          party_size: '2',
          notes: '',
        })
      }
    }
  }, [isOpen, reservation, selectedDate, selectedTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      alert(t.errors.notAuthenticated)
      return
    }

    if (!tenantId) {
      alert(t.errors.noTenant)
      return
    }

    if (!supabase) {
      alert(t.errors.noDbConnection)
      return
    }

    if (!formData.table_id) {
      alert(t.errors.selectTable)
      return
    }

    setLoading(true)

    try {
      const reservationData = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        table_id: formData.table_id,
        date: formData.date,
        time: formData.time,
        party_size: parseInt(formData.party_size),
        notes: formData.notes,
        tenant_id: tenantId,
        created_by: user.id,
      }

      if (reservation) {
        // Update existing reservation
        const { data, error } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', reservation.id)
          .select()
          .single()

        if (error) throw error
        onSave(data)
      } else {
        // Create new reservation
        const { data, error } = await supabase
          .from('reservations')
          .insert([reservationData])
          .select()
          .single()

        if (error) throw error
        onSave(data)
      }

      onClose()
    } catch (error: any) {
      console.error('Error saving reservation:', error)

      // Show detailed error message
      let errorMessage = t.errors.saveFailed
      if (error?.message) {
        errorMessage += ': ' + error.message
      }
      if (error?.hint) {
        errorMessage += `\n\n${t.errors.hintPrefix}: ` + error.hint
      }

      // Check for specific errors
      if (
        error?.message?.includes('column "table_id" of relation "reservations"')
      ) {
        errorMessage = t.errors.dbSetupRequired
      }

      if (
        error?.message?.includes('null value in column "table_number"') ||
        (error?.message?.includes('table_number') &&
          error?.message?.includes('not-null'))
      ) {
        errorMessage = t.errors.dbMigrationRequired
      }

      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!reservation || !supabase) return

    if (!confirm(t.confirmDelete)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservation.id)

      if (error) throw error

      onDelete?.(reservation.id)
      onClose()
    } catch (error) {
      console.error('Error deleting reservation:', error)
      alert(t.errors.deleteFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto transform transition-all">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {reservation ? t.editReservation : t.newReservation}
              </h2>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder={t.customerNamePlaceholder}
                  value={formData.customer_name}
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
                {loadingTables ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                    {t.loadingTables}
                  </div>
                ) : availableTables.length === 0 && tables.length > 0 ? (
                  <div className="w-full px-4 py-3 border border-red-300 rounded-lg bg-red-50 text-red-700 text-sm">
                    {t.noTablesForSlot}
                  </div>
                ) : tables.length === 0 ? (
                  <div className="w-full px-4 py-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                    {t.noTablesConfigured}
                  </div>
                ) : (
                  <select
                    name="table_id"
                    id="table_id"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

                {isMobile ? (
                  <div
                    onClick={() => {
                      setTempPartySize(formData.party_size || '2')
                      setIsManualInput(false)
                      setShowPickerModal(true)
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white cursor-pointer flex justify-between items-center"
                  >
                    <span
                      className={
                        formData.party_size ? 'text-gray-900' : 'text-gray-400'
                      }
                    >
                      {formData.party_size
                        ? `${formData.party_size} ${formData.party_size === '1' ? t.person : t.people}`
                        : t.selectPartySize}
                    </span>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                ) : (
                  <input
                    type="number"
                    name="party_size"
                    id="party_size"
                    required
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="2"
                    value={formData.party_size}
                    onChange={handleChange}
                  />
                )}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.time}
                  onChange={handleChange}
                />
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder={t.specialNotesPlaceholder}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setShowAdditional(prev => !prev)}
                className="flex w-full items-center justify-between py-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                <span>{t.additionalInfo}</span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform ${
                    showAdditional ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {showAdditional && (
                <div className="mt-3">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder={t.phonePlaceholder}
                    value={formData.customer_phone}
                    onChange={handleChange}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-6 border-t border-gray-200">
              <div>
                {reservation && onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={t.deleteReservation}
                    title={t.deleteReservation}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={
                  reservation ? t.updateReservation : t.createReservation
                }
                title={reservation ? t.updateReservation : t.createReservation}
              >
                {loading ? (
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Party Size Picker Modal */}
      {showPickerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-[60]">
          <div className="bg-white rounded-t-xl w-full max-w-lg pb-safe max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-gray-200 z-10">
              <button
                onClick={() => setShowPickerModal(false)}
                className="text-blue-600 font-medium"
              >
                {common.cancel}
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                {t.partySize}
              </h3>
              <button
                onClick={() => {
                  setFormData({ ...formData, party_size: tempPartySize })
                  setShowPickerModal(false)
                }}
                className="text-blue-600 font-medium"
              >
                {t.done}
              </button>
            </div>
            <div className="p-4">
              <Picker
                value={{
                  party_size:
                    !isManualInput &&
                    tempPartySize &&
                    parseInt(tempPartySize) <= 100
                      ? tempPartySize
                      : '1',
                }}
                onChange={value => {
                  if (!isManualInput) {
                    setTempPartySize(value.party_size)
                  }
                }}
                height={216}
              >
                <Picker.Column name="party_size">
                  {[...Array(100)].map((_, i) => {
                    const size = (i + 1).toString()
                    return (
                      <Picker.Item key={size} value={size}>
                        {size} {size === '1' ? t.person : t.people}
                      </Picker.Item>
                    )
                  })}
                </Picker.Column>
              </Picker>

              {/* Manual Input for 300+ */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <label
                  htmlFor="manual_party_size"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {t.orEnterNumber}
                </label>
                <input
                  type="number"
                  id="manual_party_size"
                  min="1"
                  placeholder={t.enterPartySize}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={isManualInput ? tempPartySize : ''}
                  onChange={e => {
                    const value = e.target.value
                    setIsManualInput(true)
                    if (value === '' || parseInt(value) >= 1) {
                      setTempPartySize(value)
                    }
                  }}
                  onFocus={() => {
                    setIsManualInput(true)
                    if (!tempPartySize || parseInt(tempPartySize) <= 100) {
                      setTempPartySize('')
                    }
                  }}
                  onBlur={() => {
                    // If input is empty on blur, revert to picker mode
                    if (!tempPartySize) {
                      setIsManualInput(false)
                      setTempPartySize('2')
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
