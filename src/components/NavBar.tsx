'use client'

import type { ReactNode } from 'react'

export interface NavBarProps {
  /** Left slot — usually a back button or a title/logo group. */
  left?: ReactNode
  /** Center slot — usually the page title, centered between left and right. */
  center?: ReactNode
  /** Right slot — actions (language switch, sign out, a CTA, or a spacer). */
  right?: ReactNode
  /** Stick to the top of the viewport. Defaults to true. */
  sticky?: boolean
  /** Extra classes appended to the <nav> (e.g. "shrink-0" inside a flex column). */
  className?: string
}

/**
 * App-wide top bar. Renders the shared nav shell — white bar, bottom border,
 * centered max-w-4xl container, 16-unit-tall row — and lays out up to three
 * slots with `justify-between`:
 *   - left + right only     → grouped bar (title/logo one side, actions the other)
 *   - left + center + right → centered title (pass a matching-width spacer as `right`)
 *
 * Back buttons, titles, and actions live in the slots so each page keeps its
 * own links, i18n, and handlers — the same split of concerns as <Button>.
 */
export default function NavBar({
  left,
  center,
  right,
  sticky = true,
  className = '',
}: NavBarProps) {
  return (
    <nav
      className={[
        'bg-white !shadow-none',
        sticky ? 'sticky top-0 z-40' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {left}
          {center}
          {right}
        </div>
      </div>
    </nav>
  )
}
