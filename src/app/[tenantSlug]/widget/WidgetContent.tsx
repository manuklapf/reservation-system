'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/contexts/I18nContext'
import { CalendarCheck } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
}

export default function WidgetContent({ tenantSlug }: { tenantSlug: string }) {
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

  if (loading || !tenant) return null

  return (
    <div className="inline-flex">
      <a
        href={`/${tenantSlug}/request`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-full shadow-md transition-colors"
      >
        <CalendarCheck className="h-4 w-4" />
        {t.title}
      </a>
    </div>
  )
}
