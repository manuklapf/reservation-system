'use client'

/**
 * App-wide icon barrel.
 *
 * Every icon is an animated component built on the animate-ui icon engine
 * (driven by `motion`) and wrapped here so it animates on hover by default,
 * while still accepting the same `className` / `size` props the app uses.
 * Icons animate-ui does not ship (Mail, Globe, Eye, Info, …) have hand-authored
 * animated equivalents under `@/components/animate-ui/icons/`.
 *
 * Plus, X, ArrowLeft, MoreVertical, Check, ChevronLeft, ChevronRight,
 * ChevronDown, and ChevronUp are exceptions: they render as plain static SVGs
 * (no animation).
 *
 * Usage stays identical to lucide-react:
 *   import { LogOut, Bell } from '@/components/icons'
 */

import * as React from 'react'

import { Bell as BellAnim } from '@/components/animate-ui/icons/bell'
import { Building2 as Building2Anim } from '@/components/animate-ui/icons/building-2'
import { CalendarCheck as CalendarCheckAnim } from '@/components/animate-ui/icons/calendar-check'
import { CalendarDays as CalendarDaysAnim } from '@/components/animate-ui/icons/calendar-days'
import { CircleHelp as CircleHelpAnim } from '@/components/animate-ui/icons/circle-help'
import { ClipboardList as ClipboardListAnim } from '@/components/animate-ui/icons/clipboard-list'
import { Clock as ClockAnim } from '@/components/animate-ui/icons/clock'
import { Code2 as Code2Anim } from '@/components/animate-ui/icons/code-2'
import { Copy as CopyAnim } from '@/components/animate-ui/icons/copy'
import { Eye as EyeAnim } from '@/components/animate-ui/icons/eye'
import { EyeOff as EyeOffAnim } from '@/components/animate-ui/icons/eye-off'
import { Globe as GlobeAnim } from '@/components/animate-ui/icons/globe'
import { GripVertical as GripVerticalAnim } from '@/components/animate-ui/icons/grip-vertical'
import { Inbox as InboxAnim } from '@/components/animate-ui/icons/inbox'
import { Info as InfoAnim } from '@/components/animate-ui/icons/info'
import { LayoutDashboard as LayoutDashboardAnim } from '@/components/animate-ui/icons/layout-dashboard'
import { LayoutGrid as LayoutGridAnim } from '@/components/animate-ui/icons/layout-grid'
import { List as ListAnim } from '@/components/animate-ui/icons/list'
import { LogOut as LogOutAnim } from '@/components/animate-ui/icons/log-out'
import { Mail as MailAnim } from '@/components/animate-ui/icons/mail'
import { Minus as MinusAnim } from '@/components/animate-ui/icons/minus'
import { Pencil as PencilAnim } from '@/components/animate-ui/icons/pencil'
import { Redo as RedoAnim } from '@/components/animate-ui/icons/redo'
import { Settings as SettingsAnim } from '@/components/animate-ui/icons/settings'
import { SlidersHorizontal as SlidersHorizontalAnim } from '@/components/animate-ui/icons/sliders-horizontal'
import { Square as SquareAnim } from '@/components/animate-ui/icons/square'
import { Table2 as Table2Anim } from '@/components/animate-ui/icons/table-2'
import { Trash2 as Trash2Anim } from '@/components/animate-ui/icons/trash-2'
import { User as UserAnim } from '@/components/animate-ui/icons/user'
import { UserCheck as UserCheckAnim } from '@/components/animate-ui/icons/user-check'
import { UserPlus as UserPlusAnim } from '@/components/animate-ui/icons/user-plus'
import { Users as UsersAnim } from '@/components/animate-ui/icons/users'
import { UtensilsCrossed as UtensilsCrossedAnim } from '@/components/animate-ui/icons/utensils-crossed'

/**
 * Wrap an animate-ui icon so it animates on hover by default. Callers can still
 * override any prop (including the animation triggers) since props are spread last.
 * The returned component keeps the wrapped icon's own prop types.
 */
