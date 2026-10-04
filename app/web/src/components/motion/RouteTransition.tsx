'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { readDurationSeconds, readToken } from './tokens'

let hasMounted = false

export function RouteTransition({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const firstLoad = !hasMounted
    hasMounted = true
    if (firstLoad || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    container.current?.animate(
      [
        { opacity: 0, transform: `translateY(${readToken('--space-md')})` },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: readDurationSeconds('--duration-route') * 1000,
        easing: readToken('--ease-route'),
      },
    )
  }, [])

  return <div ref={container}>{children}</div>
}
