/**
 * Capture UI reference material from a list of sites: full-page screenshots, a scroll-through
 * video, and extracted design tokens (colour, type, spacing, motion).
 *
 * REQUIREMENTS
 *   Node >= 24, `pnpm install` at repo root. Chromium already present in
 *   ~/Library/Caches/ms-playwright (do NOT run `playwright install`).
 *
 * INVOCATIONS
 *   node scripts/capture-ui-references.mjs                 # all sites
 *   node scripts/capture-ui-references.mjs --site y-n10    # one site
 *   node scripts/capture-ui-references.mjs --no-video      # skip webm (much faster)
 *   node scripts/capture-ui-references.mjs --clean         # wipe each site dir first
 *
 * WHY `@playwright/test` AND NOT `playwright`
 *   `playwright`/`playwright-core` are unhoisted transitive packages; importing them returns
 *   MODULE_NOT_FOUND. `@playwright/test` is the real devDependency and re-exports the library API.
 *
 * FIVE NON-OBVIOUS THINGS THIS HANDLES, each measured on these specific sites:
 *   1. ENTRY GATES. pacomepertant and y-n10 render nothing until clicked. y-n10's gate has
 *      pointer-events:none so locator.click() fails its actionability check — we measure the rect
 *      from the selector and dispatch a RAW mouse click at its centre.
 *   2. SMOOTH SCROLL. Lenis/Locomotive set html{overflow:hidden}, under which fullPage:true returns
 *      a VIEWPORT-HEIGHT image that looks correct and is wrong. We tear it down before shooting.
 *   3. CHROMIUM TEXTURE LIMIT. Past 16384 device px, fullPage truncates SILENTLY. guglieri /feed is
 *      ~26000px and y-n10 ~22600px. We capture overlapping bands instead.
 *   4. CONSENT BANNERS. raggededge measured 17821px with its banner up vs 11770px after dismissal.
 *      Any height read through a banner is wrong, so we dismiss first, then measure.
 *   5. CANVAS SITES. pacomepertant, y-n10 and belenjones paint content into a canvas and have no DOM
 *      sections. We capture viewport states there rather than pretending sections exist.
 *
 * KNOWN LIMITS
 *   - Video is recorded only for the desktop home route (it multiplies runtime and adds little).
 *   - Sites that never scroll (topology-vc, belenjones, pacomepertant home) get a single viewport
 *     shot; there is nothing to scroll through.
 */
import { chromium } from '@playwright/test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'docs/ui-references')
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

const VP = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2 },
  mobile: {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
}

/** Measured 2026-09-27. See docs/ui-references/_findings/ for how each value was established. */
const SITES = [
  {
    slug: '01-david-hckh',
    url: 'https://david-hckh.com/',
    scrolls: true,
    routes: ['https://david-hckh.com/project/cubewar'],
  },
  {
    slug: '02-pacomepertant',
    url: 'https://pacomepertant.com/',
    scrolls: false,
    gate: { match: 'enter with sound' },
    routes: ['https://pacomepertant.com/projects/jupiter'],
  },
  { slug: '03-topology-vc', url: 'https://www.topology.vc/', scrolls: false },
  { slug: '04-belenjones', url: 'https://www.belenjones.com/', scrolls: false },
  {
    slug: '05-squadeasy',
    url: 'https://www.squadeasy.com/',
    scrolls: true,
    consent: 'Accepter',
    routes: ['https://www.squadeasy.com/challenges'],
  },
  {
    slug: '06-y-n10',
    url: 'https://y-n10.com/',
    scrolls: true,
    gate: { match: 'enter', exact: true },
  },
  { slug: '07-shopify', url: 'https://www.shopify.com/', scrolls: true },
  {
    slug: '08-raggededge',
    url: 'https://raggededge.com/',
    scrolls: true,
    consent: 'Accept All',
    routes: ['https://raggededge.com/happenings'],
  },
  {
    slug: '09-guglieri',
    url: 'https://guglieri.com/',
    scrolls: true,
    routes: ['https://guglieri.com/feed'],
  },
  {
    slug: '10-helloshivam',
    url: 'https://www.helloshivam.com/',
    scrolls: true,
    routes: ['https://www.helloshivam.com/work/'],
  },
]

