# UI Reference Corpus — Implementation Plan v2 (Tasks 3–12)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Supersedes** Tasks 3–12 of `2026-09-27-ui-reference-corpus.md`. Tasks 1–2 are complete and
unchanged. v1 assumed ten conventional scrolling websites. Measurement proved that false, and this
revision is written against what was observed rather than what was assumed.

**Goal:** Unchanged. Capture ten reference websites into `docs/ui-references/<slug>/` as a measured
screenshot, motion and design-token corpus an agent can build from without ever opening the sites.

**Architecture:** Three site archetypes, not one. A single capture path cannot serve a scrolling DOM
page, a content-swapping SPA with no routes, and an orbit-navigable WebGL scene. The orchestrator
branches on `archetype` and each branch produces the same artifact vocabulary, so downstream
consumers stay uniform.

**Spec:** `docs/superpowers/specs/2026-09-27-ui-reference-corpus-design.md` — still binding, except
where a measured finding below contradicts it. Measurement wins over spec; the spec was written from
assumption.

## Measured findings this plan is built on

These files are INPUTS. Do not re-derive them; read them.

| file                                                                     | what it carries                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `.superpowers/sdd/2026-09-27-ui-reference-corpus/gate-inventory.md`      | which sites gate, how, and that no gate can be pre-seeded                       |
| `.superpowers/sdd/2026-09-27-ui-reference-corpus/interaction-model.md`   | what is clickable per site, recorded from the owner's real clicks; hover deltas |
| `.superpowers/sdd/2026-09-27-ui-reference-corpus/hover-deltas.json`      | raw computed-style hover diffs                                                  |
| `.superpowers/sdd/2026-09-27-ui-reference-corpus/deepdive-hard-sites.md` | per-site DOM archaeology                                                        |
| `.superpowers/sdd/2026-09-27-ui-reference-corpus/visual-confirm.md`      | pixel-verified claims, incl. three refutations                                  |
| `.superpowers/sdd/2026-09-27-ui-reference-corpus/progress.md`            | 22 controller rulings with cost-if-wrong                                        |

## The three archetypes

| archetype             | sites                                                             | "section" means                        | scroll                  | capture path                              |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------- | ----------------------- | ----------------------------------------- |
| **A — scrolling DOM** | david-hckh, squadeasy, shopify, raggededge, guglieri, helloshivam | a DOM element                          | real, `window.scrollTo` | sections + scroll frames + states         |
| **B — in-place swap** | topology-vc                                                       | a nav state                            | none (fixed 817px)      | one full capture per nav item             |
| **C — canvas scene**  | pacomepertant (`/`), y-n10, belenjones                            | an interaction state or orbit position | none or canvas-internal | entry + state matrix, viewport shots only |

Sites can be **hybrid**: pacomepertant is archetype C on `/` and archetype A on `/projects/*`.
`SITES` therefore carries `archetype` per ROUTE, not per site.

## Global Constraints

- **Never write to git.** `git add` (any form), `commit`, `push`, `stash`, `checkout`, `clean` are
  forbidden. Read-only `status`/`diff`/`log` only. A third party works in this tree and has already
  committed once during this plan's execution.
- **The Bash sandbox is now DISABLED session-wide.** `dangerouslyDisableSandbox` is no longer needed
  and should not be passed. (v1 briefs said otherwise; they were written before this changed.)
- **Download nothing.** Our screenshots, our video of our own session, our JSON. Every `assets.json`
  entry sets `downloaded: false`.
- **A number not measured in the run that wrote it does not go in a file.**
- **Any page height measured with a consent banner present is suspect** (Ruling 21). raggededge read
  17821px with its banner up and 11770px after dismissal. Dismiss, then measure.
- **Disk ceiling 12GB.**
- `@playwright/test` pinned EXACTLY `1.61.0`; never run `pnpm add`/`update`/`playwright install`.
- Import `from "@playwright/test"`, never `from "playwright"`.
- Scripts: plain `.mjs`, bare `node`, `node:` builtins, `resolve(import.meta.dirname, "..")`,
  `process.argv.includes("--flag")`, JSDoc header with requirements + invocations + failure modes.

