'use client'

import React, { useState, useEffect, useRef } from 'react'
import Picker from 'react-mobile-picker'
import { useI18n } from '@/contexts/I18nContext'

const MAX_PEOPLE = 100
const SIZES = [
  ...Array.from({ length: MAX_PEOPLE }, (_, i) => String(i + 1)),
  '100+',
]

interface PeoplePickerWheelProps {
  value: string // numeric string, e.g. "2"
  onChange: (value: string) => void
  transparentBackground?: boolean
}

export default function PeoplePickerWheel({
  value,
  onChange,
  transparentBackground = false,
}: PeoplePickerWheelProps) {
  const { messages } = useI18n()
  const t = messages.reservationModal

  const safeValue =
    value &&
    (value === '100+' ||
      (parseInt(value, 10) >= 1 && parseInt(value, 10) <= MAX_PEOPLE))
      ? value
      : '2'

  const [pv, setPv] = useState({ count: safeValue })

  useEffect(() => {
    setPv({ count: safeValue })
  }, [safeValue])

  const handleChange = (next: { count: string }) => {
    setPv(next)
    onChange(next.count)
  }

  // ── Desktop wheel support ──────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
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

    const onMouseLeave = () => {
      accumRef.current = 0
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()

      const STEP_SIZE = 25
      accumRef.current += e.deltaY
      if (Math.abs(accumRef.current) < STEP_SIZE) return
      const steps = Math.trunc(accumRef.current / STEP_SIZE)
      accumRef.current -= steps * STEP_SIZE
      const dir = steps > 0 ? 1 : -1

      const cur = pvRef.current
      const idx = SIZES.indexOf(cur.count)
      const next = SIZES[Math.max(0, Math.min(SIZES.length - 1, idx + dir))]
      handleChangeRef.current({ count: next })
    }

    el.addEventListener('mouseleave', onMouseLeave)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('mouseleave', onMouseLeave)
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`rounded-xl overflow-hidden touch-none overscroll-contain ${
        transparentBackground ? 'bg-transparent' : 'bg-gray-100/60'
      }`}
    >
      <Picker value={pv} onChange={handleChange} height={200}>
        <Picker.Column name="count">
          {SIZES.map(s => (
            <Picker.Item key={s} value={s}>
              {({ selected }) => (
                <div className={`font-bold ${selected ? 'text-red-600' : ''}`}>
                  {s === '100+' ? s : `${s} ${s === '1' ? t.person : t.people}`}
                </div>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
      </Picker>
    </div>
  )
}