const arg = (f) => process.argv.includes(f)
const argv = (f) =>
  process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : null

/** Click a gate by measuring its rect, then dispatching a raw mouse click (bypasses actionability). */
async function enterGate(page, gate) {
  if (!gate) return { gated: false }
  const before = page.url()
  const t = await page.evaluate(
    ({ match, exact }) => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase()
      for (const el of document.querySelectorAll('button, a, div, span')) {
        if (el.children.length > 2) continue
        const txt = norm(el.textContent)
        if (!txt) continue
        const hit = exact ? txt === match : txt.includes(match)
        if (!hit) continue
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        if (r.width < 20 || r.height < 10) continue
        if (cs.display === 'none' || cs.visibility === 'hidden') continue
        return {
          x: Math.round(r.x + r.width / 2),
          y: Math.round(r.y + r.height / 2),
          text: txt.slice(0, 30),
        }
      }
      return null
    },
    { match: gate.match.toLowerCase(), exact: !!gate.exact },
  )
  if (!t) return { gated: true, entered: false, why: 'gate target not found' }
  await page.mouse.click(t.x, t.y)
  await page.waitForTimeout(4000)
  if (page.url() !== before) {
    await page.goBack().catch(() => {})
    return { gated: true, entered: false, why: 'click navigated away' }
  }
  return { gated: true, entered: true, clicked: t }
}

async function dismissConsent(page, text) {
  if (!text) return null
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  await page
    .getByText(text, { exact: false })
    .first()
    .click({ timeout: 5000 })
    .catch(() => {})
  await page.waitForTimeout(2000)
  const after = await page.evaluate(() => document.documentElement.scrollHeight)
  return { heightWithBanner: h, heightAfter: after }
}

/** Tear down smooth scroll so fullPage returns the real page, not one viewport. */
async function killSmoothScroll(page) {
  return page.evaluate(() => {
    try {
      window.__lenis?.destroy?.()
    } catch {}
    try {
      window.__loco?.destroy?.()
    } catch {}
    document.documentElement.classList.remove(
      'has-scroll-smooth',
      'has-scroll-init',
      'has-scroll-dragging',
      'lenis',
    )
    for (const c of document.querySelectorAll('[data-scroll-container]')) {
      c.style.transform = ''
      c.style.height = ''
      c.style.position = ''
    }
    const s = document.createElement('style')
    s.textContent = 'html,body{overflow:auto !important;height:auto !important}'
    document.head.appendChild(s)
    return document.documentElement.scrollHeight
  })
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  await page.evaluate(() => document.fonts.ready).catch(() => {})
  await page.waitForTimeout(2500)
}

async function sweepLazy(page) {
  await page.evaluate(async () => {
    const step = innerHeight * 0.8
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 160))
    }
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 500))
  })
}

/** fullPage, or overlapping bands past Chromium's 16384 device-pixel texture limit. */
async function fullPageSafe(page, base, dpr) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  if (h * dpr <= 16384) {
    await page.screenshot({ path: `${base}.png`, fullPage: true, animations: 'disabled' })
    return { banded: false, height: h, files: 1 }
  }
  const BAND = Math.floor(16000 / dpr),
    OVERLAP = 200
  const w = await page.evaluate(() => document.documentElement.clientWidth)
  let i = 0
  for (let y = 0; y < h; y += BAND - OVERLAP) {
    const height = Math.min(BAND, h - y)
    if (height < 60) break
    await page.screenshot({
      path: `${base}.band${String(i).padStart(2, '0')}-y${y}.png`,
      clip: { x: 0, y, width: w, height },
      animations: 'disabled',
    })
    i++
  }
  return { banded: true, height: h, files: i }
}

