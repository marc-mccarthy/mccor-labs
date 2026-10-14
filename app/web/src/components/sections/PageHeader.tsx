import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Eyebrow } from '@/components/ui/eyebrow'
import { cn } from '@/lib/cn'
import { Parallax } from '@/components/motion/Parallax'
import { HeaderVideo, type HeaderVideoSources } from '@/components/sections/HeaderVideo'

interface PageHeaderProps {
  title: string
  description: string
  image?: string
  video?: HeaderVideoSources
  eyebrow?: { index: string; label: string }
  size?: 'md' | 'lg'
  imageClassName?: string
}

const H1_CLASS = {
  md: 'text-display-md',
  lg: 'text-display-lg',
} as const

const LEDE_CLASS = {
  md: 'max-w-2xl text-lg text-muted',
  lg: 'max-w-[48ch] text-xl text-text text-pretty',
} as const

const BAND_MASK = 'absolute inset-0 mask-t-from-80% mask-b-from-45% *:h-full'

export function PageHeader({
  title,
  description,
  image,
  video,
  eyebrow,
  size = 'md',
  imageClassName,
}: PageHeaderProps) {
  const text = (
    <Container className="relative">
      {eyebrow && <Eyebrow index={eyebrow.index} label={eyebrow.label} />}
      <h1 className={cn(H1_CLASS[size], 'leading-tight font-semibold text-text')}>
        {title}
      </h1>
      <p className={cn('mt-4', LEDE_CLASS[size], image && 'motion-safe:animate-lede')}>
        {description}
      </p>
    </Container>
  )

  if (!image) return <Section>{text}</Section>

  return (
    <Section className="relative flex min-h-[60vh] items-end overflow-hidden pb-0 sm:pb-0">
      <div className={BAND_MASK}>
        <Parallax speed={0.15}>
          <img
            src={image}
            alt=""
            fetchPriority="high"
            decoding="async"
            data-testid="header-image"
            className={cn('h-full w-full object-cover object-right', imageClassName)}
          />
        </Parallax>
      </div>
      {video && <HeaderVideo video={video} maskClassName={BAND_MASK} />}
      <div className="absolute inset-0 bg-linear-to-t from-base via-base/80 to-transparent sm:bg-linear-to-r sm:via-base/70" />
      {text}
      <span
        aria-hidden="true"
        data-testid="header-signal"
        className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-px origin-left bg-brand motion-safe:block motion-safe:animate-[band-signal_var(--duration-scene)_var(--ease-standard)_both]"
      />
    </Section>
  )
}
