'use client'

import { useState } from 'react'
import { Users, X } from '@/components/icons'
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
        className="relative flex flex-col items-center justify-center aspect-square w-full rounded-md text-white shadow-sm hover:brightness-110 transition-all active:scale-95"
        style={{ backgroundColor: color }}
      >
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
            className="absolute top-0.5 right-0.5 p-0.5 hover:bg-white/25 rounded transition-colors cursor-pointer"
            title={t.deleteTableTooltip}
          >
            <X style={{ width: 12, height: 12 }} />
          </div>
        )}
        <span className="font-bold text-xs leading-tight text-center px-1 truncate max-w-full drop-shadow-sm">
          {identifier}
        </span>
        {showCapacity && (
          <span
            className="flex items-center gap-0.5 text-white/80 leading-none mt-0.5"
            style={{ fontSize: 10 }}
          >
            <Users style={{ width: 9, height: 9 }} />
            {capacity}
          </span>
        )}
      </button>
    </>
  )
}
