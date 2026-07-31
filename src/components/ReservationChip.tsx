'use client'

import React from 'react'

interface ReservationChipProps {
  icon: React.ReactNode
  label: string
  value: string
  active: boolean
  activeClass: string
  inactiveClass: string
  onClick: () => void
}

export default function ReservationChip({
  icon,
  label,
  value,
  active,
  activeClass,
  inactiveClass,
  onClick,
}: ReservationChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col items-start overflow-hidden rounded-xl px-4 py-3 text-left border-2 border-black transition-colors ${
        active ? activeClass : inactiveClass
      }`}
    >
      <span className="mb-0.5 flex w-full min-w-0 items-center gap-1 text-xs font-medium">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="w-full truncate text-sm font-semibold">{value}</span>
    </button>
  )
}
