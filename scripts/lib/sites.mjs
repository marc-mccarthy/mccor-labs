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

export const MULTI_MATCH_SELECTOR_KEYS = new Set(['card'])

export const SITES = [
  {
    slug: 'david-hckh',
    origin: 'https://david-hckh.com',
    tier: 1,
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
          hero: '#hero',
          'intro-stage':
            '#app > div:nth-of-type(1) > div.home-wrapper > div.layout > div.intro-wrapper > div.intro-sticky',
          work: '#projects',
          contact:
            '#app > div:nth-of-type(1) > div.home-wrapper > div.layout > div.home-contact',
        },
      },
      ...['cubewar', 'quibbo', 'sharkie'].map((p) => ({
        name: `project-${p}`,
        url: `https://david-hckh.com/project/${p}`,
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: null,
        sections: {
          'project-hero':
            '#app > div.project-wrapper > div.project-content > div.project > div.project-content-wrapper > div.layout > div.project-hero',
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
      primaryCta: 'a.button-wrapper.button-wrapper-accent',
      navToggle: null,
      card: 'a.preview-card[href^="/project/"]',
      signatureEffect: 'canvas.three-canvas',
    },
    effects: { video: true, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: false,
      splitHeadings: false,
      doubledHeadingText: true,
      interactionTempo:
        '0.1s ease-in-out on header-link and button-wrapper (hover-deltas.json)',
      gridCalls: [
        '#projects: children are 2 notch decorations + a heading grid + a 981px card grid. Named the PARENT `work` as one section; the card unit is selectors.card.',
        'project routes: div.project-content-components has 7 same-shaped children (media modules). Named the parent `project-body`.',
      ],
      hoverEffectOnChild: ['a.preview-card'],
      localStorageKeys: ['portfolio-soundsEnabled', 'portfolio-locale'],
    },
  },

  {
    slug: 'pacomepertant',
    origin: 'https://pacomepertant.com',
    tier: 1,
    smoothScroll: 'lenis',
    routes: [
      {
        name: 'home',
        url: 'https://pacomepertant.com/',
        archetype: 'C',
        entry: {
          kind: 'button',
          selector: 'main button.enter',
          match: 'enter with sound',
          exact: false,
          method: 'locator',
          readySelector: 'main button.enter.show',
          readyTimeoutMs: 30000,
          verifiedViewports: ['wide', 'desktop', 'tablet', 'mobile'],
          note: "substring match required; 'enter without sound' also exists. Sound is design intent, so the with-sound variant is chosen.",
        },
        scrollDriver: null,
        docScrollHeight: 900,
        sections: {},
        states: [
          { slug: 'spiral', action: null },
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
        scrollDriver: 'window.scrollTo',
        docScrollHeight: 5760,
        sections: {
          intro: 'main > div.wrapper:nth-of-type(1) > div.inner',
          bio: 'main > div.wrapper:nth-of-type(1)',
          'work-thumbnails': 'main > div.wrapper:nth-of-type(2)',
          contact: 'main > div.wrapper:nth-of-type(3)',
          'image-trail': {
            selector: '.image-trail',
            viewports: ['wide', 'desktop', 'tablet'],
          },
          socials: '.socials',
          credits: 'p.credits',
        },
      },
    ],
    selectors: {
      primaryCta: null,
      navToggle: 'nav > div.wrapper:first-child',
      card: null,
      signatureEffect: 'canvas.webgl',
    },
    effects: { video: true, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: false,
      splitHeadings: false,
      doubledHeadingText: true,
      clientSideOnlyRoutes: {
        observed: '/projects/chromatik',
        directLoadStatus: 404,
        reachedBy: 'raw mouse click on canvas.webgl at a spiral card position',
        planClaimRefuted: '/projects/jupiter — 404 on direct load',
      },
      entrySignal: 'main .loader count 1 -> 0',
      noStoragePersistence: true,
      gridCalls: [],
    },
  },

  {
    slug: 'topology-vc',
    origin: 'https://www.topology.vc',
    tier: 1,
    smoothScroll: 'lenis',
    routes: [
      {
        name: 'home',
        url: 'https://www.topology.vc/',
        archetype: 'B',
        entry: null,
        scrollDriver: null,
        docScrollHeight: 900,
        sections: {
          hero: '#home',
          about: '#about-us',
          principles: '#our-principles',
          team: '#team',
          'public-goods': '#public-goods',
        },
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
      primaryCta: null,
      navToggle: 'button.menu-toggle',
      card: null,
      signatureEffect: 'canvas#webgl',
    },
    effects: { video: false, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: false,
      splitHeadings: false,
      contentReadyGateInapplicable: true,
      falseGateHazard: '[class*="enter"] matches a nav container',
      gridCalls: [],
    },
  },

  {
    slug: 'belenjones',
    origin: 'https://www.belenjones.com',
    tier: 1,
    smoothScroll: 'none',
    routes: [
      {
        name: 'home',
        url: 'https://www.belenjones.com/',
        archetype: 'C',
        entry: null,
        scrollDriver: null,
        docScrollHeight: 900,
        sections: {
          'project-nav': '[class^="landing__Nav-"]',
          cube: '[class^="landing__CubeWrapper-"]',
          'project-detail': '[class^="landing__Overlay-"]',
          'top-nav': '[class^="landing__TopNav-"]',
          about: '[class^="landing__InfoPanel-"]',
          'meta-footer': '[class^="landing__BottomNav-"]',
        },
        states: [
          { slug: 'landing', action: null },
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
      primaryCta: { selector: 'button', viewports: ['wide', 'desktop', 'tablet'] },
      navToggle: null,
      card: '[class^="landing__NavigationButton-"]',
      signatureEffect: 'canvas',
    },
    effects: { video: true, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: true,
      splitHeadings: false,
      stateSignal: "visibleEls or [class^='landing__Overlay-'] opacity, never bodyText",
      customCursor: '[class^="landing__Cursor-"]',
      preloader: '[class^="loader__LoaderContainer-"]',
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

  {
    slug: 'squadeasy',
    origin: 'https://www.squadeasy.com',
    tier: 2,
    smoothScroll: 'none',
    routes: [
      {
        name: 'home',
        url: 'https://www.squadeasy.com/',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
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
      },
      {
        name: 'challenges',
        url: 'https://www.squadeasy.com/challenges',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: null,
        sections: {},
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
      primaryCta: 'a.cta_button.cta-header',
      navToggle: 'header.header > div.header-burger',
      card: null,
      signatureEffect: null,
    },
    effects: { video: false, particles: false, typewriter: false, webgl: false },
    quirks: {
      consentBanner: 'Accepter',
      localeFlipOnConsent: 'fr-fr -> en, cause unknown',
      jsDrivenMotion: false,
      splitHeadings: false,
      generator: 'HubSpot',
      gridCalls: [],
    },
  },

  {
    slug: 'y-n10',
    origin: 'https://y-n10.com',
    tier: 2,
    smoothScroll: 'custom',
    routes: [
      {
        name: 'home',
        url: 'https://y-n10.com/',
        archetype: 'C',
        entry: {
          kind: 'div',
          selector: 'div.button.hov',
          match: 'enter',
          exact: true,
          method: 'rawMouse',
          settleBeforeMs: 9000,
          noScrollBeforeClick: true,
          verifiedViewports: [],
          selectorCount: 3,
          note: "Gate also states 'Sound is played on this site' — launch muted.",
        },
        scrollDriver: 'window.scrollTo',
        scrollDriverPreEntry: '#main.scrollTop',
        docScrollHeight: 22592,
        scrollTravelCap: 22592,
        sections: {
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
      primaryCta: null,
      navToggle: null,
      card: null,
      signatureEffect: 'canvas#view',
    },
    effects: { video: false, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: true,
      splitHeadings: false,
      gateIsRealDom: true,
      elementClipBlankClaimRefuted: true,
      textHiddenOffCanvas: true,
      useOffsetNotBoundingRect: true,
      noStoragePersistence: true,
      gridCalls: [],
    },
  },

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
        docScrollHeight: 11550,
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
      },
      {
        name: 'enterprise',
        url: 'https://www.shopify.com/enterprise',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: null,
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
      primaryCta: null,
      navToggle: null,
      card: null,
      signatureEffect: null,
    },
    effects: { video: true, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: false,
      splitHeadings: false,
      enterpriseSubstringHazard: true,
      fragileSelectors: ['[class*="before:bg-["]', '[class*="sm:h-\\[600px\\]"]'],
      fragileReason: 'Tailwind arbitrary-value classes; regenerate on any content edit',
      gridCalls: [],
    },
  },

  {
    slug: 'raggededge',
    origin: 'https://raggededge.com',
    tier: 3,
    smoothScroll: 'lenis',
    routes: [
      {
        name: 'home',
        url: 'https://raggededge.com/',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: 11770,
        docScrollHeightWithBanner: 17821,
        sections: {
          hero: '#header-home',
          intro: '#opening-credits',
          'work-showcase':
            '#barba-container > section > div.pb-30.wrapper:nth-of-type(1)',
          happenings: '#barba-container > section > div.wrapper.pb-45:nth-of-type(2)',
          newsletter: '#newsletter',
          contact: '#footer-contact-details',
        },
      },
    ],
    selectors: {
      primaryCta: '#case-studies-everything-button',
      navToggle: '#header button.o-burger',
      card: null,
      signatureEffect: { selector: '#hero-canvas', viewports: ['desktop'] },
    },
    effects: { video: true, particles: false, typewriter: false, webgl: true },
    quirks: {
      consentBanner: 'Accept All',
      jsDrivenMotion: false,
      splitHeadings: false,
      interactionTempo: '0.3s cubic-bezier(0.4,0,0.2,1), delay 0.05s',
      hoverEffectOnChild: ['a.c-nav__link'],
      unexplainedScrollOffsetOnLoad: true,
      videoCount: 15,
      canvasCount: 2,
      buildSystem: 'BEM/ITCSS + Tailwind utilities, Barba page transitions',
      gridCalls: [
        "div.js-case-studies holds a space-y-* stack of case studies. Named the enclosing band `work-showcase` rather than emitting one 'section' per case.",
      ],
    },
  },

  {
    slug: 'guglieri',
    origin: 'https://guglieri.com',
    tier: 3,
    smoothScroll: 'none',
    routes: [
      {
        name: 'home',
        url: 'https://guglieri.com/',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: 2100,
        sections: {
          header:
            '#main > div:nth-child(2) > div:nth-child(3) [data-framer-name="Desktop"], #main > div:nth-child(2) > div:nth-child(3) [data-framer-name="Phone"]',
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
      },
      {
        name: 'feed',
        url: 'https://guglieri.com/feed',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: null,
        sections: {},
      },
    ],
    selectors: {
      primaryCta: 'a[data-framer-name="Arrow"]',
      navToggle: null,
      card: null,
      signatureEffect: '[data-framer-name="Interactive areas"]',
    },
    effects: { video: false, particles: false, typewriter: false, webgl: false },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: true,
      splitHeadings: true,
      noSemanticElements: true,
      fullViewportOverlayContaminationRefuted: true,
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

  {
    slug: 'helloshivam',
    origin: 'https://www.helloshivam.com',
    tier: 3,
    smoothScroll: 'none',
    routes: [
      {
        name: 'work',
        url: 'https://www.helloshivam.com/work/',
        archetype: 'A',
        entry: null,
        scrollDriver: 'window.scrollTo',
        docScrollHeight: 3998,
        sections: {
          header: 'header',
          intro: 'header div.heading',
          nav: 'header div.menu',
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
      primaryCta: null,
      navToggle: null,
      card: 'a.thumb',
      signatureEffect: null,
    },
    effects: { video: true, particles: false, typewriter: false, webgl: false },
    quirks: {
      consentBanner: null,
      jsDrivenMotion: false,
      splitHeadings: false,
      thumbnailsAreVideo: 'video.image-wrapper',
      mainHeightIsNotAContentSignal: true,
      falseGateHazard: '[class*="enter"] matches a content element',
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

export function archetypeOf(route) {
  return route.archetype
}

export function siteBySlug(slug) {
  return SITES.find((s) => s.slug === slug) ?? null
}
