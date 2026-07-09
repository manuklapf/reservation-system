'use client'

import React, { useRef } from 'react'
import { type Corner, resizeFromCorner, snapG } from './geometry'
import type { Rect } from './types'

const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se']

interface DragState {
  mx0: number
  my0: number
  tx0: number
  ty0: number
}

interface ResizeState extends DragState {
  corner: Corner
  tw0: number
  th0: number
}

interface CanvasItemProps {
  rect: Rect
  canvasW: number
  canvasH: number
  /** Minimum width/height enforced while resizing. */
  minSize?: number
  selected: boolean
  zIndex?: number
  title?: string
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  onSelect: () => void
  /** Called on pointer-down of the item or a resize handle, before any movement. */
  onInteractionStart: () => void
  onChange: (patch: Partial<Rect>) => void
  /** Called on pointer-up, whether or not the item actually moved. */
  onInteractionEnd: () => void
}

/** Generic draggable + corner-resizable rectangle for the floor plan canvas. */
export default function CanvasItem({
  rect,
  canvasW,
  canvasH,
  minSize = 20,
  selected,
  zIndex,
  title,
  className,
  style,
  children,
  onSelect,
  onInteractionStart,
  onChange,
  onInteractionEnd,
}: CanvasItemProps) {
  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)

  return (
    <div
      title={title}
      className={className}
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        touchAction: 'none',
        zIndex,
        ...style,
      }}
      onPointerDown={e => {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        onInteractionStart()
        dragRef.current = {
          mx0: e.clientX,
          my0: e.clientY,
          tx0: rect.x,
          ty0: rect.y,
        }
        onSelect()
      }}
      onPointerMove={e => {
        if (!dragRef.current) return
        const { mx0, my0, tx0, ty0 } = dragRef.current
        onChange({
          x: snapG(
            Math.max(0, Math.min(canvasW - rect.w, tx0 + e.clientX - mx0))
          ),
          y: snapG(
            Math.max(0, Math.min(canvasH - rect.h, ty0 + e.clientY - my0))
          ),
        })
      }}
      onPointerUp={() => {
        dragRef.current = null
        onInteractionEnd()
      }}
      onClick={e => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {selected &&
        CORNERS.map(corner => (
          <div
            key={corner}
            style={{
              position: 'absolute',
              width: 10,
              height: 10,
              backgroundColor: 'white',
              border: '2px solid #1d4ed8',
              borderRadius: '50%',
              zIndex: 20,
              cursor: `${corner}-resize`,
              top: corner.startsWith('n') ? -5 : undefined,
              bottom: corner.startsWith('s') ? -5 : undefined,
              left: corner.endsWith('w') ? -5 : undefined,
              right: corner.endsWith('e') ? -5 : undefined,
            }}
            onPointerDown={e => {
              e.stopPropagation()
              e.currentTarget.setPointerCapture(e.pointerId)
              onInteractionStart()
              resizeRef.current = {
                corner,
                mx0: e.clientX,
                my0: e.clientY,
                tx0: rect.x,
                ty0: rect.y,
                tw0: rect.w,
                th0: rect.h,
              }
            }}
            onPointerMove={e => {
              if (!resizeRef.current || resizeRef.current.corner !== corner)
                return
              const { mx0, my0, tx0, ty0, tw0, th0 } = resizeRef.current
              onChange(
                resizeFromCorner(
                  corner,
                  e.clientX - mx0,
                  e.clientY - my0,
                  tx0,
                  ty0,
                  tw0,
                  th0,
                  canvasW,
                  canvasH,
                  minSize
                )
              )
            }}
            onPointerUp={() => {
              resizeRef.current = null
              onInteractionEnd()
            }}
          />
        ))}
      {children}
    </div>
  )
}
