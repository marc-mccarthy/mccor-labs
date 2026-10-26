import { afterAll, describe, expect, it, vi } from 'vitest'
import type { LegalDocument } from './types'

async function loadPrivacy(labLive: boolean, gaId = ''): Promise<LegalDocument> {
  vi.stubEnv('NEXT_PUBLIC_LAB_LIVE', labLive ? '1' : '0')
  vi.stubEnv('NEXT_PUBLIC_GA_ID', gaId)
  vi.resetModules()
  return (await import('./legal')).privacy
}

const livePrivacy = await loadPrivacy(true)
const quietPrivacy = await loadPrivacy(false)
const analyticsPrivacy = await loadPrivacy(false, 'G-ABC123XYZ9')

afterAll(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

function allText(privacy: LegalDocument = livePrivacy): string[] {
  return privacy.sections.flatMap((section) =>
    section.blocks.flatMap((block) => (block.kind === 'ul' ? block.items : [block.text])),
  )
}

function section(heading: string, privacy: LegalDocument = livePrivacy) {
  const found = privacy.sections.find((item) => item.heading === heading)
  if (found === undefined) throw new Error(`no section ${heading}`)
  return found
}

describe('privacy document with the live lab on', () => {
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
    const first = section('The Short Version').blocks[0]
    expect(first).toMatchObject({ kind: 'p' })
    expect(first?.kind === 'p' ? first.text : '').toContain(
      'the text you type for that test is sent to Amazon Bedrock to run it and is not stored by us',
    )
  })

  it('has a live lab subsection with four paragraphs, verdict marks subsection with two paragraphs, before the reading subsection', () => {
    const blocks = section('What We Collect, and When').blocks
    const labStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When You Use the Live Lab',
    )
    const marksStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When You Mark a Verdict as Wrong',
    )
    const readStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When You Simply Read the Site',
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

  it('points the access log line at the contact form and lab logs', () => {
    expect(allText()).toContain(
      'We do not keep server access logs for this website. The contact form’s 3-day technical log and the live lab’s short technical log are described above.',
    )
  })

  it('describes the live contact form', () => {
    const text = allText().join(' ')
    expect(text).toContain('emails your message to us')
    expect(text).toContain('does not save your message anywhere else')
    expect(text).toContain('deleted automatically after 7 days')
    expect(text).toContain('technical log for 3 days')
    expect(text).toContain('what happened (sent, rejected and why, or the type of error)')
    expect(text).toContain('today’s message count')
    expect(text).toContain('within 3 seconds')
  })

  it('lists the required phone number after the email address', () => {
    const list = section('What We Collect, and When').blocks.find(
      (block) => block.kind === 'ul',
    )
    const items = list?.kind === 'ul' ? list.items : []
    const email = items.indexOf('Your email address — required, so we can reply')
    expect(email).toBeGreaterThan(-1)
    expect(items[email + 1]).toBe('Your phone number — required (US or Canada)')
  })

  it('says the technical log never includes the phone number', () => {
    expect(allText().join(' ')).toContain(
      'It never logs your name, email address, phone number, company, budget or message.',
    )
  })

  it('places the contact form text under the contact form subsection', () => {
    const blocks = section('What We Collect, and When').blocks
    const formStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When You Use the Contact Form',
    )
    const mailStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When You Email Us Directly',
    )
    const formText = blocks
      .slice(formStart, mailStart)
      .flatMap((block) => (block.kind === 'ul' ? block.items : [block.text]))
      .join(' ')
    expect(formText).toContain('emails your message to us')
    expect(formText).toContain('within 3 seconds')
  })

  it('lists the live lab text among what AWS receives', () => {
    const list = section('Who Else Sees Your Information').blocks.find(
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

  it('states the contact retention period with no placeholder', () => {
    const text = section('How Long We Keep It')
      .blocks.flatMap((block) => (block.kind === 'ul' ? block.items : [block.text]))
      .join('\n')
    expect(text).toContain(
      'Contact form submissions and email correspondence are kept for 24 months from our last exchange, then deleted.',
    )
    expect(text).not.toContain('TODO(owner)')
  })

  it('covers verdict marks and the weekly digest', () => {
    const text = allText().join('\n')
    expect(text).toContain('Wrong?')
    expect(text).toContain('which rule in our rubric')
    expect(text).toContain('three fixed reasons')
    expect(text).toContain('90 days')
    expect(text).toContain('7 days')
    const blocks = section('What We Collect, and When').blocks
    const marksStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When You Mark a Verdict as Wrong',
    )
    const readStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When You Simply Read the Site',
    )
    const marksText = blocks
      .slice(marksStart, readStart)
      .flatMap((block) => (block.kind === 'ul' ? block.items : [block.text]))
      .filter((t) => t)
      .join('\n')
    expect(marksText).not.toContain('TODO(owner)')
  })
})

