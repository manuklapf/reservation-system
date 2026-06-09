'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDemo, DemoTable } from '@/contexts/DemoContext'
import { useI18n } from '@/contexts/I18nContext'
import TableManagementPanel from '@/components/TableManagementPanel'

export default function DemoSetupPage() {
  const { tables, addTable, updateTable, deleteTable } = useDemo()
  const { messages } = useI18n()
  const t = messages.setupPage

  const [newTableIdentifier, setNewTableIdentifier] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editIdentifier, setEditIdentifier] = useState('')
  const [editCapacity, setEditCapacity] = useState('')
  const [error, setError] = useState('')

  const handleAddTable = () => {
    if (!newTableIdentifier.trim() || !newTableCapacity) {
      setError(t.errors.enterIdentifierAndCapacity)
      return
    }
    const capacity = parseInt(newTableCapacity)
    if (isNaN(capacity) || capacity <= 0) {
      setError(t.errors.capacityPositive)
      return
    }
    const duplicate = tables.some(
      t =>
        t.table_identifier.toLowerCase() ===
        newTableIdentifier.trim().toLowerCase()
    )
    if (duplicate) {
      setError(t.errors.duplicateIdentifier)
      return
    }
    setError('')
    addTable(newTableIdentifier.trim(), capacity)
    setNewTableIdentifier('')
    setNewTableCapacity('')
  }

  const handleUpdateTable = (id: string) => {
    if (!editIdentifier.trim() || !editCapacity) {
      setError(t.errors.enterIdentifierAndCapacity)
      return
    }
    const capacity = parseInt(editCapacity)
    if (isNaN(capacity) || capacity <= 0) {
      setError(t.errors.capacityPositive)
      return
    }
    setError('')
    updateTable(id, { table_identifier: editIdentifier.trim(), capacity })
    setEditingId(null)
  }

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateTable(id, { is_active: !isActive })
  }

  const handleDeleteTable = (id: string) => {
    if (!confirm(t.confirmDelete)) return
    deleteTable(id)
  }

  const startEdit = (table: DemoTable) => {
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <Link
            href="/demo"
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            ← {t.backToDashboard}
          </Link>
        </div>

        <TableManagementPanel
          tables={tables}
          saving={false}
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
      </div>
    </div>
  )
}
