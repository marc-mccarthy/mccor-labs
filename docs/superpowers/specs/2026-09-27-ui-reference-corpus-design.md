# UI Reference Corpus — Design Spec

**Date:** 2026-09-27
**Status:** approved for implementation
**Owner:** Marc McCarthy

## Problem

We want to build a website whose visual and motion quality matches ten reference sites. An agent
asked to "make it like david-hckh.com" currently has nothing to work from but its own impressions of
a URL it cannot browse. Impressions produce "generous spacing" and "smooth easing". Building
something that actually matches requires `--spacing-big: 150px` and
`cubic-bezier(0.19, 1, 0.22, 1)`.

This spec defines a measured, on-disk corpus — screenshots, motion samples, and extracted design
tokens — such that an agent reading only the corpus, never having opened any of the sites, can write
an exact UI and motion specification and then implement against it.

## Reference sites

Ranked by owner preference, highest first. Rank drives capture depth.

| #   | slug            | origin                        | tier |
| --- | --------------- | ----------------------------- | ---- |
| 1   | `david-hckh`    | `https://david-hckh.com`      | 1    |
| 2   | `pacomepertant` | `https://pacomepertant.com`   | 1    |
| 3   | `topology-vc`   | `https://www.topology.vc`     | 1    |
| 4   | `belenjones`    | `https://www.belenjones.com`  | 1    |
| 5   | `squadeasy`     | `https://www.squadeasy.com`   | 2    |
| 6   | `y-n10`         | `https://y-n10.com`           | 2    |
| 7   | `shopify`       | `https://www.shopify.com`     | 2    |
| 8   | `raggededge`    | `https://raggededge.com`      | 3    |
| 9   | `guglieri`      | `https://guglieri.com`        | 3    |
| 10  | `helloshivam`   | `https://www.helloshivam.com` | 3    |

### Tier definitions

**Tier 1 — full matrix.** All four viewports. Home route plus up to three discovered internal routes.
Both `native` and `live` passes. Scroll-frame sequences, hover/focus/nav state shots with
computed-style deltas, page-transition capture with rAF style sampling, signature-effect capture,
scroll-session `webm`, per-transition `webm`. Full extraction on every `(route, viewport)`.

**Tier 2 — medium.** `desktop` and `mobile` viewports only. Home plus up to two discovered routes.
Both passes. Scroll frames, hover/focus/nav states with deltas, one scroll-session `webm` on the home
route. No page-transition capture. Full extraction on every `(route, viewport)`.

**Tier 3 — extraction-first.** `desktop` and `mobile`. Home route only. Both passes. Full-page and
above-fold shots, per-section shots, one scroll-frame sequence, one scroll-session `webm`. Full
extraction. No state deltas, no transitions, no signature-effect capture.

## Non-negotiable constraints

1. **No third-party binary is written to disk.** No reference site's image, video, webfont, or script
   file is ever downloaded. They are catalogued by URL, intrinsic dimensions, rendered rect, byte
   size, and license risk, with `downloaded: false` set explicitly on every asset entry. Our own
   screenshots, our own recorded video of our own browser session, and our own measurement JSON are
   the only binaries created.
2. **A number not measured in the run that wrote it does not appear in a file.** Every artifact
   states what was verified. What was not measured is marked as not measured, never inferred.
3. **Nothing is committed, staged, or pushed** by any script or any agent executing this plan.
4. **Every browser and outbound-fetch step runs with `dangerouslyDisableSandbox: true`.** The Bash
   sandbox denies Chromium's Mach port lookup and its `listen()` call, and the resulting errors never
   name the sandbox — they surface as `bootstrap_check_in ... Permission denied (1100)` or a bare
   launch timeout.
5. **Disk ceiling: 12GB for the whole corpus.** The volume has 48GiB free at 89% capacity. The
   capture script aborts with a clear error rather than filling the disk.
6. **Citations are by symbol, not line number.** Notes reference function, resource, and selector
   names.