describe('privacy document with the live lab off', () => {
  const text = allText(quietPrivacy).join('\n')

  it('says the live lab is not switched on and sends nothing to an AI service', () => {
    const first = section('The Short Version', quietPrivacy).blocks[0]
    expect(first?.kind === 'p' ? first.text : '').toContain(
      'The live part of our lab is not switched on, so nothing you type in the lab is sent to an AI service.',
    )
  })

  it('keeps the unconditional claims of the short version', () => {
    const first = section('The Short Version', quietPrivacy).blocks[0]
    const body = first?.kind === 'p' ? first.text : ''
    expect(body).toContain('We do not use cookies. We do not use analytics.')
    expect(body).toContain('we do not sell or share your information')
  })

  it('names no Bedrock processing, live run record or live lab retention', () => {
    expect(text).not.toContain('sent to Amazon Bedrock to run')
    expect(text).not.toContain('Race this step or Argue the other side, the examples')
    expect(text).not.toContain('live lab test you run')
    expect(text).not.toContain('run the lab’s AI model')
    expect(text).not.toContain('Live lab text: not kept')
    expect(text).not.toContain('live lab’s short technical log')
    expect(text).not.toContain('Ohio or Oregon')
  })

  it('has a lab subsection with the builder paragraph and the not-switched-on paragraph', () => {
    const blocks = section('What We Collect, and When', quietPrivacy).blocks
    const labStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When You Use the Lab',
    )
    const marksStart = blocks.findIndex(
      (block) => block.kind === 'h3' && block.text === 'When You Mark a Verdict as Wrong',
    )
    expect(labStart).toBeGreaterThan(-1)
    expect(marksStart).toBe(labStart + 3)
    expect(blocks[labStart + 1]).toMatchObject({
      kind: 'p',
      text: expect.stringContaining('The lab’s builder runs in your browser.'),
    })
    expect(blocks[labStart + 2]).toMatchObject({
      kind: 'p',
      text: 'The lab’s live tests, Race this step and Argue the other side, are not switched on. Nothing you type in the lab is sent to Amazon Bedrock or any other AI service.',
    })
  })

  it('points the access log line at the contact form log only', () => {
    expect(allText(quietPrivacy)).toContain(
      'We do not keep server access logs for this website. The contact form’s 3-day technical log is described above.',
    )
  })

  it('lists only contact form data and email among what AWS receives', () => {
    const list = section('Who Else Sees Your Information', quietPrivacy).blocks.find(
      (block) => block.kind === 'ul',
    )
    expect(list?.kind === 'ul' ? list.items[0] : '').toBe(
      'Amazon Web Services gets contact form submissions in transit and at rest, and the email itself. They host this site and run the email delivery. Contact data is processed in the US East (N. Virginia) region',
    )
  })

  it('states the retention line without live lab text', () => {
    expect(allText(quietPrivacy)).toContain(
      'Daily message counts: 7 days. Technical logs: 3 days.',
    )
  })

  it('keeps the contact form, marks and reading subsections', () => {
    for (const heading of [
      'When You Use the Contact Form',
      'When You Mark a Verdict as Wrong',
      'When You Simply Read the Site',
    ]) {
      expect(allText(quietPrivacy)).toContain(heading)
    }
  })
})

describe('privacy document with Google Analytics off', () => {
  it('never mentions Google Analytics or its cookies', () => {
    const text = allText(quietPrivacy).join('\n')
    expect(text).not.toContain('Google Analytics')
    expect(text).not.toContain('_ga')
    expect(text).toContain(
      'No cookies are set. Not for analytics, not for advertising, not for functionality',
    )
  })
})

describe('privacy document with Google Analytics on', () => {
  const text = allText(analyticsPrivacy).join('\n')

  it('says in the short version that Google Analytics sets cookies', () => {
    const first = section('The Short Version', analyticsPrivacy).blocks[0]
    const body = first?.kind === 'p' ? first.text : ''
    expect(body).toContain('We use Google Analytics to count visits')
    expect(body).not.toContain('We do not use cookies')
    expect(body).not.toContain('We do not use analytics')
    expect(body).toContain('we do not sell or share your information')
  })

  it('names the cookies, how long they last and what is counted', () => {
    expect(text).toContain('_ga')
    expect(text).toContain('2 years')
    expect(text).not.toContain('No cookies are set')
    expect(text).not.toContain('No analytics service is used')
  })

  it('does not load Google Analytics when the browser sends a privacy signal', () => {
    expect(text).toContain(
      'If your browser sends a Global Privacy Control or Do Not Track signal, Google Analytics is not loaded at all.',
    )
  })

  it('lists Google Analytics among who else sees information and drops it from the never-used list', () => {
    const others = section('Who Else Sees Your Information', analyticsPrivacy)
    const list = others.blocks.find((block) => block.kind === 'ul')
    expect(list?.kind === 'ul' ? list.items.join('\n') : '').toContain('Google Analytics')
    expect(allText(analyticsPrivacy)).not.toContain(
      'That is the complete list. We do not use a CRM, an email marketing platform, an analytics provider, an advertising network, or a chat widget.',
    )
  })

  it('states how long Google keeps visit data', () => {
    const retention = section('How Long We Keep It', analyticsPrivacy).blocks
    expect(
      retention.map((block) => (block.kind === 'p' ? block.text : '')).join('\n'),
    ).toContain('Google Analytics visit data: 14 months')
  })
})
