'use client'

import { CalendarDays } from 'lucide-react'
import DatePickerWheel from './DatePickerWheel'

interface StepDateProps {
  title: string
  value: string
  onChange: (date: string) => void
  transparentBackground?: boolean
}

export default function StepDate({
  title,
  value,
  onChange,
  transparentBackground = false,
}: StepDateProps) {
  return (
    <div className="min-w-full">
      <p className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700 mb-3">
        <CalendarDays className="h-5 w-5 text-blue-500" />
        {title}
      </p>
      <DatePickerWheel
        value={value}
        onChange={onChange}
        transparentBackground={transparentBackground}
      />
    </div>
  )
}
