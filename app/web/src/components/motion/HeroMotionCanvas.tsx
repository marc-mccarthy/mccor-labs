'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

export interface HeroMotionCanvasProps {
  className?: string
  particleCount?: number
  maxDistance?: number
  speed?: number
  interactionRadius?: number
  mode?: 'repel' | 'attract'
  interactive?: boolean
  backgroundColor?: string
  primaryColor?: string
  secondaryColor?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  baseVx: number
  baseVy: number
  radius: number
  color: string
}

export function HeroMotionCanvas({
  className,
  particleCount = 55,
  maxDistance = 120,
  speed = 0.5,
  interactionRadius = 140,
  mode = 'repel',
  interactive = true,
  backgroundColor,
  primaryColor,
  secondaryColor,
}: HeroMotionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rootStyle = getComputedStyle(document.documentElement)
    const token = (name: string) => rootStyle.getPropertyValue(name).trim()
    const baseColor = backgroundColor ?? token('--color-base')
    const primary = primaryColor ?? token('--color-accent')
    const secondary = secondaryColor ?? token('--color-brand')

    let animationFrameId: number | null = null
    let isVisible = true
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let mouseX = -9999
    let mouseY = -9999

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.resetTransform()
      ctx.scale(dpr, dpr)
      initParticles()
      if (prefersReducedMotion) {
        drawFrame()
      }
    }

    const initParticles = () => {
      particles = []
      for (let i = 0; i < particleCount; i++) {
        const pSpeed = (Math.random() * 0.5 + 0.5) * speed
        const angle = Math.random() * Math.PI * 2
        const isPrimary = Math.random() > 0.4
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * pSpeed,
          vy: Math.sin(angle) * pSpeed,
          baseVx: Math.cos(angle) * pSpeed,
          baseVy: Math.sin(angle) * pSpeed,
          radius: Math.random() * 1.8 + 1.2,
          color: isPrimary ? primary : secondary,
        })
      }
    }

    const drawFrame = () => {
      ctx.fillStyle = baseColor
      ctx.fillRect(0, 0, width, height)

      ctx.strokeStyle = primary
      ctx.lineWidth = 0.8
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i]
        if (!p1) continue
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          if (!p2) continue
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.hypot(dx, dy)

          if (dist < maxDistance) {
            ctx.globalAlpha = (1 - dist / maxDistance) * 0.35
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1

      for (const p of particles) {
        if (!prefersReducedMotion) {
          if (interactive && mouseX > 0 && mouseY > 0) {
            const dx = mouseX - p.x
            const dy = mouseY - p.y
            const dist = Math.hypot(dx, dy)

            if (dist < interactionRadius && dist > 0) {
              const force = (1 - dist / interactionRadius) * 2
              const dir = mode === 'repel' ? -1 : 1
              p.vx += (dx / dist) * force * dir * 0.2
              p.vy += (dy / dist) * force * dir * 0.2
            }
          }

          p.vx += (p.baseVx - p.vx) * 0.05
          p.vy += (p.baseVy - p.vy) * 0.05

          p.x += p.vx
          p.y += p.vy

          if (p.x < 0) p.x = width
          if (p.x > width) p.x = 0
          if (p.y < 0) p.y = height
          if (p.y > height) p.y = 0
        }

        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const loop = () => {
      if (!isVisible) return
      drawFrame()
      animationFrameId = requestAnimationFrame(loop)
    }

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = !!entry?.isIntersecting
      if (isVisible && !prefersReducedMotion && !animationFrameId) {
        loop()
      } else if (!isVisible && animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    })
    observer.observe(canvas)

    const resizeObserver = new ResizeObserver(() => {
      resize()
    })
    resizeObserver.observe(canvas)

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
    }

    const onMouseLeave = () => {
      mouseX = -9999
      mouseY = -9999
    }

    if (interactive) {
      window.addEventListener('mousemove', onMouseMove, { passive: true })
      document.addEventListener('mouseleave', onMouseLeave)
    }

    resize()
    if (!prefersReducedMotion) {
      loop()
    } else {
      drawFrame()
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      observer.disconnect()
      resizeObserver.disconnect()
      if (interactive) {
        window.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseleave', onMouseLeave)
      }
    }
  }, [
    backgroundColor,
    interactive,
    interactionRadius,
    maxDistance,
    mode,
    particleCount,
    primaryColor,
    secondaryColor,
    speed,
  ])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Interactive cybernetic constellation background"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  )
}
