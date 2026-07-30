'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Info } from '@/components/icons'
import Button from '@/components/Button'
import FloorPlanEditor from '@/components/FloorPlanEditor'
import NavBar from '@/components/NavBar'
import { useI18n } from '@/contexts/I18nContext'

type Table = {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
  floor_id: string | null
}

type PlacedTable = {
  id: string
  x: number
  y: number
  w: number
  h: number
  shape: 'square' | 'round'
  color: string
}
type Obstacle = {
  id: string
  type: 'block'
  label: string
  x: number
  y: number
  w: number
  h: number
  outlined: boolean
}

type Floor = {
  id: string
  name: string
  sort_order: number
  layout: PlacedTable[]
  obstacles: Obstacle[]
}

export default function FloorPlanPage() {
  const router = useRouter()
  const { user, tenantId, isAdmin } = useAuth()
  const { messages } = useI18n()
  const t = messages.setupPage
  const fps = messages.floorPlanSettings

  const [tables, setTables] = useState<Table[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [floorsLoaded, setFloorsLoaded] = useState(false)
  const [activeTableIds, setActiveTableIds] = useState<Set<string>>(new Set())

  const [floors, setFloors] = useState<Floor[]>([])
  const [capacityPopoverOpen, setCapacityPopoverOpen] = useState(false)
  const capacityPopoverRef = useRef<HTMLDivElement>(null)

  // Load floors from database
  const fetchFloors = useCallback(async () => {
    if (!supabase || !tenantId) return
    try {
      const { data, error } = await supabase
        .from('floor_plans')
        .select('id, name, sort_order, layout, obstacles')
        .eq('tenant_id', tenantId)
        .order('sort_order')
      if (error) throw error
      if (data && data.length > 0) {
        setFloors(
          data.map(row => ({
            id: row.id,
            name: row.name,
            sort_order: row.sort_order,
            layout: (row.layout as PlacedTable[]) ?? [],
            obstacles: (row.obstacles as Obstacle[]) ?? [],
          }))
        )
      } else {
        // No floors in DB yet — create a default one
        await insertFloor(fps.groundFloor, 0)
      }
    } catch (err: any) {
      console.error('Error fetching floors:', err?.message ?? err?.code ?? err)
      // Fallback: show one empty floor so the editor is still usable
      setFloors([
        {
          id: `local_${Date.now()}`,
          name: fps.groundFloor,
          sort_order: 0,
          layout: [],
          obstacles: [],
        },
      ])
    } finally {
      setFloorsLoaded(true)
    }
  }, [tenantId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && tenantId) fetchFloors()
  }, [user, tenantId, fetchFloors])

  // Insert a new floor into the DB and add it to state
  const insertFloor = async (name: string, sort_order: number) => {
    if (!supabase || !tenantId) return
    const { data, error } = await supabase
      .from('floor_plans')
      .insert({
        tenant_id: tenantId,
        name,
        sort_order,
        layout: [],
        obstacles: [],
      })
      .select('id, name, sort_order, layout, obstacles')
      .single()
    if (error) throw error
    if (data) {
      setFloors(prev => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          sort_order: data.sort_order,
          layout: [],
          obstacles: [],
        },
      ])
    }
  }

  const addFloor = async () => {
    try {
      const nextOrder = floors.length
      await insertFloor(`Floor ${floors.length + 1}`, nextOrder)
    } catch (err) {
      console.error('Error adding floor:', err)
    }
  }

  const renameFloor = async (id: string, name: string) => {
    setFloors(prev => prev.map(f => (f.id === id ? { ...f, name } : f)))
    if (!supabase) return
    const { error } = await supabase
      .from('floor_plans')
      .update({ name })
      .eq('id', id)
    if (error) console.error('Error renaming floor:', error.message)
  }

  const deleteFloor = async (id: string) => {
    setFloors(prev => prev.filter(f => f.id !== id))
    if (!supabase) return
    const { error } = await supabase.from('floor_plans').delete().eq('id', id)
    if (error) console.error('Error deleting floor:', error.message)
  }

  // Save layout + obstacles back to DB (called by FloorPlanEditor via debounced callback)
  const handleLayoutChange = useCallback(
    async (floorId: string, layout: PlacedTable[], obstacles: Obstacle[]) => {
      if (!supabase) return
      // Optimistically update local state so placedByFloor stays in sync
      setFloors(prev =>
        prev.map(f => (f.id === floorId ? { ...f, layout, obstacles } : f))
      )
      const { error } = await supabase
        .from('floor_plans')
        .update({ layout, obstacles })
        .eq('id', floorId)
      if (error) console.error('Error saving floor layout:', error.message)
    },
    []
  )

  // Track which table IDs are placed on each floor
  const [placedByFloor, setPlacedByFloor] = useState<Record<string, string[]>>(
    {}
  )

  const handlePlacedIdsChange = (floorId: string, ids: string[]) =>
    setPlacedByFloor(prev => ({ ...prev, [floorId]: ids }))

  const fetchTables = useCallback(async () => {
    if (!supabase || !tenantId) return
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('table_identifier')
      if (error) throw error
      setTables(data || [])
    } catch (err: any) {
      console.error('Error fetching tables:', err)
    }
  }, [tenantId])

  useEffect(() => {
    if (user && tenantId) fetchTables()
  }, [user, tenantId, fetchTables])

  // Fetch today's reservations and compute which tables are currently occupied
  const fetchActiveTableIds = useCallback(async () => {
    if (!supabase || !tenantId) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
      const { data } = await supabase
        .from('reservations')
        .select('table_ids, time, end_time')
        .eq('tenant_id', tenantId)
        .eq('date', today)
        .not('end_time', 'is', null)
      if (!data) return
      const ids = new Set<string>()
      for (const r of data) {
        if (!r.end_time) continue
        const [sh, sm] = r.time.split(':').map(Number)
        const [eh, em] = r.end_time.split(':').map(Number)
        const startMin = sh * 60 + sm
        const endMin = eh * 60 + em
        if (nowMinutes >= startMin && nowMinutes < endMin) {
          ;(r.table_ids ?? []).forEach((id: string) => ids.add(id))
        }
      }
      setActiveTableIds(ids)
    } catch (err) {
      console.error('Error fetching active reservations:', err)
    }
  }, [tenantId])

  useEffect(() => {
    if (user && tenantId) {
      fetchActiveTableIds()
      const interval = setInterval(fetchActiveTableIds, 60_000)
      return () => clearInterval(interval)
    }
  }, [user, tenantId, fetchActiveTableIds])

  const handleAddTable = async (
    identifier: string,
    capacity: number,
    floorId: string
  ) => {
    if (!supabase) return
    try {
      setSaving(true)
      setError('')
      const { data, error } = await supabase
        .from('tables')
        .insert({
          tenant_id: tenantId,
          table_identifier: identifier,
          capacity,
          is_active: true,
          floor_id: floorId,
        })
        .select('id, table_identifier, capacity, is_active, floor_id')
        .single()
      if (error) throw error
      await fetchTables()
      return data as Table
    } catch (err: any) {
      setError(
        err.message?.includes('duplicate')
          ? t.errors.duplicateIdentifier
          : t.errors.failedAdd
      )
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTable = async (
    id: string,
    identifier: string,
    capacity: number
  ) => {
    if (!supabase) return
    try {
      setSaving(true)
      setError('')
      const { error } = await supabase
        .from('tables')
        .update({ table_identifier: identifier, capacity })
        .eq('id', id)
      if (error) throw error
      await fetchTables()
    } catch (err: any) {
      setError(
        err.message?.includes('duplicate')
          ? t.errors.duplicateIdentifier
          : t.errors.failedAdd
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTable = async (id: string) => {
    if (!supabase) return
    try {
      setSaving(true)
      setError('')
      const { error } = await supabase.from('tables').delete().eq('id', id)
      if (error) throw error
      await fetchTables()
    } catch {
      setError(t.errors.failedDelete)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!capacityPopoverOpen) return
    const handler = (e: MouseEvent) => {
      if (
        capacityPopoverRef.current &&
        !capacityPopoverRef.current.contains(e.target as Node)
      ) {
        setCapacityPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [capacityPopoverOpen])

  const capacityByFloor = floors.reduce<Record<string, number>>(
    (acc, floor) => {
      const ids = placedByFloor[floor.id] ?? []
      acc[floor.id] = ids.reduce((sum, id) => {
        const table = tables.find(t => t.id === id)
        return sum + (table?.capacity ?? 0)
      }, 0)
      return acc
    },
    {}
  )
  const totalCapacity = Object.values(capacityByFloor).reduce(
    (a, b) => a + b,
    0
  )

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t.loginRequired}</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t.accessDenied}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <NavBar
        className="shrink-0"
        left={
          <Button
            onClick={() => router.push('/dashboard/settings')}
            aria-label={fps.backToSettings}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        center={
          <h1 className="text-xl font-semibold text-gray-900">{fps.title}</h1>
        }
        right={<div className="w-9" />}
      />

      <div className="flex-1 overflow-auto bg-background/40">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Total capacity header */}
          <div className="mb-8 flex gap-2 p-4 bg-white rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700">
              {fps.totalCapacity}:
            </span>
            <span className="text-sm font-bold text-gray-900">
              {totalCapacity}
            </span>
            <div className="relative" ref={capacityPopoverRef}>
              <button
                type="button"
                onClick={() => setCapacityPopoverOpen(v => !v)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Capacity per floor"
              >
                <Info className="h-4 w-4" />
              </button>
              {capacityPopoverOpen && floors.length > 0 && (
                <div className="absolute left-0 top-6 z-30 min-w-[180px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                  {floors.map(floor => (
                    <div
                      key={floor.id}
                      className="flex items-center justify-between gap-6 py-1"
                    >
                      <span className="text-sm text-gray-600">
                        {floor.name}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {capacityByFloor[floor.id] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {tenantId && floorsLoaded && floors.length > 0 ? (
            <div className="space-y-10">
              {floors.map(floor => {
                // Tables belong to a floor and only appear in that floor's list
                const floorTables = tables.filter(t => t.floor_id === floor.id)
                return (
                  <div key={floor.id}>
                    <FloorPlanEditor
                      tenantId={tenantId}
                      floorId={floor.id}
                      floorName={floor.name}
                      onRenameFloor={name => renameFloor(floor.id, name)}
                      onDeleteFloor={
                        floors.length > 1
                          ? () => deleteFloor(floor.id)
                          : undefined
                      }
                      onPlacedIdsChange={ids =>
                        handlePlacedIdsChange(floor.id, ids)
                      }
                      initialLayout={floor.layout}
                      initialObstacles={floor.obstacles}
                      onLayoutChange={(layout, obstacles) =>
                        handleLayoutChange(floor.id, layout, obstacles)
                      }
                      tables={floorTables}
                      allTables={tables}
                      saving={saving}
                      addError={error || undefined}
                      onAddTable={(identifier, capacity) =>
                        handleAddTable(identifier, capacity, floor.id)
                      }
                      onUpdateTable={handleUpdateTable}
                      onDeleteTable={handleDeleteTable}
                      activeTableIds={activeTableIds}
                    />
                  </div>
                )
              })}
              <button
                type="button"
                onClick={addFloor}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-gray-900 hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                {fps.addFloor}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">{fps.loading}</p>
          )}
        </div>
      </div>
    </div>
  )
}