## Repository integration

The repo is Terraform plus vanilla JS with no root `package.json`, no `scripts/`, and no lockfile.
This spec introduces the minimum npm surface that can run Playwright:

- Root `package.json` declaring `@playwright/test` as the single `devDependency`, `"private": true`,
  and `"type": "module"`. No other dependency is added.
- `node_modules/` and `pnpm-lock.yaml` are added to `.gitignore`.
- Scripts live at top-level `scripts/`, are plain `.mjs`, run by bare `node`, use `node:`-prefixed
  builtins only, resolve the repo root as `resolve(import.meta.dirname, "..")`, parse flags with
  `process.argv.includes("--flag")`, and open with a JSDoc header stating requirements, the literal
  invocations with inline comments, and known failure modes. This matches the conventions the
  existing `app/api/index.mjs` and `infra/deploy.sh` set: no bundler, no transpile, no framework.

### The import that must not be "fixed"

```js
import { chromium, devices } from '@playwright/test'
```

Importing from `playwright` returns `MODULE_NOT_FOUND` under a strict `node_modules` layout;
`playwright` and `playwright-core` are unhoisted transitive packages. `@playwright/test` is the real
top-level devDependency and re-exports the full library API. Using the library API also means no
`playwright.config.ts` is consulted, so no `webServer` block runs. Both scripts state this in their
JSDoc header.

## Two-script architecture

Recon and capture are separate programs because they answer different questions and have different
failure modes.

### `scripts/recon-reference-sites.mjs`

Answers: _what are the sections on this site, what should they be called, what routes exist, and what
libraries is it running?_ Emits JSON only — no images. Cheap, fast, re-runnable.

Rationale for a script over interactive browser-tool recon: interactive recon across ten sites is
roughly 120 snapshot round-trips, and the shared browser-automation server exposes a single browser,
so parallel recon agents contend for one tab. A script produces the same facts deterministically at
negligible context cost.

Per site it writes `docs/ui-references/_recon/<slug>.json` containing:

- `candidateSections[]` — for each plausible section element (`section`, `[data-scroll-section]`,
  `main > div`, `[id]` landmarks): DOM index, tag, `id`, class list, generated unique CSS selector,
  bounding rect, first heading text, resolved background color, whether it contains `video`/`canvas`.
  The first heading and class list are what let a human or agent assign a durable slug.
- `discoveredRoutes[]` — same-origin `href`s from nav and footer, deduplicated, normalized absolute,
  with the anchor text and whether the link sits inside the primary nav.
- `windowGlobals` — presence and, where readable, version of each of: `Lenis`, `locomotiveScroll`,
  `LocomotiveScroll`, `__lenis`, `__loco`, `barba`, `gsap`, `ScrollTrigger`, `Swiper`, `pJSDom`,
  `particlesJS`, `THREE`, `Typed`, `SplitType`, `React`, `Vue`, `__NEXT_DATA__`, `__NUXT__`,
  `Shopify`, `jQuery`, `wp`, `webpackChunk*`.
- `candidateSelectors` — best guesses for primary CTA, nav toggle, representative card, and the
  element carrying the signature visual effect, each with the heuristic that matched it so a human can
  judge the guess.
- `stylesheets[]` — every `href`, whether `cssRules` is readable or throws `SecurityError`, and rule
  count where readable. This predicts which sites need the CORS refetch path.
- `meta` — `<title>`, `generator` meta, `<html lang>`, viewport meta, response status, final URL after
  redirects.

The recon output is reviewed by a human or agent, which assigns a stable slug to each section. Those
slugs are transcribed into the capture script's `SITES` const. That const is the durable record of
what was captured and why those routes.

### `scripts/capture-reference-site.mjs`

Answers everything else. Driven by a `SITES` const at the top holding, per site: origin, tier,
routes, section slug → selector map, the four key selectors, signature-effect kind, and any
per-site quirks discovered in recon.

## Capture matrix

