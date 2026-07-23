'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { supabase } from '@/lib/supabase'
import { ArrowLeft } from '@/components/icons'
import AccountView, {
  defaultAccountLabels,
  type AccountSubscription,
  type AccountViewLabels,
  type PlanStatusKind,
} from '@/components/account/AccountView'

// Thin adapter around the shared <AccountView> component (also used by the
// marketing site). It sources data from the app's auth context + supabase and
// wires the edit/cancel actions to the app's API routes, translating labels
// through the app's i18n messages.

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

  const labels: AccountViewLabels = useMemo(
    () => ({
      ...defaultAccountLabels,
      eyebrow: t.eyebrow,
      title: t.title,
      emailLabel: t.emailLabel,
      organizationLabel: t.restaurantLabel,
      roleLabel: t.roleLabel,
      planLabel: t.planLabel,
      trialDaysLeft: t.trialDaysLeft,
      profile: t.profile,
      profileDesc: t.profileDesc,
      nameLabel: t.nameLabel,
      changeEmail: t.changeEmail,
      changeEmailDesc: t.changeEmailDesc,
      newEmailLabel: t.newEmailLabel,
      emailChangeNotice: t.emailChangeNotice,
      updateEmail: t.updateEmail,
      changePassword: t.changePassword,
      changePasswordDesc: t.changePasswordDesc,
      currentPasswordLabel: t.currentPasswordLabel,
      newPasswordLabel: t.newPasswordLabel,
      confirmPasswordLabel: t.confirmPasswordLabel,
      updatePassword: t.updatePassword,
      passwordMismatch: t.passwordMismatch,
      passwordChanged: t.passwordChanged,
      subscription: t.subscription,
      subscriptionActive: t.subscriptionActive,
      subscriptionTrial: t.subscriptionTrial,
      subscriptionNone: t.subscriptionNone,
      planField: t.planField,
      statusField: t.statusField,
      renewsOn: t.renewsOn,
      accessUntil: t.accessUntil,
      paymentMethodField: t.paymentMethodField,
      manageSubscription: t.manageSubscription,
      updatePayment: t.updatePayment,
      openApp: t.openApp,
      subscribeCta: t.subscribeCta,
      cancelSubscription: t.cancelSubscription,
      cancelModalTitle: t.cancelModalTitle,
      cancelModalBody: t.cancelModalBody,
      cancelReasonLabel: t.cancelReasonLabel,
      cancelReasonPlaceholder: t.cancelReasonPlaceholder,
      cancelConfirm: t.cancelConfirm,
      keepSubscription: t.keepSubscription,
      cancelScheduledNotice: t.cancelScheduledNotice,
      save: t.save,
      saving: t.saving,
      saved: t.saved,
      genericError: t.genericError,
      loginRequired: t.loginRequired,
      backLink: t.backLink,
    }),
    [t]
  )

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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link
              href="/dashboard/settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label={t.backToSettings}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">{t.title}</h1>
            <div className="w-9" />
          </div>
        </div>
      </nav>

      <AccountView
        theme="clean"
        showHeader={false}
        labels={labels}
        email={user.email ?? ''}
        organizationName={tenantName}
        roleLabel={roleLabel}
        isAdmin={isAdmin || isPlatformAdmin}
        subscription={subscription}
        initialName={staffName ?? ''}
        onSaveName={async name => {
          await patchAccount({ name })
        }}
        onChangeEmail={async (newEmail, currentPassword) => {
          const result = await patchAccount({ newEmail, currentPassword })
          if (result.emailChanged) {
            await signOut()
            router.push('/auth/login')
          }
          return { emailChanged: !!result.emailChanged }
        }}
        onChangePassword={async (currentPassword, newPassword) => {
          await patchAccount({ newPassword, currentPassword })
        }}
        onCancelSubscription={async reason => {
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
        }}
      />
    </div>
  )
}
