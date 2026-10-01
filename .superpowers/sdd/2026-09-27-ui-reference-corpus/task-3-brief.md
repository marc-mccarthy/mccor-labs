# Task 3: Assign section slugs and author `sites.mjs`

**These are your requirements. Use every value below verbatim.**

This is the one task in the plan that is mostly **judgment, not mechanism**. Its output is the
durable record of what gets captured and what each thing is called. Section slugs become screenshot
filenames and propagate into the final UI spec, so a wrong name is not cosmetic — it is what a
downstream agent will believe the site is made of.

## Files

- Create: `scripts/lib/sites.mjs`

## Interfaces

- Consumes: `docs/ui-references/_recon/<slug>.json` (ten files, written by Task 2).
- Produces:
  - `export const VIEWPORTS` — the four viewport definitions.
  - `export const TIERS` — per-tier capture rules.
  - `export const SITES` — the ten site records.
  - `export function viewportsFor(site)`, `routesFor(site)`, `tierOf(site)`.

Task 4 and every later task import these. Nothing downstream re-derives them.

## Global Constraints (bind this task)

- **Never write to git. Hardened rule (Controller Ruling 11), not a preference:** `git add` (in any
  form, including `-A` and `.`), `git commit`, `git push`, `git stash`, `git checkout`, and
  `git clean` are **forbidden outright**. Read-only `git status` / `git diff` / `git log` are fine.
  A third party is concurrently working in this same tree and has already committed once during this
  plan's execution. Leave every path you did not create exactly as you found it.
- **Every Bash step that launches a browser must run with `dangerouslyDisableSandbox: true`.** The
  sandbox denies Chromium's Mach port lookup and its `listen()` call; the errors never name the
  sandbox and surface as `bootstrap_check_in ... Permission denied (1100)` or a bare launch timeout.
- **Download nothing.** No third-party binary may land on disk.
- **A value not measured in this run does not go in the file.** If you cannot confirm a selector
  resolves, it does not get written as though it does.
- `@playwright/test` is pinned to exactly `1.61.0`. Do not run `pnpm add`, `pnpm update`, or
  `playwright install` — a browser download is ~500MB onto a volume at 89% capacity.
- Script conventions: plain `.mjs`, `node:`-prefixed builtins only, no bundler, no TypeScript.

## CONTROLLER RULING 14 — two section modes, and a hand-verified data source

Not every site exposes sections in the DOM. Five of these ten do not, each for a different reason:
pacomepertant renders content into a WebGL canvas, guglieri is Framer with build-hashed class names,
helloshivam is Gatsby wrapped in transition-link containers, belenjones is one ~45,000px scroll
container, and y-n10 exposes no `a[href]` navigation. Tuning a heuristic until it fits five unrelated
architectures produces something fragile that breaks on the next redesign.

So each site carries a **`sectionMode`**:

- `"dom"` — durable per-section selectors exist. `sections` maps slug to selector as normal.
- `"scroll-bands"` — they do not. `sections` is replaced by `bands`, an array of
  `{slug, startY, endY, dominantHeading}` derived from measured scroll offsets. For a WebGL or
  Framer site this is the more faithful model, not a consolation prize: the "section" there genuinely
  is a visual beat during scroll rather than a node in a tree.

**Two inputs, and the hand-verified one wins.** Besides `_recon/<slug>.json`, read
`.superpowers/sdd/2026-09-27-ui-reference-corpus/deepdive-hard-sites.md`. That file is the output of
an interactive per-site browser inspection of the five hard sites, and every selector in it was
verified against a live `document.querySelectorAll(sel).length === 1`. Where it disagrees with the
script's recon output, **the deepdive wins** — it looked at the page, the script guessed from
heuristics.

Carry these fields per site:

```js
sectionMode: "dom",              // or "scroll-bands"
// when "dom":
sections: { hero: "…", work: "…" },
// when "scroll-bands":
bands: [{ slug: "hero", startY: 0, endY: 900, dominantHeading: "David" }, …],
docScrollHeight: 4230,           // measured; bands are meaningless without it
```

