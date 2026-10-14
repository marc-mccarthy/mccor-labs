import type { MotionValue } from 'motion/react'
import { useEffect, useRef } from 'react'

export function useProgressRef(progress: MotionValue<number>) {
  const progressRef = useRef(progress.get())
  useEffect(() => {
    progressRef.current = progress.get()
    return progress.on('change', (value) => {
      progressRef.current = value
    })
  }, [progress])
  return progressRef
}
