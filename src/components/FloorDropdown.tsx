'use client'

import { useState } from 'react'
import { ChevronDown } from '@/components/icons'

interface FloorItem {
  id: string
  name: string
}

interface FloorDropdownProps {
  floors: FloorItem[]
  activeIdx: number
  onChange: (idx: number) => void
}

export default function FloorDropdown({
  floors,
  activeIdx,
  onChange,
}: FloorDropdownProps) {
  const [open, setOpen] = useState(false)

  if (floors.length <= 1) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-200"
      >
        {floors[activeIdx]?.name}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[55]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-[56] mt-1 min-w-[120px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            {floors.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onChange(i)
                  setOpen(false)
                }}
                className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                  i === activeIdx
                    ? 'bg-gray-100 font-semibold text-gray-900'
                    : 'text-gray-700 hover:bg-accent-background hover:text-gray-800'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
