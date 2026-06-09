'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import AccordionItem from '@/components/AccordionItem'
import TableManagementPanel from '@/components/TableManagementPanel'

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