const EXTRACT = () => {
  const norm = (v) => {
    if (!v || v === 'none' || /rgba\(0, 0, 0, 0\)/.test(v)) return null
    const m = v.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/)
    if (!m) return v.toUpperCase()
    const [, r, g, b, a] = m
    if (a !== undefined && +a === 0) return null
    return (
      '#' +
      [r, g, b]
        .map((n) => (+n).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    )
  }
  const colors = new Map()
  const fonts = new Map()
  const motion = new Map()
  const radii = new Map()
  const pads = new Map()
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el),
      r = el.getBoundingClientRect()
    const area = Math.round(r.width * r.height)
    for (const p of ['color', 'backgroundColor', 'borderTopColor', 'fill']) {
      const hex = norm(cs[p])
      if (!hex) continue
      const rec = colors.get(hex) || { hex, count: 0, area: 0 }
      rec.count++
      if (p === 'backgroundColor' || p === 'fill') rec.area = Math.max(rec.area, area)
      colors.set(hex, rec)
    }
    if ((el.innerText || '').trim() && r.height > 0) {
      const key = `${cs.fontFamily.split(',')[0].replace(/["']/g, '')}|${cs.fontWeight}|${cs.fontSize}`
      const rec = fonts.get(key) || {
        family: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        stack: cs.fontFamily,
        weight: cs.fontWeight,
        sizePx: parseFloat(cs.fontSize),
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        transform: cs.textTransform,
        count: 0,
        sample: '',
      }
      rec.count++
      if (!rec.sample)
        rec.sample = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50)
      fonts.set(key, rec)
    }
    const props = (cs.transitionProperty || '').split(',').map((s) => s.trim())
    const durs = (cs.transitionDuration || '').split(',').map((s) => s.trim())
    const eases = (cs.transitionTimingFunction || '').split(',').map((s) => s.trim())
    for (let i = 0; i < props.length; i++) {
      const d = durs[i % durs.length] || '0s'
      if (d === '0s' || props[i] === 'all') continue
      const k = `${props[i]}|${d}|${eases[i % eases.length]}`
      motion.set(k, (motion.get(k) || 0) + 1)
    }
    if (cs.borderRadius && cs.borderRadius !== '0px')
      radii.set(cs.borderRadius, (radii.get(cs.borderRadius) || 0) + 1)
    if (r.width > 200 && cs.paddingTop !== '0px')
      pads.set(cs.paddingTop, (pads.get(cs.paddingTop) || 0) + 1)
  }
  const root = getComputedStyle(document.documentElement)
  const vars = {}
  for (const sheet of document.styleSheets) {
    let rules
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    for (const rule of rules) {
      if (!rule.style || !/^(:root|html|body)$/.test(rule.selectorText || '')) continue
      for (const p of rule.style)
        if (p.startsWith('--')) vars[p] = root.getPropertyValue(p).trim()
    }
  }
  return {
    url: location.href,
    title: document.title,
    docHeight: document.documentElement.scrollHeight,
    colors: [...colors.values()]
      .sort((a, b) => b.area - a.area || b.count - a.count)
      .slice(0, 24),
    typography: [...fonts.values()].sort((a, b) => b.sizePx - a.sizePx).slice(0, 18),
    motion: [...motion.entries()]
      .map(([k, n]) => {
        const [property, duration, easing] = k.split('|')
        return { property, duration, easing, count: n }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    borderRadii: [...radii.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([v, n]) => ({ value: v, count: n })),
    sectionPadding: [...pads.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([v, n]) => ({ value: v, count: n })),
    cssVariables: vars,
    media: {
      videos: document.querySelectorAll('video').length,
      canvases: document.querySelectorAll('canvas').length,
      images: document.images.length,
    },
    libraries: [
      'Lenis',
      'LocomotiveScroll',
      'gsap',
      'barba',
      'Swiper',
      'THREE',
      'React',
      'Vue',
      '__NEXT_DATA__',
      '__NUXT__',
      'Shopify',
      'jQuery',
    ].filter((k) => k in window),
    fontFaces: [
      ...new Set([...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style}`)),
    ].slice(0, 20),
  }
}

async function captureRoute(browser, site, url, vpName, dir, isHome, wantVideo) {
  const vp = VP[vpName]
  const ctx = await browser.newContext({
    ...vp,
    userAgent: UA,
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    colorScheme: 'light',
    ...(wantVideo
      ? {
          recordVideo: {
            dir: `${dir}/video`,
            size: { width: vp.width, height: vp.height },
          },
        }
      : {}),
  })
  const page = await ctx.newPage()
  const rec = { url, viewport: vpName, warnings: [] }
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 })
    await settle(page)
    rec.consent = await dismissConsent(page, site.consent)
    if (isHome && site.gate) {
      const tag = `${dir}/shots/entry-gate.${vpName}.png`
      await page.screenshot({ path: tag }) // the gate is part of the design
      rec.gate = await enterGate(page, site.gate)
      await settle(page)
    }
    await killSmoothScroll(page)
    if (site.scrolls) await sweepLazy(page)
    await page.evaluate(() => document.fonts.ready).catch(() => {})
    await page.waitForTimeout(800)

    await page.screenshot({
      path: `${dir}/shots/abovefold.${vpName}.png`,
      animations: 'disabled',
    })
    const name = isHome
      ? 'home'
      : url.split('/').filter(Boolean).slice(2).join('-') || 'route'
    rec.fullPage = await fullPageSafe(
      page,
      `${dir}/shots/${name}.fullpage.${vpName}`,
      vp.deviceScaleFactor,
    )
    rec.extract = await page.evaluate(EXTRACT)

    if (wantVideo && site.scrolls) {
      // slow scroll-through for motion
      const travel = Math.max(0, rec.extract.docHeight - vp.height)
      const steps = 14
      for (let i = 0; i <= steps; i++) {
        await page.evaluate(
          (y) => window.scrollTo({ top: y, behavior: 'smooth' }),
          Math.round((i * travel) / steps),
        )
        await page.waitForTimeout(650)
      }
      await page.waitForTimeout(800)
    } else if (wantVideo) {
      await page.waitForTimeout(3000) // non-scrolling site: let its motion play
    }
  } catch (e) {
    rec.warnings.push({
      code: 'ROUTE_FAILED',
      message: String(e).split('\n')[0].slice(0, 160),
    })
  }
  await ctx.close() // finalises the video file
  return rec
}

async function main() {
  const only = argv('--site')
  const wantVideo = !arg('--no-video')
  const targets = only ? SITES.filter((s) => s.slug.includes(only)) : SITES
  if (only && !targets.length) throw new Error(`no site matching ${only}`)

  const browser = await chromium.launch()
  const summary = []
  for (const site of targets) {
    const dir = resolve(OUT, site.slug)
    if (arg('--clean')) await rm(dir, { recursive: true, force: true })
    for (const sub of ['shots', 'video'])
      await mkdir(`${dir}/${sub}`, { recursive: true })
    const started = Date.now()
    const routes = []
    for (const vpName of ['desktop', 'mobile']) {
      routes.push(
        await captureRoute(
          browser,
          site,
          site.url,
          vpName,
          dir,
          true,
          wantVideo && vpName === 'desktop',
        ),
      )
      for (const r of site.routes ?? []) {
        routes.push(await captureRoute(browser, site, r, vpName, dir, false, false))
      }
    }
    const home = routes[0]
    await writeFile(
      `${dir}/design-tokens.json`,
      JSON.stringify(
        {
          slug: site.slug,
          origin: site.url,
          capturedAt: new Date().toISOString(),
          gated: !!site.gate,
          consentBanner: site.consent ?? null,
          scrolls: site.scrolls,
          routes: routes.map((r) => ({
            url: r.url,
            viewport: r.viewport,
            docHeight: r.extract?.docHeight ?? null,
            banded: r.fullPage?.banded ?? null,
            gate: r.gate ?? null,
            consent: r.consent ?? null,
            warnings: r.warnings,
          })),
          home: home?.extract ?? null,
        },
        null,
        2,
      ),
    )
    const secs = ((Date.now() - started) / 1000).toFixed(0)
    const w = routes.reduce((a, r) => a + r.warnings.length, 0)
    summary.push({
      slug: site.slug,
      secs,
      warnings: w,
      height: home?.extract?.docHeight ?? '?',
    })
    console.log(
      `${site.slug.padEnd(18)} ${secs}s  doc=${String(home?.extract?.docHeight ?? '?').padEnd(7)} colors=${home?.extract?.colors.length ?? 0} type=${home?.extract?.typography.length ?? 0} motion=${home?.extract?.motion.length ?? 0} warn=${w}`,
    )
  }
  await browser.close()
  console.log('\ntotal ' + summary.reduce((a, s) => a + Number(s.secs), 0) + 's')
}
await main()
