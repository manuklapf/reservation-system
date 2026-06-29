'use client'

import { useState } from 'react'
import { Users, X } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import ConfirmDialog from './ConfirmDialog'

export interface TableChipProps {
  id: string
  identifier: string
  capacity: number
  color: string
  disabled?: boolean
  showCapacity?: boolean
  onDelete?: (id: string) => Promise<void>
  onClick?: () => void
  deletable?: boolean
  deleteConfirmMessage?: string
}

export default function TableChip({
  id,
  identifier,
  capacity,
  color,
  disabled = false,
  showCapacity = true,
  onDelete,
  onClick,
  deletable = false,
  deleteConfirmMessage,
}: TableChipProps) {
  const { messages } = useI18n()
  const t = messages.tableManagement
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const finalDeleteConfirmMessage = deleteConfirmMessage || t.deleteTableConfirm
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPendingConfirm(true)
  }

  return (
    <>
    <ConfirmDialog
      isOpen={pendingConfirm}
      title={messages.tableManagement.deleteTableTitle}
      message={finalDeleteConfirmMessage}
      confirmLabel={messages.common.delete}
      danger
      onConfirm={() => {
        setPendingConfirm(false)
        onDelete?.(id)
      }}
      onCancel={() => setPendingConfirm(false)}
    />
    <button
      key={id}
      type="button"
      disabled={disabled}
      title={identifier}
      onClick={onClick}
      className="flex items-center justify-between gap-1 pl-2 pr-1 py-1 rounded-full text-white text-xs font-semibold shadow-sm hover:brightness-110 transition-all active:scale-95 w-full"
      style={{ backgroundColor: color }}
    >
      <span className="truncate">{identifier}</span>
      {showCapacity && (
        <span className="flex items-center gap-0.5 shrink-0">
          <Users style={{ width: 9, height: 9 }} />
          {capacity}
          {deletable && onDelete && (
            <div
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={handleDelete}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleDelete(e as any)
                }
              }}
              className="p-0.5 hover:bg-white/20 rounded transition-colors cursor-pointer"
              title={t.deleteTableTooltip}
            >
              <X style={{ width: 12, height: 12 }} />
            </div>
          )}
        </span>
      )}
    </button>
    </>
  )
}