Viewports. These are the starting set; they are re-picked per site against the real breakpoint bands
once that site's `breakpoints` extraction reports where they are.

| name      | size      | dpr |
| --------- | --------- | --- |
| `wide`    | 1600×1000 | 2   |
| `desktop` | 1440×900  | 2   |
| `tablet`  | 834×1112  | 2   |
| `mobile`  | 390×844   | 3   |

Context options are fixed for every capture so runs are comparable: `locale: "en-US"`,
`timezoneId: "America/Chicago"`, `colorScheme: "light"`, `reducedMotion: "no-preference"`, and a
`userAgent` override to a headful Chrome string — headless Chromium advertises `HeadlessChrome` and
bot protection notices.

| artifact                                           | viewports                                         | format             |
| -------------------------------------------------- | ------------------------------------------------- | ------------------ |
| `shots/fullpage.<vp>.png`                          | desktop, mobile                                   | PNG                |
| `shots/abovefold.<vp>.png`                         | all tier viewports                                | PNG                |
| `sections/NN-<slug>.<vp>.png`                      | desktop, mobile                                   | PNG                |
| `shots/reduced-motion.desktop.png`                 | desktop, home route only                          | PNG                |
| `scroll/NN-y<measured>.<vp>.jpg`                   | 16 desktop / 10 mobile home, 10 desktop elsewhere | JPEG q82           |
| `states/{hover,focus,nav-open,nav-scrolled}-*.png` | desktop, mobile (tier 1–2)                        | PNG                |
| `video/scroll-session.<vp>.webm`                   | desktop, home route                               | WebM               |
| `transitions/NN-<from>-to-<to>/`                   | desktop (tier 1)                                  | JPEG + JSON + WebM |

Every static shot passes `animations: "disabled"` to `page.screenshot`, which fast-forwards CSS
animations to their end state and holds them there. This is free determinism and is not optional.

The `reduced-motion` row is required. A reference site whose scroll reveals never fire under
`prefers-reduced-motion` leaves whole sections blank, and that only surfaces in a reduced-motion pass.

## Two passes per route

This is the load-bearing decision of the whole design.

A site running Locomotive Scroll sets `html.has-scroll-smooth { overflow: hidden }` and translates
`[data-scroll-container]`. Under that, `fullPage: true` returns a viewport-height image, element
rects are wrong, and `window.scrollTo` moves nothing. But tearing smooth scroll down to fix that also
destroys the parallax and reveal machinery we came to measure. So each route is captured twice, and
every artifact records `"pass": "native" | "live"` so a spec writer never compares across passes and
concludes the site changed mid-run.

### `native` pass — teardown order is fixed

1. `window.__lenis?.destroy(); window.__loco?.destroy();`
2. Remove `has-scroll-smooth`, `has-scroll-init`, `has-scroll-dragging` from `documentElement`.
3. Clear `transform`, `height`, `position` on `[data-scroll-container]`.
4. Force `overflow: auto !important; height: auto !important` on `html` and `body`.
5. Assert `document.documentElement.scrollHeight > innerHeight * 1.2`. If false, write
   `SMOOTH_SCROLL_TEARDOWN_FAILED` to `warnings` and **skip the full-page screenshot** rather than
   emit a viewport-height image labelled `fullpage`.

Steps 3 and 4 are not optional: Locomotive's `destroy()` removes listeners but leaves the container's
final transform and the `html` class in place.

Reaching the library instances requires an `addInitScript` that installs a `defineProperty` setter
wrapping each constructor as the library assigns its global. A plain wrap at init time has nothing to
wrap yet. If a library is bundled as an ES module with no global, this captures nothing; that case is
detected and falls through to the DOM-level teardown, which works regardless of how the library was
bundled.

Produces: full-page, above-fold, per-section, hover/focus/nav-open shots, and all geometry.
Byte-stable across runs.

### `live` pass — everything intact

Produces scroll-frame sequences, parallax samples, reveal observations, and the scroll-session video.
Not byte-stable, so each frame's filename carries its **measured** scroll position, never the
requested one.

