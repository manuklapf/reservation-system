'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Calendar, Views, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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

// Sample data for testing
const sampleReservations: Reservation[] = [
  {
    id: '1',
    customer_name: 'John Doe',
    customer_phone: '123-456-7890',
    table_number: 5,
    date: '2025-10-15',
    time: '18:00',
    party_size: 4,
    status: 'confirmed',
    notes: 'Anniversary dinner',
    created_at: '2025-10-14T10:00:00Z',
    updated_at: '2025-10-14T10:00:00Z',
    tenant_id: 'sample-tenant',
    created_by: 'staff-1',
  },
  {
    id: '2',
    customer_name: 'Jane Smith',
    customer_phone: '987-654-3210',
    table_number: 3,
    date: '2025-10-16',
    time: '19:30',
    party_size: 2,
    status: 'pending',
    notes: null,
    created_at: '2025-10-14T11:00:00Z',
    updated_at: '2025-10-14T11:00:00Z',
    tenant_id: 'sample-tenant',
    created_by: 'staff-1',
  },
]

interface Reservation {
  id: string
  customer_name: string
  customer_phone: string
  table_number: number
  date: string
  time: string
  party_size: number
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  tenant_id: string
  created_by: string
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Reservation
}

interface EnhancedCalendarProps {
  onSelectEvent?: (reservation: Reservation) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
  selectedDate?: Date
  refreshKey?: number // Add this to force refresh from parent
}

