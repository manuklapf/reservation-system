'use client'

import { Trash2 } from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'
import Button from '../Button'
import type { Obstacle } from './types'

interface ObstaclePropertiesBarProps {
  obstacle: Obstacle
  onLabelFocus: () => void
  onLabelChange: (label: string) => void
  onStyleChange: (outlined: boolean) => void
  onRemove: () => void
}

export default function ObstaclePropertiesBar({
  obstacle: selObs,
  onLabelFocus,
  onLabelChange,
  onStyleChange,
  onRemove,
}: ObstaclePropertiesBarProps) {
  const { messages } = useI18n()
  const t = messages.floorPlanEditor

  return (
    <div className="flex items-start gap-4 px-4 py-3 border border-gray-200 rounded-xl bg-white flex-wrap">
      {/* Name */}
      <div className="shrink-0 self-center">
        <p className="text-xs font-semibold text-gray-500 mb-1">{t.label}</p>
        <input
          type="text"
          value={selObs.label}
          placeholder={t.none}
          onFocus={onLabelFocus}
          onChange={e => onLabelChange(e.target.value)}
          maxLength={20}
          className="text-sm font-bold text-gray-800 border-b border-gray-300 bg-transparent outline-none w-24 focus:border-blue-400"
        />
      </div>

      <div className="w-px self-stretch bg-gray-100 shrink-0" />

      {/* Style: filled vs outlined */}
      <div className="shrink-0 self-center">
        <p className="text-xs font-semibold text-gray-500 mb-1">{t.style}</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onStyleChange(false)}
            className={`flex items-center justify-center h-8 w-8 rounded border-2 transition-colors ${
              !selObs.outlined
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            title={t.filled}
          >
            <div
              className="h-5 w-5 rounded-sm"
              style={{ backgroundColor: '#000' }}
            />
          </button>
          <button
            type="button"
            onClick={() => onStyleChange(true)}
            className={`flex items-center justify-center h-8 w-8 rounded border-2 transition-colors ${
              selObs.outlined
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            title={t.outlined}
          >
            <div
              className="h-5 w-5 rounded-sm"
              style={{
                border: '2px solid #000',
                backgroundColor: 'transparent',
              }}
            />
          </button>
        </div>
      </div>

      <div className="w-px self-stretch bg-gray-100 shrink-0" />

      {/* Delete */}
      <div className="flex gap-2 items-center shrink-0 self-center ml-auto">
        <Button variant="danger" size="sm" onClick={onRemove}>
          <Trash2 className="h-3 w-3" /> {t.remove}
        </Button>
      </div>
    </div>
  )
}
