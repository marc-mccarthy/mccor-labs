import { cn } from '@/lib/cn'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}

const SIZES = {
  sm: { icon: 40, text: 'text-[1rem]', gap: 'gap-2' },
  md: { icon: 48, text: 'text-lg', gap: 'gap-2.5' },
  lg: { icon: 64, text: 'text-2xl', gap: 'gap-3.5' },
}

export function Logo({ size = 'md', showWordmark = true, className }: LogoProps) {
  const { icon, text, gap } = SIZES[size]

  return (
    <div className={cn('inline-flex items-center tracking-tight', gap, className)}>
      <img
        src="/media/brand/mccor-shield-logo-96.webp"
        srcSet="/media/brand/mccor-shield-logo-96.webp 1x, /media/brand/mccor-shield-logo-192.webp 2x"
        alt=""
        width={Math.round((icon * 80) / 96)}
        height={icon}
        decoding="async"
        className="shrink-0 transition-transform duration-(--duration-standard) hover:scale-105"
      />

      {showWordmark && (
        <span className={cn('leading-none font-bold text-text', text)}>
          McCor <span className="text-accent">Labs</span>
        </span>
      )}
    </div>
  )
}
