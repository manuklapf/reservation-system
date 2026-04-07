'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Picker from 'react-mobile-picker'

interface Reservation {
  id: string
  customer_name: string
  customer_phone: string
  table_number: number
  table_id: string | null
  date: string
  time: string
  party_size: number
  status: string
  notes: string | null
  tenant_id: string
  created_by: string
}

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
  const [loading, setLoading] = useState(false)
  const [showPickerModal, setShowPickerModal] = useState(false)
  const [tempPartySize, setTempPartySize] = useState('')
  const [isManualInput, setIsManualInput] = useState(false)
  const [tables, setTables] = useState<Table[]>([])
  const [availableTables, setAvailableTables] = useState<Table[]>([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    table_id: '',
    date: '',
    time: '',
    party_size: '',
    notes: '',
    status: 'confirmed',
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
          status: reservation.status,
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
          status: 'confirmed',
        })
      }
    }
  }, [isOpen, reservation, selectedDate, selectedTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      alert('Error: Not authenticated. Please log in.')
      return
    }

    if (!tenantId) {
      alert('Error: No tenant selected. Please contact support.')
      return
    }

    if (!supabase) {
      alert(
        'Error: Database connection not available. Please check your configuration.'
      )
      return
    }

    if (!formData.table_id) {
      alert('Please select a table.')
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
        status: formData.status,
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
      let errorMessage = 'Error saving reservation'
      if (error?.message) {
        errorMessage += ': ' + error.message
      }
      if (error?.hint) {
        errorMessage += '\n\nHint: ' + error.hint
      }

      // Check for specific errors
      if (
        error?.message?.includes('column "table_id" of relation "reservations"')
      ) {
        errorMessage =
          'Database setup required!\n\nPlease run the SQL schema in Supabase:\n1. Open: https://app.supabase.com/project/gvgsndjcwqbrzfvgxxdy/sql\n2. Run the contents of supabase-tables-schema.sql'
      }

      if (
        error?.message?.includes('null value in column "table_number"') ||
        (error?.message?.includes('table_number') &&
          error?.message?.includes('not-null'))
      ) {
        errorMessage =
          'Database migration required!\n\nThe table_number column needs to be made nullable.\n\nPlease run the UPDATED SQL schema in Supabase:\n1. Open: https://app.supabase.com/project/gvgsndjcwqbrzfvgxxdy/sql\n2. Run the contents of supabase-tables-schema.sql\n\nThe SQL now includes: ALTER TABLE reservations ALTER COLUMN table_number DROP NOT NULL;'
      }

      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!reservation || !supabase) return

    if (!confirm('Are you sure you want to delete this reservation?')) return

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
      alert('Error deleting reservation')
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
                {reservation ? 'Edit Reservation' : 'New Reservation'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {reservation
                  ? 'Update reservation details'
                  : 'Create a new table reservation'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-3xl font-light hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center"
              aria-label="Close modal"
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
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customer_name"
                  id="customer_name"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter customer name"
                  value={formData.customer_name}
                  onChange={handleChange}
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="customer_phone"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  id="customer_phone"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="(555) 123-4567"
                  value={formData.customer_phone}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="table_id"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Table
                </label>
                {loadingTables ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                    Loading tables...
                  </div>
                ) : availableTables.length === 0 && tables.length > 0 ? (
                  <div className="w-full px-4 py-3 border border-red-300 rounded-lg bg-red-50 text-red-700 text-sm">
                    No tables available for this time slot
                  </div>
                ) : tables.length === 0 ? (
                  <div className="w-full px-4 py-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                    No tables configured. Please set up tables first.
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
                    <option value="">Select a table</option>
                    {availableTables.map(table => (
                      <option key={table.id} value={table.id}>
                        {table.table_identifier} (Seats {table.capacity})
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
                  Party Size
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
                        ? `${formData.party_size} ${formData.party_size === '1' ? 'person' : 'people'}`
                        : 'Select party size'}
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
                  Date
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
                  Time
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
                  htmlFor="status"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Status
                </label>
                <select
                  name="status"
                  id="status"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="pending">🟡 Pending</option>
                  <option value="confirmed">🟢 Confirmed</option>
                  <option value="cancelled">🔴 Cancelled</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="notes"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Special Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Allergies, special requests, or other notes..."
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
              <div>
                {reservation && onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      '🗑️ Delete'
                    )}
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {reservation ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {reservation
                        ? 'Update Reservation'
                        : 'Create Reservation'}
                    </>
                  )}
                </button>
              </div>
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
                Cancel
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                Party Size
              </h3>
              <button
                onClick={() => {
                  setFormData({ ...formData, party_size: tempPartySize })
                  setShowPickerModal(false)
                }}
                className="text-blue-600 font-medium"
              >
                Done
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
                        {size} {size === '1' ? 'person' : 'people'}
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
                  Or enter a number
                </label>
                <input
                  type="number"
                  id="manual_party_size"
                  min="1"
                  placeholder="Enter party size"
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
