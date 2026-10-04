'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'

export interface PinnedProps {
  height: string
  from?: 'md'
  children: ReactNode
}

export function Pinned({ height, from, children }: PinnedProps) {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) {
    return <div>{children}</div>
  }

  return (
    <div
      className={
        from ? 'motion-safe:md:h-(--pin-height)' : 'motion-safe:h-(--pin-height)'
      }
      style={{ '--pin-height': height } as CSSProperties}
    >
      <div
        className={
          from
            ? 'motion-safe:md:sticky motion-safe:md:top-0'
            : 'motion-safe:sticky motion-safe:top-0'
        }
      >
        {children}
      </div>
    </div>
  )
}
