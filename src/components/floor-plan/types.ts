export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface DBTable {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
  color?: string | null
}

export interface PlacedTable extends Rect {
  id: string
  shape: 'square' | 'round'
  color: string
}

export type ObstacleType = 'block'

export interface Obstacle extends Rect {
  id: string
  type: ObstacleType
  label: string
  outlined: boolean
}
