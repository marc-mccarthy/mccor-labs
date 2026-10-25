import { describe, expect, it } from 'vitest'

import { GET } from './route'
import { footerNav } from '@/content/nav'

describe('llms.txt', () => {
  it('is plain text', () => {
    expect(GET().headers.get('content-type')).toBe('text/plain; charset=utf-8')
  })

  it('emits the title, tagline and one described link per page', async () => {
    const body = await GET().text()
    expect(body).toBe(
      [
        '# McCor Labs',
        '',
        '> A senior engineering studio building flagship websites, applications and AI features for companies that need them to actually work.',
        '',
        '- [Home](https://mccorlabs.com/): Swift by Instinct. Engineered to the Core.',
        '- [Services](https://mccorlabs.com/services/): What we build, and how we price it.',
        '- [Process](https://mccorlabs.com/process/): How an engagement runs, from first call to launch.',
        '- [About](https://mccorlabs.com/about/): A small senior team, and how we work together.',
        '- [Contact](https://mccorlabs.com/contact/): Tell us about the project, or book a call directly.',
        '- [Should This Be AI?](https://mccorlabs.com/lab/should-this-be-ai/): A free test that sorts each step of a workflow into the tool that fits it, with the reason in plain words.',
        '- [Careers](https://mccorlabs.com/careers/): How we hire, and what we look for.',
        '- [Privacy](https://mccorlabs.com/privacy/): How we handle information you send us.',
        '- [Terms](https://mccorlabs.com/terms/): The terms that apply to this site.',
        '',
      ].join('\n'),
    )
    expect(body).not.toContain('\r')
  })

  it('links every footer page and omits /work/', async () => {
    const body = await GET().text()
    for (const item of footerNav) {
      expect(body).toContain(`](https://mccorlabs.com${item.href})`)
    }
    expect(body).not.toContain('/work/')
  })
})
