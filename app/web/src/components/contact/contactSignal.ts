import { MESSAGE_MIN, validateContact } from '@/lib/contact'

export type ContactPhase = 'idle' | 'sending' | 'sent' | 'error'

export interface ContactSignal {
  charge: number
  phase: ContactPhase
}

export interface ContactFields {
  name: string
  email: string
  message: string
}

declare global {
  interface Window {
    __contactSignal?: Partial<ContactSignal>
  }
}

const INITIAL: ContactSignal = { charge: 0, phase: 'idle' }
const PARTS = 3

const listeners = new Set<() => void>()
let snapshot = INITIAL

export function contactCharge(fields: ContactFields): number {
  const name = fields.name.trim().length > 0 ? 1 : 0
  const email =
    validateContact({ ...fields, honeypot: '', elapsedMs: 0 }).email === undefined ? 1 : 0
  const message = Math.min(1, fields.message.trim().length / MESSAGE_MIN)
  return (name + email + message) / PARTS
}

function publish(next: ContactSignal) {
  if (next.charge === snapshot.charge && next.phase === snapshot.phase) return
  snapshot = next
  if (typeof window !== 'undefined' && window.__contactSignal) {
    Object.assign(window.__contactSignal, next)
  }
  for (const listener of listeners) listener()
}

export const contactSignal = {
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: (): ContactSignal => snapshot,
  reset: () => {
    publish(INITIAL)
  },
  setCharge: (charge: number) => {
    publish({ ...snapshot, charge: Math.min(1, Math.max(0, charge)) })
  },
  setPhase: (phase: ContactPhase) => {
    publish({ ...snapshot, phase })
  },
}
