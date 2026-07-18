'use client'

import CanvasItem from './CanvasItem'
import type { Obstacle } from './types'

interface ObstacleNodeProps {
  obstacle: Obstacle
  canvasW: number
  canvasH: number
  scale: number
  selected: boolean
  onSelect: () => void
  onInteractionStart: () => void
  onChange: (patch: Partial<Obstacle>) => void
  onInteractionEnd: () => void
}

export default function ObstacleNode({
  obstacle: o,
  canvasW,
  canvasH,
  scale,
  selected,
  onSelect,
  onInteractionStart,
  onChange,
  onInteractionEnd,
}: ObstacleNodeProps) {
  return (
    <CanvasItem
      rect={o}
      canvasW={canvasW}
      canvasH={canvasH}
      scale={scale}
      minSize={10}
      selected={selected}
      zIndex={selected ? 8 : 0}
      title={o.label || undefined}
      onSelect={onSelect}
      onInteractionStart={onInteractionStart}
      onChange={onChange}
      onInteractionEnd={onInteractionEnd}
      style={{
        backgroundColor: o.outlined ? 'transparent' : '#000000',
        border: selected ? '2px solid #1d4ed8' : '2px solid #000000',
        borderRadius: 2,
        boxShadow: selected ? '0 0 0 3px rgba(59,130,246,0.35)' : 'none',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        transition: 'box-shadow 0.1s',
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: o.outlined ? '#000000' : 'rgba(255,255,255,0.8)',
          textAlign: 'center',
          maxWidth: '90%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {o.label}
      </span>
    </CanvasItem>
  )
}
