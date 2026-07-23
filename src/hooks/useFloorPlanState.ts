'use client'

import { useEffect, useRef, useState } from 'react'
import { CANVAS_H, CANVAS_W, GRID } from '@/components/floor-plan/constants'
import {
  defaultObstacleSize,
  defaultTableSize,
  generateObstacleId,
  snapG,
} from '@/components/floor-plan/geometry'
import type {
  DBTable,
  Obstacle,
  PlacedTable,
} from '@/components/floor-plan/types'

interface UseFloorPlanStateArgs {
  tenantId: string
  floorId: string
  tables: DBTable[]
  initialLayout?: PlacedTable[]
  initialObstacles?: Obstacle[]
  onLayoutChange?: (layout: PlacedTable[], obstacles: Obstacle[]) => void
  onPlacedIdsChange?: (ids: string[]) => void
  /** Called when Backspace deletes the selected table (actually deletes the row, not just its placement). */
  onDeleteTable?: (id: string) => void
}

const HISTORY_LIMIT = 50

/**
 * Applies `patch` to the item with `id`, returning the original array when the patch
 * is a no-op. Pointer drags snap to the grid, so most moves land on the cell the item
 * already occupies — without this they'd still allocate a new array and re-render.
 */
function patchById<T extends { id: string }>(
  items: T[],
  id: string,
  patch: Partial<T>
): T[] {
  const index = items.findIndex(item => item.id === id)
  if (index === -1) return items

  const current = items[index]
  const keys = Object.keys(patch) as (keyof T)[]
  if (keys.every(key => current[key] === patch[key])) return items

  const next = [...items]
  next[index] = { ...current, ...patch }
  return next
}