## Scroll actuation

Frames use computed targets, not fixed intervals. `travel = docHeight - innerHeight`, and target
`y_i = round(i * travel / (N - 1))`.

Actuate with `page.mouse.wheel(0, delta)`. This dispatches a trusted wheel event, which smooth-scroll
libraries consume; they ignore programmatic `scrollTo`. Poll the library's own reported position each
iteration. Settle on three consecutive identical samples 100ms apart, capped at 5s — never a bare
`waitForTimeout`. Then assert `measuredY` moved more than 50px from the previous frame; if it did not,
escalate the delta, and failing that abort the route with a warning rather than emit 16 copies of the
hero.

## Page transitions (tier 1 only)

Barba-style libraries intercept anchor clicks and swap `[data-barba="container"]`. No navigation event
fires, so `waitForNavigation` hangs, and a screenshot loop is far too coarse to measure a 1.2s
transition.

Install hooks via `page.evaluate` first — `before`/`leave`/`enter`/`after` writing timestamps to
`window.__t` — then click, then
`page.waitForFunction(() => window.__t.after !== undefined, { timeout: 15000 })`.

Capture two ways:

- **CDP screencast.** `Page.startScreencast({ format: "jpeg", quality: 80, everyNthFrame: 1 })`, and
  acknowledge every frame with `Page.screencastFrameAck({ sessionId })` or the stream stalls after a
  handful of frames. That omission is the standard failure of this technique. Expect 40–70 frames;
  assert more than 20. Written as `f000-t0000.jpg` where `t` is ms since the click.
- **A `requestAnimationFrame` style sampler** recording
  `{t, containerOpacity, containerTransform, overlayOpacity, overlayTransform, scrollY, barbaPhase}`
  per tick into `styles.json`. **This is the more useful artifact.** It yields "the leave overlay
  reaches opacity 1 at 420ms, holds 180ms, and the enter container's translateY goes 40px → 0 between
  600ms and 1180ms", which is what a spec is written from. The JPEGs corroborate; the numbers measure.

Four transitions per tier-1 site, each in a fresh `browser.newContext()` — Barba caches fetched pages
in memory, so a second traversal from an already-visited page is measurably faster and not comparable
to a cold one. `recordVideo` runs on these contexts and on the home-route live pass only. Video is
never recorded on static route captures: it multiplies runtime and produces nothing citable.

Every route is reached with `page.goto(absoluteUrl)`, never by clicking — except inside these four
transition captures. A click-driven traversal leaves the page in a swapped state whose DOM differs
from a cold load.

## Signature effects (tier 1–2)

**Background video.** Never downloaded. Per `<video>` element record `currentSrc`, `poster`, rendered
rect, `object-fit`, `playsinline`/`muted`/`loop`, and the parent's `mix-blend-mode`, `filter`, and
overlay gradient. Then pause, set `currentTime = 1.0`, await `seeked`, and `locator.screenshot()` the
element; repeat at `3.0`. Two frames per video captures the tonal range with zero copied bytes.

Autoplay is neutralised _before_ load by an `addInitScript` overriding `HTMLMediaElement.prototype.play`
to a resolved no-op. A video that has already played four seconds holds a different decoded frame than
one seeked from cold, which makes the artifact non-reproducible.

**Canvas particle fields.** The authoritative artifact is the config, not a picture.
`window.pJSDom[0].pJS` holds the entire live configuration tree: `particles.number.value` and
`.density`, `.color.value`, `.shape.type`, `.opacity.value` and its `anim` block, `.size.value` and
`anim`, `.line_linked.{enable,distance,color,opacity,width}`,
`.move.{speed,direction,random,straight,out_mode,bounce}`, and the whole `interactivity.events` block
including `modes.grab.distance` and `modes.repulse.distance`. Serialised with a JSON-safe deep clone
that strips functions and canvas/context references. That one file makes the effect reimplementable
exactly; no quantity of screenshots would.

