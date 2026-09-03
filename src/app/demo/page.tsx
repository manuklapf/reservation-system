'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/contexts/I18nContext'
import {
  clearDemoSession,
  readDemoSession,
  storeDemoSession,
} from '@/lib/demo/session'
import Button from '@/components/Button'
import { UtensilsCrossed } from '@/components/icons'
import LoadingScreen from '@/components/LoadingScreen'

/**
 * Public entry point for the "try it out" link. Provisions a private sandbox
 * for this visitor, signs them into it and drops them on the dashboard. A
 * still-valid sandbox from an earlier visit is reused rather than replaced.
 */
export default function DemoPage() {
  const router = useRouter()
  const { messages } = useI18n()
  const t = messages.demo
  const [error, setError] = useState('')
  const started = useRef(false)

  const start = useCallback(async () => {
    if (!supabase) {
      setError(t.error)
      return
    }
    setError('')

    const existing = readDemoSession()
    if (existing) {
      const { error: resumeError } = await supabase.auth.signInWithPassword({
        email: existing.email,
        password: existing.password,
      })
      if (!resumeError) {
        router.replace('/dashboard')
        return
      }
      // The sandbox was already reset — fall through and get a new one.
      clearDemoSession()
    }

    try {
      const res = await fetch('/api/demo', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? t.error)

      storeDemoSession({
        email: data.email,
        password: data.password,
        expiresAt: data.expiresAt,
      })

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (signInError) throw signInError

      router.replace('/dashboard')
    } catch (e) {
      console.error('Demo start failed:', e)
      setError(e instanceof Error ? e.message : t.error)
    }
  }, [router, t.error])

  useEffect(() => {
    // React runs effects twice in development; one sandbox per visit is plenty.
    if (started.current) return
    started.current = true
    start()
  }, [start])

  return (
    <div className="min-h-screen paper-plain flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
          <UtensilsCrossed className="h-6 w-6 text-gray-800" />
        </div>

        {error ? (
          <>
            <h1 className="text-xl font-bold text-gray-900">{t.errorTitle}</h1>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <Button
              className="mt-6 w-full"
              onClick={() => {
                started.current = true
                start()
              }}
            >
              {t.retry}
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
            <p className="mt-2 text-sm text-gray-600">{t.subtitle}</p>
            <LoadingScreen variant="panel" label={null} />
          </>
        )}

        <p className="mt-6 text-xs text-gray-500">{t.resetNotice}</p>
      </div>
    </div>
  )
}
