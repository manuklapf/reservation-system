'use client'

import { useI18n } from '@/contexts/I18nContext'
import Button from './Button'

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  const { messages } = useI18n()
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 w-80 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-base font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel ?? messages.common.cancel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
