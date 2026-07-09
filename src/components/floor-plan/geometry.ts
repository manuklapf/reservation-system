import { GRID } from './constants'

export type Corner = 'nw' | 'ne' | 'sw' | 'se'

export function snapG(v: number) {
  return Math.round(v / GRID) * GRID
}

export function defaultTableSize() {
  return { w: 80, h: 80 }
}

export function defaultObstacleSize() {
  return { w: 80, h: 80 }
}

export function generateObstacleId() {
  return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** Computes the new x/y/w/h when dragging a corner resize handle, clamped to the canvas bounds. */
export function resizeFromCorner(
  corner: Corner,
  dx: number,
  dy: number,
  tx0: number,
  ty0: number,
  tw0: number,
  th0: number,
  canvasW: number,
  canvasH: number,
  minSize: number
) {
  const nw = corner.includes('e')
    ? Math.min(canvasW - tx0, Math.max(minSize, snapG(tw0 + dx)))
    : Math.min(tx0 + tw0, Math.max(minSize, snapG(tw0 - dx)))
  const nh = corner.includes('s')
    ? Math.min(canvasH - ty0, Math.max(minSize, snapG(th0 + dy)))
    : Math.min(ty0 + th0, Math.max(minSize, snapG(th0 - dy)))
  const nx = corner.includes('w')
    ? Math.max(0, snapG(tx0 + tw0 - nw))
    : Math.max(0, Math.min(canvasW - nw, tx0))
  const ny = corner.includes('n')
    ? Math.max(0, snapG(ty0 + th0 - nh))
    : Math.max(0, Math.min(canvasH - nh, ty0))
  return { x: nx, y: ny, w: nw, h: nh }
}
