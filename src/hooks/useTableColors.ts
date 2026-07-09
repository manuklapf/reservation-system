'use client'

import { useState } from 'react'
import { TABLE_COLORS } from '@/components/floor-plan/constants'
import type { DBTable } from '@/components/floor-plan/types'
import { updateTableColor } from '@/lib/tableColorService'

/** Resolves display colors for tables (override > stored > index-based default) and persists edits. */
export function useTableColors(allTables: DBTable[]) {
  const [overrides, setOverrides] = useState<Map<string, string>>(new Map())

  const getTableColor = (table: DBTable): string => {
    const overrideColor = overrides.get(table.id)
    if (overrideColor) return overrideColor
    if (table.color) return table.color
    // A just-created table may not be in allTables yet (indexOf === -1), so use its eventual position instead.
    const idx = allTables.indexOf(table)
    const pos = idx >= 0 ? idx : allTables.length
    return TABLE_COLORS[pos % TABLE_COLORS.length]
  }

  const saveTableColor = async (tableId: string, color: string) => {
    const ok = await updateTableColor(tableId, color)
    if (ok) setOverrides(prev => new Map(prev).set(tableId, color))
  }

  return { getTableColor, saveTableColor }
}
