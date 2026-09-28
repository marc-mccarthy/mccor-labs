/**
 * sites.mjs — the durable, measured record of the ten reference websites.
 *
 * REQUIREMENTS
 * 1. Every selector here resolved to a real element count in a live browser during the run that
 *    wrote this file (2026-09-27). Nothing is transcribed from a heuristic that was not re-checked.
 * 2. A `null` is a MEASUREMENT: it means "looked, found nothing". An invented selector is worse
 *    than none, because it produces a blank PNG that looks like a successful capture — the single
 *    failure mode this corpus exists to prevent.
 * 3. `archetype`, `entry`, `sections`, `states` and `scrollDriver` are per ROUTE, not per site.
 *    pacomepertant is archetype C on `/` and archetype A on `/about`.
 * 4. Section slugs name the ROLE a visitor would recognise, not the author's class name. They
 *    become screenshot filenames and propagate into the UI spec.
 *
 * ARCHETYPES (plan v2, "The three archetypes")
 *   A — scrolling DOM     : a section is a DOM element; real scroll.
 *   B — in-place swap     : a section is a nav state; no scroll.
 *   C — canvas scene      : a section is an interaction state; viewport shots only.
 *
 * SOURCE AUTHORITY, highest first — where sources conflicted, the higher one was taken and the
 * conflict is noted inline:
 *   owner's real clicks (interaction-model.md)
 *   > pixel-verified screenshots (visual-confirm.md)
 *   > live DOM probes (deepdive-hard-sites.md, and this run's own probes)
 *   > scripted recon (docs/ui-references/_recon/*.json)
 *
 * INVOCATION: imported by scripts/verify-site-selectors.mjs and every capture task.
 *   node scripts/verify-site-selectors.mjs [--site <slug>] [--headed]
 *
 * FAILURE MODES this file is shaped to prevent:
 *   - A stale selector produces an empty screenshot, not an error. Hence `verify-site-selectors`.
 *   - A selector that resolves at desktop but not mobile produces a plausible blank PNG. Hence
 *     viewport-limited entries `{selector, viewports:[...]}`, which capture SKIPS elsewhere.
 *   - A gate click that navigates away ("Enter" inside "Enterprise") photographs the wrong page.
 *     Hence `entry.exact` and the same-URL assertion in the verifier / Task 4's enterRoute.
 *   - A height measured through a consent banner is wrong (raggededge: 17821 up, 11770 dismissed).
 *     Hence `quirks.consentBanner` and both heights recorded.
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

/**
 * Selector keys under `selectors` that are repeating units by definition and must NOT be asserted
 * unique. `card` names a grid cell: helloshivam has 22, belenjones 9, david-hckh 5. Forcing
 * `:nth-of-type(1)` onto them to satisfy a count===1 check would fabricate a record of a card grid
 * that does not exist. The verifier asserts `>= 1` for these and prints the measured count.
 */
export const MULTI_MATCH_SELECTOR_KEYS = new Set(['card'])

