import { View, Views } from 'react-big-calendar'

/**
 * Extract date and time from a calendar cell element
 * Handles both month view (date cells) and day/week view (time slots)
 */
export function extractDateFromCell(
  cell: Element,
  currentDate: Date,
  view: View,
  touchStartPos: { x: number; y: number } | null
): Date | null {
  try {
    // Method 1: Data attributes
    const dateAttr = cell.getAttribute('data-date')
    if (dateAttr) {
      return new Date(dateAttr)
    }

    // Method 2: Month view - date cells
    if (cell.classList.contains('rbc-date-cell')) {
      return extractDateFromDateCell(cell, currentDate)
    }

    // Method 3: Month view - day background cells
    if (cell.classList.contains('rbc-day-bg')) {
      return extractDateFromDayBg(cell, currentDate)
    }

    // Method 4: Month view - row tap
    if (cell.classList.contains('rbc-month-row') && touchStartPos) {
      return extractDateFromRow(cell, currentDate, touchStartPos.x)
    }

    // Method 5: Day/Week view - time slots
    if (cell.classList.contains('rbc-time-slot')) {
      return extractDateFromTimeSlot(cell, currentDate, view)
    }

    // Method 6: Parent search
    return findDateInParents(cell, currentDate)
  } catch (error) {
    console.error('Error extracting date from cell:', error)
    return null
  }
}

function extractDateFromDateCell(
  cell: Element,
  currentDate: Date
): Date | null {
  const dateText = cell.textContent?.trim()
  if (dateText && /^\d{1,2}$/.test(dateText)) {
    const day = Number(dateText)
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
  }
  return null
}

function extractDateFromDayBg(cell: Element, currentDate: Date): Date | null {
  const row = cell.closest('.rbc-month-row')
  if (!row) return null

  const dayBgs = Array.from(row.querySelectorAll('.rbc-day-bg'))
  const index = dayBgs.indexOf(cell)
  if (index < 0) return null

  const dateCells = Array.from(row.querySelectorAll('.rbc-date-cell'))
  const dateCell = dateCells[index]
  if (!dateCell) return null

  return extractDateFromDateCell(dateCell, currentDate)
}

function extractDateFromRow(
  cell: Element,
  currentDate: Date,
  touchX: number
): Date | null {
  const dateCells = Array.from(cell.querySelectorAll('.rbc-date-cell'))

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

  return closestCell ? extractDateFromDateCell(closestCell, currentDate) : null
}

function findDateInParents(cell: Element, currentDate: Date): Date | null {
  let parent = cell.parentElement
  while (parent && !parent.classList.contains('rbc-calendar')) {
    if (parent.classList.contains('rbc-date-cell')) {
      const result = extractDateFromDateCell(parent, currentDate)
      if (result) return result
    }
    parent = parent.parentElement
  }
  return null
}

function extractDateFromTimeSlot(
  cell: Element,
  currentDate: Date,
  view: View
): Date | null {
  const daySlot = cell.closest('.rbc-day-slot')
  let targetDate = new Date(currentDate)

  // For week view, determine which day column
  if (view === Views.WEEK && daySlot) {
    const weekDate = getWeekDayFromColumn(daySlot, currentDate)
    if (weekDate) targetDate = weekDate
  }

  // Extract time from the time slot
  const time = extractTimeFromSlot(cell, daySlot)
  if (time) {
    targetDate.setHours(time.hours, time.minutes, 0, 0)
    return targetDate
  }

  // Fallback time
  targetDate.setHours(9, 0, 0, 0)
  return targetDate
}

