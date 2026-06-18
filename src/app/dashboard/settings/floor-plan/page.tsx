'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import FloorPlanEditor from '@/components/FloorPlanEditor'
import { useI18n } from '@/contexts/I18nContext'

type Table = {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
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
  const { user, tenantId } = useAuth()
  const { messages } = useI18n()
  const t = messages.setupPage

  const [tables, setTables] = useState<Table[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [floorsLoaded, setFloorsLoaded] = useState(false)

  const [floors, setFloors] = useState<Floor[]>([])

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
        await insertFloor('Ground Floor', 0)
      }
    } catch (err: any) {
      console.error('Error fetching floors:', err?.message ?? err?.code ?? err)
      // Fallback: show one empty floor so the editor is still usable
      setFloors([
        {
          id: `local_${Date.now()}`,
          name: 'Ground Floor',
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

  const handleAddTable = async (identifier: string, capacity: number) => {
    if (!supabase) return
    try {
      setSaving(true)
      setError('')
      const { error } = await supabase.from('tables').insert({
        tenant_id: tenantId,
        table_identifier: identifier,
        capacity,
        is_active: true,
      })
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t.loginRequired}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10 shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link
              href="/dashboard/settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Back to Settings"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">
              Floor Plan Editor
            </h1>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {tenantId && floorsLoaded && floors.length > 0 ? (
            <div className="space-y-10">
              {floors.map(floor => {
                const takenElsewhere = new Set(
                  floors
                    .filter(f => f.id !== floor.id)
                    .flatMap(f => placedByFloor[f.id] ?? [])
                )
                const floorTables = tables.filter(
                  t => !takenElsewhere.has(t.id)
                )
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
                      onAddTable={handleAddTable}
                      onDeleteTable={handleDeleteTable}
                    />
                  </div>
                )
              })}
              <button
                type="button"
                onClick={addFloor}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add floor
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Loading…</p>
          )}
        </div>
      </div>
    </div>
  )
}
