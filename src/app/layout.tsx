import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { I18nProvider } from '@/contexts/I18nContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { DisplayPrefsProvider } from '@/contexts/DisplayPrefsContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Restaurant Reservation System',
  description: 'Manage restaurant reservations with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // data-theme is set here as well as in ThemeContext: the context can only
    // stamp it after hydration, which paints one frame of the wrong skin
    // first. Brutalist is the default theme, so render it server-side.
    <html lang="en" data-theme="brutalist">
      <body className={inter.className}>
        <ThemeProvider>
          <DisplayPrefsProvider>
            <I18nProvider>
              <AuthProvider>{children}</AuthProvider>
            </I18nProvider>
          </DisplayPrefsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
