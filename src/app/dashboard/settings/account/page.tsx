'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { supabase } from '@/lib/supabase'
import { ArrowLeft } from '@/components/icons'
import Button from '@/components/Button'
import NavBar from '@/components/NavBar'
import AccountView, {
  type AccountSubscription,
  type PlanStatusKind,
} from '@/components/account/AccountView'

// Thin adapter around <AccountView>. It sources data from the app's auth
// context + supabase and wires the edit/cancel actions to the app's API routes.

interface SubscriptionRow {
  status: string
  plan_name: string | null
  renews_at: string | null
  ends_at: string | null
  card_brand: string | null
  card_last_four: string | null
  customer_portal_url: string | null
  update_payment_url: string | null
}

const ACTIVE_LS_STATUSES = new Set([
  'active',
  'on_trial',
  'past_due',
  'cancelled',
  'paused',
])

async function patchAccount(body: Record<string, string>) {
  if (!supabase) throw new Error('Not configured')
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch('/api/account', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error ?? 'Update failed.')
  return json as { ok: true; emailChanged?: boolean }
}

export default function AccountPage() {
  const {
    user,
    tenantId,
    role,
    staffName,
    account,
    planStatus,
    isAdmin,
    isPlatformAdmin,
    demo,
    signOut,
    refreshAccount,
  } = useAuth()
  const router = useRouter()
  const { messages } = useI18n()
  const t = messages.accountPage

  const [tenantName, setTenantName] = useState<string | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [sub, setSub] = useState<SubscriptionRow | null>(null)

  useEffect(() => {
    if (!supabase || !tenantId) return
    supabase
      .from('tenants')
      .select('name, trial_ends_at')
      .eq('id', tenantId)
      .single()
      .then(({ data }) => {
        if (data?.name) setTenantName(data.name)
        setTrialEndsAt((data?.trial_ends_at as string | null) ?? null)
      })
  }, [tenantId])

  const loadSubscription = useCallback(async () => {
    if (!supabase || !user) return
    const { data } = await supabase
      .from('subscriptions')
      .select(
        'status, plan_name, renews_at, ends_at, card_brand, card_last_four, customer_portal_url, update_payment_url'
      )
      .eq('user_id', user.id)
      .maybeSingle()
    setSub((data as SubscriptionRow) ?? null)
  }, [user])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  const subscription: AccountSubscription = useMemo(() => {
    if (sub && ACTIVE_LS_STATUSES.has(sub.status)) {
      const kind: PlanStatusKind =
        sub.status === 'on_trial' ? 'trial' : 'active'
      return {
        statusKind: kind,
        statusLabel: kind === 'trial' ? t.subscriptionTrial : t.planActive,
        planName: sub.plan_name,
        renewsAt: sub.renews_at,
        endsAt: sub.ends_at,
        paymentMethod: sub.card_brand
          ? `${sub.card_brand} ···· ${sub.card_last_four}`
          : null,
        customerPortalUrl: sub.customer_portal_url,
        updatePaymentUrl: sub.update_payment_url,
        cancelScheduled: sub.status === 'cancelled',
      }
    }

    // Fall back to the tenant's effective plan state from the auth context.
    if (planStatus === 'active') {
      return {
        statusKind: 'active',
        statusLabel: t.planActive,
        planName: sub?.plan_name ?? null,
      }
    }
    if (account?.mode === 'trial') {
      return {
        statusKind: 'trial',
        statusLabel: t.planTrial,
        trialDaysLeft: account.daysLeft,
        endsAt: trialEndsAt,
      }
    }
    return { statusKind: 'expired', statusLabel: t.planExpired }
  }, [sub, planStatus, account, trialEndsAt, t])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">{t.loginRequired}</p>
      </div>
    )
  }

  const roleLabel = isPlatformAdmin
    ? t.rolePlatformAdmin
    : role === 'admin'
      ? t.roleAdmin
      : t.roleStaff

  // In a sandbox the account is scenery: the login is thrown away with the
  // tenant and there is no real subscription behind it. Omitting the handlers
  // leaves AccountView showing the overview only — /api/account and the billing
  // routes refuse demo tenants regardless, this just hides the dead controls.
  const selfService = demo
    ? {}
    : {
        onSaveName: async (name: string) => {
          await patchAccount({ name })
        },
        onChangeEmail: async (newEmail: string, currentPassword: string) => {
          const result = await patchAccount({ newEmail, currentPassword })
          if (result.emailChanged) {
            await signOut()
            router.push('/auth/login')
          }
          return { emailChanged: !!result.emailChanged }
        },
        onChangePassword: async (
          currentPassword: string,
          newPassword: string
        ) => {
          await patchAccount({ newPassword, currentPassword })
        },
        onCancelSubscription: async (reason: string) => {
          if (!supabase) throw new Error('Not configured')
          const {
            data: { session },
          } = await supabase.auth.getSession()
          const res = await fetch('/api/subscription/cancel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token ?? ''}`,
            },
            body: JSON.stringify({ reason }),
          })
          const json = await res.json().catch(() => null)
          if (!res.ok) throw new Error(json?.error ?? t.genericError)
          await Promise.all([loadSubscription(), refreshAccount()])
        },
      }

  return (
    <div className="min-h-screen bg-background/40">
      <NavBar
        left={
          <Button
            onClick={() => router.push('/dashboard/settings')}
            aria-label={t.backToSettings}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        center={
          <h1 className="text-xl font-semibold text-gray-900">{t.title}</h1>
        }
        right={<div className="w-9" />}
      />

      {demo && (
        <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-info/45 bg-info-soft p-4 text-sm text-info-ink">
            {messages.demo.accountNotice}
          </div>
        </div>
      )}

      <AccountView
        showHeader={false}
        email={user.email ?? ''}
        organizationName={tenantName}
        roleLabel={roleLabel}
        isAdmin={!demo && (isAdmin || isPlatformAdmin)}
        subscription={subscription}
        initialName={staffName ?? ''}
        {...selfService}
      />
    </div>
  )
}
