'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  LogOut,
  LayoutDashboard,
  Users,
  Copy,
  Code2,
  Globe,
  User,
} from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'
import AccordionItem from '@/components/AccordionItem'
import ConfirmDialog from '@/components/ConfirmDialog'
import Button from '@/components/Button'
import Switch from '@/components/Switch'
import NavBar from '@/components/NavBar'
import { useTheme, Theme } from '@/contexts/ThemeContext'
import { useDisplayPrefs } from '@/contexts/DisplayPrefsContext'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const { user, tenantId, signOut, isAdmin } = useAuth()
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)
  const [embedCopied, setEmbedCopied] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  useEffect(() => {
    if (!supabase || !tenantId) return
    supabase
      .from('tenants')
      .select('slug')
      .eq('id', tenantId)
      .single()
      .then(({ data }) => {
        if (data?.slug) setTenantSlug(data.slug)
      })
  }, [tenantId])
  const router = useRouter()
  const { messages, language, setLanguage } = useI18n()
  const t = messages.setupPage
  const st = messages.settingsPage
  const c = messages.common
  const wr = messages.reservationRequest
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
    <div className="min-h-screen bg-background/40">
      <NavBar
        left={
          <Button
            onClick={() => router.push('/dashboard')}
            aria-label={st.backToDashboard}
            title={st.backToDashboard}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        center={
          <h1 className="text-xl font-semibold text-gray-900">{st.title}</h1>
        }
        right={
          <button
            onClick={() => setLanguage(language === 'en' ? 'de' : 'en')}
            className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-gray-500 hover:bg-accent hover:text-gray-800"
            aria-label={c.language}
            title={c.language}
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">{language}</span>
          </button>
        }
      />

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-3">
          {/* Account */}
          <Link
            href="/dashboard/settings/account"
            className="hover-transform flex items-center justify-center gap-2 px-4 py-3 mb-4 rounded-xl shadow-sm border text-sm font-semibold bg-white text-gray-900"
          >
            <User className="h-4 w-4 text-warning" />
            {st.myAccount}
          </Link>
          {/* Admin-only quick links */}
          {isAdmin && (
            <div className="flex gap-3 mb-4">
              <Link
                href="/dashboard/settings/floor-plan"
                className="hover-transform flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl shadow-sm border text-sm font-semibold bg-white text-gray-900"
              >
                <LayoutDashboard className="h-4 w-4 text-danger" />
                {st.openFloorPlanEditor}
              </Link>
              <Link
                href="/dashboard/settings/users"
                className="hover-transform flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl shadow-sm border text-sm font-semibold bg-white text-gray-900"
              >
                <Users className="h-4 w-4 text-success" />
                {st.manageStaff}
              </Link>
            </div>
          )}
          {/* 30/07/2026: Theming will be reintroduced later, one theme for now */}
          {/* <AccordionItem title={st.appearance} description={st.appearanceDesc}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  {
                    id: 'default' as Theme,
                    name: st.themeDefault,
                    description: st.themeDefaultDesc,
                    preview: (
                      <div className="flex gap-2 mb-3">
                        <div className="h-5 w-5 rounded bg-accent" />
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
                      ? 'border-accent-strong'
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
                    <Check className="absolute top-3 right-3 h-4 w-4 text-accent-ink" />
                  )}
                </button>
              ))}
            </div>
          </AccordionItem> */}

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
                    color: 'bg-info-soft text-gray-800',
                  },
                  {
                    key: 'showPartySize',
                    label: dl.guestCount,
                    color: 'bg-accent-soft text-gray-800',
                  },
                  {
                    key: 'showTable',
                    label: dl.table,
                    color: 'bg-success-soft text-gray-800',
                  },
                  {
                    key: 'showPhone',
                    label: dl.phoneNumber,
                    color: 'bg-warning-soft text-gray-800',
                  },
                  {
                    key: 'showNotes',
                    label: dl.notes,
                    color: 'bg-gray-100 text-gray-800',
                  },
                ] as { key: keyof typeof prefs; label: string; color: string }[]
              ).map(({ key, label, color }) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-2 ring-black ${color}`}
                    >
                      {label}
                    </span>
                  </div>
                  <Switch
                    checked={prefs[key]}
                    onChange={value => setPrefs({ ...prefs, [key]: value })}
                    aria-label={label}
                  />
                </label>
              ))}
            </div>
          </AccordionItem>

          {isAdmin && tenantSlug && (
            <AccordionItem
              title={wr.widgetEmbedTitle}
              description={wr.widgetEmbedDesc}
            >
              {(() => {
                const origin =
                  typeof window !== 'undefined' ? window.location.origin : ''
                const buttonUrl = `${origin}/${tenantSlug}/widget`
                const formUrl = `${origin}/${tenantSlug}/request`
                const embedCode = `<iframe\n  src="${buttonUrl}"\n  width="220"\n  height="56"\n  frameborder="0"\n  scrolling="no"\n  style="border:none;overflow:hidden;"\n></iframe>`
                return (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {wr.widgetEmbedTitle}
                      </p>
                      <div className="relative">
                        <pre className="bg-white border border-gray-200 rounded-lg p-3 pr-24 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-all">
                          {embedCode}
                        </pre>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(embedCode)
                            setEmbedCopied(true)
                            setTimeout(() => setEmbedCopied(false), 2000)
                          }}
                          className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-gray-200 text-gray-600 hover:bg-accent transition-colors"
                        >
                          {embedCopied ? (
                            <>
                              <Check className="h-3 w-3 text-success-ink" />
                              {wr.widgetEmbedCopied}
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              {wr.widgetEmbedCopy}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        {wr.widgetDirectLink}
                      </p>
                      <a
                        href={formUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-accent-ink hover:underline break-all"
                      >
                        <Code2 className="h-4 w-4 shrink-0" />
                        {formUrl}
                      </a>
                    </div>
                  </div>
                )
              })()}
            </AccordionItem>
          )}

          {isAdmin && (
            <AccordionItem
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
                <Switch
                  checked={prefs.reservationLengthEnabled}
                  onChange={value =>
                    setPrefs({ ...prefs, reservationLengthEnabled: value })
                  }
                  aria-label={st.reservationLength}
                />
              </label>
            </AccordionItem>
          )}

          <Button
            variant="danger"
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full mt-2"
          >
            <LogOut className="h-4 w-4" />
            {st.signOut}
          </Button>
        </div>
      </main>

      <ConfirmDialog
        isOpen={logoutConfirmOpen}
        title={st.logoutConfirmTitle}
        message={st.logoutConfirmMessage}
        confirmLabel={st.signOut}
        danger
        onConfirm={async () => {
          setLogoutConfirmOpen(false)
          await signOut()
          router.push('/')
        }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </div>
  )
}
