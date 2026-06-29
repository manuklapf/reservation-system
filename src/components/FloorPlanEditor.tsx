'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Users, Pencil, X, Square } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import { supabase } from '@/lib/supabase'
import TableChip from './TableChip'
import ConfirmDialog from './ConfirmDialog'

interface DBTable {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
  color?: string | null
}

interface PlacedTable {
  id: string
  x: number
  y: number
  w: number
  h: number
  shape: 'square' | 'round'
  color: string
}

type ObstacleType = 'block'

interface Obstacle {
  id: string
  type: ObstacleType
  label: string
  x: number
  y: number
  w: number
  h: number
  outlined: boolean
}

interface Props {
  tenantId: string
  floorId: string
  floorName: string
  onRenameFloor: (name: string) => void
  onDeleteFloor?: () => void
  onPlacedIdsChange?: (ids: string[]) => void
  /** Pre-loaded layout from the database. Takes priority over localStorage on first mount. */
  initialLayout?: PlacedTable[]
  /** Pre-loaded obstacles from the database. Takes priority over localStorage on first mount. */
  initialObstacles?: Obstacle[]
  /** Called (debounced) whenever the canvas layout or obstacles change, so the parent can persist to DB. */
  onLayoutChange?: (layout: PlacedTable[], obstacles: Obstacle[]) => void
  tables: DBTable[]
  allTables: DBTable[]
  saving?: boolean
  addError?: string
  onAddTable: (identifier: string, capacity: number) => Promise<void>
  onDeleteTable: (id: string) => Promise<void>
  /** IDs of tables currently occupied by an active reservation */
  activeTableIds?: Set<string>
}

const CANVAS_W = 832
const CANVAS_H = 480
const GRID = 10

const TABLE_COLORS = [
  '#4ecdc4',
  '#ff6b6b',
  '#DAA520',
  '#7fb069',
  '#ef476f',
  '#a8dadc',
  '#f4a261',
  '#c77dff',
  '#06d6a0',
  '#118ab2',
]

function snapG(v: number) {
  return Math.round(v / GRID) * GRID
}

function defaultSize(shape: PlacedTable['shape']) {
  return { w: 80, h: 80 }
}

function obstacleDefaultSize() {
  return { w: 80, h: 80 }
}

