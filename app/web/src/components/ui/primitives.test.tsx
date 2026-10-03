import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Anchor } from './anchor'
import { Badge } from './badge'
import { Card } from './card'

const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b/

describe('Card, Badge and Anchor', () => {
  it('Card renders children inside a bordered surface', () => {
    render(<Card>Inside</Card>)
    const card = screen.getByText('Inside')
    expect(card).toHaveClass('border', 'border-border', 'bg-surface')
  })

  it('Badge renders its label in the mono face', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toHaveClass('font-mono')
  })

  it('Anchor renders a scroll target with the given id and no visible content', () => {
    render(<Anchor id="ai-engineering" />)
    const target = document.getElementById('ai-engineering')
    expect(target).not.toBeNull()
    expect(target).toBeEmptyDOMElement()
  })

  it('none of the three emit a raw colour value', () => {
    render(
      <>
        <Card>Inside</Card>
        <Badge>New</Badge>
        <Anchor id="raw-colour-check" />
      </>,
    )
    const nodes = [
      screen.getByText('Inside'),
      screen.getByText('New'),
      document.getElementById('raw-colour-check'),
    ]
    for (const node of nodes) {
      expect(node?.className ?? '').not.toMatch(RAW_COLOUR)
    }
  })
})