Screenshots corroborate: seed `Math.random` with a fixed-seed mulberry32 and virtualise `rAF` plus
`performance.now()` behind a `window.__tick(n)` drain so frames are reproducible to the pixel. **Enable
the virtual clock only on the site that needs it** — freezing `rAF` on a site running Lenis or
Locomotive deadlocks its scroll loops entirely. It is wrapped; on failure it falls back to wall-clock
frames plus a `PARTICLE_CLOCK_FALLBACK` warning.

**Typewriter effects.** Eight frames at 500ms intervals plus a `typewriter.json` holding the string
list, the instance's speeds where reachable, and — always available — the computed `animation`
shorthand on the cursor element, which is the blink rate and reads straight out of
`getComputedStyle`.

## Extraction

Per `(route, viewport)`, write `extract.<viewport>.json`; merged per site into `design-system.json`.

- **`customProperties`** — both `declared` (walk `cssRules` for `:root`/`html`/`body` rules and keep
  every `--*` declaration; this shows authoring intent and may itself be a `var()`) and `resolved`
  (`getComputedStyle(documentElement).getPropertyValue(name)`, the number to copy). Both matter and
  both are kept.
- **`typography`** — per role sample: family, resolved family, weight, px and rem size, line-height in
  px and as a ratio, letter-spacing in px and em, transform, color, margins, `maxWidth`, rendered
  width, and `measureCh` computed properly via canvas `ctx.measureText("0").width` against the
  computed font shorthand. The `width / (size * 0.5)` approximation is wrong by 15–20% on a condensed
  face, and typographic measure is a first-class spec number.
- **`fontFaces`** — family, weight, style, and `unicodeRange` from `document.fonts`, cross-joined with
  `src` parsed from `CSSFontFaceRule`s, because `FontFaceSet` does not reliably expose `src`. Any
  non-open-license host is flagged `licensedThirdParty: true`.
- **`colors`** — walk every element for `color`, `background-color`, the four border colors,
  `outline-color`, `fill`, and `stroke`. Normalise to uppercase hex, handling `rgb()`, `rgba()`,
  `oklch()`, and `color(srgb …)`. Track frequency **and `largestAreaPx2`**: frequency alone ranks a
  1px border above the page background. Include gradients and computed WCAG `contrastPairs`.
- **`spacing`** — section padding clusters, container max-width and padding, grid gaps, border radii,
  and an `inferredScale` with its unit and steps.
- **`motion`** — `transitionProperty`/`Duration`/`TimingFunction`/`Delay` are parallel comma-lists;
  zip them, never assume a single entry. Skip `all 0s`. Group by
  `(property, duration, timing, delay)` fingerprint with a representative selector and
  `instanceCount` — a raw per-element dump on a Shopify page is tens of thousands of useless entries.
  Resolve `animationName` against `CSSKeyframesRule`s and serialise each keyframe's declarations; the
  keyframes are the actual motion definition and are otherwise invisible.
- **`observersDeclared`** — there is no API to enumerate existing `IntersectionObserver`s, so patch the
  constructor in an `addInitScript`, which runs before the site's own scripts. A `page.evaluate` after
  load is too late.
- **`revealsObserved`** — required, because Locomotive does not use `IntersectionObserver`. It computes
  in-view state in its own `rAF` loop, so the constructor patch sees nothing for it. Run an empirical
  `MutationObserver` on `attributes: ["class", "style"]` during the `live` pass, recording each class
  flip with the scroll position, the element's `getBoundingClientRect().top`, and the derived
  `viewportFraction`. "Reveals fire when the element's top crosses 79% of viewport height" is exactly
  the parameter a reveal component's `viewport.margin` prop encodes. Both detectors run always.
- **`scrollLinked`** — sample computed `transform` matrices at each live-pass frame, then least-squares
  fit translateY against scrollY in Node. `r² > 0.99` means true linear parallax at that ratio; a poor
  fit means it is eased or clamped, and the spec should say so rather than assert a ratio.
