'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'
import Button from '../Button'

interface ObjectsPaletteProps {
  onAddBlock: () => void
}

/** Button that opens a small popover of placeable objects; clicking one drops it onto the canvas. */
export default function ObjectsPalette({ onAddBlock }: ObjectsPaletteProps) {
  const { messages } = useI18n()
  const t = messages.floorPlanEditor
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div className="relative shrink-0" ref={popoverRef}>
      <Button size="sm" variant="secondary" onClick={() => setOpen(o => !o)}>
        <Plus className="h-4 w-4" />
        {t.addObject}
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-max rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onAddBlock()
              setOpen(false)
            }}
            title={t.addBlock}
            aria-label={t.addBlock}
            className="transition-opacity hover:opacity-80"
            style={{
              width: 44,
              height: 44,
              backgroundColor: '#000000',
              border: '2px solid #000000',
              borderRadius: 2,
            }}
          />
        </div>
      )}
    </div>
  )
}
