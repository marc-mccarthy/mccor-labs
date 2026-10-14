'use client'

import { useState, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useMotionPausedFlag } from '@/components/motion/MotionPauseProvider'
import { useReducedMotion } from '@/components/motion/useReducedMotion'
import { VideoPauseToggle } from '@/components/motion/VideoPauseToggle'
import { cn } from '@/lib/cn'

export interface VideoMotionHeroProps {
  posterSrc: string
  videoSrc?: string
  webmSrc?: string
  introSrc?: string
  introWebmSrc?: string
  onIntroChange?: (playing: boolean) => void
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

export const INTRO_STORAGE_KEY = 'mccor-hero-intro-seen'
const INTRO_FADE_LEAD_SECONDS = 0.8

function rethrowUnlessAborted(error: unknown) {
  if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
}

function isStorageBlocked(error: unknown) {
  return error instanceof DOMException && error.name === 'SecurityError'
}

function readIntroSeen() {
  if (typeof window === 'undefined') return true
  try {
    return window.sessionStorage.getItem(INTRO_STORAGE_KEY) === '1'
  } catch (error) {
    if (isStorageBlocked(error)) return true
    throw error
  }
}

function markIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_STORAGE_KEY, '1')
  } catch (error) {
    if (!isStorageBlocked(error)) throw error
  }
}

export function useVideoAttach({ enabled, media, onScreenRef }: VideoAttachOptions) {
  const [shouldAttachVideo, setShouldAttachVideo] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [paused, setPaused] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pausedRef = useRef(false)
  const reducedMotion = useReducedMotion()
  const motionPaused = useMotionPausedFlag()
  const halted = reducedMotion || motionPaused
  const haltedRef = useRef(halted)

  useEffect(() => {
    haltedRef.current = halted
    if (halted) videoRef.current?.pause()
  }, [halted])

  useEffect(() => {
    if (!enabled || halted) return
    if (media && !window.matchMedia(media).matches) return

    const conn = (navigator as unknown as { connection?: { saveData?: boolean } })
      .connection
    if (conn?.saveData) return

    let timeoutId = 0
    let observer: IntersectionObserver | undefined
    const attachVideo = () => {
      const target = onScreenRef?.current
      if (!target || typeof IntersectionObserver === 'undefined') {
        setShouldAttachVideo(true)
        if (!pausedRef.current) videoRef.current?.play().catch(rethrowUnlessAborted)
        return
      }
      observer?.disconnect()
      observer = new IntersectionObserver((entries) => {
        const video = videoRef.current
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldAttachVideo(true)
          if (!pausedRef.current) video?.play().catch(rethrowUnlessAborted)
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
  }, [enabled, halted, media, onScreenRef])

  const togglePaused = () => {
    if (haltedRef.current) return
    const next = !pausedRef.current
    pausedRef.current = next
    setPaused(next)
    const video = videoRef.current
    if (next) video?.pause()
    else video?.play().catch(rethrowUnlessAborted)
  }

  return {
    videoRef,
    shouldAttachVideo,
    videoLoaded,
    setVideoLoaded,
    paused: paused || halted,
    togglePaused,
  }
}

export function VideoMotionHero({
  posterSrc,
  videoSrc,
  webmSrc,
  introSrc,
  introWebmSrc,
  onIntroChange,
  altText = 'McCor Labs hero visual',
  className,
  objectPosition = 'object-right lg:object-[90%_center]',
  children,
}: VideoMotionHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const {
    videoRef,
    shouldAttachVideo,
    videoLoaded,
    setVideoLoaded,
    paused,
    togglePaused,
  } = useVideoAttach({ enabled: Boolean(videoSrc ?? webmSrc), onScreenRef: rootRef })
  const [introPending, setIntroPending] = useState(
    () => Boolean(introSrc ?? introWebmSrc) && !readIntroSeen(),
  )
  const [introStarted, setIntroStarted] = useState(false)
  const [introFading, setIntroFading] = useState(false)
  const inIntro = shouldAttachVideo && introPending
  const introPlaying = inIntro && introStarted && !introFading && !paused
  const videoVisible = videoLoaded && !introFading
  const sources = inIntro
    ? { webm: introWebmSrc, mp4: introSrc }
    : { webm: webmSrc, mp4: videoSrc }

  useEffect(() => {
    onIntroChange?.(introPlaying)
  }, [introPlaying, onIntroChange])

  const startIntro = () => {
    markIntroSeen()
    setIntroStarted(true)
  }

  const finishIntro = () => {
    setIntroPending(false)
    setIntroFading(false)
    setVideoLoaded(false)
  }

  const fadeOutNearEnd = (video: HTMLVideoElement) => {
    if (!Number.isFinite(video.duration)) return
    if (video.duration - video.currentTime <= INTRO_FADE_LEAD_SECONDS)
      setIntroFading(true)
  }

  return (
    <div
      ref={rootRef}
      className={cn('relative w-full overflow-hidden bg-base', className)}
    >
      <img
        src={posterSrc}
        alt={altText}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-(--duration-scene)',
          objectPosition,
          videoVisible ? 'opacity-0' : 'opacity-100',
        )}
      />

      {shouldAttachVideo && (videoSrc ?? webmSrc) && (
        <video
          key={inIntro ? 'intro' : 'loop'}
          ref={videoRef}
          autoPlay={!paused}
          muted
          loop={!inIntro}
          playsInline
          preload="none"
          aria-hidden="true"
          onCanPlay={() => {
            setVideoLoaded(true)
          }}
          onPlay={inIntro ? startIntro : undefined}
          onTimeUpdate={
            inIntro
              ? (event) => {
                  fadeOutNearEnd(event.currentTarget)
                }
              : undefined
          }
          onEnded={inIntro ? finishIntro : undefined}
          onError={inIntro ? finishIntro : undefined}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-(--duration-scene)',
            objectPosition,
            videoVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          {sources.webm && (
            <source
              src={sources.webm}
              type="video/webm"
              onError={inIntro && !sources.mp4 ? finishIntro : undefined}
            />
          )}
          {sources.mp4 && (
            <source
              src={sources.mp4}
              type="video/mp4"
              onError={inIntro ? finishIntro : undefined}
            />
          )}
        </video>
      )}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base via-base/60 to-transparent"
        aria-hidden="true"
      />

      {shouldAttachVideo && (videoSrc ?? webmSrc) && (
        <VideoPauseToggle paused={paused} onToggle={togglePaused} />
      )}

      {children && <div className="relative z-10">{children}</div>}
    </div>
  )
}
