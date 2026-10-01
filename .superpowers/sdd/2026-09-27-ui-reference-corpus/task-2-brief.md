# Task 2: Recon script

**These are your requirements. Use every value below verbatim.**

## Files

- Create: `scripts/recon-reference-sites.mjs`

## Interfaces

- Consumes: `@playwright/test` (installed by Task 1).
- Produces: `docs/ui-references/_recon/<slug>.json` per site, shaped
  `{slug, origin, tier, capturedAt, warnings[], meta, candidateSections[], discoveredRoutes[], windowGlobals, candidateSelectors, stylesheets[]}`.
  Task 3 reads these files and transcribes them into `scripts/lib/sites.mjs`.

## Global Constraints (bind this task)

- **Never write to git. Hardened rule (Controller Ruling 11), not a preference:** `git add` (in any
  form, including `-A` and `.`), `git commit`, `git push`, `git stash`, `git checkout`, and
  `git clean` are **forbidden outright**. Read-only `git status` / `git diff` / `git log` are fine.
  Reason this is absolute: a third party is concurrently working in this same tree and currently has
  3 staged Terraform files (`infra/deploy.sh`, `infra/setup/backend.tf`, `infra/setup/main.tf`). Any
  broad `git add` would capture a stranger's unfinished work into our change, and `git clean` would
  destroy it. Leave every path you did not create exactly as you found it.
- **Every Bash step that launches a browser must run with `dangerouslyDisableSandbox: true`.** The
  sandbox denies Chromium's Mach port lookup and its `listen()` call; the errors never name the
  sandbox and surface as `bootstrap_check_in ... Permission denied (1100)` or a bare launch timeout.
- **Download nothing.** This script writes JSON only. No images, no fonts, no media, no scripts.
- **A number not measured in the run that wrote it does not go in a file.** Unmeasured values are
  `null`, never guessed.
- Script conventions: plain `.mjs`, bare `node`, `node:`-prefixed builtins only,
  `resolve(import.meta.dirname, "..")` for repo root, `process.argv.includes("--flag")` parsing,
  JSDoc header stating requirements + literal invocations + known failure modes.
- Import is `import { chromium } from "@playwright/test";` — **never** from `playwright`, which is
  unhoisted and returns `MODULE_NOT_FOUND`.

## CONTROLLER RULING 4 — this overrides the plan's code sample

The plan's draft passed the recon payload to `page.evaluate` as a **concatenated string**
(`PAGE_HELPERS + RECON_PAYLOAD`). That is a defect: `page.evaluate(string)` evaluates its argument
as a single **expression**, and a function declaration followed by an IIFE is two statements — it
throws `SyntaxError`.

**Pass the payload as a function instead, with `uniqueSelector` declared inside it.** Playwright
serialises the function body and evaluates it in page scope, so every page-scope helper must live
inside that same function. Do not use `addInitScript` for this and do not concatenate strings.

## Steps

- [ ] **Step 1: Write the JSDoc header and the origin list**

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
 * WHY THE PAYLOAD IS A FUNCTION, NOT A STRING
 *   page.evaluate(string) evaluates its argument as a single expression. A helper declaration
 *   followed by an IIFE is two statements and throws SyntaxError. Passing a function makes
 *   Playwright serialise the body, so page-scope helpers must be declared inside it.
 *
 * KNOWN FAILURE MODES
 *   - Bot protection (Shopify, Cloudflare-fronted origins) may return 403 or a challenge page.
 *     Recorded as a warning per site; the run continues to the next site.
 *   - Cross-origin stylesheets throw SecurityError on .cssRules. Recorded per sheet as
 *     `stylesheets[].readable = false`; this predicts which sites need the refetch path in capture.
 *   - Sites built from div soup expose zero <section> elements; `candidateSections` then comes
 *     from the heuristic fallback and `meta.outlineSource` says `heuristic-fallback`.
 */
import { chromium } from "@playwright/test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "docs/ui-references/_recon");

