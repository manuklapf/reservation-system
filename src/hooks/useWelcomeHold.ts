'use client'

import { useEffect, useState } from 'react'

/** How long the duck stays on screen after a sign-in. */
export const WELCOME_HOLD_MS = 2000

const STORAGE_KEY = 'welcome-hold-until'

/**
 * Arm the post-sign-in hold.
 *
 * Called from the auth listener rather than from any one page, so every route
 * into the app — the login form, the demo sandbox — gets the same landing
 * without each having to remember to ask for it.
 */
export function armWelcomeHold() {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now() + WELCOME_HOLD_MS))
  } catch {
    // Safari in private mode throws on sessionStorage writes. The hold is
    // decoration, so dropping it beats breaking sign-in.
  }
}

/** Milliseconds of hold left, clearing the key once it has run out. */
function remainingHold(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return 0
    const remaining = Number(raw) - Date.now()
    if (!Number.isFinite(remaining) || remaining <= 0) {
      sessionStorage.removeItem(STORAGE_KEY)
      return 0
    }
    return remaining
  } catch {
    return 0
  }
}

/**
 * True while a freshly signed-in visitor should keep seeing the loading screen,
 * so the duck gets a beat on screen instead of flashing past on a fast connection.
 *
 * Deliberately a stored deadline rather than a one-shot flag consumed on read:
 * reads stay idempotent, so React's development double-invocation cannot eat the
 * hold, and a flag left behind by an abandoned navigation expires on its own
 * instead of stalling some unrelated page later in the session.
 *
 * Pages merely navigated to — a return trip to the dashboard from settings —
 * find no deadline and never hold.
 */
export function useWelcomeHold(): boolean {
  // Seeded during the first render, not in an effect: an effect would run only
  // after the page had already painted its loaded state, so a fast load would
  // flash the dashboard before the duck appeared.
  const [holding, setHolding] = useState(() => remainingHold() > 0)

  useEffect(() => {
    const remaining = remainingHold()
    if (remaining <= 0) {
      setHolding(false)
      return
    }
    const timer = setTimeout(() => {
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        // Nothing to clean up if storage is unavailable.
      }
      setHolding(false)
    }, remaining)
    return () => clearTimeout(timer)
  }, [])

  return holding
}
