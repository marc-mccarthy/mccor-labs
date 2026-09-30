import Link from 'next/link'

import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <Section>
      <Container>
        <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          That page does not exist
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          The link may be out of date. Everything else is still where you left it.
        </p>
        <div className="mt-10">
          <Button asChild>
            <Link href="/">Back to the home page</Link>
          </Button>
        </div>
      </Container>
    </Section>
  )
}