Also carry, for any selector the deepdive flagged as build-hash-dependent (Framer `framer-XXXXX`,
CSS-module suffixes, Next internals):

```js
quirks: { fragileSelectors: ["div.framer-y5PmK"], fragileReason: "Framer build hash — breaks on redeploy" },
```

A fragile selector is not a defect to hide; it is a documented risk. It will silently produce a blank
screenshot rather than an error when it breaks, so Task 4's capture must assert element visibility
before shooting, and `notes.md` must say the selector is hash-dependent.

## Step 1 — Read all ten recon files and assign a slug per section

For each site, read `candidateSections[]` and name each section from its `firstHeading` and
`classList`. Slugs are kebab-case and describe the section's **role**, not its appearance:
`hero`, `intro`, `work-grid`, `about`, `services`, `testimonials`, `contact`, `footer`. Prefer the
role a visitor would recognise over the class name the author happened to use.

Drop these candidates rather than naming them:

- Layout wrappers: `childCount === 1` and no `firstHeading`.
- Anything whose class or id matches `loader|preloader|cursor|scrollbar|transition-overlay`.
- Fixed chrome that is not a page section: cookie banners, floating nav, back-to-top.

Record each kept section's selector **verbatim** from `candidateSections[].selector`. Do not
hand-improve a selector — the recon script generated it against the live DOM and verified its
uniqueness path; a hand-edit is an unmeasured value.

### CONTROLLER RULING 13 CAVEAT — check for grid overshoot before naming anything

Task 2's fallback was changed to **descend** while a DOM level collapses to a single wrapper. That
fix has a known failure direction: it can descend one level too far and land inside a grid, so what
looks like twelve sections is really twelve cards.

**Before you name a site's sections, test each site for this.** A level is a grid, not an outline,
when its children share a selector shape — for example six entries all matching
`div.work-item:nth-of-type(N)`, or all with identical `classList` and near-identical `rect.h`.

If you find that, the correct outline is the **parent** of that level, named as one section
(`work-grid`), and the cards are recorded separately under the site's `selectors.card`. Report every
site where you made this call and what the level looked like, so the decision is auditable.

## Step 2 — Write `sites.mjs`

```js
/**
 * The durable record of what was captured and why those routes.
 *
 * Section selectors and route lists are transcribed from docs/ui-references/_recon/<slug>.json,
 * produced by scripts/recon-reference-sites.mjs. Re-run recon and revisit this file if a
 * reference site is redesigned — a stale selector produces an empty section screenshot, not an
 * error, which is the single failure mode this corpus exists to prevent.
 *
 * Sections may be viewport-limited (Controller Ruling 8): a selector that resolves at desktop but
 * not at mobile is recorded with an explicit `viewports` array, and capture SKIPS it at viewports
 * where it does not resolve rather than writing a blank PNG that looks like a successful capture.
 */
export const VIEWPORTS = {
  wide: { width: 1600, height: 1000, deviceScaleFactor: 2, isMobile: false },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false },
  tablet: { width: 834, height: 1112, deviceScaleFactor: 2, isMobile: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
};

export const TIERS = {
  1: {
    viewports: ["wide", "desktop", "tablet", "mobile"],
    maxRoutes: 4,
    states: true,
    transitions: true,
    effects: true,
    scrollFramesDesktop: 16,
    scrollFramesMobile: 10,
  },
  2: {
    viewports: ["desktop", "mobile"],
    maxRoutes: 3,
    states: true,
    transitions: false,
    effects: true,
    scrollFramesDesktop: 16,
    scrollFramesMobile: 10,
  },
  3: {
    viewports: ["desktop", "mobile"],
    maxRoutes: 1,
    states: false,
    transitions: false,
    effects: false,
    scrollFramesDesktop: 10,
    scrollFramesMobile: 10,
  },
};
```

### The `SITES` record shape

Every site is one object with exactly these keys. `sections` values are **either** a bare selector
string (resolves at every viewport in the tier) **or** an object `{selector, viewports}` when
viewport-limited.

