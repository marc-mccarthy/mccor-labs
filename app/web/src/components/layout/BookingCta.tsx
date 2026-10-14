import { Magnetic } from '@/components/motion/Magnetic'
import { Button } from '@/components/ui/button'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { env } from '@/lib/env'

interface BookingCtaProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'link'
}

export function BookingCta({ size = 'md', variant = 'primary' }: BookingCtaProps) {
  const button = (
    <Button asChild size={size} variant={variant}>
      {env.bookingUrl === null ? (
        <a href={`mailto:${site.contactEmail}`}>{ui.contactFallback}</a>
      ) : (
        <a href={env.bookingUrl} target="_blank" rel="noopener noreferrer">
          {ui.bookCall}
        </a>
      )}
    </Button>
  )

  return variant === 'link' ? button : <Magnetic>{button}</Magnetic>
}
