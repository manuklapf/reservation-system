'use client'

import { useRef, useState } from 'react'
import { useI18n } from '@/contexts/I18nContext'
import { useFloorPlanState } from '@/hooks/useFloorPlanState'
import { useTableColors } from '@/hooks/useTableColors'
import AddTableModal from './floor-plan/AddTableModal'
import { CANVAS_H, CANVAS_W } from './floor-plan/constants'
import FloorHeader from './floor-plan/FloorHeader'
import FloorPlanCanvas from './floor-plan/FloorPlanCanvas'
import { snapG } from './floor-plan/geometry'
import ObjectsPalette from './floor-plan/ObjectsPalette'
import ObstaclePropertiesBar from './floor-plan/ObstaclePropertiesBar'
import TablePropertiesBar from './floor-plan/TablePropertiesBar'
import type { DBTable, Obstacle, PlacedTable } from './floor-plan/types'
import UnplacedTablesPalette from './floor-plan/UnplacedTablesPalette'
import ConfirmDialog from './ConfirmDialog'

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
  /** Creates the table and resolves with the created row so it can be placed on the canvas. */
  onAddTable: (identifier: string, capacity: number) => Promise<DBTable | void>
  onUpdateTable: (
    id: string,
    identifier: string,
    capacity: number
  ) => Promise<void>
  onDeleteTable: (id: string) => Promise<void>
  /** IDs of tables currently occupied by an active reservation */
  activeTableIds?: Set<string>
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
  onUpdateTable,
  onDeleteTable,
  activeTableIds,
}: Props) {
  const { messages } = useI18n()
  const t = messages.floorPlanEditor

  const {
    placed,
    obstacles,
    selected,
    selectedObstacle,
    canRevert,
    revert,
    pushHistory,
    armPendingHistory,
    clearPendingHistory,
    selectTable,
    selectObstacle,
    clearSelection,
    addToCanvas,
    removeFromCanvas,
    updatePlaced,
    updatePlacedFromInteraction,
    addBlock,
    removeObstacle,
    updateObstacle,
    updateObstacleFromInteraction,
  } = useFloorPlanState({
    tenantId,
    floorId,
    tables,
    initialLayout,
    initialObstacles,
    onLayoutChange,
    onPlacedIdsChange,
  })

  const { getTableColor, saveTableColor } = useTableColors(allTables)

  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)
  const [tableModal, setTableModal] = useState<
    { mode: 'add' } | { mode: 'edit'; table: DBTable } | null
  >(null)

  // Track dragging table for drag and drop
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null)
  // Track dragging a new block from the objects palette
  const [draggingBlock, setDraggingBlock] = useState(false)
  // Track the position of the drag preview over the canvas
  const [dragPreviewPos, setDragPreviewPos] = useState<{
    x: number
    y: number
  } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  // Holds the table mid-drag so drag-end doesn't depend on state having flushed yet
  const dragTableRef = useRef<DBTable | null>(null)

  const placedIds = new Set(placed.map(p => p.id))
  const unplaced = tables.filter(t => t.is_active && !placedIds.has(t.id))

  // Resolves a pointer position to a snapped canvas-local position, or null if outside the canvas.
  const canvasPosFromPointer = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null
    }
    return {
      x: snapG(Math.max(0, Math.min(CANVAS_W - 80, clientX - rect.left))),
      y: snapG(Math.max(0, Math.min(CANVAS_H - 80, clientY - rect.top))),
    }
  }

  const handleTableDragStart = (table: DBTable) => {
    dragTableRef.current = table
    setDraggedTableId(table.id)
    setDragPreviewPos(null)
  }

  const handleTableDragMove = (clientX: number, clientY: number) => {
    setDragPreviewPos(canvasPosFromPointer(clientX, clientY))
  }

  const handleTableDragEnd = (clientX: number, clientY: number) => {
    const table = dragTableRef.current
    const pos = canvasPosFromPointer(clientX, clientY)
    if (table && pos) addToCanvas(table, getTableColor(table), pos)
    dragTableRef.current = null
    setDraggedTableId(null)
    setDragPreviewPos(null)
  }

  const handleTableDragCancel = () => {
    dragTableRef.current = null
    setDraggedTableId(null)
    setDragPreviewPos(null)
  }

  const handleBlockDragStart = () => {
    setDraggingBlock(true)
    setDragPreviewPos(null)
  }

  const handleBlockDragMove = (clientX: number, clientY: number) => {
    setDragPreviewPos(canvasPosFromPointer(clientX, clientY))
  }

  const handleBlockDragEnd = (clientX: number, clientY: number) => {
    const pos = canvasPosFromPointer(clientX, clientY)
    if (pos) addBlock(pos)
    setDraggingBlock(false)
    setDragPreviewPos(null)
  }

  const handleBlockDragCancel = () => {
    setDraggingBlock(false)
    setDragPreviewPos(null)
  }

  const handleTableModalSubmit = async (
    identifier: string,
    capacity: number
  ) => {
    if (!tableModal) return
    if (tableModal.mode === 'add') {
      const created = await onAddTable(identifier, capacity)
      setTableModal(null)
      // Drop the freshly created table straight onto this floor's canvas
      if (created) addToCanvas(created, getTableColor(created))
    } else {
      await onUpdateTable(tableModal.table.id, identifier, capacity)
      setTableModal(null)
    }
  }

  const handleDeleteTable = (id: string) => {
    setPendingConfirm({
      title: t.deleteTableTitle,
      message: t.deleteTableConfirm,
      onConfirm: () => onDeleteTable(id),
    })
  }

  const handleRequestDeleteFloor = () => {
    if (!onDeleteFloor) return
    setPendingConfirm({
      title: t.deleteFloorTitle,
      message: t.deleteFloorConfirm,
      onConfirm: onDeleteFloor,
    })
  }

  const sel = placed.find(p => p.id === selected) ?? null
  const selDb = tables.find(t => t.id === selected) ?? null
  const selObs = obstacles.find(o => o.id === selectedObstacle) ?? null

  return (
    <div className="space-y-4">
      <FloorHeader
        floorName={floorName}
        onRenameFloor={onRenameFloor}
        onDeleteFloor={onDeleteFloor ? handleRequestDeleteFloor : undefined}
        canRevert={canRevert}
        onRevert={revert}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start gap-5">
          <UnplacedTablesPalette
            unplaced={unplaced}
            getTableColor={getTableColor}
            onAddNew={() => setTableModal({ mode: 'add' })}
            onEditTable={table => setTableModal({ mode: 'edit', table })}
            onTableDragStart={handleTableDragStart}
            onTableDragMove={handleTableDragMove}
            onTableDragEnd={handleTableDragEnd}
            onTableDragCancel={handleTableDragCancel}
          />

          <ObjectsPalette
            onBlockDragStart={handleBlockDragStart}
            onBlockDragMove={handleBlockDragMove}
            onBlockDragEnd={handleBlockDragEnd}
            onBlockDragCancel={handleBlockDragCancel}
          />
        </div>

        <FloorPlanCanvas
          canvasRef={canvasRef}
          tables={tables}
          placed={placed}
          obstacles={obstacles}
          selected={selected}
          selectedObstacle={selectedObstacle}
          activeTableIds={activeTableIds}
          getTableColor={getTableColor}
          onCanvasClick={clearSelection}
          onSelectTable={selectTable}
          onSelectObstacle={selectObstacle}
          onInteractionStart={armPendingHistory}
          onInteractionEnd={clearPendingHistory}
          onTableChange={updatePlacedFromInteraction}
          onObstacleChange={updateObstacleFromInteraction}
          draggedTableId={draggedTableId}
          draggingBlock={draggingBlock}
          dragPreviewPos={dragPreviewPos}
        />
      </div>

      {tableModal && (
        <AddTableModal
          mode={tableModal.mode}
          initialIdentifier={
            tableModal.mode === 'edit'
              ? tableModal.table.table_identifier
              : undefined
          }
          initialCapacity={
            tableModal.mode === 'edit' ? tableModal.table.capacity : undefined
          }
          saving={saving}
          addError={addError}
          onClose={() => setTableModal(null)}
          onSubmit={handleTableModalSubmit}
          onDelete={
            tableModal.mode === 'edit'
              ? () => {
                  handleDeleteTable(tableModal.table.id)
                  setTableModal(null)
                }
              : undefined
          }
        />
      )}

      {sel && selDb && (
        <TablePropertiesBar
          placedTable={sel}
          dbTable={selDb}
          onShapeChange={shape => {
            pushHistory()
            updatePlaced(sel.id, { shape })
          }}
          onColorChange={color => {
            pushHistory()
            updatePlaced(sel.id, { color })
            saveTableColor(sel.id, color)
          }}
          onRemoveFromPlan={() => removeFromCanvas(sel.id)}
        />
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

      {selObs && (
        <ObstaclePropertiesBar
          obstacle={selObs}
          onLabelFocus={pushHistory}
          onLabelChange={label => updateObstacle(selObs.id, { label })}
          onStyleChange={outlined => {
            pushHistory()
            updateObstacle(selObs.id, { outlined })
          }}
          onRemove={() => removeObstacle(selObs.id)}
        />
      )}
    </div>
  )
}
