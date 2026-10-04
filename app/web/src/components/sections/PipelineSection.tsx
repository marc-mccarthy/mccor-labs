import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { PipelineDiagram } from '@/components/substance/PipelineDiagram'
import { retrievalPipeline } from '@/content/substance'

export function PipelineSection() {
  return (
    <Section>
      <Container>
        <PipelineDiagram {...retrievalPipeline} />
      </Container>
    </Section>
  )
}
