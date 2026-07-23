'use client'

/**
 * AccountView — the unified account page, shared verbatim between
 * `reservation-system` and `reservation-system-marketing`.
 *
 * This file is the single source of truth: it must stay byte-for-byte
 * identical in both repositories. It is intentionally free of any project
 * specific imports (no auth context, no supabase client, no icon library) so
 * it can be dropped into either app unchanged. Everything project-specific —
 * where the data comes from, which API routes the actions hit, and the visual
 * theme — is injected through props by a thin per-project adapter page.
 *
 * Responsibilities:
 *   - Render the account overview (email, organization, role, plan).
 *   - Provide self-service edits: display name, email, password.
 *   - For admins, show subscription status and a cancel action whose
 *     confirmation modal captures a free-text reason.
 *
 * It owns all local form/modal state and feedback; the adapter only supplies
 * data and async handlers.
 */

import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export type AccountTheme = 'brutalist' | 'clean'

export type PlanStatusKind = 'trial' | 'active' | 'expired' | 'none'

export interface AccountSubscription {
  /** Normalized plan state used for badges and gating. */
  statusKind: PlanStatusKind
  /** Human label for the current status (already localized by the adapter). */
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

export interface AccountViewLabels {
  eyebrow: string
  title: string
  emailLabel: string
  organizationLabel: string
  roleLabel: string
  planLabel: string
  trialDaysLeft: string // uses "{days}" placeholder

  profile: string
  profileDesc: string
  nameLabel: string

  changeEmail: string
  changeEmailDesc: string
  newEmailLabel: string
  emailChangeNotice: string
  updateEmail: string

  changePassword: string
  changePasswordDesc: string
  currentPasswordLabel: string
  newPasswordLabel: string
  confirmPasswordLabel: string
  updatePassword: string
  passwordMismatch: string
  passwordChanged: string

  subscription: string
  subscriptionActive: string
  subscriptionTrial: string
  subscriptionNone: string
  planField: string
  statusField: string
  renewsOn: string
  accessUntil: string
  paymentMethodField: string
  manageSubscription: string
  updatePayment: string
  openApp: string
  subscribeCta: string

  cancelSubscription: string
  cancelModalTitle: string
  cancelModalBody: string
  cancelReasonLabel: string
  cancelReasonPlaceholder: string
  cancelConfirm: string
  keepSubscription: string
  cancelScheduledNotice: string

  save: string
  saving: string
  saved: string
  genericError: string
  loginRequired: string
  backLink: string
}

export interface AccountViewProps {
  theme: AccountTheme
  labels: AccountViewLabels

  email: string
  organizationName?: string | null
  roleLabel: string
  isAdmin: boolean
  subscription: AccountSubscription

