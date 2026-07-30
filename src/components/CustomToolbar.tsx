import React, { useCallback } from 'react'
import { Views, View } from 'react-big-calendar'
import { dateFnsLocalizer } from 'react-big-calendar'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useI18n } from '@/contexts/I18nContext'

const localizer = dateFnsLocalizer({
  format,
  parse: (str: string) => new Date(str),
  startOfWeek: () => new Date(),
  getDay: (date: Date) => date.getDay(),
  locales: { 'en-US': enUS },
})

interface CustomToolbarProps {
  view: View
  date: Date
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onViewChange: (view: View) => void
}

export function CustomToolbar({
  view,
  date,
  onNavigate,
  onViewChange,
}: CustomToolbarProps) {
  const { messages } = useI18n()
  const common = messages.common

  const ViewButton = useCallback(
    ({ targetView, label }: { targetView: View; label: string }) => (
      <button
        onClick={() => onViewChange(targetView)}
        className={`px-3 py-1 rounded text-sm font-medium ${
          view === targetView
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 hover:bg-gray-100 hover:text-gray-800 text-gray-700'
        }`}
      >
        {label}
      </button>
    ),
    [view, onViewChange]
  )

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
      {/* Navigation */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onNavigate('PREV')}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-100 rounded text-sm font-medium"
          aria-label={common.previous}
        >
          ←
        </button>
        <button
          onClick={() => onNavigate('TODAY')}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
        >
          {common.today}
        </button>
        <button
          onClick={() => onNavigate('NEXT')}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-100 rounded text-sm font-medium"
          aria-label={common.next}
        >
          →
        </button>
        <span className="text-lg font-semibold text-gray-900">
          {localizer.format(date, 'MMMM yyyy', 'en-US')}
        </span>
      </div>

      {/* View switcher */}
      <div className="flex space-x-2">
        <ViewButton targetView={Views.MONTH} label={common.month} />
        <ViewButton targetView={Views.WEEK} label={common.week} />
        <ViewButton targetView={Views.DAY} label={common.day} />
      </div>
    </div>
  )
}
