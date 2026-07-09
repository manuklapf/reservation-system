'use client'

import { useState } from 'react'
import { Redo, Trash2 } from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'

interface FloorHeaderProps {
  floorName: string
  onRenameFloor: (name: string) => void
  onDeleteFloor?: () => void
  canRevert: boolean
  onRevert: () => void
}

export default function FloorHeader({
  floorName,
  onRenameFloor,
  onDeleteFloor,
  canRevert,
  onRevert,
}: FloorHeaderProps) {
  const { messages } = useI18n()
  const t = messages.floorPlanEditor
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(floorName)

  return (
    <div className="flex items-center gap-2">
      {editingName ? (
        <input
          type="text"
          value={draftName}
          autoFocus
          onChange={e => setDraftName(e.target.value)}
          onBlur={() => {
            onRenameFloor(draftName.trim() || floorName)
            setEditingName(false)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onRenameFloor(draftName.trim() || floorName)
              setEditingName(false)
            }
            if (e.key === 'Escape') {
              setDraftName(floorName)
              setEditingName(false)
            }
          }}
          className="text-xl font-bold text-gray-900 border-b-2 border-blue-400 bg-transparent outline-none p-0 pb-0.5 w-full min-w-0"
        />
      ) : (
        <h2
          className="text-xl font-bold text-gray-900 leading-tight cursor-pointer hover:text-blue-600 transition-colors"
          title={t.clickToRename}
          onClick={() => {
            setDraftName(floorName)
            setEditingName(true)
          }}
        >
          {floorName}
        </h2>
      )}
      <div className="flex items-center gap-1 ml-auto shrink-0">
        <button
          type="button"
          onClick={onRevert}
          disabled={!canRevert}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
          title={t.revert}
          aria-label={t.revert}
        >
          <Redo className="h-4 w-4" />
        </button>
        {onDeleteFloor && (
          <button
            type="button"
            onClick={onDeleteFloor}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            title={t.deleteFloor}
            aria-label={t.deleteFloor}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