function generateObstacleId() {
  return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export default function FloorPlanEditor({
  tenantId,
  floorId,
  floorName,
  onRenameFloor,
  onDeleteFloor,
  onPlacedIdsChange,
  initialLayout,
  initialObstacles,
  onLayoutChange,
  tables,
  allTables,
  saving,
  addError,
  onAddTable,
  onDeleteTable,
  activeTableIds,
}: Props) {
  const { messages } = useI18n()
  const t = messages.floorPlanEditor
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)
  const storageKey = `floorplan_v1_${tenantId}_${floorId}`
  const obstacleKey = `floorplan_obs_v1_${tenantId}_${floorId}`

  const [placed, setPlaced] = useState<PlacedTable[]>(() => {
    try {
      const raw = localStorage.getItem(`floorplan_v1_${tenantId}_${floorId}`)
      if (raw) return JSON.parse(raw)
    } catch {
      // silently ignore
    }
    return initialLayout ?? []
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(floorName)
  // Local tracking of color changes so they update live in the UI
  const [colorOverrides, setColorOverrides] = useState<Map<string, string>>(
    new Map()
  )
  // Track dragging table for drag and drop
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null)
  // Track the position of the drag preview over the canvas
  const [dragPreviewPos, setDragPreviewPos] = useState<{
    x: number
    y: number
  } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const [obstacles, setObstacles] = useState<Obstacle[]>(() => {
    try {
      const raw = localStorage.getItem(
        `floorplan_obs_v1_${tenantId}_${floorId}`
      )
      if (raw) return JSON.parse(raw)
    } catch {
      // silently ignore
    }
    return initialObstacles ?? []
  })
  const [obstacleMode, setObstacleMode] = useState(false)
  const [selectedObstacle, setSelectedObstacle] = useState<string | null>(null)

  // New-table inline form
  const [newId, setNewId] = useState('')
  const [newCap, setNewCap] = useState('2')

  const dragRef = useRef<{
    id: string
    mx0: number
    my0: number
    tx0: number
    ty0: number
  } | null>(null)

  const resizeRef = useRef<{
    id: string
    corner: 'nw' | 'ne' | 'sw' | 'se'
    mx0: number
    my0: number
    tx0: number
    ty0: number
    tw0: number
    th0: number
  } | null>(null)

  const obsDragRef = useRef<{
    id: string
    mx0: number
    my0: number
    tx0: number
    ty0: number
  } | null>(null)

  const obsResizeRef = useRef<{
    id: string
    corner: 'nw' | 'ne' | 'sw' | 'se'
    mx0: number
    my0: number
    tx0: number
    ty0: number
    tw0: number
    th0: number
  } | null>(null)

  // Remove placed entries for tables that no longer exist
  useEffect(() => {
    // Skip pruning while tables are still loading (empty array = not yet fetched)
    if (tables.length === 0) return
    const ids = new Set(tables.map(t => t.id))
    setPlaced(prev => {
      const next = prev.filter(p => ids.has(p.id))
      // Return same reference if nothing was removed — avoids triggering downstream effects
      return next.length === prev.length ? prev : next
    })
  }, [tables])

  // Auto-save on every change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(placed))
    } catch {
      // silently ignore
    }
  }, [placed, storageKey])

  // Auto-save obstacles on every change
  useEffect(() => {
    try {
      localStorage.setItem(obstacleKey, JSON.stringify(obstacles))
    } catch {
      // silently ignore
    }
  }, [obstacles, obstacleKey])

  // Notify parent of layout changes (debounced 800ms) so it can persist to DB
  const onLayoutChangeRef = useRef(onLayoutChange)
  useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange
  })
  const layoutDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!onLayoutChangeRef.current) return
    if (layoutDebounceRef.current) clearTimeout(layoutDebounceRef.current)
    layoutDebounceRef.current = setTimeout(() => {
      onLayoutChangeRef.current?.(placed, obstacles)
    }, 800)
    return () => {
      if (layoutDebounceRef.current) clearTimeout(layoutDebounceRef.current)
    }
  }, [placed, obstacles])

  // Keep a stable ref to onPlacedIdsChange so it never needs to be a dep
  const onPlacedIdsChangeRef = useRef(onPlacedIdsChange)
  useEffect(() => {
    onPlacedIdsChangeRef.current = onPlacedIdsChange
  })

  // Report placed IDs to parent
  useEffect(() => {
    onPlacedIdsChangeRef.current?.(placed.map(p => p.id))
  }, [placed])

  // Backspace removes selected item from canvas
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace') return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (selected) {
        setPlaced(prev => prev.filter(p => p.id !== selected))
        setSelected(null)
      } else if (obstacleMode && selectedObstacle) {
        setObstacles(prev => prev.filter(o => o.id !== selectedObstacle))
        setSelectedObstacle(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, selectedObstacle])

  const placedIds = new Set(placed.map(p => p.id))
  const unplaced = tables.filter(t => t.is_active && !placedIds.has(t.id))

  const addToCanvas = (t: DBTable) => {
    const size = defaultSize('square')
    const color = getTableColor(t)
    setPlaced(prev => [
      ...prev,
      {
        id: t.id,
        x: snapG(Math.min(60, CANVAS_W - size.w - GRID)),
        y: snapG(Math.min(60, CANVAS_H - size.h - GRID)),
        ...size,
        shape: 'square',
        color,
      },
    ])
    setSelected(t.id)
    setSelectedObstacle(null)
  }

  const removeFromCanvas = (id: string) => {
    setPlaced(prev => prev.filter(p => p.id !== id))
    setSelected(null)
  }

  const handleAddTable = async () => {
    const identifier = newId.trim()
    const capacity = parseInt(newCap)
    if (!identifier || isNaN(capacity) || capacity <= 0) return
    await onAddTable(identifier, capacity)
    setNewId('')
    setNewCap('2')
    setShowAddModal(false)
  }

  const handleDeleteTable = (id: string) => {
    setPendingConfirm({
      title: t.deleteTableTitle,
      message: t.deleteTableConfirm,
      onConfirm: () => onDeleteTable(id),
    })
  }

  const updatePlaced = (id: string, patch: Partial<PlacedTable>) => {
    setPlaced(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))
  }

  // Get the effective color for a table, checking overrides first
  const getTableColor = (table: DBTable): string => {
    // Check local color overrides first
    const overrideColor = colorOverrides.get(table.id)
    if (overrideColor) return overrideColor
    // Then check stored color on table
    if (table.color) return table.color
    // Fall back to index-based default
    return TABLE_COLORS[allTables.indexOf(table) % TABLE_COLORS.length]
  }

  // Save table color to database when it's changed in the editor
  const saveTableColor = async (tableId: string, color: string) => {
    if (!supabase) return
    try {
      const { error } = await supabase
        .from('tables')
        .update({ color })
        .eq('id', tableId)
      if (error) console.error('Error saving table color:', error)
      else {
        // Update local color overrides so unplaced chips and other views reflect the change live
        setColorOverrides(prev => new Map(prev).set(tableId, color))
      }
    } catch (err) {
      console.error('Error saving table color:', err)
    }
  }

  const updateObstacle = (id: string, patch: Partial<Obstacle>) => {
    setObstacles(prev => prev.map(o => (o.id === id ? { ...o, ...patch } : o)))
  }

  const removeObstacle = (id: string) => {
    setObstacles(prev => prev.filter(o => o.id !== id))
    setSelectedObstacle(null)
  }

  const addBlock = () => {
    const size = obstacleDefaultSize()
    const newId = generateObstacleId()
    setObstacles(prev => [
      ...prev,
      {
        id: newId,
        type: 'block' as const,
        label: '',
        x: snapG(
          Math.max(0, Math.min(CANVAS_W / 2 - size.w / 2, CANVAS_W - size.w))
        ),
        y: snapG(
          Math.max(0, Math.min(CANVAS_H / 2 - size.h / 2, CANVAS_H - size.h))
        ),
        ...size,
        outlined: false,
      },
    ])
    setSelectedObstacle(newId)
    setSelected(null)
  }

  const handleCanvasClick = () => {
    setSelected(null)
    setSelectedObstacle(null)
  }

  const sel = placed.find(p => p.id === selected) ?? null
  const selDb = tables.find(t => t.id === selected) ?? null
  const selObs = obstacles.find(o => o.id === selectedObstacle) ?? null

  return (
    <div className="space-y-4">
      {/* Floor name header */}
      <div className="flex items-center gap-2">
        {editingName ? (
          <input
            type="text"
            value={draftName}
            autoFocus
            onChange={e => setDraftName(e.target.value)}
            onBlur={() => {
              onRenameFloor(draftName.trim() || floorName)
              setEditingName(false)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onRenameFloor(draftName.trim() || floorName)
                setEditingName(false)
              }
              if (e.key === 'Escape') {
                setDraftName(floorName)
                setEditingName(false)
              }
            }}
            className="text-xl font-bold text-gray-900 border-b-2 border-blue-400 bg-transparent outline-none p-0 pb-0.5 w-full min-w-0"
          />
        ) : (
          <>
            <h2
              className="text-xl font-bold text-gray-900 leading-tight cursor-pointer hover:text-blue-600 transition-colors"
              title={t.clickToRename}
              onClick={() => {
                setDraftName(floorName)
                setEditingName(true)
              }}
            >
              {floorName}
            </h2>
            <button
              type="button"
              onClick={() => {
                setObstacleMode(v => !v)
                if (obstacleMode) setSelectedObstacle(null)
              }}
              className={`p-1 rounded transition-colors shrink-0 ${
                obstacleMode
                  ? 'text-blue-600 bg-blue-100 hover:bg-blue-200'
                  : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
              }`}
              title={t.editLayout}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </>
        )}
        {onDeleteFloor && (
          <button
            type="button"
            onClick={() =>
              setPendingConfirm({
                title: t.deleteFloorTitle,
                message: t.deleteFloorConfirm,
                onConfirm: () => onDeleteFloor!(),
              })
            }
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-auto"
            title={t.deleteFloor}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Obstacle toolbar */}
      {obstacleMode && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl flex-wrap">
          <p className="text-xs font-semibold text-blue-700 mr-1">
            {t.editLayoutMode}
          </p>
          <button
            type="button"
            onClick={addBlock}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white text-gray-700 border-gray-300 hover:border-blue-400 transition-colors"
          >
            <Plus className="h-4 w-4" /> {t.addBlock}
          </button>
          <button
            type="button"
            onClick={() => {
              setObstacleMode(false)
              setSelectedObstacle(null)
            }}
            className="ml-auto p-1 rounded text-blue-400 hover:text-blue-700 hover:bg-blue-100 transition-colors"
            title={t.doneEditing}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Sidebar: unplaced list */}
        <div className="space-y-3">
          {/* Unplaced */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                {t.unplacedTables}
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="h-6 w-6 flex items-center justify-center rounded bg-green-500 shadow-sm text-white hover:bg-green-600 transition-colors"
                title={t.addNewTable}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {unplaced.length === 0 ? (
                <p className="text-xs text-gray-400 italic">{t.allPlaced}</p>
              ) : (
                unplaced.map(t => {
                  const color = getTableColor(t)
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={e => {
                        setDraggedTableId(t.id)
                        setDragPreviewPos(null)
                      }}
                      onDragEnd={() => {
                        setDraggedTableId(null)
                        setDragPreviewPos(null)
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <TableChip
                        id={t.id}
                        identifier={t.table_identifier}
                        capacity={t.capacity}
                        color={color}
                        showCapacity={true}
                        onClick={() => addToCanvas(t)}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Canvas */}
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
            onClick={handleCanvasClick}
            onDragOver={e => {
              e.preventDefault()
              e.stopPropagation()
              // Update drag preview position while over canvas
              if (draggedTableId) {
                const rect = e.currentTarget.getBoundingClientRect()
                setDragPreviewPos({
                  x: snapG(
                    Math.max(0, Math.min(CANVAS_W - 80, e.clientX - rect.left))
                  ),
                  y: snapG(
                    Math.max(0, Math.min(CANVAS_H - 80, e.clientY - rect.top))
                  ),
                })
              }
            }}
            onDragLeave={e => {
              // Only hide preview if leaving the canvas entirely
              if (e.currentTarget === e.target) {
                setDragPreviewPos(null)
              }
            }}
            onDrop={e => {
              e.preventDefault()
              e.stopPropagation()
              if (!draggedTableId || !dragPreviewPos) return
              // Find the table and place it at the drop position
              const table = tables.find(t => t.id === draggedTableId)
              if (table) {
                const color = getTableColor(table)
                setPlaced(prev => [
                  ...prev,
                  {
                    id: table.id,
                    x: dragPreviewPos.x,
                    y: dragPreviewPos.y,
                    w: 80,
                    h: 80,
                    shape: 'square',
                    color,
                  },
                ])
              }
              setDragPreviewPos(null)
              setDraggedTableId(null)
              if (table) {
                setSelected(table.id)
                setSelectedObstacle(null)
              }
            }}
          >
            {/* Blocks (rendered below tables) */}
            {obstacles.map(o => {
              const isSel = obstacleMode && selectedObstacle === o.id
              return (
                <div
                  key={o.id}
                  title={o.label || undefined}
                  style={{
                    position: 'absolute',
                    left: o.x,
                    top: o.y,
                    width: o.w,
                    height: o.h,
                    backgroundColor: o.outlined ? 'transparent' : '#000000',
                    border: isSel ? '2px solid #1d4ed8' : `2px solid #000000`,
                    borderRadius: 2,
                    boxShadow: isSel
                      ? '0 0 0 3px rgba(59,130,246,0.35)'
                      : 'none',
                    cursor: obstacleMode ? 'grab' : 'default',
                    touchAction: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: isSel ? 8 : 0,
                    pointerEvents: obstacleMode ? 'auto' : 'none',
                    transition: 'box-shadow 0.1s',
                  }}
                  onPointerDown={e => {
                    if (!obstacleMode) return
                    e.stopPropagation()
                    e.currentTarget.setPointerCapture(e.pointerId)
                    obsDragRef.current = {
                      id: o.id,
                      mx0: e.clientX,
                      my0: e.clientY,
                      tx0: o.x,
                      ty0: o.y,
                    }
                    setSelectedObstacle(o.id)
                    setSelected(null)
                  }}
                  onPointerMove={e => {
                    if (!obsDragRef.current || obsDragRef.current.id !== o.id)
                      return
                    const { mx0, my0, tx0, ty0 } = obsDragRef.current
                    const nx = snapG(
                      Math.max(
                        0,
                        Math.min(CANVAS_W - o.w, tx0 + e.clientX - mx0)
                      )
                    )
                    const ny = snapG(
                      Math.max(
                        0,
                        Math.min(CANVAS_H - o.h, ty0 + e.clientY - my0)
                      )
                    )
                    updateObstacle(o.id, { x: nx, y: ny })
                  }}
                  onPointerUp={() => {
                    obsDragRef.current = null
                  }}
                  onClick={e => {
                    if (!obstacleMode) return
                    e.stopPropagation()
                    setSelectedObstacle(o.id)
                    setSelected(null)
                  }}
                >
                  {/* Corner resize handles */}
                  {isSel &&
                    (['nw', 'ne', 'sw', 'se'] as const).map(corner => (
                      <div
                        key={corner}
                        style={{
                          position: 'absolute',
                          width: 10,
                          height: 10,
                          backgroundColor: 'white',
                          border: '2px solid #1d4ed8',
                          borderRadius: '50%',
                          zIndex: 20,
                          cursor: `${corner}-resize`,
                          top: corner.startsWith('n') ? -5 : undefined,
                          bottom: corner.startsWith('s') ? -5 : undefined,
                          left: corner.endsWith('w') ? -5 : undefined,
                          right: corner.endsWith('e') ? -5 : undefined,
                        }}
                        onPointerDown={e => {
                          e.stopPropagation()
                          e.currentTarget.setPointerCapture(e.pointerId)
                          obsResizeRef.current = {
                            id: o.id,
                            corner,
                            mx0: e.clientX,
                            my0: e.clientY,
                            tx0: o.x,
                            ty0: o.y,
                            tw0: o.w,
                            th0: o.h,
                          }
                        }}
                        onPointerMove={e => {
                          if (
                            !obsResizeRef.current ||
                            obsResizeRef.current.id !== o.id ||
                            obsResizeRef.current.corner !== corner
                          )
                            return
                          const { mx0, my0, tx0, ty0, tw0, th0 } =
                            obsResizeRef.current
                          const dx = e.clientX - mx0
                          const dy = e.clientY - my0
                          const MIN = 10
                          const nw = corner.includes('e')
                            ? Math.min(
                                CANVAS_W - tx0,
                                Math.max(MIN, snapG(tw0 + dx))
                              )
                            : Math.min(
                                tx0 + tw0,
                                Math.max(MIN, snapG(tw0 - dx))
                              )
                          const nh = corner.includes('s')
                            ? Math.min(
                                CANVAS_H - ty0,
                                Math.max(MIN, snapG(th0 + dy))
                              )
                            : Math.min(
                                ty0 + th0,
                                Math.max(MIN, snapG(th0 - dy))
                              )
                          const nx = corner.includes('w')
                            ? Math.max(0, snapG(tx0 + tw0 - nw))
                            : Math.max(0, Math.min(CANVAS_W - nw, tx0))
                          const ny = corner.includes('n')
                            ? Math.max(0, snapG(ty0 + th0 - nh))
                            : Math.max(0, Math.min(CANVAS_H - nh, ty0))
                          updateObstacle(o.id, { x: nx, y: ny, w: nw, h: nh })
                        }}
                        onPointerUp={() => {
                          obsResizeRef.current = null
                        }}
                      />
                    ))}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: o.outlined ? '#000000' : 'rgba(255,255,255,0.8)',
                      textAlign: 'center',
                      maxWidth: '90%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}
                  >
                    {o.label}
                  </span>
                </div>
              )
            })}

            {/* Drag preview - shows table being dragged on canvas */}
            {draggedTableId && dragPreviewPos && (
              <div
                key="drag-preview"
                style={{
                  position: 'absolute',
                  left: dragPreviewPos.x,
                  top: dragPreviewPos.y,
                  width: 80,
                  height: 80,
                  backgroundColor: (() => {
                    const table = tables.find(t => t.id === draggedTableId)
                    return table ? getTableColor(table) : '#gray'
                  })(),
                  borderRadius: '0',
                  border: '2px dashed #1d4ed8',
                  boxShadow:
                    '0 0 0 3px rgba(59,130,246,0.35), 2px 3px 8px rgba(0,0,0,0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  zIndex: 5,
                  opacity: 0.7,
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                  }}
                >
                  {tables.find(t => t.id === draggedTableId)?.table_identifier}
                </span>
              </div>
            )}

            {placed.map(p => {
              const db = tables.find(t => t.id === p.id)
              if (!db) return null
              const isSel = selected === p.id
              const isActive = activeTableIds?.has(p.id) ?? false

              return (
                <div
                  key={p.id}
                  title={db.table_identifier}
                  className="not-square"
                  style={{
                    position: 'absolute',
                    left: p.x,
                    top: p.y,
                    width: p.w,
                    height: p.h,
                    backgroundColor: p.color,
                    borderRadius: p.shape === 'round' ? '50%' : '0',
                    border: isSel
                      ? '2px solid #1d4ed8'
                      : isActive
                        ? '2px solid #ef4444'
                        : '2px solid rgba(0,0,0,0.22)',
                    boxShadow: isSel
                      ? '0 0 0 3px rgba(59,130,246,0.35), 2px 3px 8px rgba(0,0,0,0.14)'
                      : isActive
                        ? '0 0 0 3px rgba(239,68,68,0.30), 2px 3px 8px rgba(0,0,0,0.12)'
                        : '2px 3px 8px rgba(0,0,0,0.12)',
                    cursor: 'grab',
                    touchAction: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    zIndex: isSel ? 10 : 1,
                    transition: 'box-shadow 0.1s',
                  }}
                  onPointerDown={e => {
                    e.stopPropagation()
                    e.currentTarget.setPointerCapture(e.pointerId)
                    dragRef.current = {
                      id: p.id,
                      mx0: e.clientX,
                      my0: e.clientY,
                      tx0: p.x,
                      ty0: p.y,
                    }
                    setSelected(p.id)
                  }}
                  onPointerMove={e => {
                    if (!dragRef.current || dragRef.current.id !== p.id) return
                    const { mx0, my0, tx0, ty0 } = dragRef.current
                    const nx = snapG(
                      Math.max(
                        0,
                        Math.min(CANVAS_W - p.w, tx0 + e.clientX - mx0)
                      )
                    )
                    const ny = snapG(
                      Math.max(
                        0,
                        Math.min(CANVAS_H - p.h, ty0 + e.clientY - my0)
                      )
                    )
                    updatePlaced(p.id, { x: nx, y: ny })
                  }}
                  onPointerUp={() => {
                    dragRef.current = null
                  }}
                  onClick={e => {
                    e.stopPropagation()
                    setSelected(p.id)
                  }}
                >
                  {/* Corner resize handles */}
                  {isSel &&
                    (['nw', 'ne', 'sw', 'se'] as const).map(corner => (
                      <div
                        key={corner}
                        style={{
                          position: 'absolute',
                          width: 10,
                          height: 10,
                          backgroundColor: 'white',
                          border: '2px solid #1d4ed8',
                          borderRadius: '50%',
                          zIndex: 20,
                          cursor: `${corner}-resize`,
                          top: corner.startsWith('n') ? -5 : undefined,
                          bottom: corner.startsWith('s') ? -5 : undefined,
                          left: corner.endsWith('w') ? -5 : undefined,
                          right: corner.endsWith('e') ? -5 : undefined,
                        }}
                        onPointerDown={e => {
                          e.stopPropagation()
                          e.currentTarget.setPointerCapture(e.pointerId)
                          resizeRef.current = {
                            id: p.id,
                            corner,
                            mx0: e.clientX,
                            my0: e.clientY,
                            tx0: p.x,
                            ty0: p.y,
                            tw0: p.w,
                            th0: p.h,
                          }
                        }}
                        onPointerMove={e => {
                          if (
                            !resizeRef.current ||
                            resizeRef.current.id !== p.id ||
                            resizeRef.current.corner !== corner
                          )
                            return
                          const { mx0, my0, tx0, ty0, tw0, th0 } =
                            resizeRef.current
                          const dx = e.clientX - mx0
                          const dy = e.clientY - my0
                          const MIN = 20
                          const nw = corner.includes('e')
                            ? Math.min(
                                CANVAS_W - tx0,
                                Math.max(MIN, snapG(tw0 + dx))
                              )
                            : Math.min(
                                tx0 + tw0,
                                Math.max(MIN, snapG(tw0 - dx))
                              )
                          const nh = corner.includes('s')
                            ? Math.min(
                                CANVAS_H - ty0,
                                Math.max(MIN, snapG(th0 + dy))
                              )
                            : Math.min(
                                ty0 + th0,
                                Math.max(MIN, snapG(th0 - dy))
                              )
                          const nx = corner.includes('w')
                            ? Math.max(0, snapG(tx0 + tw0 - nw))
                            : Math.max(0, Math.min(CANVAS_W - nw, tx0))
                          const ny = corner.includes('n')
                            ? Math.max(0, snapG(ty0 + th0 - nh))
                            : Math.max(0, Math.min(CANVAS_H - nh, ty0))
                          updatePlaced(p.id, { x: nx, y: ny, w: nw, h: nh })
                        }}
                        onPointerUp={() => {
                          resizeRef.current = null
                        }}
                      />
                    ))}
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
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add table modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 w-72 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-gray-800">
              {t.newTableModal}
            </p>
            <input
              type="text"
              placeholder={t.tableNamePlaceholder}
              value={newId}
              autoFocus
              onChange={e => setNewId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTable()}
              maxLength={20}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="number"
              placeholder={t.numberOfSeatsPlaceholder}
              min={1}
              max={99}
              value={newCap}
              onChange={e => setNewCap(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTable()}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {addError && <p className="text-xs text-red-500">{addError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={saving || !newId.trim()}
                onClick={handleAddTable}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {t.addTableButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Properties bar — shown when a table is selected */}
      {sel && selDb && (
        <div className="flex items-start gap-4 px-4 py-3 border border-gray-200 rounded-xl bg-white flex-wrap">
          {/* Name + seats */}
          <div className="shrink-0 self-center">
            <p className="text-xs font-bold text-gray-800">
              {selDb.table_identifier}
            </p>
            <p className="text-xs text-gray-400">
              {selDb.capacity} {t.seatsLabel}
            </p>
          </div>

          <div className="w-px self-stretch bg-gray-100 shrink-0" />

          {/* Shape */}
          <div className="shrink-0">
            <p className="text-xs font-semibold text-gray-500 mb-1">
              {t.shapeLabel}
            </p>
            <div className="flex gap-1.5">
              {(['square', 'round'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updatePlaced(selected!, { shape: s })}
                  title={s.charAt(0).toUpperCase() + s.slice(1)}
                  className={`flex items-center justify-center h-8 w-8 rounded border-2 transition-colors ${
                    sel.shape === s
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div
                    className="h-5 w-5 not-square"
                    style={{
                      backgroundColor: sel.color,
                      borderRadius: s === 'round' ? '50%' : '0',
                      border: '1.5px solid rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="w-px self-stretch bg-gray-100 shrink-0" />

          {/* Color */}
          <div className="shrink-0">
            <p className="text-xs font-semibold text-gray-500 mb-1">
              {t.colorLabel}
            </p>
            <div className="flex gap-1 flex-wrap" style={{ maxWidth: 148 }}>
              {TABLE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    updatePlaced(selected!, { color: c })
                    saveTableColor(selected!, c)
                  }}
                  className="h-5 w-5 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor:
                      sel.color === c ? '#1d4ed8' : 'rgba(0,0,0,0.12)',
                    transform: sel.color === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="w-px self-stretch bg-gray-100 shrink-0" />

          {/* Actions */}
          <div className="flex gap-2 items-center shrink-0 self-center ml-auto">
            <button
              type="button"
              onClick={() => removeFromCanvas(selected!)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {t.removeFromPlan}
            </button>
            <button
              type="button"
              onClick={() => handleDeleteTable(selected!)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> {t.deleteTable}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!pendingConfirm}
        title={pendingConfirm?.title ?? ''}
        message={pendingConfirm?.message ?? ''}
        confirmLabel={messages.common.delete}
        danger
        onConfirm={() => {
          pendingConfirm?.onConfirm()
          setPendingConfirm(null)
        }}
        onCancel={() => setPendingConfirm(null)}
      />

      {/* Block properties bar — only in edit mode when a block is selected */}
      {obstacleMode && selObs && (
        <div className="flex items-start gap-4 px-4 py-3 border border-gray-200 rounded-xl bg-white flex-wrap">
          {/* Name */}
          <div className="shrink-0 self-center">
            <p className="text-xs font-semibold text-gray-500 mb-1">
              {t.label}
            </p>
            <input
              type="text"
              value={selObs.label}
              placeholder={t.none}
              onChange={e =>
                updateObstacle(selObs.id, { label: e.target.value })
              }
              maxLength={20}
              className="text-sm font-bold text-gray-800 border-b border-gray-300 bg-transparent outline-none w-24 focus:border-blue-400"
            />
          </div>

          <div className="w-px self-stretch bg-gray-100 shrink-0" />

          {/* Style: filled vs outlined */}
          <div className="shrink-0 self-center">
            <p className="text-xs font-semibold text-gray-500 mb-1">
              {t.style}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => updateObstacle(selObs.id, { outlined: false })}
                className={`flex items-center justify-center h-8 w-8 rounded border-2 transition-colors ${
                  !selObs.outlined
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                title={t.filled}
              >
                <div
                  className="h-5 w-5 rounded-sm"
                  style={{ backgroundColor: '#000' }}
                />
              </button>
              <button
                type="button"
                onClick={() => updateObstacle(selObs.id, { outlined: true })}
                className={`flex items-center justify-center h-8 w-8 rounded border-2 transition-colors ${
                  selObs.outlined
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                title={t.outlined}
              >
                <div
                  className="h-5 w-5 rounded-sm"
                  style={{
                    border: '2px solid #000',
                    backgroundColor: 'transparent',
                  }}
                />
              </button>
            </div>
          </div>

          <div className="w-px self-stretch bg-gray-100 shrink-0" />

          {/* Delete */}
          <div className="flex gap-2 items-center shrink-0 self-center ml-auto">
            <button
              type="button"
              onClick={() => removeObstacle(selObs.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> {t.remove}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
