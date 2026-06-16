'use client'

import { Clock } from 'lucide-react'
import TimePickerWheel from './TimePickerWheel'

interface StepTimeProps {
  title: string
  value: string
  onChange: (time: string) => void
  minuteStep?: number
  transparentBackground?: boolean
}

export default function StepTime({
  title,
  value,
  onChange,
  minuteStep,
  transparentBackground = false,
}: StepTimeProps) {
  return (
    <div className="min-w-full">
      <p className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700 mb-3">
        <Clock className="h-5 w-5 text-violet-500" />
        {title}
      </p>
      <TimePickerWheel
        value={value}
        onChange={onChange}
        minuteStep={minuteStep}
        transparentBackground={transparentBackground}
      />
    </div>
  )
}