function hoverAnimated<T extends React.ComponentType<any>>(
  Icon: T,
  displayName: string
): T {
  const Base = Icon as React.ComponentType<Record<string, unknown>>
  const Wrapped = (props: React.ComponentProps<T>) => {
    const p = props as Record<string, unknown>
    // If the caller drives the animation explicitly, respect it verbatim.
    const hasExplicitTrigger =
      p.animate !== undefined ||
      p.animateOnHover !== undefined ||
      p.animateOnTap !== undefined ||
      p.animateOnView !== undefined

    const ref = React.useRef<HTMLSpanElement>(null)
    const [ancestor, setAncestor] = React.useState<Element | null>(null)
    const [ancestorHovered, setAncestorHovered] = React.useState(false)

    React.useEffect(() => {
      if (hasExplicitTrigger) return
      // Walk up to the nearest interactive element. When the icon lives inside a
      // button/link, its animation should play on that element's hover instead
      // of only when the tiny icon itself is hovered.
      const trigger = ref.current?.closest('button, a, [role="button"]') ?? null
      if (!trigger) return
      setAncestor(trigger)
      const enter = () => setAncestorHovered(true)
      const leave = () => setAncestorHovered(false)
      trigger.addEventListener('mouseenter', enter)
      trigger.addEventListener('mouseleave', leave)
      return () => {
        trigger.removeEventListener('mouseenter', enter)
        trigger.removeEventListener('mouseleave', leave)
      }
    }, [hasExplicitTrigger])

    // `display: contents` keeps the wrapper out of the layout/positioning flow,
    // so the icon's own className (sizing, color, absolute positioning) is unaffected.
    return (
      <span ref={ref} style={{ display: 'contents' }}>
        {hasExplicitTrigger ? (
          <Base {...p} />
        ) : ancestor ? (
          <Base animate={ancestorHovered} {...p} />
        ) : (
          <Base animateOnHover {...p} />
        )}
      </span>
    )
  }
  Wrapped.displayName = displayName
  return Wrapped as unknown as T
}

type StaticIconProps = React.SVGProps<SVGSVGElement> & { size?: number }

function Plus({ size = 28, ...props }: StaticIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1={12} y1={19} x2={12} y2={5} />
      <line x1={5} y1={12} x2={19} y2={12} />
    </svg>
  )
}

function X({ size = 28, ...props }: StaticIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1={18} y1={6} x2={6} y2={18} />
      <line x1={6} y1={6} x2={18} y2={18} />
    </svg>
  )
}

function ArrowLeft({ size = 28, ...props }: StaticIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

function MoreVertical({ size = 28, ...props }: StaticIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx={12} cy={19} r={1} />
      <circle cx={12} cy={12} r={1} />
      <circle cx={12} cy={5} r={1} />
    </svg>
  )
}

function Check({ size = 28, ...props }: StaticIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m4 12 5 5L20 6" />
    </svg>
  )
}

function ChevronLeft({ size = 28, ...props }: StaticIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRight({ size = 28, ...props }: StaticIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function ChevronDown({ size = 28, ...props }: StaticIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function ChevronUp({ size = 28, ...props }: StaticIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
}

export const Bell = hoverAnimated(BellAnim, 'Bell')
export const Building2 = hoverAnimated(Building2Anim, 'Building2')
export const CalendarCheck = hoverAnimated(CalendarCheckAnim, 'CalendarCheck')
export const CalendarDays = hoverAnimated(CalendarDaysAnim, 'CalendarDays')
export const CircleHelp = hoverAnimated(CircleHelpAnim, 'CircleHelp')
export const ClipboardList = hoverAnimated(ClipboardListAnim, 'ClipboardList')
export const Clock = hoverAnimated(ClockAnim, 'Clock')
export const Code2 = hoverAnimated(Code2Anim, 'Code2')
export const Copy = hoverAnimated(CopyAnim, 'Copy')
export const Eye = hoverAnimated(EyeAnim, 'Eye')
export const EyeOff = hoverAnimated(EyeOffAnim, 'EyeOff')
export const Globe = hoverAnimated(GlobeAnim, 'Globe')
export const GripVertical = hoverAnimated(GripVerticalAnim, 'GripVertical')
export const Inbox = hoverAnimated(InboxAnim, 'Inbox')
export const Info = hoverAnimated(InfoAnim, 'Info')
export const LayoutDashboard = hoverAnimated(
  LayoutDashboardAnim,
  'LayoutDashboard'
)
export const LayoutGrid = hoverAnimated(LayoutGridAnim, 'LayoutGrid')
export const List = hoverAnimated(ListAnim, 'List')
export const LogOut = hoverAnimated(LogOutAnim, 'LogOut')
export const Mail = hoverAnimated(MailAnim, 'Mail')
export const Minus = hoverAnimated(MinusAnim, 'Minus')
export const Pencil = hoverAnimated(PencilAnim, 'Pencil')
export const Redo = hoverAnimated(RedoAnim, 'Redo')
export const Settings = hoverAnimated(SettingsAnim, 'Settings')
export const SlidersHorizontal = hoverAnimated(
  SlidersHorizontalAnim,
  'SlidersHorizontal'
)
export const Square = hoverAnimated(SquareAnim, 'Square')
export const Table2 = hoverAnimated(Table2Anim, 'Table2')
export const Trash2 = hoverAnimated(Trash2Anim, 'Trash2')
export const User = hoverAnimated(UserAnim, 'User')
export const UserCheck = hoverAnimated(UserCheckAnim, 'UserCheck')
export const UserPlus = hoverAnimated(UserPlusAnim, 'UserPlus')
export const Users = hoverAnimated(UsersAnim, 'Users')
export const UtensilsCrossed = hoverAnimated(
  UtensilsCrossedAnim,
  'UtensilsCrossed'
)
export {
  Plus,
  X,
  ArrowLeft,
  MoreVertical,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
}
