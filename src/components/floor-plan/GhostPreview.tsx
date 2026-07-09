'use client'

import React from 'react'

interface GhostPreviewProps {
  x: number
  y: number
  w?: number
  h?: number
  backgroundColor: string
  borderRadius?: string | number
  children?: React.ReactNode
}

/** Dashed placeholder shown at the drop position while dragging a table or block onto the canvas. */
export default function GhostPreview({
  x,
  y,
  w = 80,
  h = 80,
  backgroundColor,
  borderRadius = 0,
  children,
}: GhostPreviewProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundColor,
        borderRadius,
        border: '2px dashed #1d4ed8',
        boxShadow:
          '0 0 0 3px rgba(59,130,246,0.35), 2px 3px 8px rgba(0,0,0,0.14)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        zIndex: 5,
        opacity: 0.7,
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  )
}