const ORIGINS = [
  { slug: "david-hckh", origin: "https://david-hckh.com", tier: 1 },
  { slug: "pacomepertant", origin: "https://pacomepertant.com", tier: 1 },
  { slug: "topology-vc", origin: "https://www.topology.vc", tier: 1 },
  { slug: "belenjones", origin: "https://www.belenjones.com", tier: 1 },
  { slug: "squadeasy", origin: "https://www.squadeasy.com", tier: 2 },
  { slug: "y-n10", origin: "https://y-n10.com", tier: 2 },
  { slug: "shopify", origin: "https://www.shopify.com", tier: 2 },
  { slug: "raggededge", origin: "https://raggededge.com", tier: 3 },
  { slug: "guglieri", origin: "https://guglieri.com", tier: 3 },
  { slug: "helloshivam", origin: "https://www.helloshivam.com", tier: 3 },
];

const HEADFUL_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
```

- [ ] **Step 2: Write the recon payload as ONE function**

`uniqueSelector` is declared inside the payload function. Skip class names that look like state
flags (`is-`, `has-`, `js-`) or generated hashes (four or more consecutive digits) — those change
between visits and make the selector non-durable.

```js
const RECON_PAYLOAD = () => {
  function uniqueSelector(el) {
    if (
      el.id &&
      document.querySelectorAll("#" + CSS.escape(el.id)).length === 1
    ) {
      return "#" + CSS.escape(el.id);
    }
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      if (node.id) {
        parts.unshift("#" + CSS.escape(node.id));
        break;
      }
      let part = node.tagName.toLowerCase();
      part += [...node.classList]
        .filter((c) => !/^(is-|has-|js-)/.test(c) && !/\d{4,}/.test(c))
        .slice(0, 2)
        .map((c) => "." + CSS.escape(c))
        .join("");
      const parent = node.parentElement;
      if (parent) {
        const sibs = [...parent.children].filter(
          (s) => s.tagName === node.tagName,
        );
        if (sibs.length > 1) part += `:nth-of-type(${sibs.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  const SECTION_SEL =
    "section, [data-scroll-section], [data-barba] > div, main > div, main > section";
  let els = [...document.querySelectorAll(SECTION_SEL)];
  let outlineSource = "selector";

  // Review Focus #2: div-soup sites expose no <section>. Fall back to direct children of the
  // most plausible content root that occupy a meaningful share of the viewport.
  if (els.length < 2) {
    outlineSource = "heuristic-fallback";
    const root =
      document.querySelector(
        'main, [data-barba="container"], #__next, #root',
      ) || document.body;
    els = [...root.children].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.height > innerHeight * 0.3 && r.width > innerWidth * 0.5;
    });
  }

  const candidateSections = els.map((el, i) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const h = el.querySelector(
      'h1, h2, h3, [class*="title"], [class*="heading"]',
    );
    return {
      index: i,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classList: [...el.classList],
      selector: uniqueSelector(el),
      rect: {
        x: Math.round(r.x),
        y: Math.round(r.y + scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
      },
      firstHeading: h ? h.textContent.trim().slice(0, 120) : null,
      background: cs.backgroundColor,
      backgroundImage:
        cs.backgroundImage === "none" ? null : cs.backgroundImage.slice(0, 200),
      padding: [
        cs.paddingTop,
        cs.paddingRight,
        cs.paddingBottom,
        cs.paddingLeft,
      ],
      hasVideo: !!el.querySelector("video"),
      hasCanvas: !!el.querySelector("canvas"),
      childCount: el.children.length,
    };
  });

  const navRoot = document.querySelector("nav, header");
  const discoveredRoutes = [...document.querySelectorAll("a[href]")]
    .map((a) => {
      let u;
      try {
        u = new URL(a.getAttribute("href"), location.href);
      } catch {
        return null;
      }
      if (u.origin !== location.origin) return null;
      if (/\.(pdf|jpe?g|png|zip|mp4|webm|svg)$/i.test(u.pathname)) return null;
      u.hash = "";
      return {
        url: u.href.replace(/\/$/, "") || u.origin,
        text: a.textContent.trim().slice(0, 80),
        inNav: !!(navRoot && navRoot.contains(a)),
      };
    })
    .filter(Boolean)
    .filter((r, i, arr) => arr.findIndex((o) => o.url === r.url) === i);

  const G = (name) => {
    try {
      const v = window[name];
      if (v === undefined) return null;
      return {
        present: true,
        version: v?.version ?? v?.VERSION ?? null,
        type: typeof v,
      };
    } catch {
      return null;
    }
  };
  const windowGlobals = Object.fromEntries(
    [
      "Lenis",
      "locomotiveScroll",
      "LocomotiveScroll",
      "__lenis",
      "__loco",
      "barba",
      "gsap",
      "ScrollTrigger",
      "Swiper",
      "pJSDom",
      "particlesJS",
      "THREE",
      "Typed",
      "SplitType",
      "React",
      "Vue",
      "__NEXT_DATA__",
      "__NUXT__",
      "Shopify",
      "jQuery",
      "wp",
      "Alpine",
      "motion",
      "Framer",
    ]
      .map((n) => [n, G(n)])
      .filter(([, v]) => v !== null),
  );
  windowGlobals.webpackChunkKeys = Object.keys(window).filter((k) =>
    /^webpackChunk/.test(k),
  );

  const pick = (sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) {
        return {
          selector: uniqueSelector(el),
          matchedHeuristic: s,
          text: el.textContent?.trim().slice(0, 60) || null,
        };
      }
    }
    return null;
  };
  const candidateSelectors = {
    primaryCta: pick([
      '[class*="cta"] a',
      'a[class*="button"]',
      'button[class*="primary"]',
      'header a[class*="btn"]',
      'main a[class*="btn"]',
    ]),
    navToggle: pick([
      '[class*="burger"]',
      '[class*="hamburger"]',
      '[aria-label*="enu" i]',
      "button[aria-expanded]",
      '[class*="menu-toggle"]',
    ]),
    card: pick([
      '[class*="card"]',
      "article",
      '[class*="project"]',
      '[class*="item"][class*="grid"]',
      'li[class*="work"]',
    ]),
    signatureEffect: pick([
      "canvas",
      "video[autoplay]",
      "[data-scroll][data-scroll-speed]",
      '[class*="marquee"]',
      '[class*="parallax"]',
      'svg[class*="blob"]',
    ]),
  };

  const stylesheets = [...document.styleSheets].map((s) => {
    let readable = true,
      ruleCount = null,
      err = null;
    try {
      ruleCount = s.cssRules.length;
    } catch (e) {
      readable = false;
      err = e.name;
    }
    return {
      href: s.href,
      ownerTag: s.ownerNode?.tagName?.toLowerCase() ?? null,
      readable,
      ruleCount,
      error: err,
    };
  });

  return {
    meta: {
      title: document.title,
      lang: document.documentElement.lang || null,
      generator:
        document.querySelector('meta[name="generator"]')?.content ?? null,
      viewportMeta:
        document.querySelector('meta[name="viewport"]')?.content ?? null,
      finalUrl: location.href,
      docScrollHeight: document.documentElement.scrollHeight,
      htmlClasses: [...document.documentElement.classList],
      outlineSource,
    },
    candidateSections,
    discoveredRoutes,
    windowGlobals,
    candidateSelectors,
    stylesheets,
  };
};
```

- [ ] **Step 3: Write the per-site driver, with route dedup by FINAL url**

Review Focus #5: a route that 302s to home must not become a second directory holding identical
captures. Dedup on the URL **after redirects**, not the href as authored.

```js
async function reconSite(browser, site) {
  const warnings = [];
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    userAgent: HEADFUL_UA,
    locale: "en-US",
    timezoneId: "America/Chicago",
    colorScheme: "light",
  });
  const page = await ctx.newPage();
  let data = null;
  try {
    const res = await page.goto(site.origin, {
      waitUntil: "load",
      timeout: 45000,
    });
    const status = res?.status() ?? 0;
    if (status >= 400)
      warnings.push({ code: "HTTP_ERROR", status, affects: [site.origin] });
    // networkidle is a HINT, never a gate — Vimeo and GTM poll forever and it never fires.
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    data = await page.evaluate(RECON_PAYLOAD);
    data.meta.status = status;

    const seen = new Map([[data.meta.finalUrl.replace(/\/$/, ""), "/"]]);
    for (const r of data.discoveredRoutes) {
      if (seen.size > 12) break;
      const head = await page.request
        .get(r.url, { maxRedirects: 5 })
        .catch(() => null);
      const finalUrl = (head?.url() ?? r.url).replace(/\/$/, "");
      r.finalUrl = finalUrl;
      r.status = head?.status() ?? null;
      r.duplicateOf = seen.has(finalUrl) ? seen.get(finalUrl) : null;
      if (!seen.has(finalUrl)) seen.set(finalUrl, r.url);
    }
  } catch (err) {
    warnings.push({
      code: "RECON_FAILED",
      message: String(err).slice(0, 300),
      affects: [site.origin],
    });
  } finally {
    await ctx.close();
  }
  return {
    slug: site.slug,
    origin: site.origin,
    tier: site.tier,
    capturedAt: new Date().toISOString(),
    warnings,
    ...(data ?? {}),
  };
}
```

- [ ] **Step 4: Write `main()` — sequential; one site failing never aborts the rest**

Review Focus #1: a 403 or challenge page on one origin must not cost the other nine.

```js
async function main() {
  const argv = process.argv;
  const only = argv.includes("--site")
    ? argv[argv.indexOf("--site") + 1]
    : null;
  if (argv.includes("--clean")) await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const targets = only ? ORIGINS.filter((s) => s.slug === only) : ORIGINS;
  if (only && !targets.length) {
    throw new Error(
      `unknown --site ${only}; known: ${ORIGINS.map((s) => s.slug).join(", ")}`,
    );
  }

  const browser = await chromium.launch();
  try {
    for (const site of targets) {
      process.stdout.write(`recon ${site.slug} … `);
      const out = await reconSite(browser, site);
      await writeFile(
        resolve(OUT, `${site.slug}.json`),
        JSON.stringify(out, null, 2),
      );
      console.log(
        `${out.candidateSections?.length ?? 0} sections, ` +
          `${out.discoveredRoutes?.length ?? 0} routes, ${out.warnings.length} warnings`,
      );
    }
  } finally {
    await browser.close();
  }
}
await main();
```

- [ ] **Step 5: Run it, sandbox disabled**

Run with `dangerouslyDisableSandbox: true`:

```bash
cd /Users/mj/repos/mccor-labs && node scripts/recon-reference-sites.mjs --clean 2>&1 | tail -20
```

Expected: ten lines, each reporting a non-zero section count. A site reporting `0 sections` means
both the selector list and the heuristic fallback missed — inspect that site's JSON and report it.

- [ ] **Step 6: Verify the Review Focus guards actually fired**

```bash
cd /Users/mj/repos/mccor-labs && node -e '
import("node:fs").then(({ readFileSync, readdirSync }) => {
  for (const f of readdirSync("docs/ui-references/_recon")) {
    const d = JSON.parse(readFileSync("docs/ui-references/_recon/" + f, "utf8"));
    const dupes = (d.discoveredRoutes ?? []).filter(r => r.duplicateOf).length;
    const unreadable = (d.stylesheets ?? []).filter(s => !s.readable).length;
    console.log(f.padEnd(22), "outline:", String(d.meta?.outlineSource).padEnd(18),
                "| sections:", String(d.candidateSections?.length).padEnd(4),
                "| dup routes:", String(dupes).padEnd(3),
                "| CORS sheets:", String(unreadable).padEnd(3),
                "| warn:", d.warnings.length);
  }
});'
```

Expected: every site prints a row. Record in your report which sites report unreadable stylesheets —
those are the ones Task 5's refetch path must handle. Record which report `heuristic-fallback`.

## Definition of done for this task

1. `scripts/recon-reference-sites.mjs` exists with the full JSDoc header from Step 1.
2. The Step 5 run completed and wrote ten files under `docs/ui-references/_recon/`.
3. Every written JSON parses and contains the keys `meta`, `candidateSections`,
   `discoveredRoutes`, `windowGlobals`, `candidateSelectors`, `stylesheets`, `warnings`.
4. The Step 6 table is in your report, verbatim.
5. No image, font, media, or script file was written anywhere. Only `.json`.
6. `git status --short` shows the new files as untracked. Nothing staged, nothing committed.
