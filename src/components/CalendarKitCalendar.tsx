'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import {
  Scheduler,
  CalendarEvent as CKEvent,
  CalendarTheme,
} from 'calendarkit-pro'
import { format } from 'date-fns'
import { de as deFns } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import { useReservations } from '@/hooks/useReservations'
import { supabase } from '@/lib/supabase'
import { Reservation } from '@/types/reservation'
import { useI18n } from '@/contexts/I18nContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useDisplayPrefs } from '@/contexts/DisplayPrefsContext'

/** Fallback length for reservations stored without an end_time. */
const DEFAULT_DURATION_MS = 60 * 60 * 1000

// Intercepts CalendarKit's internal modal: forwards slot clicks to our handler
// and suppresses the built-in form for event edits (handled by ReservationModal).
function SlotClickBridge({
  isOpen,
  onClose,
  event,
  initialDate,
  onSelectSlot,
}: {
  isOpen: boolean
  onClose: () => void
  event?: CKEvent | null
  initialDate?: Date
  onSelectSlot?: (info: { start: Date; end: Date }) => void
}) {
  useEffect(() => {
    if (!isOpen) return
    if (!event && initialDate) {
      onSelectSlot?.({
        start: initialDate,
        end: new Date(initialDate.getTime() + DEFAULT_DURATION_MS),
      })
    }
    onClose()
  }, [isOpen, event, initialDate, onClose, onSelectSlot])

  return null
}

const germanTranslations = {
  today: 'Heute',
  month: 'Monat',
  week: 'Woche',
  day: 'Tag',
  agenda: 'Agenda',
  resource: 'Ressource',
  createEvent: 'Termin erstellen',
  editEvent: 'Termin bearbeiten',
  delete: 'Löschen',
  save: 'Speichern',
  cancel: 'Abbrechen',
  title: 'Titel',
  start: 'Beginn',
  end: 'Ende',
  allDay: 'Ganztägig',
  description: 'Beschreibung',
  repeat: 'Wiederholen',
  noRepeat: 'Keine Wiederholung',
  selectCalendar: 'Kalender auswählen',
  selectType: 'Typ auswählen',
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  yearly: 'Jährlich',
  event: 'Termin',
  task: 'Aufgabe',
  appointmentSchedule: 'Terminplan',
  new: 'Neu',
  dateAndTime: 'Datum & Uhrzeit',
  timezone: 'Zeitzone',
  whosJoining: 'Teilnehmer',
  suggestedTimes: 'Vorgeschlagene Zeiten',
  viewSuggestions: 'Vorschläge anzeigen',
  whereWillItBe: 'Ort',
  location: 'Standort',
  descriptionAndAttachments: 'Beschreibung & Anhänge',
  dragAndDrop: 'Ziehen & Ablegen',
  guests: 'Gäste',
  addAttachment: 'Anhang hinzufügen',
  moreOptions: 'Weitere Optionen',
  doesNotRepeat: 'Wiederholt sich nicht',
  locationHelpText: 'Adresse oder Link eingeben',
}

// CalendarTheme per app theme — mirrors the CSS variables in globals.css
const calendarThemes: Record<string, CalendarTheme> = {
  default: {
    colors: {
      // Lemon-yellow is too light to carry white text or thin lines, so
      // `primary` is its dark gold shade (--color-lemon-yellow-strong).
      primary: '#a89c1a',
      background: '#ffffff',
      foreground: '#11262b',
      border: '#cbe3e6',
      muted: '#e3f2f4',
      accent: '#fdfce6',
      secondary: '#587a81',
    },
    fontFamily: 'inherit',
    borderRadius: '0.5rem',
  },
  brutalist: {
    colors: {
      primary: '#a89c1a',
      background: '#ffffff',
      foreground: '#090909',
      border: '#000000',
      muted: '#fdfce6',
      accent: '#f9f5a9',
      secondary: '#555555',
    },
    fontFamily: "'Courier New', Courier, monospace",
    borderRadius: '0px',
  },
}

