'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import AccordionItem from '@/components/AccordionItem'
import Button from '@/components/Button'
import { Check, MoreVertical } from '@/components/icons'

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export type PlanStatusKind = 'trial' | 'active' | 'expired' | 'none'

export interface AccountSubscription {
  /** Normalized plan state used for badges and gating. */
  statusKind: PlanStatusKind
  /** Human label for the current status (already localized by the caller). */
  statusLabel: string
  planName?: string | null
  /** Whole days left in a trial; only meaningful when statusKind === 'trial'. */
  trialDaysLeft?: number | null
  /** ISO date the plan next renews (active subscriptions). */
  renewsAt?: string | null
  /** ISO date access ends (cancelled/expiring subscriptions). */
  endsAt?: string | null
  /** e.g. "Visa ···· 4242". */
  paymentMethod?: string | null
  customerPortalUrl?: string | null
  updatePaymentUrl?: string | null
  /** True when the subscription is already set to cancel at period end. */
  cancelScheduled?: boolean
}

export interface AccountViewProps {
  email: string
  organizationName?: string | null
  roleLabel: string
  isAdmin: boolean
  subscription: AccountSubscription

  /** Initial value for the display-name field. */
  initialName?: string
  /** Render the built-in page header (eyebrow + title + email). Defaults to true. */
  showHeader?: boolean

  // Async handlers. Any omitted handler hides its corresponding section.
  onSaveName?: (name: string) => Promise<void>
  onChangeEmail?: (
    newEmail: string,
    currentPassword: string
  ) => Promise<{ emailChanged: boolean }>
  onChangePassword?: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>
  onCancelSubscription?: (reason: string) => Promise<void>
  onStartCheckout?: () => Promise<void>
}

