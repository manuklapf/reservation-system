'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Calendar, Views, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useAuth } from '@/contexts/AuthContext'
import { Reservation, CalendarEvent } from '@/types/reservation'
import { useReservations } from '@/hooks/useReservations'
import { useMobileTouch } from '@/hooks/useMobileTouch'
import { getEventStyle } from '@/utils/calendarHelpers'
import { useI18n } from '@/contexts/I18nContext'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface OverflowResource {
  _isOverflow: true
  hiddenEvents: CalendarEvent[]
}

interface EnhancedCalendarProps {
  onSelectEvent?: (reservation: Reservation) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
  selectedDate?: Date
  refreshKey?: number
  /** When provided, skips Supabase fetch and uses these reservations directly (demo mode) */
  demoReservations?: Reservation[]
}

export default function EnhancedCalendar({
  onSelectEvent,
  onSelectSlot,
  selectedDate = new Date(),
  refreshKey = 0,
  demoReservations,
}: EnhancedCalendarProps) {
  const { tenantId } = useAuth()
  const { messages } = useI18n()
  const t = messages.calendar
  const common = messages.common
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(selectedDate)
  const [overflowPopup, setOverflowPopup] = useState<{
    events: CalendarEvent[]
  } | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const { reservations: fetchedReservations, loading } = useReservations(
    demoReservations ? null : tenantId,
    refreshKey
  )
  const reservations = demoReservations ?? fetchedReservations

  const { handleTouchStart, handleTouchEnd, handleClick } = useMobileTouch({
    onSelectSlot: onSelectSlot || (() => {}),
    currentDate: date,
    view,
  })

  const events: CalendarEvent[] = useMemo(() => {
    return reservations.map(reservation => {
      const startDate = new Date(`${reservation.date}T${reservation.time}`)
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)

      const tableDisplay =
        reservation.tables?.table_identifier ||
        reservation.table_number ||
        common.notAvailable

      return {
        id: reservation.id,
        title: `${reservation.customer_name} (${t.tableLabel} ${tableDisplay})`,
        start: startDate,
        end: endDate,
        resource: reservation,
      }
    })
  }, [reservations])

  // For week/day views: limit to 2 events per same-start-time group, add overflow indicator
  const displayEvents = useMemo(() => {
    if (view === Views.MONTH) return events

    const groups = new Map<string, CalendarEvent[]>()
    events.forEach(event => {
      const key = event.start.toISOString()
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(event)
    })

    const result: CalendarEvent[] = []
    groups.forEach(groupEvents => {
      if (groupEvents.length <= 2) {
        result.push(...groupEvents)
      } else {
        result.push(groupEvents[0], groupEvents[1])
        const hiddenCount = groupEvents.length - 2
        result.push({
          id: `overflow-${groupEvents[0].start.toISOString()}`,
          title: `+${hiddenCount} more`,
          start: groupEvents[0].start,
          end: groupEvents[0].end,
          resource: {
            _isOverflow: true,
            hiddenEvents: groupEvents.slice(2),
          } as unknown as Reservation,
        })
      }
    })

    return result
  }, [events, view])

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      const resource = event.resource as unknown as
        | OverflowResource
        | Reservation
      if ((resource as OverflowResource)._isOverflow) {
        setOverflowPopup({
          events: (resource as OverflowResource).hiddenEvents,
        })
        return
      }
      onSelectEvent?.(event.resource)
    },
    [onSelectEvent]
  )

  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      onSelectSlot?.(slotInfo)
    },
    [onSelectSlot]
  )

  const Toolbar = useCallback(
    (toolbar: any) => {
      const goToBack = () => toolbar.onNavigate('PREV')
      const goToNext = () => toolbar.onNavigate('NEXT')
      const goToCurrent = () => toolbar.onNavigate('TODAY')

      return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToBack}
              className="px-3 py-1 bg-gray-200 hover:bg-accent-background rounded text-sm font-medium"
              aria-label={common.previous}
            >
              ←
            </button>
            <button
              onClick={goToCurrent}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
            >
              {common.today}
            </button>
            <button
              onClick={goToNext}
              className="px-3 py-1 bg-gray-200 hover:bg-accent-background rounded text-sm font-medium"
              aria-label={common.next}
            >
              →
            </button>
            <span className="text-lg font-semibold text-gray-900">
              {localizer.format(toolbar.date, 'MMMM yyyy', 'en-US')}
            </span>
          </div>

          <div className="flex space-x-2">
            {[
              { view: Views.MONTH, label: common.month },
              { view: Views.WEEK, label: common.week },
              { view: Views.DAY, label: common.day },
            ].map(({ view: v, label }) => (
              <button
                key={label}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  view === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-accent-background hover:text-gray-800 text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )
    },
    [view]
  )

  // Custom event content — overflow events get centered "+X more" text;
  // week/day views show only the customer name (time is readable from the grid)
  const EventComponent = useCallback(
    ({ event, title }: { event: CalendarEvent; title: string }) => {
      const resource = event.resource as unknown as
        | OverflowResource
        | Reservation
      if ((resource as OverflowResource)._isOverflow) {
        return (
          <div
            style={{
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '13px',
              lineHeight: '1.4',
              paddingTop: '2px',
            }}
          >
            {title}
          </div>
        )
      }
      if (view !== Views.MONTH) {
        return (
          <span style={{ fontWeight: 600 }}>
            {(resource as Reservation).customer_name}
          </span>
        )
      }
      return <span>{title}</span>
    },
    [view]
  )

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const resource = event.resource as unknown as OverflowResource | Reservation
    if ((resource as OverflowResource)._isOverflow) {
      return {
        style: {
          backgroundColor: 'rgba(156, 163, 175, 0.15)',
          border: '1.5px dashed #9ca3af',
          color: '#374151',
          borderRadius: '4px',
          cursor: 'pointer',
        },
      }
    }
    return getEventStyle()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">{t.loading}</div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <style jsx global>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-header {
          background-color: #f8fafc;
          font-weight: 600;
          display: flex;
          justify-content: center;
          align-content: center;
          flex-wrap: wrap;
        }
        .rbc-today {
          background-color: #dbeafe;
        }
        .rbc-time-header .rbc-header {
          border-left: none;
        }
        .rbc-off-range-bg {
          background-color: #f8fafc;
        }
        .rbc-event {
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 12px;
          border: none;
          box-sizing: border-box;
        }
        .rbc-event-content {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        /* Hide the auto-generated time label inside event boxes in time views;
           the time is already visible from the grid itself */
        .rbc-time-view .rbc-event-label {
          display: none;
        }
        /* White outline creates a visible gap between adjacent column events */
        .rbc-day-slot .rbc-event {
          box-shadow: 0 0 0 1.5px white;
        }
        /* Small gap between stacked events in month view */
        .rbc-month-view .rbc-event {
          margin-bottom: 2px;
        }
        .rbc-time-view .rbc-time-gutter {
          background-color: #f8fafc;
        }
        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #e5e7eb;
          background-color: #ffffff;
        }
        .rbc-current-time-indicator {
          background-color: #ef4444;
        }
      `}</style>

      <div style={{ height: '600px' }}>
        <div
          ref={calendarRef}
          className="touch-manipulation"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleClick}
          style={{
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            height: '100%',
          }}
        >
          <Calendar
            localizer={localizer}
            events={displayEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            eventPropGetter={eventStyleGetter}
            popup={true}
            popupOffset={{ x: 10, y: 10 }}
            components={{
              toolbar: Toolbar,
              event: EventComponent,
            }}
            step={60}
            timeslots={1}
            min={new Date(2000, 1, 1, 0, 0, 0)}
            max={new Date(2000, 1, 1, 23, 59, 59)}
            formats={{
              timeGutterFormat: 'h:mm a',
              eventTimeRangeFormat: ({ start, end }) =>
                `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
            }}
          />
        </div>
      </div>

      {/* Overflow popup for week/day "+X more" */}
      {overflowPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setOverflowPopup(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">
                {overflowPopup.events.length} more{' '}
                {overflowPopup.events.length === 1
                  ? 'reservation'
                  : 'reservations'}
              </h3>
              <button
                onClick={() => setOverflowPopup(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {overflowPopup.events.map(event => (
                <button
                  key={event.id}
                  onClick={() => {
                    onSelectEvent?.(event.resource)
                    setOverflowPopup(null)
                  }}
                  className="w-full text-left px-3 py-2 rounded text-sm cursor-pointer transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-accent-fg)',
                  }}
                >
                  <div className="font-medium text-xs opacity-90">
                    {format(event.start, 'h:mm a')} –{' '}
                    {format(event.end, 'h:mm a')}
                  </div>
                  <div className="font-semibold truncate">{event.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
