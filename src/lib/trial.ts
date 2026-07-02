// Shared trial / billing logic used on both client and server.

export type PlanStatus = 'trial' | 'active' | 'expired'

export interface TenantBilling {
  plan_status: PlanStatus | null
  trial_ends_at: string | null
}

export type AccountMode = 'trial' | 'active' | 'expired'

export interface AccountState {
  /** Whether the account can use the app or is locked behind the pay/export gate. */
  access: 'full' | 'locked'
  /** Effective account mode after evaluating the trial deadline. */
  mode: AccountMode
  /** Whole days left in the trial (0 once expired). Only meaningful when mode === 'trial'. */
  daysLeft: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Derive the effective account state from the raw tenant billing fields.
 *
 * - `active` accounts always have full access and are never treated as a trial.
 * - `trial` accounts have full access until `trial_ends_at`, then flip to expired.
 * - `expired` accounts (explicitly, or trial past its deadline) are locked.
 */
export function getAccountState(
  billing: TenantBilling | null | undefined,
  now: Date = new Date()
): AccountState {
  const status = billing?.plan_status ?? 'trial'

  if (status === 'active') {
    return { access: 'full', mode: 'active', daysLeft: 0 }
  }

  const endsAt = billing?.trial_ends_at ? new Date(billing.trial_ends_at) : null

  const trialExpired =
    status === 'expired' || !endsAt || endsAt.getTime() <= now.getTime()

  if (trialExpired) {
    return { access: 'locked', mode: 'expired', daysLeft: 0 }
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((endsAt!.getTime() - now.getTime()) / MS_PER_DAY)
  )

  return { access: 'full', mode: 'trial', daysLeft }
}
