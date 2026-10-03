import { describe, expect, it } from 'vitest'
import { highlight } from './highlight'

describe('highlight', () => {
  it('returns highlighted markup containing the input tokens and a pre element', async () => {
    const html = await highlight('const x = 1', 'typescript')
    expect(html).toContain('<pre')
    expect(html).toContain('const')
    expect(html).toContain('x')
  })

  it('throws on an unknown language rather than silently returning plain text', async () => {
    await expect(highlight('const x = 1', 'not-a-real-language')).rejects.toThrow()
  })
})