## Review Focus

Failure modes the measurements revealed, each pinned to a task.

1. **A blank PNG that looks like a successful capture.** The corpus's defining failure. Every section
   shot asserts `count === 1` and a non-degenerate `boundingBox` first, and SKIPS with a warning
   otherwise. — Task 5.
2. **Motion recorded as `0s` on a JS-animated site.** guglieri reports `transition: all 0s ease` while
   visibly animating (Framer Motion springs). A CSS-only extractor is silently wrong about every
   animation there. — Task 7.
3. **A gate click that navigates away instead of entering.** "Enter" matches inside "Enterprise".
   Anchored matching plus a same-URL assertion; navigate back and warn if the URL moved. — Task 4.
4. **Heights measured through a consent banner.** — Task 4.
5. **Per-word split headings counted as separate headings.** guglieri renders one sentence as six
   elements for stagger. Typography extraction must reassemble or report six headings where there is
   one. — Task 7.
6. **A scroll loop chasing an unbounded page.** y-n10 grows `scrollHeight` as you scroll (22592 →
   316288 observed). Travel is computed ONCE and frames assert real movement. — Task 6.

---

### Task 3: `sites.mjs` — the measured site record

**Files:** Create `scripts/lib/sites.mjs`; create `scripts/verify-site-selectors.mjs`.

**Interfaces produced:** `VIEWPORTS`, `TIERS`, `SITES`, `viewportsFor(site)`, `routesFor(site)`,
`tierOf(site)`, `archetypeOf(route)`.

- [ ] **Step 1: Transcribe from the findings files, not from fresh guessing**

Read `interaction-model.md` and `gate-inventory.md`. Every selector in them was hit by a real human
click or verified against a live `querySelectorAll(...).length`. Prefer them over anything else.

Record shape — note `archetype`, `entry` and `quirks` are per ROUTE:

```js
{
  slug: "pacomepertant",
  origin: "https://pacomepertant.com",
  tier: 1,
  smoothScroll: "lenis",
  routes: [
    { name: "home", url: "https://pacomepertant.com/", archetype: "C",
      entry: { kind: "button", match: "enter with sound", exact: false,
               note: "button text is doubled in the DOM; substring match required" },
      states: [ { slug: "spiral", action: null },
                { slug: "list",   action: { click: 'span:text-is("list")' } },
                { slug: "menu-open", action: { click: '[class*="menu"]' } } ] },
    { name: "project-jupiter", url: "https://pacomepertant.com/projects/jupiter",
      archetype: "A", entry: null,
      sections: { hero: "…", body: "…" } },
  ],
  selectors: { primaryCta: null, navToggle: null, card: null, signatureEffect: "canvas" },
  effects: { video: true, particles: false, typewriter: false, webgl: true },
  quirks: { consentBanner: null, jsDrivenMotion: false, splitHeadings: false },
}
```

Required per-site facts already measured — use them verbatim:

- **pacomepertant**: gated, `enter with sound` / `enter without sound`, substring match (exact fails,
  text is doubled). No storage persistence. `/` is archetype C, `scrollHeight` 900 before AND after
  (it is a 3D orbit scene, not a tall page). `/projects/jupiter` is archetype A, 2868px, has video.
- **y-n10**: gated. Gate is `div.button.hov` (textContent "Enter", `text-indent:-99999px`,
  `pointer-events:none`). **Measure its rect from the selector, then `page.mouse.click()` at the
  centre** — `locator.click()` fails actionability. Post-entry `scrollHeight` 22592 and
  `window.scrollTo` becomes the driver (pre-entry it is `#main.scrollTop`). Nav `#navi li[data-id]`.
