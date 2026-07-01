'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, LogOut, LayoutDashboard, Users } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import AccordionItem from '@/components/AccordionItem'
import { useTheme, Theme } from '@/contexts/ThemeContext'
import { useDisplayPrefs } from '@/contexts/DisplayPrefsContext'

export default function SettingsPage() {
  const { user, tenantId, signOut, isAdmin } = useAuth()
  const router = useRouter()
  const { messages } = useI18n()
  const t = messages.setupPage
  const st = messages.settingsPage
  const dl = messages.dashboardDisplayLabels
  const { theme, setTheme } = useTheme()
  const { prefs, setPrefs } = useDisplayPrefs()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t.loginRequired}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link
              href="/dashboard"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label={st.backToDashboard}
              title={st.backToDashboard}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {st.title}
              </h1>
              <button
                onClick={async () => {
                  await signOut()
                  router.push('/')
                }}
                className="text-red-700"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-3">
          {/* Admin-only quick links */}
          {isAdmin && (
            <div className="flex gap-3 mb-4">
              <Link
                href="/dashboard/settings/floor-plan"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl shadow-sm border border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors text-sm font-semibold"
              >
                <LayoutDashboard className="h-4 w-4" />
                {st.openFloorPlanEditor}
              </Link>
              <Link
                href="/dashboard/settings/users"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl shadow-sm border border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors text-sm font-semibold"
              >
                <Users className="h-4 w-4" />
                {st.manageStaff}
              </Link>
            </div>
          )}
          <AccordionItem title={st.appearance} description={st.appearanceDesc}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  {
                    id: 'default' as Theme,
                    name: st.themeDefault,
                    description: st.themeDefaultDesc,
                    preview: (
                      <div className="flex gap-2 mb-3">
                        <div className="h-5 w-5 rounded bg-blue-600" />
                        <div className="h-5 w-5 rounded bg-gray-100 border border-gray-300" />
                        <div className="h-5 w-5 rounded bg-white border border-gray-200" />
                      </div>
                    ),
                    fontStyle: undefined,
                  },
                  {
                    id: 'brutalist' as Theme,
                    name: st.themeBrutalist,
                    description: st.themeBrutalistDesc,
                    preview: (
                      <div className="flex gap-2 mb-3">
                        <div
                          className="h-5 w-5 border-2"
                          style={{
                            backgroundColor: '#ff6b6b',
                            borderColor: '#000',
                            boxShadow: '2px 2px 0 #000',
                          }}
                        />
                        <div
                          className="h-5 w-5 border-2"
                          style={{
                            backgroundColor: '#4ecdc4',
                            borderColor: '#000',
                            boxShadow: '2px 2px 0 #000',
                          }}
                        />
                        <div
                          className="h-5 w-5 border-2"
                          style={{
                            backgroundColor: '#ffe66d',
                            borderColor: '#000',
                            boxShadow: '2px 2px 0 #000',
                          }}
                        />
                        <div
                          className="h-5 w-5 border-2"
                          style={{
                            backgroundColor: '#ef476f',
                            borderColor: '#000',
                            boxShadow: '2px 2px 0 #000',
                          }}
                        />
                      </div>
                    ),
                    fontStyle: {
                      fontFamily: 'Courier New, Courier, monospace',
                    },
                  },
                ] satisfies {
                  id: Theme
                  name: string
                  description: string
                  preview: React.ReactNode
                  fontStyle: React.CSSProperties | undefined
                }[]
              ).map(thm => (
                <button
                  key={thm.id}
                  type="button"
                  onClick={() => setTheme(thm.id)}
                  className={`relative p-4 border-2 text-left transition-colors bg-white hover:bg-gray-50 ${
                    theme === thm.id
                      ? 'border-blue-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {thm.preview}
                  <p
                    className="font-semibold text-gray-900 text-sm"
                    style={thm.fontStyle}
                  >
                    {thm.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {thm.description}
                  </p>
                  {theme === thm.id && (
                    <Check className="absolute top-3 right-3 h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </AccordionItem>

          <AccordionItem
            title={st.dashboardDisplay}
            description={st.dashboardDisplayDesc}
          >
            <div className="space-y-3">
              {(
                [
                  {
                    key: 'showTime',
                    label: dl.time,
                    color: 'bg-violet-100 text-violet-700',
                  },
                  {
                    key: 'showPartySize',
                    label: dl.guestCount,
                    color: 'bg-blue-50 text-blue-600',
                  },
                  {
                    key: 'showTable',
                    label: dl.table,
                    color: 'bg-emerald-50 text-emerald-700',
                  },
                  {
                    key: 'showPhone',
                    label: dl.phoneNumber,
                    color: 'bg-amber-50 text-amber-700',
                  },
                  {
                    key: 'showNotes',
                    label: dl.notes,
                    color: 'bg-gray-100 text-gray-600',
                  },
                ] as { key: keyof typeof prefs; label: string; color: string }[]
              ).map(({ key, label, color }) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
                    >
                      {label}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs[key]}
                    onClick={() => setPrefs({ ...prefs, [key]: !prefs[key] })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      prefs[key] ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        prefs[key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </AccordionItem>

          {isAdmin && <AccordionItem
            title={st.reservationSettings}
            description={st.reservationSettingsDesc}
          >
            <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {st.reservationLength}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {st.reservationLengthDesc}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.reservationLengthEnabled}
                onClick={() =>
                  setPrefs({
                    ...prefs,
                    reservationLengthEnabled: !prefs.reservationLengthEnabled,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  prefs.reservationLengthEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    prefs.reservationLengthEnabled
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </AccordionItem>}
        </div>
      </main>
    </div>
  )
}
