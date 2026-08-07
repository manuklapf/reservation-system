'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Check, CircleHelp, Users } from '@/components/icons'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/contexts/I18nContext'
import FloorDropdown from './FloorDropdown'
import Button from '@/components/Button'

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

interface Props {
  isOpen: boolean
  onClose: () => void
  tenantId: string
  /** IDs of tables that are free at the selected date/time */
  availableTableIds: Set<string>
  /** All known tables (for label/capacity lookup) */
  allTables: DBTable[]
  /** Currently selected table IDs (pre-fill) */
  selectedIds: string[]
  onConfirm: (ids: string[]) => void
}

const CANVAS_W = 832
const CANVAS_H = 480

export default function FloorPlanPickerModal({
  isOpen,
  onClose,
  tenantId,
  availableTableIds,
  allTables,
  selectedIds,
  onConfirm,
}: Props) {
  const [floors, setFloors] = useState<FloorPlan[]>([])
  const [loadingFloors, setLoadingFloors] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [draft, setDraft] = useState<string[]>([])
  const [scale, setScale] = useState(0.72)
  const [showHelp, setShowHelp] = useState(false)
  const { messages } = useI18n()
  const t = messages.floorPlanPickerModal

  useEffect(() => {
    if (isOpen) {
      setDraft([...selectedIds])
      setActiveIdx(0)
    }
  }, [isOpen, selectedIds])

  // Compute scale from viewport to avoid ResizeObserver feedback loops
  useEffect(() => {
    if (!isOpen) return
    const measure = () => {
      // The card is `w-full max-w-4xl` inside the backdrop's p-1 (4px a side),
      // and its canvas area is unpadded — so the canvas gets the whole card box.
      const availW = Math.min(window.innerWidth - 8, 896)
      // 120 ≈ top bar + footer: each is a ~38px button plus its vertical padding
      // and 1px divider, with a little slack for the Brutalist theme's thicker
      // button borders. The card itself is capped at 90vh.
      const availH = window.innerHeight * 0.9 - 120
      // No upper bound on the scale: fill whichever axis runs out first.
      const s = Math.min(availW / CANVAS_W, availH / CANVAS_H)
      setScale(Math.max(s, 0.15))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isOpen])

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
        if (!data || data.length === 0) return
        setFloors(
          data.map(row => {
            let layout: PlacedTable[] = (row.layout as PlacedTable[]) ?? []
            let obstacles: Obstacle[] = (row.obstacles as Obstacle[]) ?? []
            try {
              const ls = localStorage.getItem(
                `floorplan_v1_${tenantId}_${row.id}`
              )
              if (ls) layout = JSON.parse(ls)
            } catch {
              /* ignore */
            }
            try {
              const ls = localStorage.getItem(
                `floorplan_obs_v1_${tenantId}_${row.id}`
              )
              if (ls) obstacles = JSON.parse(ls)
            } catch {
              /* ignore */
            }
            return { id: row.id, name: row.name, layout, obstacles }
          })
        )
      })
  }, [isOpen, tenantId])

  const toggleTable = (tableId: string) => {
    setDraft(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    )
  }

  const tableMap = new Map(allTables.map(t => [t.id, t]))
  const colorMap = new Map(
    floors.flatMap(f => f.layout.map(p => [p.id, p.color]))
  )

  if (!isOpen) return null

  const floor = floors[activeIdx] ?? null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-1 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl">
        {/* Top bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 py-2 px-3">
          <Button onClick={onClose} aria-label={messages.common.close}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <FloorDropdown
            floors={floors}
            activeIdx={activeIdx}
            onChange={setActiveIdx}
          />
          <div className="flex-1" />
          <Button
            onClick={() => {
              onConfirm(draft)
              onClose()
            }}
            disabled={draft.length === 0}
            className="!bg-success disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-5 w-5" />
          </Button>
        </div>

        {/* Canvas */}
        <div className="flex flex-col items-center overflow-hidden">
          {loadingFloors ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              {t.loadingFloorPlans}
            </div>
          ) : floors.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              {t.noFloorPlans}
            </div>
          ) : (
            <div
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
                  backgroundImage: [
                    'linear-gradient(to right, #e5e7eb 1px, transparent 1px)',
                    'linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
                  ].join(','),
                  backgroundSize: '10px 10px',
                  backgroundColor: '#f9fafb',
                  overflow: 'hidden',
                }}
              >
                {/* Obstacles */}
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
                        color: o.outlined ? '#000' : 'rgba(255,255,255,0.8)',
                        textAlign: 'center',
                        maxWidth: '90%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {o.label}
                    </span>
                  </div>
                ))}

                {/* Placed tables */}
                {floor?.layout.map(p => {
                  const db = tableMap.get(p.id)
                  if (!db) return null
                  const isAvailable = availableTableIds.has(p.id)
                  const isSelected = draft.includes(p.id)
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleTable(p.id)}
                      title={
                        isAvailable
                          ? db.table_identifier
                          : `${db.table_identifier} ${t.unavailable}`
                      }
                      style={{
                        position: 'absolute',
                        left: p.x,
                        top: p.y,
                        width: p.w,
                        height: p.h,
                        backgroundColor: p.color,
                        backgroundImage: !isAvailable
                          ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)'
                          : 'none',
                        borderRadius: p.shape === 'round' ? '50%' : 4,
                        border: isSelected
                          ? '3px solid #000'
                          : '2px solid rgba(0,0,0,0.15)',
                        boxShadow: isSelected
                          ? '0 0 0 4px rgba(0,0,0,0.3), 2px 3px 8px rgba(0,0,0,0.12)'
                          : '2px 3px 8px rgba(0,0,0,0.10)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        transition: 'box-shadow 0.1s, border-color 0.1s',
                        userSelect: 'none',
                        zIndex: isSelected ? 2 : 1,
                      }}
                    >
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check
                            style={{ width: 10, height: 10, color: '#fff' }}
                          />
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

        {/* Footer — selected tables + help */}
        <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 px-4 py-2.5">
          {/* py-1/-my-1: the scroll container clips on both axes, so the chips
              need inner room for their ring without making the footer taller. */}
          <div className="-my-1 flex flex-1 items-center gap-1.5 overflow-x-auto px-1 py-2">
            {draft.length === 0 ? (
              <span className="text-sm text-gray-400">
                {t.tapTablesToSelect}
              </span>
            ) : (
              draft.map(id => {
                const db = tableMap.get(id)
                if (!db) return null
                return (
                  <span
                    key={id}
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-2 ring-black text-white"
                    style={{ backgroundColor: colorMap.get(id) ?? '#4ecdc4' }}
                  >
                    {db.table_identifier}
                  </span>
                )
              })
            )}
          </div>
          <Button
            onClick={() => setShowHelp(true)}
            aria-label={t.help}
            title={t.help}
            className="shrink-0"
          >
            <CircleHelp className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Help — legend + how to use this picker */}
      {showHelp && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-80 space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-gray-900">
              {t.helpTitle}
            </p>
            <p className="text-sm leading-relaxed text-gray-500">
              {t.helpDescription}
            </p>
            <div className="space-y-2 rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {t.helpLegendTitle}
              </p>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm bg-[#4ecdc4]" />
                {t.available}
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span
                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm bg-[#4ecdc4]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, transparent, transparent 1.5px, #000 1.5px, #000 3px)',
                  }}
                />
                {t.reserved}
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border-2 border-black bg-[#4ecdc4]" />
                {t.selected}
              </span>
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={() => setShowHelp(false)}>
                {messages.common.close}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
