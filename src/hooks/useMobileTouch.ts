import { useRef, useCallback, useEffect } from 'react'
import { View } from 'react-big-calendar'
import {
  extractDateFromCell,
  findTimeSlotFromTouch,
} from '@/utils/calendarHelpers'

interface UseMobileTouchOptions {
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void
  currentDate: Date
  view: View
}

export function useMobileTouch({
  onSelectSlot,
  currentDate,
  view,
}: UseMobileTouchOptions) {
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const touchHandledRef = useRef(false)
  const lastTapTime = useRef(0)
  const lastTapTarget = useRef<Element | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    touchHandledRef.current = false

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

      // Check if it's a tap (not a swipe)
      if (deltaX < 25 && deltaY < 25) {
        const target = e.target as HTMLElement
        let cell = target.closest(
          '.rbc-date-cell, .rbc-day-bg, .rbc-time-slot, .rbc-day-slot, .rbc-month-row'
        )

        // Special handling for day-slot: find specific time slot
        if (cell?.classList.contains('rbc-day-slot')) {
          const specificSlot = findTimeSlotFromTouch(
            cell as HTMLElement,
            touch.clientY
          )
          if (specificSlot) cell = specificSlot
        }

        // Ignore taps on events, buttons, or toolbar
        if (
          cell &&
          !target.closest('.rbc-event, .rbc-button-link, .rbc-toolbar')
        ) {
          const isDoubleTap =
            now - lastTapTime.current < 300 && cell === lastTapTarget.current

          e.preventDefault()
          e.stopPropagation()

          lastTapTime.current = now
          lastTapTarget.current = cell

          const handleTap = () => {
            if (!touchHandledRef.current) {
              touchHandledRef.current = true

              const cellDate = extractDateFromCell(
                cell,
                currentDate,
                view,
                touchStartPos.current
              )

              if (cellDate) {
                onSelectSlot({
                  start: cellDate,
                  end: new Date(cellDate.getTime() + 60 * 60 * 1000),
                })
              } else {
                // Fallback to current date
                onSelectSlot({
                  start: new Date(currentDate),
                  end: new Date(currentDate.getTime() + 60 * 60 * 1000),
                })
              }
            }
          }

          if (touchTimeoutRef.current) {
            clearTimeout(touchTimeoutRef.current)
          }

          if (isDoubleTap) {
            handleTap()
          } else {
            touchTimeoutRef.current = setTimeout(handleTap, 100)
          }
        }
      }

      // Reset after delay
      setTimeout(() => {
        touchStartPos.current = null
        touchHandledRef.current = false
      }, 200)
    },
    [onSelectSlot, currentDate, view]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Skip if touch already handled it
      if (touchHandledRef.current) {
        touchHandledRef.current = false
        return
      }

      const target = e.target as HTMLElement
      const cell = target.closest('.rbc-date-cell, .rbc-day-bg, .rbc-time-slot')

      if (cell && !target.closest('.rbc-event, .rbc-button-link')) {
        const cellDate = extractDateFromCell(
          cell,
          currentDate,
          view,
          touchStartPos.current
        )

        if (cellDate) {
          onSelectSlot({
            start: cellDate,
            end: new Date(cellDate.getTime() + 60 * 60 * 1000),
          })
        }
      }
    },
    [onSelectSlot, currentDate, view]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current)
      }
    }
  }, [])

  return {
    handleTouchStart,
    handleTouchEnd,
    handleClick,
  }
}
