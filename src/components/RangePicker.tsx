'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from '@/components/icons'

interface RangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  locale: string
}

export default function RangePicker({
  from,
  to,
  onChange,
  locale,
}: RangePickerProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [hovered, setHovered] = useState<string | null>(null)

  const toISO = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else setViewMonth(m => m + 1)
  }

  const firstDay = new Date(viewYear, viewMonth, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(viewYear, viewMonth, i + 1)
    ),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const handleClick = (iso: string) => {
    if (!from || (from && to)) {
      onChange(iso, '')
    } else {
      if (iso === from) onChange('', '')
      else if (iso < from) onChange(iso, from)
      else onChange(from, iso)
    }
  }

  const inRange = (iso: string) => {
    const end = to || hovered || ''
    if (!from || !end) return false
    const lo = from < end ? from : end
    const hi = from < end ? end : from
    return iso > lo && iso < hi
  }

  const dayNames = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, i + 1).toLocaleDateString(locale, { weekday: 'short' })
  )

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded p-1 hover:bg-gray-100">
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {firstDay.toLocaleDateString(locale, {
            month: 'long',
            year: 'numeric',
          })}
        </span>
        <button onClick={nextMonth} className="rounded p-1 hover:bg-gray-100">
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center">
        {dayNames.map(d => (
          <div key={d} className="text-[10px] font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />
          const iso = toISO(date)
          const isFrom = iso === from
          const isTo = iso === to
          const isEndpoint = isFrom || isTo
          const isIn = inRange(iso)
          return (
            <button
              key={iso}
              onClick={() => handleClick(iso)}
              onMouseEnter={() => setHovered(iso)}
              onMouseLeave={() => setHovered(null)}
              className={[
                'h-8 w-full text-xs transition-colors',
                isEndpoint
                  ? 'rounded-full bg-blue-600 font-semibold text-white'
                  : isIn
                    ? 'bg-blue-100 text-blue-800'
                    : 'rounded-full hover:bg-gray-100 text-gray-700',
              ].join(' ')}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
