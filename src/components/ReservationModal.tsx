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
        const defaultDate = selectedDate 
          ? selectedDate.toISOString().split('T')[0] 
          : new Date().toISOString().split('T')[0]
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {reservation ? 'Edit Reservation' : 'New Reservation'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                name="customer_name"
                id="customer_name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.customer_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="customer_phone"
                id="customer_phone"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.customer_phone}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="table_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Table Number *
                </label>
                <input
                  type="number"
                  name="table_number"
                  id="table_number"
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.table_number}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="party_size" className="block text-sm font-medium text-gray-700 mb-1">
                  Party Size *
                </label>
                <input
                  type="number"
                  name="party_size"
                  id="party_size"
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.party_size}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  id="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                  Time *
                </label>
                <input
                  type="time"
                  name="time"
                  id="time"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.time}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                id="status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                id="notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Special requests, allergies, etc."
              />
            </div>

            <div className="flex justify-between pt-4">
              <div>
                {reservation && onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (reservation ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}