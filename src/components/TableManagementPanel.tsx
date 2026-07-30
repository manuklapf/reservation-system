'use client'

import { useState, useRef, useEffect } from 'react'
import {
  MoreVertical,
  Check,
  X,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'
import Button from './Button'

interface TableItem {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
}

interface TableManagementPanelProps {
  tables: TableItem[]
  loading?: boolean
  saving?: boolean
  error?: string
  newIdentifier: string
  newCapacity: string
  editingId: string | null
  editIdentifier: string
  editCapacity: string
  onNewIdentifierChange: (v: string) => void
  onNewCapacityChange: (v: string) => void
  onAdd: () => void
  onEdit: (table: TableItem) => void
  onEditIdentifierChange: (v: string) => void
  onEditCapacityChange: (v: string) => void
  onSave: (id: string) => void
  onCancel: () => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, isActive: boolean) => void
}

export default function TableManagementPanel({
  tables,
  loading = false,
  saving = false,
  error,
  newIdentifier,
  newCapacity,
  editingId,
  editIdentifier,
  editCapacity,
  onNewIdentifierChange,
  onNewCapacityChange,
  onAdd,
  onEdit,
  onEditIdentifierChange,
  onEditCapacityChange,
  onSave,
  onCancel,
  onDelete,
  onToggleActive,
}: TableManagementPanelProps) {
  const { messages } = useI18n()
  const tmp = messages.tableManagementPanel
  const t = messages.setupPage
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuAbove, setMenuAbove] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Add New Table */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-5">
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          {t.addNewTable}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder={t.tableIdentifierPlaceholder}
            value={newIdentifier}
            onChange={e => onNewIdentifierChange(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={saving}
          />
          <input
            type="number"
            placeholder={t.capacityPlaceholder}
            value={newCapacity}
            onChange={e => onNewCapacityChange(e.target.value)}
            className="w-full sm:w-28 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={saving}
            min="1"
          />
          <Button onClick={onAdd} disabled={saving}>
            {saving ? t.adding : t.addTable}
          </Button>
        </div>
      </div>

      {/* Tables List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-800">
            {t.yourTables}
          </h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {t.loadingTables}
          </div>
        ) : tables.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {t.noTables}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.table}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.capacity}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.status}
                  </th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tables.map(table => (
                  <tr
                    key={table.id}
                    className={table.is_active ? '' : 'bg-gray-50 opacity-60'}
                  >
                    <td className="px-5 py-3 whitespace-nowrap">
                      {editingId === table.id ? (
                        <input
                          type="text"
                          value={editIdentifier}
                          onChange={e => onEditIdentifierChange(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={saving}
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          {table.table_identifier}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {editingId === table.id ? (
                        <input
                          type="number"
                          value={editCapacity}
                          onChange={e => onEditCapacityChange(e.target.value)}
                          className="w-20 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={saving}
                          min="1"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">
                          {table.capacity}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          table.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {table.is_active ? t.active : t.inactive}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      {editingId === table.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onSave(table.id)}
                            disabled={saving}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-green-600 hover:bg-green-50 disabled:text-gray-400"
                            aria-label={t.save}
                            title={t.save}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={onCancel}
                            disabled={saving}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:text-gray-400"
                            aria-label={t.cancel}
                            title={t.cancel}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="relative flex justify-end"
                          ref={openMenuId === table.id ? menuRef : undefined}
                        >
                          <button
                            onClick={e => {
                              const rect =
                                e.currentTarget.getBoundingClientRect()
                              setMenuAbove(
                                window.innerHeight - rect.bottom < 140
                              )
                              setOpenMenuId(prev =>
                                prev === table.id ? null : table.id
                              )
                            }}
                            disabled={saving}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:text-gray-400"
                            aria-label={tmp.actions}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === table.id && (
                            <div
                              className={`absolute right-0 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg flex flex-col ${
                                menuAbove ? 'bottom-9' : 'top-9'
                              }`}
                            >
                              <button
                                onClick={() => {
                                  onEdit(table)
                                  setOpenMenuId(null)
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-800"
                              >
                                <Pencil className="h-3.5 w-3.5 text-gray-400" />
                                {t.editTable}
                              </button>
                              <button
                                onClick={() => {
                                  onToggleActive(table.id, table.is_active)
                                  setOpenMenuId(null)
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-800"
                              >
                                {table.is_active ? (
                                  <EyeOff className="h-3.5 w-3.5 text-gray-400" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5 text-gray-400" />
                                )}
                                {table.is_active ? t.deactivate : t.activate}
                              </button>
                              <button
                                onClick={() => {
                                  onDelete(table.id)
                                  setOpenMenuId(null)
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t.deleteTable}
                              </button>
                            </div>
                          )}
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
    </>
  )
}
