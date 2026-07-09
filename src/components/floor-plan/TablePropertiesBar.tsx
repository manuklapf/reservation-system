'use client'

import { useI18n } from '@/contexts/I18nContext'
import { TABLE_COLORS } from './constants'
import type { DBTable, PlacedTable } from './types'

interface TablePropertiesBarProps {
  placedTable: PlacedTable
  dbTable: DBTable
  onShapeChange: (shape: PlacedTable['shape']) => void
  onColorChange: (color: string) => void
  onRemoveFromPlan: () => void
}

export default function TablePropertiesBar({
  placedTable: sel,
  dbTable: selDb,
  onShapeChange,
  onColorChange,
  onRemoveFromPlan,
}: TablePropertiesBarProps) {
  const { messages } = useI18n()
  const t = messages.floorPlanEditor

  return (
    <div className="flex items-start gap-4 px-4 py-3 border border-gray-200 rounded-xl bg-white flex-wrap">
      {/* Name + seats */}
      <div className="shrink-0 self-center">
        <p className="text-xs font-bold text-gray-800">
          {selDb.table_identifier}
        </p>
        <p className="text-xs text-gray-400">
          {selDb.capacity} {t.seatsLabel}
        </p>
      </div>

      <div className="w-px self-stretch bg-gray-100 shrink-0" />

      {/* Shape */}
      <div className="shrink-0">
        <p className="text-xs font-semibold text-gray-500 mb-1">
          {t.shapeLabel}
        </p>
        <div className="flex gap-1.5">
          {(['square', 'round'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onShapeChange(s)}
              title={s.charAt(0).toUpperCase() + s.slice(1)}
              className={`flex items-center justify-center h-8 w-8 rounded border-2 transition-colors ${
                sel.shape === s
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div
                className="h-5 w-5 not-square"
                style={{
                  backgroundColor: sel.color,
                  borderRadius: s === 'round' ? '50%' : '0',
                  border: '1.5px solid rgba(0,0,0,0.2)',
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="w-px self-stretch bg-gray-100 shrink-0" />

      {/* Color */}
      <div className="shrink-0">
        <p className="text-xs font-semibold text-gray-500 mb-1">
          {t.colorLabel}
        </p>
        <div className="flex gap-1 flex-wrap" style={{ maxWidth: 148 }}>
          {TABLE_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              className="h-5 w-5 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: sel.color === c ? '#1d4ed8' : 'rgba(0,0,0,0.12)',
                transform: sel.color === c ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      <div className="w-px self-stretch bg-gray-100 shrink-0" />

      {/* Actions */}
      <div className="flex gap-2 items-center shrink-0 self-center ml-auto">
        <button
          type="button"
          onClick={onRemoveFromPlan}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {t.remove}
        </button>
      </div>
    </div>
  )
}