// Color palettes per theme — each reservation gets a deterministic color from its ID hash
const colorPalettes: Record<string, Array<{ base: string; dark: string }>> = {
  // Event pills render white text, so each fruit color contributes its
  // deep shade rather than the pastel main.
  default: [
    { base: '#3e7b82', dark: '#2b5f66' }, // ice-blue
    { base: '#a89c1a', dark: '#857b12' }, // lemon-yellow
    { base: '#d14550', dark: '#b0333d' }, // peach-red
    { base: '#7b5891', dark: '#5a3d6b' }, // grape-purple
    { base: '#be6708', dark: '#965005' }, // mandarin-orange
    { base: '#3e9448', dark: '#2a7333' }, // pear-green
  ],
  brutalist: [
    { base: '#3e7b82', dark: '#2b5f66' }, // ice-blue
    { base: '#a89c1a', dark: '#857b12' }, // lemon-yellow
    { base: '#d14550', dark: '#b0333d' }, // peach-red
    { base: '#7b5891', dark: '#5a3d6b' }, // grape-purple
    { base: '#be6708', dark: '#965005' }, // mandarin-orange
    { base: '#3e9448', dark: '#2a7333' }, // pear-green
  ],
}

const reservationStart = (r: Reservation) => new Date(`${r.date}T${r.time}`)

const reservationEnd = (r: Reservation) =>
  r.end_time
    ? new Date(`${r.date}T${r.end_time}`)
    : new Date(reservationStart(r).getTime() + DEFAULT_DURATION_MS)

function hashEventColor(
  id: string,
  palette: Array<{ base: string; dark: string }>
) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = (hash << 5) - hash + id.charCodeAt(i)
    // eslint-disable-next-line no-bitwise
    hash |= 0
  }
  return palette[Math.abs(hash) % palette.length]
}

interface CalendarKitCalendarProps {
  onSelectEvent?: (reservation: Reservation) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
  refreshKey?: number
  demoReservations?: Reservation[]
}

