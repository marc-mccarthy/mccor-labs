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

  it('has a live lab subsection with four paragraphs, verdict marks subsection with two paragraphs, before the reading subsection', () => {
    const blocks = section('What we collect, and when').blocks
    const labStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When you use the live lab',
    )
    const marksStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When you mark a verdict as wrong',
    )
    const readStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When you simply read the site',
    )
    expect(labStart).toBeGreaterThan(-1)
    expect(marksStart).toBe(labStart + 5)
    expect(readStart).toBe(marksStart + 3)
    expect(
      blocks.slice(labStart + 1, marksStart).every((block) => block.kind === 'p'),
    ).toBe(true)
    expect(
      blocks.slice(marksStart + 1, readStart).every((block) => block.kind === 'p'),
    ).toBe(true)
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

  it('covers verdict marks and the weekly digest', () => {
    const text = allText().join('\n')
    expect(text).toContain('Wrong?')
    expect(text).toContain('which rule in our rubric')
    expect(text).toContain('three fixed reasons')
    expect(text).toContain('90 days')
    expect(text).toContain('7 days')
    const blocks = section('What we collect, and when').blocks
    const marksStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When you mark a verdict as wrong',
    )
    const readStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When you simply read the site',
    )
    const marksText = blocks
      .slice(marksStart, readStart)
      .flatMap((block) => (block.kind === 'ul' ? block.items : [block.text]))
      .filter((t) => t)
      .join('\n')
    expect(marksText).not.toContain('TODO(owner)')
  })
})
