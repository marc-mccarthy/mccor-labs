import { chromium } from '@playwright/test'
import {
  MULTI_MATCH_SELECTOR_KEYS,
  routesFor,
  SITES,
  VIEWPORTS,
  viewportsFor,
} from './lib/sites.mjs'

const argv = process.argv
const flag = (name) => {
  const i = argv.indexOf(name)
  return i === -1 ? null : argv[i + 1]
}
const ONLY_SITE = flag('--site')
const ONLY_VIEWPORT = flag('--viewport')
const HEADED = argv.includes('--headed')

const HEADFUL_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

const ENTRY_SETTLE_MS = 10000

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
  await page.evaluate(() => document.fonts.ready).catch(() => {})
  await page
    .waitForFunction(
      () => {
        const els = [
          ...document.querySelectorAll(
            '.loader, .preloader, [class*="loader"], [class*="preloader"], [class*="Loader"]',
          ),
        ]
        return !els.some((el) => {
          const r = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          return (
            cs.display !== 'none' &&
            Number(cs.opacity) > 0.05 &&
            r.width * r.height > innerWidth * innerHeight * 0.5
          )
        })
      },
      { timeout: 15000 },
    )
    .catch(() => {})
  await page.waitForTimeout(2500)
}

async function dismissConsent(page, text) {
  if (!text) return null
  const btn = page.locator(`button:text-is("${text}")`).first()
  if (!(await btn.count())) return 'CONSENT_BUTTON_NOT_FOUND'
  await btn.click({ timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(2000)
  return null
}

async function enterRoute(page, route, attempt = 0) {
  const entry = route.entry
  if (!entry) return null
  const gateSel = entry.selector
  const urlBefore = page.url()

  if (entry.readySelector) {
    await page
      .waitForSelector(entry.readySelector, { timeout: entry.readyTimeoutMs ?? 30000 })
      .catch(() => {})
  } else if (entry.settleBeforeMs) {
    await page.waitForTimeout(entry.settleBeforeMs)
  }

  const pre = await page.evaluate((sel) => {
    const els = document.querySelectorAll(sel)
    const el = els[0]
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      count: els.length,
      scrollHeight: document.documentElement.scrollHeight,
      x: Math.round(r.x + r.width / 2),
      y: Math.round(r.y + r.height / 2),
      w: Math.round(r.width),
      h: Math.round(r.height),
    }
  }, gateSel)
  if (!pre || pre.w < 8 || pre.h < 8) return 'ENTRY_TARGET_NOT_FOUND'

  if (entry.method === 'locator') {
    await page
      .locator(gateSel)
      .first()
      .click({ timeout: 15000 })
      .catch(() => {})
  } else {
    await page.mouse.move(pre.x, pre.y)
    await page.waitForTimeout(500)
    await page.mouse.click(pre.x, pre.y)
  }

  await page.waitForTimeout(ENTRY_SETTLE_MS)

  if (page.url() !== urlBefore) {
    await page.goBack().catch(() => {})
    return 'GATE_CLICK_NAVIGATED'
  }

  const entered = await page.evaluate(
    ({ sel, preCount, preSh }) =>
      document.querySelectorAll(sel).length < preCount ||
      document.documentElement.scrollHeight > preSh * 1.5,
    { sel: gateSel, preCount: pre.count, preSh: pre.scrollHeight },
  )
  if (entered) return null

  if (attempt < 2) {
    await page.reload({ waitUntil: 'load', timeout: 60000 }).catch(() => {})
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    return enterRoute(page, route, attempt + 1)
  }
  return 'GATE_NOT_ENTERED'
}

const browser = await chromium.launch({ headless: !HEADED })
let defects = 0
let checks = 0
const notes = []

for (const site of SITES) {
  if (ONLY_SITE && site.slug !== ONLY_SITE) continue
  const viewports = viewportsFor(site).filter(
    (v) => !ONLY_VIEWPORT || v === ONLY_VIEWPORT,
  )

  for (const route of routesFor(site)) {
    const hasTargets =
      Object.keys(route.sections ?? {}).length > 0 || route === routesFor(site)[0]
    if (!hasTargets) continue

    for (const vpName of viewports) {
      const ctx = await browser.newContext({
        viewport: {
          width: VIEWPORTS[vpName].width,
          height: VIEWPORTS[vpName].height,
        },
        deviceScaleFactor:
          route.entry?.deviceScaleFactorOverride ?? VIEWPORTS[vpName].deviceScaleFactor,
        isMobile: VIEWPORTS[vpName].isMobile,
        hasTouch: VIEWPORTS[vpName].isMobile,
        userAgent: HEADFUL_UA,
        locale: 'en-US',
        timezoneId: 'America/Chicago',
        colorScheme: 'light',
        reducedMotion: 'no-preference',
      })
      const page = await ctx.newPage()
      const label = `${site.slug}/${route.name} @ ${vpName}`

      try {
        let resp = await page
          .goto(route.url, { waitUntil: 'load', timeout: 60000 })
          .catch(() => null)
        if (!resp) {
          resp = await page.goto(route.url, { waitUntil: 'load', timeout: 90000 })
        }
        if (resp && resp.status() >= 400) {
          defects++
          console.log(`${label}: ROUTE_HTTP_${resp.status()} ${route.url}`)
          await ctx.close()
          continue
        }
        if (route.entry) {
          await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
        } else {
          await settle(page)
        }

        const consentErr = await dismissConsent(page, site.quirks?.consentBanner)
        if (consentErr) notes.push(`${label}: ${consentErr}`)

        const gateErr = await enterRoute(page, route)
        if (gateErr) {
          const verified = route.entry?.verifiedViewports ?? null
          if (!verified || verified.includes(vpName)) {
            defects++
            console.log(`${label}: ${gateErr}`)
            await ctx.close()
            continue
          }
          notes.push(
            `${label}: ${gateErr} — declared unverified at this viewport in sites.mjs; ` +
              `selectors below were resolved on the GATE screen`,
          )
        }

        const targets = {}
        for (const [name, v] of Object.entries(route.sections ?? {})) {
          const sel = typeof v === 'string' ? v : v.selector
          const allowed = typeof v === 'string' ? null : v.viewports
          if (allowed && !allowed.includes(vpName)) continue
          targets['section:' + name] = sel
        }
        if (route === routesFor(site)[0]) {
          for (const [name, v] of Object.entries(site.selectors)) {
            if (!v) continue
            const sel = typeof v === 'string' ? v : v.selector
            const allowed = typeof v === 'string' ? null : v.viewports
            if (allowed && !allowed.includes(vpName)) continue
            targets['selector:' + name] = sel
          }
        }
        if (!Object.keys(targets).length) {
          console.log(`${label}: ok (0 selectors declared)`)
          await ctx.close()
          continue
        }

        const counts = await page.evaluate(
          (m) =>
            Object.fromEntries(
              Object.entries(m).map(([k, v]) => {
                try {
                  return [k, document.querySelectorAll(v).length]
                } catch {
                  return [k, -1]
                }
              }),
            ),
          targets,
        )

        const bad = []
        for (const [key, n] of Object.entries(counts)) {
          checks++
          const plainKey = key.split(':')[1]
          const multi =
            key.startsWith('selector:') && MULTI_MATCH_SELECTOR_KEYS.has(plainKey)
          const ok = multi ? n >= 1 : n === 1
          if (!ok) bad.push([key, n, targets[key]])
        }

        if (bad.length) {
          defects += bad.length
          console.log(`${label}: MISMATCH`)
          for (const [k, n, sel] of bad) console.log(`    ${k} = ${n}  ${sel}`)
        } else {
          const cardInfo = Object.entries(counts)
            .filter(([k]) => MULTI_MATCH_SELECTOR_KEYS.has(k.split(':')[1]))
            .map(([k, n]) => `${k.split(':')[1]}x${n}`)
            .join(' ')
          console.log(
            `${label}: ok (${Object.keys(counts).length} selectors${cardInfo ? ', ' + cardInfo : ''})`,
          )
        }
      } catch (e) {
        defects++
        console.log(`${label}: ERROR ${String(e).split('\n')[0].slice(0, 160)}`)
      }
      await ctx.close()
    }
  }
}

await browser.close()

if (notes.length) {
  console.log('\nnotes:')
  for (const n of notes) console.log('  ' + n)
}
console.log(
  defects
    ? `\n${defects} DEFECTS across ${checks} checks — fix sites.mjs before any capture`
    : `\nall ${checks} selectors resolve as declared at every tier viewport`,
)
process.exit(defects ? 1 : 0)
