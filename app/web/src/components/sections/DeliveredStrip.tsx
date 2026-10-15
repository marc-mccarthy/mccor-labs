import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Stagger } from '@/components/motion/Stagger'
import { Reveal } from '@/components/motion/Reveal'
import { proof } from '@/content/proof'
import { ui } from '@/content/ui'

const COLUMNS_CLASS =
  'sm:[&>*:first-child]:pr-8 sm:[&>*+*]:border-l sm:[&>*+*]:border-border sm:[&>*+*]:pl-8'

export function DeliveredStrip() {
  return (
    <Section size="compact" className="relative border-y border-border">
      <span
        aria-hidden="true"
        data-signal-sweep
        className="pointer-events-none absolute inset-x-0 -top-px block"
      />
      <Container>
        <Reveal variant="mask">
          <h2 className="font-mono text-sm leading-tight font-semibold tracking-wider text-muted uppercase">
            {ui.deliveredHeading}
          </h2>
        </Reveal>
        <div className={`mt-6 grid gap-8 sm:grid-cols-2 sm:gap-0 ${COLUMNS_CLASS}`}>
          <Stagger>
            {proof.map((point, index) => (
              <div key={point.text} className="flex flex-col gap-3">
                <span aria-hidden="true" className="font-mono text-sm text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="font-mono text-xl text-text">{point.text}</p>
              </div>
            ))}
          </Stagger>
        </div>
      </Container>
    </Section>
  )
}
