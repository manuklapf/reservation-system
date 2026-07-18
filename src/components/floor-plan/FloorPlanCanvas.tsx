'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'
import { CANVAS_H, CANVAS_W, GRID } from './constants'
import GhostPreview from './GhostPreview'
import ObstacleNode from './ObstacleNode'
import PlacedTableNode from './PlacedTableNode'
import type { DBTable, Obstacle, PlacedTable } from './types'

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.5

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
  const { messages } = useI18n()
  const labels = messages.floorPlanEditor

  const draggedTable = draggedTableId
    ? tables.find(t => t.id === draggedTableId)
    : undefined

  // Shrink the canvas to fit narrow viewports; never enlarge it past its native size.
  const shellRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(1)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const scale = fitScale * zoom
  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const measure = () => {
      const { width } = el.getBoundingClientRect()
      if (width > 0) setFitScale(Math.min(width / CANVAS_W, 1))
    }
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Zoom about the middle of what's on screen, otherwise the top-left transform
  // origin drags the view away from whatever the user was looking at.
  const applyZoom = (next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
    const el = viewportRef.current
    if (!el || clamped === zoom) {
      setZoom(clamped)
      return
    }
    const centerX = (el.scrollLeft + el.clientWidth / 2) / zoom
    const centerY = (el.scrollTop + el.clientHeight / 2) / zoom
    setZoom(clamped)
    requestAnimationFrame(() => {
      el.scrollLeft = centerX * clamped - el.clientWidth / 2
      el.scrollTop = centerY * clamped - el.clientHeight / 2
    })
  }

  return (
    <div ref={shellRef} className="relative flex-1 min-w-0">
      {/* The viewport stays at fit size; zooming scrolls within it rather than growing the page */}
      <div
        ref={viewportRef}
        className="overflow-auto"
        style={{ width: '100%', height: CANVAS_H * fitScale }}
      >
        <div
          style={{
            width: CANVAS_W * scale,
            height: CANVAS_H * scale,
            position: 'relative',
          }}
        >
          <div
            ref={canvasRef}
            className="absolute left-0 top-0 border-2 border-gray-300 rounded-xl select-none"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
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
                scale={scale}
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
                  style={{
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                  }}
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
                  scale={scale}
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
      </div>

      {/* Zoom controls — the plan is only scaled down on narrow viewports */}
      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-md lg:hidden">
        <button
          type="button"
          onClick={() => applyZoom(zoom + ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
          className="flex h-9 w-9 items-center justify-center text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-30"
          title={labels.zoomIn}
          aria-label={labels.zoomIn}
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="h-px bg-gray-200" />
        <button
          type="button"
          onClick={() => applyZoom(zoom - ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM}
          className="flex h-9 w-9 items-center justify-center text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-30"
          title={labels.zoomOut}
          aria-label={labels.zoomOut}
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
