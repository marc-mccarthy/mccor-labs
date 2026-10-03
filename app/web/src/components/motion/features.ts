import type { FeatureBundle } from 'motion/react'

export function loadDomAnimationFeatures(): Promise<FeatureBundle> {
  return import('motion/react').then((module) => module.domAnimation)
}
