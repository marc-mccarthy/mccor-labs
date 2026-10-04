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

  if (from) {
    return (
      <div
        className="md:h-(--pin-height)"
        style={{ '--pin-height': height } as CSSProperties}
      >
        <div className="md:sticky md:top-0">{children}</div>
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <div style={{ position: 'sticky', top: 0 }}>{children}</div>
    </div>
  )
}
