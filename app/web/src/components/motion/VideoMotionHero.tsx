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
    if (!videoSrc && !webmSrc) return

    const reducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false
    if (reducedMotion) return

    const conn = (navigator as unknown as { connection?: { saveData?: boolean } })
      .connection
    if (conn?.saveData) return

    const attachVideo = () => {
      setShouldAttachVideo(true)
    }

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
      <img
        src={posterSrc}
        alt={altText}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
          objectPosition,
          videoLoaded ? 'opacity-0' : 'opacity-100',
        )}
      />

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

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base via-base/60 to-transparent"
        aria-hidden="true"
      />

      {children && <div className="relative z-10">{children}</div>}
    </div>
  )
}
