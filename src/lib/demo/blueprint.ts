import type { Obstacle } from '@/components/floor-plan/types'

/**
 * Static blueprint of the demo restaurant: two floors, their tables and the
 * fixed furniture drawn around them. Coordinates are canvas pixels for the
 * 832x480 floor-plan canvas (see components/floor-plan/constants.ts) and are
 * snapped to the 10px grid the editor uses.
 *
 * Reservations are *not* part of the blueprint — they are generated relative to
 * the current date in seed.ts so a demo is never stale.
 */

export const DEMO_RESTAURANT_NAME = 'Restaurant Sonnenhof'

/** Weekly closing day (0 = Sunday … 1 = Monday). No reservations land here. */
export const DEMO_CLOSED_WEEKDAY = 1

/** Table fill colors by seat count, so the floor plan reads at a glance. */
const COLOR_BY_CAPACITY: Record<number, string> = {
  2: '#a8dadc',
  4: '#4ecdc4',
  6: '#f4a261',
  8: '#ef476f',
}

export interface BlueprintTable {
  /** Stable key used to wire generated reservations to the inserted table row. */
  key: string
  identifier: string
  capacity: number
  shape: 'square' | 'round'
  x: number
  y: number
  w: number
  h: number
}

export interface BlueprintFloor {
  key: string
  name: string
  sortOrder: number
  tables: BlueprintTable[]
  obstacles: Obstacle[]
}

function table(
  key: string,
  identifier: string,
  capacity: number,
  shape: 'square' | 'round',
  x: number,
  y: number,
  w: number,
  h: number
): BlueprintTable {
  return { key, identifier, capacity, shape, x, y, w, h }
}

function obstacle(
  id: string,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  outlined = false
): Obstacle {
  return { id, type: 'block', label, x, y, w, h, outlined }
}

export const DEMO_FLOORS: BlueprintFloor[] = [
  {
    key: 'main',
    name: 'Hauptraum',
    sortOrder: 0,
    tables: [
      // Window row
      table('m1', '1', 2, 'round', 40, 70, 60, 60),
      table('m2', '2', 2, 'round', 130, 70, 60, 60),
      table('m3', '3', 4, 'square', 220, 70, 80, 80),
      table('m4', '4', 4, 'square', 330, 70, 80, 80),
      table('m5', '5', 4, 'square', 440, 70, 80, 80),
      table('m6', '6', 6, 'square', 550, 70, 120, 80),
      table('m7', '7', 4, 'square', 700, 70, 80, 80),
      // Middle row
      table('m8', '8', 4, 'square', 40, 190, 80, 80),
      table('m9', '9', 4, 'square', 150, 190, 80, 80),
      table('m10', '10', 6, 'square', 260, 190, 120, 80),
      table('m11', '11', 6, 'square', 410, 190, 120, 80),
      table('m12', '12', 4, 'round', 560, 190, 80, 80),
      table('m13', '13', 6, 'round', 670, 190, 100, 100),
      // Back row: the two long tables for groups
      table('m14', '14', 8, 'square', 40, 340, 160, 80),
      table('m15', '15', 8, 'square', 230, 340, 160, 80),
      table('m16', '16', 4, 'square', 420, 340, 80, 80),
      table('m17', '17', 2, 'round', 530, 340, 60, 60),
      table('m18', '18', 2, 'round', 620, 340, 60, 60),
    ],
    obstacles: [
      obstacle('demo_obs_kitchen', 'Küche', 0, 0, 200, 40),
      obstacle('demo_obs_entrance', 'Eingang', 632, 0, 200, 40, true),
      obstacle('demo_obs_bar', 'Bar', 700, 330, 110, 110),
    ],
  },
  {
    key: 'terrace',
    name: 'Terrasse',
    sortOrder: 1,
    tables: [
      table('t1', 'T1', 2, 'round', 60, 90, 60, 60),
      table('t2', 'T2', 2, 'round', 160, 90, 60, 60),
      table('t3', 'T3', 4, 'square', 260, 90, 80, 80),
      table('t4', 'T4', 4, 'square', 370, 90, 80, 80),
      table('t5', 'T5', 4, 'square', 480, 90, 80, 80),
      table('t6', 'T6', 6, 'square', 590, 90, 120, 80),
      table('t7', 'T7', 8, 'square', 60, 250, 160, 80),
      table('t8', 'T8', 6, 'square', 260, 250, 120, 80),
      table('t9', 'T9', 4, 'square', 420, 250, 80, 80),
      table('t10', 'T10', 2, 'round', 530, 250, 60, 60),
    ],
    obstacles: [
      obstacle('demo_obs_service', 'Ausgabe', 720, 90, 90, 90),
      obstacle('demo_obs_railing', 'Geländer', 0, 420, 832, 50, true),
    ],
  },
]

