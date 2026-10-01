/**
 * verify-site-selectors.mjs — resolve every selector in sites.mjs against the live sites.
 *
 * REQUIREMENTS
 * - Node >= 24, `pnpm install` already run. @playwright/test is pinned EXACTLY 1.61.0; never run
 *   `pnpm add` / `pnpm update` / `playwright install` — a browser download is ~500MB.
 * - Network access to all ten reference origins.
 * - The Bash sandbox must be DISABLED (it is, session-wide). `dangerouslyDisableSandbox` is no
 *   longer needed and must not be passed.
 *
 * INVOCATION
 *   node scripts/verify-site-selectors.mjs
 *   node scripts/verify-site-selectors.mjs --site y-n10
 *   node scripts/verify-site-selectors.mjs --site guglieri --viewport mobile
 *   node scripts/verify-site-selectors.mjs --headed          # for eyeballing a gate
 *
 * WHAT IT ASSERTS, and why each rule exists
 * - Every `route.sections` selector resolves to EXACTLY 1 element at EVERY viewport in the site's
 *   tier (Ruling 8). Recon ran only at 1440x900; a section that exists at desktop and not at
 *   mobile produces a blank PNG that looks exactly like a successful capture.
 * - Every `site.selectors.*` resolves to exactly 1 — EXCEPT the keys in
 *   MULTI_MATCH_SELECTOR_KEYS (`card`), which are repeating grid units by definition and are
 *   asserted `>= 1`. Forcing :nth-of-type(1) onto a card to satisfy a uniqueness check would
 *   fabricate a record of a grid that does not exist.
 * - Viewport-limited entries are declared `{selector, viewports:[...]}` and are SKIPPED at other
 *   viewports rather than counted as defects — capture skips them there too.
 * - GATED ROUTES ARE ENTERED FIRST. A selector behind a gate resolves to 0 until the gate opens,
 *   so verifying without entering measures the splash screen, not the site.
 *
 * GATE DELIVERY IS PER ROUTE, and the two real gates need OPPOSITE methods (both measured):
 *   y-n10          `method: "rawMouse"` — the gate div computes pointer-events:none and
 *                  elementFromPoint returns `main`, so locator.click() fails its actionability
 *                  check, yet a raw page.mouse click at the measured rect centre does land.
 *   pacomepertant  `method: "locator"`  — the exact opposite: locator.click() enters reliably
 *                  (even headless) and a raw page.mouse click at the same point does nothing.
 * A URL guard runs after every gate click: "Enter" matches inside "Enterprise", and a gate click
 * that changes the URL was never a gate click.
 *
 * FAILURE MODES AND WHAT TO DO
 *   count 0 at SOME viewports  -> genuinely viewport-limited; convert to {selector, viewports:[…]}
 *   count 0 at EVERY viewport  -> stale or a preloader artifact; replace the selector or drop it
 *   count > 1                  -> not unique; qualify it with :nth-of-type or a tighter scope
 *   GATE_NOT_ENTERED           -> the gate recipe changed; re-measure before trusting any count
 *   GATE_CLICK_NAVIGATED       -> the match hit a link, not a gate; anchor the match text
 *
 * EXIT: 0 when every selector resolves as declared, 1 otherwise. Never leave it non-zero.
 */
