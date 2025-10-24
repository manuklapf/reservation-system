'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Reservation {
  id: string
  customer_name: string
  customer_phone: string
  table_number: number | null
  table_id: string | null
  date: string
  time: string
  party_size: number
  status: string
  notes: string | null
  tables?: {
    table_identifier: string
    capacity: number
  }
}

export default function DashboardPage() {
  const { user, loading, signOut, tenantId } = useAuth()
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loadingReservations, setLoadingReservations] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && tenantId) {
      fetchReservations()
    }
  }, [user, tenantId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReservations = async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(
          `
          *,
          tables (
            table_identifier,
            capacity
          )
        `
        )
        .eq('tenant_id', tenantId)
        .order('date', { ascending: true })
        .order('time', { ascending: true })

      if (error) throw error
      setReservations(data || [])
    } catch (error) {
      console.error('Error fetching reservations:', error)
    } finally {
      setLoadingReservations(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Reservation Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Reservations</h2>
            <div className="space-x-2">
              <Link
                href="/dashboard/setup"
                className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Setup Tables
              </Link>
              <Link
                href="/dashboard/calendar"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Calendar View
              </Link>
            </div>
          </div>

          {loadingReservations ? (
            <div className="text-center py-8">
              <div className="text-lg">Loading reservations...</div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {reservations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No reservations found.</p>
                  <Link
                    href="/dashboard/reservations/new"
                    className="mt-2 inline-block text-blue-600 hover:text-blue-800"
                  >
                    Create your first reservation
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {reservations.map(reservation => (
                    <li key={reservation.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-blue-600 truncate">
                                {reservation.customer_name}
                              </p>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    reservation.status === 'confirmed'
                                      ? 'bg-green-100 text-green-800'
                                      : reservation.status === 'cancelled'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {reservation.status}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  Table{' '}
                                  {reservation.tables?.table_identifier ||
                                    reservation.table_number ||
                                    'N/A'}{' '}
                                  • {reservation.party_size} guests
                                </p>
                                <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                  {reservation.date} at {reservation.time}
                                </p>
                              </div>
                            </div>
                            {reservation.notes && (
                              <p className="mt-2 text-sm text-gray-600">
                                Notes: {reservation.notes}
                              </p>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <Link
                              href={`/dashboard/reservations/${reservation.id}/edit`}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