- **belenjones**: not gated, but the **canvas is the button**; the project name
  (`div.landing__NavigationButton-*`) is inert. Overlay chrome
  `button.landing__OverlayButton-sc-803efe7c-34` = `/RETURN`, `NEXT`. `bodyText` is frozen at 437 and
  is NOT a usable state signal here; `visibleEls` moved 39→49.
- **topology-vc**: archetype B. No routes, `scrollHeight` fixed 817, URL never changes. Nav
  `a.link-hover.js-desktop-nav-link` (ABOUT / PRINCIPLES / TEAM / PUBLIC GOODS / CAREERS).
  `canvas#webgl` at z-index −1.
- **david-hckh**: archetype A, 5865px. Header items are BUTTONS
  (`button.header-link.header-home-link.children-unclickable`), scroll-to not navigate. Cards
  `a.preview-card.children-unclickable[href^="/project/"]`, 447×308, 2-up from absolute y≈3536.
  Routes `/project/{cubewar,quibbo,sharkie,particles,pokedex}`.
- **guglieri**: archetype A. `quirks.jsDrivenMotion = true`, `quirks.splitHeadings = true`.
  `/feed` is 21940–26132px (measure at capture time). Durable basis is `data-framer-name`; note
  `[data-framer-name="Desktop"]` resolves to 3.
- **raggededge**: archetype A, `quirks.consentBanner = "Accept All"`. Nav `a.c-nav__link`, buttons
  `a.o-btn.o-btn--sm`. 15 videos, 2 canvases. Height 11770 POST-dismissal.
- **squadeasy**: archetype A, `quirks.consentBanner = "Accepter"` (French). Accepting also changed
  locale FR→EN — flagged, undiagnosed; record what is observed.
- **shopify**: archetype A, 11027px, 11 videos. No gate; beware "Enter" matching "Enterprise".
- **helloshivam**: archetype A. `/` is a deliberate minimal 817px landing page (NOT broken).
  `/work/` is 3398px with 9 videos; thumbnails are `video.image-wrapper`, not images.
  Nav `a.open-index` (Work), `a.open-info` (Information).

- [ ] **Step 2: Write `verify-site-selectors.mjs` and make it exit 0**

Resolve every selector at every viewport in the site's tier (Ruling 8). Viewport-limited entries are
declared `{selector, viewports:[…]}` and skipped elsewhere rather than shot blank. For gated routes,
the verifier must ENTER first — a selector behind a gate resolves to 0 until then.

Run: `node scripts/verify-site-selectors.mjs`. Expected: exit 0. Resolving mismatches is part of this
task: count 0 at some viewports → declare viewport-limited; 0 everywhere → stale, remove or replace;

> 1 → not unique, add `:nth-of-type` or take a more specific selector.

**Done when:** ten entries, every selector resolving to exactly 1 at every tier viewport, no invented
`selectors.*` (nulls from measurement stay null), and your report lists each section slug chosen.

---

### Task 4: Orchestrator, browser factory, determinism, entry, index

**Files:** Create `scripts/capture-reference-site.mjs`, `scripts/lib/browser.mjs`,
`scripts/lib/determinism.mjs`, `scripts/lib/smooth-scroll.mjs`, `scripts/lib/artifact-index.mjs`.

Carry over v1 Task 4's brief in full (`.superpowers/sdd/2026-09-27-ui-reference-corpus/task-4-brief.md`)
— its `CTX_OPTS`/`makeContext` split (Ruling 5), full CLI surface (Ruling 6), fixed `capturePass`
order and wiring (Ruling 7), banded `safeFullPage`, overlay guard and sha256 index are all still
correct. Apply these REVISIONS on top:

- [ ] **Step 1: `enterRoute()` replaces v1's `enterSite()`**

