'use client'

import type { ComponentType, ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'

interface SceneSlotProps {
  className?: string
  fallback?: ReactNode
}

export function motionScene<P extends SceneSlotProps>(Scene: ComponentType<P>) {
  function MotionScene(props: P) {
    const reducedMotion = useReducedMotion()
    if (!reducedMotion) return <Scene {...props} />
    return (
      <div className={props.className} data-scene-status="fallback">
        {props.fallback}
      </div>
    )
  }
  return MotionScene
}
