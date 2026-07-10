'use client'

import React, { useState, useEffect, useRef } from 'react'
import Picker from 'react-mobile-picker'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const ALL_MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, '0')
)

function buildMinutes(step: number) {
  return ALL_MINUTES.filter((_, i) => i % step === 0)
}

function parseTimeString(s: string): { hour: string; minute: string } {
  const [h, m] = (s || '18:00').split(':')
  return {
    hour: (h || '18').padStart(2, '0'),
    minute: (m || '00').padStart(2, '0'),
  }
}

interface TimePickerWheelProps {
  value: string // HH:mm
  onChange: (time: string) => void
  minuteStep?: number
  transparentBackground?: boolean
}

export default function TimePickerWheel({
  value,
  onChange,
  minuteStep = 1,
  transparentBackground = false,
}: TimePickerWheelProps) {
  const MINUTES = React.useMemo(() => buildMinutes(minuteStep), [minuteStep])

  // Snap the initial value to the nearest valid minute
  const snapMinute = React.useCallback(
    (m: string) => {
      const num = parseInt(m, 10)
      const snapped = (Math.round(num / minuteStep) * minuteStep) % 60
      return String(snapped).padStart(2, '0')
    },
    [minuteStep]
  )

  const [pv, setPv] = useState(() => {
    const parsed = parseTimeString(value)
    return { ...parsed, minute: snapMinute(parsed.minute) }
  })

  useEffect(() => {
    const parsed = parseTimeString(value)
    setPv({ ...parsed, minute: snapMinute(parsed.minute) })
  }, [value, snapMinute])

  const handleChange = (next: typeof pv) => {
    setPv(next)
    onChange(`${next.hour}:${next.minute}`)
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
      // The listener lives on the picker, so every event here is over it and
      // must never reach the page behind the modal.
      e.preventDefault()
      const { left, width } = el.getBoundingClientRect()
      const col = (e.clientX - left) / width < 0.5 ? 'hour' : 'minute'

      const STEP_SIZE = 25
      accumRef.current += e.deltaY
      if (Math.abs(accumRef.current) < STEP_SIZE) return
      const steps = Math.trunc(accumRef.current / STEP_SIZE)
      accumRef.current -= steps * STEP_SIZE
      const dir = steps > 0 ? 1 : -1
      const cur = pvRef.current

      if (col === 'hour') {
        const idx = HOURS.indexOf(cur.hour)
        const next = HOURS[Math.max(0, Math.min(HOURS.length - 1, idx + dir))]
        handleChangeRef.current({ ...cur, hour: next })
      } else {
        const idx = MINUTES.indexOf(cur.minute)
        const next =
          MINUTES[Math.max(0, Math.min(MINUTES.length - 1, idx + dir))]
        handleChangeRef.current({ ...cur, minute: next })
      }
    }

    el.addEventListener('mouseleave', onMouseLeave)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('mouseleave', onMouseLeave)
      el.removeEventListener('wheel', onWheel)
    }
  }, [MINUTES])

  return (
    <div
      ref={containerRef}
      className={`rounded-xl overflow-hidden touch-none overscroll-contain ${
        transparentBackground ? 'bg-transparent' : 'bg-gray-100/60'
      }`}
    >
      <Picker value={pv} onChange={handleChange} height={200}>
        <Picker.Column name="hour">
          {HOURS.map(h => (
            <Picker.Item key={h} value={h}>
              {({ selected }) => (
                <div
                  className={`font-bold ${selected ? 'text-violet-600' : ''}`}
                >
                  {h}
                </div>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
        <Picker.Column name="minute">
          {MINUTES.map(m => (
            <Picker.Item key={m} value={m}>
              {({ selected }) => (
                <div
                  className={`font-bold ${selected ? 'text-violet-600' : ''}`}
                >
                  {m}
                </div>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
      </Picker>
    </div>
  )
}