```js
/**
 * Enter a gated route. Rewritten from measurement (Rulings 17, 20, 22).
 *
 * WHY NOT locator.click(): y-n10's gate has pointer-events:none, so Playwright's actionability
 * check rejects it — yet a real click DOES land on the element. Measure the rect from the
 * selector, dispatch a raw mouse click at its centre. Viewport-durable, unlike coordinates.
 *
 * WHY THE URL GUARD: bare substring matching on "enter" navigated away from two homepages
 * ("Enter" inside "Enterprise"). A gate click must NOT change the URL.
 *
 * WHY NO PRE-SEED: neither real gate writes localStorage/sessionStorage (confirmed 2/2 fresh
 * contexts), so every context must click through. There is no shortcut.
 */
export async function enterRoute(page, route) {
  if (!route.entry) return { gated: false }
  const urlBefore = page.url()
  const target = await page.evaluate(
    ({ match, exact }) => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim()
      for (const el of document.querySelectorAll('button, a, div, span')) {
        if (el.children.length > 2) continue
        const t = norm(el.textContent).toLowerCase()
        const hit = exact ? t === match.toLowerCase() : t.includes(match.toLowerCase())
        if (!hit) continue
        const r = el.getBoundingClientRect()
        if (r.width < 20 || r.height < 10) continue
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') continue
        return {
          x: Math.round(r.x + r.width / 2),
          y: Math.round(r.y + r.height / 2),
          tag: el.tagName.toLowerCase(),
          text: norm(el.textContent).slice(0, 40),
        }
      }
      return null
    },
    { match: route.entry.match, exact: route.entry.exact },
  )

  if (!target) return { gated: true, clicked: null, error: 'ENTRY_TARGET_NOT_FOUND' }
  await page.mouse.click(target.x, target.y) // raw: bypasses actionability
  await page.waitForTimeout(3500) // entry transitions run 1-3s

  if (page.url() !== urlBefore) {
    // Ruling 22
    await page.goBack().catch(() => {})
    return { gated: true, clicked: target, error: 'ENTRY_CLICK_NAVIGATED' }
  }
  const gone = await page
    .evaluate((t) => {
      const el = document.elementFromPoint(t.x, t.y)
      return (
        !el ||
        !(el.textContent || '').toLowerCase().includes(t.text.toLowerCase().slice(0, 8))
      )
    }, target)
    .catch(() => true)
  return { gated: true, clicked: target, entered: gone }
}
```

**The entry signal is the gate DISAPPEARING, never content growth** — pacomepertant's
`main.children` goes 1→0 and `scrollHeight` stays 900 on a _successful_ entry, and belenjones'
`bodyText` never moves at all.

Capture `shots/entry-gate.<vp>.png` BEFORE clicking, home route only, for the two gated sites. The
gate is part of their design.

- [ ] **Step 2: `dismissConsent()` — separate from entry (Ruling 21)**

Cookie banners are not entry gates and must not be captured as `entry-gate.png`. Dismiss via
`route.quirks.consentBanner` text, then **re-measure `scrollHeight`** and record both values. Any
height taken with a banner up is suspect.

- [ ] **Step 3: Branch `capturePass` on archetype**

`A` → sections + scroll frames + states. `B` → iterate nav items, full capture per state, no scroll.
`C` → enter, then iterate `route.states`, viewport screenshots only, no scroll frames.

- [ ] **Step 4: Verify** — `--dry-run` prints the matrix including archetype per route; a single-site
      run writes a parsing `index.json`; an unreachable site warns and exits 0.

---

### Task 5: Section and state capture, with the blank-PNG guard

**Files:** Create `scripts/lib/sections.mjs`.

- [ ] **Step 1: Assert before every shot — Review Focus #1**

```js
const n = await page.locator(sel).count();
if (n !== 1) { index.warn({ code: "SECTION_SELECTOR_UNRESOLVED", affects: [sel],
  message: `matched ${n}; skipped rather than shot blank` }); continue; }
const box = await page.locator(sel).first().boundingBox();
if (!box || box.width < 8 || box.height < 8) {
  index.warn({ code: "SECTION_ZERO_AREA", affects: [sel] }); continue; }
```

A missing artifact is visible. A blank one labelled `hero` corrupts every spec written from it.

