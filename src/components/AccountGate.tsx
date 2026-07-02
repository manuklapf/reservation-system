'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { startCheckout } from '@/lib/startCheckout'
import { downloadReservationsXlsx } from '@/lib/exportReservations'
import { Clock, ClipboardList, LogOut } from '@/components/icons'
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
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Clock className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">{t.gateTitle}</h1>
        <p className="mt-2 text-sm text-gray-500">{t.gateSubtitle}</p>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {upgrading ? t.redirecting : t.upgradeCta}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            {exporting ? t.exporting : t.exportCta}
          </button>
        </div>

        {error && <p className="mt-4 text-xs text-red-500">{error}</p>}

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
