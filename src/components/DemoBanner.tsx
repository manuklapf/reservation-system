'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { clearDemoSession } from '@/lib/demo/session'
import { Clock } from '@/components/icons'
import Button from '@/components/Button'

/**
 * Shown only inside a demo sandbox: counts down to the reset and offers a
 * restart. Once the deadline passes the sandbox is gone server-side, so the
 * visitor is signed out and sent back to /demo for a fresh one.
 */
export default function DemoBanner() {
  const { demo, signOut } = useAuth()
  const { messages } = useI18n()
  const router = useRouter()
  const t = messages.demo
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!demo) return
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [demo])

  const msLeft = demo ? new Date(demo.expiresAt).getTime() - now : 0

  useEffect(() => {
    if (!demo || msLeft > 0) return
    clearDemoSession()
    signOut().finally(() => router.replace('/demo'))
  }, [demo, msLeft, signOut, router])

  if (!demo) return null

  const minutes = Math.max(0, Math.floor(msLeft / 60_000))
  const hours = Math.floor(minutes / 60)
  const remaining =
    hours > 0
      ? `${hours} ${t.hoursShort} ${minutes % 60} ${t.minutesShort}`
      : `${minutes} ${t.minutesShort}`

  const restart = async () => {
    clearDemoSession()
    await signOut()
    router.replace('/demo')
  }

  return (
    <div className="bg-info-soft border-b border-info/45">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-info-ink text-sm min-w-0">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {t.bannerResetIn.replace('{time}', remaining)}
          </span>
        </div>
        <Button size="sm" variant="secondary" onClick={restart}>
          {t.restart}
        </Button>
      </div>
    </div>
  )
}
