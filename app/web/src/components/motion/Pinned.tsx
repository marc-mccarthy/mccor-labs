'use client'

import type { ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'

export interface PinnedProps {
  height: string
  children: ReactNode
}

export function Pinned({ height, children }: PinnedProps) {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) {
    return <div>{children}</div>
  }

  return (
    <div style={{ height }}>
      <div style={{ position: 'sticky', top: 0 }}>{children}</div>
    </div>
  )
}