  /** Initial value for the display-name field. */
  initialName?: string
  /** Optional "back" link target rendered at the foot / header. */
  backHref?: string
  /**
   * Render the built-in page header (eyebrow + title + email). Hosts that
   * already show an account title in their own chrome (e.g. the app's settings
   * nav bar) can pass false to avoid a duplicate heading. Defaults to true.
   */
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

// ---------------------------------------------------------------------------
// Default English labels (marketing uses these directly; the app overrides
// them with its i18n messages).
// ---------------------------------------------------------------------------

export const defaultAccountLabels: AccountViewLabels = {
  eyebrow: 'Your account',
  title: 'Account',
  emailLabel: 'Email',
  organizationLabel: 'Restaurant',
  roleLabel: 'Role',
  planLabel: 'Plan',
  trialDaysLeft: '{days} days left',

  profile: 'Profile',
  profileDesc: 'Your display name shown across the app',
  nameLabel: 'Name',

  changeEmail: 'Change email',
  changeEmailDesc: 'Update the email address you sign in with',
  newEmailLabel: 'New email address',
  emailChangeNotice:
    'After changing your email you will be signed out and need to log in again with the new address.',
  updateEmail: 'Update email',

  changePassword: 'Change password',
  changePasswordDesc: 'Choose a new password for your account',
  currentPasswordLabel: 'Current password',
  newPasswordLabel: 'New password',
  confirmPasswordLabel: 'Confirm new password',
  updatePassword: 'Update password',
  passwordMismatch: 'The new passwords do not match.',
  passwordChanged: 'Password updated',

  subscription: 'Subscription',
  subscriptionActive: 'Subscription active',
  subscriptionTrial: 'Trial active',
  subscriptionNone: 'No active subscription',
  planField: 'Plan',
  statusField: 'Status',
  renewsOn: 'Renews on',
  accessUntil: 'Access until',
  paymentMethodField: 'Payment method',
  manageSubscription: 'Manage subscription',
  updatePayment: 'Update payment',
  openApp: 'Open the app',
  subscribeCta: 'Subscribe',

  cancelSubscription: 'Cancel subscription',
  cancelModalTitle: 'Cancel your subscription?',
  cancelModalBody:
    'Your plan stays active until the end of the current billing period. Before you go, we’d love to know why.',
  cancelReasonLabel: 'Why are you cancelling?',
  cancelReasonPlaceholder: 'Tell us what led to this decision…',
  cancelConfirm: 'Cancel subscription',
  keepSubscription: 'Keep subscription',
  cancelScheduledNotice:
    'Your subscription is set to cancel at the end of the current period.',

  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved',
  genericError: 'Something went wrong. Please try again.',
  loginRequired: 'Please sign in to view your account.',
  backLink: '← Back',
}

// ---------------------------------------------------------------------------
// Theme style maps
// ---------------------------------------------------------------------------

interface StyleMap {
  pageWrap: string
  eyebrow: string
  title: string
  subtitle: string
  card: string
  cardTitle: string
  overviewGrid: string
  overviewLabel: string
  overviewValue: string
  badgeBase: string
  badge: Record<PlanStatusKind, string>
  collapsible: string
  collapsibleHeader: string
  collapsibleTitle: string
  collapsibleDesc: string
  collapsibleBody: string
  fieldLabel: string
  input: string
  helpText: string
  menuButton: string
  menuPanel: string
  menuItemDanger: string
  divider: string
  feedbackError: string
  feedbackSuccess: string
  noticeInfo: string
  noticeWarn: string
  backLink: string
  modalOverlay: string
  modalPanel: string
  modalTitle: string
  modalText: string
  textarea: string
}

const brutalist: StyleMap = {
  pageWrap: 'mx-auto max-w-4xl px-4 py-12',
  eyebrow:
    'inline-block bg-brut-yellow border-2 border-black px-3 py-1 text-xs font-bold uppercase tracking-wide',
  title: 'text-3xl font-bold uppercase text-black mt-3',
  subtitle: 'text-black/70 mt-1 text-sm break-all',
  card: 'bg-white border-2 border-black shadow-[3px_3px_0_#000] p-6 sm:p-8 mb-6',
  cardTitle: 'text-xl font-bold uppercase text-black mb-6',
  overviewGrid: 'grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4',
  overviewLabel:
    'text-xs font-bold uppercase tracking-wide text-black/60 mb-0.5',
  overviewValue: 'text-black font-bold break-all',
  badgeBase:
    'inline-block text-xs font-bold uppercase tracking-wide px-2.5 py-1',
  badge: {
    active: 'bg-brut-teal text-black border-2 border-black',
    trial: 'bg-brut-yellow text-black border-2 border-black',
    expired: 'bg-brut-coral text-white border-2 border-black',
    none: 'bg-gray-100 text-black border-2 border-black',
  },
  collapsible: 'border-2 border-black bg-white mb-3 shadow-[3px_3px_0_#000]',
  collapsibleHeader:
    'w-full flex items-center justify-between px-5 py-4 text-left hover:bg-brut-yellow/30 transition-colors',
  collapsibleTitle: 'font-bold uppercase text-black',
  collapsibleDesc: 'text-sm text-black/60 mt-0.5',
  collapsibleBody: 'border-t-2 border-black px-5 py-5',
  fieldLabel: 'block text-xs font-bold uppercase tracking-wide text-black mb-1',
  input:
    'w-full bg-white border-2 border-black px-3 py-2.5 text-black placeholder-gray-500 focus:outline-none shadow-[2px_2px_0_#000] focus:shadow-[2px_2px_0_#ff6b6b] focus:border-brut-coral',
  helpText: 'text-xs text-black/60',
  menuButton:
    'inline-flex h-9 w-9 items-center justify-center border-2 border-black bg-white text-black shadow-[2px_2px_0_#000] hover:bg-brut-yellow/40 transition-colors',
  menuPanel:
    'absolute right-0 top-full mt-2 w-56 bg-white border-2 border-black shadow-[4px_4px_0_#000] z-20',
  menuItemDanger:
    'w-full text-left px-4 py-3 text-sm font-bold uppercase tracking-wide text-brut-coral hover:bg-brut-coral hover:text-white transition-colors',
  divider: 'flex flex-wrap gap-3 pt-4 mt-2 border-t-2 border-black',
  feedbackError: 'text-sm font-bold text-brut-coral',
  feedbackSuccess:
    'inline-flex items-center gap-1.5 text-sm font-bold text-green-700',
  noticeInfo: 'bg-brut-teal border-2 border-black p-5',
  noticeWarn: 'bg-brut-yellow border-2 border-black p-5',
  backLink:
    'text-sm font-bold uppercase tracking-wide text-black/60 hover:text-black',
  modalOverlay:
    'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4',
  modalPanel:
    'w-full max-w-md bg-white border-2 border-black shadow-[6px_6px_0_#000] p-6',
  modalTitle: 'text-xl font-bold uppercase text-black',
  modalText: 'text-sm text-black/70 mt-2',
  textarea:
    'w-full bg-white border-2 border-black px-3 py-2.5 text-black placeholder-gray-500 focus:outline-none shadow-[2px_2px_0_#000] focus:shadow-[2px_2px_0_#ff6b6b] focus:border-brut-coral min-h-[96px] resize-y',
}

const clean: StyleMap = {
  pageWrap: 'mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8',
  eyebrow:
    'inline-block text-xs font-semibold uppercase tracking-wide text-blue-600',
  title: 'text-2xl font-semibold text-gray-900 mt-2',
  subtitle: 'text-gray-500 mt-1 text-sm break-all',
  card: 'bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-4',
  cardTitle: 'text-lg font-semibold text-gray-900 mb-6',
  overviewGrid: 'grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4',
  overviewLabel:
    'text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5',
  overviewValue: 'text-sm font-medium text-gray-900 break-all',
  badgeBase:
    'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full',
  badge: {
    active: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20',
    trial: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20',
    expired: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20',
    none: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-500/20',
  },
  collapsible: 'border border-gray-200 rounded-xl overflow-hidden mb-3',
  collapsibleHeader:
    'w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-gray-50 text-left transition-colors',
  collapsibleTitle: 'text-base font-semibold text-gray-900',
  collapsibleDesc: 'text-sm text-gray-500 mt-0.5',
  collapsibleBody: 'border-t border-gray-200 bg-gray-50 px-6 py-6',
  fieldLabel: 'block text-sm font-medium text-gray-700 mb-1',
  input:
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
  helpText: 'text-xs text-gray-500',
  menuButton:
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors',
  menuPanel:
    'absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden',
  menuItemDanger:
    'w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors',
  divider: 'flex flex-wrap gap-3 pt-4 mt-2 border-t border-gray-200',
  feedbackError: 'text-sm font-medium text-red-600',
  feedbackSuccess:
    'inline-flex items-center gap-1.5 text-sm font-medium text-green-700',
  noticeInfo: 'bg-blue-50 border border-blue-200 rounded-lg p-5',
  noticeWarn: 'bg-amber-50 border border-amber-200 rounded-lg p-5',
  backLink: 'text-sm font-medium text-gray-500 hover:text-gray-800',
  modalOverlay:
    'fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4',
  modalPanel:
    'w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6',
  modalTitle: 'text-lg font-semibold text-gray-900',
  modalText: 'text-sm text-gray-500 mt-2',
  textarea:
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[96px] resize-y',
}

function stylesFor(theme: AccountTheme): StyleMap {
  return theme === 'brutalist' ? brutalist : clean
}

// ---------------------------------------------------------------------------
// Small inline icons (dependency-free so the component stays portable)
// ---------------------------------------------------------------------------

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  )
}

