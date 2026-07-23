'use client'

import { useState } from 'react'
import { Plus } from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'
import { useFloorPlanState } from '@/hooks/useFloorPlanState'
import { useTableColors } from '@/hooks/useTableColors'
import Button from './Button'
import AddTableModal from './floor-plan/AddTableModal'
import FloorHeader from './floor-plan/FloorHeader'
import FloorPlanCanvas from './floor-plan/FloorPlanCanvas'
import ObjectsPalette from './floor-plan/ObjectsPalette'
import ObstaclePropertiesBar from './floor-plan/ObstaclePropertiesBar'
import TablePropertiesBar from './floor-plan/TablePropertiesBar'
import type { DBTable, Obstacle, PlacedTable } from './floor-plan/types'
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
    pushHistory,
    armPendingHistory,
    clearPendingHistory,
    selectTable,
    selectObstacle,
    clearSelection,
    addToCanvas,
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
    onDeleteTable,
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
    clearSelection()
    onDeleteTable(id)
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
  const selObs = obstacles.find(o => o.id === selectedObstacle) ?? null

  return (
    <div className="space-y-4">
      <FloorHeader
        floorName={floorName}
        onRenameFloor={onRenameFloor}
        onDeleteFloor={onDeleteFloor ? handleRequestDeleteFloor : undefined}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setTableModal({ mode: 'add' })}>
            <Plus className="h-4 w-4" />
            {t.addNewTable}
          </Button>

          <ObjectsPalette onAddBlock={() => addBlock()} />
        </div>

        <FloorPlanCanvas
          tables={tables}
          placed={placed}
          obstacles={obstacles}
          selected={selected}
          selectedObstacle={selectedObstacle}
          activeTableIds={activeTableIds}
          onCanvasClick={clearSelection}
          onSelectTable={selectTable}
          onSelectObstacle={selectObstacle}
          onInteractionStart={armPendingHistory}
          onInteractionEnd={clearPendingHistory}
          onTableChange={updatePlacedFromInteraction}
          onObstacleChange={updateObstacleFromInteraction}
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

      {sel && (
        <TablePropertiesBar
          placedTable={sel}
          onShapeChange={shape => {
            pushHistory()
            updatePlaced(sel.id, { shape })
          }}
          onColorChange={color => {
            pushHistory()
            updatePlaced(sel.id, { color })
            saveTableColor(sel.id, color)
          }}
          onDelete={() => handleDeleteTable(sel.id)}
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
