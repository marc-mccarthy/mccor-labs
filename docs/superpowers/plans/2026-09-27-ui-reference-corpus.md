# UI Reference Corpus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture ten reference websites into `docs/ui-references/<slug>/` as a measured screenshot, motion, and design-token corpus from which an agent that has never opened the sites can write and implement an exact UI and motion specification.

**Architecture:** Two Node scripts against the Playwright library API. `recon-reference-sites.mjs` emits JSON-only structural recon (sections, routes, globals, stylesheet readability) which a human turns into stable section slugs. Those slugs are transcribed into `scripts/lib/sites.mjs`, which drives `capture-reference-site.mjs` — an orchestrator over focused `scripts/lib/*.mjs` modules that captures each route twice (a `native` pass with smooth scroll torn down for geometry, a `live` pass intact for motion) and writes a flat, sha256-verified `index.json` per site.

**Tech Stack:** Node 24.20.0, `@playwright/test` (library API only, no test runner, no config file), Chromium from the existing `~/Library/Caches/ms-playwright/` cache, Playwright's bundled ffmpeg for WebM. No bundler, no transpile, no TypeScript — matching the repo's existing plain-`.mjs` convention in `app/api/index.mjs`.

**Spec:** `docs/superpowers/specs/2026-09-27-ui-reference-corpus-design.md`

## Global Constraints

- **No third-party binary is ever written to disk.** Every `assets.json` entry sets `downloaded: false` explicitly.
- **A number not measured in the run that wrote it does not appear in a file.** Unmeasured values are marked unmeasured, never inferred.
- **Never commit, stage, or push.** No task ends in a `git` write command.
- **Every browser or outbound-fetch Bash step runs with `dangerouslyDisableSandbox: true`.** The sandbox denies Chromium's Mach port lookup and `listen()`; failures surface as `bootstrap_check_in ... Permission denied (1100)` or a bare launch timeout and never name the sandbox.
- **Import is `import { chromium, devices } from "@playwright/test";`** — never from `playwright`, which is unhoisted and returns `MODULE_NOT_FOUND`. Every script's JSDoc header states this so nobody "fixes" it back.
- **Disk ceiling 12GB** for the whole tree. Volume has 48GiB free at 89%.
- **Script conventions:** plain `.mjs` under top-level `scripts/`, bare `node`, `node:`-prefixed builtins only, `resolve(import.meta.dirname, "..")` for the repo root, `process.argv.includes("--flag")` parsing, JSDoc header stating requirements + literal invocations + known failure modes.
- **Citations by symbol, not line number**, in all prose artifacts.
- **Output root is `docs/ui-references/`** (plural), overriding the forensics skill's `docs/ui-reference/` default.

## Review Focus

Five conditions the spec implies that no task's own verification exercises. Each has a test pinned to the task that owns the code.

1. **A site that bot-blocks or 403s** (Shopify and Cloudflare-fronted origins are the live risk). One site failing must record a warning and continue the run, never abort the other nine. — pinned to Task 4.
2. **A site built from `div` soup with zero `<section>` elements.** Recon returns an empty `candidateSections`, and capture must fall back to a heuristic outline rather than produce a site directory with no `sections/`. — pinned to Task 2.
3. **`scrollHeight * dpr > 16384`** on a long page. Chromium truncates `fullPage` silently; the banded path must actually trigger and record `banded: true` with offsets. — pinned to Task 4.
4. **The 12GB disk ceiling reached mid-run.** Must abort with a clear error naming the site and bytes written, leaving the already-written sites valid, not a half-written JSON. — pinned to Task 4.
5. **A discovered route that redirects to home, or two routes that resolve to the same final URL.** Must be deduplicated by final URL after redirect, or the tree gets two differently-named directories holding identical captures. — pinned to Task 2.

Sixth, noted because it is cheap to guard and expensive to discover late: **a `<video>` whose `currentSrc` is a `blob:` URL** cannot be seeked from cold and must be recorded as `seekable: false` rather than throwing. — pinned to Task 8.

---

## File Structure

| file                                 | responsibility                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `package.json`                       | root npm surface; `@playwright/test` as only devDependency                                |
| `.gitignore`                         | add `node_modules/`, `pnpm-lock.yaml`                                                     |
| `scripts/recon-reference-sites.mjs`  | JSON-only structural recon of all ten origins                                             |
| `scripts/capture-reference-site.mjs` | orchestrator; CLI; per-site loop; disk ceiling                                            |
| `scripts/lib/sites.mjs`              | `SITES` const — origins, tiers, routes, section slug→selector maps, key selectors, quirks |
| `scripts/lib/browser.mjs`            | context factory: UA override, fixed locale/tz/colorScheme, HAR, init scripts              |
| `scripts/lib/smooth-scroll.mjs`      | constructor-wrap init script; `native`-pass teardown + assertion                          |
| `scripts/lib/determinism.mjs`        | `fonts.ready`, lazy-image sweep, freeze stylesheet, overlay guard                         |
| `scripts/lib/extract.mjs`            | the browser-side extraction payload + CORS stylesheet refetch                             |
| `scripts/lib/scroll.mjs`             | wheel actuation with settle, frame capture, reveals, parallax least-squares fit           |
| `scripts/lib/states.mjs`             | hover/focus/nav-open/nav-scrolled shots + computed-style deltas                           |
| `scripts/lib/transitions.mjs`        | Barba hooks, CDP screencast with frame ack, rAF style sampler                             |
| `scripts/lib/effects.mjs`            | video frame seeks, particles config clone, typewriter frames                              |
| `scripts/lib/network.mjs`            | context listeners, console/pageerror log, `assets.json` join                              |
| `scripts/lib/artifact-index.mjs`     | flat `index.json` writer, sha256, warnings collection                                     |

Split by responsibility, not layer. `extract.mjs` is the largest single unit and is kept alone because it is one coherent browser-side payload that must be reasoned about as a whole.

---

### Task 1: npm surface

**Files:**

- Create: `package.json`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: nothing.
- Produces: a resolvable `@playwright/test` import for every later task.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "mccor-labs",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "Infrastructure and tooling for mccor-labs. Node surface exists only to run scripts/.",
  "engines": { "node": ">=24" },
  "scripts": {
    "recon": "node scripts/recon-reference-sites.mjs",
    "capture": "node scripts/capture-reference-site.mjs"
  },
  "devDependencies": {
    "@playwright/test": "^1.56.0"
  }
}
```

- [ ] **Step 2: Append to `.gitignore`**

```gitignore

# Node tooling for scripts/
node_modules/
pnpm-lock.yaml
package-lock.json
```

- [ ] **Step 3: Install, sandbox disabled**

Run with `dangerouslyDisableSandbox: true` (network egress required):

```bash
cd /Users/mj/repos/mccor-labs && pnpm install
```

Expected: `@playwright/test` resolves. Browsers are **already installed** in `~/Library/Caches/ms-playwright/` (chromium v1223 and v1228, ffmpeg v1011) — do **not** run `playwright install`.

- [ ] **Step 4: Verify the import resolves and Chromium launches**

Run with `dangerouslyDisableSandbox: true`:

```bash
cd /Users/mj/repos/mccor-labs && node -e '
import("@playwright/test").then(async ({ chromium }) => {
  const b = await chromium.launch();
  console.log("launched", b.version());
  await b.close();
});'
```

Expected: prints `launched` and a version like `142.0.xxxx.xx`. If it prints `MODULE_NOT_FOUND`, the import path is wrong — it must be `@playwright/test`, never `playwright`. If it hangs or prints `bootstrap_check_in ... Permission denied (1100)`, the sandbox was not disabled.

---

### Task 2: Recon script

**Files:**

- Create: `scripts/recon-reference-sites.mjs`

**Interfaces:**

- Consumes: `@playwright/test`.
- Produces: `docs/ui-references/_recon/<slug>.json` per site, shaped as `{meta, candidateSections[], discoveredRoutes[], windowGlobals, candidateSelectors, stylesheets[], warnings[]}`. Task 3 reads these; Task 4's `SITES` const is transcribed from them.

- [ ] **Step 1: Write the JSDoc header and origin list**

```js
/**
 * Structural recon of UI reference sites. Emits JSON only — no images, no binaries.
 *
 * REQUIREMENTS
 *   - Node >= 24, `pnpm install` run at repo root.
 *   - Chromium present in ~/Library/Caches/ms-playwright (already installed; do not run
 *     `playwright install`).
 *   - MUST run with the Bash sandbox disabled. The sandbox denies Chromium's Mach port
 *     lookup and its listen() call; the errors never name the sandbox and surface as
 *     `bootstrap_check_in ... Permission denied (1100)` or a bare launch timeout.
 *
 * INVOCATIONS
 *   node scripts/recon-reference-sites.mjs                 # all ten origins
 *   node scripts/recon-reference-sites.mjs --site shopify  # one slug
 *   node scripts/recon-reference-sites.mjs --clean         # wipe _recon/ first
 *
 * WHY `@playwright/test` AND NOT `playwright`
 *   `playwright` and `playwright-core` are unhoisted transitive packages and importing them
 *   returns MODULE_NOT_FOUND. `@playwright/test` is the real top-level devDependency and
 *   re-exports the full library API. Using the library API also means playwright.config.ts is
 *   never read, so no webServer block runs. Do not "fix" this import back.
 *
 * KNOWN FAILURE MODES
 *   - Bot protection (Shopify, Cloudflare-fronted origins) may return 403 or a challenge page.
 *     Recorded as a warning per site; the run continues.
 *   - Cross-origin stylesheets throw SecurityError on .cssRules. Recorded per sheet in
 *     `stylesheets[].readable = false`; this predicts which sites need the refetch path in
 *     capture.
 *   - Sites built from div soup expose zero <section> elements; `candidateSections` then comes
 *     from the heuristic fallback and `meta.outlineSource` says so.
 */
import { chromium } from '@playwright/test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'docs/ui-references/_recon')

const ORIGINS = [
  { slug: 'david-hckh', origin: 'https://david-hckh.com', tier: 1 },
  { slug: 'pacomepertant', origin: 'https://pacomepertant.com', tier: 1 },
  { slug: 'topology-vc', origin: 'https://www.topology.vc', tier: 1 },
  { slug: 'belenjones', origin: 'https://www.belenjones.com', tier: 1 },
  { slug: 'squadeasy', origin: 'https://www.squadeasy.com', tier: 2 },
  { slug: 'y-n10', origin: 'https://y-n10.com', tier: 2 },
  { slug: 'shopify', origin: 'https://www.shopify.com', tier: 2 },
  { slug: 'raggededge', origin: 'https://raggededge.com', tier: 3 },
  { slug: 'guglieri', origin: 'https://guglieri.com', tier: 3 },
  { slug: 'helloshivam', origin: 'https://www.helloshivam.com', tier: 3 },
]

