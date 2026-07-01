'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'

export type Theme = 'default' | 'brutalist'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const THEME_STORAGE_KEY = 'appTheme'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('brutalist')

  useEffect(() => {
    const saved =
      typeof window !== 'undefined'
        ? (window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null)
        : null
    const resolved: Theme =
      saved === 'default' || saved === 'brutalist' ? saved : 'brutalist'
    setThemeState(resolved)
    document.documentElement.setAttribute('data-theme', resolved)
  }, [])

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    }
    document.documentElement.setAttribute('data-theme', nextTheme)
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
