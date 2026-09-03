'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type LoadingScreenVariant = 'page' | 'panel'

const duckSize: Record<LoadingScreenVariant, string> = {
  page: 'h-64 w-64 sm:h-80 sm:w-80',
  panel: 'h-24 w-24',
}

export interface LoadingScreenProps {
  /** `page` fills the viewport on the paper background; `panel` sits inside a card. */
  variant?: LoadingScreenVariant
  /** Shows a caption below the video. Defaults to `null` (hidden). */
  label?: string | null
  className?: string
}

/**
 * The app-wide loading state: a looping voxel duck on a transparent background,
 * so it reads against the paper texture without a plate behind it.
 *
 * Only the VP9 WebM ships, by explicit choice. A companion HEVC `.mov` used to
 * be listed first for Safari, which decodes VP9 but has historically ignored a
 * WebM alpha channel and painted the duck on a black square. If that square
 * shows up in Safari, the `.mov` is the fix — re-add it as a first `<source>`
 * typed `video/quicktime`, which only Safari claims to play.
 *
 * Transparency is the whole point of the asset, so any re-encode must keep it.
 * Do not trust `ffprobe`: it reports `pix_fmt=yuv420p` for alpha-bearing files
 * either way, and ffmpeg's native VP9 decoder drops the WebM alpha layer. Check
 * by decoding a frame with the right decoder and counting transparent pixels:
 *   ffmpeg -c:v libvpx-vp9 -i ducky.webm -vframes 1 -pix_fmt rgba -f rawvideo -
 * Roughly half the pixels should have alpha 0.
 */
export default function LoadingScreen({
  variant = 'page',
  label = null,
  className,
}: LoadingScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  // Honour the OS "reduce motion" setting by holding the duck on its first
  // frame instead of looping it. Detected after mount rather than during render
  // because the server has no media queries, and a mismatch here would hydrate
  // the wrong element.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // `autoPlay` is only read when the element mounts, and the query above
  // resolves a tick later — so by the time we know motion is unwanted the duck
  // may already be swimming. Drive playback imperatively to rewind it.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (reducedMotion) {
      video.pause()
      video.currentTime = 0
    } else {
      // Autoplay can still be refused (power saving, engine policy); the frame
      // it stops on is a fine loading state, so swallow the rejection.
      void video.play().catch(() => {})
    }
  }, [reducedMotion])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center',
        variant === 'page' ? 'min-h-screen paper-plain' : 'py-8',
        label && 'gap-3',
        className
      )}
    >
      <video
        ref={videoRef}
        autoPlay={!reducedMotion}
        loop={!reducedMotion}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        className={cn(duckSize[variant], 'object-contain')}
      >
        <source src="/loading/ducky.webm" type="video/webm" />
      </video>

      {label && (
        <p
          className={cn(
            'text-gray-500',
            variant === 'page' ? 'text-base' : 'text-sm'
          )}
        >
          {label}
        </p>
      )}
    </div>
  )
}