- [ ] **Step 2: Archetype B and C produce the same artifact vocabulary**

`sections/NN-<slug>.<vp>.png` regardless of archetype, with `extra.archetype` and — for C —
`extra.state` recording how it was produced. Downstream consumers stay uniform.

- [ ] **Step 3: Verify** on one site per archetype; confirm no zero-byte or uniform-colour PNGs.

---

### Task 6: Scroll frames, reveals, parallax

**Files:** Create `scripts/lib/scroll.mjs`. Archetype A only.

Carry over v1 Task 6 (trusted `page.mouse.wheel`, three-identical-sample settle, filenames carrying
MEASURED y, both reveal detectors, least-squares parallax fit). Revisions:

- [ ] **Step 1: Compute travel ONCE — Review Focus #6.** y-n10 grows `scrollHeight` as you scroll
      (22592 → 316288 observed). Snapshot travel before the loop; never recompute inside it. If measured
      y exceeds the initial travel by >20%, warn `SCROLL_HEIGHT_GREW` and stop.
- [ ] **Step 2: Per-route scroll driver.** y-n10 post-entry uses `window.scrollTo`; pre-entry
      `#main.scrollTop`. Record `scrollDriver` in `SITES` per route and assert the chosen one actually
      moves the page before capturing frames.
- [ ] **Step 3: Verify** filenames show distinct increasing measured y values.

---

### Task 7: Extraction — including the JS-motion and split-heading fixes

**Files:** Create `scripts/lib/extract.mjs`.

Carry over v1 Task 5's extractor (motion comma-list zip, canvas `measureCh`, colours ranked by
`largestAreaPx2`, CORS refetch, all 14 keys). Revisions:

- [ ] **Step 1: Detect JS-driven motion — Review Focus #2**

```js
// guglieri reports `transition: all 0s ease` while visibly animating (Framer Motion springs).
// A 0s transition on an element whose computed style CHANGES on hover proves JS-driven motion.
// Record the fact; do not report 0s as if it were the truth.
motion.jsDriven = { detected: <bool>, evidence: "transition 0s with observed hover delta",
                    note: "easing not extractable from CSS; rAF sampling required" };
```

For any site with `quirks.jsDrivenMotion`, run the rAF sampler over a hover interaction and store
the frame series, exactly as Task 9 does for page transitions.

- [ ] **Step 2: Reassemble split headings — Review Focus #5**

guglieri renders one sentence as six `framer-text` elements for stagger. Before recording
`typography`, merge adjacent inline siblings sharing a computed font shorthand into one logical
heading; record `splitInto: 6` so the stagger pattern is not lost.

- [ ] **Step 3: Seed `states/deltas.json` from the measured hover data.** `hover-deltas.json` already
      holds verified deltas for raggededge, david-hckh and guglieri. Merge, do not overwrite.

- [ ] **Step 4: Verify** on guglieri specifically: `motion.jsDriven.detected === true`, and
      `typography` reports one heading where the DOM has six word-elements.

---

### Task 8: Interaction states, effects, and video

**Files:** Create `scripts/lib/states.mjs`, `scripts/lib/effects.mjs`.

- [ ] **Step 1: Hover/focus deltas** — v1 Task 7's `SNAP`/`diffStyles`, unchanged. Add: when the
      hovered element reports no change, **re-probe its children one level down** before concluding there
      is no hover state (david's `a.preview-card` and raggededge's `a.c-nav__link` both did this).
- [ ] **Step 2: Archetype C state matrix** — drive `route.states[].action`, screenshot the viewport
      after each, record the action that produced it.
- [ ] **Step 3: belenjones canvas interaction** — click the canvas at a measured card position to open
      a project; capture the overlay and its `/RETURN` + `NEXT` chrome. `bodyText` is not a signal here;
      assert on `visibleEls` instead.
- [ ] **Step 4: Video and effects** — v1 Task 8's `NEUTRALISE_AUTOPLAY`, seek-to-1.0/3.0 frames, the
      `blob:` guard, particles config dump. Given the video counts measured (raggededge 15, shopify 14,
      helloshivam 9), this matters more than v1 assumed: catalogue every one.
