'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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
  onDelete
}: ReservationModalProps) {
  const { user, tenantId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    table_number: '',
    date: '',
    time: '',
    party_size: '',
    notes: '',
    status: 'pending'
  })

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (reservation) {
        // Editing existing reservation
        setFormData({
          customer_name: reservation.customer_name,
          customer_phone: reservation.customer_phone,
          table_number: reservation.table_number.toString(),
          date: reservation.date,
          time: reservation.time,
          party_size: reservation.party_size.toString(),
          notes: reservation.notes || '',
          status: reservation.status
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
          table_number: '1',
          date: defaultDate,
          time: defaultTime,
          party_size: '2',
          notes: '',
          status: 'pending'
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
      alert('Error: Database connection not available. Please check your configuration.')
      return
    }

    setLoading(true)
    
    try {
      const reservationData = {
        ...formData,
        table_number: parseInt(formData.table_number),
        party_size: parseInt(formData.party_size),
        tenant_id: tenantId,
        created_by: user.id
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
    } catch (error) {
      console.error('Error saving reservation:', error)
      alert('Error saving reservation')
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
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
                {reservation ? 'Update reservation details' : 'Create a new table reservation'}
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
                <label htmlFor="customer_name" className="block text-sm font-semibold text-gray-700 mb-2">
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
                <label htmlFor="customer_phone" className="block text-sm font-semibold text-gray-700 mb-2">
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
                <label htmlFor="table_number" className="block text-sm font-semibold text-gray-700 mb-2">
                  Table Number
                </label>
                <input
                  type="number"
                  name="table_number"
                  id="table_number"
                  required
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="1"
                  value={formData.table_number}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="party_size" className="block text-sm font-semibold text-gray-700 mb-2">
                  Party Size
                </label>
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
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">
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
                <label htmlFor="time" className="block text-sm font-semibold text-gray-700 mb-2">
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
                <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
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
                <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
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
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {reservation ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {reservation ? 'Update Reservation' : 'Create Reservation'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}