'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/contexts/I18nContext'

interface Reservation {
  id: string
  customer_name: string
  table_number: number
  date: string
  time: string
  party_size: number
  status: string
}

interface Tenant {
  id: string
  name: string
  slug: string
}

export default function TenantReservationsContent({
  tenantSlug,
}: {
  tenantSlug: string
}) {
  const { messages, language } = useI18n()
  const t = messages.tenant
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  useEffect(() => {
    fetchTenantAndReservations()
  }, [tenantSlug, selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTenantAndReservations = async () => {
    if (!supabase) return

    try {
      // Find tenant by slug
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .single()

      if (tenantError) {
        console.error('Tenant not found:', tenantError)
        return
      }

      setTenant(tenantData)

      // Fetch reservations for this tenant
      const { data: reservationsData, error: reservationsError } =
        await supabase
          .from('reservations')
          .select(
            'id, customer_name, table_number, date, time, party_size, status'
          )
          .eq('tenant_id', tenantData.id)
          .eq('date', selectedDate)
          .eq('status', 'confirmed')
          .order('time', { ascending: true })

      if (reservationsError) throw reservationsError
      setReservations(reservationsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">{t.loading}</div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t.restaurantNotFound}
          </h1>
          <p className="text-gray-600">{t.restaurantMissing}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {tenant.name}
          </h1>
          <p className="text-lg text-gray-600">{t.currentReservations}</p>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="max-w-xs mx-auto">
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t.selectDate}
            </label>
            <input
              type="date"
              id="date"
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Reservations Display */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {t.reservationsFor}{' '}
              {new Date(selectedDate).toLocaleDateString(
                language === 'de' ? 'de-DE' : 'en-US',
                {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }
              )}
            </h2>
          </div>

          {reservations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500 text-lg">
                {t.noConfirmedReservations}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reservations.map(reservation => (
                <div key={reservation.id} className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {reservation.customer_name}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {messages.common.confirmed}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center text-sm text-gray-600 space-x-4">
                        <div className="flex items-center">
                          <span className="font-medium">{t.time}:</span>
                          <span className="ml-1">
                            {formatTime(reservation.time)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">{t.table}:</span>
                          <span className="ml-1">
                            {reservation.table_number}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">{t.partySize}:</span>
                          <span className="ml-1">{reservation.party_size}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">{t.poweredBy}</p>
        </div>
      </div>
    </div>
  )
}
