'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { Reservation } from '@/types/reservation'

export interface DemoTable {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
}

interface DemoContextType {
  reservations: Reservation[]
  tables: DemoTable[]
  addReservation: (
    data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>
  ) => Reservation
  updateReservation: (id: string, data: Partial<Reservation>) => Reservation
  deleteReservation: (id: string) => void
  addTable: (identifier: string, capacity: number) => DemoTable
  updateTable: (id: string, data: Partial<DemoTable>) => void
  deleteTable: (id: string) => void
}

const DEMO_TENANT_ID = 'demo-tenant'

const today = new Date()
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const d0 = fmt(today)
const d1 = fmt(new Date(today.getTime() + 86400000))
const d2 = fmt(new Date(today.getTime() + 2 * 86400000))
const d3 = fmt(new Date(today.getTime() + 3 * 86400000))

const INITIAL_TABLES: DemoTable[] = [
  { id: 'demo-t1', table_identifier: 'A1', capacity: 2, is_active: true },
  { id: 'demo-t2', table_identifier: 'A2', capacity: 4, is_active: true },
  { id: 'demo-t3', table_identifier: 'B1', capacity: 4, is_active: true },
  { id: 'demo-t4', table_identifier: 'B2', capacity: 6, is_active: true },
  { id: 'demo-t5', table_identifier: 'C1', capacity: 2, is_active: true },
  { id: 'demo-t6', table_identifier: 'C2', capacity: 8, is_active: true },
]

const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: 'demo-r1',
    customer_name: 'Alice Johnson',
    customer_phone: '(555) 100-0001',
    table_id: 'demo-t2',
    table_number: null,
    date: d0,
    time: '18:00',
    party_size: 3,
    notes: 'Birthday dinner',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tenant_id: DEMO_TENANT_ID,
    created_by: 'demo',
    tables: { table_identifier: 'A2', capacity: 4 },
  },
  {
    id: 'demo-r2',
    customer_name: 'Bob Martinez',
    customer_phone: '(555) 100-0002',
    table_id: 'demo-t4',
    table_number: null,
    date: d0,
    time: '19:30',
    party_size: 5,
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tenant_id: DEMO_TENANT_ID,
    created_by: 'demo',
    tables: { table_identifier: 'B2', capacity: 6 },
  },
  {
    id: 'demo-r3',
    customer_name: 'Clara Smith',
    customer_phone: '(555) 100-0003',
    table_id: 'demo-t1',
    table_number: null,
    date: d0,
    time: '20:00',
    party_size: 2,
    notes: 'Anniversary',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tenant_id: DEMO_TENANT_ID,
    created_by: 'demo',
    tables: { table_identifier: 'A1', capacity: 2 },
  },
  {
    id: 'demo-r4',
    customer_name: 'David Lee',
    customer_phone: '(555) 100-0004',
    table_id: 'demo-t3',
    table_number: null,
    date: d1,
    time: '12:30',
    party_size: 4,
    notes: 'Business lunch',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tenant_id: DEMO_TENANT_ID,
    created_by: 'demo',
    tables: { table_identifier: 'B1', capacity: 4 },
  },
  {
    id: 'demo-r5',
    customer_name: 'Eva Brown',
    customer_phone: '(555) 100-0005',
    table_id: 'demo-t6',
    table_number: null,
    date: d1,
    time: '19:00',
    party_size: 7,
    notes: 'Family reunion',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tenant_id: DEMO_TENANT_ID,
    created_by: 'demo',
    tables: { table_identifier: 'C2', capacity: 8 },
  },
  {
    id: 'demo-r6',
    customer_name: 'Frank Wilson',
    customer_phone: '(555) 100-0006',
    table_id: 'demo-t2',
    table_number: null,
    date: d2,
    time: '18:30',
    party_size: 2,
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tenant_id: DEMO_TENANT_ID,
    created_by: 'demo',
    tables: { table_identifier: 'A2', capacity: 4 },
  },
  {
    id: 'demo-r7',
    customer_name: 'Grace Kim',
    customer_phone: '(555) 100-0007',
    table_id: 'demo-t5',
    table_number: null,
    date: d3,
    time: '20:30',
    party_size: 1,
    notes: 'Cancelled due to illness',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tenant_id: DEMO_TENANT_ID,
    created_by: 'demo',
    tables: { table_identifier: 'C1', capacity: 2 },
  },
]

const DemoContext = createContext<DemoContextType | undefined>(undefined)

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [reservations, setReservations] =
    useState<Reservation[]>(INITIAL_RESERVATIONS)
  const [tables, setTables] = useState<DemoTable[]>(INITIAL_TABLES)

  const addReservation = useCallback(
    (
      data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>
    ): Reservation => {
      const now = new Date().toISOString()
      const table = tables.find(t => t.id === data.table_id)
      const newRes: Reservation = {
        ...data,
        id: `demo-r${Date.now()}`,
        created_at: now,
        updated_at: now,
        tables: table
          ? {
              table_identifier: table.table_identifier,
              capacity: table.capacity,
            }
          : undefined,
      }
      setReservations(prev =>
        [...prev, newRes].sort(
          (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        )
      )
      return newRes
    },
    [tables]
  )

  const updateReservation = useCallback(
    (id: string, data: Partial<Reservation>): Reservation => {
      let updated!: Reservation
      setReservations(prev =>
        prev.map(r => {
          if (r.id !== id) return r
          const table = data.table_id
            ? tables.find(t => t.id === data.table_id)
            : undefined
          updated = {
            ...r,
            ...data,
            updated_at: new Date().toISOString(),
            tables: table
              ? {
                  table_identifier: table.table_identifier,
                  capacity: table.capacity,
                }
              : r.tables,
          }
          return updated
        })
      )
      return updated
    },
    [tables]
  )

  const deleteReservation = useCallback((id: string) => {
    setReservations(prev => prev.filter(r => r.id !== id))
  }, [])

  const addTable = useCallback(
    (identifier: string, capacity: number): DemoTable => {
      const newTable: DemoTable = {
        id: `demo-t${Date.now()}`,
        table_identifier: identifier,
        capacity,
        is_active: true,
      }
      setTables(prev => [...prev, newTable])
      return newTable
    },
    []
  )

  const updateTable = useCallback((id: string, data: Partial<DemoTable>) => {
    setTables(prev => prev.map(t => (t.id === id ? { ...t, ...data } : t)))
  }, [])

  const deleteTable = useCallback((id: string) => {
    setTables(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <DemoContext.Provider
      value={{
        reservations,
        tables,
        addReservation,
        updateReservation,
        deleteReservation,
        addTable,
        updateTable,
        deleteTable,
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider')
  return ctx
}

export { DEMO_TENANT_ID }