export function tableColor(capacity: number): string {
  return COLOR_BY_CAPACITY[capacity] ?? '#4ecdc4'
}

/** The demo team. The first entry is the account the visitor is signed in as. */
export const DEMO_STAFF = [
  { name: 'Lena Hofmann', role: 'admin' as const },
  { name: 'Jonas Weber', role: 'staff' as const },
  { name: 'Marie Kaufmann', role: 'staff' as const },
  { name: 'Tobias Richter', role: 'staff' as const },
]

export const FIRST_NAMES = [
  'Anna',
  'Lukas',
  'Sophie',
  'Maximilian',
  'Marie',
  'Felix',
  'Laura',
  'Jonas',
  'Hannah',
  'Elias',
  'Emilia',
  'Paul',
  'Lena',
  'Noah',
  'Charlotte',
  'Leon',
  'Mia',
  'Ben',
  'Clara',
  'Julian',
  'Katharina',
  'Sebastian',
  'Franziska',
  'Andreas',
  'Christina',
  'Michael',
  'Julia',
  'Stefan',
  'Sabine',
  'Thomas',
  'Nicole',
  'Martin',
  'Petra',
  'Daniel',
  'Vanessa',
  'Matteo',
  'Ayşe',
  'Mehmet',
  'Ivana',
  'Piotr',
]

export const LAST_NAMES = [
  'Müller',
  'Schmidt',
  'Schneider',
  'Fischer',
  'Weber',
  'Meyer',
  'Wagner',
  'Becker',
  'Schulz',
  'Hoffmann',
  'Koch',
  'Bauer',
  'Richter',
  'Klein',
  'Wolf',
  'Neumann',
  'Schwarz',
  'Zimmermann',
  'Braun',
  'Krüger',
  'Hartmann',
  'Lange',
  'Werner',
  'Krause',
  'Lehmann',
  'Köhler',
  'Herrmann',
  'Walter',
  'Maier',
  'Kaufmann',
  'Yilmaz',
  'Nowak',
  'Rossi',
  'Petrov',
]

/** Guest notes, roughly in the tone a host would actually type at the pass. */
export const RESERVATION_NOTES = [
  'Fensterplatz gewünscht',
  'Geburtstag – Torte wird mitgebracht',
  'Hochzeitstag',
  'Kinderstuhl benötigt',
  'Allergie: Nüsse',
  'Allergie: Gluten',
  'Vegetarisches Menü vorbestellt',
  'Stammgast',
  'Firmenessen, Rechnung auf Firma',
  'Ruhiger Tisch erbeten',
  'Kommt eventuell 15 Min. später',
  'Hund kommt mit',
  'Rollstuhlgerechter Zugang nötig',
  'Terrasse bevorzugt',
  'Weinbegleitung gewünscht',
  'Gutschein wird eingelöst',
  'Große Gruppe, getrennte Rechnungen',
  'Menü vorbestellt: 3 Gänge',
]

/** Notes guests type into the public request widget (mailbox entries). */
export const REQUEST_NOTES = [
  'Wir feiern einen Geburtstag – ist ein Tisch auf der Terrasse möglich?',
  'Falls möglich bitte einen ruhigen Tisch, wir haben ein kleines Kind dabei.',
  'Eine Person isst vegan – geht das bei Ihnen?',
  'Wir kommen nach dem Theater, ggf. 20 Minuten später.',
  'Zwei Kinderstühle wären super. Danke!',
  '',
  '',
]
