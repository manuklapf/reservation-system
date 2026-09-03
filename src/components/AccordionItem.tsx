'use client'

import { useState } from 'react'
import { ChevronDown } from '@/components/icons'

interface AccordionItemProps {
  title: string
  description: string
  children: React.ReactNode
  defaultOpen?: boolean
}

/**
 * Collapsible settings section. Styled to match the marketing site's
 * accordion (see reservation-system-marketing AccountView `collapsible*`):
 * one white card carrying the black border and hard offset shadow — from
 * `bg-white shadow`, which the brutalist theme rewrites — an uppercase
 * header that tints on hover, and a body separated by a hard rule.
 *
 * Vertical rhythm is left to the caller; both consumers stack these in a
 * `space-y-3` container.
 */
export default function AccordionItem({
  title,
  description,
  children,
  defaultOpen = false,
}: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white shadow">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent-soft transition-colors"
        aria-expanded={open}
      >
        <span>
          <span className="font-bold uppercase">{title}</span>
          <span className="block text-sm text-gray-500 mt-0.5">
            {description}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 ml-4 opacity-60 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="border-t-2 border-black px-5 py-5">{children}</div>
      )}
    </div>
  )
}
