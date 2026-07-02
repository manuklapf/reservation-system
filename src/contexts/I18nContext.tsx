'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react'
import en from '@/locales/en.json'
import de from '@/locales/de.json'

export type Language = 'en' | 'de'

type Messages = typeof en

interface I18nContextType {
  language: Language
  setLanguage: (language: Language) => void
  messages: Messages
}

const LANGUAGE_STORAGE_KEY = 'appLanguage'

const SUPPORTED_LANGUAGES: Language[] = ['en', 'de']

function detectDeviceLanguage(): Language {
  if (typeof navigator === 'undefined') {
    return 'en'
  }

  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]

  for (const candidate of candidates) {
    const base = candidate?.toLowerCase().split('-')[0] as Language | undefined
    if (base && SUPPORTED_LANGUAGES.includes(base)) {
      return base
    }
  }

  return 'en'
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    const savedLanguage =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
        : null

    if (savedLanguage === 'en' || savedLanguage === 'de') {
      setLanguageState(savedLanguage)
    } else {
      // No stored preference — fall back to the user's device language.
      setLanguageState(detectDeviceLanguage())
    }
  }, [])

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    }
  }

  const messages = useMemo<Messages>(() => {
    return language === 'de' ? (de as Messages) : (en as Messages)
  }, [language])

  return (
    <I18nContext.Provider value={{ language, setLanguage, messages }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