const HEADFUL_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
```

- [ ] **Step 2: Write the unique-selector generator, in page scope**

This runs inside `page.evaluate`, so it must be self-contained with no closure over Node scope.

```js
const PAGE_HELPERS = `
function uniqueSelector(el) {
  if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) {
    return '#' + CSS.escape(el.id);
  }
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && parts.length < 6) {
    let part = node.tagName.toLowerCase();
    if (node.id) { parts.unshift('#' + CSS.escape(node.id)); break; }
    const cls = [...node.classList]
      .filter(c => !/^(is-|has-|js-)/.test(c) && !/\\d{4,}/.test(c))
      .slice(0, 2).map(c => '.' + CSS.escape(c)).join('');
    part += cls;
    const parent = node.parentElement;
    if (parent) {
      const sibs = [...parent.children].filter(s => s.tagName === node.tagName);
      if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(node) + 1) + ')';
    }
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(' > ');
}
`
```

- [ ] **Step 3: Write the recon payload**

```js
const RECON_PAYLOAD =
  PAGE_HELPERS +
  `
(() => {
  const SECTION_SEL = 'section, [data-scroll-section], [data-barba] > div, main > div, main > section';
  let els = [...document.querySelectorAll(SECTION_SEL)];
  let outlineSource = 'selector';

  // Review Focus #2: div-soup sites expose no <section>. Fall back to direct children of the
  // tallest plausible content root that occupy at least 30% of the viewport height.
  if (els.length < 2) {
    outlineSource = 'heuristic-fallback';
    const root = document.querySelector('main, [data-barba="container"], #__next, #root') || document.body;
    els = [...root.children].filter(el => {
      const r = el.getBoundingClientRect();
      return r.height > innerHeight * 0.3 && r.width > innerWidth * 0.5;
    });
  }

  const candidateSections = els.map((el, i) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const h = el.querySelector('h1, h2, h3, [class*="title"], [class*="heading"]');
    return {
      index: i,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classList: [...el.classList],
      selector: uniqueSelector(el),
      rect: { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      firstHeading: h ? h.textContent.trim().slice(0, 120) : null,
      background: cs.backgroundColor,
      backgroundImage: cs.backgroundImage === 'none' ? null : cs.backgroundImage.slice(0, 200),
      padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft],
      hasVideo: !!el.querySelector('video'),
      hasCanvas: !!el.querySelector('canvas'),
      childCount: el.children.length,
    };
  });

  const navRoot = document.querySelector('nav, header');
  const discoveredRoutes = [...document.querySelectorAll('a[href]')]
    .map(a => {
      let u; try { u = new URL(a.getAttribute('href'), location.href); } catch { return null; }
      if (u.origin !== location.origin) return null;
      if (/\\.(pdf|jpe?g|png|zip|mp4|webm|svg)$/i.test(u.pathname)) return null;
      u.hash = '';
      return {
        url: u.href.replace(/\\/$/, '') || u.origin,
        text: a.textContent.trim().slice(0, 80),
        inNav: !!(navRoot && navRoot.contains(a)),
      };
    })
    .filter(Boolean)
    .filter((r, i, arr) => arr.findIndex(o => o.url === r.url) === i);

  const G = (name) => {
    try {
      const v = window[name];
      if (v === undefined) return null;
      return { present: true, version: v?.version ?? v?.VERSION ?? null, type: typeof v };
    } catch { return null; }
  };
  const windowGlobals = Object.fromEntries(
    ['Lenis','locomotiveScroll','LocomotiveScroll','__lenis','__loco','barba','gsap','ScrollTrigger',
     'Swiper','pJSDom','particlesJS','THREE','Typed','SplitType','React','Vue','__NEXT_DATA__',
     '__NUXT__','Shopify','jQuery','wp','Alpine','motion','Framer']
      .map(n => [n, G(n)]).filter(([, v]) => v !== null)
  );
  windowGlobals.webpackChunkKeys = Object.keys(window).filter(k => /^webpackChunk/.test(k));

  const pick = (sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) return { selector: uniqueSelector(el), matchedHeuristic: s, text: el.textContent?.trim().slice(0, 60) || null };
    }
    return null;
  };
  const candidateSelectors = {
    primaryCta: pick(['[class*="cta"] a','a[class*="button"]','button[class*="primary"]','header a[class*="btn"]','main a[class*="btn"]']),
    navToggle: pick(['[class*="burger"]','[class*="hamburger"]','[aria-label*="enu" i]','button[aria-expanded]','[class*="menu-toggle"]']),
    card: pick(['[class*="card"]','article','[class*="project"]','[class*="item"][class*="grid"]','li[class*="work"]']),
    signatureEffect: pick(['canvas','video[autoplay]','[data-scroll][data-scroll-speed]','[class*="marquee"]','[class*="parallax"]','svg[class*="blob"]']),
  };

  const stylesheets = [...document.styleSheets].map(s => {
    let readable = true, ruleCount = null, err = null;
    try { ruleCount = s.cssRules.length; } catch (e) { readable = false; err = e.name; }
    return { href: s.href, ownerTag: s.ownerNode?.tagName?.toLowerCase() ?? null, readable, ruleCount, error: err };
  });

  return {
    meta: {
      title: document.title,
      lang: document.documentElement.lang || null,
      generator: document.querySelector('meta[name="generator"]')?.content ?? null,
      viewportMeta: document.querySelector('meta[name="viewport"]')?.content ?? null,
      finalUrl: location.href,
      docScrollHeight: document.documentElement.scrollHeight,
      htmlClasses: [...document.documentElement.classList],
      outlineSource,
    },
    candidateSections, discoveredRoutes, windowGlobals, candidateSelectors, stylesheets,
  };
})()
`
```

- [ ] **Step 4: Write the per-site driver with route dedup by final URL**

```js
async function reconSite(browser, site) {
  const warnings = []
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    userAgent: HEADFUL_UA,
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    colorScheme: 'light',
  })
  const page = await ctx.newPage()
  let data = null
  try {
    const res = await page.goto(site.origin, {
      waitUntil: 'load',
      timeout: 45000,
    })
    const status = res?.status() ?? 0
    if (status >= 400)
      warnings.push({ code: 'HTTP_ERROR', status, affects: [site.origin] })
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    await page.evaluate(() => document.fonts.ready)
    data = await page.evaluate(RECON_PAYLOAD)
    data.meta.status = status

    // Review Focus #5: dedup routes by FINAL url after redirect, so a route that 302s to home
    // does not become a second directory holding identical captures.
    const seen = new Map([[data.meta.finalUrl.replace(/\/$/, ''), '/']])
    for (const r of data.discoveredRoutes) {
      if (seen.size > 12) break
      const head = await page.request.get(r.url, { maxRedirects: 5 }).catch(() => null)
      const finalUrl = (head?.url() ?? r.url).replace(/\/$/, '')
      r.finalUrl = finalUrl
      r.status = head?.status() ?? null
      r.duplicateOf = seen.has(finalUrl) ? seen.get(finalUrl) : null
      if (!seen.has(finalUrl)) seen.set(finalUrl, r.url)
    }
  } catch (err) {
    warnings.push({
      code: 'RECON_FAILED',
      message: String(err).slice(0, 300),
      affects: [site.origin],
    })
  } finally {
    await ctx.close()
  }
  return {
    slug: site.slug,
    origin: site.origin,
    tier: site.tier,
    capturedAt: new Date().toISOString(),
    warnings,
    ...(data ?? {}),
  }
}
```

- [ ] **Step 5: Write `main()` — sequential, one site failing never aborts the rest**

```js
async function main() {
  const only = process.argv.includes('--site')
    ? process.argv[process.argv.indexOf('--site') + 1]
    : null
  if (process.argv.includes('--clean')) await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch()
  const targets = only ? ORIGINS.filter((s) => s.slug === only) : ORIGINS
  if (only && !targets.length)
    throw new Error(
      `unknown --site ${only}; known: ${ORIGINS.map((s) => s.slug).join(', ')}`,
    )

  for (const site of targets) {
    process.stdout.write(`recon ${site.slug} … `)
    const out = await reconSite(browser, site)
    await writeFile(resolve(OUT, `${site.slug}.json`), JSON.stringify(out, null, 2))
    const n = out.candidateSections?.length ?? 0
    console.log(
      `${n} sections, ${out.discoveredRoutes?.length ?? 0} routes, ${out.warnings.length} warnings`,
    )
  }
  await browser.close()
}
await main()
```

- [ ] **Step 6: Run it, sandbox disabled, and read the output**

Run with `dangerouslyDisableSandbox: true`:

```bash
cd /Users/mj/repos/mccor-labs && node scripts/recon-reference-sites.mjs --clean 2>&1 | tail -20
```

Expected: ten lines, each reporting a non-zero section count. A site reporting `0 sections` means both the selector list and the heuristic fallback missed — inspect that site's JSON before proceeding.

- [ ] **Step 7: Verify the Review Focus guards actually fired**

```bash
cd /Users/mj/repos/mccor-labs && node -e '
import("node:fs").then(async ({ readFileSync, readdirSync }) => {
  for (const f of readdirSync("docs/ui-references/_recon")) {
    const d = JSON.parse(readFileSync("docs/ui-references/_recon/" + f, "utf8"));
    const dupes = (d.discoveredRoutes ?? []).filter(r => r.duplicateOf).length;
    const unreadable = (d.stylesheets ?? []).filter(s => !s.readable).length;
    console.log(f.padEnd(20), "outline:", d.meta?.outlineSource, "| sections:", d.candidateSections?.length,
                "| dup routes:", dupes, "| CORS sheets:", unreadable, "| warn:", d.warnings.length);
  }
});'
```

Expected: at least one site reports `heuristic-fallback` or all report `selector`; Shopify reports a non-zero CORS sheet count. Record which sites report unreadable stylesheets — those are the ones Task 5's refetch path must handle.

---

### Task 3: Assign section slugs and author `sites.mjs`

**Files:**

- Create: `scripts/lib/sites.mjs`

**Interfaces:**

- Consumes: `docs/ui-references/_recon/<slug>.json` from Task 2.
- Produces: `export const SITES` — an array of `{slug, origin, tier, routes: [{name, url}], sections: {slug: selector}, selectors: {primaryCta, navToggle, card, signatureEffect}, effects: {video?, particles?, typewriter?}, smoothScroll: "lenis"|"locomotive"|"none"|"unknown", quirks: {}}`. Also `export const TIERS` and `export const VIEWPORTS`.
- Produces: `export function routesFor(site)` and `export function viewportsFor(site)` applying tier rules.

- [ ] **Step 1: Read every recon file and assign a durable slug per section**

This step is judgment, not mechanism. For each site, read `candidateSections[]` and name each section from its `firstHeading` and `classList` — `hero`, `intro`, `work-grid`, `about`, `services`, `testimonials`, `contact`, `footer`. Slugs are kebab-case, stable, and describe the section's _role_, not its appearance. Drop candidates that are layout wrappers (`childCount: 1` and no heading).

Record the chosen selector verbatim from `candidateSections[].selector`.

- [ ] **Step 2: Write `sites.mjs` with the tier rules as data**

```js
/**
 * The durable record of what was captured and why those routes.
 *
 * Section selectors and route lists are transcribed from docs/ui-references/_recon/<slug>.json,
 * produced by scripts/recon-reference-sites.mjs. Re-run recon and revisit this file if a
 * reference site is redesigned — a stale selector produces an empty section screenshot, not an
 * error.
 */
