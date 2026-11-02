import { describe, expect, it } from 'vitest'
import { CLIENTS, framePage, reportPage, rewriteAssets, shotName } from './preview-page'

const signature =
  '<table id="sig" style="background:#f5f5f7"><tr><td style="color:#08080a"><img src="https://mccorlabs.com/sig/framed/marcm-card.png"></td></tr></table>'

const byDark = (mode: string) => CLIENTS.find((client) => client.dark === mode)

describe('CLIENTS', () => {
  it('covers no-change, partial and full dark-mode clients on all three engines', () => {
    expect(new Set(CLIENTS.map((client) => client.dark))).toEqual(
      new Set(['none', 'partial', 'full']),
    )
    expect(new Set(CLIENTS.map((client) => client.engine))).toEqual(
      new Set(['chromium', 'webkit', 'firefox']),
    )
    expect(new Set(CLIENTS.map((client) => client.slug)).size).toBe(CLIENTS.length)
  })
})

describe('rewriteAssets', () => {
  it('points hosted signature images at a local folder', () => {
    const html = rewriteAssets(signature, 'https://mccorlabs.com/sig/framed', '/tmp/sig')
    expect(html).toContain('src="file:///tmp/sig/marcm-card.png"')
    expect(html).not.toContain('https://mccorlabs.com')
  })
})

describe('framePage', () => {
  it('keeps the signature as built in light mode', () => {
    const client = byDark('full')
    if (!client) throw new Error('no full-invert client')
    expect(framePage(signature, client, 'light')).toContain(signature)
  })

  it('applies the client dark-mode rule and its dark canvas', () => {
    const client = byDark('partial')
    if (!client) throw new Error('no partial-invert client')
    const page = framePage(signature, client, 'dark')
    expect(page).not.toContain('background:#f5f5f7')
    expect(page).toContain(`background:${client.canvas.dark}`)
    expect(page).toContain('id="frame"')
  })

  it('leaves no-change clients untouched in dark mode apart from the canvas', () => {
    const client = byDark('none')
    if (!client) throw new Error('no no-change client')
    expect(framePage(signature, client, 'dark')).toContain(signature)
  })
})

describe('reportPage', () => {
  it('lists every client with a light and a dark shot', () => {
    const page = reportPage('Test', CLIENTS)
    for (const client of CLIENTS) {
      expect(page).toContain(client.name)
      expect(page).toContain(`src="${shotName(client, 'light')}"`)
      expect(page).toContain(`src="${shotName(client, 'dark')}"`)
    }
  })
})
