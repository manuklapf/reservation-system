'use client'

/**
 * Browser-side record of the demo sandbox this visitor was given, so a reload
 * or a second click on the public demo link lands back in the same sandbox
 * instead of provisioning another one.
 */

const STORAGE_KEY = 'demoSandbox'

export interface StoredDemoSession {
  email: string
  password: string
  expiresAt: string
}

export function readDemoSession(): StoredDemoSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDemoSession
    if (!parsed?.email || !parsed?.password || !parsed?.expiresAt) return null
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

export function storeDemoSession(session: StoredDemoSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Private mode / storage full: the demo still works, it just won't resume.
  }
}

export function clearDemoSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
