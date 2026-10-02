'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface VideoMotionHeroProps {
  posterSrc: string
  videoSrc?: string
  webmSrc?: string
  altText?: string
  className?: string
  objectPosition?: string
  children?: ReactNode
}

/**
 * VideoMotionHero
 *
 * Implements McCor Labs spec video constraints:
 * - Poster-first: Video never blocks initial render; high-res poster paints immediately.
 * - preload="none", muted, playsinline, loop.
 * - Respects prefers-reduced-motion: reduce by strictly disabling video attachment and autoplay.
 * - Fallbacks smoothly to high-res poster on low bandwidth, unsupported video, or mobile data savers.
 * - objectPosition pins focal elements (such as the right-side Red Stag) across any viewport aspect ratio.
 */
export function VideoMotionHero({
  posterSrc,
  videoSrc,
  webmSrc,
  altText = 'McCor Labs hero visual',
  className,
  objectPosition = 'object-right lg:object-[90%_center]',
  children,
}: VideoMotionHeroProps) {
  const [shouldAttachVideo, setShouldAttachVideo] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)

  useEffect(() => {
    // Only consider attaching video if video source is provided
    if (!videoSrc && !webmSrc) return

    // Check prefers-reduced-motion
    const reducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false
    if (reducedMotion) return

    // Check data-saver if available
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } })
      .connection
    if (conn?.saveData) return

    const attachVideo = () => {
      setShouldAttachVideo(true)
    }

    // Delay attaching video until after initial window load so LCP image paints first
    if (document.readyState === 'complete') {
      const timeoutId = window.setTimeout(attachVideo, 0)
      return () => {
        window.clearTimeout(timeoutId)
      }
    }

    window.addEventListener('load', attachVideo, { once: true })
    return () => {
      window.removeEventListener('load', attachVideo)
    }
  }, [videoSrc, webmSrc])

  return (
    <div className={cn('relative w-full overflow-hidden bg-base', className)}>
      {/* High-res Poster Image (Guarantees zero layout shift and instant LCP) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterSrc}
        alt={altText}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
          objectPosition,
          videoLoaded ? 'opacity-0' : 'opacity-100',
        )}
      />

      {/* Video Element - Attached conditionally post-paint */}
      {shouldAttachVideo && (videoSrc ?? webmSrc) && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          onCanPlay={() => {
            setVideoLoaded(true)
          }}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
            objectPosition,
            videoLoaded ? 'opacity-100' : 'opacity-0',
          )}
        >
          {webmSrc && <source src={webmSrc} type="video/webm" />}
          {videoSrc && <source src={videoSrc} type="video/mp4" />}
        </video>
      )}

      {/* Dark Ambient Overlay with Red/Orange Accent Vignette */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base via-base/60 to-transparent"
        aria-hidden="true"
      />

      {/* Content Overlay */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  )
}