function ChevronIcon({
  open,
  className,
}: {
  open: boolean
  className?: string
}) {
  return (
    <svg
      className={`${className ?? ''} transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  )
}

function EllipsisIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="10" cy="4" r="1.6" />
      <circle cx="10" cy="10" r="1.6" />
      <circle cx="10" cy="16" r="1.6" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function Feedback({ s, styles }: { s: FieldStatus; styles: StyleMap }) {
  if (s.error) {
    return (
      <p className={styles.feedbackError} role="alert">
        {s.error}
      </p>
    )
  }
  if (s.success) {
    return (
      <p className={styles.feedbackSuccess}>
        <CheckIcon className="h-4 w-4" />
        {s.success}
      </p>
    )
  }
  return null
}

interface CollapsibleProps {
  styles: StyleMap
  title: string
  description: string
  children: React.ReactNode
}

function Collapsible({
  styles,
  title,
  description,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.collapsible}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={styles.collapsibleHeader}
        aria-expanded={open}
      >
        <span>
          <span className={styles.collapsibleTitle}>{title}</span>
          <span className={`block ${styles.collapsibleDesc}`}>
            {description}
          </span>
        </span>
        <ChevronIcon open={open} className="h-5 w-5 shrink-0 ml-4 opacity-60" />
      </button>
      {open && <div className={styles.collapsibleBody}>{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountView(props: AccountViewProps) {
  const {
    theme,
    labels: t,
    email,
    organizationName,
    roleLabel,
    isAdmin,
    subscription,
    initialName = '',
    backHref,
    showHeader = true,
    onSaveName,
    onChangeEmail,
    onChangePassword,
    onCancelSubscription,
    onStartCheckout,
  } = props

  const styles = stylesFor(theme)

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

  // Cancel-subscription modal
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [startingCheckout, setStartingCheckout] = useState(false)

  // Overflow ("⋮") menu that houses the cancel action. Cancelling is
  // intentionally tucked away here rather than exposed as a first-class button.
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
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
      const result = await onChangeEmail(newEmail, emailPassword)
      // When the email actually changed the adapter handles sign-out/redirect;
      // nothing more to show here.
      if (!result.emailChanged) {
        setEmailStatus({ error: '', success: t.saved })
      }
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
    <div className={styles.pageWrap}>
      {/* Header */}
      {showHeader && (
        <div className="mb-8">
          <span className={styles.eyebrow}>{t.eyebrow}</span>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{email}</p>
        </div>
      )}

      {/* Overview card */}
      <div className={styles.card}>
        <div className={styles.overviewGrid}>
          <div>
            <p className={styles.overviewLabel}>{t.emailLabel}</p>
            <p className={styles.overviewValue}>{email}</p>
          </div>
          <div>
            <p className={styles.overviewLabel}>{t.organizationLabel}</p>
            <p className={styles.overviewValue}>{organizationName ?? '—'}</p>
          </div>
          <div>
            <p className={styles.overviewLabel}>{t.roleLabel}</p>
            <p className={styles.overviewValue}>{roleLabel}</p>
          </div>
          <div>
            <p className={styles.overviewLabel}>{t.planLabel}</p>
            <p className={styles.overviewValue}>
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
      {onSaveName && (
        <Collapsible
          styles={styles}
          title={t.profile}
          description={t.profileDesc}
        >
          <form onSubmit={handleSaveName} className="space-y-4 max-w-sm">
            <div>
              <label htmlFor="account-name" className={styles.fieldLabel}>
                {t.nameLabel}
              </label>
              <input
                id="account-name"
                type="text"
                required
                maxLength={100}
                className={styles.input}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingName}
                className="btn btn-primary"
              >
                {savingName ? t.saving : t.save}
              </button>
              <Feedback s={nameStatus} styles={styles} />
            </div>
          </form>
        </Collapsible>
      )}

      {onChangeEmail && (
        <Collapsible
          styles={styles}
          title={t.changeEmail}
          description={t.changeEmailDesc}
        >
          <form onSubmit={handleChangeEmail} className="space-y-4 max-w-sm">
            <div>
              <label htmlFor="account-new-email" className={styles.fieldLabel}>
                {t.newEmailLabel}
              </label>
              <input
                id="account-new-email"
                type="email"
                required
                autoComplete="email"
                className={styles.input}
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="account-email-password"
                className={styles.fieldLabel}
              >
                {t.currentPasswordLabel}
              </label>
              <input
                id="account-email-password"
                type="password"
                required
                autoComplete="current-password"
                className={styles.input}
                value={emailPassword}
                onChange={e => setEmailPassword(e.target.value)}
              />
            </div>
            <p className={styles.helpText}>{t.emailChangeNotice}</p>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingEmail}
                className="btn btn-primary"
              >
                {savingEmail ? t.saving : t.updateEmail}
              </button>
              <Feedback s={emailStatus} styles={styles} />
            </div>
          </form>
        </Collapsible>
      )}

      {onChangePassword && (
        <Collapsible
          styles={styles}
          title={t.changePassword}
          description={t.changePasswordDesc}
        >
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            <div>
              <label
                htmlFor="account-current-password"
                className={styles.fieldLabel}
              >
                {t.currentPasswordLabel}
              </label>
              <input
                id="account-current-password"
                type="password"
                required
                autoComplete="current-password"
                className={styles.input}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="account-new-password"
                className={styles.fieldLabel}
              >
                {t.newPasswordLabel}
              </label>
              <input
                id="account-new-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className={styles.input}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="account-confirm-password"
                className={styles.fieldLabel}
              >
                {t.confirmPasswordLabel}
              </label>
              <input
                id="account-confirm-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className={styles.input}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingPassword}
                className="btn btn-primary"
              >
                {savingPassword ? t.saving : t.updatePassword}
              </button>
              <Feedback s={passwordStatus} styles={styles} />
            </div>
          </form>
        </Collapsible>
      )}

      {/* Subscription — admins only */}
      {isAdmin && (
        <div className={`${styles.card} mt-6`}>
          <div className="flex items-start justify-between gap-4">
            <h2 className={styles.cardTitle}>{t.subscription}</h2>
            {hasSubscription && canCancel && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(o => !o)}
                  className={styles.menuButton}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={t.cancelSubscription}
                >
                  <EllipsisIcon className="h-5 w-5" />
                </button>
                {menuOpen && (
                  <div className={styles.menuPanel} role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        setShowCancel(true)
                      }}
                      className={styles.menuItemDanger}
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
              <div className={`${styles.overviewGrid} mb-2`}>
                <div>
                  <p className={styles.overviewLabel}>{t.planField}</p>
                  <p className={styles.overviewValue}>
                    {subscription.planName ?? '—'}
                  </p>
                </div>
                <div>
                  <p className={styles.overviewLabel}>{t.statusField}</p>
                  <span
                    className={`${styles.badgeBase} ${styles.badge[subscription.statusKind]}`}
                  >
                    {subscription.statusLabel}
                  </span>
                </div>
                <div>
                  <p className={styles.overviewLabel}>
                    {subscription.cancelScheduled ||
                    subscription.statusKind === 'trial'
                      ? t.accessUntil
                      : t.renewsOn}
                  </p>
                  <p className={styles.overviewValue}>
                    {formatDate(
                      subscription.cancelScheduled
                        ? subscription.endsAt
                        : subscription.statusKind === 'trial'
                          ? subscription.endsAt
                          : subscription.renewsAt
                    )}
                  </p>
                </div>
                <div>
                  <p className={styles.overviewLabel}>{t.paymentMethodField}</p>
                  <p className={styles.overviewValue}>
                    {subscription.paymentMethod ?? '—'}
                  </p>
                </div>
              </div>

              {subscription.cancelScheduled && (
                <div className={`${styles.noticeWarn} my-4`}>
                  <p className="text-sm font-semibold">
                    {t.cancelScheduledNotice}
                  </p>
                </div>
              )}

              {(subscription.customerPortalUrl ||
                subscription.updatePaymentUrl) && (
                <div className={styles.divider}>
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
              <div className={`${styles.noticeWarn} mb-6`}>
                <p className="text-sm font-semibold">{t.subscriptionNone}</p>
              </div>
              {onStartCheckout && (
                <button
                  type="button"
                  onClick={handleStartCheckout}
                  disabled={startingCheckout}
                  className="btn btn-primary"
                >
                  {startingCheckout ? t.saving : t.subscribeCta}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Back link */}
      {backHref && (
        <div className="text-center mt-8">
          <a href={backHref} className={styles.backLink}>
            {t.backLink}
          </a>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancel && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          onClick={() => !cancelling && setShowCancel(false)}
        >
          <div className={styles.modalPanel} onClick={e => e.stopPropagation()}>
            <h3 id="cancel-modal-title" className={styles.modalTitle}>
              {t.cancelModalTitle}
            </h3>
            <p className={styles.modalText}>{t.cancelModalBody}</p>

            <div className="mt-4">
              <label htmlFor="cancel-reason" className={styles.fieldLabel}>
                {t.cancelReasonLabel}
              </label>
              <textarea
                id="cancel-reason"
                className={styles.textarea}
                placeholder={t.cancelReasonPlaceholder}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                maxLength={1000}
              />
            </div>

            {cancelError && (
              <p className={`${styles.feedbackError} mt-3`} role="alert">
                {cancelError}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCancel(false)}
                disabled={cancelling}
                className="btn btn-secondary"
              >
                {t.keepSubscription}
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling || cancelReason.trim().length === 0}
                className="btn btn-danger"
              >
                {cancelling ? t.saving : t.cancelConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