import { chromium } from '@playwright/test'
import {
  SITES,
  VIEWPORTS,
  MULTI_MATCH_SELECTOR_KEYS,
  viewportsFor,
  routesFor,
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

/** Post-click wait. Entry transitions run 1-3s on pacomepertant and ~7s on y-n10. */
const ENTRY_SETTLE_MS = 10000

/**
 * Wait for the page to be worth measuring. Deliberately NOT the recon script's gate, which
 * required scrollHeight > 1.2x the viewport: three sites in this corpus (topology-vc, belenjones,
 * pacomepertant) are fixed-height by design and would time out on it every time. Here the only
 * hard requirement is that a full-viewport preloader is gone.
 */
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

/** Dismiss a cookie banner. It is NOT an entry gate and must never be captured as one. */
async function dismissConsent(page, text) {
  if (!text) return null
  const btn = page.locator(`button:text-is("${text}")`).first()
  if (!(await btn.count())) return 'CONSENT_BUTTON_NOT_FOUND'
  await btn.click({ timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(2000)
  return null
}

/**
 * Enter a gated route. Returns null on success or an error code.
 * The entry signal is the GATE DISAPPEARING, never content growth: pacomepertant's main.children
 * goes 1 -> 0 and scrollHeight stays 900 on a successful entry.
 */
async function enterRoute(page, route, attempt = 0) {
  const entry = route.entry
  if (!entry) return null
  const gateSel = entry.selector
  const urlBefore = page.url()

  // The gate is often present in the DOM before it is wired up. y-n10 measurably ignores a click
  // at 2.5s and accepts the identical click at 9s.
  //
  // Prefer the site's OWN readiness signal where it publishes one. pacomepertant adds a `show`
  // class to the button at ~11.8s while the button itself exists from ~2.3s, and the delay varies
  // with connection speed, so no fixed number is correct — a 3s wait clicked an inert button and
  // the gate never opened. Fall back to settleBeforeMs for gates with no such signal.
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
    // rawMouse: the selector gives GEOMETRY, a raw mouse click gives DELIVERY. y-n10's gate
    // computes pointer-events:none, so locator.click() and even click({force:true}) fail — but a
    // hover followed by a real click at the measured rect centre lands. `noScrollBeforeClick` is
    // honoured by NOT calling scrollIntoView: scrolling moves the gate and the click stops
    // registering (measured both ways).
    await page.mouse.move(pre.x, pre.y)
    await page.waitForTimeout(500)
    await page.mouse.click(pre.x, pre.y)
  }

  await page.waitForTimeout(ENTRY_SETTLE_MS)

  // Ruling 22: a gate click must NOT change the URL. "Enter" matches inside "Enterprise".
  if (page.url() !== urlBefore) {
    await page.goBack().catch(() => {})
    return 'GATE_CLICK_NAVIGATED'
  }

  // The entry signal is the GATE DISAPPEARING or the document changing shape — never content
  // growth. pacomepertant's main.children goes 1 -> 0 while the visible page gets richer;
  // y-n10 keeps all three div.button.hov and instead grows 900 -> 22592.
  const entered = await page.evaluate(
    ({ sel, preCount, preSh }) =>
      document.querySelectorAll(sel).length < preCount ||
      document.documentElement.scrollHeight > preSh * 1.5,
    { sel: gateSel, preCount: pre.count, preSh: pre.scrollHeight },
  )
  if (entered) return null
  // y-n10's gate is measurably NON-DETERMINISTIC: two byte-identical runs, back to back in the
  // same script, one entered and one did not. Retry with a full reload, which resets the intro
  // animation the gate's wiring depends on. Bounded at 3 attempts so a genuinely broken gate
  // still surfaces as a defect instead of spinning.
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
        // A gated route may declare a deviceScaleFactor override in sites.mjs. No site currently
        // does — the y-n10 DPR hypothesis was refuted — but the hook stays because the override
        // belongs in the measured data, not in a blanket change to VIEWPORTS.
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
          // One retry: several of these origins are slow enough to blow a 60s budget when
          // multiple contexts load at once. A network flake is not a selector defect.
          resp = await page.goto(route.url, { waitUntil: 'load', timeout: 90000 })
        }
        if (resp && resp.status() >= 400) {
          defects++
          console.log(`${label}: ROUTE_HTTP_${resp.status()} ${route.url}`)
          await ctx.close()
          continue
        }
        // MEASURED: on a GATED route the generic settle() actively hurts. Both gates entered
        // reliably from `networkidle` + a fixed wait, and stopped entering once settle()'s
        // loader-wait pushed the click out to ~30s after load. Gated routes therefore use only
        // entry.settleBeforeMs, which is the wait each gate was measured to need.
        if (route.entry) {
          await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
        } else {
          await settle(page)
        }

        const consentErr = await dismissConsent(page, site.quirks?.consentBanner)
        if (consentErr) notes.push(`${label}: ${consentErr}`)

        const gateErr = await enterRoute(page, route)
        if (gateErr) {
          // A gate failure is a DEFECT at a viewport where sites.mjs declares entry verified, and
          // a recorded WARNING where it declares it unverified (y-n10 at mobile). The limitation
          // lives in the data, not in a silently lowered bar: capture must treat an unverified
          // viewport as "this is the gate screen, not the site".
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

        // Build the target map: route sections, then site-level selectors (once, on route[0]).
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
                  return [k, -1] // invalid selector syntax
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
