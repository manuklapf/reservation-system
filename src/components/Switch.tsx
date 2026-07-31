'use client'

import { forwardRef } from 'react'

export interface SwitchProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onChange' | 'type' | 'role' | 'aria-checked'
  > {
  /** Current on/off state. */
  checked: boolean
  /** Called with the next state when the switch is toggled. */
  onChange: (checked: boolean) => void
}

/**
 * The app-wide toggle switch — a pill track with a sliding knob. Used for
 * on/off preferences (dashboard display fields, reservation settings, …) so
 * every toggle shares one look and behavior.
 */
const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onChange, className = '', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none ring-2 ring-background ring-offset-2',
        checked ? 'bg-danger' : 'bg-accent',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
})

export default Switch
