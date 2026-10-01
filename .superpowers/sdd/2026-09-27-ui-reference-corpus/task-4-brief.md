# Task 4: Capture orchestrator, browser factory, determinism, smooth-scroll teardown, artifact index

**These are your requirements. Use every value below verbatim.**

This is the structural spine of the capture system. Tasks 5–9 fill in phases; this task decides the
order they run in and owns every cross-cutting concern. Three controller rulings apply and each
overrides part of the original plan — read them before writing code.

## Files

- Create: `scripts/capture-reference-site.mjs` — orchestrator, CLI, per-site loop, disk ceiling
- Create: `scripts/lib/browser.mjs` — context factory, fixed context options, HAR wiring
- Create: `scripts/lib/determinism.mjs` — font/lazy/freeze/overlay guards, banded full-page
- Create: `scripts/lib/smooth-scroll.mjs` — constructor wrap, `native`-pass teardown
- Create: `scripts/lib/artifact-index.mjs` — flat `index.json` writer with sha256

## Interfaces

Consumes from Task 3: `SITES`, `VIEWPORTS`, `TIERS`, `viewportsFor`, `routesFor`, `tierOf` from
`./lib/sites.mjs`.

Produces, and **these exact signatures are what Tasks 5–9 are written against** — do not rename:

```js
// browser.mjs
export const CTX_OPTS;                                    // frozen base context options
export async function makeContext(browser, { viewport, harPath, videoDir, initScripts });

// determinism.mjs
export async function settle(page);
export async function sweepLazyImages(page);              // returns stragglers[]
export async function freezeMotion(page);
export async function overlayGuard(page);                 // returns warnings[]
export async function safeFullPage(page, pathFor);        // returns {banded, offsets, paths}

// smooth-scroll.mjs
export const WRAP_INIT_SCRIPT;
export async function tearDownSmoothScroll(page);         // returns {ok, scrollHeight, innerHeight}

// artifact-index.mjs
export function createIndex(site, siteDir);
//   index.add({ path, kind, pass, viewport, route, describes, extra })  -- sha256 at add time
//   index.warn({ code, message, affects })
//   index.bytes                                          -- getter, for the disk ceiling
//   await index.write()                                  -- returns {artifacts, warnings, bytes}
```

## Global Constraints (bind this task)

- **Never write to git. Hardened rule (Controller Ruling 11):** `git add` (any form, including `-A`
  and `.`), `git commit`, `git push`, `git stash`, `git checkout`, `git clean` are **forbidden
  outright**. Read-only `git status`/`diff`/`log` only. A third party is concurrently working in this
  same tree and has already committed once during this plan's execution.
- **Every Bash step that launches a browser needs `dangerouslyDisableSandbox: true`.** The sandbox
  denies Chromium's Mach port lookup and its `listen()` call; failures surface as
  `bootstrap_check_in ... Permission denied (1100)` or a bare launch timeout and never name the
  sandbox.
- **Download nothing.** No third-party image, video, font, or script may be written to disk. Our own
  screenshots, our own video of our own browser session, and our own JSON are the only binaries.
- **A number not measured in the run that wrote it does not go in a file.**
- **Disk ceiling 12GB** for the whole `docs/ui-references/` tree. Volume has ~48GiB free at 89%.
- `@playwright/test` is pinned to exactly `1.61.0`. Never run `pnpm add`/`update`/`playwright install`.
- Import is `import { chromium, devices } from "@playwright/test";` — never from `playwright`.
- Script conventions: plain `.mjs`, bare `node`, `node:`-prefixed builtins only,
  `resolve(import.meta.dirname, "..")` for repo root, `process.argv.includes("--flag")` parsing,
  JSDoc header stating requirements + literal invocations + known failure modes.

---

## CONTROLLER RULING 5 — `browser.mjs` exports BOTH `makeContext` and `CTX_OPTS`

The original plan had Task 8 referencing a `CTX_OPTS` const that no task defined; Task 8 as written
would not run. `browser.mjs` is the single owner of context options and exports both: `CTX_OPTS` is
the frozen base object, `makeContext` spreads it. Task 8 needs the raw object because it creates its
own contexts with `recordVideo`.

