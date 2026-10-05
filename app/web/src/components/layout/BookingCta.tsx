import { Magnetic } from '@/components/motion/Magnetic'
import { Button } from '@/components/ui/button'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { env } from '@/lib/env'

interface BookingCtaProps {
  size?: 'sm' | 'md' | 'lg'
}

export function BookingCta({ size = 'md' }: BookingCtaProps) {
  return (
    <Magnetic>
      <Button asChild size={size}>
        {env.bookingUrl === null ? (
          <a href={`mailto:${site.contactEmail}`}>{ui.contactFallback}</a>
        ) : (
          <a href={env.bookingUrl} target="_blank" rel="noopener noreferrer">
            {ui.bookCall}
          </a>
        )}
      </Button>
    </Magnetic>
  )
}
