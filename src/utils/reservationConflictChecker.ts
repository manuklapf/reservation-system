/**
 * Utility functions for checking reservation conflicts
 */

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Check if two time ranges overlap
 * If end time is missing, assumes 1 hour duration
 */
export const timesOverlap = (
  time1: string,
  endTime1: string | null | undefined,
  time2: string,
  endTime2: string | null | undefined
): boolean => {
  const t1 = timeToMinutes(time1)
  const t2 = timeToMinutes(time2)
  // If end time is missing, assume 1 hour duration
  const e1 = endTime1 ? timeToMinutes(endTime1) : t1 + 60
  const e2 = endTime2 ? timeToMinutes(endTime2) : t2 + 60

  // Check if ranges overlap (using < to exclude boundary cases)
  return t1 < e2 && t2 < e1
}

/**
 * Check if times are within ±1 hour
 */
export const withinOneHour = (time1: string, time2: string): boolean => {
  const t1 = timeToMinutes(time1)
  const t2 = timeToMinutes(time2)
  const diff = Math.abs(t1 - t2)
  return diff < 60
}
