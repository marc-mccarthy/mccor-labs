'use client'

import dynamic from 'next/dynamic'
import { motionScene } from '@/components/motion/motionScene'
import { useMediaQuery } from '@/components/motion/useReducedMotion'

const ContactBeamScene = motionScene(
  dynamic(
    () =>
      import('@/components/effects/ContactBeamScene').then(
        (module) => module.ContactBeamScene,
      ),
    { ssr: false },
  ),
)

export const CONTACT_BEAM_QUERY =
  '(min-width: 768px) and (hover: hover) and (pointer: fine)'

export function ContactBeam() {
  const desktop = useMediaQuery(CONTACT_BEAM_QUERY)
  if (!desktop) return null
  return <ContactBeamScene className="pointer-events-none absolute inset-0" />
}