const badgeClass: Record<PlanStatusKind, string> = {
  active: 'account-badge-active',
  trial: 'account-badge-trial',
  expired: 'account-badge-expired',
  none: 'account-badge-none',
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface FieldStatus {
  error: string
  success: string
}

function Feedback({ s }: { s: FieldStatus }) {
  if (s.error)
    return (
      <p className="account-feedback-error" role="alert">
        {s.error}
      </p>
    )
  if (s.success)
    return (
      <p className="account-feedback-success">
        <Check className="h-4 w-4" />
        {s.success}
      </p>
    )
  return null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountView(props: AccountViewProps) {
  const {
    email,
    organizationName,
    roleLabel,
    isAdmin,
    subscription,
    initialName = '',
    showHeader = true,
    onSaveName,
    onChangeEmail,
    onChangePassword,
    onCancelSubscription,
    onStartCheckout,
  } = props

  const { messages } = useI18n()
  const t = messages.accountPage

  // Profile name
  const [name, setName] = useState(initialName)
  const [nameStatus, setNameStatus] = useState<FieldStatus>({
    error: '',
    success: '',
  })
  const [savingName, setSavingName] = useState(false)

  // Email change
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailStatus, setEmailStatus] = useState<FieldStatus>({
    error: '',
    success: '',
  })
  const [savingEmail, setSavingEmail] = useState(false)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<FieldStatus>({
    error: '',
    success: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)

  // Cancel-subscription modal + its overflow ("⋮") menu.
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [startingCheckout, setStartingCheckout] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  const errMessage = (err: unknown) =>
    err instanceof Error ? err.message : t.genericError

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onSaveName) return
    setNameStatus({ error: '', success: '' })
    setSavingName(true)
    try {
      await onSaveName(name)
      setNameStatus({ error: '', success: t.saved })
    } catch (err) {
      setNameStatus({ error: errMessage(err), success: '' })
    }
    setSavingName(false)
  }

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onChangeEmail) return
    setEmailStatus({ error: '', success: '' })
    setSavingEmail(true)
    try {
      // When the email actually changed the caller handles sign-out/redirect.
      const { emailChanged } = await onChangeEmail(newEmail, emailPassword)
      if (!emailChanged) setEmailStatus({ error: '', success: t.saved })
    } catch (err) {
      setEmailStatus({ error: errMessage(err), success: '' })
    }
    setSavingEmail(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onChangePassword) return
    setPasswordStatus({ error: '', success: '' })
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ error: t.passwordMismatch, success: '' })
      return
    }
    setSavingPassword(true)
    try {
      await onChangePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordStatus({ error: '', success: t.passwordChanged })
    } catch (err) {
      setPasswordStatus({ error: errMessage(err), success: '' })
    }
    setSavingPassword(false)
  }

  const handleConfirmCancel = async () => {
    if (!onCancelSubscription) return
    setCancelError('')
    setCancelling(true)
    try {
      await onCancelSubscription(cancelReason.trim())
      setShowCancel(false)
      setCancelReason('')
    } catch (err) {
      setCancelError(errMessage(err))
    }
    setCancelling(false)
  }

  const handleStartCheckout = async () => {
    if (!onStartCheckout) return
    setStartingCheckout(true)
    try {
      await onStartCheckout()
    } finally {
      setStartingCheckout(false)
    }
  }

  const hasSubscription =
    subscription.statusKind === 'active' || subscription.statusKind === 'trial'
  const canCancel =
    isAdmin &&
    !!onCancelSubscription &&
    subscription.statusKind === 'active' &&
    !subscription.cancelScheduled
  const trialDays = subscription.trialDaysLeft

  return (
    <div className="account-page">
      {showHeader && (
        <div className="mb-8">
          <span className="account-eyebrow">{t.eyebrow}</span>
          <h1 className="account-title">{t.title}</h1>
          <p className="account-subtitle">{email}</p>
        </div>
      )}

      {/* Overview card */}
      <div className="account-card">
        <div className="account-overview-grid">
          <div>
            <p className="account-overview-label">{t.emailLabel}</p>
            <p className="account-overview-value">{email}</p>
          </div>
          <div>
            <p className="account-overview-label">{t.restaurantLabel}</p>
            <p className="account-overview-value">{organizationName ?? '—'}</p>
          </div>
          <div>
            <p className="account-overview-label">{t.roleLabel}</p>
            <p className="account-overview-value">{roleLabel}</p>
          </div>
          <div>
            <p className="account-overview-label">{t.planLabel}</p>
            <p className="account-overview-value">
              {subscription.statusLabel}
              {subscription.statusKind === 'trial' &&
                typeof trialDays === 'number' && (
                  <span className="font-normal opacity-70">
                    {' · '}
                    {t.trialDaysLeft.replace('{days}', String(trialDays))}
                  </span>
                )}
            </p>
          </div>
        </div>
      </div>

      {/* Editable sections */}
      <div className="space-y-3">
        {onSaveName && (
          <AccordionItem title={t.profile} description={t.profileDesc}>
            <form onSubmit={handleSaveName} className="space-y-4 max-w-sm">
              <div>
                <label htmlFor="account-name" className="account-field-label">
                  {t.nameLabel}
                </label>
                <input
                  id="account-name"
                  type="text"
                  required
                  maxLength={100}
                  className="account-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={savingName}>
                  {savingName ? t.saving : t.save}
                </Button>
                <Feedback s={nameStatus} />
              </div>
            </form>
          </AccordionItem>
        )}

        {onChangeEmail && (
          <AccordionItem title={t.changeEmail} description={t.changeEmailDesc}>
            <form onSubmit={handleChangeEmail} className="space-y-4 max-w-sm">
              <div>
                <label
                  htmlFor="account-new-email"
                  className="account-field-label"
                >
                  {t.newEmailLabel}
                </label>
                <input
                  id="account-new-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="account-input"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="account-email-password"
                  className="account-field-label"
                >
                  {t.currentPasswordLabel}
                </label>
                <input
                  id="account-email-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="account-input"
                  value={emailPassword}
                  onChange={e => setEmailPassword(e.target.value)}
                />
              </div>
              <p className="account-help-text">{t.emailChangeNotice}</p>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={savingEmail}>
                  {savingEmail ? t.saving : t.updateEmail}
                </Button>
                <Feedback s={emailStatus} />
              </div>
            </form>
          </AccordionItem>
        )}

        {onChangePassword && (
          <AccordionItem
            title={t.changePassword}
            description={t.changePasswordDesc}
          >
            <form
              onSubmit={handleChangePassword}
              className="space-y-4 max-w-sm"
            >
              <div>
                <label
                  htmlFor="account-current-password"
                  className="account-field-label"
                >
                  {t.currentPasswordLabel}
                </label>
                <input
                  id="account-current-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="account-input"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="account-new-password"
                  className="account-field-label"
                >
                  {t.newPasswordLabel}
                </label>
                <input
                  id="account-new-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="account-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="account-confirm-password"
                  className="account-field-label"
                >
                  {t.confirmPasswordLabel}
                </label>
                <input
                  id="account-confirm-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="account-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? t.saving : t.updatePassword}
                </Button>
                <Feedback s={passwordStatus} />
              </div>
            </form>
          </AccordionItem>
        )}
      </div>

      {/* Subscription — admins only */}
      {isAdmin && (
        <div className="account-card mt-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="account-card-title">{t.subscription}</h2>
            {hasSubscription && canCancel && (
              <div className="relative" ref={menuRef}>
                <Button onClick={() => setMenuOpen(o => !o)}>
                  <MoreVertical className="h-5 w-5" />
                </Button>
                {menuOpen && (
                  <div className="account-menu-panel" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        setShowCancel(true)
                      }}
                      className="account-menu-item-danger"
                    >
                      {t.cancelSubscription}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {hasSubscription ? (
            <>
              <div className="account-overview-grid mb-2">
                <div>
                  <p className="account-overview-label">{t.planField}</p>
                  <p className="account-overview-value">
                    {subscription.planName ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="account-overview-label">{t.statusField}</p>
                  <span
                    className={`account-badge ${badgeClass[subscription.statusKind]}`}
                  >
                    {subscription.statusLabel}
                  </span>
                </div>
                <div>
                  <p className="account-overview-label">
                    {subscription.cancelScheduled ||
                    subscription.statusKind === 'trial'
                      ? t.accessUntil
                      : t.renewsOn}
                  </p>
                  <p className="account-overview-value">
                    {formatDate(
                      subscription.cancelScheduled ||
                        subscription.statusKind === 'trial'
                        ? subscription.endsAt
                        : subscription.renewsAt
                    )}
                  </p>
                </div>
                <div>
                  <p className="account-overview-label">
                    {t.paymentMethodField}
                  </p>
                  <p className="account-overview-value">
                    {subscription.paymentMethod ?? '—'}
                  </p>
                </div>
              </div>

              {subscription.cancelScheduled && (
                <div className="account-notice-warn my-4">
                  <p className="text-sm font-semibold">
                    {t.cancelScheduledNotice}
                  </p>
                </div>
              )}

              {(subscription.customerPortalUrl ||
                subscription.updatePaymentUrl) && (
                <div className="account-divider">
                  {subscription.customerPortalUrl && (
                    <a
                      href={subscription.customerPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      {t.manageSubscription}
                    </a>
                  )}
                  {subscription.updatePaymentUrl && (
                    <a
                      href={subscription.updatePaymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      {t.updatePayment}
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="account-notice-warn mb-6">
                <p className="text-sm font-semibold">{t.subscriptionNone}</p>
              </div>
              {onStartCheckout && (
                <Button
                  onClick={handleStartCheckout}
                  disabled={startingCheckout}
                >
                  {startingCheckout ? t.saving : t.subscribeCta}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancel && (
        <div
          className="account-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          onClick={() => !cancelling && setShowCancel(false)}
        >
          <div
            className="account-modal-panel"
            onClick={e => e.stopPropagation()}
          >
            <h3 id="cancel-modal-title" className="account-modal-title">
              {t.cancelModalTitle}
            </h3>
            <p className="account-modal-text">{t.cancelModalBody}</p>

            <div className="mt-4">
              <label htmlFor="cancel-reason" className="account-field-label">
                {t.cancelReasonLabel}
              </label>
              <textarea
                id="cancel-reason"
                className="account-textarea"
                placeholder={t.cancelReasonPlaceholder}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                maxLength={1000}
              />
            </div>

            {cancelError && (
              <p className="account-feedback-error mt-3" role="alert">
                {cancelError}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowCancel(false)}
                disabled={cancelling}
              >
                {t.keepSubscription}
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmCancel}
                disabled={cancelling}
              >
                {cancelling ? t.saving : t.cancelConfirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
