import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { type Browser, chromium, firefox, webkit } from '@playwright/test'
import {
  CLIENTS,
  type Engine,
  type Scheme,
  framePage,
  reportPage,
  rewriteAssets,
  shotName,
} from './preview-page'
import { readTokens, requireToken } from './signature'

const WEB = join(import.meta.dirname, '..', '..')
const ASSET_BASE = 'https://mccorlabs.com/sig/framed'
const SCHEMES: readonly Scheme[] = ['light', 'dark']
const ENGINES = { chromium, webkit, firefox }

async function shoot(browser: Browser, html: string, pagePath: string, png: string) {
  writeFileSync(pagePath, html)
  const page = await browser.newPage({ deviceScaleFactor: 2 })
  await page.goto(pathToFileURL(pagePath).href)
  await page.waitForLoadState('networkidle')
  await page.locator('#frame').screenshot({ path: png })
  await page.close()
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      html: {
        type: 'string',
        default: join(WEB, 'public', 'sig', 'framed', 'marcm.html'),
      },
      assets: { type: 'string', default: join(WEB, 'public', 'sig', 'framed') },
      out: { type: 'string', default: join(WEB, '.signature-preview') },
      remote: { type: 'boolean', default: false },
      title: { type: 'string', default: 'Signature preview' },
    },
  })
  const tokens = readTokens(
    readFileSync(join(WEB, 'src', 'styles', 'globals.css'), 'utf8'),
  )
  const palette = {
    page: requireToken(tokens, 'text'),
    ink: requireToken(tokens, 'base'),
    muted: requireToken(tokens, 'border-strong'),
  }
  const out = resolve(values.out)
  mkdirSync(join(out, 'pages'), { recursive: true })
  const raw = readFileSync(resolve(values.html), 'utf8')
  const signature = values.remote
    ? raw
    : rewriteAssets(raw, ASSET_BASE, resolve(values.assets))
  for (const engine of Object.keys(ENGINES) as Engine[]) {
    const clients = CLIENTS.filter((client) => client.engine === engine)
    if (clients.length === 0) continue
    const browser = await ENGINES[engine].launch()
    for (const client of clients)
      for (const scheme of SCHEMES)
        await shoot(
          browser,
          framePage(signature, client, scheme),
          join(out, 'pages', `${client.slug}-${scheme}.html`),
          join(out, shotName(client, scheme)),
        )
    await browser.close()
  }
  const report = join(out, 'index.html')
  writeFileSync(report, reportPage(values.title, CLIENTS, palette))
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(pathToFileURL(report).href)
  await page.screenshot({ path: join(out, 'report.png'), fullPage: true })
  await browser.close()
  console.log(`report: ${report}\nimage:  ${join(out, 'report.png')}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
