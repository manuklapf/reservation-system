'use client'

import React from 'react'
import { CANVAS_H, CANVAS_W, GRID } from './constants'
import GhostPreview from './GhostPreview'
import ObstacleNode from './ObstacleNode'
import PlacedTableNode from './PlacedTableNode'
import type { DBTable, Obstacle, PlacedTable } from './types'

interface FloorPlanCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>
  tables: DBTable[]
  placed: PlacedTable[]
  obstacles: Obstacle[]
  selected: string | null
  selectedObstacle: string | null
  activeTableIds?: Set<string>
  getTableColor: (t: DBTable) => string
  onCanvasClick: () => void
  onSelectTable: (id: string) => void
  onSelectObstacle: (id: string) => void
  onInteractionStart: () => void
  onInteractionEnd: () => void
  onTableChange: (id: string, patch: Partial<PlacedTable>) => void
  onObstacleChange: (id: string, patch: Partial<Obstacle>) => void
  draggedTableId: string | null
  draggingBlock: boolean
  dragPreviewPos: { x: number; y: number } | null
}

export default function FloorPlanCanvas({
  canvasRef,
  tables,
  placed,
  obstacles,
  selected,
  selectedObstacle,
  activeTableIds,
  getTableColor,
  onCanvasClick,
  onSelectTable,
  onSelectObstacle,
  onInteractionStart,
  onInteractionEnd,
  onTableChange,
  onObstacleChange,
  draggedTableId,
  draggingBlock,
  dragPreviewPos,
}: FloorPlanCanvasProps) {
  const draggedTable = draggedTableId
    ? tables.find(t => t.id === draggedTableId)
    : undefined

  return (
    <div className="flex-1 min-w-0 overflow-hidden">
      <div
        ref={canvasRef}
        className="relative border-2 border-gray-300 rounded-xl select-none"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          minWidth: CANVAS_W,
          isolation: 'isolate',
          cursor: 'default',
          backgroundImage: [
            'linear-gradient(to right, #e5e7eb 1px, transparent 1px)',
            'linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
          ].join(','),
          backgroundSize: `${GRID}px ${GRID}px`,
          backgroundColor: '#f9fafb',
        }}
        onClick={onCanvasClick}
      >
        {/* Blocks (rendered below tables) */}
        {obstacles.map(o => (
          <ObstacleNode
            key={o.id}
            obstacle={o}
            canvasW={CANVAS_W}
            canvasH={CANVAS_H}
            selected={selectedObstacle === o.id}
            onSelect={() => onSelectObstacle(o.id)}
            onInteractionStart={onInteractionStart}
            onChange={patch => onObstacleChange(o.id, patch)}
            onInteractionEnd={onInteractionEnd}
          />
        ))}

        {/* Drag preview - shows table being dragged on canvas */}
        {draggedTableId && dragPreviewPos && (
          <GhostPreview
            x={dragPreviewPos.x}
            y={dragPreviewPos.y}
            backgroundColor={
              draggedTable ? getTableColor(draggedTable) : '#gray'
            }
          >
            <span
              style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}
            >
              {draggedTable?.table_identifier}
            </span>
          </GhostPreview>
        )}

        {/* Drag preview - shows the block being dragged onto the canvas */}
        {draggingBlock && dragPreviewPos && (
          <GhostPreview
            x={dragPreviewPos.x}
            y={dragPreviewPos.y}
            backgroundColor="#000000"
            borderRadius={2}
          />
        )}

        {placed.map(p => {
          const db = tables.find(t => t.id === p.id)
          if (!db) return null
          return (
            <PlacedTableNode
              key={p.id}
              placedTable={p}
              dbTable={db}
              canvasW={CANVAS_W}
              canvasH={CANVAS_H}
              selected={selected === p.id}
              isActive={activeTableIds?.has(p.id) ?? false}
              onSelect={() => onSelectTable(p.id)}
              onInteractionStart={onInteractionStart}
              onChange={patch => onTableChange(p.id, patch)}
              onInteractionEnd={onInteractionEnd}
            />
          )
        })}
      </div>
    </div>
  )
}
