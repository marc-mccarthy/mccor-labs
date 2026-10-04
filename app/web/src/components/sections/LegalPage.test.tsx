import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LegalPage } from './LegalPage'

describe('LegalPage', () => {
  it('marks itself so the film grain switches off on legal pages', () => {
    const { container } = render(
      <LegalPage
        document={{ title: 'Terms', description: 'd', updated: 'u', sections: [] }}
      />,
    )
    expect(container.querySelector('[data-legal]')).not.toBeNull()
  })
})
