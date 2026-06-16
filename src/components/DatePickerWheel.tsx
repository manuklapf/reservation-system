'use client'

import React, { useState, useEffect, useRef } from 'react'
import Picker from 'react-mobile-picker'
import { useI18n } from '@/contexts/I18nContext'

const MONTHS: Record<string, string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  de: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
}

function calcDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function parseDateString(s: string): {
  day: string
  month: string
  year: string
} {
  const fallbackYear = new Date().getFullYear()
  const [y, m, d] = (s || `${fallbackYear}-01-01`).split('-')
  return {
    day: String(parseInt(d, 10)),
    month: String(parseInt(m, 10) - 1), // 0-indexed
    year: y,
  }
}

interface DatePickerWheelProps {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
  transparentBackground?: boolean
}

export default function DatePickerWheel({
  value,
  onChange,
  transparentBackground = false,
}: DatePickerWheelProps) {
  const { language } = useI18n()
  const months = MONTHS[language] ?? MONTHS.en

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear + i))

  const [pv, setPv] = useState(() => parseDateString(value))

  useEffect(() => {
    setPv(parseDateString(value))
  }, [value])

  const maxDay = calcDaysInMonth(parseInt(pv.year, 10), parseInt(pv.month, 10))
  const days = Array.from({ length: maxDay }, (_, i) => String(i + 1))

  const handleChange = (next: typeof pv) => {
    const max = calcDaysInMonth(
      parseInt(next.year, 10),
      parseInt(next.month, 10)
    )
    const clampedDay = Math.min(parseInt(next.day, 10), max)
    const clamped = { ...next, day: String(clampedDay) }
    setPv(clamped)
    const mm = String(parseInt(clamped.month, 10) + 1).padStart(2, '0')
    const dd = String(parseInt(clamped.day, 10)).padStart(2, '0')
    onChange(`${clamped.year}-${mm}-${dd}`)
  }

  // ── Desktop wheel support ──────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const hoveredColRef = useRef<'day' | 'month' | 'year' | null>(null)
  const pvRef = useRef(pv)
  const handleChangeRef = useRef(handleChange)
  const accumRef = useRef(0)
  useEffect(() => {
    pvRef.current = pv
  }, [pv])
  useEffect(() => {
    handleChangeRef.current = handleChange
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onMouseMove = (e: MouseEvent) => {
      const { left, width } = el.getBoundingClientRect()
      const frac = (e.clientX - left) / width
      if (frac < 1 / 3) hoveredColRef.current = 'day'
      else if (frac < 2 / 3) hoveredColRef.current = 'month'
      else hoveredColRef.current = 'year'
    }
    const onMouseLeave = () => {
      hoveredColRef.current = null
      accumRef.current = 0
    }
    const onWheel = (e: WheelEvent) => {
      const col = hoveredColRef.current
      if (!col) return
      e.preventDefault()

      const STEP_SIZE = 25
      accumRef.current += e.deltaY
      if (Math.abs(accumRef.current) < STEP_SIZE) return
      const steps = Math.trunc(accumRef.current / STEP_SIZE)
      accumRef.current -= steps * STEP_SIZE
      const dir = steps > 0 ? 1 : -1
      const cur = pvRef.current
      const yr = new Date().getFullYear()
      const yrs = Array.from({ length: 5 }, (_, i) => String(yr + i))

      if (col === 'day') {
        const md = calcDaysInMonth(
          parseInt(cur.year, 10),
          parseInt(cur.month, 10)
        )
        const ds = Array.from({ length: md }, (_, i) => String(i + 1))
        const idx = ds.indexOf(cur.day)
        const next = ds[Math.max(0, Math.min(ds.length - 1, idx + dir))]
        handleChangeRef.current({ ...cur, day: next })
      } else if (col === 'month') {
        const idx = parseInt(cur.month, 10)
        const nextIdx = Math.max(0, Math.min(11, idx + dir))
        handleChangeRef.current({ ...cur, month: String(nextIdx) })
      } else {
        const idx = yrs.indexOf(cur.year)
        const next = yrs[Math.max(0, Math.min(yrs.length - 1, idx + dir))]
        handleChangeRef.current({ ...cur, year: next })
      }
    }

    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseleave', onMouseLeave)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseleave', onMouseLeave)
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`rounded-xl overflow-hidden ${
        transparentBackground ? 'bg-transparent' : 'bg-gray-100/60'
      }`}
    >
      <Picker value={pv} onChange={handleChange} height={200}>
        <Picker.Column name="day">
          {days.map(d => (
            <Picker.Item key={d} value={d}>
              {({ selected }) => (
                <div
                  className={`font-bold ${selected ? '!text-blue-600' : ''}`}
                >
                  {d}
                </div>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
        <Picker.Column name="month">
          {months.map((m, i) => (
            <Picker.Item key={i} value={String(i)}>
              {({ selected }) => (
                <div
                  className={`font-bold ${selected ? '!text-blue-600' : ''}`}
                >
                  {m}
                </div>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
        <Picker.Column name="year">
          {years.map(y => (
            <Picker.Item key={y} value={y}>
              {({ selected }) => (
                <div
                  className={`font-bold ${selected ? '!text-blue-600' : ''}`}
                >
                  {y}
                </div>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
      </Picker>
    </div>
  )
}
