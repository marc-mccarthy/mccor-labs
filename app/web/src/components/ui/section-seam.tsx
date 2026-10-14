import { Container } from '@/components/layout/Container'

interface SectionSeamProps {
  variant?: 'line' | 'node'
}

export function SectionSeam({ variant = 'line' }: SectionSeamProps) {
  return (
    <Container>
      <div aria-hidden="true" data-section-seam="" className="relative opacity-40">
        <div data-signal-sweep="" />
        {variant === 'node' ? (
          <span className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" />
        ) : null}
      </div>
    </Container>
  )
}
