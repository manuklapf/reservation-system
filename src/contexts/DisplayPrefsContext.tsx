'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'

export interface DisplayPrefs {
  showTime: boolean
  showPartySize: boolean
  showTable: boolean
  showNotes: boolean
  showPhone: boolean
  reservationLengthEnabled: boolean
}

const DEFAULT_PREFS: DisplayPrefs = {
  showTime: true,
  showPartySize: true,
  showTable: false,
  showNotes: false,
  showPhone: false,
  reservationLengthEnabled: false,
}

const STORAGE_KEY = 'reservationDisplayPrefs'

interface DisplayPrefsContextType {
  prefs: DisplayPrefs
  setPrefs: (prefs: DisplayPrefs) => void
}

const DisplayPrefsContext = createContext<DisplayPrefsContextType | undefined>(
  undefined
)

export function DisplayPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<DisplayPrefs>(DEFAULT_PREFS)

  useEffect(() => {
    try {
      const saved =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(STORAGE_KEY)
          : null
      if (saved) {
        setPrefsState({ ...DEFAULT_PREFS, ...JSON.parse(saved) })
      }
    } catch {
      // ignore malformed storage
    }
  }, [])

  const setPrefs = (next: DisplayPrefs) => {
    setPrefsState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  }

  return (
    <DisplayPrefsContext.Provider value={{ prefs, setPrefs }}>
      {children}
    </DisplayPrefsContext.Provider>
  )
}

export function useDisplayPrefs() {
  const context = useContext(DisplayPrefsContext)
  if (!context) {
    throw new Error(
      'useDisplayPrefs must be used within a DisplayPrefsProvider'
    )
  }
  return context
}
