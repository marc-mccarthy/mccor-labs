import { cn } from '@/lib/cn'

type GlowAnchor = 'left' | 'right' | 'center'

const BRAND = 'color-mix(in oklab, var(--color-brand) 8%, transparent)'
const ACCENT = 'color-mix(in oklab, var(--color-accent) 6%, transparent)'

const GLOWS: Record<GlowAnchor, string> = {
  left: `radial-gradient(40rem circle at 15% 30%, ${BRAND}, transparent), radial-gradient(32rem circle at 35% 80%, ${ACCENT}, transparent)`,
  right: `radial-gradient(40rem circle at 85% 30%, ${BRAND}, transparent), radial-gradient(32rem circle at 65% 80%, ${ACCENT}, transparent)`,
  center: `radial-gradient(40rem circle at 40% 40%, ${BRAND}, transparent), radial-gradient(32rem circle at 60% 70%, ${ACCENT}, transparent)`,
}

export function GlowField({
  anchor = 'center',
  className,
}: {
  anchor?: GlowAnchor
  className?: string
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 mask-radial-from-30% mask-radial-to-75%',
        className,
      )}
      style={{ backgroundImage: GLOWS[anchor] }}
    />
  )
}
