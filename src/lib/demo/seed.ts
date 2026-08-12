import {
  DEMO_CLOSED_WEEKDAY,
  DEMO_FLOORS,
  DEMO_STAFF,
  FIRST_NAMES,
  LAST_NAMES,
  REQUEST_NOTES,
  RESERVATION_NOTES,
  type BlueprintTable,
} from './blueprint'

/**
 * Generates the reservation book of a busy restaurant relative to "now", so a
 * demo sandbox provisioned at any moment looks like a live service: today's
 * lunch and dinner are already booked, the next weekend is nearly full, and
 * bookings thin out toward the end of the horizon.
 *
 * The generator is deterministic for a given seed and never double-books a
 * table — the app's own conflict checker would flag overlaps otherwise.
 */

/** Reservations are generated from two days back to three weeks ahead. */
const DAYS_BACK = 2
const DAYS_AHEAD = 20

/** Minutes a table is blocked after a party leaves, for resetting the table. */
const TURNOVER_BUFFER = 15

/** Latest end time we allow, so a late seating never spills past midnight. */
const LAST_END_MINUTE = 23 * 60 + 45

/** Average covers per service before weekday/horizon factors are applied. */
const LUNCH_BASE = 12
const DINNER_BASE = 30

/** Share of reservations that arrived through the public request widget. */
const WIDGET_SHARE = 0.12

export interface SeedReservation {
  customer_name: string
  customer_phone: string
  customer_email: string | null
  date: string
  time: string
  end_time: string
  party_size: number
  notes: string | null
  /** Blueprint table keys; resolved to real table ids at insert time. */
  tableKeys: string[]
  is_requested: boolean
  approved_by: string | null
}

// ── Random helpers ─────────────────────────────────────────────────────────

/** Small deterministic PRNG (mulberry32) — same seed, same restaurant book. */
function makeRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rng = () => number

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}

function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min)
}

function chance(rng: Rng, probability: number): boolean {
  return rng() < probability
}

function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ── Date / time helpers ────────────────────────────────────────────────────

/** Local calendar date as YYYY-MM-DD (the app stores and compares dates local). */
function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  next.setHours(12, 0, 0, 0)
  return next
}

function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── Guest helpers ──────────────────────────────────────────────────────────

const UMLAUTS: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
  ç: 'c',
  ş: 's',
  ı: 'i',
}

function emailSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[äöüßçşı]/g, c => UMLAUTS[c] ?? c)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

function guestName(rng: Rng): string {
  return `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`
}

/** Example.com addresses only — demo mail must never reach a real inbox. */
function guestEmail(name: string): string {
  const [first, last] = name.split(' ')
  return `${emailSlug(first)}.${emailSlug(last)}@example.com`
}

function guestPhone(rng: Rng): string {
  const digits = (count: number) =>
    Array.from({ length: count }, () => Math.floor(rng() * 10)).join('')
  if (chance(rng, 0.25)) {
    // Landline, written the way a host would jot it down.
    return `+49 ${pick(rng, ['30', '40', '69', '89', '221', '711'])} ${digits(7)}`
  }
  return `+49 ${pick(rng, ['151', '152', '157', '160', '170', '171', '172', '176', '177', '179'])} ${digits(7)}`
}

function partySize(rng: Rng): number {
  const roll = rng()
  if (roll < 0.4) return 2
  if (roll < 0.55) return 3
  if (roll < 0.77) return 4
  if (roll < 0.84) return 5
  if (roll < 0.92) return 6
  if (roll < 0.94) return 7
  if (roll < 0.97) return 8
  return 9 + Math.floor(rng() * 4) // 9–12: needs two tables pushed together
}

function seatingMinutes(size: number): number {
  if (size <= 2) return 90
  if (size <= 4) return 105
  if (size <= 6) return 120
  return 150
}

// ── Service planning ───────────────────────────────────────────────────────

interface Service {
  /** Earliest seating, in minutes since midnight. */
  from: number
  /** Latest seating. */
  to: number
  /** Busiest seating time — starts cluster around it. */
  peak: number
  base: number
}

/** How full each weekday runs (index 0 = Sunday). Monday is the closing day. */
const WEEKDAY_FACTOR = [0.85, 0, 0.6, 0.7, 0.85, 1.0, 1.15]

function servicesFor(weekday: number): Service[] {
  if (weekday === 0) {
    return [
      {
        from: 11 * 60,
        to: 14 * 60 + 30,
        peak: 12 * 60 + 30,
        base: LUNCH_BASE * 1.4,
      },
      {
        from: 17 * 60 + 30,
        to: 20 * 60 + 30,
        peak: 18 * 60 + 45,
        base: DINNER_BASE * 0.8,
      },
    ]
  }
  const isWeekend = weekday === 5 || weekday === 6
  return [
    {
      from: 11 * 60 + 45,
      to: 13 * 60 + 45,
      peak: 12 * 60 + 30,
      base: LUNCH_BASE,
    },
    {
      from: 17 * 60 + 30,
      to: isWeekend ? 21 * 60 + 30 : 21 * 60,
      peak: isWeekend ? 20 * 60 : 19 * 60 + 30,
      base: DINNER_BASE,
    },
  ]
}

/**
 * How far ahead guests have booked: the next few days are full, the following
 * week is filling up, and the far end of the horizon is still mostly open.
 */
function horizonFactor(dayOffset: number): number {
  if (dayOffset <= 6) return 1
  if (dayOffset <= 13) return 0.55
  return 0.3
}

/** Picks a seating time biased toward the peak of the service. */
function seatingTime(rng: Rng, service: Service): number {
  const slots = Math.floor((service.to - service.from) / 15)
  const a = Math.round(between(rng, 0, slots))
  const b = Math.round(between(rng, 0, slots))
  const peakSlot = (service.peak - service.from) / 15
  const closest = Math.abs(a - peakSlot) <= Math.abs(b - peakSlot) ? a : b
  return service.from + closest * 15
}

