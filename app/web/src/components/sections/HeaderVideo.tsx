'use client'

import { useRef } from 'react'
import { Parallax } from '@/components/motion/Parallax'
import { useVideoAttach } from '@/components/motion/VideoMotionHero'
import { VideoPauseToggle } from '@/components/motion/VideoPauseToggle'
import { cn } from '@/lib/cn'

export interface HeaderVideoSources {
  webm: string
  mp4: string
}

interface HeaderVideoProps {
  video: HeaderVideoSources
  maskClassName: string
}

export function HeaderVideo({ video, maskClassName }: HeaderVideoProps) {
  const ref = useRef<HTMLDivElement>(null)
  const {
    videoRef,
    shouldAttachVideo,
    videoLoaded,
    setVideoLoaded,
    paused,
    togglePaused,
  } = useVideoAttach({ enabled: true, media: '(min-width: 768px)', onScreenRef: ref })

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      <div className={maskClassName}>
        <Parallax speed={0.15}>
          {shouldAttachVideo && (
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              aria-hidden="true"
              data-testid="header-video"
              onCanPlay={() => {
                setVideoLoaded(true)
              }}
              className={cn(
                'h-full w-full object-cover object-right transition-opacity duration-(--duration-scene)',
                videoLoaded ? 'opacity-100' : 'opacity-0',
              )}
            >
              <source src={video.webm} type="video/webm" />
              <source src={video.mp4} type="video/mp4" />
            </video>
          )}
        </Parallax>
      </div>
      {shouldAttachVideo && (
        <div className="pointer-events-auto">
          <VideoPauseToggle paused={paused} onToggle={togglePaused} />
        </div>
      )}
    </div>
  )
}