export const SITES = [
  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: 'david-hckh',
    origin: 'https://david-hckh.com',
    tier: 1,
    // htmlClasses ["lenis"] on every route, measured this run.
    smoothScroll: 'lenis',
    routes: [
      {
        name: 'home',
        url: 'https://david-hckh.com/',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: 5865,
        sections: {
          // #hero is the sticky illustrated masthead, h=900, h1 "David Heckhoff".
          hero: '#hero',
          // The pinned WebGL stage the hero/skills copy scrolls through. This is the site's
          // signature effect in situ, not a wrapper.
          'intro-stage':
            '#app > div:nth-of-type(1) > div.home-wrapper > div.layout > div.intro-wrapper > div.intro-sticky',
          // "Selected Projects" — heading plus the 2-up card grid. GRID CALL: see quirks.gridCalls.
          work: '#projects',
          contact:
            '#app > div:nth-of-type(1) > div.home-wrapper > div.layout > div.home-contact',
        },
        // DROPPED: `#about` — measured this run as a 2250px `div.about-spacer` with ZERO children.
        // It is the scroll spacer that drives the sticky stage, not an about section; shooting it
        // yields a blank 2250px band. Also dropped: `#app > header.header` (fixed chrome),
        // `div.cursor-wrapper` (custom cursor), `div.project-background*` (transition layers).
      },
      ...['cubewar', 'quibbo', 'sharkie'].map((p) => ({
        name: `project-${p}`,
        url: `https://david-hckh.com/project/${p}`,
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        // cubewar 4779, quibbo 4715 measured this run; sharkie measured at capture time.
        docScrollHeight: null,
        sections: {
          'project-hero':
            '#app > div.project-wrapper > div.project-content > div.project > div.project-content-wrapper > div.layout > div.project-hero',
          // GRID CALL: 7 children of varying heights = stacked media modules, not a card grid.
          // Named as ONE section rather than seven.
          'project-body':
            '#app > div.project-wrapper > div.project-content > div.project > div.project-content-wrapper > div.layout > div.project-content-components',
          'next-project':
            '#app > div.project-wrapper > div.project-content > div.project > div.project-content-wrapper > div.layout > div.project-content-next-project-grid',
          'project-footer':
            '#app > div.project-wrapper > div.project-content > div.project > div.project-content-wrapper > footer.project-footer',
        },
      })),
    ],
    selectors: {
      primaryCta: 'a.button-wrapper.button-wrapper-accent', // "Get in touch", count 1
      navToggle: null, // no hamburger at desktop; header items are 3 buttons, not a toggle
      // OWNER-MEASURED (interaction-model): the card is the click target and its children carry
      // pointer-events:none (`children-unclickable`). 6 `a.preview-card` exist; 5 carry a
      // /project/ href and the 6th is "Start a new project". The href form is the card grid.
      card: 'a.preview-card[href^="/project/"]',
      signatureEffect: 'canvas.three-canvas',
    },
    effects: { video: true, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: false,
      splitHeadings: false,
      // Doubled text nodes: headings render as "DavidDavid", "SelectedSelected" (duplicated for a
      // stagger/mask effect). Typography extraction must dedupe or report the doubling.
      doubledHeadingText: true,
      interactionTempo:
        '0.1s ease-in-out on header-link and button-wrapper (hover-deltas.json)',
      gridCalls: [
        '#projects: children are 2 notch decorations + a heading grid + a 981px card grid. Named the PARENT `work` as one section; the card unit is selectors.card.',
        'project routes: div.project-content-components has 7 same-shaped children (media modules). Named the parent `project-body`.',
      ],
      // `a.preview-card` and `a.c-nav__link` report NO computed change on hover — the effect is on
      // a child. Task 8 must re-probe children before recording "no hover state".
      hoverEffectOnChild: ['a.preview-card'],
      localStorageKeys: ['portfolio-soundsEnabled', 'portfolio-locale'],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: 'pacomepertant',
    origin: 'https://pacomepertant.com',
    tier: 1,
    smoothScroll: 'lenis', // html class "lenis"; window.lenis + window.lenisVersion present
    routes: [
      {
        name: 'home',
        url: 'https://pacomepertant.com/',
        archetype: 'C',
        entry: {
          kind: 'button',
          selector: 'main button.enter',
          match: 'enter with sound',
          exact: false, // textContent is DOUBLED: "enter with soundenter with sound"
          // MEASURED THIS RUN, and it CONTRADICTS plan Task 4's universal raw-mouse recipe:
          // locator.click() enters reliably even headless (main.children 1->0, loader gone);
          // page.mouse.move+down+up at the same measured rect centre does NOT (loader stays).
          // The opposite of y-n10. Hence an explicit per-route method.
          method: 'locator',
          // MEASURED: 3s works, and waiting LONGER stops working — at ~30s after load the click
          // no longer enters. The gate is timing-sensitive in both directions.
          settleBeforeMs: 3000,
          verifiedViewports: ['wide', 'desktop', 'tablet', 'mobile'],
          note: "substring match required; 'enter without sound' also exists. Sound is design intent, so the with-sound variant is chosen.",
        },
        scrollDriver: null, // lenis.limit === 0; the page genuinely does not scroll
        docScrollHeight: 900, // 900 BEFORE and AFTER entry — it is a 3D orbit scene, not a tall page
        sections: {}, // no DOM sections: main is empty post-entry, everything is canvas.webgl
        states: [
          { slug: 'spiral', action: null },
          // `.switch .button` = 2 (spiral, list). locator.click() TIMES OUT on both even headed;
          // drive with a raw mouse click at the measured rect centre.
          {
            slug: 'list',
            action: {
              rawClick: '.switch .button:nth-of-type(2)',
            },
          },
          {
            slug: 'menu-open',
            action: { rawClick: 'nav > div.wrapper:first-child' },
          },
        ],
      },
      {
        name: 'about',
        url: 'https://pacomepertant.com/about',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo', // all three of scrollTo / scrollTop / lenis.scrollTo work
        docScrollHeight: 5760,
        sections: {
          // Bare `main > div.wrapper` resolves to 3 — the :nth-of-type qualifier is mandatory.
          intro: 'main > div.wrapper:nth-of-type(1) > div.inner',
          bio: 'main > div.wrapper:nth-of-type(1)',
          'work-thumbnails': 'main > div.wrapper:nth-of-type(2)',
          contact: 'main > div.wrapper:nth-of-type(3)',
          'image-trail': '.image-trail',
          socials: '.socials',
          credits: 'p.credits',
        },
      },
    ],
    selectors: {
      // The entry gate is recorded under route.entry, not here: post-entry it does not exist, so
      // listing it as primaryCta would make the verifier assert a button that is gone by design.
      primaryCta: null,
      navToggle: 'nav > div.wrapper:first-child', // "menu"/"close"; bare `nav .wrapper` = 2
      card: null, // no DOM cards anywhere — the spiral thumbnails are WebGL
      signatureEffect: 'canvas.webgl',
    },
    effects: { video: true, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: false,
      splitHeadings: false,
      doubledHeadingText: true, // "spiralspiral", "listlist", the doubled entry button
      // REFUTES the plan's stated fact. Plan v2 Task 3 says `/projects/jupiter` is a real
      // archetype-A route at 2868px. MEASURED THIS RUN: /projects/jupiter returns HTTP 404
      // ("Server Error"). Clicking a spiral card client-side navigates to a REAL project view —
      // observed /projects/chromatik, 4051px, 1 video — but loading that same URL directly,
      // with or without a trailing slash, also returns 404. Project pages are reachable only by
      // in-page interaction, so they are NOT listed as routes: a capture pointed at one would
      // photograph a 404 page and index it as a project.
      clientSideOnlyRoutes: {
        observed: '/projects/chromatik',
        directLoadStatus: 404,
        reachedBy: 'raw mouse click on canvas.webgl at a spiral card position',
        planClaimRefuted: '/projects/jupiter — 404 on direct load',
      },
      // Post-entry: main.children 1 -> 0 while the visible page gets RICHER. The entry signal is
      // the gate DISAPPEARING, never content growth.
      entrySignal: 'main .loader count 1 -> 0',
      noStoragePersistence: true, // 0 keys before/after; every fresh context must click through
      gridCalls: [],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: 'topology-vc',
    origin: 'https://www.topology.vc',
    tier: 1,
    smoothScroll: 'lenis', // html class "has-smoothscroll"; main carries classes lenis + lenis-stopped
    routes: [
      {
        name: 'home',
        url: 'https://www.topology.vc/',
        archetype: 'B',
        entry: null,
        scrollDriver: null, // document is a fixed 900px and never scrolls
        docScrollHeight: 900,
        // These five `.js-anchor-section` ids all resolve to exactly 1. They sit at absolute
        // y=4110..7685 inside a non-scrolling 900px document because the swap is transform-driven;
        // that is why a section is a NAV STATE here, not a scroll position.
        sections: {
          hero: '#home',
          about: '#about-us',
          principles: '#our-principles',
          team: '#team',
          'public-goods': '#public-goods',
        },
        // MEASURED THIS RUN, refining interaction-model's "URL never changes": the desktop nav
        // resolves to 4 links whose hrefs ARE anchors (/#about-us etc.), so the hash does change.
        // The document still never scrolls; the swap is driven in JS off the anchor.
        states: [
          {
            slug: 'nav-about',
            action: { click: 'a.js-desktop-nav-link[href="/#about-us"]' },
          },
          {
            slug: 'nav-principles',
            action: { click: 'a.js-desktop-nav-link[href="/#our-principles"]' },
          },
          { slug: 'nav-team', action: { click: 'a.js-desktop-nav-link[href="/#team"]' } },
          {
            slug: 'nav-public-goods',
            action: { click: 'a.js-desktop-nav-link[href="/#public-goods"]' },
          },
        ],
      },
    ],
    selectors: {
      primaryCta: null, // recon found none and none was observed; not invented
      navToggle: 'button.menu-toggle', // present at every viewport; `d-none@sm` hides it on desktop
      card: null,
      signatureEffect: 'canvas#webgl', // z-index -1, behind the whole page
    },
    effects: { video: false, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: false,
      splitHeadings: false,
      // Recon logged CONTENT_READY_TIMEOUT here purely because the document never exceeds 1.2x the
      // viewport. That gate is wrong for archetype B and must not be treated as a load failure.
      contentReadyGateInapplicable: true,
      // A `[class*="enter"]` sweep matched a nav CONTAINER here and its centre click navigated to
      // the Public Goods subpage. There is no gate; never run a broad-class fallback on this site.
      falseGateHazard: '[class*="enter"] matches a nav container',
      gridCalls: [],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: 'belenjones',
    origin: 'https://www.belenjones.com',
    tier: 1,
    smoothScroll: 'none', // html/body className empty; gsapVersions present but no scroll hijack
    routes: [
      {
        name: 'home',
        url: 'https://www.belenjones.com/',
        archetype: 'C',
        entry: null, // NOT gated — the landing page is fully visible on load
        scrollDriver: null, // document stays 900px; the project overlay scrolls internally (3531)
        docScrollHeight: 900,
        sections: {
          // styled-components displayName prefixes are derived from the source filename plus the
          // component name, so `[class^="landing__X-"]` survives a rebuild. The `sc-803efe7c`
          // componentId and the `koBINu`-style generated class are build hashes — never select on
          // them ([class*="sc-803efe7c"] matches 149 elements).
          'project-nav': '[class^="landing__Nav-"]',
          cube: '[class^="landing__CubeWrapper-"]',
          'project-detail': '[class^="landing__Overlay-"]', // opacity 0 until a cube face is clicked
          'top-nav': '[class^="landing__TopNav-"]',
          about: '[class^="landing__InfoPanel-"]',
          'meta-footer': '[class^="landing__BottomNav-"]',
        },
        states: [
          { slug: 'landing', action: null },
          // OWNER-MEASURED + pixel-verified: the canvas IS the button. Clicking the project NAME
          // div is inert (bodyText frozen at 437/448 across every click). Clicking the canvas at
          // the on-screen position of a cube face opens the overlay (innerText 448 -> 1556).
          // Recorded as a FRACTION of the canvas box, measured at 1440x900 where the click landed
          // at (790, 425) on the "SENSE" face — a fraction is viewport-durable, a coordinate is not.
          {
            slug: 'project-open',
            action: { canvasClick: { selector: 'canvas', fx: 0.549, fy: 0.472 } },
          },
          {
            slug: 'project-next',
            action: {
              canvasClick: { selector: 'canvas', fx: 0.549, fy: 0.472 },
              then: {
                click: 'button[class^="landing__OverlayButton-"]:has-text("NEXT")',
              },
            },
          },
        ],
      },
    ],
    selectors: {
      // The ONLY <button> in the document at desktop ("Belen Jones" in the top nav). At 390px the
      // collapsed mobile chrome mounts two more, so `button` resolves to 3 there — viewport-limited.
      primaryCta: { selector: 'button', viewports: ['wide', 'desktop', 'tablet'] },
      navToggle: null, // mobile chrome exists in the DOM but measures height 0 at desktop
      card: '[class^="landing__NavigationButton-"]', // 9 project names — INERT, decoration only
      signatureEffect: 'canvas', // the rotating 3D project cube
    },
    effects: { video: true, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: true, // GSAP drives the cube and overlay
      splitHeadings: false,
      // `bodyText` is NOT a usable state signal here — it was frozen at 437/448 across inert
      // clicks. Assert on `visibleEls` (39 -> 49) or on overlay opacity instead.
      stateSignal: "visibleEls or [class^='landing__Overlay-'] opacity, never bodyText",
      customCursor: '[class^="landing__Cursor-"]', // fixed, z100, text "view project" — bakes into shots
      // Preloader animates to opacity 0 but STAYS in the DOM indefinitely (re-measured at 4s and
      // 10s). Wait for opacity 0, never for removal.
      preloader: '[class^="loader__LoaderContainer-"]',
      // A 45000px decorative strip at y=-22500. Any "tallest element" heuristic picks it and
      // photographs an empty band. This is exactly what the scripted recon pass did.
      decoyTallestElement: '[class^="landing__BgStrip-"]',
      fragileSelectors: ['[class*="sc-803efe7c"]', '.koBINu', '.hztDzf'],
      fragileReason:
        'styled-components componentId + generated class; both are build hashes',
      gridCalls: [
        "[class^='landing__BgStripSection-'] = 50 identical tiles inside landing__BgStrip. A grid of decoration, not sections — the parent is dropped entirely, not named.",
        "[class^='landing__NavigationButton-'] = 9 same-shaped items. Named the PARENT `project-nav`; the 9 are selectors.card.",
      ],
      routeEnumeration:
        'No routes: exactly 2 anchors in the document, both mailto/external. Enumerate the 9 projects from the textContent of selectors.card.',
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: 'squadeasy',
    origin: 'https://www.squadeasy.com',
    tier: 2,
    smoothScroll: 'none', // jQuery present; no lenis/locomotive/gsap-scroll global, no html class
    routes: [
      {
        name: 'home',
        url: 'https://www.squadeasy.com/',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        // SUSPECT — every recorded height for this site was taken at a different banner state:
        // recon 12858, owner run 11918, gate sweep 4525 -> 6773. Re-measure after dismissal.
        docScrollHeight: null,
        sections: {
          hero: '#heroHomeSection > section.section.section-1:nth-of-type(1)',
          'value-prop': '#hs_cos_wrapper_widget_1701694322278 > section.sec-text-postit',
          'client-logos':
            '#hs_cos_wrapper_widget_1701864325634 > section.sec-logo.bkg-color-1',
          'why-cohesion':
            '#hs_cos_wrapper_module_17017011462564 > section.sec-text-postit',
          'daily-practice':
            '#hs_cos_wrapper_module_17017013607854 > section.sec-text-postit',
          stats: '#hs_cos_wrapper_widget_1700582415378 > section.sec-title.relative',
          'engage-everyone':
            '#hs_cos_wrapper_widget_1701781528589 > section.sec-image-txt-slider.bkg-color-1',
          testimonials: '#hs_cos_wrapper_widget_1703761082902 > section.sec-testimonials',
          reviews: '#hs_cos_wrapper_module_17037620229475 > section.sec-reviews.relative',
          'employee-cta':
            '#hs_cos_wrapper_widget_1700584069878 > section.sec-block.relative',
          'white-label':
            '#hs_cos_wrapper_module_17061075643905 > div > section.sec-alt-imgtext',
          'final-cta':
            '#hs_cos_wrapper_widget_1700584101563 > section.sec-block.relative',
        },
        // DROPPED: `#heroHomeSection > section.section-2` (1 child, no heading, 600px) and
        // `#hs_cos_wrapper_widget_1700582229879 > section.sec-text` (1 child, no heading) — both
        // match the layout-wrapper rule and neither carries a role a visitor would name.
      },
      {
        name: 'challenges',
        url: 'https://www.squadeasy.com/challenges',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: null,
        sections: {}, // not outlined: recon only ran the home route. Capture falls back to full-page.
      },
      {
        name: 'cas-clients',
        url: 'https://www.squadeasy.com/cas-clients',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: null,
        sections: {},
      },
    ],
    selectors: {
      primaryCta: 'a.cta_button.cta-header', // "Demander une démo"
      navToggle: 'header.header > div.header-burger',
      card: null, // recon's match was a slick-carousel CLONE; a clone is not a durable card unit
      signatureEffect: null,
    },
    effects: { video: false, particles: false, typewriter: false, webgl: false },
    quirks: {
      consentBanner: 'Accepter', // French GDPR banner; "Refuser" is the other choice
      // OBSERVED AND UNDIAGNOSED, recorded rather than explained: accepting the banner also
      // flipped the page from French to English (FR testimonial hero -> EN "Challenge QLW" hero).
      // Possibly an unrelated locale auto-redirect. Any copy extracted from this site must record
      // which locale it was taken in.
      localeFlipOnConsent: 'fr-fr -> en, cause unknown',
      jsDrivenMotion: false,
      splitHeadings: false,
      generator: 'HubSpot', // #hs_cos_wrapper_* ids are per-module and stable, not build hashes
      gridCalls: [],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: 'y-n10',
    origin: 'https://y-n10.com',
    tier: 2,
    smoothScroll: 'custom', // no lenis/locomotive/gsap/barba global; a #dummy spacer + matrix3d
    routes: [
      {
        name: 'home',
        url: 'https://y-n10.com/',
        archetype: 'C',
        entry: {
          kind: 'div',
          selector: 'div.button.hov',
          match: 'enter',
          exact: true, // anchored: "Enter" must not match inside a longer word
          // MEASURED THIS RUN: hover + raw page.mouse click at the selector's rect centre entered
          // successfully HEADLESS (scrollHeight 900 -> 22592). locator.click() cannot be used:
          // getComputedStyle reports pointer-events:none and elementFromPoint returns `main`, so
          // Playwright's actionability check rejects it — yet a real click DOES land.
          // The selector is used for GEOMETRY, the raw click for DELIVERY.
          method: 'rawMouse',
          // The gate is not interactive until the pixel-art intro finishes; a click at 2.5s does
          // nothing while the same click at 9s enters. Measured both ways.
          settleBeforeMs: 9000,
          // Do NOT scrollIntoView first: scrolling the pre-entry page (driven by #main.scrollTop)
          // moves the gate and the click stops registering. Measured: same recipe minus the
          // scroll enters; with the scroll it does not.
          noScrollBeforeClick: true,
          // HONEST LIMIT, and the evidence changed under us mid-session — recorded as observed
          // rather than tidied into a mechanism.
          //   EARLY in this session the recipe above entered repeatedly at 1440x900: the document
          //   grew 900 -> 22592, #navi li[data-id] resolved to 4 and section#statement to 1.
          //   LATER in the same session the IDENTICAL code stopped entering — 3/3, then 4/4, then
          //   4/4 again with a full page reload between every attempt, with scrollHeight staying
          //   at 900. That includes the exact byte-for-byte recipe that had worked an hour before.
          // Things ruled OUT as the cause, each measured: colorScheme, reducedMotion, timezoneId
          // and locale (each entered at least once while set). A deviceScaleFactor effect was
          // hypothesised (dsf 1 entered, dsf 2 did not) and then REFUTED when dsf 1 also stopped
          // entering — so no DPR claim is made here.
          // Also tried at mobile and none entered: raw click, window-scroll then click,
          // #main.scrollTop then click, touchscreen.tap, click({force:true}), dispatchEvent —
          // and note that force and dispatch fail at DESKTOP too even when the raw click works,
          // so the site wants a genuine mousemove -> mousedown -> mouseup at an unscrolled point.
          // CONSEQUENCE FOR CAPTURE: until entry is re-established, every y-n10 artifact is of
          // the GATE, not the voxel world. The verifier reports this as a warning at these
          // viewports instead of silently passing, and Task 4 must re-measure before capturing.
          // The section selectors below all resolve to 1 on the gate screen as well, so a passing
          // selector check is NOT evidence that entry worked.
          verifiedViewports: [],
          // `div.button.hov` resolves to 3; the first is the gate. Text is hidden at
          // text-indent:-99999px, so text-based matching alone will not find it.
          selectorCount: 3,
          note: "Gate also states 'Sound is played on this site' — launch muted.",
        },
        // The scroll driver INVERTS across the gate: #main.scrollTop before, window.scrollTo after.
        scrollDriver: 'window.scrollTo',
        scrollDriverPreEntry: '#main.scrollTop',
        docScrollHeight: 22592, // POST-entry. Pre-entry reads 900 and is meaningless.
        // INFINITE SCROLL: driving to the end grew scrollHeight 22592 -> 316288 over 12 jumps and
        // moved every section offset with it. Travel must be computed ONCE, capped here, and
        // frames must assert real movement.
        scrollTravelCap: 22592,
        sections: {
          // ids the author wrote; the most durable selectors in the whole corpus. All verified
          // post-entry. Bare `section` = 8 (nested .en language variants), so always use #id.
          'intro-gate': 'section#top',
          statement: 'section#statement',
          legacy: 'section#legacy',
          philosophy: 'section#philosophy',
          about: 'section#about',
          activities: 'section#about .activities',
        },
        states: [
          { slug: 'top', action: null },
          { slug: 'statement', action: { click: '#navi li[data-id="statement"]' } },
          { slug: 'legacy', action: { click: '#navi li[data-id="legacy"]' } },
          { slug: 'philosophy', action: { click: '#navi li[data-id="philosophy"]' } },
          { slug: 'about', action: { click: '#navi li[data-id="about"]' } },
        ],
      },
    ],
    selectors: {
      primaryCta: null, // the only button-like control is the gate, recorded under route.entry
      navToggle: null, // #toggleMenu exists but computes display:none at desktop — real on mobile only
      card: null, // no repeating unit; each chapter is bespoke long-form editorial
      signatureEffect: 'canvas#view',
    },
    effects: { video: false, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: true,
      splitHeadings: false,
      // CONFLICT RESOLVED IN FAVOUR OF THE OWNER'S CLICK. visual-confirm concluded the Enter
      // control is "painted on <canvas>, not a real DOM element" after ~10 selectors missed it.
      // The owner's recorded click target was `div.button.hov.hideText.hover` — a real element,
      // reconfirmed this run (3 instances, 268x64 rect at 1440x900). visual-confirm's second
      // half (raw coordinate click required) is right; its first half is wrong.
      gateIsRealDom: true,
      // canvas#view (z2) paints OVER main#main (z1); canvas#dot sits at z0. But visual-confirm
      // REFUTED the inference that element-clip screenshots come out blank: a locator("main")
      // screenshot taken after entry was pixel-for-pixel near-identical to the viewport shot.
      // Viewport shots are still preferred, but not because element shots are blank.
      elementClipBlankClaimRefuted: true,
      // All text carries .hideText { text-indent:-99999px }. DOM text will never appear in an image.
      textHiddenOffCanvas: true,
      // #main > .container carries a live matrix3d transform, so getBoundingClientRect on any
      // descendant is scaled and wrong mid-animation (#philosophy read h=162247 during one).
      // Use offsetTop/offsetHeight only. Chapter transitions run ~4s.
      useOffsetNotBoundingRect: true,
      noStoragePersistence: true,
      // NOTE a tension in plan v2: y-n10 is archetype C in the archetypes table (viewport shots,
      // no scroll frames), yet Task 6 — declared "archetype A only" — cites y-n10's scroll growth
      // and per-route scroll driver. The table is followed here. The post-entry scroll facts are
      // recorded above so Task 6 can be opted in per route without re-measuring.
      gridCalls: [],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: 'shopify',
    origin: 'https://www.shopify.com',
    tier: 2,
    smoothScroll: 'none',
    routes: [
      {
        name: 'home',
        url: 'https://www.shopify.com/',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: 11550, // recon; the owner's pass read 11027/11278. Re-measure at capture.
        sections: {
          hero: '#main > section.grid.grid-cols-full:nth-of-type(1)',
          'brand-chat': '#main > section.grid.gap-y-2xl:nth-of-type(2)',
          'sell-everywhere': '#main > section.grid.gap-y-2xl:nth-of-type(3)',
          'global-growth': '#main > section.grid.gap-y-2xl:nth-of-type(4)',
          'audience-range': '#main > section.grid.gap-y-2xl:nth-of-type(5)',
          sidekick: '#main > section.grid.gap-y-2xl:nth-of-type(6)',
          'app-store':
            '#main > div.bg-coal-black.isolate:nth-of-type(2) > section.grid.gap-y-2xl',
          'ai-core': '#main > section.grid.gap-y-2xl:nth-of-type(7)',
          'build-intro':
            '#main > div.bg-deep-navy:nth-of-type(3) > section.grid.gap-y-2xl',
          checkout: '#main > section.grid.gap-y-2xl:nth-of-type(8)',
          reliability: '#main > section.grid.gap-y-2xl:nth-of-type(9)',
          support: '#main > section.grid.gap-y-2xl:nth-of-type(10)',
          'final-cta': '#main > div.bg-deep-pine:nth-of-type(4) > section.grid.gap-y-2xl',
        },
        // DROPPED: `#main > div:nth-of-type(1) > section.grid.gap-y-2xl` — 637px, two children,
        // no heading of any kind. Nothing in it names a role a visitor would recognise, and
        // guessing one ("social-proof") would put an invented name into the spec.
      },
      {
        name: 'enterprise',
        url: 'https://www.shopify.com/enterprise',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: null, // 11676 owner-measured; 14 videos
        sections: {},
      },
      {
        name: 'start',
        url: 'https://www.shopify.com/start',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: null,
        sections: {},
      },
    ],
    selectors: {
      // Recon's primaryCta matched the "Skip to Content" accessibility link and its navToggle
      // matched the <header> itself. Both are heuristic misfires, not measurements, so both are
      // null rather than transcribed. A wrong selector here shoots the wrong element and labels
      // it "primary CTA" in the spec.
      primaryCta: null,
      navToggle: null,
      card: null, // recon's "card" was the hero section
      signatureEffect: null, // the one canvas sits behind ~8 levels of arbitrary-value Tailwind
    },
    effects: { video: true, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null, // none appeared in any run
      jsDrivenMotion: false,
      splitHeadings: false,
      // A bare substring "Enter" matched "Enterprise" in the nav and navigated the capture away
      // from the homepage. Entry matching must be anchored and URL-guarded on this site above all.
      enterpriseSubstringHazard: true,
      // Tailwind arbitrary values produce selectors full of escaped brackets and CDN URLs. Never
      // select on the class string; the nth-of-type paths above are the durable handle, and they
      // are the one genuinely brittle set on this site.
      fragileSelectors: ['[class*="before:bg-["]', '[class*="sm:h-\\[600px\\]"]'],
      fragileReason: 'Tailwind arbitrary-value classes; regenerate on any content edit',
      gridCalls: [],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: 'raggededge',
    origin: 'https://raggededge.com',
    tier: 3,
    smoothScroll: 'lenis', // html classes ["h-auto", "fonts-loaded", "lenis"]
    routes: [
      {
        name: 'home',
        url: 'https://raggededge.com/',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: 11770, // POST consent dismissal. 17821 with the banner up — suspect.
        docScrollHeightWithBanner: 17821,
        sections: {
          hero: '#header-home', // the giant RAGGED EDGE wordmark over the iridescent swirl
          intro: '#opening-credits', // "Never be the same again"
          // GRID CALL: the 8017px `#barba-container > section` is a container of two bands, and
          // its first band holds the stacked case studies. Named the band, not the cases.
          'work-showcase':
            '#barba-container > section > div.pb-30.wrapper:nth-of-type(1)',
          happenings: '#barba-container > section > div.wrapper.pb-45:nth-of-type(2)',
          newsletter: '#newsletter',
          contact: '#footer-contact-details',
        },
        // DROPPED: `#HomeHero` — a 1088px padding wrapper whose only content is `#opening-credits`.
        // DROPPED: `#barba-container > section` — the 8017px parent of the two bands above;
        // naming both it and its children would double-count the same pixels.
      },
    ],
    selectors: {
      primaryCta: '#case-studies-everything-button', // "All partnerships"
      // `button.o-burger` alone resolves to 2 (a second, opacity-0 copy lives in the mobile
      // drawer). Scoping to #header takes the real one.
      navToggle: '#header button.o-burger',
      // Measured this run: `a[href^="/partnerships/"]` = 0 on the home route, so the case studies
      // are not anchor-wrapped cards. Recon also returned null. No card unit is asserted.
      card: null,
      // MEASURED: the WebGL hero canvas is present at desktop and ABSENT at 390px — the mobile
      // hero is not canvas-driven. Viewport-limited rather than shot blank.
      signatureEffect: { selector: '#hero-canvas', viewports: ['desktop'] },
    },
    effects: { video: true, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: 'Accept All',
      jsDrivenMotion: false,
      splitHeadings: false,
      // Measured hover on a.o-btn: a full colour inversion (#FFF/#181F1F -> #181F1F/#96EBEB mint)
      // over 0.3s cubic-bezier(0.4,0,0.2,1) with a deliberate 0.05s DELAY. Inline links fade an
      // underline in to 40% opacity over 0.15s rather than switching it on.
      interactionTempo: '0.3s cubic-bezier(0.4,0,0.2,1), delay 0.05s',
      hoverEffectOnChild: ['a.c-nav__link'], // reports no computed change; effect is on a child
      // One gate-sweep run screenshotted this site already scrolled into the Approach section
      // rather than at the top. Unexplained; scroll to 0 and assert before the above-fold shot.
      unexplainedScrollOffsetOnLoad: true,
      videoCount: 15,
      canvasCount: 2,
      buildSystem: 'BEM/ITCSS + Tailwind utilities, Barba page transitions',
      gridCalls: [
        "div.js-case-studies holds a space-y-* stack of case studies. Named the enclosing band `work-showcase` rather than emitting one 'section' per case.",
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: 'guglieri',
    origin: 'https://guglieri.com',
    tier: 3,
    smoothScroll: 'none', // html/body className empty; no lenis/locomotive/gsap/barba global
    routes: [
      {
        name: 'home',
        url: 'https://guglieri.com/',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: 2100,
        sections: {
          // `data-framer-name` is the author's own Framer layer name and survives republishing.
          // The `framer-XXXXX` classes recon reported are per-build hashes and are never used.
          // CAUTION: [data-framer-name="Desktop"] alone resolves to 3 and "Variant 1" to 6.
          // MEASURED: Framer swaps a whole different top-level layer set below its breakpoint.
          // Slot 3 is the masthead at both viewports, but its layer is named "Desktop" at 1440
          // and "Phone" at 390, so the alternation resolves to exactly 1 at each.
          header:
            '#main > div:nth-child(2) > div:nth-child(3) [data-framer-name="Desktop"], #main > div:nth-child(2) > div:nth-child(3) [data-framer-name="Phone"]',
          // Slot 4 is the six-link nav at desktop and an email FORM at mobile — not the same
          // component wearing a different variant. Declared desktop-only; the mobile navigation
          // is a separate layer, named below. VIEWPORT-LIMITED, so capture skips it at mobile
          // rather than shooting a blank.
          'primary-nav': {
            selector:
              '#main > div:nth-child(2) > div:nth-child(4) [data-framer-name="Desktop"]',
            viewports: ['desktop'],
          },
          'mobile-menu': {
            selector: '[data-framer-name="Mobile Menu 2"]',
            viewports: ['mobile'],
          },
          'hero-carousel': '[data-framer-name="Next"]',
          'hero-copy': '[data-framer-name="Hero"]',
          footer: '[data-framer-name="Footer"]',
          'next-link': '[data-framer-name="Top"]',
        },
        // DROPPED: [data-framer-name="pagination"] — 4px tall. Task 5's non-degenerate boundingBox
        // guard would skip it anyway; naming it would only produce a warning per viewport.
      },
      {
        name: 'feed',
        url: 'https://guglieri.com/feed',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: null, // read 21940 and 26132 in two passes — measure at capture time
        sections: {},
      },
    ],
    selectors: {
      primaryCta: 'a[data-framer-name="Arrow"]', // the hero project link
      navToggle: null, // six nav links always visible at desktop; Framer swaps a mobile variant
      card: null, // the hero is one 3-slide rotator, not a grid: 2 <img>, 0 <video> on the page
      signatureEffect: '[data-framer-name="Interactive areas"]', // the rotator's hit zones
    },
    effects: { video: false, particles: false, typewriter: false, webgl: false },
    quirks: {
      consentBanner: null,
      // Review Focus #2. a[data-framer-name] and strong.framer-text both report
      // `transition: all 0s ease` while measurably changing on hover (transform matrix and colour
      // #CFCFCF -> #111111). A 0s transition with an observed delta proves the motion is driven in
      // JavaScript (Framer Motion springs). Easing CANNOT be read from computed style here; it
      // must be sampled frame-by-frame. An extractor that trusts transition-duration records "0s"
      // and is wrong about every animation on the site.
      jsDrivenMotion: true,
      // Review Focus #5. One sentence renders as six framer-text elements for a stagger
      // ("A" "growing" "collection" "of" "unique" "digital"). Typography extraction must
      // reassemble them and record splitInto, or it reports six headings where there is one.
      splitHeadings: true,
      // Zero semantic elements: header/footer/nav/main/section/article/aside all return 0, and
      // there is no h1/h2/h3 anywhere — Framer renders headings as styled divs.
      noSemanticElements: true,
      // REFUTED, twice, by pixel verification: a fixed z-index 99999 div DOES cover 100% of the
      // viewport, but it paints nothing and the screenshots come out clean. Do NOT hide it before
      // capture — the DOM-only analysis inferred contamination from z-index and geometry alone.
      fullViewportOverlayContaminationRefuted: true,
      // Hero is a 3-slide AUTO-ROTATOR. Which slide is photographed is timing-dependent and not
      // reproducible without pinning it; two passes caught two different slides.
      autoRotatingHero: true,
      fragileSelectors: [
        '.framer-y5PmK',
        '.framer-6iJkX',
        '.hidden-yncn0y',
        '[data-framer-name="Desktop"]',
      ],
      fragileReason:
        "framer-XXXXX and hidden-XXXXX are per-build hashes; 'Desktop'/'Variant 1' are Framer default names and resolve to 3 and 6",
      gridCalls: [],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: 'helloshivam',
    origin: 'https://www.helloshivam.com',
    tier: 3,
    smoothScroll: 'none', // html className is a Modernizr feature string; no smooth-scroll global
    // ROUTE ORDER IS DELIBERATE AND IS A DEVIATION FROM "home first". Tier 3 captures ONE route.
    // `/` is a real, deliberate design — a minimal 900px landing page, confirmed not broken — but
    // it is a nav strip and nothing else, and every measured section on this site lives on
    // `/work/` (3998px, 22 thumbs, 9 videos). Capturing `/` alone would produce a corpus entry
    // with no content. `/work/` is therefore route[0]; `/` stays second so a wider run still gets
    // the landing page.
    routes: [
      {
        name: 'work',
        url: 'https://www.helloshivam.com/work/',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: 3998, // pixel-verified. The owner's table read 3398; 3998 is confirmed twice.
        sections: {
          header: 'header',
          intro: 'header div.heading', // h1 "Shivam Sinha / Designer, Creative Coder, & Thinker."
          nav: 'header div.menu', // Work / Information / LinkedIn / Instagram / (c)2026
          // GRID CALL: `main > div.index` and `ul.thumbs` are the SAME 3819px box, and `ul.thumbs`
          // holds 22 `a.thumb` of near-identical height. Named the parent once as `work-grid`;
          // the 22 cards are selectors.card. Naming the children would report 22 "sections".
          'work-grid': 'main > div.index',
          colophon: 'div.col.copy',
        },
      },
      {
        name: 'landing',
        url: 'https://www.helloshivam.com/',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: 900,
        sections: {
          header: 'header',
          intro: 'header div.heading',
          nav: 'header div.menu',
        },
      },
    ],
    selectors: {
      primaryCta: null, // zero <button> on the page and no link styled as a CTA
      navToggle: null, // nav items carry .hide-mobile but nothing toggles at desktop
      card: 'a.thumb', // 22 on /work/
      // Looked and found nothing to point at: 0 canvas, 0 fixed elements with height, cursor auto.
      // Recording null rather than inventing one.
      signatureEffect: null,
    },
    effects: { video: true, particles: false, typewriter: false, webgl: false },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: false,
      splitHeadings: false,
      // The work thumbnails are `video.image-wrapper` elements, not images — 9 of them. Any
      // rebuild matching this reference is a video-delivery problem, not an image one.
      thumbnailsAreVideo: 'video.image-wrapper',
      // `main` has getBoundingClientRect().height === 0 on `/` and the visible text lives outside
      // its box. Measuring main's height is the wrong signal for "is this screen empty" — it is
      // what made an earlier pass call this site broken.
      mainHeightIsNotAContentSignal: true,
      // A generic `[class*="enter"]` sweep matched a CONTENT element here and clicked a LinkedIn
      // link, opening a stray tab. There is no gate; never run a broad-class fallback here.
      falseGateHazard: '[class*="enter"] matches a content element',
      // During a gatsby-plugin-transition-link navigation two .tl-wrapper elements co-exist and
      // every selector transiently doubles. Wait for tl-wrapper-status--entered before reading.
      transitionLinkDoubling: '.tl-wrapper',
      gridCalls: [
        'ul.thumbs holds 22 a.thumb of near-identical height — a grid, not an outline. Named the parent `work-grid`; dropped the redundant `ul.thumbs` entry (same box) and put a.thumb in selectors.card.',
      ],
    },
  },
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

/** Archetype is a property of a ROUTE, not a site. pacomepertant is C on `/` and A on `/about`. */
export function archetypeOf(route) {
  return route.archetype
}

export function siteBySlug(slug) {
  return SITES.find((s) => s.slug === slug) ?? null
}
