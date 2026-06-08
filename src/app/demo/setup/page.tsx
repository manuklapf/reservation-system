'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { useDemo, DemoTable } from '@/contexts/DemoContext'
import { useI18n } from '@/contexts/I18nContext'

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

  const handleToggleActive = (table: DemoTable) => {
    updateTable(table.id, { is_active: !table.is_active })
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

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Add New Table Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t.addNewTable}</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder={t.tableIdentifierPlaceholder}
              value={newTableIdentifier}
              onChange={e => setNewTableIdentifier(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder={t.capacityPlaceholder}
              value={newTableCapacity}
              onChange={e => setNewTableCapacity(e.target.value)}
              className="w-full sm:w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
            <button
              onClick={handleAddTable}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {t.addTable}
            </button>
          </div>
        </div>

        {/* Tables List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">{t.yourTables}</h2>
          </div>

          {tables.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{t.noTables}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.table}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.capacity}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.status}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tables.map(table => (
                    <tr
                      key={table.id}
                      className={table.is_active ? '' : 'bg-gray-50 opacity-60'}
                    >
                      <td className="px-6 py-4">
                        {editingId === table.id ? (
                          <input
                            type="text"
                            value={editIdentifier}
                            onChange={e => setEditIdentifier(e.target.value)}
                            className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="font-medium text-gray-900">
                            {t.table} {table.table_identifier}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === table.id ? (
                          <input
                            type="number"
                            value={editCapacity}
                            onChange={e => setEditCapacity(e.target.value)}
                            className="w-24 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        ) : (
                          <span className="text-gray-600">
                            {table.capacity} {t.people}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            table.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {table.is_active ? t.active : t.inactive}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingId === table.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdateTable(table.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              {t.save}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                            >
                              {t.cancel}
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(table)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              aria-label={t.editTable}
                              title={t.editTable}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(table)}
                              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            >
                              {table.is_active ? t.deactivate : t.activate}
                            </button>
                            <button
                              onClick={() => handleDeleteTable(table.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                              aria-label={t.deleteTable}
                              title={t.deleteTable}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
