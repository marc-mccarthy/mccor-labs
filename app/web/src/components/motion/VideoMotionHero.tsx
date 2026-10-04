'use client'

import { useState, useEffect, useRef, type ReactNode, type RefObject } from 'react'
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

interface VideoAttachOptions {
  enabled: boolean
  media?: string
  onScreenRef?: RefObject<Element | null>
}

function rethrowUnlessAborted(error: unknown) {
  if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
}

export function useVideoAttach({ enabled, media, onScreenRef }: VideoAttachOptions) {
  const [shouldAttachVideo, setShouldAttachVideo] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!enabled) return

    const reducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false
    if (reducedMotion) return
    if (media && !window.matchMedia(media).matches) return

    const conn = (navigator as unknown as { connection?: { saveData?: boolean } })
      .connection
    if (conn?.saveData) return

    let timeoutId = 0
    let observer: IntersectionObserver | undefined
    const attachVideo = () => {
      const target = onScreenRef?.current
      if (!target) {
        setShouldAttachVideo(true)
        return
      }
      observer?.disconnect()
      observer = new IntersectionObserver((entries) => {
        const video = videoRef.current
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldAttachVideo(true)
          video?.play().catch(rethrowUnlessAborted)
        } else {
          video?.pause()
        }
      })
      observer.observe(target)
    }
    const releaseVideo = () => {
      window.clearTimeout(timeoutId)
      observer?.disconnect()
      window.removeEventListener('load', attachVideo)
      const video = videoRef.current
      if (video) {
        video.pause()
        video.querySelectorAll('source').forEach((source) => {
          source.removeAttribute('src')
        })
        video.load()
      }
      setShouldAttachVideo(false)
      setVideoLoaded(false)
    }

    if (document.readyState === 'complete') {
      timeoutId = window.setTimeout(attachVideo, 0)
    } else {
      window.addEventListener('load', attachVideo, { once: true })
    }
    const restoreVideo = (event: PageTransitionEvent) => {
      if (event.persisted) attachVideo()
    }
    window.addEventListener('pagehide', releaseVideo)
    window.addEventListener('pageshow', restoreVideo)
    return () => {
      window.clearTimeout(timeoutId)
      observer?.disconnect()
      window.removeEventListener('load', attachVideo)
      window.removeEventListener('pagehide', releaseVideo)
      window.removeEventListener('pageshow', restoreVideo)
    }
  }, [enabled, media, onScreenRef])

  return { videoRef, shouldAttachVideo, videoLoaded, setVideoLoaded }
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
  const { videoRef, shouldAttachVideo, videoLoaded, setVideoLoaded } = useVideoAttach({
    enabled: Boolean(videoSrc ?? webmSrc),
  })

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
          ref={videoRef}
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
