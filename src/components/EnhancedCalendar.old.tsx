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
import { CustomToolbar } from './CustomToolbar'

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
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(selectedDate)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Fetch reservations
  const { reservations, loading } = useReservations(tenantId, refreshKey)

  // Convert reservations to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return reservations.map(reservation => {
      const startDate = new Date(`${reservation.date}T${reservation.time}`)
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hour duration

      // Get table identifier from joined data or fall back to table_number
      const tableDisplay =
        reservation.tables?.table_identifier ||
        reservation.table_number ||
        'N/A'

      return {
        id: reservation.id,
        title: `${reservation.customer_name} (Table ${tableDisplay})`,
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
          console.log('Method 6: Processing time slot, view:', view)

          // Get the day-slot container to determine which day in week view
          const daySlot = cell.closest('.rbc-day-slot')
          let targetDate = new Date(date)

          // For day view, use the current calendar date
          if (view === Views.DAY) {
            console.log(
              'Day view detected, using calendar date:',
              date.toDateString()
            )
            targetDate = new Date(date)
          }

          // For week view, determine which day column we're in
          if (view === Views.WEEK && daySlot) {
            console.log('Week view detected, finding day column')
            const timeContent = document.querySelector('.rbc-time-content')
            if (timeContent) {
              const allDaySlots = Array.from(
                timeContent.querySelectorAll('.rbc-day-slot')
              )
              const columnIndex = allDaySlots.indexOf(daySlot as Element)

              if (columnIndex >= 0) {
                // Get the header to find the actual date for this column
                const headers = document.querySelectorAll(
                  '.rbc-time-header-content .rbc-header'
                )
                if (headers[columnIndex]) {
                  const headerText = headers[columnIndex].textContent?.trim()
                  console.log('Week view header text:', headerText)

                  // Try to parse the date from header (usually shows "Mon 10/21" or similar)
                  const dateMatch = headerText?.match(/(\d{1,2})\/(\d{1,2})/)
                  if (dateMatch) {
                    const month = parseInt(dateMatch[1]) - 1
                    const day = parseInt(dateMatch[2])
                    targetDate = new Date(date.getFullYear(), month, day)
                  } else {
                    // Fallback: calculate from Sunday
                    const weekStart = new Date(date)
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
                    targetDate = new Date(weekStart)
                    targetDate.setDate(targetDate.getDate() + columnIndex)
                  }

                  console.log('Determined week day from column:', {
                    columnIndex,
                    targetDate: targetDate.toDateString(),
                  })
                }
              }
            }
          }

          // Now get the time from the time slot
          let timeFound = false

          // Find the timeslot-group parent
          const timeslotGroup = cell.closest('.rbc-timeslot-group')
          console.log('Found timeslot-group:', !!timeslotGroup)

          if (timeslotGroup) {
            // Get the index of this time slot within the group (0 or 1)
            const timeSlots = timeslotGroup.querySelectorAll('.rbc-time-slot')
            const slotIndex = Array.from(timeSlots).indexOf(cell as Element)
            console.log(
              'Slot index within group:',
              slotIndex,
              '(0=first 30min, 1=second 30min)'
            )

            // Find the time label - need to look in the corresponding gutter row
            // The gutter is a sibling structure, so we need to find it by position
            let timeGutter = null

            // Method 1: Try to find label as sibling of timeslot-group
            const parentRow = timeslotGroup.parentElement
            if (parentRow) {
              timeGutter = parentRow.querySelector('.rbc-label')
              console.log(
                'Method 1 (parent row) found gutter:',
                !!timeGutter,
                timeGutter?.textContent
              )
            }

            // Method 2: Find by matching position in the time-gutter column
            if (!timeGutter) {
              // Find the day-slot container to search within (for week view with multiple columns)
              const daySlot = cell.closest('.rbc-day-slot')

              let allTimeslotGroups: Element[]

              if (daySlot) {
                // In day/week view, search only within this day column
                allTimeslotGroups = Array.from(
                  daySlot.querySelectorAll('.rbc-timeslot-group')
                )
              } else {
                // Fallback: search all
                allTimeslotGroups = Array.from(
                  document.querySelectorAll(
                    '.rbc-time-content .rbc-timeslot-group'
                  )
                )
              }

              const groupIndex = allTimeslotGroups.indexOf(
                timeslotGroup as Element
              )
              console.log(
                'Method 2: Group index in day-slot:',
                groupIndex,
                'out of',
                allTimeslotGroups.length
              )

              if (groupIndex >= 0) {
                const gutterGroups = document.querySelectorAll(
                  '.rbc-time-gutter .rbc-timeslot-group'
                )
                console.log('Found gutter groups:', gutterGroups.length)

                if (gutterGroups[groupIndex]) {
                  timeGutter =
                    gutterGroups[groupIndex].querySelector('.rbc-label')
                  console.log(
                    'Method 2 found gutter:',
                    !!timeGutter,
                    timeGutter?.textContent
                  )
                }
              }
            }

            if (timeGutter) {
              const timeText = timeGutter.textContent?.trim()
              console.log(
                'Time gutter text:',
                timeText,
                'slotIndex:',
                slotIndex
              )

              if (timeText) {
                // Parse time (e.g., "9:00 AM", "2:30 PM", "14:00")
                const timeMatch = timeText.match(
                  /(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i
                )
                if (timeMatch) {
                  let hours = parseInt(timeMatch[1])
                  let minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
                  const period = timeMatch[3]?.toUpperCase()

                  // Convert to 24-hour format
                  if (period === 'PM' && hours !== 12) {
                    hours += 12
                  } else if (period === 'AM' && hours === 12) {
                    hours = 0
                  }

                  // Add 30 minutes if this is the second slot in the group
                  if (slotIndex === 1) {
                    minutes += 30
                    if (minutes >= 60) {
                      hours += 1
                      minutes -= 60
                    }
                  }

                  targetDate.setHours(hours, minutes, 0, 0)
                  timeFound = true

                  console.log('Extracted time from gutter:', {
                    timeText,
                    slotIndex,
                    hours,
                    minutes,
                    result: targetDate.toLocaleString(),
                  })
                }
              }
            } else {
              console.warn('Could not find time gutter label')
            }
          }

          // Fallback if time couldn't be determined
          if (!timeFound) {
            targetDate.setHours(9, 0, 0, 0)
            console.log('Using fallback time 9:00 AM')
          }

          console.log('Method 6 returning:', targetDate.toLocaleString())
          return targetDate
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
    [date, view]
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
        let cell = target.closest(
          '.rbc-date-cell, .rbc-day-bg, .rbc-time-slot, .rbc-day-slot, .rbc-month-row'
        )

        // If we hit a day-slot container, find the specific time-slot at the touch position
        if (cell?.classList.contains('rbc-day-slot')) {
          const daySlot = cell as HTMLElement
          const touchY = touch.clientY

          // Find all timeslot groups in this day column
          const timeslotGroups = Array.from(
            daySlot.querySelectorAll('.rbc-timeslot-group')
          )

          // Find which timeslot group was tapped based on Y position
          for (const group of timeslotGroups) {
            const rect = group.getBoundingClientRect()
            if (touchY >= rect.top && touchY <= rect.bottom) {
              // Found the group, now find which slot (first or second half)
              const timeSlots = group.querySelectorAll('.rbc-time-slot')
              const halfHeight = rect.height / 2
              const relativeY = touchY - rect.top

              if (relativeY < halfHeight && timeSlots[0]) {
                cell = timeSlots[0] // First 30 min slot
              } else if (timeSlots[1]) {
                cell = timeSlots[1] // Second 30 min slot
              }
              break
            }
          }
        }

        console.log('Touch end on cell:', {
          className: cell?.className,
          element: cell,
        })

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
