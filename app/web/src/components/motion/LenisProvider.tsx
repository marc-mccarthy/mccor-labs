'use client'

import Lenis from 'lenis'
import type { ReactNode } from 'react'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

interface LenisStore {
  subscribe: (callback: () => void) => () => void
  getSnapshot: () => Lenis | null
}

const LenisContext = createContext<LenisStore | null>(null)

function noopUnsubscribe(): undefined {
  return undefined
}

function noopSubscribe(): () => undefined {
  return noopUnsubscribe
}

function nullSnapshot(): null {
  return null
}

export function useLenis(): Lenis | null {
  const store = useContext(LenisContext)
  return useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store?.getSnapshot ?? nullSnapshot,
    nullSnapshot,
  )
}

export function LenisProvider({ children }: { children: ReactNode }) {
  const instanceRef = useRef<Lenis | null>(null)
  const listenersRef = useRef(new Set<() => void>())
  const [store] = useState<LenisStore>(() => ({
    subscribe(callback) {
      listenersRef.current.add(callback)
      return () => {
        listenersRef.current.delete(callback)
      }
    },
    getSnapshot() {
      return instanceRef.current
    },
  }))

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame: number | null = null

    const notify = () => {
      for (const listener of listenersRef.current) listener()
    }

    const stop = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame)
        frame = null
      }
      instanceRef.current?.destroy()
      instanceRef.current = null
      notify()
    }

    const start = () => {
      if (query.matches || instanceRef.current) return
      const instance = new Lenis({ anchors: true })
      instanceRef.current = instance
      const step = (time: number) => {
        instance.raf(time)
        frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
      notify()
    }

    const onChange = () => {
      if (query.matches) {
        stop()
      } else {
        start()
      }
    }

    start()
    query.addEventListener('change', onChange)

    return () => {
      query.removeEventListener('change', onChange)
      stop()
    }
  }, [])

  return <LenisContext.Provider value={store}>{children}</LenisContext.Provider>
}
