'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from '@/components/icons'

interface AccordionItemProps {
  title: string
  description: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function AccordionItem({
  title,
  description,
  children,
  defaultOpen = false,
}: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-gray-100 text-left transition-colors"
        aria-expanded={open}
      >
        <div>
          <p className="text-base font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-gray-400 shrink-0 ml-4" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 shrink-0 ml-4" />
        )}
      </button>
      {open && (
        <div className="border-t border-gray-200 bg- px-6 py-6">{children}</div>
      )}
    </div>
  )
}