- **`breakpoints`** — recursively walk `cssRules` for `CSSMediaRule`s, which nest inside
  `CSSSupportsRule` and `@layer`. Normalise em/rem to px and tally with rule counts. Values carrying
  hundreds of rules are real breakpoints; singletons are one-off patches.
- **`libraries`** — merge three sources and record `detectedVia` for each: runtime globals, `?ver=`
  query params on enqueued scripts (WordPress and Divi append exact plugin versions to every enqueued
  script, which is free version data), and URL path segments.
- **`domOutline`** — the structural spine: index, slug, selector, rect, first heading, resolved
  background, whether it contains video or canvas, and padding box. This is what lets a spec writer
  say "seven sections, hero 980px, then five at 150px top and bottom padding" without opening a single
  image.

### Cross-origin stylesheets

Accessing `.cssRules` on a cross-origin sheet throws `SecurityError`. Shopify's CDN, Google Fonts, and
Cloudflare-fronted assets all will. Catch per sheet, push `{code: "STYLESHEET_CORS", href}` to
`warnings`, then refetch each `href` with `page.request.get()` — which reuses the context's cookies and
is not subject to the CSSOM same-origin rule — and parse the text in Node for `@media` conditions,
`@font-face`, `@keyframes`, and `:root` custom properties. Merge with `"source": "refetched"`. Without
this guard most of the font and breakpoint data on a Shopify-class site is silently lost.

## Network inventory

`recordHar: { path: ..., content: "omit", mode: "full" }` gives the full waterfall with headers, sizes,
and timings and **no response bodies**. That single flag keeps the HAR at hundreds of KB and guarantees
no copyrighted binary lands on disk.

Listeners attach to the **context**, not the page, so subframe requests — Vimeo and YouTube iframes —
are captured. `page.on("console")` and `page.on("pageerror")` write `network/console.json`; a reference
site throwing errors tells us which of its libraries is fragile before we adopt it.

Post-process into `assets.json` grouped by fonts / video / images / scripts, joining the network log to
a `page.evaluate` over `img`, `video`, and `source` for `naturalWidth`, `currentSrc`, `srcset`, and
`sizes`. That join is the entire point: it turns "a 184KB jpeg was requested" into "product
photography, 3:2, served at 2× the rendered box, lazy, art-directed at four widths with a 50vw/100vw
sizes rule". For script versions, read the response body transiently in memory and regex for a version
string; store only the string, never the body. Cap at 2MB and wrap in try/catch, because
`response.text()` throws for a body already discarded, and an unguarded throw kills the listener and
loses the remainder of the log.

## Determinism requirements

- `await page.evaluate(() => document.fonts.ready)` before every screenshot. FOUT changes every metric
  on the page and is the single most common reason two runs disagree.
- Sweep top-to-bottom in `innerHeight * 0.8` steps to trigger lazy images, return to 0, then poll
  `[...document.images].every(i => i.complete && i.naturalWidth > 0)` with a 10s cap and list any
  stragglers.
- **Order per route is fixed: load → settle → extract motion JSON → inject freeze stylesheet →
  screenshot.** Injecting the freeze first makes the extract faithfully report every transition as
  `0s`. This order is encoded in a single `capturePass()` function so it cannot drift between call
  sites.
- Overlay guard: pre-seed the localStorage keys that suppress modals, sweep known close buttons, then
  **assert** — any `position: fixed` element with `z-index > 1000` covering more than 25% of the
  viewport writes `VIEWPORT_OBSTRUCTED` with its selector into `warnings[].affects`. A contaminated
  screenshot that is labelled contaminated is recoverable; one that is not produces a spec written
  from a picture of a cookie banner.
- `goto(url, { waitUntil: "load", timeout: 45000 })`, then
  `waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {})`. Networkidle is a hint, never a
  gate: Vimeo and GTM poll forever and it will never fire.
