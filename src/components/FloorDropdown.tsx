'use client'

import { useState } from 'react'
import { ChevronDown } from '@/components/icons'
import Button from '@/components/Button'

interface FloorItem {
  id: string
  name: string
}

interface FloorDropdownProps {
  floors: FloorItem[]
  activeIdx: number
  onChange: (idx: number) => void
  /** Open the menu above the trigger — for triggers near the bottom of the
   *  screen, e.g. in a modal footer, where opening down would run off-screen. */
  openUp?: boolean
}

export default function FloorDropdown({
  floors,
  activeIdx,
  onChange,
  openUp = false,
}: FloorDropdownProps) {
  const [open, setOpen] = useState(false)

  if (floors.length <= 1) return null

  return (
    <div className="relative">
      <Button variant="secondary" onClick={() => setOpen(o => !o)}>
        {floors[activeIdx]?.name}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[55]"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute left-0 z-[56] min-w-[120px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ${
              openUp ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
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
                    : 'text-gray-700 hover:bg-accent hover:text-gray-800'
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
