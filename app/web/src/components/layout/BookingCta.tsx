import { Button } from '@/components/ui/button'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { env } from '@/lib/env'

interface BookingCtaProps {
  size?: 'sm' | 'md' | 'lg'
}

export function BookingCta({ size = 'md' }: BookingCtaProps) {
  if (env.bookingUrl === null) {
    return (
      <Button asChild size={size}>
        <a href={`mailto:${site.contactEmail}`}>{ui.contactFallback}</a>
      </Button>
    )
  }

  return (
    <Button asChild size={size}>
      <a href={env.bookingUrl} target="_blank" rel="noopener noreferrer">
        {ui.bookCall}
      </a>
    </Button>
  )
}