- If `scrollHeight * dpr > 16384`, do not use `fullPage` — Chromium's maximum texture height truncates
  the image silently. Capture overlapping 8000px `clip` bands instead and record `"banded": true` with
  the offsets.
- Write into a stable per-site directory overwritten in place. `--clean` removes it first. The run
  directory is never timestamped by default, or re-runs grow without bound.

## Output tree

```
docs/ui-references/
  README.md                      # how an agent should use this tree
  STACK-COMPARISON.md            # cross-site synthesis + recommended stack
  stacks.json                    # merged machine-readable stack data
  _recon/<slug>.json             # recon output, one per site
  <slug>/
    index.json                   # flat artifact index — the entry point
    notes.md                     # prose observations, every claim traceable
    tech-stack.md                # frameworks, libs, versions, fonts, hosting, CDN, CMS
    design-system.json           # merged extraction across viewports
    extract.<vp>.json            # per-viewport extraction
    shots/                       # fullpage, abovefold, reduced-motion
    sections/                    # NN-<slug>.<vp>.png
    scroll/                      # NN-y<measured>.<vp>.jpg
    states/                      # state shots + deltas.json
    video/                       # scroll-session.<vp>.webm
    transitions/                 # tier 1 only
    effects/                     # video frames, particles.json, typewriter.json
    network/                     # session.har, console.json, assets.json
```

`index.json` is **flat, not nested**. Each `artifacts[]` entry carries `path`, `kind`, `pass`,
`viewport`, `route`, `sha256`, and a plain-English `describes` field. The `describes` field is what
makes the tree usable by an agent with no other context: it reads the index, picks the twelve relevant
artifacts, and opens only those. `warnings[]` entries carry `affects[]` naming the exact suspect paths.

## Tech-stack deliverables

**Per site, `tech-stack.md`** stating, with the detection evidence for each claim: rendering framework
and version, CMS or site builder, animation and scroll libraries with versions, font stack and
foundry/host, hosting and CDN inferred from response headers, analytics and tag managers, build
tooling signature, notable third-party embeds, and an explicit "not detected / could not determine"
section. A claim with no evidence line is not written down.

**Top-level `STACK-COMPARISON.md`** — a matrix of all ten sites against the axes above, what the
top-ranked sites have in common that the lower-ranked ones do not, which choices are load-bearing for
the qualities the owner ranked highly versus incidental, and a concrete recommended stack for the site
we are building, with the tradeoff for each choice named.

**`stacks.json`** — the same data machine-readably, so an agent can filter without parsing prose.

## Definition of done

1. Both scripts exist, run to completion by bare `node`, and have JSDoc headers documenting
   requirements, literal invocations, and known failure modes.
2. All ten sites have a populated directory with a valid flat `index.json` whose every `path` resolves
   to a file on disk and whose every `sha256` matches that file's actual digest.
3. Every site's `design-system.json` carries non-empty `colors`, `typography`, `spacing`, and
   `motion`. A site where extraction genuinely failed carries a warning naming why, not silence.
4. No third-party binary exists anywhere under `docs/ui-references/`, verified by checking that every
   `assets.json` entry has `downloaded: false` and that no file extension under the tree is outside
   the set we create.
5. Total tree size is under 12GB.
6. `STACK-COMPARISON.md`, `stacks.json`, and all ten `tech-stack.md` files exist, and every claim in
   them carries an evidence line.
7. An independent verification pass — one that did not produce the artifacts — opens a sample of
   screenshots, confirms they show what their `describes` field claims, re-measures a sample of numbers
   against the live sites, and issues per-claim verdicts.
8. Nothing has been committed, staged, or pushed.

## Out of scope

- Implementing the website itself. This corpus is input to that work, not part of it.
- Any design direction or aesthetic synthesis beyond the stack comparison. That is a separate job for
  the `design-director` skill, which consumes this corpus.
- Cloning, reusing, or redistributing any reference site's assets, copy, or code. The corpus records
  measurements for the purpose of building original work to a comparable standard.
