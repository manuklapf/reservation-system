'use client'

import { useRef } from 'react'
import { useI18n } from '@/contexts/I18nContext'

// Below this movement (px) a pointer gesture counts as a tap, not a drag.
const DRAG_THRESHOLD = 6

interface ObjectsPaletteProps {
  onBlockDragStart: () => void
  onBlockDragMove: (clientX: number, clientY: number) => void
  onBlockDragEnd: (clientX: number, clientY: number) => void
  onBlockDragCancel: () => void
}

/**
 * Placement uses Pointer Events (not HTML5 drag-and-drop) so it works with touch —
 * native `draggable` doesn't fire drag events from touch input on most mobile browsers.
 */
export default function ObjectsPalette({
  onBlockDragStart,
  onBlockDragMove,
  onBlockDragEnd,
  onBlockDragCancel,
}: ObjectsPaletteProps) {
  const { messages } = useI18n()
  const t = messages.floorPlanEditor
  const gestureRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    dragging: boolean
  } | null>(null)

  return (
    <div className="shrink-0">
      <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        {t.objects}
      </p>
      <div
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          gestureRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            dragging: false,
          }
        }}
        onPointerMove={e => {
          const g = gestureRef.current
          if (!g || g.pointerId !== e.pointerId) return
          if (!g.dragging) {
            const dist = Math.hypot(e.clientX - g.startX, e.clientY - g.startY)
            if (dist < DRAG_THRESHOLD) return
            g.dragging = true
            onBlockDragStart()
          }
          onBlockDragMove(e.clientX, e.clientY)
        }}
        onPointerUp={e => {
          const g = gestureRef.current
          if (!g || g.pointerId !== e.pointerId) return
          gestureRef.current = null
          if (g.dragging) onBlockDragEnd(e.clientX, e.clientY)
        }}
        onPointerCancel={e => {
          const g = gestureRef.current
          if (!g || g.pointerId !== e.pointerId) return
          gestureRef.current = null
          if (g.dragging) onBlockDragCancel()
        }}
        title={t.addBlockHint}
        className="cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity"
        style={{
          width: 44,
          height: 44,
          backgroundColor: '#000000',
          border: '2px solid #000000',
          borderRadius: 2,
          touchAction: 'none',
        }}
      />
    </div>
  )
}
