'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'

interface FloorHeaderProps {
  floorName: string
  onRenameFloor: (name: string) => void
  onDeleteFloor?: () => void
}

export default function FloorHeader({
  floorName,
  onRenameFloor,
  onDeleteFloor,
}: FloorHeaderProps) {
  const { messages } = useI18n()
  const t = messages.floorPlanEditor
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(floorName)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

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
        <h2 className="text-xl font-bold text-gray-900 leading-tight">
          {floorName}
        </h2>
      )}

      <div className="relative ml-auto shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(o => !o)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={t.floorOptions}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-20 overflow-hidden"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                setDraftName(floorName)
                setEditingName(true)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-gray-400" />
              {t.rename}
            </button>
            {onDeleteFloor && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onDeleteFloor()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {messages.common.delete}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