// ── Table assignment ───────────────────────────────────────────────────────

interface FloorTables {
  floorKey: string
  tables: BlueprintTable[]
}

const FLOOR_TABLES: FloorTables[] = DEMO_FLOORS.map(floor => ({
  floorKey: floor.key,
  tables: floor.tables,
}))

const ALL_TABLES: BlueprintTable[] = DEMO_FLOORS.flatMap(floor => floor.tables)

type Bookings = Map<string, { from: number; to: number }[]>

function isFree(bookings: Bookings, key: string, from: number, to: number) {
  const slots = bookings.get(key)
  if (!slots) return true
  return !slots.some(
    slot => from < slot.to + TURNOVER_BUFFER && slot.from - TURNOVER_BUFFER < to
  )
}

function book(bookings: Bookings, key: string, from: number, to: number) {
  const slots = bookings.get(key) ?? []
  slots.push({ from, to })
  bookings.set(key, slots)
}

/**
 * Seats a party on the smallest free table that fits, falling back to two
 * tables pushed together for large groups. Returns null when the house is
 * full at that time — which is exactly what a busy evening should look like.
 */
function assignTables(
  rng: Rng,
  bookings: Bookings,
  size: number,
  from: number,
  to: number
): BlueprintTable[] | null {
  const singles = shuffled(rng, ALL_TABLES)
    .filter(t => t.capacity >= size)
    .sort((a, b) => a.capacity - b.capacity)

  for (const candidate of singles) {
    if (isFree(bookings, candidate.key, from, to)) return [candidate]
  }

  // Large party: combine two tables on the same floor.
  for (const floor of shuffled(rng, FLOOR_TABLES)) {
    const free = floor.tables.filter(t => isFree(bookings, t.key, from, to))
    const byCapacity = [...free].sort((a, b) => b.capacity - a.capacity)
    for (let i = 0; i < byCapacity.length; i++) {
      for (let j = i + 1; j < byCapacity.length; j++) {
        if (byCapacity[i].capacity + byCapacity[j].capacity >= size) {
          return [byCapacity[i], byCapacity[j]]
        }
      }
    }
  }

  return null
}

// ── Generator ──────────────────────────────────────────────────────────────

function makeReservation(
  rng: Rng,
  date: string,
  from: number,
  to: number,
  size: number,
  tables: BlueprintTable[]
): SeedReservation {
  const name = guestName(rng)
  const viaWidget = chance(rng, WIDGET_SHARE)
  const hasEmail = viaWidget || chance(rng, 0.45)

  return {
    customer_name: name,
    customer_phone: guestPhone(rng),
    customer_email: hasEmail ? guestEmail(name) : null,
    date,
    time: toTime(from),
    end_time: toTime(to),
    party_size: size,
    notes: chance(rng, 0.32) ? pick(rng, RESERVATION_NOTES) : null,
    tableKeys: tables.map(t => t.key),
    is_requested: viaWidget,
    // Widget requests only show up in the book once a staff member approved
    // them; anything else was entered by the team directly.
    approved_by: pick(rng, DEMO_STAFF).name,
  }
}

/** Pending guest requests waiting in the mailbox, unassigned and unapproved. */
function buildPendingRequests(rng: Rng, today: Date): SeedReservation[] {
  const requests: SeedReservation[] = []
  const count = 4 + Math.floor(rng() * 3)

  for (let i = 0; i < count; i++) {
    const day = addDays(today, 1 + Math.floor(rng() * 8))
    if (day.getDay() === DEMO_CLOSED_WEEKDAY) continue

    const service = servicesFor(day.getDay())[1]
    const from = seatingTime(rng, service)
    const size = Math.min(partySize(rng), 8)
    const name = guestName(rng)
    const note = pick(rng, REQUEST_NOTES)

    requests.push({
      customer_name: name,
      customer_phone: guestPhone(rng),
      customer_email: guestEmail(name),
      date: toISODate(day),
      time: toTime(from),
      end_time: toTime(Math.min(from + seatingMinutes(size), LAST_END_MINUTE)),
      party_size: size,
      notes: note || null,
      tableKeys: [],
      is_requested: true,
      approved_by: null,
    })
  }

  return requests
}

/**
 * Builds the full demo book: seated reservations across the horizon plus a
 * handful of unanswered guest requests for the mailbox.
 */
export function buildDemoReservations(
  now: Date = new Date(),
  seed: number = Math.floor(Math.random() * 2 ** 31)
): SeedReservation[] {
  const rng = makeRng(seed)
  const today = new Date(now)
  today.setHours(12, 0, 0, 0)

  const reservations: SeedReservation[] = []

  for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset++) {
    const day = addDays(today, offset)
    const weekday = day.getDay()
    if (weekday === DEMO_CLOSED_WEEKDAY) continue

    const date = toISODate(day)
    const bookings: Bookings = new Map()

    for (const service of servicesFor(weekday)) {
      const target = Math.round(
        service.base *
          WEEKDAY_FACTOR[weekday] *
          horizonFactor(offset) *
          between(rng, 0.85, 1.15)
      )

      for (let i = 0; i < target; i++) {
        const size = partySize(rng)
        const from = seatingTime(rng, service)
        const to = Math.min(from + seatingMinutes(size), LAST_END_MINUTE)
        const tables = assignTables(rng, bookings, size, from, to)
        if (!tables) continue // fully booked at that time

        for (const t of tables) book(bookings, t.key, from, to)
        reservations.push(makeReservation(rng, date, from, to, size, tables))
      }
    }
  }

  return [...reservations, ...buildPendingRequests(rng, today)]
}
