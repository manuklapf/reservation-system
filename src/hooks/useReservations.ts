import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Reservation } from '@/types/reservation'

// Sample data for testing
const sampleReservations: Reservation[] = [
  {
    id: '1',
    customer_name: 'John Doe',
    customer_phone: '123-456-7890',
    table_number: 5,
    table_id: null,
    date: '2025-10-15',
    time: '18:00',
    party_size: 4,
    status: 'confirmed',
    notes: 'Window seat requested',
    created_at: '2025-10-10T10:00:00Z',
    updated_at: '2025-10-10T10:00:00Z',
    tenant_id: 'sample-tenant',
    created_by: 'sample-user',
  },
  {
    id: '2',
    customer_name: 'Jane Smith',
    customer_phone: '987-654-3210',
    table_number: 3,
    table_id: null,
    date: '2025-10-16',
    time: '19:30',
    party_size: 2,
    status: 'pending',
    notes: null,
    created_at: '2025-10-11T14:30:00Z',
    updated_at: '2025-10-11T14:30:00Z',
    tenant_id: 'sample-tenant',
    created_by: 'sample-user',
  },
]

export function useReservations(
  tenantId: string | null,
  refreshKey: number = 0
) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReservations = useCallback(async () => {
    setLoading(true)

    // Try to fetch real data first, fall back to sample data
    if (supabase && tenantId) {
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
        setLoading(false)
        return
      } catch (error) {
        console.error('Error fetching reservations:', error)
      }
    }

    // Use sample data when Supabase is not available or on error
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setReservations(sampleReservations)
    } catch (error) {
      console.error('Error loading reservations:', error)
      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations, refreshKey])

  return { reservations, loading, refetch: fetchReservations }
}