## CONTROLLER RULING 6 — this task owns the ENTIRE CLI surface

Tasks 5–9 each verify themselves by running one phase in isolation. Every one of those flags must
exist now, or none of those verification steps can run and the whole matrix has to be re-run to test
a single phase. Implement all of:

```
--site <slug>        one site only (default: all ten)
--route <name>       one route only, by its `name` in SITES
--viewport <name>    one viewport only
--pass <native|live> one pass only
--clean              remove the site's directory before capturing
--only-extract       run extraction only, skip screenshots/scroll/states/transitions
--only-states        run interaction states only
--only-transitions   run page transitions only
--only-effects       run signature effects only
--dry-run            print the capture plan (site/route/viewport/pass matrix) and exit 0
```

`--only-*` flags are mutually exclusive; passing two is an error with a clear message. When none is
passed, every phase enabled by the site's tier runs. `--dry-run` exists so the matrix can be
inspected without touching the network — implement it and show its output in your report.

## CONTROLLER RULING 7 — `capturePass()` is the single call-site that fixes order and wiring

Order per route is **load → settle → extract motion JSON → inject freeze stylesheet → screenshot**,
encoded in one function so it cannot drift. Injecting the freeze before extracting makes the extract
faithfully report every transition as `0s`, which is a silent data corruption.

`capturePass` also owns three wirings the original plan left unspecified:

1. `attachNetworkListeners(ctx)` (Task 9) is called **immediately after `makeContext`, before any
   `goto`**. Attaching after navigation yields a partial waterfall.
2. HAR path is `<siteDir>/network/session.har`.
3. The live pass merges Task 6's `revealsObserved` and `scrollLinked` into the extract object
   **before it is written**. `extract.<vp>.json` is written **once** per (route, viewport), after
   both passes complete — not once per pass, or the native pass's write clobbers the live pass's
   motion data.

For this task, stub the phase calls with clearly-marked `TODO(task-N)` comments and a no-op, but
**write the order and the wiring for real** — Tasks 5–9 fill the bodies, not the structure.

---

## CONTROLLER RULING 16 — ENTRY GATES: click through before capturing anything

**This is the highest-priority correction in this brief.** Several of these sites open on an
interstitial — a click-to-enter screen, a sound-consent button, a splash gate — and render no content
until it is dismissed. An earlier recon pass read `main.children.length === 0` on two of them and
concluded the pages were empty. They were not empty; they were gated. Capturing without clicking
through yields a corpus of interstitials, which is worthless.

`capturePass()` must run an entry-gate step **after `goto`/`settle` and before every other phase**,
on every route, in both passes:

```js
/**
 * Dismiss an entry gate (click-to-enter, sound consent, splash) and wait for content to mount.
 * Returns {clicked, before, after} so the index can record that a gate existed — a gated site is
 * a real UI finding, not an obstacle to hide.
 */
export async function enterSite(page) {
  const GATE = [
    "button.no-sound", "button.sound", '[class*="no-sound"]',
    'button:has-text("Enter")', 'a:has-text("Enter")', '[class*="enter"] button',
    'button:has-text("Sound on")', 'button:has-text("Sound off")',
    '[class*="gate"] button', '[class*="intro"] button', '[class*="splash"] button',
    'button:has-text("Continue")', 'button:has-text("Skip")',
  ];
  const snap = () => page.evaluate(() => ({
    kids: document.querySelector("main")?.children.length ?? -1,
    h: document.documentElement.scrollHeight,
  }));
  const before = await snap();
  let clicked = null;
  for (const sel of GATE) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) === 0) continue;
    if (!(await loc.isVisible().catch(() => false))) continue;
    await loc.click({ timeout: 5000 }).catch(() => {});
    clicked = sel;
    break;
  }
  // Some gates are a bare click-anywhere handler with no button element.
  if (!clicked && before.kids <= 0) {
    await page.keyboard.press("Enter").catch(() => {});
    await page.mouse.click(Math.round(page.viewportSize().width / 2),
                           Math.round(page.viewportSize().height / 2)).catch(() => {});
    clicked = "fallback:enter-key-then-centre-click";
  }
  if (clicked) {
    await page.waitForFunction((prev) => {
      const kids = document.querySelector("main")?.children.length ?? -1;
      return kids > prev.kids || document.documentElement.scrollHeight > prev.h * 1.2;
    }, before, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);   // entry transitions run 1-3s on these sites
  }
  return { clicked, before, after: await snap() };
}
```

