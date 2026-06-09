'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import AccordionItem from '@/components/AccordionItem'
import TableManagementPanel from '@/components/TableManagementPanel'
import { useTheme, Theme } from '@/contexts/ThemeContext'

type Table = {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
}

export default function SettingsPage() {
  const { user, tenantId } = useAuth()
  const { messages } = useI18n()
  const t = messages.setupPage
  const st = messages.settingsPage
  const { theme, setTheme } = useTheme()

  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newTableIdentifier, setNewTableIdentifier] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editIdentifier, setEditIdentifier] = useState('')
  const [editCapacity, setEditCapacity] = useState('')
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

  const handleAddTable = async () => {
    if (!supabase) return
    if (!newTableIdentifier.trim() || !newTableCapacity) {
      setError(t.errors.enterIdentifierAndCapacity)
      return
    }
    const capacity = parseInt(newTableCapacity)
    if (isNaN(capacity) || capacity <= 0) {
      setError(t.errors.capacityPositive)
      return
    }
    try {
      setSaving(true)
      setError('')
      const { error } = await supabase.from('tables').insert({
        tenant_id: tenantId,
        table_identifier: newTableIdentifier.trim(),
        capacity,
        is_active: true,
      })
      if (error) throw error
      setNewTableIdentifier('')
      setNewTableCapacity('')
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

  const handleUpdateTable = async (id: string) => {
    if (!supabase) return
    if (!editIdentifier.trim() || !editCapacity) {
      setError(t.errors.enterIdentifierAndCapacity)
      return
    }
    const capacity = parseInt(editCapacity)
    if (isNaN(capacity) || capacity <= 0) {
      setError(t.errors.capacityPositive)
      return
    }
    try {
      setSaving(true)
      setError('')
      const { error } = await supabase
        .from('tables')
        .update({ table_identifier: editIdentifier.trim(), capacity })
        .eq('id', id)
      if (error) throw error
      setEditingId(null)
      setEditIdentifier('')
      setEditCapacity('')
      await fetchTables()
    } catch (err: any) {
      console.error('Error updating table:', err)
      setError(
        err.message?.includes('duplicate')
          ? t.errors.duplicateIdentifier
          : t.errors.failedUpdate
      )
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    if (!supabase) return
    try {
      setSaving(true)
      setError('')
      const { error } = await supabase
        .from('tables')
        .update({ is_active: !currentStatus })
        .eq('id', id)
      if (error) throw error
      await fetchTables()
    } catch {
      setError(t.errors.failedStatusUpdate)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTable = async (id: string) => {
    if (!supabase) return
    if (!confirm(t.confirmDelete)) return
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

  const startEdit = (table: Table) => {
    setEditingId(table.id)
    setEditIdentifier(table.table_identifier)
    setEditCapacity(table.capacity.toString())
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditIdentifier('')
    setEditCapacity('')
    setError('')
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
      <nav className="bg-white shadow-sm border-b">
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
            <h1 className="text-xl font-semibold text-gray-900">{st.title}</h1>
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
            defaultOpen
          >
            <TableManagementPanel
              tables={tables}
              loading={loading}
              saving={saving}
              error={error}
              newIdentifier={newTableIdentifier}
              newCapacity={newTableCapacity}
              editingId={editingId}
              editIdentifier={editIdentifier}
              editCapacity={editCapacity}
              onNewIdentifierChange={setNewTableIdentifier}
              onNewCapacityChange={setNewTableCapacity}
              onAdd={handleAddTable}
              onEdit={startEdit}
              onEditIdentifierChange={setEditIdentifier}
              onEditCapacityChange={setEditCapacity}
              onSave={handleUpdateTable}
              onCancel={cancelEdit}
              onDelete={handleDeleteTable}
              onToggleActive={handleToggleActive}
            />
          </AccordionItem>
        </div>
      </main>
    </div>
  )
}
