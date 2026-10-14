'use client'

import { Children, type ReactNode } from 'react'
import { Reveal } from './Reveal'

export interface StaggerProps {
  children: ReactNode
  interval?: number
  itemClassName?: (index: number) => string | undefined
}

const DEFAULT_INTERVAL_SECONDS = 0.08

export function Stagger({
  children,
  interval = DEFAULT_INTERVAL_SECONDS,
  itemClassName,
}: StaggerProps) {
  return (
    <>
      {Children.toArray(children).map((child, index) => (
        <Reveal key={index} delay={interval * index} className={itemClassName?.(index)}>
          {child}
        </Reveal>
      ))}
    </>
  )
}
