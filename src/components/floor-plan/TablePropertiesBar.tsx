'use client'

import { Trash2 } from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'
import Button from '../Button'
import { TABLE_COLORS } from './constants'
import type { PlacedTable } from './types'

interface TablePropertiesBarProps {
  placedTable: PlacedTable
  onShapeChange: (shape: PlacedTable['shape']) => void
  onColorChange: (color: string) => void
  onDelete: () => void
}

export default function TablePropertiesBar({
  placedTable: sel,
  onShapeChange,
  onColorChange,
  onDelete,
}: TablePropertiesBarProps) {
  const { messages } = useI18n()
  const t = messages.floorPlanEditor

  return (
    <div className="flex items-start gap-4 px-4 py-3 border border-gray-200 rounded-xl bg-white flex-wrap">
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
                  ? 'border-accent-strong bg-accent-soft'
                  : 'border-gray-200 hover:border-accent-strong/50'
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

      {/* Delete */}
      <div className="flex gap-2 items-center shrink-0 self-center ml-auto">
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Trash2 className="h-3 w-3" /> {t.deleteTable}
        </Button>
      </div>
    </div>
  )
}
