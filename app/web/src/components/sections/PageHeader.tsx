import type { ReactNode } from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { cn } from '@/lib/cn'
import { Parallax } from '@/components/motion/Parallax'
import { HeaderVideo, type HeaderVideoSources } from '@/components/sections/HeaderVideo'

interface PageHeaderProps {
  title: string
  description: string
  image?: string
  video?: HeaderVideoSources
  imageClassName?: string
  scene?: ReactNode
  handoff?: boolean
}

const BAND_MASK = 'absolute inset-0 mask-t-from-80% mask-b-from-45% *:h-full'

export function PageHeader({
  title,
  description,
  image,
  video,
  imageClassName,
  scene,
  handoff = false,
}: PageHeaderProps) {
  const text = (
    <Container className="relative">
      <h1 className="text-display-md leading-tight font-semibold text-text">{title}</h1>
      <p
        className={cn(
          'mt-2 max-w-2xl text-lg text-muted',
          image && 'motion-safe:animate-lede',
        )}
      >
        {description}
      </p>
    </Container>
  )

  if (!image) return <Section>{text}</Section>

  const bandImage = (
    <img
      src={image}
      alt=""
      fetchPriority="high"
      decoding="async"
      data-testid="header-image"
      className={cn('h-full w-full object-cover object-right', imageClassName)}
    />
  )

  return (
    <Section
      className="relative flex min-h-[30vh] items-end overflow-hidden pb-8 sm:pb-12 [&+section]:pt-10 sm:[&+section]:pt-14"
      data-handoff={handoff ? '' : undefined}
    >
      <div className={BAND_MASK}>
        <Parallax speed={0.15}>
          {scene ? (
            <div className="relative h-full" data-handoff-zoom={handoff ? '' : undefined}>
              {bandImage}
              {scene}
            </div>
          ) : (
            bandImage
          )}
        </Parallax>
      </div>
      {video && <HeaderVideo video={video} maskClassName={BAND_MASK} />}
      <div
        className="absolute inset-0 bg-linear-to-t from-base via-base/80 to-transparent sm:bg-linear-to-r sm:via-base/70"
        data-handoff-scrim={handoff ? '' : undefined}
      />
      {text}
      <span
        aria-hidden="true"
        data-testid="header-signal"
        className="pointer-events-none absolute inset-x-0 bottom-0 block h-px origin-left bg-brand motion-safe:animate-[band-signal_var(--duration-scene)_var(--ease-standard)_both]"
      />
    </Section>
  )
}
