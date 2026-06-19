'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  LogOut,
  LayoutDashboard,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import AccordionItem from '@/components/AccordionItem'
import { useTheme, Theme } from '@/contexts/ThemeContext'
import { useDisplayPrefs } from '@/contexts/DisplayPrefsContext'

type Table = {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
}

function AddTableRow({
  saving,
  onAdd,
}: {
  saving: boolean
  onAdd: (identifier: string, capacity: number) => Promise<void>
}) {
  const [id, setId] = useState('')
  const [cap, setCap] = useState('2')

  const submit = async () => {
    const identifier = id.trim()
    const capacity = parseInt(cap)
    if (!identifier || isNaN(capacity) || capacity <= 0) return
    await onAdd(identifier, capacity)
    setId('')
    setCap('2')
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
      <input
        type="text"
        placeholder="Name"
        value={id}
        onChange={e => setId(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        maxLength={20}
        className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      <input
        type="number"
        placeholder="Seats"
        min={1}
        max={99}
        value={cap}
        onChange={e => setCap(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      <button
        type="button"
        disabled={saving || !id.trim()}
        onClick={submit}
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors shrink-0"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { user, tenantId, signOut } = useAuth()
  const router = useRouter()
  const { messages } = useI18n()
  const t = messages.setupPage
  const st = messages.settingsPage
  const { theme, setTheme } = useTheme()
  const { prefs, setPrefs } = useDisplayPrefs()

  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchTables = useCallback(async () => {
    if (!supabase || !tenantId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('table_identifier')

      if (error) throw error
      setTables(data || [])
    } catch (err: any) {
      console.error('Error fetching tables:', err)
      if (
        err?.code === '42P01' ||
        err?.message?.includes('relation "tables" does not exist')
      ) {
        setError(`⚠️ ${t.errors.dbSetupRequired}`)
      } else {
        setError(
          `${t.errors.failedLoad}: ${err?.message || t.errors.unknownError}`
        )
      }
    } finally {
      setLoading(false)
    }
  }, [tenantId, t.errors])

  useEffect(() => {
    if (user && tenantId) {
      fetchTables()
    }
  }, [user, tenantId, fetchTables])

  const handleAddTable = async (identifier: string, capacity: number) => {
    if (!supabase) return
    try {
      setSaving(true)
      setError('')
      const { error } = await supabase.from('tables').insert({
        tenant_id: tenantId,
        table_identifier: identifier,
        capacity,
        is_active: true,
      })
      if (error) throw error
      await fetchTables()
    } catch (err: any) {
      console.error('Error adding table:', err)
      setError(
        err.message?.includes('duplicate')
          ? t.errors.duplicateIdentifier
          : t.errors.failedAdd
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTable = async (id: string) => {
    if (!supabase) return
    try {
      setSaving(true)
      setError('')
      const { error } = await supabase.from('tables').delete().eq('id', id)
      if (error) throw error
      await fetchTables()
    } catch {
      setError(t.errors.failedDelete)
    } finally {
      setSaving(false)
    }
  }

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
          <AccordionItem
            title="Appearance"
            description="Choose a visual theme for the application"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  {
                    id: 'default' as Theme,
                    name: 'Default',
                    description: 'Clean and modern with blue accents',
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
                    name: 'Brutalist',
                    description:
                      'Neo-brutalist — coral, teal, yellow & hard shadows',
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
            title={st.tableSectionTitle}
            description={st.tableSectionDesc}
          >
            {/* Capacity toggle */}
            <label className="flex items-center justify-between gap-3 cursor-pointer select-none mb-4">
              <span className="text-sm text-gray-700">Show table capacity</span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.showTableCapacity}
                onClick={() =>
                  setPrefs({
                    ...prefs,
                    showTableCapacity: !prefs.showTableCapacity,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  prefs.showTableCapacity ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    prefs.showTableCapacity ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            {/* Open floor plan editor */}
            <Link
              href="/dashboard/settings/floor-plan"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors text-sm font-semibold mb-4"
            >
              <LayoutDashboard className="h-4 w-4" />
              Open Floor Plan Editor
            </Link>

            {/* Table list */}
            {loading ? (
              <p className="text-sm text-gray-400">Loading tables…</p>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : (
              <div className="space-y-2">
                {tables.map(table => (
                  <div
                    key={table.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-200"
                  >
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                      {table.table_identifier}
                    </span>
                    {prefs.showTableCapacity && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="h-3 w-3" />
                        {table.capacity}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        table.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {table.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        if (
                          !confirm('Delete this table? This cannot be undone.')
                        )
                          return
                        await handleDeleteTable(table.id)
                      }}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Delete table"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add new table row */}
                <AddTableRow saving={saving} onAdd={handleAddTable} />
              </div>
            )}
          </AccordionItem>

          <AccordionItem
            title="Dashboard Display"
            description="Choose which details appear on each reservation row"
          >
            <div className="space-y-3">
              {(
                [
                  {
                    key: 'showTime',
                    label: 'Time',
                    color: 'bg-violet-100 text-violet-700',
                  },
                  {
                    key: 'showPartySize',
                    label: 'Guest count',
                    color: 'bg-blue-50 text-blue-600',
                  },
                  {
                    key: 'showTable',
                    label: 'Table',
                    color: 'bg-emerald-50 text-emerald-700',
                  },
                  {
                    key: 'showPhone',
                    label: 'Phone number',
                    color: 'bg-amber-50 text-amber-700',
                  },
                  {
                    key: 'showNotes',
                    label: 'Notes',
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

          <AccordionItem
            title="Reservation Settings"
            description="Configure how reservations are created and displayed"
          >
            <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Reservation length
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Adds an end time step when creating or editing a reservation
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
          </AccordionItem>
        </div>
      </main>
    </div>
  )
}
