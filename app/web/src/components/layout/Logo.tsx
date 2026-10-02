import { cn } from '@/lib/cn'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}

const SIZES = {
  sm: { icon: 24, text: 'text-[1rem]', gap: 'gap-2' },
  md: { icon: 32, text: 'text-lg', gap: 'gap-2.5' },
  lg: { icon: 44, text: 'text-2xl', gap: 'gap-3.5' },
}

export function Logo({ size = 'md', showWordmark = true, className }: LogoProps) {
  const { icon, text, gap } = SIZES[size]

  return (
    <div className={cn('inline-flex items-center tracking-tight', gap, className)}>
      {/* Red Stag Vector Mark */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="antlers-grad"
            x1="20"
            y1="12"
            x2="108"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-brand)" />
          </linearGradient>
          <linearGradient
            id="head-left"
            x1="40"
            y1="50"
            x2="64"
            y2="112"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="var(--color-brand)" />
            <stop
              offset="100%"
              stopColor="color-mix(in oklab, var(--color-brand) 60%, var(--color-base))"
            />
          </linearGradient>
          <linearGradient
            id="head-right"
            x1="64"
            y1="50"
            x2="88"
            y2="112"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0%"
              stopColor="color-mix(in oklab, var(--color-brand) 80%, var(--color-text))"
            />
            <stop
              offset="100%"
              stopColor="color-mix(in oklab, var(--color-brand) 85%, var(--color-base))"
            />
          </linearGradient>
        </defs>

        {/* Antlers */}
        <g
          stroke="url(#antlers-grad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M56 50 L42 32 L30 18" />
          <path d="M42 32 L26 34" />
          <path d="M34 23 L22 20" />
          <path d="M48 42 L34 46" />
          <path d="M72 50 L86 32 L98 18" />
          <path d="M86 32 L102 34" />
          <path d="M94 23 L106 20" />
          <path d="M80 42 L94 46" />
        </g>

        {/* Faceted Red Stag Head */}
        <polygon points="64,54 44,60 48,82 64,112" fill="url(#head-left)" />
        <polygon points="64,54 84,60 80,82 64,112" fill="url(#head-right)" />
        <polygon
          points="64,54 54,68 64,84 74,68"
          fill="color-mix(in oklab, var(--color-brand) 95%, var(--color-text))"
        />
        <polygon
          points="46,58 32,54 44,64"
          fill="color-mix(in oklab, var(--color-brand) 75%, var(--color-base))"
        />
        <polygon
          points="82,58 96,54 84,64"
          fill="color-mix(in oklab, var(--color-brand) 90%, var(--color-text))"
        />
        <polygon
          points="64,84 56,104 64,112 72,104"
          fill="color-mix(in oklab, var(--color-brand) 50%, var(--color-base))"
        />
        <circle cx="64" cy="106" r="3" fill="var(--color-accent)" />
      </svg>

      {showWordmark && (
        <span className={cn('leading-none font-bold text-text', text)}>
          McCor <span className="text-accent">Labs</span>
        </span>
      )}
    </div>
  )
}
