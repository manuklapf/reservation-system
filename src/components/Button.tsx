'use client'

import { forwardRef } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'
export type ButtonSize = 'lg' | 'md' | 'sm'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
}

/**
 * The one CTA button style for the whole app — Save/Add/Cancel/Delete etc.
 * Shape and color live in globals.css (`.btn`, `.btn-primary`, …) so the
 * Brutalist theme can re-skin every instance at once. Icon-only utility
 * controls (nav back arrows, menu triggers, swatch pickers) aren't CTAs and
 * keep their own styling rather than using this component.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    type = 'button',
    className = '',
    ...props
  },
  ref
) {
  const sizeClass = size === 'sm' ? 'btn-sm' : ''
  return (
    <button
      ref={ref}
      type={type}
      className={['btn', variantClass[variant], sizeClass, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
})

export default Button