export default function EnhancedCalendar({
  onSelectEvent,
  onSelectSlot,
  selectedDate = new Date(),
  refreshKey = 0,
}: EnhancedCalendarProps) {
  const { user, tenantId } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(selectedDate)
  const calendarRef = useRef<HTMLDivElement>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)

  // Fetch reservations from Supabase
  const fetchReservations = useCallback(async () => {
    setLoading(true)

    console.log('Fetching reservations...', {
      supabase: !!supabase,
      tenantId,
      user: !!user,
    })

    // Try to fetch real data first, fall back to sample data
    if (supabase && tenantId) {
      try {
        console.log('Attempting to fetch from Supabase...')
        const { data, error } = await supabase
          .from('reservations')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('date', { ascending: true })
          .order('time', { ascending: true })

        if (error) throw error
        console.log('Successfully fetched reservations:', data?.length || 0)
        setReservations(data || [])
        setLoading(false)
        return
      } catch (error) {
        console.error('Error fetching reservations:', error)
        // Fall through to sample data
      }
    }

    // Use sample data when Supabase is not available or on error
    console.log('Using sample data')
    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500))
      setReservations(sampleReservations)
    } catch (error) {
      console.error('Error loading reservations:', error)
      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [tenantId, user])

  // Custom toolbar component
  const CustomToolbar = useCallback(
    (toolbar: any) => {
      const goToBack = () => {
        toolbar.onNavigate('PREV')
      }

      const goToNext = () => {
        toolbar.onNavigate('NEXT')
      }

      const goToCurrent = () => {
        toolbar.onNavigate('TODAY')
      }

      const label = () => {
        const date = toolbar.date
        return (
          <span className="text-lg font-semibold text-gray-900">
            {localizer.format(date, 'MMMM yyyy', 'en-US')}
          </span>
        )
      }

      return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToBack}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
            >
              ←
            </button>
            <button
              onClick={goToCurrent}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
            >
              Today
            </button>
            <button
              onClick={goToNext}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
            >
              →
            </button>
            {label()}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setView(Views.MONTH)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                view === Views.MONTH
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView(Views.WEEK)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                view === Views.WEEK
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView(Views.DAY)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                view === Views.DAY
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Day
            </button>
          </div>
        </div>
      )
    },
    [view]
  )

  useEffect(() => {
    // Always fetch reservations on component mount and when refreshKey changes
    fetchReservations()
  }, [fetchReservations, refreshKey])

  // Convert reservations to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return reservations.map(reservation => {
      const startDate = new Date(`${reservation.date}T${reservation.time}`)
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hour duration

      return {
        id: reservation.id,
        title: `${reservation.customer_name} (Table ${reservation.table_number})`,
        start: startDate,
        end: endDate,
        resource: reservation,
      }
    })
  }, [reservations])

  // Handle event selection (clicking on a reservation)
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onSelectEvent?.(event.resource)
    },
    [onSelectEvent]
  )

  // Handle slot selection (clicking on empty calendar slot)
  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      onSelectSlot?.(slotInfo)
    },
    [onSelectSlot]
  )

  // Enhanced helper function to extract date from calendar cell
  const getCellDate = useCallback(
    (cell: Element): Date | null => {
      try {
        console.log('Getting date from cell:', {
          className: cell.className,
          textContent: cell.textContent,
          innerHTML: cell.innerHTML.substring(0, 100),
        })

        // Method 1: Try data attributes first
        const dateAttr = cell.getAttribute('data-date')
        if (dateAttr) {
          console.log('Found data-date attribute:', dateAttr)
          return new Date(dateAttr)
        }

        // Method 2: For month view date cells
        if (cell.classList.contains('rbc-date-cell')) {
          const dateText = cell.textContent?.trim()
          console.log('Date cell text:', dateText)

          if (dateText && /^\d{1,2}$/.test(dateText)) {
            const day = Number(dateText)
            const currentDate = new Date(date)
            const targetDate = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              day
            )

            console.log('Extracted date from date cell:', {
              day,
              currentMonth: currentDate.getMonth(),
              currentYear: currentDate.getFullYear(),
              targetDate: targetDate.toDateString(),
            })

            return targetDate
          }
        }

        // Method 3: For day background cells (month view)
        if (cell.classList.contains('rbc-day-bg')) {
          // Find the parent row and determine position
          const row = cell.closest('.rbc-month-row')
          if (row) {
            const dayBgs = Array.from(row.querySelectorAll('.rbc-day-bg'))
            const index = dayBgs.indexOf(cell)

            if (index >= 0) {
              // Get the corresponding date cell
              const dateCells = Array.from(
                row.querySelectorAll('.rbc-date-cell')
              )
              const dateCell = dateCells[index]

              if (dateCell) {
                const dateText = dateCell.textContent?.trim()
                if (dateText && /^\d{1,2}$/.test(dateText)) {
                  const day = Number(dateText)
                  const currentDate = new Date(date)
                  const targetDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    day
                  )

                  console.log('Extracted date from day-bg via position:', {
                    index,
                    day,
                    targetDate: targetDate.toDateString(),
                  })

                  return targetDate
                }
              }
            }
          }
        }

        // Method 4: For month view rows - find closest date cell
        if (cell.classList.contains('rbc-month-row')) {
          const touchX = touchStartPos.current?.x
          if (touchX) {
            const dateCells = Array.from(
              cell.querySelectorAll('.rbc-date-cell')
            )

            let closestCell = null
            let closestDistance = Infinity

            for (const dateCell of dateCells) {
              const rect = dateCell.getBoundingClientRect()
              const centerX = rect.left + rect.width / 2
              const distance = Math.abs(touchX - centerX)

              if (distance < closestDistance) {
                closestDistance = distance
                closestCell = dateCell
              }
            }

            if (closestCell) {
              const dateText = closestCell.textContent?.trim()
              if (dateText && /^\d{1,2}$/.test(dateText)) {
                const day = Number(dateText)
                const currentDate = new Date(date)
                const targetDate = new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day
                )

                console.log('Extracted date from row by position:', {
                  touchX,
                  day,
                  targetDate: targetDate.toDateString(),
                })

                return targetDate
              }
            }
          }
        }

        // Method 5: Look up the DOM tree for date information
        let parent = cell.parentElement
        while (parent && !parent.classList.contains('rbc-calendar')) {
          if (parent.classList.contains('rbc-date-cell')) {
            const dateText = parent.textContent?.trim()
            if (dateText && /^\d{1,2}$/.test(dateText)) {
              const day = Number(dateText)
              const currentDate = new Date(date)
              const targetDate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
              )

              console.log('Found date in parent element:', {
                day,
                targetDate: targetDate.toDateString(),
              })

              return targetDate
            }
          }
          parent = parent.parentElement
        }

        // Method 6: For time slots in day/week view
        if (cell.classList.contains('rbc-time-slot')) {
          const slotDate = new Date(date)
          slotDate.setHours(9, 0, 0, 0)
          console.log('Using time slot date:', slotDate.toDateString())
          return slotDate
        }

        console.warn(
          'Could not extract date from cell, using current date as fallback'
        )
        return new Date(date)
      } catch (error) {
        console.error('Error extracting date from cell:', error)
        return new Date(date)
      }
    },
    [date]
  )

  // Robust mobile touch handlers
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const touchHandledRef = useRef(false)
  const lastTapTime = useRef(0)
  const lastTapTarget = useRef<Element | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    touchHandledRef.current = false

    // Clear any existing timeout
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current)
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartPos.current) return

      const touch = e.changedTouches[0]
      const deltaX = Math.abs(touch.clientX - touchStartPos.current.x)
      const deltaY = Math.abs(touch.clientY - touchStartPos.current.y)
      const now = Date.now()

      // More lenient movement threshold for mobile
      if (deltaX < 25 && deltaY < 25) {
        const target = e.target as HTMLElement

        // More comprehensive cell detection
        const cell = target.closest(
          '.rbc-date-cell, .rbc-day-bg, .rbc-time-slot, .rbc-day-slot, .rbc-month-row'
        )

        if (
          cell &&
          !target.closest('.rbc-event, .rbc-button-link, .rbc-toolbar')
        ) {
          // Check for double tap
          const isDoubleTap =
            now - lastTapTime.current < 300 && cell === lastTapTarget.current

          e.preventDefault()
          e.stopPropagation()

          lastTapTime.current = now
          lastTapTarget.current = cell

          // Handle both single and double taps
          const handleTap = () => {
            if (!touchHandledRef.current) {
              touchHandledRef.current = true

              const cellDate = getCellDate(cell)

              if (cellDate) {
                const slotInfo = {
                  start: cellDate,
                  end: new Date(cellDate.getTime() + 60 * 60 * 1000),
                }
                console.log('Mobile tap detected, creating reservation for:', {
                  extractedDate: cellDate.toDateString(),
                  currentCalendarDate: date.toDateString(),
                  cellType: cell.className,
                  slotInfo,
                })
                handleSelectSlot(slotInfo)
              } else {
                console.warn('Could not extract date from tapped cell:', {
                  cellType: cell.className,
                  cellText: cell.textContent,
                  fallbackToCurrentDate: date.toDateString(),
                })
                // Fallback to current calendar date
                const slotInfo = {
                  start: new Date(date),
                  end: new Date(date.getTime() + 60 * 60 * 1000),
                }
                handleSelectSlot(slotInfo)
              }
            }
          }

          // Clear any existing timeout
          if (touchTimeoutRef.current) {
            clearTimeout(touchTimeoutRef.current)
          }

          if (isDoubleTap) {
            // Handle double tap immediately
            handleTap()
          } else {
            // Wait a bit to see if it's a double tap, then handle single tap
            touchTimeoutRef.current = setTimeout(() => {
              handleTap()
            }, 100)
          }
        }
      }

      // Reset after a delay
      setTimeout(() => {
        touchStartPos.current = null
        touchHandledRef.current = false
      }, 200)
    },
    [handleSelectSlot, getCellDate, date]
  )

  // Handle click events as fallback
  const handleCellClick = useCallback(
    (e: React.MouseEvent) => {
      // Only handle if touch didn't already handle it
      if (touchHandledRef.current) {
        touchHandledRef.current = false
        return
      }

      const target = e.target as HTMLElement
      const cell = target.closest('.rbc-date-cell, .rbc-day-bg, .rbc-time-slot')

      if (cell && !target.closest('.rbc-event, .rbc-button-link')) {
        const cellDate = getCellDate(cell)

        if (cellDate) {
          const slotInfo = {
            start: cellDate,
            end: new Date(cellDate.getTime() + 60 * 60 * 1000),
          }
          handleSelectSlot(slotInfo)
        }
      }
    },
    [handleSelectSlot, getCellDate]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current)
      }
    }
  }, [])

  // Custom event style based on reservation status
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const { status } = event.resource
    let backgroundColor = '#3174ad'

    switch (status) {
      case 'confirmed':
        backgroundColor = '#10b981' // green
        break
      case 'pending':
        backgroundColor = '#f59e0b' // yellow
        break
      case 'cancelled':
        backgroundColor = '#ef4444' // red
        break
      default:
        backgroundColor = '#6b7280' // gray
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        padding: '2px 4px',
      },
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading calendar...</div>
      </div>
    )
  }

  // Show calendar even without auth, but with limited functionality
  const isAuthenticated = user && tenantId
  const hasSupabase = !!supabase

  return (
    <div className="h-full">
      {/* CSS Styles for react-big-calendar */}
      <style jsx global>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-header {
          background-color: #f8fafc;
          padding: 8px;
          font-weight: 600;
          border-bottom: 1px solid #e2e8f0;
        }
        .rbc-today {
          background-color: #dbeafe;
        }
        .rbc-off-range-bg {
          background-color: #f8fafc;
        }
        .rbc-event {
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 12px;
          border: none;
        }
        .rbc-event-content {
          font-weight: 500;
        }
        .rbc-time-view .rbc-time-gutter {
          background-color: #f8fafc;
        }
        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #e5e7eb;
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
          onClick={handleCellClick}
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
            components={{
              toolbar: CustomToolbar,
            }}
            step={30}
            timeslots={2}
            min={new Date(2000, 1, 1, 8, 0, 0)} // 8 AM
            max={new Date(2000, 1, 1, 23, 0, 0)} // 11 PM
            formats={{
              timeGutterFormat: 'h:mm a',
              eventTimeRangeFormat: ({ start, end }) =>
                `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
            }}
            // Mobile-specific props
            popup={true}
            popupOffset={{ x: 10, y: 10 }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
          <span>Cancelled</span>
        </div>
      </div>
    </div>
  )
}