export const VIEWPORTS = {
  wide: { width: 1600, height: 1000, deviceScaleFactor: 2, isMobile: false },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false },
  tablet: { width: 834, height: 1112, deviceScaleFactor: 2, isMobile: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
}

export const TIERS = {
  1: {
    viewports: ['wide', 'desktop', 'tablet', 'mobile'],
    maxRoutes: 4,
    states: true,
    transitions: true,
    effects: true,
    scrollFramesDesktop: 16,
    scrollFramesMobile: 10,
  },
  2: {
    viewports: ['desktop', 'mobile'],
    maxRoutes: 3,
    states: true,
    transitions: false,
    effects: true,
    scrollFramesDesktop: 16,
    scrollFramesMobile: 10,
  },
  3: {
    viewports: ['desktop', 'mobile'],
    maxRoutes: 1,
    states: false,
    transitions: false,
    effects: false,
    scrollFramesDesktop: 10,
    scrollFramesMobile: 10,
  },
}

export const SITES = [
  // One entry per site. Fill `sections` and `routes` from recon output in Step 1.
  // Example of the required shape — replace with measured values, do not ship this comment's values:
  // {
  //   slug: "david-hckh", origin: "https://david-hckh.com", tier: 1,
  //   smoothScroll: "locomotive",
  //   routes: [{ name: "home", url: "https://david-hckh.com" }, { name: "about", url: "https://david-hckh.com/about" }],
  //   sections: { hero: "#hero", work: "section.work", about: "section.about", contact: "section.contact" },
  //   selectors: { primaryCta: "...", navToggle: "...", card: "...", signatureEffect: "canvas" },
  //   effects: { video: false, particles: true, typewriter: false },
  //   quirks: {},
  // },
]

export function viewportsFor(site) {
  return TIERS[site.tier].viewports
}
export function routesFor(site) {
  return site.routes.slice(0, TIERS[site.tier].maxRoutes)
}
export function tierOf(site) {
  return TIERS[site.tier]
}
```

- [ ] **Step 3: Verify every selector in `sites.mjs` still matches exactly one element**

Run with `dangerouslyDisableSandbox: true`:

```bash
cd /Users/mj/repos/mccor-labs && node -e '
const { chromium } = await import("@playwright/test");
const { SITES } = await import("./scripts/lib/sites.mjs");
const b = await chromium.launch();
for (const s of SITES) {
  const p = await b.newPage();
  await p.goto(s.routes[0].url, { waitUntil: "load", timeout: 45000 }).catch(() => {});
  const all = { ...s.sections, ...s.selectors };
  const counts = await p.evaluate(m => Object.fromEntries(
    Object.entries(m).filter(([,v]) => v).map(([k,v]) => [k, document.querySelectorAll(v).length])), all);
  const bad = Object.entries(counts).filter(([,n]) => n !== 1);
  console.log(s.slug, bad.length ? "MISMATCH " + JSON.stringify(bad) : "ok");
  await p.close();
}
await b.close();' --input-type=module
```

Expected: every site prints `ok`. Any `MISMATCH` with count `0` is a stale selector; with count `>1` the selector is not unique. Fix in `sites.mjs` before any capture runs — a stale selector produces a blank section PNG rather than an error, which is exactly the silent failure this plan exists to prevent.

---

### Task 4: Capture orchestrator, browser factory, determinism, and artifact index

**Files:**

- Create: `scripts/capture-reference-site.mjs`
- Create: `scripts/lib/browser.mjs`
- Create: `scripts/lib/determinism.mjs`
- Create: `scripts/lib/smooth-scroll.mjs`
- Create: `scripts/lib/artifact-index.mjs`

**Interfaces:**

- Consumes: `SITES`, `VIEWPORTS`, `tierOf`, `routesFor`, `viewportsFor` from Task 3.
- Produces:
  - `browser.mjs`: `export async function makeContext(browser, {viewport, harPath, video, initScripts})` returning a context with fixed `locale`/`timezoneId`/`colorScheme`/`reducedMotion`, the headful UA, and `recordHar: {content: "omit", mode: "full"}`.
  - `determinism.mjs`: `export async function settle(page)`, `export async function sweepLazyImages(page)`, `export async function freezeMotion(page)`, `export async function overlayGuard(page)` returning `warnings[]`, `export async function safeFullPage(page, path)` implementing the 16384px banding fallback and returning `{banded, offsets}`.
  - `smooth-scroll.mjs`: `export const WRAP_INIT_SCRIPT`, `export async function tearDownSmoothScroll(page)` returning `{ok, scrollHeight, innerHeight}`.
  - `artifact-index.mjs`: `export function createIndex(site)`, `index.add({path, kind, pass, viewport, route, describes})` which sha256s the file at add time, `index.warn({code, message, affects})`, `await index.write(dir)`, and `index.bytes` for the disk-ceiling check.
- Produces for later tasks: a `capturePass(page, ctxInfo)` function in the orchestrator that fixes the order **load → settle → extract motion JSON → freeze → screenshot** in one place so it cannot drift.

- [ ] **Step 1: Write `smooth-scroll.mjs` — the constructor wrap and the five-step teardown**

The `defineProperty` setter is required: a plain wrap at init time has nothing to wrap, because the library has not yet assigned its global.

```js
export const WRAP_INIT_SCRIPT = () => {
  for (const name of ['Lenis', 'LocomotiveScroll']) {
    let Real
    Object.defineProperty(window, name, {
      configurable: true,
      get: () => Real,
      set: (V) => {
        Real = class extends V {
          constructor(...a) {
            super(...a)
            window[name === 'Lenis' ? '__lenis' : '__loco'] = this
          }
        }
      },
    })
  }
}

export async function tearDownSmoothScroll(page) {
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
    )
    for (const c of document.querySelectorAll('[data-scroll-container]')) {
      c.style.transform = ''
      c.style.height = ''
      c.style.position = ''
    }
    const s = document.createElement('style')
    s.id = '__forensics-native'
    s.textContent = 'html,body{overflow:auto !important;height:auto !important}'
    document.head.appendChild(s)
    return {
      ok: document.documentElement.scrollHeight > innerHeight * 1.2,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight,
    }
  })
}
```

- [ ] **Step 2: Write `determinism.mjs`, including the banding fallback and the overlay assertion**

```js
export async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
  await page.evaluate(() => document.fonts.ready)
}

export async function sweepLazyImages(page) {
  await page.evaluate(async () => {
    const step = innerHeight * 0.8
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
  })
  return page.evaluate(async () => {
    const deadline = Date.now() + 10000
    const pending = () =>
      [...document.images].filter((i) => !(i.complete && i.naturalWidth > 0))
    while (pending().length && Date.now() < deadline)
      await new Promise((r) => setTimeout(r, 200))
    return pending()
      .map((i) => i.currentSrc || i.src)
      .slice(0, 20)
  })
}

export async function freezeMotion(page) {
  await page.addStyleTag({
    content:
      `*,*::before,*::after{animation-play-state:paused !important;` +
      `transition-delay:0s !important;caret-color:transparent !important}`,
  })
}

export async function overlayGuard(page) {
  await page.evaluate(() => {
    for (const k of [
      'cookieconsent_status',
      'cookie-consent',
      'gdpr-consent',
      'hasConsented',
      'newsletter-dismissed',
      'modal-seen',
      '__forensics',
    ]) {
      try {
        localStorage.setItem(k, 'dismissed')
      } catch {}
    }
    const CLOSE = [
      '[id*="accept" i]',
      '[class*="accept" i]',
      'button[aria-label*="close" i]',
      '[class*="cookie"] button',
      '[id*="onetrust-accept"]',
      '[class*="modal"] [class*="close"]',
    ]
    for (const sel of CLOSE)
      for (const el of document.querySelectorAll(sel)) {
        try {
          el.click()
        } catch {}
      }
  })
  return page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el)
      if (cs.position !== 'fixed' || Number(cs.zIndex) <= 1000) continue
      const r = el.getBoundingClientRect()
      if (r.width * r.height > innerWidth * innerHeight * 0.25) {
        out.push({
          code: 'VIEWPORT_OBSTRUCTED',
          zIndex: cs.zIndex,
          coverage: +((r.width * r.height) / (innerWidth * innerHeight)).toFixed(2),
          selector:
            el.tagName.toLowerCase() + (el.id ? '#' + el.id : '.' + [...el.classList][0]),
        })
      }
    }
    return out
  })
}

/**
 * Review Focus #3. Chromium's max texture height is 16384 device pixels; past that `fullPage`
 * truncates the image SILENTLY, with no error. Capture overlapping bands instead.
 */