```js
export const SITES = [
  {
    slug: "david-hckh",
    origin: "https://david-hckh.com",
    tier: 1,
    // "lenis" | "locomotive" | "none" | "unknown" — from recon's windowGlobals and htmlClasses.
    // david-hckh reports htmlClasses ["lenis"], so: "lenis".
    smoothScroll: "lenis",
    routes: [
      { name: "home", url: "https://david-hckh.com" },
      // … up to TIERS[tier].maxRoutes, taken from discoveredRoutes where duplicateOf === null
    ],
    sections: {
      hero: "#app > section:nth-of-type(1)",
      // viewport-limited example — Ruling 8:
      // "work-grid": { selector: "…", viewports: ["wide", "desktop", "tablet"] },
    },
    selectors: {
      primaryCta: null, // null when recon found none — do NOT invent one
      navToggle: null,
      card: null,
      signatureEffect: null,
    },
    effects: { video: false, particles: false, typewriter: false },
    quirks: {}, // free-form notes a capture step must honour
  },
  // … nine more
];
```

Rules for filling it:

- `smoothScroll` comes from recon: `htmlClasses` containing `lenis` or `has-scroll-smooth`, or
  `windowGlobals` naming `Lenis`/`LocomotiveScroll`. If neither, `"none"`. If the site clearly
  animates scroll but exposes no global, `"unknown"` — do not guess a library name.
- `routes` takes only entries where `duplicateOf === null`, capped at `TIERS[tier].maxRoutes`, home
  first. Prefer `inNav === true` routes over footer links.
- `selectors.*` is `null` when recon returned null. **A null is a measurement; an invented selector
  is a fabrication.** Task 7 skips null targets and records why.
- `effects.*` is `true` only when recon evidenced it: `hasVideo`/`hasCanvas` on a section, or
  `pJSDom`/`particlesJS`/`Typed` in `windowGlobals`.

```js
export function viewportsFor(site) {
  return TIERS[site.tier].viewports;
}
export function routesFor(site) {
  return site.routes.slice(0, TIERS[site.tier].maxRoutes);
}
export function tierOf(site) {
  return TIERS[site.tier];
}
```

## Step 3 — Verify EVERY selector at EVERY viewport in the site's tier

### CONTROLLER RULING 8 — this replaces the plan's single-viewport check

The plan originally verified selectors once, at the default viewport. That is insufficient: recon ran
only at desktop 1440×900, and a section that exists at desktop may be absent at mobile (collapsed
nav, `display:none` at a breakpoint, a different component tree). A selector that resolves at desktop
but not mobile produces a **blank PNG that looks exactly like a successful capture** — the precise
silent failure this corpus exists to prevent.

So: resolve every selector at every viewport in the site's tier, and record the result.

Write the verification as a script at `scripts/verify-site-selectors.mjs` (it is reused later, so it
is a file, not an inline one-liner), and run it with `dangerouslyDisableSandbox: true`:

