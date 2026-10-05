import { useEffect, useRef } from 'react'

export function useProgressRef(progress: number) {
  const progressRef = useRef(progress)
  useEffect(() => {
    progressRef.current = progress
  }, [progress])
  return progressRef
}
