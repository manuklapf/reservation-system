'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { startCheckout } from '@/lib/startCheckout'
import { Clock } from '@/components/icons'
import Button from '@/components/Button'

/**
 * Slim countdown banner shown while an account is in its trial period.
 * Renders nothing for active (paid) or expired accounts.
 */
export default function TrialBanner() {
  const { account, trialDaysLeft } = useAuth()
  const { messages } = useI18n()
  const t = messages.trial
  const [loading, setLoading] = useState(false)

  if (!account || account.mode !== 'trial') return null

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      await startCheckout()
    } catch (e) {
      setLoading(false)
      alert(e instanceof Error ? e.message : t.checkoutError)
    }
  }

  const label =
    trialDaysLeft <= 1
      ? t.bannerDayLeft
      : t.bannerDaysLeft.replace('{days}', String(trialDaysLeft))

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-800 text-sm min-w-0">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        <Button size="sm" onClick={handleUpgrade} disabled={loading}>
          {loading ? t.redirecting : t.upgrade}
        </Button>
      </div>
    </div>
  )
}
