'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { startCheckout } from '@/lib/startCheckout'
import { downloadReservationsXlsx } from '@/lib/exportReservations'
import { Clock, ClipboardList, LogOut } from '@/components/icons'
import Button from '@/components/Button'
import { useRouter } from 'next/navigation'

/**
 * Full-screen paywall shown when a trial has expired and the account is not
 * paid. Offers the two spec'd options: upgrade (LemonSqueezy) or export all
 * reservations to Excel before leaving.
 */
export default function AccountGate() {
  const { signOut } = useAuth()
  const { messages } = useI18n()
  const router = useRouter()
  const t = messages.trial
  const [upgrading, setUpgrading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const handleUpgrade = async () => {
    setError('')
    setUpgrading(true)
    try {
      await startCheckout()
    } catch (e) {
      setUpgrading(false)
      setError(e instanceof Error ? e.message : t.checkoutError)
    }
  }

  const handleExport = async () => {
    setError('')
    setExporting(true)
    try {
      await downloadReservationsXlsx()
    } catch (e) {
      setError(e instanceof Error ? e.message : t.exportError)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/25 text-warning-ink">
          <Clock className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">{t.gateTitle}</h1>
        <p className="mt-2 text-sm text-gray-500">{t.gateSubtitle}</p>

        <div className="mt-6 space-y-3">
          <Button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="w-full"
          >
            {upgrading ? t.redirecting : t.upgradeCta}
          </Button>
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={exporting}
            className="w-full"
          >
            <ClipboardList className="h-4 w-4" />
            {exporting ? t.exporting : t.exportCta}
          </Button>
        </div>

        {error && <p className="mt-4 text-xs text-danger-ink">{error}</p>}

        <button
          onClick={async () => {
            await signOut()
            router.push('/auth/login')
          }}
          className="mt-6 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t.signOut}
        </button>
      </div>
    </div>
  )
}
