import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Template from './template'

describe('root template', () => {
  it('renders the page inside the route transition', () => {
    const { container } = render(
      <Template>
        <h1>Page</h1>
      </Template>,
    )
    expect(container.firstElementChild?.firstElementChild).toBe(
      screen.getByRole('heading', { level: 1, name: 'Page' }),
    )
  })
})
