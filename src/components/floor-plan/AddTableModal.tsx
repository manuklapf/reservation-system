'use client'

import { useState } from 'react'
import { Trash2 } from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'

interface AddTableModalProps {
  mode: 'add' | 'edit'
  initialIdentifier?: string
  initialCapacity?: number
  saving?: boolean
  addError?: string
  onClose: () => void
  onSubmit: (identifier: string, capacity: number) => void
  onDelete?: () => void
}

export default function AddTableModal({
  mode,
  initialIdentifier = '',
  initialCapacity = 2,
  saving,
  addError,
  onClose,
  onSubmit,
  onDelete,
}: AddTableModalProps) {
  const { messages } = useI18n()
  const t = messages.floorPlanEditor
  const isEdit = mode === 'edit'
  const [newId, setNewId] = useState(initialIdentifier)
  const [newCap, setNewCap] = useState(String(initialCapacity))

  const handleSubmit = () => {
    const identifier = newId.trim()
    const capacity = parseInt(newCap)
    if (!identifier || isNaN(capacity) || capacity <= 0) return
    onSubmit(identifier, capacity)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex !my-0 items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      // Touch input synthesizes a "click" after pointerup, hit-tested fresh against the DOM —
      // since this backdrop renders right where a tap-to-open happened, that ghost click would
      // land here and instantly close the modal. Listening on pointerdown instead only reacts
      // to a genuine new press on the backdrop, not the synthesized click.
      onPointerDown={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 w-72 space-y-3"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800">
            {isEdit ? t.updateTableModal : t.newTableModal}
          </p>
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center justify-center h-7 w-7 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              title={t.deleteTable}
              aria-label={t.deleteTable}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <div>
          <label htmlFor="table-name" className="block text-xs font-semibold text-gray-500 mb-1">
            {t.tableNamePlaceholder}
          </label>
          <input
            id="table-name"
            type="text"
            value={newId}
            autoFocus
            onChange={e => setNewId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            maxLength={20}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label htmlFor="table-capacity" className="block text-xs font-semibold text-gray-500 mb-1">
            {t.numberOfSeatsPlaceholder}
          </label>
          <input
            id="table-capacity"
            type="number"
            min={1}
            max={99}
            value={newCap}
            onChange={e => setNewCap(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {addError && <p className="text-xs text-red-500">{addError}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            disabled={saving || !newId.trim()}
            onClick={handleSubmit}
            className="flex-1 py-2 text-sm font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isEdit ? t.updateTableButton : t.addTableButton}
          </button>
        </div>
      </div>
    </div>
  )
}
