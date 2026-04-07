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

// Setup the localizer for react-big-calendar
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

interface EnhancedCalendarProps {
  onSelectEvent?: (reservation: Reservation) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
  selectedDate?: Date
  refreshKey?: number
}

export default function EnhancedCalendar({
  onSelectEvent,
  onSelectSlot,
  selectedDate = new Date(),
  refreshKey = 0,
}: EnhancedCalendarProps) {
  const { tenantId } = useAuth()
  const { messages } = useI18n()
  const t = messages.calendar
  const common = messages.common
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(selectedDate)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Fetch reservations
  const { reservations, loading } = useReservations(tenantId, refreshKey)

  // Mobile touch handlers
  const { handleTouchStart, handleTouchEnd, handleClick } = useMobileTouch({
    onSelectSlot: onSelectSlot || (() => {}),
    currentDate: date,
    view,
  })

  // Convert reservations to calendar events
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

  // Handle event selection
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onSelectEvent?.(event.resource)
    },
    [onSelectEvent]
  )

  // Handle slot selection
  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      onSelectSlot?.(slotInfo)
    },
    [onSelectSlot]
  )

  // Custom toolbar component
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
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
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
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
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
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
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

  // Event style based on status
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => getEventStyle(event.resource.status),
    []
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">{t.loading}</div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* CSS Styles for react-big-calendar */}
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
        /* Ensure proper spacing for overlapping events in day/week view */
        .rbc-time-slot .rbc-event,
        .rbc-day-slot .rbc-event {
          margin-right: 1px;
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
            events={events}
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
          <span>{t.legendConfirmed}</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
          <span>{t.legendPending}</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
          <span>{t.legendCancelled}</span>
        </div>
      </div>
    </div>
  )
}
