'use client'

import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import { useReducedMotion } from './useReducedMotion'

export const MOTION_STORAGE_KEY = 'mccor-motion'

const PAUSED = 'paused'

interface MotionPauseStore {
  subscribe: (callback: () => void) => () => void
  setPaused: (paused: boolean) => void
  restore: () => void
}

export interface MotionPauseState {
  paused: boolean
  osReduced: boolean
  toggle: () => void
}

const MotionPauseContext = createContext<MotionPauseStore | null>(null)

function readPaused(): boolean {
  return document.documentElement.dataset.motion === PAUSED
}

function serverSnapshot(): boolean {
  return false
}

function noopUnsubscribe(): undefined {
  return undefined
}

function noopSubscribe(): () => undefined {
  return noopUnsubscribe
}

function applyPaused(paused: boolean): void {
  if (paused) {
    document.documentElement.dataset.motion = PAUSED
  } else {
    delete document.documentElement.dataset.motion
  }
}

function reportStorageFailure(action: string, cause: unknown): void {
  reportError(new Error(`Could not ${action} the motion pause preference`, { cause }))
}

function readStored(): boolean | null {
  try {
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === PAUSED
  } catch (error) {
    reportStorageFailure('read', error)
    return null
  }
}

function writeStored(paused: boolean): void {
  try {
    if (paused) {
      window.localStorage.setItem(MOTION_STORAGE_KEY, PAUSED)
    } else {
      window.localStorage.removeItem(MOTION_STORAGE_KEY)
    }
  } catch (error) {
    reportStorageFailure('save', error)
  }
}

function createStore(): MotionPauseStore {
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) listener()
  }
  return {
    subscribe(callback) {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    setPaused(paused) {
      applyPaused(paused)
      notify()
      writeStored(paused)
    },
    restore() {
      const stored = readStored()
      if (stored === null) return
      applyPaused(stored)
      notify()
    },
  }
}

export function MotionPauseProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createStore)

  useLayoutEffect(() => {
    store.restore()
  }, [store])

  return (
    <MotionPauseContext.Provider value={store}>{children}</MotionPauseContext.Provider>
  )
}

export function useMotionPausedFlag(): boolean {
  const store = useContext(MotionPauseContext)
  return useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store ? readPaused : serverSnapshot,
    serverSnapshot,
  )
}

export function useMotionPaused(): MotionPauseState {
  const store = useContext(MotionPauseContext)
  const paused = useMotionPausedFlag()
  const osReduced = useReducedMotion()
  const toggle = useCallback(() => {
    if (!store) throw new Error('useMotionPaused().toggle needs a MotionPauseProvider')
    if (osReduced) return
    store.setPaused(!readPaused())
  }, [store, osReduced])
  return { paused, osReduced, toggle }
}