- [ ] **Step 5: One scroll-session webm per site**, home route, desktop, archetype A and B only.

---

### Task 9: Page transitions (tier 1, where they exist)

**Files:** Create `scripts/lib/transitions.mjs`.

Carry over v1 Task 8 verbatim — Barba hooks, CDP screencast **with `Page.screencastFrameAck` on every
frame**, the rAF style sampler, fresh context per transition. Revision: only david-hckh and
pacomepertant have real route-to-route transitions. topology-vc's in-place swap is captured as
archetype B states instead; measure its swap with the same rAF sampler.

---

### Task 10: Network inventory

**Files:** Create `scripts/lib/network.mjs`. Carry over v1 Task 9 verbatim — context-level listeners,
`recordHar` with `content: "omit"`, the DOM/network join producing art-direction facts, the guarded
transient body read for version strings. Verify no HAR entry carries a body and every asset record is
`downloaded: false`.

---

### Task 11: Staged run

- [ ] Archetype B and C first (smallest, most likely to surface bugs): topology-vc, belenjones, y-n10,
      pacomepertant.
- [ ] Then archetype A tier 3, then tier 2, then tier 1.
- [ ] Validate every index: every `path` resolves, every `sha256` matches, no empty
      `colors`/`typography`/`spacing`/`motion`.
- [ ] Assert file extensions under the tree are only `png|jpg|json|webm|har|md`.
- [ ] `du -sh` under 12GB.

---

### Task 12: Documents and independent verification

- [ ] Per-site `tech-stack.md` and `notes.md`, every claim carrying an evidence path.
- [ ] `STACK-COMPARISON.md` + `stacks.json`. Seed from what is already measured: video-heavy
      conventional tier (raggededge 15, shopify 14, helloshivam 9); three distinct rendering
      architectures; BEM/ITCSS (raggededge) vs Framer (guglieri) vs styled-components (belenjones) vs
      Next/Nuxt/Gatsby; interaction tempo 0.1s (david-hckh) vs 0.3s+50ms delay (raggededge).
- [ ] `docs/ui-references/README.md` — how an agent traverses the tree, and that `native`/`live` and
      differing archetypes are never compared across.
- [ ] **Copy the findings files into the corpus** so they ship with it:
      `gate-inventory.md`, `interaction-model.md`, `hover-deltas.json` → `docs/ui-references/_findings/`.
      They are measured primary sources and the corpus is incomplete without them.
- [ ] Independent verification pass (`capture-verifier` skill) by an agent that did not produce the
      artifacts: open a sample of screenshots and say what is in them, re-measure a sample against the
      live sites, issue CONFIRMED / PLAUSIBLE / REJECTED / UNTRACEABLE per claim.
- [ ] Confirm `git status` shows everything untracked and nothing committed.

---

## Self-Review

**Coverage:** Every v1 task maps forward — v1 T3→T3, T4→T4, T5→T7, T6→T6, T7→T8, T8→T8/T9, T9→T10,
T10→T11, T11/T12→T12. Nothing dropped; the extractor and network tasks carry over verbatim because
measurement did not contradict them.

**What measurement changed:** archetypes A/B/C replacing a single path; `enterRoute` rewritten around
raw mouse clicks and a URL guard; consent dismissal split from entry; scroll travel computed once;
JS-driven motion detection; split-heading reassembly; per-route scroll drivers; children re-probed on
null hover deltas.

**Type consistency:** `index.add({path, kind, pass, viewport, route, describes, extra})` unchanged
across T4–T10. `archetypeOf(route)` defined in T3, consumed in T4–T6, T8. `enterRoute(page, route)`
defined T4, used T5–T9.

**Review Focus:** all six pinned — #1 T5S1, #2 T7S1, #3 T4S1, #4 T4S2, #5 T7S2, #6 T6S1.
