'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X,
  Check,
  Users,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from '@/components/icons'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/contexts/I18nContext'
import { Reservation } from '@/types/reservation'
import { timesOverlap } from '@/utils/reservationConflictChecker'
import ConfirmDialog from './ConfirmDialog'
import FloorDropdown from './FloorDropdown'

interface DBTable {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
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

interface Obstacle {
  id: string
  type: string
  label: string
  x: number
  y: number
  w: number
  h: number
  outlined: boolean
}

interface FloorPlan {
  id: string
  name: string
  layout: PlacedTable[]
  obstacles: Obstacle[]
}

interface DayPlanModalProps {
  isOpen: boolean
  onClose: () => void
  date: string
  reservations: Reservation[]
  tenantId: string
  onSave: () => void
}

const CANVAS_W = 832
const CANVAS_H = 480
/** Height of one reservation row incl. divider, in px — sets how many fit on a touch page. */
const ROW_H = 58
const MIN_ITEMS_PER_PAGE = 3
/** Below lg the plan sits above the reservation list; cap how much height it may claim. */
const MOBILE_PLAN_HEIGHT_RATIO = 0.6

const shortName = (name: string) => {
  const parts = name.trim().split(/\s+/)
  return parts.length <= 1
    ? name.slice(0, 14)
    : `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export default function DayPlanModal({
  isOpen,
  onClose,
  date,
  reservations,
  tenantId,
  onSave,
}: DayPlanModalProps) {
  const [floors, setFloors] = useState<FloorPlan[]>([])
  const [tables, setTables] = useState<DBTable[]>([])
  const [loadingFloors, setLoadingFloors] = useState(false)
  const [activeFloorIdx, setActiveFloorIdx] = useState(0)
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [dragOverTableId, setDragOverTableId] = useState<string | null>(null)
  const [focusedTableId, setFocusedTableId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [scale, setScale] = useState(0.88)
  const [listPage, setListPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(6)
  const [isTouch, setIsTouch] = useState(false)
  const [touchDragState, setTouchDragState] = useState<{
    resId: string
    x: number
    y: number
  } | null>(null)

  const { language, messages } = useI18n()
  const t = messages.dayPlanModal
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)

  // Refs for touch handling — avoids stale closures in the one-time effect
  const touchDragRef = useRef<typeof touchDragState>(null)
  const touchStartPos = useRef<{ x: number; y: number; resId: string } | null>(
    null
  )
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const floorPlanInnerRef = useRef<HTMLDivElement>(null)
  const floorRef = useRef<FloorPlan | null>(null)
  const floorContainerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const scaleRef = useRef(0.88)
  const latestHandleDropRef = useRef<(tableId: string, resId: string) => void>(
    () => {}
  )

  // Body scroll lock
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Init assignments on open
  useEffect(() => {
    if (!isOpen) return
    const init: Record<string, string[]> = {}
    for (const r of reservations) {
      const ids = r.table_ids?.length
        ? r.table_ids
        : r.table_id
          ? [r.table_id]
          : []
      if (ids.length) init[r.id] = ids
    }
    setAssignments(init)
    setFocusedTableId(null)
    setActiveFloorIdx(0)
    setListPage(0)
    touchDragRef.current = null
    setTouchDragState(null)
  }, [isOpen, reservations])

  // Load floors
  useEffect(() => {
    if (!isOpen || !tenantId || !supabase) return
    setLoadingFloors(true)
    supabase
      .from('floor_plans')
      .select('id, name, sort_order, layout, obstacles')
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .then(({ data }) => {
        setLoadingFloors(false)
        if (!data?.length) return
        setFloors(
          data.map(row => {
            let layout: PlacedTable[] = (row.layout as PlacedTable[]) ?? []
            let obstacles: Obstacle[] = (row.obstacles as Obstacle[]) ?? []
            try {
              const ls = localStorage.getItem(
                `floorplan_v1_${tenantId}_${row.id}`
              )
              if (ls) layout = JSON.parse(ls)
            } catch {}
            try {
              const ls = localStorage.getItem(
                `floorplan_obs_v1_${tenantId}_${row.id}`
              )
              if (ls) obstacles = JSON.parse(ls)
            } catch {}
            return { id: row.id, name: row.name, layout, obstacles }
          })
        )
      })
  }, [isOpen, tenantId])

  // Load tables
  useEffect(() => {
    if (!isOpen || !tenantId || !supabase) return
    supabase
      .from('tables')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('table_identifier')
      .then(({ data }) => setTables(data ?? []))
  }, [isOpen, tenantId])

  // Keep floor ref in sync for touch handlers
  useEffect(() => {
    floorRef.current = floors[activeFloorIdx] ?? null
  }, [floors, activeFloorIdx])

  // Detect touch capability for pagination
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Reset list page when the displayed set changes
  useEffect(() => {
    setListPage(0)
  }, [focusedTableId])

  // Fill the list with as many rows as its height allows rather than a fixed count
  useEffect(() => {
    if (!isOpen) return
    const el = listRef.current
    if (!el) return
    const measure = () => {
      const { height } = el.getBoundingClientRect()
      setItemsPerPage(
        Math.max(MIN_ITEMS_PER_PAGE, Math.floor(height / ROW_H)) || 1
      )
    }
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    return () => obs.disconnect()
  }, [isOpen])

  // Scale floor plan to fill the container without overflow.
  // Below lg the container hugs the scaled canvas, so its own height is an
  // output of the scale, not an input — the height budget comes from the body.
  useEffect(() => {
    if (!isOpen) return
    const el = floorContainerRef.current
    const body = bodyRef.current
    if (!el || !body) return
    const measure = () => {
      const { width } = el.getBoundingClientRect()
      const bodyHeight = body.getBoundingClientRect().height
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches
      const height = isDesktop
        ? bodyHeight
        : bodyHeight * MOBILE_PLAN_HEIGHT_RATIO
      const s = Math.min((width - 32) / CANVAS_W, (height - 32) / CANVAS_H, 1.5)
      const ns = Math.max(s, 0.15)
      setScale(ns)
      scaleRef.current = ns
    }
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    obs.observe(body)
    return () => obs.disconnect()
  }, [isOpen])

  const tableMap = new Map(tables.map(t => [t.id, t]))

  const getEffectiveTableIds = (r: Reservation): string[] =>
    assignments[r.id] ??
    (r.table_ids?.length ? r.table_ids : r.table_id ? [r.table_id] : [])

  const handleDrop = (tableId: string, reservationId: string) => {
    const res = reservations.find(r => r.id === reservationId)
    if (!res) return
    const conflicts = reservations.filter(
      r =>
        r.id !== reservationId &&
        getEffectiveTableIds(r).includes(tableId) &&
        timesOverlap(res.time, res.end_time, r.time, r.end_time)
    )
    const doAssign = () =>
      setAssignments(prev => {
        const prevIds = prev[reservationId] ?? getEffectiveTableIds(res)
        if (prevIds.includes(tableId)) return prev
        // Dragging out of the focused table moves the reservation rather than
        // adding a second table to it.
        const nextIds =
          focusedTableId &&
          focusedTableId !== tableId &&
          prevIds.includes(focusedTableId)
            ? prevIds.map(id => (id === focusedTableId ? tableId : id))
            : [...prevIds, tableId]
        return { ...prev, [reservationId]: nextIds }
      })
    if (conflicts.length > 0) {
      const names = conflicts
        .map(r => `${r.customer_name} (${r.time.slice(0, 5)})`)
        .join(', ')
      setPendingConfirm({
        title: t.timeConflictTitle,
        message: t.timeConflict.replace('{names}', names),
        onConfirm: doAssign,
      })
      return
    }
    doAssign()
  }

  // Always up-to-date ref so the one-time touch effect can call handleDrop
  latestHandleDropRef.current = handleDrop

  // Touch drag system — attached once per modal open to avoid listener churn
  useEffect(() => {
    if (!isOpen) return

    const hitTest = (cx: number, cy: number, p: PlacedTable) => {
      if (p.shape === 'round') {
        return (
          ((cx - p.x - p.w / 2) / (p.w / 2)) ** 2 +
            ((cy - p.y - p.h / 2) / (p.h / 2)) ** 2 <=
          1
        )
      }
      return cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h
    }

    const toCanvasCoords = (touch: Touch) => {
      const el = floorPlanInnerRef.current
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return {
        cx: (touch.clientX - rect.left) / scaleRef.current,
        cy: (touch.clientY - rect.top) / scaleRef.current,
      }
    }

    const updateHover = (touch: Touch) => {
      const coords = toCanvasCoords(touch)
      const floor = floorRef.current
      if (!coords || !floor) {
        setDragOverTableId(null)
        return
      }
      let found: string | null = null
      for (const p of floor.layout) {
        if (hitTest(coords.cx, coords.cy, p)) {
          found = p.id
          break
        }
      }
      setDragOverTableId(found)
    }

    const onMove = (e: TouchEvent) => {
      if (!touchDragRef.current) return
      const touch = e.touches[0]
      const next = {
        ...touchDragRef.current,
        x: touch.clientX,
        y: touch.clientY,
      }
      touchDragRef.current = next
      setTouchDragState(next)
      updateHover(touch)
      e.preventDefault()
    }

    const finishDrag = (touch: Touch) => {
      const current = touchDragRef.current
      if (!current) return
      const coords = toCanvasCoords(touch)
      const floor = floorRef.current
      if (coords && floor) {
        for (const p of floor.layout) {
          if (hitTest(coords.cx, coords.cy, p)) {
            latestHandleDropRef.current(p.id, current.resId)
            break
          }
        }
      }
      setDragOverTableId(null)
      touchDragRef.current = null
      setTouchDragState(null)
    }

    const onEnd = (e: TouchEvent) => {
      clearTimeout(touchTimerRef.current!)
      touchTimerRef.current = null
      finishDrag(e.changedTouches[0])
      touchStartPos.current = null
    }

    const onCancel = () => {
      clearTimeout(touchTimerRef.current!)
      touchTimerRef.current = null
      touchDragRef.current = null
      setTouchDragState(null)
      setDragOverTableId(null)
      touchStartPos.current = null
    }

    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onCancel)
    return () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onCancel)
      clearTimeout(touchTimerRef.current!)
    }
  }, [isOpen])

  const handleResItemTouchStart = (resId: string, e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    const drag = { resId, x: touch.clientX, y: touch.clientY }
    touchDragRef.current = drag
    setTouchDragState(drag)
    if ('vibrate' in navigator) navigator.vibrate(10)
  }

  const handleDragStart = (e: React.DragEvent, r: Reservation) => {
    e.dataTransfer.setData('text/plain', r.id)
    e.dataTransfer.effectAllowed = 'move'
    // Small custom drag image instead of the full row
    const ghost = document.createElement('div')
    ghost.style.cssText =
      'position:fixed;top:-100px;background:#4f46e5;color:#fff;' +
      'padding:4px 10px;border-radius:8px;font:600 12px/20px sans-serif;white-space:nowrap'
    ghost.textContent = `${r.time.slice(0, 5)}  ${shortName(r.customer_name)}`
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, 14)
    requestAnimationFrame(() => document.body.removeChild(ghost))
  }

  const handleSave = async () => {
    if (!supabase) return
    setSaving(true)
    const changed = reservations.filter(r => {
      const orig = r.table_ids?.length
        ? r.table_ids
        : r.table_id
          ? [r.table_id]
          : []
      const curr = assignments[r.id]
      if (!curr) return false
      return (
        JSON.stringify([...curr].sort()) !== JSON.stringify([...orig].sort())
      )
    })
    await Promise.all(
      changed.map(r => {
        const newIds = assignments[r.id] ?? []
        const identifiers = newIds
          .map(id => tableMap.get(id)?.table_identifier)
          .filter(Boolean) as string[]
        return supabase!
          .from('reservations')
          .update({
            table_id: newIds[0] ?? null,
            table_ids: newIds,
            table_identifiers: identifiers,
          })
          .eq('id', r.id)
      })
    )
    setSaving(false)
    onSave()
    onClose()
  }

  const hasChanges = reservations.some(r => {
    const orig = r.table_ids?.length
      ? r.table_ids
      : r.table_id
        ? [r.table_id]
        : []
    const curr = assignments[r.id]
    if (!curr) return false
    return JSON.stringify([...curr].sort()) !== JSON.stringify([...orig].sort())
  })

  const sortedReservations = [...reservations].sort((a, b) =>
    a.time.localeCompare(b.time)
  )
  const displayedReservations = focusedTableId
    ? sortedReservations.filter(r =>
        getEffectiveTableIds(r).includes(focusedTableId)
      )
    : sortedReservations
  const totalPages = Math.ceil(displayedReservations.length / itemsPerPage)
  // A shrinking page count can strand listPage past the end
  const safePage = Math.min(listPage, Math.max(0, totalPages - 1))
  const paginatedReservations = isTouch
    ? displayedReservations.slice(
        safePage * itemsPerPage,
        (safePage + 1) * itemsPerPage
      )
    : displayedReservations

  if (!isOpen) return null

  const floor = floors[activeFloorIdx] ?? null
  const locale = language === 'de' ? 'de-DE' : 'en-US'

  return (
    <>
      {/* Floating touch-drag clone */}
      {touchDragState &&
        (() => {
          const res = reservations.find(r => r.id === touchDragState.resId)
          return res ? (
            <div
              style={{
                position: 'fixed',
                left: touchDragState.x - 60,
                top: touchDragState.y - 24,
                zIndex: 9999,
                pointerEvents: 'none',
                background: '#4f46e5',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              }}
            >
              {res.time.slice(0, 5)} · {shortName(res.customer_name)}
            </div>
          ) : null
        })()}

      <ConfirmDialog
        isOpen={!!pendingConfirm}
        title={pendingConfirm?.title ?? ''}
        message={pendingConfirm?.message ?? ''}
        confirmLabel={messages.common.confirm}
        danger={false}
        onConfirm={() => {
          pendingConfirm?.onConfirm()
          setPendingConfirm(null)
        }}
        onCancel={() => setPendingConfirm(null)}
      />

      <div className="fixed inset-0 z-50 flex p-4 backdrop-blur-sm bg-black/60">
        <div className="flex h-full w-full flex-col bg-white">
          {/* Header */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-gray-200 px-4 py-3 lg:px-6 lg:py-4">
            <h3 className="whitespace-nowrap text-base font-semibold text-gray-900 md:text-lg">
              {new Date(date + 'T00:00:00').toLocaleDateString(locale, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            <div className="ml-auto flex items-center gap-3 sm:gap-4">
              <FloorDropdown
                floors={floors}
                activeIdx={activeFloorIdx}
                onChange={setActiveFloorIdx}
              />
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div
            ref={bodyRef}
            className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row"
          >
            {/* Floor plan */}
            <div
              ref={floorContainerRef}
              onClick={() => setFocusedTableId(null)}
              className="flex min-h-0 flex-none items-center justify-center bg-gray-50 p-3 lg:flex-1 lg:p-4"
            >
              {loadingFloors ? (
                <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                  {t.loading}
                </div>
              ) : floors.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                  {t.noFloorPlan}
                </div>
              ) : (
                <div
                  ref={floorPlanInnerRef}
                  style={{
                    width: CANVAS_W * scale,
                    height: CANVAS_H * scale,
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: CANVAS_W,
                      height: CANVAS_H,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                      borderRadius: 12,
                      border: '2px solid #e5e7eb',
                      backgroundImage: [
                        'linear-gradient(to right, #e5e7eb 1px, transparent 1px)',
                        'linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
                      ].join(','),
                      backgroundSize: '10px 10px',
                      backgroundColor: '#f9fafb',
                      overflow: 'hidden',
                    }}
                  >
                    {floor?.obstacles.map(o => (
                      <div
                        key={o.id}
                        style={{
                          position: 'absolute',
                          left: o.x,
                          top: o.y,
                          width: o.w,
                          height: o.h,
                          backgroundColor: o.outlined ? 'transparent' : '#000',
                          border: '2px solid #000',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: o.outlined
                              ? '#000'
                              : 'rgba(255,255,255,0.8)',
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
                    ))}

                    {floor?.layout.map(p => {
                      const db = tableMap.get(p.id)
                      if (!db) return null
                      const tableResCount = sortedReservations.filter(r =>
                        getEffectiveTableIds(r).includes(p.id)
                      ).length
                      const isFocused = focusedTableId === p.id
                      const isDragOver = dragOverTableId === p.id
                      return (
                        <div
                          key={p.id}
                          onClick={e => {
                            e.stopPropagation()
                            setFocusedTableId(p.id)
                          }}
                          onDragOver={e => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            setDragOverTableId(p.id)
                          }}
                          onDragLeave={e => {
                            if (
                              !e.currentTarget.contains(e.relatedTarget as Node)
                            ) {
                              setDragOverTableId(null)
                            }
                          }}
                          onDrop={e => {
                            e.preventDefault()
                            setDragOverTableId(null)
                            const resId = e.dataTransfer.getData('text/plain')
                            if (resId) handleDrop(p.id, resId)
                          }}
                          style={{
                            position: 'absolute',
                            left: p.x,
                            top: p.y,
                            width: p.w,
                            height: p.h,
                            backgroundColor: p.color,
                            borderRadius: p.shape === 'round' ? '50%' : 4,
                            border: isDragOver
                              ? '3px solid #2563eb'
                              : isFocused
                                ? '3px solid #f59e0b'
                                : tableResCount > 0
                                  ? '2px solid rgba(255,255,255,0.5)'
                                  : '2px solid rgba(0,0,0,0.15)',
                            boxShadow: isDragOver
                              ? '0 0 0 4px rgba(37,99,235,0.3), 2px 3px 8px rgba(0,0,0,0.12)'
                              : isFocused
                                ? '0 0 0 4px rgba(245,158,11,0.3), 2px 3px 8px rgba(0,0,0,0.12)'
                                : '2px 3px 8px rgba(0,0,0,0.10)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            transition: 'box-shadow 0.1s, border-color 0.1s',
                            userSelect: 'none',
                            zIndex: isFocused || isDragOver ? 3 : 1,
                            opacity: tableResCount > 0 ? 1 : 0.75,
                          }}
                        >
                          {tableResCount > 0 && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 3,
                                right: 3,
                                minWidth: 18,
                                height: 18,
                                borderRadius: 9,
                                backgroundColor: '#1d4ed8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                                pointerEvents: 'none',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: '#fff',
                                  pointerEvents: 'none',
                                }}
                              >
                                {tableResCount}
                              </span>
                            </div>
                          )}
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#fff',
                              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                              textAlign: 'center',
                              lineHeight: 1.2,
                              pointerEvents: 'none',
                            }}
                          >
                            {db.table_identifier}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: 'rgba(255,255,255,0.85)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              pointerEvents: 'none',
                            }}
                          >
                            <Users style={{ width: 9, height: 9 }} />
                            {db.capacity}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Reservation list */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-gray-200 lg:w-64 lg:flex-none lg:border-l lg:border-t-0">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2.5">
                {focusedTableId ? (
                  <>
                    <span className="text-sm font-semibold text-amber-700">
                      {tableMap.get(focusedTableId)?.table_identifier ??
                        focusedTableId}
                    </span>
                    <button
                      onClick={() => setFocusedTableId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      {t.showAll}
                    </button>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-gray-700">
                    {t.reservations} ({reservations.length})
                  </span>
                )}
                {isTouch && totalPages > 1 && (
                  <div className="ml-auto flex items-center gap-0.5 pl-2">
                    <button
                      onClick={() => setListPage(Math.max(0, safePage - 1))}
                      disabled={safePage === 0}
                      className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        setListPage(Math.min(totalPages - 1, safePage + 1))
                      }
                      disabled={safePage === totalPages - 1}
                      className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <ul
                ref={listRef}
                className={`min-h-0 flex-1 divide-y divide-gray-100 ${isTouch ? 'overflow-hidden' : 'overflow-y-auto'}`}
              >
                {displayedReservations.length === 0 ? (
                  <li className="flex h-16 items-center justify-center text-sm text-gray-400">
                    {focusedTableId
                      ? t.noReservationsFiltered
                      : t.noReservations}
                  </li>
                ) : (
                  paginatedReservations.map(r => (
                    <li
                      key={r.id}
                      draggable
                      onDragStart={e => handleDragStart(e, r)}
                      onTouchStart={e => handleResItemTouchStart(r.id, e)}
                      className="flex cursor-grab items-start gap-2 px-3 py-2.5 hover:bg-gray-50 active:cursor-grabbing"
                    >
                      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="text-xs font-semibold text-violet-700">
                            {r.time.slice(0, 5)}
                          </span>
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <Users className="h-3 w-3" />
                            {r.party_size}
                          </span>
                        </div>
                        <p className="truncate text-sm font-medium text-gray-800">
                          {shortName(r.customer_name)}
                        </p>
                      </div>
                      {focusedTableId &&
                        getEffectiveTableIds(r).includes(focusedTableId) && (
                          <button
                            onClick={() => {
                              const curr = getEffectiveTableIds(r)
                              setAssignments(prev => ({
                                ...prev,
                                [r.id]: curr.filter(
                                  id => id !== focusedTableId
                                ),
                              }))
                            }}
                            className="ml-auto mt-0.5 shrink-0 rounded-full p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                            title={t.removeFromTable}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-4 py-3 lg:px-6 lg:py-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t.saving}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {t.saveChanges}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
