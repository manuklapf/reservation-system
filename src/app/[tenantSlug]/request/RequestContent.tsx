'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/contexts/I18nContext'
import ReservationRequestForm from '@/components/ReservationRequestForm'

interface Tenant {
  id: string
  name: string
  slug: string
}

export default function RequestContent({ tenantSlug }: { tenantSlug: string }) {
  const { messages } = useI18n()
  const t = messages.reservationRequest
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', tenantSlug)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setTenant(data)
        setLoading(false)
      })
  }, [tenantSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{t.loading}</p>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t.restaurantNotFound}
          </h1>
          <p className="text-gray-500">{t.restaurantNotFoundMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10">
      <ReservationRequestForm tenantId={tenant.id} tenantName={tenant.name} />
    </div>
  )
}
