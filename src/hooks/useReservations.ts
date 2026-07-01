import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Reservation } from '@/types/reservation'

export function useReservations(
  tenantId: string | null,
  refreshKey: number = 0
) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReservations = useCallback(async () => {
    setLoading(true)

    // Only fetch from Supabase if we have a tenant ID
    if (!tenantId || !supabase) {
      console.warn('No tenant ID or Supabase client, cannot fetch reservations')
      setReservations([])
      setLoading(false)
      return
    }

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

      setReservations(
        (data || []).filter(r => !r.is_requested || !!r.approved_by)
      )
    } catch (error) {
      console.error('Error fetching reservations:', error)
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
