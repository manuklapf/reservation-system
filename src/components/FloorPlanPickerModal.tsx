'use client'

import { useState, useEffect } from 'react'
import { X, Check, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
const SCALE = 0.72

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

  // Reset draft and tab when opening
  useEffect(() => {
    if (isOpen) {
      setDraft([...selectedIds])
      setActiveIdx(0)
    }
  }, [isOpen, selectedIds])

  // Load floor plans (localStorage → DB fallback)
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
              // ignore
            }
            try {
              const ls = localStorage.getItem(
                `floorplan_obs_v1_${tenantId}_${row.id}`
              )
              if (ls) obstacles = JSON.parse(ls)
            } catch {
              // ignore
            }
            return { id: row.id, name: row.name, layout, obstacles }
          })
        )
      })
  }, [isOpen, tenantId])

  const toggleTable = (tableId: string) => {
    if (!availableTableIds.has(tableId)) return
    setDraft(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    )
  }

  const tableMap = new Map(allTables.map(t => [t.id, t]))

  const selectedNames = draft
    .map(id => tableMap.get(id)?.table_identifier)
    .filter(Boolean)
    .join(', ')

  if (!isOpen) return null

  const floor = floors[activeIdx] ?? null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-3xl max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Select Table(s)
            </h3>
            <p className="mt-0.5 text-sm text-gray-400">
              {draft.length === 0
                ? 'Tap tables to select'
                : `Selected: ${selectedNames}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Floor tabs */}
        {floors.length > 1 && (
          <div className="flex shrink-0 gap-1.5 px-4 pt-3">
            {floors.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  i === activeIdx
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}

        {/* Canvas area */}
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
          {loadingFloors ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              Loading floor plans…
            </div>
          ) : floors.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              No floor plans configured. Set them up in Settings → Floor Plan.
            </div>
          ) : (
            // Wrapper sized to the scaled canvas so the flex container collapses correctly
            <div
              style={{
                width: CANVAS_W * SCALE,
                height: CANVAS_H * SCALE,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {/* Inner canvas at native size, then scaled down */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: CANVAS_W,
                  height: CANVAS_H,
                  transform: `scale(${SCALE})`,
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
                          : `${db.table_identifier} (unavailable)`
                      }
                      style={{
                        position: 'absolute',
                        left: p.x,
                        top: p.y,
                        width: p.w,
                        height: p.h,
                        backgroundColor: isAvailable ? p.color : '#d1d5db',
                        borderRadius: p.shape === 'round' ? '50%' : 4,
                        border: isSelected
                          ? '3px solid #059669'
                          : isAvailable
                            ? '2px solid rgba(0,0,0,0.15)'
                            : '2px solid #9ca3af',
                        boxShadow: isSelected
                          ? '0 0 0 4px rgba(5,150,105,0.3), 2px 3px 8px rgba(0,0,0,0.12)'
                          : '2px 3px 8px rgba(0,0,0,0.10)',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        opacity: isAvailable ? 1 : 0.45,
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
                            backgroundColor: '#059669',
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

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#4ecdc4]" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-gray-300 opacity-50" />
              Unavailable
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border-2 border-emerald-600 bg-[#4ecdc4]" />
              Selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(draft)
                onClose()
              }}
              disabled={draft.length === 0}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Confirm{draft.length > 0 ? ` (${draft.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