/** Owns the placed-tables/obstacles model for a floor: localStorage persistence, undo history, and selection. */
export function useFloorPlanState({
  tenantId,
  floorId,
  tables,
  initialLayout,
  initialObstacles,
  onLayoutChange,
  onPlacedIdsChange,
  onDeleteTable,
}: UseFloorPlanStateArgs) {
  const storageKey = `floorplan_v1_${tenantId}_${floorId}`
  const obstacleKey = `floorplan_obs_v1_${tenantId}_${floorId}`

  const [placed, setPlaced] = useState<PlacedTable[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) return JSON.parse(raw)
    } catch {
      // silently ignore
    }
    return initialLayout ?? []
  })
  const [obstacles, setObstacles] = useState<Obstacle[]>(() => {
    try {
      const raw = localStorage.getItem(obstacleKey)
      if (raw) return JSON.parse(raw)
    } catch {
      // silently ignore
    }
    return initialObstacles ?? []
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedObstacle, setSelectedObstacle] = useState<string | null>(null)
  const [history, setHistory] = useState<
    { placed: PlacedTable[]; obstacles: Obstacle[] }[]
  >([])

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

  useEffect(() => {
    try {
      localStorage.setItem(obstacleKey, JSON.stringify(obstacles))
    } catch {
      // silently ignore
    }
  }, [obstacles, obstacleKey])

  // Keep live refs to the current state so history snapshots are never stale
  const placedRef = useRef(placed)
  const obstaclesRef = useRef(obstacles)
  useEffect(() => {
    placedRef.current = placed
  }, [placed])
  useEffect(() => {
    obstaclesRef.current = obstacles
  }, [obstacles])

  // Record the current layout so it can be restored with the revert button.
  // Call before applying any change (drag start, resize start, add/remove, etc.)
  const pushHistory = () => {
    setHistory(prev =>
      [
        ...prev,
        { placed: placedRef.current, obstacles: obstaclesRef.current },
      ].slice(-HISTORY_LIMIT)
    )
  }

  const revert = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const snapshot = prev[prev.length - 1]
      setPlaced(snapshot.placed)
      setObstacles(snapshot.obstacles)
      setSelected(null)
      setSelectedObstacle(null)
      return prev.slice(0, -1)
    })
  }

  // For drag/resize: snapshot on pointer-down but only commit to history once the
  // item is actually moved, so a plain select-click doesn't consume an undo step.
  const pendingHistoryRef = useRef<{
    placed: PlacedTable[]
    obstacles: Obstacle[]
  } | null>(null)
  const armPendingHistory = () => {
    pendingHistoryRef.current = {
      placed: placedRef.current,
      obstacles: obstaclesRef.current,
    }
  }
  const commitPendingHistory = () => {
    const snapshot = pendingHistoryRef.current
    if (!snapshot) return
    pendingHistoryRef.current = null
    setHistory(prev => [...prev, snapshot].slice(-HISTORY_LIMIT))
  }
  const clearPendingHistory = () => {
    pendingHistoryRef.current = null
  }

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
  // A drag moves a table, it doesn't add or remove one. Notifying on every
  // `placed` change would re-render the whole page on each pointermove, and
  // since that update is scheduled from this effect React counts it as a
  // nested update — ~50 of them into a drag it throws "Maximum update depth".
  const notifiedIdsRef = useRef<string[] | null>(null)
  useEffect(() => {
    const ids = placed.map(p => p.id)
    const prev = notifiedIdsRef.current
    if (
      prev &&
      prev.length === ids.length &&
      prev.every((id, i) => id === ids[i])
    ) {
      return
    }
    notifiedIdsRef.current = ids
    onPlacedIdsChangeRef.current?.(ids)
  }, [placed])

  // Keep a stable ref so the keydown listener below never needs re-binding
  const onDeleteTableRef = useRef(onDeleteTable)
  useEffect(() => {
    onDeleteTableRef.current = onDeleteTable
  }, [onDeleteTable])

  // Backspace deletes the selected table/obstacle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace') return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (selected) {
        const id = selected
        setSelected(null)
        onDeleteTableRef.current?.(id)
      } else if (selectedObstacle) {
        pushHistory()
        setObstacles(prev => prev.filter(o => o.id !== selectedObstacle))
        setSelectedObstacle(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, selectedObstacle])

  const selectTable = (id: string) => {
    setSelected(id)
    setSelectedObstacle(null)
  }
  const selectObstacle = (id: string) => {
    setSelectedObstacle(id)
    setSelected(null)
  }
  const clearSelection = () => {
    setSelected(null)
    setSelectedObstacle(null)
  }

  const addToCanvas = (
    table: DBTable,
    color: string,
    pos?: { x: number; y: number }
  ) => {
    pushHistory()
    const size = defaultTableSize()
    setPlaced(prev => [
      ...prev,
      {
        id: table.id,
        x: pos ? pos.x : snapG(Math.min(60, CANVAS_W - size.w - GRID)),
        y: pos ? pos.y : snapG(Math.min(60, CANVAS_H - size.h - GRID)),
        ...size,
        shape: 'square',
        color,
      },
    ])
    setSelected(table.id)
    setSelectedObstacle(null)
  }

  const updatePlaced = (id: string, patch: Partial<PlacedTable>) => {
    setPlaced(prev => patchById(prev, id, patch))
  }

  const updatePlacedFromInteraction = (
    id: string,
    patch: Partial<PlacedTable>
  ) => {
    commitPendingHistory()
    updatePlaced(id, patch)
  }

  const addBlock = (pos?: { x: number; y: number }) => {
    pushHistory()
    const size = defaultObstacleSize()
    const id = generateObstacleId()
    const x = pos
      ? pos.x
      : snapG(
          Math.max(0, Math.min(CANVAS_W / 2 - size.w / 2, CANVAS_W - size.w))
        )
    const y = pos
      ? pos.y
      : snapG(
          Math.max(0, Math.min(CANVAS_H / 2 - size.h / 2, CANVAS_H - size.h))
        )
    setObstacles(prev => [
      ...prev,
      { id, type: 'block' as const, label: '', x, y, ...size, outlined: false },
    ])
    setSelectedObstacle(id)
    setSelected(null)
  }

  const removeObstacle = (id: string) => {
    pushHistory()
    setObstacles(prev => prev.filter(o => o.id !== id))
    setSelectedObstacle(null)
  }

  const updateObstacle = (id: string, patch: Partial<Obstacle>) => {
    setObstacles(prev => patchById(prev, id, patch))
  }

  const updateObstacleFromInteraction = (
    id: string,
    patch: Partial<Obstacle>
  ) => {
    commitPendingHistory()
    updateObstacle(id, patch)
  }

  return {
    placed,
    obstacles,
    selected,
    selectedObstacle,
    canRevert: history.length > 0,
    revert,
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
  }
}