Put it in `determinism.mjs` and export it. Requirements on its use:

- Capture **one `shots/entry-gate.<vp>.png` before clicking**, on the home route only, and register it
  with `describes` saying it is the pre-entry interstitial. The gate is part of these sites' UI.
- Record the result in the index: `index.warn({code: "ENTRY_GATE_DISMISSED", message: ...})` is the
  wrong shape — instead add it to the site's index as an artifact `extra` field and log
  `{clicked, before, after}` into the route's extract under `entryGate`. It is data, not a warning.
- **If `clicked` is non-null but `after` is unchanged from `before`, that is a hard failure**: write
  `ENTRY_GATE_NOT_DISMISSED` to warnings with the selector tried, and skip the route's remaining
  phases rather than capturing a page of interstitial labelled as content.
- Per-site overrides live in `site.quirks.entryGate` — a selector string when the generic sweep is
  known to miss, or `false` when the site has no gate and the sweep should be skipped entirely
  (guglieri's dismissable overlay is a different problem; do not conflate them).

Known gated sites from recon: **pacomepertant** (`button.no-sound`), **y-n10** (Enter gate, and its
scroll driver INVERTS across it — `#main.scrollTop` before, `window.scrollTo` after), and
**helloshivam** (suspected). Treat the list as incomplete and run the sweep everywhere.

## CONTROLLER RULING 14 — capture must handle TWO section modes

Each site in `SITES` carries `sectionMode`:

- `"dom"` — `site.sections` maps slug to selector. Capture per-section shots with
  `page.locator(sel).screenshot(...)` as normal.
- `"scroll-bands"` — `site.sections` is absent; `site.bands` holds
  `[{slug, startY, endY, dominantHeading}]` and `site.docScrollHeight` is the measured page height.
  Capture each band by scrolling to `startY` and shooting the **viewport**, not an element.

Five of the ten sites are `scroll-bands` because they have no durable DOM sections: pacomepertant
renders into a WebGL canvas, guglieri is Framer with build-hashed class names, helloshivam is Gatsby
inside transition-link wrappers, belenjones is one ~45,000px scroll container, y-n10 has no `a[href]`
navigation. Write the band path as a first-class branch, not an afterthought — it covers half the
corpus, including the user's top-ranked site at rank 2.

Band artifacts are named `sections/NN-<slug>.<vp>.png` exactly as DOM ones are, so downstream
consumers need not care which mode produced them. The `index.json` entry records the difference:
`extra: { sectionMode: "scroll-bands", startY, endY }`.

### Assert visibility before every section shot — either mode

A stale or build-hash-dependent selector resolves to nothing and `locator.screenshot()` on it either
throws or yields an empty image. Some sites' selectors are known-fragile and flagged in
`site.quirks.fragileSelectors`. Before each section shot:

```js
const loc = page.locator(sel).first();
const n = await page.locator(sel).count();
if (n !== 1) { index.warn({ code: "SECTION_SELECTOR_UNRESOLVED", affects: [sel],
  message: `matched ${n} elements; section skipped rather than shot blank` }); continue; }
const box = await loc.boundingBox();
if (!box || box.width < 8 || box.height < 8) { index.warn({ code: "SECTION_ZERO_AREA",
  affects: [sel], message: `boundingBox ${JSON.stringify(box)}; section skipped` }); continue; }
```

**Skipping with a warning beats writing a blank PNG.** A missing artifact is visible; a blank one
labelled `hero` silently corrupts every spec written from it. This is the single most important
assertion in the capture system.

## Step 1: `smooth-scroll.mjs`

The `defineProperty` setter is required and is the subtle part: a plain wrap at init time has nothing
to wrap, because the library has not yet assigned its global. This installs a setter that wraps the
constructor at the moment the library assigns it.

```js
/**
 * Smooth-scroll teardown for the `native` capture pass.
 *
 * WHY THIS EXISTS
 *   Locomotive Scroll sets html.has-scroll-smooth { overflow: hidden } and translates
 *   [data-scroll-container]. Under that, fullPage:true returns a VIEWPORT-HEIGHT image, element
 *   rects are wrong, and window.scrollTo moves nothing. Tearing it down fixes geometry but destroys
 *   the parallax and reveal machinery, which is why capture runs two passes and only this one tears
 *   down.
 *
 * KNOWN FAILURE MODE
 *   A library bundled as an ES module with no global assigns nothing to window, so the constructor
 *   wrap captures no instance. The DOM-level teardown in steps 2-4 works regardless of bundling and
 *   is the fallback.
 */
export const WRAP_INIT_SCRIPT = () => {
  for (const name of ["Lenis", "LocomotiveScroll"]) {
    let Real;
    Object.defineProperty(window, name, {
      configurable: true,
      get: () => Real,
      set: (V) => {
        Real = class extends V {
          constructor(...a) {
            super(...a);
            window[name === "Lenis" ? "__lenis" : "__loco"] = this;
          }
        };
      },
    });
  }
};

export async function tearDownSmoothScroll(page) {
  return page.evaluate(() => {
    try {
      window.__lenis?.destroy?.();
    } catch {}
    try {
      window.__loco?.destroy?.();
    } catch {}
    // destroy() removes listeners but leaves the html class and the container's final transform,
    // so steps 2-4 are NOT optional.
    document.documentElement.classList.remove(
      "has-scroll-smooth",
      "has-scroll-init",
      "has-scroll-dragging",
    );
    for (const c of document.querySelectorAll("[data-scroll-container]")) {
      c.style.transform = "";
      c.style.height = "";
      c.style.position = "";
    }
    const s = document.createElement("style");
    s.id = "__forensics-native";
    s.textContent =
      "html,body{overflow:auto !important;height:auto !important}";
    document.head.appendChild(s);
    return {
      ok: document.documentElement.scrollHeight > innerHeight * 1.2,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight,
    };
  });
}
```

When `ok` is false, the caller writes `SMOOTH_SCROLL_TEARDOWN_FAILED` to warnings and **skips the
full-page screenshot** rather than emitting a viewport-height image labelled `fullpage`.

## Step 2: `browser.mjs`

```js
import { chromium } from "@playwright/test";

// Headless Chromium advertises "HeadlessChrome" in its UA and bot protection notices. Fixed
// locale/timezone/colorScheme make runs comparable; reducedMotion is explicit because the
// reduced-motion artifact row needs the DEFAULT to be no-preference.
export const CTX_OPTS = Object.freeze({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  locale: "en-US",
  timezoneId: "America/Chicago",
  colorScheme: "light",
  reducedMotion: "no-preference",
});

export async function makeContext(
  browser,
  { viewport, harPath, videoDir, initScripts = [] },
) {
  const ctx = await browser.newContext({
    ...CTX_OPTS,
    ...viewport,
    // content:"omit" keeps the HAR at hundreds of KB and GUARANTEES no copyrighted binary
    // lands on disk. Never remove it.
    ...(harPath
      ? { recordHar: { path: harPath, content: "omit", mode: "full" } }
      : {}),
    ...(videoDir
      ? {
          recordVideo: {
            dir: videoDir,
            size: { width: viewport.width, height: viewport.height },
          },
        }
      : {}),
  });
  for (const s of initScripts) await ctx.addInitScript(s);
  return ctx;
}
```

## Step 3: `determinism.mjs`

```js
export async function settle(page) {
  // networkidle is a HINT, never a gate — Vimeo and GTM poll forever and it never fires.
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  // FOUT changes every metric on the page and is the most common reason two runs disagree.
  await page.evaluate(() => document.fonts.ready);
}

export async function sweepLazyImages(page) {
  await page.evaluate(async () => {
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  return page.evaluate(async () => {
    const deadline = Date.now() + 10000;
    const pending = () =>
      [...document.images].filter((i) => !(i.complete && i.naturalWidth > 0));
    while (pending().length && Date.now() < deadline)
      await new Promise((r) => setTimeout(r, 200));
    return pending()
      .map((i) => i.currentSrc || i.src)
      .slice(0, 20);
  });
}

export async function freezeMotion(page) {
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation-play-state:paused !important;" +
      "transition-delay:0s !important;caret-color:transparent !important}",
  });
}

export async function overlayGuard(page) {
  await page.evaluate(() => {
    for (const k of [
      "cookieconsent_status",
      "cookie-consent",
      "gdpr-consent",
      "hasConsented",
      "newsletter-dismissed",
      "modal-seen",
      "__forensics",
    ]) {
      try {
        localStorage.setItem(k, "dismissed");
      } catch {}
    }
    const CLOSE = [
      '[id*="accept" i]',
      '[class*="accept" i]',
      'button[aria-label*="close" i]',
      '[class*="cookie"] button',
      '[id*="onetrust-accept"]',
      '[class*="modal"] [class*="close"]',
    ];
    for (const sel of CLOSE)
      for (const el of document.querySelectorAll(sel)) {
        try {
          el.click();
        } catch {}
      }
  });
  // Then ASSERT. A contaminated screenshot that is LABELLED contaminated is recoverable; one that
  // is not produces a spec written from a picture of a cookie banner.
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" || Number(cs.zIndex) <= 1000) continue;
      const r = el.getBoundingClientRect();
      if (r.width * r.height > innerWidth * innerHeight * 0.25) {
        out.push({
          code: "VIEWPORT_OBSTRUCTED",
          zIndex: cs.zIndex,
          coverage: +(
            (r.width * r.height) /
            (innerWidth * innerHeight)
          ).toFixed(2),
          selector:
            el.tagName.toLowerCase() +
            (el.id ? "#" + el.id : "." + [...el.classList][0]),
        });
      }
    }
    return out;
  });
}

/**
 * Review Focus #3. Chromium's max texture height is 16384 DEVICE pixels; past that `fullPage`
 * truncates the image SILENTLY, with no error and no warning. Capture overlapping bands instead.
 * `pathFor(offset)` returns the path for a band at that offset, or for the whole page when null.
 */
export async function safeFullPage(page, pathFor) {
  const { h, dpr } = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    dpr: devicePixelRatio,
  }));
  if (h * dpr <= 16384) {
    const p = pathFor(null);
    await page.screenshot({ path: p, fullPage: true, animations: "disabled" });
    return { banded: false, offsets: [], paths: [p] };
  }
  const BAND = 8000,
    OVERLAP = 200,
    offsets = [],
    paths = [];
  const w = await page.evaluate(() => document.documentElement.clientWidth);
  for (let y = 0; y < h; y += BAND - OVERLAP) {
    const height = Math.min(BAND, h - y);
    if (height < 50) break;
    const p = pathFor(y);
    await page.screenshot({
      path: p,
      clip: { x: 0, y, width: w, height },
      animations: "disabled",
    });
    offsets.push(y);
    paths.push(p);
  }
  return { banded: true, offsets, paths };
}
```

## Step 4: `artifact-index.mjs`

```js
import { createHash } from "node:crypto";
import { readFile, writeFile, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";

export function createIndex(site, siteDir) {
  const artifacts = [],
    warnings = [];
  let bytes = 0;
  return {
    get bytes() {
      return bytes;
    },
    async add({ path, kind, pass, viewport, route, describes, extra }) {
      const st = await stat(path).catch(() => null);
      if (!st) {
        warnings.push({ code: "ARTIFACT_MISSING", affects: [path] });
        return;
      }
      bytes += st.size;
      artifacts.push({
        path: relative(siteDir, path),
        kind,
        pass: pass ?? null,
        viewport: viewport ?? null,
        route: route ?? null,
        bytes: st.size,
        sha256: createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
        describes, // plain English — this is what makes the tree agent-usable
        ...(extra ?? {}),
      });
    },
    warn(w) {
      warnings.push(w);
    },
    async write() {
      await writeFile(
        resolve(siteDir, "index.json"),
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
      );
      return { artifacts: artifacts.length, warnings: warnings.length, bytes };
    },
  };
}
```

`describes` is not optional and not a label. It is a plain-English sentence stating what the artifact
shows, because an agent reads `index.json`, picks twelve relevant artifacts by this field, and opens
only those instead of globbing three thousand files. `"hero section at desktop"` is too thin;
`"hero section, native pass, desktop 1440x900 — full-bleed video background with centred wordmark"`
is the standard.

## Step 5: the orchestrator

Required behaviours:

- `DISK_CEILING_BYTES = 12 * 1024 ** 3`, module-level `runBytes` accumulator. Check the ceiling
  **between units of work** so an abort leaves already-written sites valid and still writes the
  current site's `index.json`. Use a `DiskCeilingError` class so the per-site catch can rethrow it
  while swallowing ordinary site failures.
- Per-site `try/catch/finally`: **one site failing must never abort the run** (Review Focus #1). The
  catch records `SITE_FAILED` with the error; the `finally` always writes `index.json` and logs a
  one-line summary. Exit code stays 0 for a site failure — a 403 on one origin is data, not a crash.
- `capturePass()` per Ruling 7 above, with `TODO(task-N)` stubs for phase bodies.
- Site directories: `docs/ui-references/<slug>/` with subdirs `shots/ sections/ scroll/ states/
video/ transitions/ effects/ network/`. Created up front; `--clean` removes the site dir first.
- Never timestamp the run directory — re-runs overwrite in place, or the tree grows without bound.

## Step 6: verification

Run all three with `dangerouslyDisableSandbox: true`.

```bash
# 1. The matrix is inspectable without touching the network.
cd /Users/mj/repos/mccor-labs && node scripts/capture-reference-site.mjs --dry-run
```

Expected: a printed matrix covering all ten sites, with tier-1 sites showing 4 viewports and tier-2/3
showing 2, and both passes per (route, viewport). Exit 0.

```bash
# 2. Orchestrator + factory + index on the cheapest single site.
cd /Users/mj/repos/mccor-labs && node scripts/capture-reference-site.mjs --site helloshivam --clean 2>&1 | tail -20
```

Expected: `docs/ui-references/helloshivam/index.json` exists and parses; `artifactCount` is 0 at this
stage because phase bodies are stubs; process exits 0. This proves orchestrator, context factory,
index writer, and per-site isolation work before any capture logic lands.

```bash
# 3. Review Focus #1 — one unreachable site must not abort the run.
cd /Users/mj/repos/mccor-labs && node scripts/capture-reference-site.mjs --site __probe_unreachable 2>&1 | tail -5; echo "EXIT=$?"
```

For this, temporarily append a throwaway entry to `SITES` pointing at
`https://this-host-does-not-exist.invalid`, run it, then **remove the entry again**. Expected: a
`SITE_FAILED` warning written into that site's `index.json`, and `EXIT=0`. A non-zero exit means one
bad origin would cost the other nine.

## Definition of done for this task

1. All five files exist with JSDoc headers.
2. Every exported signature matches the Interfaces block exactly — Tasks 5–9 are written against it.
3. All ten CLI flags from Ruling 6 are implemented; `--dry-run` works and its output is in your report.
4. `capturePass()` encodes the Ruling 7 order and wiring, with phase bodies stubbed as `TODO(task-N)`.
5. All three Step 6 verifications ran, with verbatim output in your report, and #3 exited 0.
6. No third-party binary anywhere under `docs/ui-references/`.
7. `git status --short` shows new files untracked. Nothing staged, nothing committed.