```js
/**
 * Resolves every selector in sites.mjs at every viewport in each site's tier.
 *
 * REQUIREMENTS: Node >= 24, `pnpm install` run. MUST run with the Bash sandbox disabled —
 * the sandbox denies Chromium's Mach port lookup and its listen() call, surfacing as
 * `bootstrap_check_in ... Permission denied (1100)` or a bare launch timeout.
 *
 * INVOCATION: node scripts/verify-site-selectors.mjs [--site <slug>]
 *
 * A count of 0 is a stale or viewport-limited selector; >1 is a non-unique one. Both are defects
 * that must be resolved in sites.mjs before any capture runs, because both produce a plausible
 * blank image rather than an error.
 */
import { chromium } from "@playwright/test";
import { SITES, VIEWPORTS, viewportsFor, routesFor } from "./lib/sites.mjs";

const HEADFUL_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

const browser = await chromium.launch();
let defects = 0;

for (const site of SITES) {
  const url = routesFor(site)[0].url;
  for (const vpName of viewportsFor(site)) {
    const ctx = await browser.newContext({
      ...VIEWPORTS[vpName],
      userAgent: HEADFUL_UA,
      locale: "en-US",
      timezoneId: "America/Chicago",
      colorScheme: "light",
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 45000 }).catch(() => {});
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    // Same content gate Task 2 uses: outlining or resolving before the preloader leaves is
    // how the loader gets mistaken for content.
    await page
      .waitForFunction(
        () => {
          const els = [
            ...document.querySelectorAll(
              '.loader, .preloader, [class*="loader"], [class*="preloader"]',
            ),
          ];
          const covering = els.some((el) => {
            const r = el.getBoundingClientRect(),
              cs = getComputedStyle(el);
            return (
              cs.display !== "none" &&
              Number(cs.opacity) > 0.05 &&
              r.width * r.height > innerWidth * innerHeight * 0.5
            );
          });
          return (
            !covering &&
            document.documentElement.scrollHeight > innerHeight * 1.2
          );
        },
        { timeout: 20000 },
      )
      .catch(() => {});
    await page.waitForTimeout(1200);

    const targets = {};
    for (const [name, v] of Object.entries(site.sections)) {
      const sel = typeof v === "string" ? v : v.selector;
      const allowed = typeof v === "string" ? null : v.viewports;
      if (allowed && !allowed.includes(vpName)) continue; // declared viewport-limited: skip
      targets["section:" + name] = sel;
    }
    for (const [name, sel] of Object.entries(site.selectors)) {
      if (sel) targets["selector:" + name] = sel;
    }

    const counts = await page.evaluate(
      (m) =>
        Object.fromEntries(
          Object.entries(m).map(([k, v]) => [
            k,
            document.querySelectorAll(v).length,
          ]),
        ),
      targets,
    );
    const bad = Object.entries(counts).filter(([, n]) => n !== 1);
    if (bad.length) {
      defects += bad.length;
      console.log(`${site.slug} @ ${vpName}: MISMATCH ${JSON.stringify(bad)}`);
    } else {
      console.log(
        `${site.slug} @ ${vpName}: ok (${Object.keys(counts).length} selectors)`,
      );
    }
    await ctx.close();
  }
}
await browser.close();
console.log(
  defects
    ? `\n${defects} DEFECTS — fix sites.mjs before any capture`
    : "\nall selectors resolve uniquely at every tier viewport",
);
process.exit(defects ? 1 : 0);
```

Run it:

```bash
cd /Users/mj/repos/mccor-labs && node scripts/verify-site-selectors.mjs 2>&1 | tail -50
```

**Resolving the mismatches is part of this task, not a follow-up.** For each:

- Count `0` at _some_ viewports but `1` at others → it is genuinely viewport-limited. Convert that
  entry to `{selector, viewports: [...]}` listing only the viewports where it resolves.
- Count `0` at _every_ viewport → the selector is stale or was a preloader artifact. Remove the
  section, or replace it from recon's `candidateSections` and re-verify.
- Count `>1` → not unique. Take the more specific selector from recon, or add an `:nth-of-type`.
  Re-verify; do not leave it.

Re-run until the script exits 0.

## Definition of done for this task

1. `scripts/lib/sites.mjs` exists, exporting `VIEWPORTS`, `TIERS`, `SITES`, `viewportsFor`,
   `routesFor`, `tierOf`.
2. `SITES` has exactly ten entries, slugs matching the recon filenames.
3. Every site has at least 3 named sections. A site with fewer is reported to me with the reason,
   not silently shipped.
4. `scripts/verify-site-selectors.mjs` exists and **exits 0** — every selector resolves to exactly
   one element at every viewport in its site's tier, with viewport-limited entries declared as such.
5. No `selectors.*` value was invented; nulls from recon stayed null.
6. Your report lists, per site: the section slugs chosen, any grid-overshoot call you made and what
   the level looked like, and any section you dropped and why.
7. `git status --short` shows the new files untracked. Nothing staged, nothing committed.
