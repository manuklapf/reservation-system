'use client'

import { useRef } from 'react'
import { Plus } from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'
import TableChip from '../TableChip'
import type { DBTable } from './types'

// Below this movement (px) a pointer gesture counts as a tap, not a drag.
const DRAG_THRESHOLD = 6

interface UnplacedTablesPaletteProps {
  unplaced: DBTable[]
  getTableColor: (t: DBTable) => string
  onAddNew: () => void
  onEditTable: (t: DBTable) => void
  onTableDragStart: (table: DBTable) => void
  onTableDragMove: (clientX: number, clientY: number) => void
  onTableDragEnd: (clientX: number, clientY: number) => void
  onTableDragCancel: () => void
}

export default function UnplacedTablesPalette({
  unplaced,
  getTableColor,
  onAddNew,
  onEditTable,
  onTableDragStart,
  onTableDragMove,
  onTableDragEnd,
  onTableDragCancel,
}: UnplacedTablesPaletteProps) {
  const { messages } = useI18n()
  const t = messages.floorPlanEditor

  return (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          {t.unplacedTables}
        </p>
        <button
          type="button"
          onClick={onAddNew}
          className="h-6 w-6 flex items-center justify-center rounded bg-green-500 shadow-sm text-white hover:bg-green-600 transition-colors"
          title={t.addNewTable}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-12 sm:gap-1">
        {unplaced.length === 0 ? (
          <p className="text-xs text-gray-400 italic col-span-full">
            {t.allPlaced}
          </p>
        ) : (
          unplaced.map(table => (
            <DraggableTableChip
              key={table.id}
              table={table}
              color={getTableColor(table)}
              onTap={() => onEditTable(table)}
              onDragStart={() => onTableDragStart(table)}
              onDragMove={onTableDragMove}
              onDragEnd={onTableDragEnd}
              onDragCancel={onTableDragCancel}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface DraggableTableChipProps {
  table: DBTable
  color: string
  onTap: () => void
  onDragStart: () => void
  onDragMove: (clientX: number, clientY: number) => void
  onDragEnd: (clientX: number, clientY: number) => void
  onDragCancel: () => void
}

/**
 * Placement uses Pointer Events (not HTML5 drag-and-drop) so it works with touch —
 * native `draggable` doesn't fire drag events from touch input on most mobile browsers.
 */
function DraggableTableChip({
  table,
  color,
  onTap,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: DraggableTableChipProps) {
  const gestureRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    dragging: boolean
  } | null>(null)

  return (
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
          onDragStart()
        }
        onDragMove(e.clientX, e.clientY)
      }}
      onPointerUp={e => {
        const g = gestureRef.current
        if (!g || g.pointerId !== e.pointerId) return
        gestureRef.current = null
        if (g.dragging) {
          onDragEnd(e.clientX, e.clientY)
        } else {
          onTap()
        }
      }}
      onPointerCancel={e => {
        const g = gestureRef.current
        if (!g || g.pointerId !== e.pointerId) return
        gestureRef.current = null
        if (g.dragging) onDragCancel()
      }}
      className="cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    >
      <TableChip
        id={table.id}
        identifier={table.table_identifier}
        capacity={table.capacity}
        color={color}
        showCapacity={true}
      />
    </div>
  )
}
