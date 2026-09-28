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
  const payloadWarnings = [];

  // Review Focus #2: div-soup sites expose no <section>. Fall back to direct children of the
  // most plausible content root that occupy a meaningful share of the viewport. Fix round 1
  // (Controller feedback on the first recon run): the previous version stopped at direct
  // children of the root, so a single full-page wrapper (#app, #__next, a preloader) satisfied
  // the viewport-share test and was returned as if it were the whole outline. Descend instead
  // when a level collapses to a single wrapper.
  if (els.length < 2) {
    outlineSource = "heuristic-fallback";
    let node =
      document.querySelector(
        'main, [data-barba="container"], #__next, #__nuxt, #app, #main, #gatsby-focus-wrapper, #root',
      ) || document.body;
    const isCandidate = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      if (/^(script|style|noscript|svg|canvas)$/i.test(el.tagName)) return false;
      if (/loader|preloader|cursor|scrollbar/i.test(el.className || "")) return false;
      return r.height > innerHeight * 0.25 && r.width > innerWidth * 0.5;
    };
    // Fix round 2 Bug 1 (Controller's own bug in the round-1 fallback): this relaxed branch
    // had no tag/class exclusions, so a bare <canvas> or <svg> — already rejected one branch
    // earlier by isCandidate — sailed through here instead. Reuse the same exclusions, only
    // relaxing the size threshold.
    const relaxed = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      if (/^(script|style|noscript|svg|canvas|iframe)$/i.test(el.tagName)) return false;
      if (/loader|preloader|cursor|scrollbar/i.test(el.className || "")) return false;
      return el.getBoundingClientRect().height > 40;
    };
    // Descend while the level collapses to a single wrapper: a 1-element level is not an
    // outline, it is a container. Cap the depth so a deeply nested wrapper chain terminates.
    for (let depth = 0; depth < 6; depth++) {
      const kids = [...node.children].filter(isCandidate);
      if (kids.length >= 2) {
        els = kids;
        break;
      }
      if (kids.length === 1) {
        node = kids[0];
        continue;
      }
      const any = [...node.children].filter(relaxed);
      if (any.length >= 2) {
        els = any;
        break;
      }
      if (any.length === 1) {
        node = any[0];
        continue;
      }
      break;
    }
    if (els.length < 2) {
      payloadWarnings.push({
        code: "OUTLINE_FALLBACK_EXHAUSTED",
        message: `descended 6 levels from ${node.tagName}${node.id ? "#" + node.id : ""} without finding 2+ candidate sections`,
      });
    }
  }

  // Fix round 2 (revised): a height-percentage reject cannot tell a wrapper from a tall hero
  // section — it killed a legitimate 3350px "home" hero on a page whose scrollHeight was only
  // a little taller. Containment is the exact test: a wrapper's defining property is that it
  // CONTAINS the other candidates, not that it is tall. Applies to both the selector path and
  // the fallback path above, since both assign into `els`. Guarded so a two-level nest cannot
  // prune the list down to nothing.
  const pruned = els.filter(
    (el) => !els.some((other) => other !== el && el.contains(other)),
  );
  if (pruned.length >= 2) els = pruned;

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

  // Fix round 2 addition 2: raw heading offsets, the material scroll-band naming needs when
  // DOM sectioning is not trustworthy for a site. scrollY drives the offset only when nothing
  // smoother is running: a Lenis/Locomotive-scrolled page moves content with a transform while
  // window.scrollY can lag or stay near 0, so prefer whichever library's own reported scroll
  // exists and label which source produced the numbers rather than guess silently.
  let absYSource = "window.scrollY";
  let smoothScrollY = null;
  try {
    if (window.__lenis && typeof window.__lenis.scroll === "number") {
      smoothScrollY = window.__lenis.scroll;
      absYSource = "lenis";
    } else if (
      window.__loco &&
      typeof window.__loco.scroll?.instance?.scroll?.y === "number"
    ) {
      smoothScrollY = window.__loco.scroll.instance.scroll.y;
      absYSource = "loco";
    }
  } catch {
    smoothScrollY = null;
    absYSource = "window.scrollY";
  }
  const effectiveScrollY =
    typeof smoothScrollY === "number" ? smoothScrollY : scrollY;

  const headings = [
    ...document.querySelectorAll(
      'h1, h2, h3, [class*="title"], [class*="heading"]',
    ),
  ]
    .map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
        absY: Math.round(r.top + effectiveScrollY),
        h: Math.round(r.height),
        fontSizePx: parseFloat(cs.fontSize),
        fontWeight: cs.fontWeight,
      };
    })
    .filter((x) => x.text)
    .sort((a, b) => a.absY - b.absY);

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
      // Fix round 2 addition 1: some of these sites genuinely have no trustworthy DOM
      // sectioning (WebGL canvas content, Framer's generated class names, Gatsby transition
      // wrappers). Rather than keep tightening the heuristic, say which mode capture should
      // use: "dom" sections are real, "scroll-bands" means capture must define sections as
      // measured scroll-offset bands instead. The wrapper case is now handled upstream by the
      // containment prune on `els`, so this no longer needs its own height check.
      recommendedSectionMode: candidateSections.length >= 3 ? "dom" : "scroll-bands",
      absYSource,
    },
    candidateSections,
    discoveredRoutes,
    windowGlobals,
    candidateSelectors,
    stylesheets,
    headings,
    // Page-scope warnings (e.g. the fallback exhausting its descent) surfaced back to Node;
    // reconSite merges these into the site-level `warnings` array and strips this key.
    __warnings: payloadWarnings,
  };
};

// Preloaders on JS-driven sites cover the viewport well after `load` fires. Outlining then
// returns the loader as if it were a content section. Wait for it to leave, then for the
// document to actually be taller than a viewport.
async function waitForContent(page, warnings) {
  const LOADER_SEL =
    '.loader, .preloader, [class*="loader"], [class*="preloader"], [id*="loader"]';
  await page
    .waitForFunction(
      (sel) => {
        const els = [...document.querySelectorAll(sel)];
        const covering = els.some((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return (
            cs.display !== "none" &&
            cs.visibility !== "hidden" &&
            Number(cs.opacity) > 0.05 &&
            r.width * r.height > innerWidth * innerHeight * 0.5
          );
        });
        return (
          !covering && document.documentElement.scrollHeight > innerHeight * 1.2
        );
      },
      LOADER_SEL,
      { timeout: 20000 },
    )
    .catch(() => {
      warnings.push({
        code: "CONTENT_READY_TIMEOUT",
        message:
          "loader still covering or document never exceeded 1.2x viewport after 20s",
      });
    });
  await page.waitForTimeout(1200); // intro animations settle; these sites run 1-3s reveals
}

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
    await waitForContent(page, warnings);
    // Fix round 1, sweep #2: several sites mount sections on scroll. Walk to the bottom in
    // steps before outlining so lazy content has already mounted, then return to top.
    await page.evaluate(async () => {
      const step = innerHeight * 0.8;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
    });
    data = await page.evaluate(RECON_PAYLOAD);
    data.meta.status = status;
    if (data.__warnings?.length) warnings.push(...data.__warnings);
    delete data.__warnings;

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
