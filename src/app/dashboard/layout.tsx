'use client'

import { useAuth } from '@/contexts/AuthContext'
import TrialBanner from '@/components/TrialBanner'
import AccountGate from '@/components/AccountGate'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { accessLocked, isPlatformAdmin } = useAuth()

  // Platform admins manage billing elsewhere and are redirected off /dashboard;
  // never gate them here. Paid ('active') accounts are never locked.
  if (accessLocked && !isPlatformAdmin) {
    return <AccountGate />
  }

  return (
    <>
      <TrialBanner />
      {children}
    </>
  )
}
