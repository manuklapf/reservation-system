'use client'

import { X } from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'

interface ModalCloseButtonProps {
  onClose: () => void
}

/**
 * Close button pinned to the top-right of the viewport. Render it inside the
 * modal's backdrop: the backdrop's own z-index makes a stacking context, so
 * this stays above its modal and below any modal layered on top.
 */
export default function ModalCloseButton({ onClose }: ModalCloseButtonProps) {
  const { messages } = useI18n()
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        onClose()
      }}
      onPointerDown={e => e.stopPropagation()}
      aria-label={messages.common.close}
      title={messages.common.close}
      className="fixed right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-500 shadow-lg transition-colors hover:bg-gray-50 hover:text-gray-700"
    >
      <X className="h-5 w-5" />
    </button>
  )
}
