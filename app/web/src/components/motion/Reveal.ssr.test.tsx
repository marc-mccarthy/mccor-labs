import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Reveal } from './Reveal'

describe('Reveal server markup', () => {
  it('ships content visible, never opacity 0, so it survives without JS', () => {
    const html = renderToStaticMarkup(
      <Reveal>
        <p>content</p>
      </Reveal>,
    )
    expect(html).toContain('content')
    expect(html).not.toMatch(/opacity:\s*0/)
    expect(html).not.toContain('transform')
  })
})