export default function CalendarKitCalendar({
  onSelectEvent,
  onSelectSlot,
  refreshKey = 0,
  demoReservations,
}: CalendarKitCalendarProps) {
  const { tenantId } = useAuth()
  const { language } = useI18n()
  const { theme } = useTheme()

  const [localRefreshKey, setLocalRefreshKey] = useState(0)
  const combinedKey = refreshKey + localRefreshKey

  const { reservations: fetchedReservations, loading } = useReservations(
    demoReservations ? null : tenantId,
    combinedKey
  )
  const reservations = demoReservations ?? fetchedReservations

  // Track whether the initial load has completed so subsequent refetches
  // (e.g. after drag-and-drop) don't trigger the loading skeleton.
  const hasInitialLoadRef = useRef(false)
  useEffect(() => {
    if (!loading) {
      hasInitialLoadRef.current = true
    }
  }, [loading])

  const { prefs } = useDisplayPrefs()
  const palette = colorPalettes[theme] ?? colorPalettes.default
  const calendarTheme = calendarThemes[theme] ?? calendarThemes.default

  const events: CKEvent[] = useMemo(() => {
    return reservations.map(reservation => {
      const start = reservationStart(reservation)
      const end = reservationEnd(reservation)
      const eventColor = hashEventColor(reservation.id, palette)

      return {
        id: reservation.id,
        title: reservation.customer_name,
        start,
        end,
        color: eventColor.base,
        description: reservation.notes ?? undefined,
        reservation,
      }
    })
  }, [reservations, palette])

  const handleEventClick = (event: CKEvent) => {
    onSelectEvent?.(event.reservation as Reservation)
  }

  // Drag-and-drop fires onEventUpdate (not onEventDrop — that prop is unused by the library)
  const handleEventUpdate = async (event: CKEvent) => {
    if (!supabase) return
    const reservation = event.reservation as Reservation
    if (!reservation?.id) return

    // Moving a reservation must not stretch or shrink it: the library hands back
    // an `end` that isn't always shifted along with `start`. Only a resize —
    // which requires the reservation-length setting — may change the duration.
    const durationMs =
      reservationEnd(reservation).getTime() -
      reservationStart(reservation).getTime()
    const end = new Date(
      event.start.getTime() +
        (durationMs > 0 ? durationMs : DEFAULT_DURATION_MS)
    )

    await supabase
      .from('reservations')
      .update({
        date: format(event.start, 'yyyy-MM-dd'),
        time: format(event.start, 'HH:mm'),
        end_time: format(end, 'HH:mm'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservation.id)

    setLocalRefreshKey(prev => prev + 1)
  }

  // Resize (bottom-edge drag) fires onEventResize with (event, newStart, newEnd)
  const handleEventResize = async (event: CKEvent, start: Date, end: Date) => {
    if (!supabase) return
    const reservation = event.reservation as Reservation
    if (!reservation?.id) return

    await supabase
      .from('reservations')
      .update({
        date: format(start, 'yyyy-MM-dd'),
        time: format(start, 'HH:mm'),
        end_time: format(end, 'HH:mm'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservation.id)

    setLocalRefreshKey(prev => prev + 1)
  }

  // Browsers normalise hex colours to rgb() in the style attribute, so CSS
  // [style*="border-left-color: #hex"] selectors never match. Use a
  // MutationObserver to read borderLeftColor (set solid by the library) and
  // apply it as a solid backgroundColor instead.
  useEffect(() => {
    const wrapper = document.getElementById('ck-wrapper')
    if (!wrapper) return

    const solidify = () => {
      // Week / Day view: .glass event cards → solid background
      wrapper.querySelectorAll<HTMLElement>('.glass').forEach(el => {
        const color = el.style.borderLeftColor
        if (!color || color.startsWith('var(')) return
        el.style.backgroundColor = color
        el.style.borderColor = color
      })

      // Month view: event indicator pills
      // - solid background (library renders low-opacity)
      // - limit to 1 per day cell; show "+X more" for overflow
      const containers = new Map<HTMLElement, HTMLElement[]>()
      wrapper
        .querySelectorAll<HTMLElement>(
          '[class~="py-1.5"][class~="cursor-pointer"]'
        )
        .forEach(pill => {
          const color = pill.style.color
          if (color && !color.startsWith('var(')) {
            pill.style.backgroundColor = color
          }
          const parent = pill.parentElement
          if (!parent) return
          if (!containers.has(parent)) containers.set(parent, [])
          containers.get(parent)!.push(pill)
        })

      containers.forEach((pills, parent) => {
        // Show only the first pill; hide the rest
        pills.forEach((pill, i) => {
          pill.style.display = i === 0 ? '' : 'none'
        })

        if (pills.length <= 1) {
          parent.querySelector('[data-ck-more]')?.remove()
          return
        }

        // Absorb the library's own "+N more" indicator (appears when >4 events)
        const libMoreEl = Array.from(parent.children).find(
          (el): el is HTMLElement =>
            el instanceof HTMLElement &&
            !el.matches('[class~="py-1.5"]') &&
            !(el as HTMLElement).dataset.ckMore &&
            (el.textContent?.includes('more') ?? false)
        )
        const libMoreCount = libMoreEl
          ? parseInt(libMoreEl.textContent?.match(/\+(\d+)/)?.[1] ?? '0', 10)
          : 0
        if (libMoreEl) libMoreEl.style.display = 'none'

        const overflowCount = pills.length - 1 + libMoreCount
        const desiredText = `+${overflowCount} more`

        let moreEl = parent.querySelector<HTMLElement>('[data-ck-more]')
        if (!moreEl) {
          moreEl = document.createElement('div')
          moreEl.dataset.ckMore = '1'
          moreEl.className =
            'text-[10px] text-primary font-semibold text-center py-1 px-2 rounded-md bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors'
          moreEl.textContent = desiredText
          parent.appendChild(moreEl)
        } else if (moreEl.textContent !== desiredText) {
          moreEl.textContent = desiredText
        }
      })
    }

    solidify()
    const observer = new MutationObserver(solidify)
    observer.observe(wrapper, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [events])

  return (
    <div id="ck-wrapper" className="h-full">
      <style>{`
        /* ── Week/day event cards: text color + opacity ───────────────────── */
        #ck-wrapper .glass * { color: white !important; opacity: 1 !important; }

        /* ── Count badge (overlapping events): solid white background ──────── */
        #ck-wrapper .glass [class~="rounded-full"] {
          background-color: rgba(255,255,255,0.92) !important;
          color: #1f2937 !important;
        }

        /* ── Month view events: solid background via currentColor ────────── */
        /* container has inline color: event.color → currentColor = event color */
        #ck-wrapper [class~="py-1.5"][class~="cursor-pointer"] {
          background-image: linear-gradient(currentColor, currentColor) !important;
        }
        #ck-wrapper [class~="py-1.5"][class~="cursor-pointer"] span {
          color: white !important;
        }

        /* ── Keep header above event cards (hover:z-10 on events) ─────────── */
        #ck-wrapper [class~="min-h-[64px]"] { position: relative; z-index: 10; }

        /* ── Hide agenda view button (4th in the view-switcher group) ─────── */
        #ck-wrapper [class~="backdrop-blur-sm"] > button:nth-child(4) { display: none !important; }

        /* ── Hide hamburger / sidebar toggle ────────────────────────────── */
        #ck-wrapper [class~="h-10"][class~="w-10"][class~="hidden"] { display: none !important; }

        /* ── Hide sidebar panel ──────────────────────────────────────────── */
        #ck-wrapper [class~="hidden"][class~="overflow-hidden"] { display: none !important; width: 0 !important; }

        /* ── Hide time indicator (wrapper + individual children) ──── */
        #ck-wrapper [class~="pointer-events-none"][class~="z-20"],
        #ck-wrapper [class~="bg-gradient-to-r"][class~="from-primary"],
        #ck-wrapper [class~="animate-pulse"][class~="bg-primary"] { display: none !important; } 
        
        /* ── Hide current-time box on the left ──── */
        #ck-wrapper [class~="pointer-events-none"][class~="z-30"] { display: none !important; }   

        /* ── Hide create new button on mobile ──── */
        #ck-wrapper [class~="absolute"][class~="bottom-6"][class~="right-6"] { display: none !important; }

        /* ── Fit month/week grids to narrow viewports ────────────────────── */
        /* The library hardcodes min-w-[800px] on both grids below its own md */
        /* breakpoint, which pushes them past the phone viewport. */
        #ck-wrapper [class~="min-w-[800px]"] { min-width: 0 !important; }

        /* ── Timeslot grid lines ─────────────────────────────────────────── */
        #ck-wrapper [class~="border-dashed"] {
          border-style: solid !important;
          border-bottom-color: rgba(100, 116, 139, 0.35) !important;
        }

        /* ── Disable resize handle when reservation length setting is off ─── */
        ${!prefs.reservationLengthEnabled ? '#ck-wrapper [class~="cursor-ns-resize"] { display: none !important; }' : ''}

        /* ── Disable drag in month view on touch devices ─────────────────── */
        /* dnd-kit needs touch-action:none to capture pointer events for drag; */
        /* restoring auto on mobile prevents accidental drags while keeping taps. */
        /* :has([class~="py-1.5"]) targets month-view wrappers only (not .glass). */
        @media (hover: none) and (pointer: coarse) {
          #ck-wrapper [class~="touch-none"]:has([class~="py-1.5"]) {
            touch-action: auto !important;
          }
        }
      `}</style>
      <Scheduler
        events={events}
        isLoading={loading && !hasInitialLoadRef.current}
        onEventClick={handleEventClick}
        onEventUpdate={handleEventUpdate}
        onEventResize={
          prefs.reservationLengthEnabled ? handleEventResize : undefined
        }
        renderEventForm={({ isOpen, onClose, event, initialDate }) => (
          <SlotClickBridge
            isOpen={isOpen}
            onClose={onClose}
            event={event}
            initialDate={initialDate}
            onSelectSlot={onSelectSlot}
          />
        )}
        translations={language === 'de' ? germanTranslations : undefined}
        locale={language === 'de' ? deFns : undefined}
        theme={calendarTheme}
      />
    </div>
  )
}