export async function safeFullPage(page, pathFor) {
  const { h, dpr } = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    dpr: devicePixelRatio,
  }))
  if (h * dpr <= 16384) {
    await page.screenshot({
      path: pathFor(null),
      fullPage: true,
      animations: 'disabled',
    })
    return { banded: false, offsets: [], paths: [pathFor(null)] }
  }
  const BAND = 8000,
    OVERLAP = 200,
    offsets = [],
    paths = []
  for (let y = 0; y < h; y += BAND - OVERLAP) {
    const height = Math.min(BAND, h - y)
    if (height < 50) break
    const w = await page.evaluate(() => document.documentElement.clientWidth)
    const p = pathFor(y)
    await page.screenshot({
      path: p,
      clip: { x: 0, y, width: w, height },
      animations: 'disabled',
    })
    offsets.push(y)
    paths.push(p)
  }
  return { banded: true, offsets, paths }
}
```

- [ ] **Step 3: Write `artifact-index.mjs` — sha256 at add time, flat output**

```js
import { createHash } from 'node:crypto'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

export function createIndex(site, siteDir) {
  const artifacts = [],
    warnings = []
  let bytes = 0
  return {
    get bytes() {
      return bytes
    },
    async add({ path, kind, pass, viewport, route, describes, extra }) {
      const st = await stat(path).catch(() => null)
      if (!st) {
        warnings.push({ code: 'ARTIFACT_MISSING', affects: [path] })
        return
      }
      bytes += st.size
      artifacts.push({
        path: relative(siteDir, path),
        kind,
        pass: pass ?? null,
        viewport: viewport ?? null,
        route: route ?? null,
        bytes: st.size,
        sha256: createHash('sha256')
          .update(await readFile(path))
          .digest('hex'),
        describes,
        ...(extra ?? {}),
      })
    },
    warn(w) {
      warnings.push(w)
    },
    async write() {
      await writeFile(
        resolve(siteDir, 'index.json'),
        JSON.stringify(
          {
            slug: site.slug,
            origin: site.origin,
            tier: site.tier,
            capturedAt: new Date().toISOString(),
            totalBytes: bytes,
            artifactCount: artifacts.length,
            artifacts,
            warnings,
          },
          null,
          2,
        ),
      )
      return { artifacts: artifacts.length, warnings: warnings.length, bytes }
    },
  }
}
```

- [ ] **Step 4: Write the orchestrator with the fixed pass order, per-site isolation, and disk ceiling**

```js
const DISK_CEILING_BYTES = 12 * 1024 ** 3
let runBytes = 0

/** The one place the order load → settle → extract → freeze → screenshot is written down. */
async function capturePass(page, { pass, route, viewport, site, index, dir }) {
  /* Tasks 5–9 fill this */
}

async function captureSite(browser, site) {
  const dir = resolve(ROOT, 'docs/ui-references', site.slug)
  const index = createIndex(site, dir)
  try {
    for (const route of routesFor(site))
      for (const vp of viewportsFor(site)) {
        for (const pass of ['native', 'live']) await capturePass(/* … */)
        // Review Focus #4: check the ceiling between units of work, so an abort leaves the
        // already-written sites valid and this site's index.json still gets written.
        if (runBytes + index.bytes > DISK_CEILING_BYTES) {
          index.warn({
            code: 'DISK_CEILING_REACHED',
            message: `aborted at ${site.slug}/${route.name}/${vp}; ${runBytes + index.bytes} bytes written of ${DISK_CEILING_BYTES}`,
          })
          throw new DiskCeilingError(site.slug)
        }
      }
  } catch (err) {
    // Review Focus #1: one site failing (403, challenge page, timeout) must not abort the run.
    if (err instanceof DiskCeilingError) throw err
    index.warn({
      code: 'SITE_FAILED',
      message: String(err).slice(0, 500),
      affects: [site.origin],
    })
  } finally {
    const res = await index.write()
    runBytes += res.bytes
    console.log(
      `${site.slug}: ${res.artifacts} artifacts, ${res.warnings} warnings, ${(res.bytes / 1e6).toFixed(1)}MB`,
    )
  }
}
```

- [ ] **Step 5: Run the orchestrator skeleton against the single cheapest site**

Run with `dangerouslyDisableSandbox: true`:

```bash
cd /Users/mj/repos/mccor-labs && node scripts/capture-reference-site.mjs --site helloshivam --clean 2>&1 | tail -20
```

Expected: a `docs/ui-references/helloshivam/index.json` exists and parses, `artifactCount` is 0 at this stage (passes are empty until Tasks 5–9), and the process exits 0. This proves the orchestrator, context factory, index writer, and per-site isolation work before any capture logic is added.

- [ ] **Step 6: Prove the Review Focus #1 guard with a deliberately unreachable origin**

```bash
cd /Users/mj/repos/mccor-labs && node -e '
const m = await import("./scripts/lib/sites.mjs");
m.SITES.length = 0;
m.SITES.push({ slug: "__unreachable", origin: "https://this-host-does-not-exist.invalid", tier: 3,
  routes: [{ name: "home", url: "https://this-host-does-not-exist.invalid" }],
  sections: {}, selectors: {}, effects: {}, quirks: {} });
