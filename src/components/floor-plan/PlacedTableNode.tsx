'use client'

import { Users } from '@/components/icons'
import CanvasItem from './CanvasItem'
import type { DBTable, PlacedTable } from './types'

interface PlacedTableNodeProps {
  placedTable: PlacedTable
  dbTable: DBTable
  canvasW: number
  canvasH: number
  selected: boolean
  isActive: boolean
  onSelect: () => void
  onInteractionStart: () => void
  onChange: (patch: Partial<PlacedTable>) => void
  onInteractionEnd: () => void
}

export default function PlacedTableNode({
  placedTable: p,
  dbTable: db,
  canvasW,
  canvasH,
  selected,
  isActive,
  onSelect,
  onInteractionStart,
  onChange,
  onInteractionEnd,
}: PlacedTableNodeProps) {
  return (
    <CanvasItem
      rect={p}
      canvasW={canvasW}
      canvasH={canvasH}
      minSize={20}
      selected={selected}
      zIndex={selected ? 10 : 1}
      title={db.table_identifier}
      className="not-square"
      onSelect={onSelect}
      onInteractionStart={onInteractionStart}
      onChange={onChange}
      onInteractionEnd={onInteractionEnd}
      style={{
        backgroundColor: p.color,
        borderRadius: p.shape === 'round' ? '50%' : '0',
        border: selected
          ? '2px solid #1d4ed8'
          : isActive
            ? '2px solid #ef4444'
            : '2px solid rgba(0,0,0,0.22)',
        boxShadow: selected
          ? '0 0 0 3px rgba(59,130,246,0.35), 2px 3px 8px rgba(0,0,0,0.14)'
          : isActive
            ? '0 0 0 3px rgba(239,68,68,0.30), 2px 3px 8px rgba(0,0,0,0.12)'
            : '2px 3px 8px rgba(0,0,0,0.12)',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        transition: 'box-shadow 0.1s',
      }}
    >
      <span
        className="font-bold text-white leading-tight text-center px-1 truncate max-w-full drop-shadow-sm"
        style={{ fontSize: 11 }}
      >
        {db.table_identifier}
      </span>
      <span
        className="flex items-center gap-0.5 text-white/80 leading-none"
        style={{ fontSize: 10 }}
      >
        <Users style={{ width: 9, height: 9 }} />
        {db.capacity}
      </span>
    </CanvasItem>
  )
}
