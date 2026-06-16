'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'

export type Theme = 'default' | 'brutalist' | 'soft-brutalist'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const THEME_STORAGE_KEY = 'appTheme'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('default')

  const applyThemeAttributes = (nextTheme: Theme) => {
    const html = document.documentElement
    const baseTheme = nextTheme === 'soft-brutalist' ? 'brutalist' : nextTheme
    html.setAttribute('data-theme', baseTheme)

    if (nextTheme === 'soft-brutalist') {
      html.setAttribute('data-subtheme', 'soft-brutalist')
    } else {
      html.removeAttribute('data-subtheme')
    }
  }

  useEffect(() => {
    const saved =
      typeof window !== 'undefined'
        ? (window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null)
        : null
    const resolved: Theme =
      saved === 'default' || saved === 'brutalist' || saved === 'soft-brutalist'
        ? saved
        : 'default'
    setThemeState(resolved)
    applyThemeAttributes(resolved)
  }, [])

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    }
    applyThemeAttributes(nextTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
