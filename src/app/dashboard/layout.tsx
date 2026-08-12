'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import TrialBanner from '@/components/TrialBanner'
import DemoBanner from '@/components/DemoBanner'
import AccountGate from '@/components/AccountGate'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { accessLocked, isPlatformAdmin, planStatus, refreshAccount } =
    useAuth()
  const [upgraded, setUpgraded] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('upgraded') === '1') {
      setUpgraded(true)
    }
  }, [])

  // Coming back from a successful LemonSqueezy checkout: the webhook flips the
  // tenant to 'active' asynchronously, so poll a few times until the plan shows
  // active, then drop the ?upgraded flag from the URL.
  useEffect(() => {
    if (!upgraded) return
    if (planStatus === 'active') {
      window.history.replaceState(null, '', '/dashboard')
      setUpgraded(false)
      return
    }
    let tries = 0
    const timer = setInterval(async () => {
      tries += 1
      await refreshAccount()
      if (tries >= 10) clearInterval(timer)
    }, 2000)
    return () => clearInterval(timer)
  }, [upgraded, planStatus, refreshAccount])

  // Platform admins manage billing elsewhere and are redirected off /dashboard;
  // never gate them here. Paid ('active') accounts are never locked.
  if (accessLocked && !isPlatformAdmin) {
    return <AccountGate />
  }

  return (
    <>
      <DemoBanner />
      <TrialBanner />
      {children}
    </>
  )
}