function getWeekDayFromColumn(
  daySlot: Element,
  currentDate: Date
): Date | null {
  const timeContent = document.querySelector('.rbc-time-content')
  if (!timeContent) return null

  const allDaySlots = Array.from(timeContent.querySelectorAll('.rbc-day-slot'))
  const columnIndex = allDaySlots.indexOf(daySlot)
  if (columnIndex < 0) return null

  // Try to parse from header
  const headers = document.querySelectorAll(
    '.rbc-time-header-content .rbc-header'
  )
  if (headers[columnIndex]) {
    const headerText = headers[columnIndex].textContent?.trim()
    const dateMatch = headerText?.match(/(\d{1,2})\/(\d{1,2})/)
    if (dateMatch) {
      const month = parseInt(dateMatch[1]) - 1
      const day = parseInt(dateMatch[2])
      return new Date(currentDate.getFullYear(), month, day)
    }
  }

  // Fallback: calculate from week start
  const weekStart = new Date(currentDate)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const result = new Date(weekStart)
  result.setDate(result.getDate() + columnIndex)
  return result
}

function extractTimeFromSlot(
  cell: Element,
  daySlot: Element | null
): { hours: number; minutes: number } | null {
  const timeslotGroup = cell.closest('.rbc-timeslot-group')
  if (!timeslotGroup) return null

  // Get slot index (0 or 1 for 30-minute intervals)
  const timeSlots = timeslotGroup.querySelectorAll('.rbc-time-slot')
  const slotIndex = Array.from(timeSlots).indexOf(cell as Element)

  // Find corresponding time gutter label
  const timeGutter = findTimeGutter(timeslotGroup, daySlot)
  if (!timeGutter) return null

  const timeText = timeGutter.textContent?.trim()
  if (!timeText) return null

  // Parse time
  const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i)
  if (!timeMatch) return null

  let hours = parseInt(timeMatch[1])
  let minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
  const period = timeMatch[3]?.toUpperCase()

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }

  // Add 30 minutes if second slot
  if (slotIndex === 1) {
    minutes += 30
    if (minutes >= 60) {
      hours += 1
      minutes -= 60
    }
  }

  return { hours, minutes }
}

function findTimeGutter(
  timeslotGroup: Element,
  daySlot: Element | null
): Element | null {
  // Method 1: Try parent row
  const parentRow = timeslotGroup.parentElement
  if (parentRow) {
    const gutter = parentRow.querySelector('.rbc-label')
    if (gutter) return gutter
  }

  // Method 2: Match by position in day-slot
  let allTimeslotGroups: Element[]

  if (daySlot) {
    allTimeslotGroups = Array.from(
      daySlot.querySelectorAll('.rbc-timeslot-group')
    )
  } else {
    allTimeslotGroups = Array.from(
      document.querySelectorAll('.rbc-time-content .rbc-timeslot-group')
    )
  }

  const groupIndex = allTimeslotGroups.indexOf(timeslotGroup)
  if (groupIndex < 0) return null

  const gutterGroups = document.querySelectorAll(
    '.rbc-time-gutter .rbc-timeslot-group'
  )
  if (!gutterGroups[groupIndex]) return null

  return gutterGroups[groupIndex].querySelector('.rbc-label')
}

/**
 * Find specific time slot element from touch position
 */
export function findTimeSlotFromTouch(
  daySlot: HTMLElement,
  touchY: number
): Element | null {
  const timeslotGroups = Array.from(
    daySlot.querySelectorAll('.rbc-timeslot-group')
  )

  for (const group of timeslotGroups) {
    const rect = group.getBoundingClientRect()
    if (touchY >= rect.top && touchY <= rect.bottom) {
      const timeSlots = group.querySelectorAll('.rbc-time-slot')
      const halfHeight = rect.height / 2
      const relativeY = touchY - rect.top

      if (relativeY < halfHeight && timeSlots[0]) {
        return timeSlots[0] // First 30 min slot
      } else if (timeSlots[1]) {
        return timeSlots[1] // Second 30 min slot
      }
    }
  }

  return null
}

/**
 * Get event style for calendar events
 */
export function getEventStyle(_event?: unknown) {
  return {
    style: {
      backgroundColor: 'rgb(var(--color-accent))',
      borderRadius: '4px',
      opacity: 0.85,
      color: 'rgb(var(--color-accent-fg))',
      border: '0px',
      display: 'block',
      fontSize: '12px',
      padding: '2px 4px',
    },
  }
}
