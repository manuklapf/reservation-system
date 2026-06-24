'use client'

import { UtensilsCrossed } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'

interface Table {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
}

interface StepTableProps {
  title: string
  tables: Table[]
  value: string
  onChange: (tableId: string) => void
  loading?: boolean
  noTablesMessage?: string
  seatsLabel?: string
}

export default function StepTable({
  title,
  tables,
  value,
  onChange,
  loading,
  noTablesMessage,
  seatsLabel = 'seats',
}: StepTableProps) {
  const { messages } = useI18n()
  const st = messages.stepTable
  return (
    <div className="min-w-full">
      <p className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700 mb-3">
        <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
        {title}
      </p>

      {loading ? (
        <div className="text-center py-4 text-sm text-gray-400">
          {st.loading}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-4 text-sm text-gray-400">
          {noTablesMessage ?? st.noTablesAvailable}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {tables.map(table => (
            <button
              key={table.id}
              type="button"
              onClick={() => onChange(table.id)}
              className={`flex flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors ${
                value === table.id
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              <span className="text-base font-bold">
                {table.table_identifier}
              </span>
              <span className="text-xs font-normal text-gray-400 mt-0.5">
                {table.capacity} {seatsLabel}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
