import { describe, expect, it } from 'vitest'
import { privacy } from './legal'

function allText(): string[] {
  return privacy.sections.flatMap((section) =>
    section.blocks.flatMap((block) => (block.kind === 'ul' ? block.items : [block.text])),
  )
}

function section(heading: string) {
  const found = privacy.sections.find((item) => item.heading === heading)
  if (found === undefined) throw new Error(`no section ${heading}`)
  return found
}

describe('privacy document', () => {
  it('names Bedrock, the retention periods and the regions', () => {
    const text = allText().join('\n')
    expect(text).toContain('Amazon Bedrock')
    expect(text).toContain('not stored by us')
    expect(text).toContain('3 days')
    expect(text).toContain('7 days')
    expect(text).toContain('Ohio or Oregon')
  })

  it('no longer says the contact form is all it collects', () => {
    for (const text of allText()) {
      expect(text).not.toContain('and nothing else')
    }
  })

  it('opens the short version with the live lab sentence', () => {
    const first = section('The short version').blocks[0]
    expect(first).toMatchObject({ kind: 'p' })
    expect(first?.kind === 'p' ? first.text : '').toContain(
      'the text you type for that test is sent to Amazon Bedrock to run it and is not stored by us',
    )
  })

  it('has a live lab subsection with four paragraphs before the reading subsection', () => {
    const blocks = section('What we collect, and when').blocks
    const start = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When you use the live lab',
    )
    const end = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When you simply read the site',
    )
    expect(start).toBeGreaterThan(-1)
    expect(end).toBe(start + 5)
    expect(blocks.slice(start + 1, end).every((block) => block.kind === 'p')).toBe(true)
  })

  it('points the access log line at the lab log', () => {
    expect(allText()).toContain(
      'We do not keep server access logs for this website. The live lab keeps the short technical log described above.',
    )
  })

  it('lists the live lab text among what AWS receives', () => {
    const list = section('Who else sees your information').blocks.find(
      (block) => block.kind === 'ul',
    )
    const aws = list?.kind === 'ul' ? list.items[0] : ''
    expect(aws).toContain('the text of any live lab test you run')
    expect(aws).toContain('run the lab’s AI model')
    expect(aws).toContain(
      'live lab tests may be processed in N. Virginia, Ohio or Oregon',
    )
  })

  it('states the live lab retention line', () => {
    expect(allText()).toContain(
      'Live lab text: not kept. Daily run counts: 7 days. Technical logs: 3 days.',
    )
  })
})
