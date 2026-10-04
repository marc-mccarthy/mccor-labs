import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CapabilityBlock } from './CapabilityBlock'
import { ServiceBlock } from './ServiceBlock'
import { services } from '@/content/services'
import type { Capability } from '@/content/types'

vi.mock('@/components/substance/CodeBlock', () => ({
  CodeBlock: ({ filename }: { filename: string }) => <pre>{filename}</pre>,
}))

vi.mock('./CapabilityBlock', () => ({
  CapabilityBlock: ({ capability }: { capability: Capability }) => (
    <div data-testid="capability">{capability.title}</div>
  ),
}))

function mockMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

const websites = services.find((s) => s.slug === 'websites')!
const ai = services.find((s) => s.slug === 'ai-engineering')!
const consulting = services.find((s) => s.slug === 'consulting')!

describe('ServiceBlock', () => {
  beforeEach(mockMatchMedia)

  it('renders title, detail and every deliverable', () => {
    render(<ServiceBlock service={websites} />)
    expect(screen.getByRole('heading', { name: websites.title })).toBeInTheDocument()
    expect(screen.getByText(websites.detail)).toBeInTheDocument()
    for (const deliverable of websites.deliverables) {
      expect(screen.getByText(deliverable)).toBeInTheDocument()
    }
  })

  it('renders its title through SectionHeading', () => {
    render(<ServiceBlock service={websites} />)
    const heading = screen.getByRole('heading', { level: 2, name: websites.title })
    expect(heading.parentElement).toHaveAttribute('data-reveal')
  })

  it('renders an anchor carrying the service slug', () => {
    const { container } = render(<ServiceBlock service={websites} />)
    expect(container.querySelector(`#${websites.slug}`)).not.toBeNull()
  })

  it('renders one capability block per capability when present', () => {
    render(<ServiceBlock service={ai} />)
    expect(screen.getAllByTestId('capability')).toHaveLength(
      ai.capabilities?.length ?? -1,
    )
  })

  it('renders no capability blocks when absent', () => {
    render(<ServiceBlock service={consulting} />)
    expect(screen.queryAllByTestId('capability')).toHaveLength(0)
  })
})

describe('CapabilityBlock', () => {
  const actual = async () =>
    vi.importActual<{ CapabilityBlock: typeof CapabilityBlock }>('./CapabilityBlock')

  it('renders a code capability through CodeBlock', async () => {
    mockMatchMedia()
    const { CapabilityBlock: Real } = await actual()
    const capability = ai.capabilities!.find((c) => c.substance.kind === 'code')!
    const { container } = render(await Real({ capability }))
    expect(screen.getByText(capability.title)).toBeInTheDocument()
    expect(container.querySelector('pre')).not.toBeNull()
  })

  it('renders a diagram capability as an image-role svg', async () => {
    mockMatchMedia()
    const { CapabilityBlock: Real } = await actual()
    const capability = ai.capabilities!.find((c) => c.substance.kind === 'diagram')!
    render(await Real({ capability }))
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('renders the named integration surfaces inside a permission boundary', async () => {
    mockMatchMedia()
    const { CapabilityBlock: Real } = await actual()
    const capability = ai.capabilities!.find((c) => c.slug === 'ai-integration')!
    const { container } = render(await Real({ capability }))
    for (const surface of ['CRM', 'Ticketing', 'Data warehouse', 'Records DB']) {
      expect(screen.getByText(surface)).toBeInTheDocument()
    }
    expect(container.querySelectorAll('svg rect')).toHaveLength(1)
  })

  it('renders the websites build excerpt as terminal output', async () => {
    const { CapabilityBlock: Real } = await actual()
    const capability = websites.capabilities!.find(
      (c) => c.substance.kind === 'terminal',
    )!
    render(await Real({ capability }))
    expect(
      screen.getByText('op run --env-file=app/web/.env.template -- pnpm -F web build'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('○ (Static) prerendered as static content'),
    ).toBeInTheDocument()
  })

  it('throws on an unknown ref instead of rendering nothing', async () => {
    const { CapabilityBlock: Real } = await actual()
    const capability: Capability = {
      slug: 'x',
      title: 'X',
      summary: 'x',
      substance: { kind: 'diagram', ref: 'does-not-exist' },
    }
    await expect(Real({ capability })).rejects.toThrow(/does-not-exist/)
  })

  it('resolves every ref used by the services content', async () => {
    mockMatchMedia()
    const { CapabilityBlock: Real } = await actual()
    for (const service of services) {
      for (const capability of service.capabilities ?? []) {
        await expect(Real({ capability })).resolves.toBeDefined()
      }
    }
  })
})