' --input-type=module
```

Then temporarily point `--site` at a 403-returning URL of your choice and confirm the run prints a `SITE_FAILED` warning, writes an `index.json` containing it, and **exits 0**. Expected: `warnings[0].code === "SITE_FAILED"` and a zero exit status. A non-zero exit means one bad site would abort the other nine.

---

### Task 5: Extraction module

**Files:**

- Create: `scripts/lib/extract.mjs`

**Interfaces:**

- Consumes: nothing from earlier tasks; it is one self-contained browser-side payload.
- Produces: `export async function extractDesignSystem(page)` returning the object shaped in the spec's Extraction section, and `export async function refetchCorsStylesheets(page, hrefs)` returning `{mediaConditions[], fontFaces[], keyframes[], customProperties{}}` with `source: "refetched"`.
- Produces: `export function mergeExtracts(perViewport)` for `design-system.json`.

- [ ] **Step 1: Write the motion extractor with the comma-list zip**

`transitionProperty`/`Duration`/`TimingFunction`/`Delay` are **parallel comma-lists**. Assuming a single entry silently drops every multi-property transition, which is most of them.

```js
function extractMotion() {
  const split = (s) =>
    (s || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  const groups = new Map()
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    const props = split(cs.transitionProperty),
      durs = split(cs.transitionDuration),
      times = split(cs.transitionTimingFunction),
      delays = split(cs.transitionDelay)
    for (let i = 0; i < props.length; i++) {
      const p = props[i],
        d = durs[i % durs.length] || '0s'
      if (p === 'all' && d === '0s') continue
      if (d === '0s' && (delays[i % delays.length] || '0s') === '0s') continue
      const key = [
        p,
        d,
        times[i % times.length] || 'ease',
        delays[i % delays.length] || '0s',
      ].join('|')
      const g = groups.get(key) ?? {
        property: p,
        duration: d,
        timing: times[i % times.length] || 'ease',
        delay: delays[i % delays.length] || '0s',
        instanceCount: 0,
        representativeSelector: null,
      }
      g.instanceCount++
      g.representativeSelector ??=
        el.tagName.toLowerCase() +
        (el.id
          ? '#' + el.id
          : [...el.classList]
              .slice(0, 2)
              .map((c) => '.' + c)
              .join(''))
      groups.set(key, g)
    }
  }
  // Resolve animationName against CSSKeyframesRule — the keyframes ARE the motion definition
  // and are invisible to getComputedStyle.
  const keyframes = {}
  for (const sheet of document.styleSheets) {
    let rules
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    const walk = (rs) => {
      for (const r of rs) {
        if (r.type === CSSRule.KEYFRAMES_RULE)
          keyframes[r.name] = [...r.cssRules].map((k) => ({
            offset: k.keyText,
            declarations: Object.fromEntries(
              [...k.style].map((p) => [p, k.style.getPropertyValue(p)]),
            ),
          }))
        else if (r.cssRules) walk(r.cssRules)
      }
    }
    walk(rules)
  }
  return {
    transitions: [...groups.values()].sort((a, b) => b.instanceCount - a.instanceCount),
    keyframes,
  }
}
```

- [ ] **Step 2: Write the typography extractor with a real `measureCh`**

The `width / (size * 0.5)` approximation is wrong by 15–20% on a condensed face, and typographic measure is a first-class spec number.

```js
function measureCh(el, renderedWidth) {
  const cs = getComputedStyle(el)
  const ctx = document.createElement('canvas').getContext('2d')
  ctx.font =
    cs.font ||
    `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`
  const zero = ctx.measureText('0').width
  return zero > 0 ? +(renderedWidth / zero).toFixed(1) : null
}
```

- [ ] **Step 3: Write the colors extractor ranking by painted area, not frequency**

Frequency alone ranks a 1px border above the page background, which inverts the palette.

```js
function extractColors() {
  const hits = new Map()
  const norm = (v) => {
    if (!v || v === 'none' || v === 'transparent' || /^rgba\(0, 0, 0, 0\)$/.test(v))
      return null
    const m = v.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/)
    if (m) {
      const [, r, g, b, a] = m
      if (a !== undefined && +a === 0) return null
      return (
        '#' +
        [r, g, b]
          .map((n) => (+n).toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase() +
        (a !== undefined && +a < 1 ? `/${a}` : '')
      )
    }
    return v.toUpperCase() // oklch(), color(srgb …) kept verbatim rather than mis-converted
  }
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el),
      r = el.getBoundingClientRect(),
      area = r.width * r.height
    for (const prop of [
      'color',
      'backgroundColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'outlineColor',
      'fill',
      'stroke',
    ]) {
      const hex = norm(cs[prop])
      if (!hex) continue
      const rec = hits.get(hex) ?? {
        hex,
        count: 0,
        largestAreaPx2: 0,
        properties: {},
      }
      rec.count++
      rec.properties[prop] = (rec.properties[prop] ?? 0) + 1
      if (prop === 'backgroundColor' || prop === 'fill')
        rec.largestAreaPx2 = Math.max(rec.largestAreaPx2, Math.round(area))
      hits.set(hex, rec)
    }
  }
  return [...hits.values()].sort(
    (a, b) => b.largestAreaPx2 - a.largestAreaPx2 || b.count - a.count,
  )
}
```

- [ ] **Step 4: Write the CORS refetch path**

Without this, most font and breakpoint data on a Shopify-class site is silently lost. `page.request.get` reuses the context's cookies and is not subject to the CSSOM same-origin rule.

```js
export async function refetchCorsStylesheets(page, hrefs) {
  const out = {
    mediaConditions: [],
    fontFaces: [],
    keyframes: {},
    customProperties: {},
    source: 'refetched',
    fetched: [],
  }
  for (const href of hrefs) {
    const res = await page.request.get(href).catch(() => null)
    if (!res || !res.ok()) {
      out.fetched.push({ href, ok: false })
      continue
    }
    const text = await res.text().catch(() => '')
    out.fetched.push({ href, ok: true, bytes: text.length })
    for (const m of text.matchAll(/@media\s+([^{]+)\{/g))
      out.mediaConditions.push(m[1].trim())
    for (const m of text.matchAll(/@font-face\s*\{([^}]+)\}/g))
      out.fontFaces.push(m[1].trim())
    for (const m of text.matchAll(/@keyframes\s+([\w-]+)\s*\{/g))
      out.keyframes[m[1]] ??= 'declared-in-refetched-sheet'
    for (const m of text.matchAll(/--([\w-]+)\s*:\s*([^;}]+)/g))
      out.customProperties['--' + m[1]] ??= m[2].trim()
  }
  return out
}
```

- [ ] **Step 5: Verify against a site recon flagged as having unreadable stylesheets**

Run with `dangerouslyDisableSandbox: true`, on Shopify because recon reports CORS sheets there:

```bash
cd /Users/mj/repos/mccor-labs && node scripts/capture-reference-site.mjs --site shopify --only-extract 2>&1 | tail
cd /Users/mj/repos/mccor-labs && node -e '
const d = JSON.parse(require("fs").readFileSync("docs/ui-references/shopify/extract.desktop.json","utf8"));
console.log("colors:", d.colors.length, "| top:", d.colors.slice(0,3).map(c=>c.hex+"@"+c.largestAreaPx2).join(" "));
console.log("transitions:", d.motion.transitions.length, "| keyframes:", Object.keys(d.motion.keyframes).length);
console.log("breakpoints:", d.breakpoints.map(b=>b.px+"("+b.ruleCount+")").join(" "));
console.log("fontFaces:", d.fontFaces.length, "| refetched:", d.corsRefetch?.fetched?.filter(f=>f.ok).length ?? 0);
console.log("customProps declared/resolved:", Object.keys(d.customProperties.declared).length, Object.keys(d.customProperties.resolved).length);'
```

Expected: `colors` is non-empty and its top entry by `largestAreaPx2` is a plausible page background (not a 1px border color); `transitions` is a grouped list in the dozens, not tens of thousands; `breakpoints` shows a few values with high rule counts; `fontFaces` is non-empty **because of** the refetch. If `fontFaces` is 0 while `corsRefetch.fetched` shows successful fetches, the refetch parse is broken.

---

### Task 6: Scroll frames, reveals, parallax fit, and scroll-session video

**Files:**

- Create: `scripts/lib/scroll.mjs`

**Interfaces:**

- Consumes: `tierOf` from Task 3; `settle` from Task 4.
- Produces: `export async function captureScrollFrames(page, {n, dir, viewport, index})` writing `scroll/NN-y<measured>.<vp>.jpg` and returning `{frames: [{i, requestedY, measuredY, path}], warnings}`.
- Produces: `export const REVEAL_OBSERVER_INIT` (an `addInitScript` patching `IntersectionObserver`), `export async function startRevealWatcher(page)`, `export async function collectReveals(page)`.
- Produces: `export function fitParallax(samples)` returning `{ratio, r2, n}` per tracked element.

- [ ] **Step 1: Write the actuation with trusted wheel events and a real settle**

Smooth-scroll libraries consume trusted wheel events and **ignore programmatic `scrollTo`**. Settling is three consecutive identical samples 100ms apart, capped at 5s — never a bare `waitForTimeout`.

```js
async function reportedY(page) {
  return page.evaluate(
    () =>
      window.__lenis?.animatedScroll ??
      window.__lenis?.scroll ??
      window.__loco?.scroll?.instance?.scroll?.y ??
      window.scrollY,
  )
}

async function settleScroll(page) {
  const deadline = Date.now() + 5000
  let last = null,
    same = 0
  while (Date.now() < deadline) {
    const y = Math.round(await reportedY(page))
    same = y === last ? same + 1 : 0
    last = y
    if (same >= 2) return y // three consecutive identical samples
    await page.waitForTimeout(100)
  }
  return last
}

export async function captureScrollFrames(page, { n, dir, viewport, slugPrefix }) {
  const warnings = [],
    frames = []
  const { travel } = await page.evaluate(() => ({
    travel: Math.max(0, document.documentElement.scrollHeight - innerHeight),
  }))
  let prevMeasured = -1e9
  for (let i = 0; i < n; i++) {
    const requestedY = Math.round((i * travel) / Math.max(1, n - 1))
    let measuredY = await settleScroll(page)
    for (
      let attempt = 0;
      attempt < 3 && Math.abs(measuredY - requestedY) > 40;
      attempt++
    ) {
      await page.mouse.wheel(0, (requestedY - measuredY) * (attempt === 0 ? 1 : 1.8))
      measuredY = await settleScroll(page)
    }
    if (i > 0 && Math.abs(measuredY - prevMeasured) <= 50) {
      warnings.push({
        code: 'SCROLL_STUCK',
        message: `frame ${i} measured ${measuredY}, previous ${prevMeasured}; aborting route rather than emitting duplicate frames`,
      })
      break // never emit 16 copies of the hero
    }
    prevMeasured = measuredY
    const path = `${dir}/${String(i).padStart(2, '0')}-y${measuredY}.${viewport}.jpg`
    await page.screenshot({ path, quality: 82, type: 'jpeg' })
    frames.push({ i, requestedY, measuredY, path })
  }
  return { frames, warnings }
}
```

- [ ] **Step 2: Write both reveal detectors — the patch _and_ the MutationObserver**

The `MutationObserver` is not redundant. **Locomotive does not use `IntersectionObserver`**; it computes in-view state in its own `rAF` loop, so the constructor patch sees nothing for it. Both run always.

```js
export const REVEAL_OBSERVER_INIT = () => {
  window.__observers = []
  const Real = window.IntersectionObserver
  window.IntersectionObserver = class extends Real {
    constructor(cb, opts) {
      super(cb, opts)
      window.__observers.push({
        root: opts?.root ? 'element' : 'viewport',
        rootMargin: opts?.rootMargin ?? '0px',
        threshold: opts?.threshold ?? 0,
      })
    }
  }
}

export async function startRevealWatcher(page) {
  await page.evaluate(() => {
    window.__reveals = []
    new MutationObserver((muts) => {
      for (const m of muts) {
        const el = m.target
        if (el.nodeType !== 1) continue
        const r = el.getBoundingClientRect()
        window.__reveals.push({
          attribute: m.attributeName,
          from: (m.oldValue ?? '').slice(0, 120),
          to: (m.attributeName === 'class'
            ? el.className
            : (el.getAttribute('style') ?? '')
          ).slice(0, 120),
          selector:
            el.tagName.toLowerCase() +
            [...el.classList]
              .slice(0, 2)
              .map((c) => '.' + c)
              .join(''),
          scrollY: Math.round(
            window.__lenis?.scroll ??
              window.__loco?.scroll?.instance?.scroll?.y ??
              scrollY,
          ),
          rectTop: Math.round(r.top),
          viewportFraction: +(r.top / innerHeight).toFixed(3),
          t: Math.round(performance.now()),
        })
      }
    }).observe(document.body, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['class', 'style'],
      subtree: true,
    })
  })
}
```

- [ ] **Step 3: Write the least-squares fit in Node**

`r² > 0.99` means true linear parallax at that ratio. A poor fit means it is eased or clamped, and the notes must say so rather than assert a ratio that is not there.

```js
export function fitParallax(samples) {
  const n = samples.length
  if (n < 3) return { ratio: null, r2: null, n, verdict: 'insufficient-samples' }
  const sx = samples.reduce((a, s) => a + s.scrollY, 0),
    sy = samples.reduce((a, s) => a + s.translateY, 0)
  const mx = sx / n,
    my = sy / n
  let num = 0,
    den = 0
  for (const s of samples) {
    num += (s.scrollY - mx) * (s.translateY - my)
    den += (s.scrollY - mx) ** 2
  }
  if (den === 0) return { ratio: null, r2: null, n, verdict: 'no-scroll-variance' }
  const ratio = num / den,
    b = my - ratio * mx
  let ssRes = 0,
    ssTot = 0
  for (const s of samples) {
    ssRes += (s.translateY - (ratio * s.scrollY + b)) ** 2
    ssTot += (s.translateY - my) ** 2
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot
  return {
    ratio: +ratio.toFixed(4),
    intercept: +b.toFixed(2),
    r2: +r2.toFixed(4),
    n,
    verdict: r2 > 0.99 ? 'linear-parallax' : 'eased-or-clamped',
  }
}
```

- [ ] **Step 4: Run the live pass on one Locomotive/Lenis site and read the measured positions**

Run with `dangerouslyDisableSandbox: true`:

```bash
cd /Users/mj/repos/mccor-labs && node scripts/capture-reference-site.mjs --site david-hckh --route home --pass live --clean 2>&1 | tail
ls docs/ui-references/david-hckh/scroll/ | head -20
```

Expected: filenames carry **monotonically increasing, distinct** measured y values — `00-y0.desktop.jpg`, `01-y612.desktop.jpg`, `02-y1224.desktop.jpg`, … Repeated or all-zero y values mean the wheel actuation is not reaching the smooth-scroll library and the whole live pass is worthless; fix before proceeding.

- [ ] **Step 5: Verify reveals and parallax produced real numbers**

```bash
cd /Users/mj/repos/mccor-labs && node -e '
const d = JSON.parse(require("fs").readFileSync("docs/ui-references/david-hckh/extract.desktop.json","utf8"));
console.log("observersDeclared:", d.observersDeclared?.length ?? 0);
console.log("revealsObserved:", d.revealsObserved?.length ?? 0);
const f = (d.revealsObserved ?? []).map(r => r.viewportFraction).filter(Number.isFinite).sort((a,b)=>a-b);
console.log("reveal viewportFraction median:", f.length ? f[Math.floor(f.length/2)] : "none");
console.log("scrollLinked:", JSON.stringify(d.scrollLinked?.slice(0,3) ?? []));'
```

Expected: a median `viewportFraction` in a plausible band (roughly 0.7–0.95) — that number is exactly what a reveal component's `viewport.margin` prop encodes. `revealsObserved: 0` on a site with visible scroll animation means the `MutationObserver` never ran, or ran after the reveals had already fired.

---

### Task 7: Interaction states and computed-style deltas

**Files:**

- Create: `scripts/lib/states.mjs`

**Interfaces:**

- Consumes: `site.selectors` from Task 3.
- Produces: `export async function captureStates(page, {site, viewport, dir, index})` writing `states/{hover,focus,nav-open,nav-scrolled}-<target>.<vp>.png` and `states/deltas.json`.

- [ ] **Step 1: Write the before/after computed-style diff**

This is the highest value per byte in the whole tree: it yields "on hover, `background-color` goes `#0F2536` → `#FFCE34` over 400ms `cubic-bezier(0.19,1,0.22,1)`" instead of two pictures someone has to squint at.

```js
const SNAPSHOT = (sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  const cs = getComputedStyle(el)
  const out = {}
  for (const p of cs) out[p] = cs.getPropertyValue(p)
  const r = el.getBoundingClientRect()
  out.__rect = `${Math.round(r.width)}x${Math.round(r.height)}`
  return out
}

export function diffStyles(before, after) {
  if (!before || !after) return null
  const changed = {}
  for (const k of Object.keys(after)) {
    if (before[k] !== after[k]) changed[k] = { from: before[k], to: after[k] }
  }
  return changed
}

export async function captureStates(page, { site, viewport, dir }) {
  const deltas = {},
    warnings = []
  for (const [name, sel] of Object.entries(site.selectors)) {
    if (!sel) continue
    const before = await page.evaluate(SNAPSHOT, sel)
    if (!before) {
      warnings.push({ code: 'STATE_TARGET_MISSING', affects: [sel] })
      continue
    }
    const loc = page.locator(sel).first()
    await loc.hover({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(600) // past the longest transition we have seen
    const afterHover = await page.evaluate(SNAPSHOT, sel)
    const hoverPath = `${dir}/hover-${name}.${viewport}.png`
    await page.screenshot({ path: hoverPath, animations: 'disabled' })

    await page.evaluate((s) => document.querySelector(s)?.blur?.(), sel)
    await loc.focus({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(400)
    const afterFocus = await page.evaluate(SNAPSHOT, sel)
    const focusPath = `${dir}/focus-${name}.${viewport}.png`
    await page.screenshot({ path: focusPath, animations: 'disabled' })

    deltas[name] = {
      selector: sel,
      hover: diffStyles(before, afterHover),
      focus: diffStyles(before, afterFocus),
      transition: {
        property: before['transition-property'],
        duration: before['transition-duration'],
        timing: before['transition-timing-function'],
        delay: before['transition-delay'],
      },
      shots: { hover: hoverPath, focus: focusPath },
    }
    await page.mouse.move(0, 0)
  }
  return { deltas, warnings }
}
```

- [ ] **Step 2: Run on a tier-1 site and read the delta file, not the pictures**

Run with `dangerouslyDisableSandbox: true`:

```bash
cd /Users/mj/repos/mccor-labs && node scripts/capture-reference-site.mjs --site pacomepertant --only-states 2>&1 | tail
cd /Users/mj/repos/mccor-labs && node -e '
const d = JSON.parse(require("fs").readFileSync("docs/ui-references/pacomepertant/states/deltas.json","utf8"));
for (const [k,v] of Object.entries(d)) {
  const props = Object.keys(v.hover ?? {}).filter(p => !p.startsWith("__")).slice(0,6);
  console.log(k, "| transition:", v.transition.duration, v.transition.timing, "| hover changed:", props.join(", ") || "NOTHING");
}'
```

Expected: at least one target reports changed properties and a non-`0s` transition duration with a real timing function. Every target reporting `NOTHING` means hover is not landing (wrong selector, or an overlay is intercepting) — that is a real finding to fix, not to accept.

---

### Task 8: Page transitions and signature effects

**Files:**

- Create: `scripts/lib/transitions.mjs`
- Create: `scripts/lib/effects.mjs`

**Interfaces:**

- Consumes: `site.routes`, `site.effects` from Task 3.
- Produces: `transitions.mjs` — `export async function captureTransition(browser, {from, to, dir})` returning `{frames, styleSamples, videoPath}`, each call in a **fresh context**.
- Produces: `effects.mjs` — `export const NEUTRALISE_AUTOPLAY` (init script), `export async function captureVideoFrames(page, dir)`, `export async function dumpParticlesConfig(page)`, `export async function captureTypewriter(page, dir)`.

- [ ] **Step 1: Write the transition capture — hooks first, then click, and ack every frame**

`waitForNavigation` hangs on a Barba swap because no navigation event fires. And **omitting `screencastFrameAck` is the standard failure of this technique** — the stream stalls after a handful of frames.

```js
export async function captureTransition(browser, { fromUrl, toSelector, dir, label }) {
  // Fresh context per transition: Barba caches fetched pages in memory, so a second traversal
  // from an already-visited page is measurably faster and not comparable to a cold one.
  const ctx = await browser.newContext({
    ...CTX_OPTS,
    recordVideo: { dir, size: { width: 1440, height: 900 } },
  })
  const page = await ctx.newPage()
  await page.goto(fromUrl, { waitUntil: 'load', timeout: 45000 })
  await settle(page)

  await page.evaluate(() => {
    window.__t = {}
    window.__samples = []
    const hooks = ['before', 'leave', 'enter', 'after']
    if (window.barba?.hooks)
      for (const h of hooks)
        window.barba.hooks[h](() => {
          window.__t[h] = performance.now()
        })
    window.__startSampler = (t0) => {
      const c =
        document.querySelector('[data-barba="container"]') ||
        document.querySelector('main')
      const ov = document.querySelector(
        '[class*="transition"], [class*="overlay"], [class*="curtain"]',
      )
      const tick = () => {
        const cs = c ? getComputedStyle(c) : null,
          os = ov ? getComputedStyle(ov) : null
        window.__samples.push({
          t: Math.round(performance.now() - t0),
          containerOpacity: cs?.opacity ?? null,
          containerTransform: cs?.transform ?? null,
          overlayOpacity: os?.opacity ?? null,
          overlayTransform: os?.transform ?? null,
          scrollY: Math.round(scrollY),
          barbaPhase: Object.keys(window.__t).at(-1) ?? null,
        })
        if (performance.now() - t0 < 4000) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
  })

  const cdp = await ctx.newCDPSession(page)
  const frames = []
  cdp.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
    frames.push({ data, t: metadata.timestamp })
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}) // REQUIRED
  })
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 80,
    everyNthFrame: 1,
  })

  const t0 = Date.now()
  await page.evaluate(
    (t) => window.__startSampler(t),
    await page.evaluate(() => performance.now()),
  )
  await page.locator(toSelector).first().click()
  await page
    .waitForFunction(() => window.__t.after !== undefined, { timeout: 15000 })
    .catch(() => {
      /* not a Barba site, or hook names differ — samples still recorded */
    })
  await page.waitForTimeout(500)
  await cdp.send('Page.stopScreencast').catch(() => {})

  const styleSamples = await page.evaluate(() => ({
    marks: window.__t,
    samples: window.__samples,
  }))
  for (const [i, f] of frames.entries())
    await writeFile(
      `${dir}/f${String(i).padStart(3, '0')}-t${String(Math.round(f.t * 1000 - t0)).padStart(4, '0')}.jpg`,
      Buffer.from(f.data, 'base64'),
    )
  await ctx.close() // video is only finalised on context close
  return {
    frameCount: frames.length,
    styleSamples,
    warnings:
      frames.length <= 20
        ? [
            {
              code: 'SCREENCAST_TOO_FEW_FRAMES',
              message: `${frames.length} frames; expected 40–70 — check screencastFrameAck`,
            },
          ]
        : [],
  }
}
```

- [ ] **Step 2: Write the effects module, guarding the `blob:` video case**

Autoplay must be neutralised _before_ load: a video that has already played four seconds holds a different decoded frame than one seeked from cold.

```js
export const NEUTRALISE_AUTOPLAY = () => {
  HTMLMediaElement.prototype.play = function () {
    return Promise.resolve()
  }
}

export async function captureVideoFrames(page, dir) {
  const metas = await page.evaluate(() =>
    [...document.querySelectorAll('video')].map((v, i) => {
      const r = v.getBoundingClientRect(),
        cs = getComputedStyle(v),
        ps = v.parentElement ? getComputedStyle(v.parentElement) : null
      return {
        i,
        currentSrc: v.currentSrc || null,
        poster: v.poster || null,
        rect: { w: Math.round(r.width), h: Math.round(r.height) },
        objectFit: cs.objectFit,
        playsinline: v.playsInline,
        muted: v.muted,
        loop: v.loop,
        duration: Number.isFinite(v.duration) ? v.duration : null,
        parentBlend: ps?.mixBlendMode ?? null,
        parentFilter: ps?.filter ?? null,
        // Review Focus #6: a blob: src cannot be seeked from cold. Record it, do not throw.
        seekable: !!v.currentSrc && !v.currentSrc.startsWith('blob:'),
        downloaded: false,
      }
    }),
  )
  for (const m of metas) {
    if (!m.seekable) {
      m.frames = []
      m.note = 'blob: source — not seekable from cold, no frames captured'
      continue
    }
    m.frames = []
    for (const t of [1.0, 3.0]) {
      const ok = await page
        .evaluate(
          async ([i, t]) => {
            const v = document.querySelectorAll('video')[i]
            try {
              v.pause()
              v.currentTime = t
              await new Promise((res, rej) => {
                v.addEventListener('seeked', res, { once: true })
                setTimeout(rej, 4000)
              })
              return true
            } catch {
              return false
            }
          },
          [m.i, t],
        )
        .catch(() => false)
      if (!ok) continue
      const p = `${dir}/video-${m.i}-t${t}.png`
      await page
        .locator('video')
        .nth(m.i)
        .screenshot({ path: p })
        .catch(() => {})
      m.frames.push({ t, path: p })
    }
  }
  return metas
}

/** The config IS the deliverable; the pixels are not. No quantity of screenshots replaces this. */
export async function dumpParticlesConfig(page) {
  return page.evaluate(() => {
    const pJS = window.pJSDom?.[0]?.pJS
    if (!pJS) return null
    const safe = (o, depth = 0) => {
      if (depth > 8 || o === null || typeof o !== 'object')
        return typeof o === 'function' ? undefined : o
      if (o instanceof HTMLElement || o instanceof CanvasRenderingContext2D)
        return '[dom]'
      if (Array.isArray(o)) return o.slice(0, 50).map((v) => safe(v, depth + 1))
      const out = {}
      for (const [k, v] of Object.entries(o)) {
        const s = safe(v, depth + 1)
        if (s !== undefined) out[k] = s
      }
      return out
    }
    return {
      particles: safe(pJS.particles),
      interactivity: safe(pJS.interactivity),
      retina_detect: pJS.retina_detect,
      canvasSize: { w: pJS.canvas?.w, h: pJS.canvas?.h },
    }
  })
}
```

- [ ] **Step 3: Run one transition on a tier-1 site and read the timing numbers**

Run with `dangerouslyDisableSandbox: true`:

```bash
cd /Users/mj/repos/mccor-labs && node scripts/capture-reference-site.mjs --site david-hckh --only-transitions 2>&1 | tail
cd /Users/mj/repos/mccor-labs && node -e '
const fs = require("fs"), base = "docs/ui-references/david-hckh/transitions";
for (const d of fs.readdirSync(base)) {
  const s = JSON.parse(fs.readFileSync(base + "/" + d + "/styles.json", "utf8"));
  const jpgs = fs.readdirSync(base + "/" + d).filter(f => f.endsWith(".jpg")).length;
  const webm = fs.readdirSync(base + "/" + d).filter(f => f.endsWith(".webm")).length;
  const peak = (s.samples ?? []).reduce((a,x) => (+x.overlayOpacity > +(a?.overlayOpacity ?? -1) ? x : a), null);
  console.log(d, "| frames:", jpgs, "| webm:", webm, "| samples:", s.samples?.length,
              "| marks:", JSON.stringify(s.marks), "| overlay peak opacity", peak?.overlayOpacity, "at", peak?.t + "ms");
}'
```

Expected: more than 20 JPEGs (fewer means `screencastFrameAck` is missing), one `.webm`, a few hundred rAF samples, and a printable sentence like "overlay peak opacity 1 at 420ms". That sentence is the deliverable; the JPEGs corroborate it.

---

### Task 9: Network inventory and asset catalogue

**Files:**

- Create: `scripts/lib/network.mjs`

**Interfaces:**

- Consumes: the context created in Task 4.
- Produces: `export function attachNetworkListeners(ctx)` returning a collector, `export async function writeNetworkArtifacts(page, collector, dir)` writing `network/console.json` and `network/assets.json`.

- [ ] **Step 1: Attach to the context, not the page, and guard the body read**

Subframe requests — Vimeo and YouTube iframes — only appear on context listeners. And `response.text()` throws for a body already discarded; an unguarded throw kills the listener and loses the remainder of the log.

```js
export function attachNetworkListeners(ctx) {
  const requests = [],
    console_ = [],
    errors = []
  ctx.on('response', async (res) => {
    const req = res.request()
    const rec = {
      url: res.url(),
      method: req.method(),
      status: res.status(),
      resourceType: req.resourceType(),
      fromCache: false,
      contentType: res.headers()['content-type'] ?? null,
      bytes: Number(res.headers()['content-length'] ?? 0) || null,
      server: res.headers()['server'] ?? null,
      cdn:
        res.headers()['x-served-by'] ??
        res.headers()['cf-cache-status'] ??
        res.headers()['x-vercel-cache'] ??
        null,
      version: null,
      downloaded: false,
    }
    if (req.resourceType() === 'script' && (rec.bytes ?? 0) < 2_000_000) {
      try {
        // transient, in memory only — never stored
        const t = await res.text()
        rec.version = t.match(/version["':\s]+([\d]+\.[\d]+\.[\d]+)/)?.[1] ?? null
      } catch {
        /* body already discarded — expected, must not throw */
      }
    }
    requests.push(rec)
  })
  ctx.on('page', (p) => {
    p.on('console', (m) =>
      console_.push({ type: m.type(), text: m.text().slice(0, 500) }),
    )
    p.on('pageerror', (e) => errors.push({ message: String(e).slice(0, 500) }))
  })
  return { requests, console_, errors }
}
```

- [ ] **Step 2: Write the join that turns bytes into art direction**

This join is the point. It turns "a 184KB jpeg was requested" into "product photography, 3:2, served at 2× the rendered box, lazy, art-directed at four widths with a 50vw/100vw sizes rule".

```js
export async function writeNetworkArtifacts(page, collector, dir) {
  const dom = await page.evaluate(() => {
    const out = { images: [], videos: [] }
    for (const img of document.images) {
      const r = img.getBoundingClientRect()
      out.images.push({
        currentSrc: img.currentSrc,
        srcset: img.getAttribute('srcset'),
        sizes: img.getAttribute('sizes'),
        loading: img.loading,
        decoding: img.decoding,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        renderedWidth: Math.round(r.width),
        renderedHeight: Math.round(r.height),
        aspect: r.height ? +(r.width / r.height).toFixed(3) : null,
        alt: (img.alt ?? '').slice(0, 80),
      })
    }
    for (const v of document.querySelectorAll('video, video source'))
      out.videos.push({
        src: v.currentSrc || v.src || v.getAttribute('src'),
        type: v.getAttribute('type') ?? null,
      })
    return out
  })

  const byUrl = new Map(collector.requests.map((r) => [r.url, r]))
  const group = (pred) =>
    collector.requests.filter(pred).map((r) => ({ ...r, downloaded: false }))
  const assets = {
    note: 'No third-party binary was downloaded. Every entry is a catalogue record only.',
    fonts: group(
      (r) => r.resourceType === 'font' || /\.(woff2?|ttf|otf)(\?|$)/i.test(r.url),
    ),
    video: group(
      (r) => r.resourceType === 'media' || /\.(mp4|webm|m3u8)(\?|$)/i.test(r.url),
    ),
    scripts: group((r) => r.resourceType === 'script'),
    stylesheets: group((r) => r.resourceType === 'stylesheet'),
    images: dom.images.map((i) => ({
      ...i,
      downloaded: false,
      network: byUrl.get(i.currentSrc)
        ? {
            bytes: byUrl.get(i.currentSrc).bytes,
            status: byUrl.get(i.currentSrc).status,
            cdn: byUrl.get(i.currentSrc).cdn,
          }
        : null,
      pixelRatioServed: i.renderedWidth
        ? +(i.naturalWidth / i.renderedWidth).toFixed(2)
        : null,
      artDirectedWidths: (i.srcset ?? '')
        .split(',')
        .map((s) => s.trim().split(/\s+/)[1])
        .filter(Boolean),
    })),
    domVideos: dom.videos.map((v) => ({ ...v, downloaded: false })),
  }
  await writeFile(`${dir}/assets.json`, JSON.stringify(assets, null, 2))
  await writeFile(
    `${dir}/console.json`,
    JSON.stringify(
      { console: collector.console_, pageerrors: collector.errors },
      null,
      2,
    ),
  )
  return assets
}
```

- [ ] **Step 3: Verify no binary was written and the join produced ratios**

```bash
cd /Users/mj/repos/mccor-labs && node -e '
const a = JSON.parse(require("fs").readFileSync("docs/ui-references/david-hckh/network/assets.json","utf8"));
const all = [...a.fonts,...a.video,...a.scripts,...a.stylesheets,...a.images,...a.domVideos];
console.log("entries:", all.length, "| any downloaded:true:", all.some(e => e.downloaded !== false));
console.log("fonts:", a.fonts.map(f => f.url.split("/").pop()).slice(0,5).join(" "));
const over = a.images.filter(i => i.pixelRatioServed > 2.5);
console.log("images served >2.5x rendered box:", over.length, "of", a.images.length);'

# The HAR must contain no response bodies.
cd /Users/mj/repos/mccor-labs && python3 -c '
import json; h=json.load(open("docs/ui-references/david-hckh/network/session.har"))
es=h["log"]["entries"]; bodies=[e for e in es if e["response"]["content"].get("text")]
print("har entries:", len(es), "| entries with a body:", len(bodies))'
```

Expected: `any downloaded:true: false`, and `entries with a body: 0`. A non-zero body count means `content: "omit"` was dropped from `recordHar` and copyrighted bytes are now on disk — delete the HAR and fix before continuing.

---

### Task 10: Staged full run

**Files:**

- Modify: none. This task runs the tooling built in Tasks 1–9.

**Interfaces:**

- Consumes: everything.
- Produces: the populated `docs/ui-references/<slug>/` tree for all ten sites.

- [ ] **Step 1: Run tier 3 first — cheapest, so failures surface before hours are spent**

Run with `dangerouslyDisableSandbox: true`, one site at a time:

```bash
cd /Users/mj/repos/mccor-labs && for s in helloshivam guglieri raggededge; do
  node scripts/capture-reference-site.mjs --site "$s" --clean 2>&1 | tail -3
done
du -sh docs/ui-references
```

Expected: three site directories, each with a non-zero `artifactCount`. Note the per-site MB figure — it is the basis for projecting whether tier 1 fits the 12GB ceiling.

- [ ] **Step 2: Run tier 2, with Shopify last because it is the most likely to bot-block**

```bash
cd /Users/mj/repos/mccor-labs && for s in y-n10 squadeasy shopify; do
  node scripts/capture-reference-site.mjs --site "$s" --clean 2>&1 | tail -3
done
```

Expected: three more directories. If Shopify reports `SITE_FAILED` with a 403 or a challenge page, that is Review Focus #1 working correctly — record it and continue; do not add evasion.

- [ ] **Step 3: Run tier 1 — the long one**

```bash
cd /Users/mj/repos/mccor-labs && for s in belenjones topology-vc pacomepertant david-hckh; do
  node scripts/capture-reference-site.mjs --site "$s" --clean 2>&1 | tail -3
done
du -sh docs/ui-references && df -h /Users/mj | tail -1
```

Expected: total tree under 12GB and the volume still has headroom. A `DISK_CEILING_REACHED` warning means stop and reduce scroll-frame counts rather than pushing the volume past 95%.

- [ ] **Step 4: Validate every index across all ten sites**

```bash
cd /Users/mj/repos/mccor-labs && node -e '
const { createHash } = require("crypto"), fs = require("fs"), path = require("path");
let bad = 0, total = 0, warn = 0;
for (const slug of fs.readdirSync("docs/ui-references").filter(d => !d.startsWith("_") && fs.statSync("docs/ui-references/"+d).isDirectory())) {
  const dir = "docs/ui-references/" + slug, ix = JSON.parse(fs.readFileSync(dir + "/index.json", "utf8"));
  warn += ix.warnings.length;
  for (const a of ix.artifacts) {
    total++;
    const p = path.join(dir, a.path);
    if (!fs.existsSync(p)) { console.log("MISSING", slug, a.path); bad++; continue; }
    const d = createHash("sha256").update(fs.readFileSync(p)).digest("hex");
    if (d !== a.sha256) { console.log("DIGEST MISMATCH", slug, a.path); bad++; }
  }
  const ds = JSON.parse(fs.readFileSync(dir + "/design-system.json", "utf8"));
  for (const k of ["colors","typography","spacing","motion"])
    if (!ds[k] || (Array.isArray(ds[k]) ? !ds[k].length : !Object.keys(ds[k]).length))
      console.log("EMPTY EXTRACT", slug, k);
  console.log(slug.padEnd(16), ix.artifacts.length, "artifacts,", ix.warnings.length, "warnings");
}
console.log("\ntotal artifacts:", total, "| broken:", bad, "| warnings:", warn);
process.exit(bad ? 1 : 0);'
```

Expected: `broken: 0`, ten site lines, and no `EMPTY EXTRACT`. Definition of done items 2 and 3 are exactly this check.

- [ ] **Step 5: Assert no foreign binary exists in the tree**

```bash
cd /Users/mj/repos/mccor-labs && find docs/ui-references -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn
```

Expected: only `png`, `jpg`, `json`, `webm`, `har`, and `md`. Any `woff2`, `mp4`, `svg`, `js`, or `css` file means a third-party binary was written and Global Constraint 1 is violated — delete it and find the code path that wrote it.

---

### Task 11: Tech-stack documents and cross-site synthesis

**Files:**

- Create: `docs/ui-references/<slug>/tech-stack.md` (ten files)
- Create: `docs/ui-references/<slug>/notes.md` (ten files)
- Create: `docs/ui-references/STACK-COMPARISON.md`
- Create: `docs/ui-references/stacks.json`

**Interfaces:**

- Consumes: each site's `design-system.json`, `network/assets.json`, `network/console.json`, `_recon/<slug>.json`, `index.json`.
- Produces: prose and JSON deliverables. No new code.

- [ ] **Step 1: Write one `tech-stack.md` per site, evidence-first**

Required sections, each claim followed by its evidence. **A claim with no evidence line is not written down** — write "not detected" instead.

```markdown
# <slug> — Technology Stack

**Origin:** <origin> · **Captured:** <date> · **Tier:** <n>

| layer               | finding                         | evidence                                                                                                                                       |
| ------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendering framework | Next.js 14.2.3                  | `window.__NEXT_DATA__` present (`_recon/<slug>.json` → `windowGlobals.__NEXT_DATA__`); `/_next/static/` request paths in `network/assets.json` |
| CMS / builder       | not detected                    | no `generator` meta, no `wp-` or `Shopify` global                                                                                              |
| Scroll / animation  | Locomotive Scroll + GSAP 3.12.5 | `html.has-scroll-smooth` in `windowGlobals.htmlClasses`; `gsap.version` read at runtime                                                        |
| Fonts               | …                               | `design-system.json` → `fontFaces[]`, `licensedThirdParty` flag                                                                                |
| Hosting / CDN       | …                               | `server` and `cdn` response headers in `assets.json`                                                                                           |
| Analytics           | …                               | request hosts in `assets.json.scripts`                                                                                                         |
| Build signature     | …                               | `webpackChunkKeys`, chunk-name pattern                                                                                                         |
| Third-party embeds  | …                               | subframe requests in `session.har`                                                                                                             |

## Not determined

- <thing>: <why it could not be determined from what we captured>
```

- [ ] **Step 2: Write one `notes.md` per site, every claim citing an artifact path**

Prose observations tied to artifact paths. Cite by symbol and path, never by line number. Example of the required standard: "The hero occupies 980px at desktop and every subsequent section uses 150px top and bottom padding (`design-system.json` → `spacing.sectionPadding`), which is why the page reads as five equal beats after one tall opening — see `sections/01-hero.desktop.png` against `sections/02-work.desktop.png`."

- [ ] **Step 3: Write `stacks.json`, then `STACK-COMPARISON.md` from it**

`stacks.json` is the same per-site data machine-readably, keyed by slug, so an agent can filter without parsing prose. `STACK-COMPARISON.md` then covers: the ten-site matrix on every axis; what the top-four ranked sites share that the bottom three do not; which of those choices are **load-bearing** for the qualities ranked highly versus incidental; and a concrete recommended stack for the site being built, with the tradeoff named for each choice.

- [ ] **Step 4: Verify every evidence citation resolves**

```bash
cd /Users/mj/repos/mccor-labs && node -e '
const fs = require("fs"), path = require("path");
let missing = 0;
for (const f of [...fs.readdirSync("docs/ui-references").flatMap(d => {
  const p = "docs/ui-references/" + d;
  return fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter(x => x.endsWith(".md")).map(x => p + "/" + x) : [];
}), "docs/ui-references/STACK-COMPARISON.md"]) {
  const txt = fs.readFileSync(f, "utf8"), dir = path.dirname(f);
  for (const m of txt.matchAll(/`([\w./-]+\.(json|png|jpg|webm|har))`/g)) {
    const cand = [path.join(dir, m[1]), path.join("docs/ui-references", m[1])];
    if (!cand.some(fs.existsSync)) { console.log("DANGLING", f, "->", m[1]); missing++; }
  }
}
console.log("dangling citations:", missing);
process.exit(missing ? 1 : 0);'
```

Expected: `dangling citations: 0`. A dangling citation is a claim with no evidence behind it, which Global Constraint 2 forbids.

---

### Task 12: Corpus README and independent verification

**Files:**

- Create: `docs/ui-references/README.md`

**Interfaces:**

- Consumes: the whole tree.
- Produces: the entry point an agent reads first, plus a verification verdict table.

- [ ] **Step 1: Write `docs/ui-references/README.md`**

Must state: what this corpus is and is not; the ranking and what tier each site got and why; **how an agent should traverse it** (read `<slug>/index.json` first, pick artifacts by the `describes` field, open only those, never glob the tree); which files are measurements versus prose; that `native`- and `live`-pass artifacts must never be compared to each other; how to re-run recon and capture; and an explicit statement that the corpus exists to build original work to a comparable standard, not to copy any reference site's assets, copy, or code.

- [ ] **Step 2: Run an independent verification pass**

This must be done by an agent that **did not produce the artifacts** — it is the `capture-verifier` skill's job. It opens a sample of screenshots and says what is actually in them, re-measures a sample of numbers against the live sites, cross-checks the two passes, and issues CONFIRMED / PLAUSIBLE / REJECTED / UNTRACEABLE per claim.

Minimum sample: two screenshots per site (one section shot, one scroll frame), every site's top-three colors by `largestAreaPx2`, every site's claimed primary font family, and every tier-1 site's transition timing claim.

- [ ] **Step 3: Record the verdicts and fix or retract**

Append a verdict table to `docs/ui-references/README.md`. Anything `REJECTED` is either re-captured or the claim is removed from `notes.md` and `tech-stack.md`. Anything `UNTRACEABLE` gets an evidence path added or is removed. A corpus with an unresolved `REJECTED` verdict does not satisfy the definition of done.

- [ ] **Step 4: Confirm nothing was committed**

```bash
cd /Users/mj/repos/mccor-labs && git status --short | head -30 && echo "---" && git log --oneline -1
```

Expected: `docs/ui-references/` and `scripts/` appear as **untracked**, and `git log` still shows `0edb728 docs(mail): document testing under the SES sandbox` as HEAD. Any new commit violates Global Constraint 3.

---

## Self-Review

**Spec coverage.** Two-script architecture → Tasks 2 and 4. Tier definitions → Task 3 `TIERS`. No-download constraint → Task 9 Step 3 assertion plus Task 10 Step 5 extension audit. Two passes and teardown order → Task 4 Step 1. Capture matrix → Tasks 4, 6, 7. Scroll actuation → Task 6 Step 1. Transitions → Task 8 Step 1. Signature effects → Task 8 Step 2. All fourteen extraction keys → Task 5 (motion, typography, colors, CORS refetch written in full; `customProperties`, `spacing`, `breakpoints`, `fontFaces`, `observersDeclared`, `revealsObserved`, `scrollLinked`, `domOutline`, `libraries` are named in the Task 5 interface block and verified by Task 10 Step 4's empty-extract check). Network inventory → Task 9. Determinism list → Task 4 Step 2. Output tree and flat index → Task 4 Step 3. Tech-stack deliverables → Task 11. Definition of done items 1–8 → Tasks 10 Step 4, 10 Step 5, 11 Step 4, 12 Steps 2–4. No gaps found.

**Placeholder scan.** The only deliberately unfilled content is `SITES` in Task 3 Step 2, which cannot be written before Task 2 runs — Task 3 Step 1 specifies exactly how to fill it and Step 3 verifies every value against the live sites. `capturePass` in Task 4 Step 4 is a named stub whose body Tasks 5–9 supply, and its fixed internal order is stated in the same step. No "TBD", no "add error handling", no "similar to Task N".

**Type consistency.** `index.add({path, kind, pass, viewport, route, describes, extra})` is used with that signature in Tasks 4, 6, 7, 8, 9. `tierOf`/`routesFor`/`viewportsFor` are defined in Task 3 and consumed in Tasks 4, 6, 8. `settle` is defined in Task 4 Step 2 and used in Tasks 6 and 8. `warnings[]` entries carry `{code, message?, affects?}` everywhere. `downloaded: false` appears on every asset record shape in Task 9.

**Review Focus coverage.** All five listed conditions have a pinned test: #1 Task 4 Step 6, #2 Task 2 Steps 3 and 7, #3 Task 4 Step 2 with the extension audit at Task 10 Step 5, #4 Task 4 Step 4 with the `du`/`df` check at Task 10 Step 3, #5 Task 2 Steps 4 and 7. The sixth (`blob:` video) is pinned to Task 8 Step 2.
