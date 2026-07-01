export interface IcsParams {
  id: string
  tenantName: string
  date: string        // YYYY-MM-DD
  time: string        // HH:MM
  endTime?: string | null
  partySize: number
  notes?: string | null
}

export function generateIcs(params: IcsParams): string {
  const { id, tenantName, date, time, endTime, partySize, notes } = params

  const [year, month, day] = date.split('-')
  const [startHour, startMin] = time.split(':')

  let endHour: string
  let endMin: string
  if (endTime) {
    ;[endHour, endMin] = endTime.split(':')
  } else {
    // Default: 1 hour after start
    const h = (parseInt(startHour) + 1) % 24
    endHour = String(h).padStart(2, '0')
    endMin = startMin
  }

  const dtStart = `${year}${month}${day}T${startHour}${startMin}00`
  const dtEnd = `${year}${month}${day}T${endHour}${endMin}00`
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

  const description = [
    `Party of ${partySize}`,
    notes ? `Special requests: ${notes}` : '',
  ]
    .filter(Boolean)
    .join('\\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Restaurant Reservation System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:reservation-${id}@reservation-system`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Reservation at ${tenantName}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${tenantName}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.join('\r\n')
}
