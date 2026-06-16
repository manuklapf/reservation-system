'use client'

import { Users } from 'lucide-react'
import PeoplePickerWheel from './PeoplePickerWheel'

interface StepPersonsProps {
  title: string
  value: string
  onChange: (value: string) => void
  transparentBackground?: boolean
}

export default function StepPersons({
  title,
  value,
  onChange,
  transparentBackground = false,
}: StepPersonsProps) {
  return (
    <div className="min-w-full">
      <p className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700 mb-3">
        <Users className="h-5 w-5 text-blue-500" />
        {title}
      </p>
      <PeoplePickerWheel
        value={value}
        onChange={onChange}
        transparentBackground={transparentBackground}
      />
    </div>
  )
}
