# Deep-dive: five hard reference sites

Interactive Playwright recon, viewport 1440x900, 2026-09-27. Every `selector` below was run
through `document.querySelectorAll(sel).length` in the live page; the observed count is recorded
as `count`. Nothing here is inferred from the scripted recon output.

Method note: heights are `offsetHeight` (layout height) wherever a site applies a CSS transform,
because `getBoundingClientRect().height` is scaled mid-animation and reports nonsense (y-n10
reported `#philosophy` at h=162247 during a transition).

---

## 1. pacomepertant.com — Nuxt + Lenis + WebGL

**The canvas suspicion is CONFIRMED for the home page, and there is a gate in front of it.**

Two separate findings the scripted pass could not have seen:

1. `/` is behind an **entry gate**. `main > div.loader` (h=900, fixed, full viewport) holds
   `button.enter` ("enter with sound") and `button.no-sound` ("enter without sound"). Nothing
   proceeds until one is clicked.
2. After clicking through, `main` is **completely empty** — `main.children.length === 0`,
   `offsetHeight 0`. `document.documentElement.scrollHeight === 900` and `window.lenis.limit === 0`,
   i.e. the home page does not scroll at all. `#__nuxt` has exactly four children: `svg`,
   `canvas.webgl`, `div.home-overlay-wrapper`, `main`.

I also toggled the on-screen spiral/list view switch (`.switch .button`, 2 elements). Element count
stayed at 323 and `main` stayed empty, so **the works index is WebGL too** — the switch does not
reveal a DOM list. The DOM holds only persistent chrome: logo, view switch, menu, showreel
thumbnail, sound button.

So for the home page there are neither DOM sections nor scroll bands — there is one fixed viewport.
The `/about` route is different: it is real, scrolling DOM.

```js
{
  slug: 'pacomepertant',
  url: 'https://pacomepertant.com',
  // Home page: no sections of any kind. Not 'dom' (main is empty), not 'scroll-bands'
  // (scrollHeight === 900, lenis.limit === 0). One fixed WebGL viewport.
  sectionMode: 'canvas-only',
  totalScrollHeight: 900,          // verified: documentElement.scrollHeight
  sections: [],
  smoothScroll: 'lenis',           // evidence: html class="lenis"; window.lenis and
                                   // window.lenisVersion both present
  // NOTE, contradicts the brief's assumption: this Lenis instance wraps native scroll, so on
  // /about ALL THREE of window.scrollTo(0,y), documentElement.scrollTop = y and
  // window.lenis.scrollTo(y) moved the page, each verified to land exactly on target.
  // No wheel-event synthesis needed.
  scrollMethod: 'window.scrollTo',
  primaryCta:       { selector: 'main button.no-sound', count: 1 },  // the entry gate
  navToggle:        { selector: 'nav > div.wrapper:first-child', count: 1 }, // "menu"/"close"
                    // NB plain 'nav .wrapper' resolves to 2 — the :first-child is required
  card:             null,          // no DOM cards anywhere on the home page
  signatureEffect:  { selector: 'canvas.webgl', count: 1 },
  otherVerified: [
    { selector: '.home-overlay-wrapper',   count: 1, offsetHeight: 0   },
    { selector: 'nav',                     count: 1, offsetHeight: 0   },
    { selector: '.switch',                 count: 1, offsetHeight: 18  },
    { selector: '.switch .button',         count: 2, offsetHeight: 18  },
    { selector: 'button.sound-button',     count: 1, offsetHeight: 48  },
    { selector: '.showreel-thumbnail',     count: 1, offsetHeight: 0   },
    { selector: '.lottie-animation-container.logo', count: 1, offsetHeight: 64 },
    { selector: 'main .loader',            count: 1, offsetHeight: 900 },
    { selector: 'main button.enter',       count: 1, offsetHeight: 46  },
  ],
  durabilityWarning:
    'No build hashes — classes are hand-authored (.home-overlay-wrapper, .switch, .sound-button, ' +
    '.loader). #__nuxt is a Nuxt framework constant, not a hash, so it is safe. The real fragility ' +
    'is not selectors but the gate: a capture that does not click through .loader photographs the ' +
    'splash screen and looks like a success.',
  hazards: [
    'ENTRY GATE: must click main button.no-sound (or button.enter) or you capture only the loader.',
    'Loader is fixed h=900 covering the viewport; allow ~4s before it is interactive.',
    'canvas.webgl is position:fixed, z-index:0, 1440x900 and is the entire visible page. An ' +
      'element-clip screenshot of any DOM node will be blank or chrome-only.',
    'Home page does not scroll, so a scroll-frame sequence yields identical frames.',
  ],
}
```

### pacomepertant.com/about — this one IS dom

Verified separately. `documentElement.scrollHeight === 5760`, `window.lenis.limit === 4860`.

```js
{
  slug: 'pacomepertant-about',
  url: 'https://pacomepertant.com/about',
  sectionMode: 'dom',
  totalScrollHeight: 5760,
  sections: [
    { slug: 'intro',   selector: 'main > div.wrapper:nth-of-type(1) > div.inner', count: 1, height: 900, firstHeading: null }, // "I'm Pacome Pertant, motion and sound designer" (p.text, no h1-h3 on the page)
    { slug: 'bio-scroll', selector: 'main > div.wrapper:nth-of-type(1)',          count: 1, height: 4500, firstHeading: null },
    { slug: 'work-thumbnails', selector: 'main > div.wrapper:nth-of-type(2)',     count: 1, height: 360,  firstHeading: null }, // "view project" x N
    { slug: 'contact-footer',  selector: 'main > div.wrapper:nth-of-type(3)',     count: 1, height: 900,  firstHeading: null }, // Instagram / X / Behance / LinkedIn
    { slug: 'image-trail',     selector: '.image-trail',                          count: 1, height: 900,  firstHeading: null },
    { slug: 'socials',         selector: '.socials',                              count: 1, height: 292,  firstHeading: null },
    { slug: 'credits',         selector: 'p.credits',                             count: 1, height: 14,   firstHeading: null }, // "design @louis_bcqt | development @colindmg"
  ],
  // Bare 'main > div.wrapper' resolves to 3 — the :nth-of-type qualifier is mandatory.
  // '.thumbnail' = 19, 'a.social-link' = 8, 'main > div.wrapper:nth-of-type(2) > div.container' = 2.
  // '.switch' = 0 here (home-only), so do not reuse the home key selectors on this route.
  // The page has ZERO h1/h2/h3 elements, hence every firstHeading is null rather than guessed.
  routes: ['/', '/about'],  // from a[href]; plus mailto and 4 external social links
}
```

---

## 2. guglieri.com — Framer

**`data-framer-name` is present, human-authored, and the answer.** These are the layer names from
the Framer canvas, not build output, so they survive republishing as long as the author does not
rename the layer. There are **zero** semantic elements — `header,footer,nav,main,section,article,aside`
all return 0 — so semantic tags are not an option here.

```js
{
  slug: 'guglieri',
  url: 'https://guglieri.com',
  sectionMode: 'dom',
  totalScrollHeight: 2100,
  smoothScroll: 'none',   // evidence: no lenis/locomotive/gsap-scroll global; html and body
                          // className both empty; Object.keys(window) filtered for
                          // /lenis|locomotive|gsap|barba|scrollsmoother/ returned []
  sections: [
    { slug: 'header',        selector: '#main > div:nth-child(2) > div:nth-child(3) [data-framer-name="Desktop"]', count: 1, height: 140, firstHeading: null }, // "Claudio Guglieri / Local time / San Francisco, CA"
    { slug: 'primary-nav',   selector: '#main > div:nth-child(2) > div:nth-child(4) [data-framer-name="Desktop"]', count: 1, height: 60,  firstHeading: null }, // "NEW Feed About Work Talks Press"
    { slug: 'hero-carousel', selector: '[data-framer-name="Next"]',        count: 1, height: 900, firstHeading: null }, // 3-slide rotator
    { slug: 'hero-copy',     selector: '[data-framer-name="Hero"]',        count: 1, height: 216, firstHeading: null }, // "Cursors available in Figma community"
    { slug: 'carousel-pagination', selector: '[data-framer-name="pagination"]', count: 1, height: 4, firstHeading: null }, // children named "1","2","3"
    { slug: 'footer',        selector: '[data-framer-name="Footer"]',      count: 1, height: 900, firstHeading: null }, // "Reach out to connect or collaborate / claudio@guglieri.com"
    { slug: 'next-link',     selector: '[data-framer-name="Top"]',         count: 1, height: 100, firstHeading: null }, // "Next — About"
  ],
  // The whole page has NO h1/h2/h3 — Framer renders headings as styled divs. Every firstHeading
  // is null because it is genuinely absent, not because I did not look.
  primaryCta:      { selector: 'a[data-framer-name="Arrow"]', count: 1, height: 40 }, // hero project link
  navToggle:       null,   // no hamburger at 1440x900; the six nav links are always visible.
                           // Framer would swap in a mobile variant below its breakpoint.
  card:            null,   // the hero is one 3-slide rotator, not a card grid. The whole page
                           // holds 2 <img> and 0 <video>, so there is no repeating card unit.
  signatureEffect: { selector: '[data-framer-name="Interactive areas"]', count: 1, height: 900 },
                           // the hover/click hit-zones that drive the 3-slide rotator
  durabilityWarning:
    'DO NOT USE the framer-XXXXX classes the scripted pass reported (div.framer-y5PmK.framer-6iJkX ' +
    'and friends). Those are per-build hashes and will silently break. Three tiers, best first:\n' +
    '  1. [data-framer-name="..."] — author-set layer names, durable. Verified unique for Next, ' +
    'Hero, Footer, Interactive areas, pagination, Top.\n' +
    '  2. #main and #overlay — Framer framework-constant ids, safe.\n' +
    '  3. positional #main > div:nth-child(N) — survives a rebuild but breaks if the author ' +
    'reorders top-level layers. Needed only for the header and nav (see below).\n' +
    'CAUTION: [data-framer-name="Desktop"] resolves to 3 (header h=140, nav h=60, footer-nav ' +
    'h=349) and [data-framer-name="Variant 1"] to 6 — these are Framer default/variant names and ' +
    'are NOT unique. Qualify them. Footer-nav has a clean scope: ' +
    '[data-framer-name="Footer"] [data-framer-name="Desktop"] = 1. Header and primary-nav have no ' +
    'name-based scope and require the positional selector above; flagging that as the one ' +
    'genuinely brittle pair on this site.\n' +
    'The .ssr-variant hidden-yncn0y / hidden-1vdqlpv classes are Framer breakpoint hashes — never ' +
    'select on them.',
  hazards: [
    'FIXED FULL-VIEWPORT OVERLAY at z-index 99999: a floating guestbook of ~20 visitor notes ' +
      '("messsage", "Love life", "I love wolverine"...). It covers the entire 1440x900 viewport ' +
      'and WILL appear in every screenshot. Selector #main > div:nth-child(2) > div:nth-child(2) > div ' +
      '(count 1, position fixed, z 99999) — verified. Its own class .framer-1ok0lod-container IS a ' +
      'build hash, so the positional selector is the durable handle. Hide it before capture.',
    'Hero is a 3-slide auto-rotator (pagination children 1/2/3): which slide you photograph is ' +
      'timing-dependent and not reproducible without pinning it.',
    'An #__framer-editorbar iframe is in the DOM.',
    'No custom cursor despite the "Cursors available in Figma community" copy — ' +
      'getComputedStyle(body).cursor === "auto".',
  ],
  routes: ['./', './feed', './about', './work', './talks', './press', './downloads'],
  // 12 a[href] total, all enumerable normally — routes are not a problem on this site.
}
```

---

## 3. helloshivam.com — Gatsby

**The `tl-*` wrappers were a red herring. The real finding: the home page has no content to outline.**
`/` is a nav-only landing page — `documentElement.scrollHeight === 900`, and `.tl-wrapper` has
exactly two children: `header` (h=179) and an **empty `main` (h=0, 0 children)**. The recon's "2
candidates both h=179" was correct; there was nothing else there to find.

The content lives on `/work/`, which I reached by clicking `a.open-index`. That is a real
`href="/work/"` link, so this is ordinary routing, not a JS-only interaction. On `/work/`,
`documentElement.scrollHeight === 3998` and `main` fills with `div.index > ul.thumbs`.

Classes are hand-authored plain CSS — **no hashes anywhere on this site.** Semantic `header` and
`main` both exist and are unique.

```js
{
  slug: 'helloshivam',
  url: 'https://www.helloshivam.com/work/',   // capture this, NOT '/' — '/' has no content
  sectionMode: 'dom',
  totalScrollHeight: 3998,
  smoothScroll: 'none',   // evidence: html className is a Modernizr string
                          // ("webkit chrome mac osx osx10 osx10_15 js pc") with no smooth-scroll
                          // marker; no lenis/locomotive/gsap global
  sections: [
    { slug: 'header',      selector: 'header',            count: 1, height: 179,  firstHeading: 'Shivam Sinha Designer, Creative Coder, & Thinker.' }, // h1
    { slug: 'intro',       selector: 'header div.heading', count: 1, height: 179,  firstHeading: 'Shivam Sinha Designer, Creative Coder, & Thinker.' },
    { slug: 'nav',         selector: 'header div.menu',    count: 1, height: 179,  firstHeading: null }, // "Work Information LinkedIn Instagram ©2026"
    { slug: 'work-grid',   selector: 'main > div.index',   count: 1, height: 3819, firstHeading: null },
    { slug: 'work-list',   selector: 'ul.thumbs',         count: 1, height: 3819, firstHeading: null }, // 22 project thumbs
    { slug: 'colophon',    selector: 'div.col.copy',      count: 1, height: 89,   firstHeading: null }, // "©2026"
  ],
  // 'main' itself is count 1, height 3819 — usable as the content root if you prefer one box.
  // The only h2 on the page is "Currently a Designer at Work&Co" inside div.col.rand-title.
  primaryCta:      null,   // no CTA button or link styled as one; 0 <button> on the page
  navToggle:       null,   // no hamburger at 1440x900. Nav items carry .hide-mobile, so a mobile
                           // variant exists, but nothing toggles at this viewport.
  card:            { selector: 'a.thumb', count: 22, height: 397 },  // also 'a.thumb.link' = 22
  signatureEffect: null,   // I looked and found nothing to point at: 0 <canvas>, 0 position:fixed
                           // elements with height, cursor 'auto'. The thumbs use <picture> with
                           // srcset. If there is a hover effect it is CSS-only and I did not
                           // isolate a selector for it — recording null rather than inventing one.
  durabilityWarning:
    'None. Every class is hand-authored plain CSS (.index, .thumbs, .thumb, .heading, .menu, ' +
    '.open-index, .open-info, .col.copy) with no hash segment, and header/main are semantic tags. ' +
    'The #___gatsby and #gatsby-focus-wrapper ids are Gatsby framework constants, also safe. ' +
    'The .tl-wrapper / .tl-edges wrappers are gatsby-plugin-transition-link and carry transient ' +
    'status classes (tl-wrapper--mount, tl-wrapper-status--entered) — do not select on those ' +
    'status suffixes, and there is no reason to select the wrappers at all now that main works.',
  hazards: [
    'Capturing "/" produces a nav strip and nothing else. This is the whole reason the scripted ' +
      'pass failed. Point the capture at /work/ and /about/.',
    'During a transition-link navigation two .tl-wrapper elements can co-exist (entering + ' +
      'exiting), which would transiently double every selector. I measured 1 after settling; ' +
      'wait for tl-wrapper-status--entered before reading the DOM.',
    'No preloader, no fixed overlay, no custom cursor — a clean site to shoot once it is on the ' +
      'right URL.',
  ],
  routes: [
    '/', '/work/', '/about/',
    '/work/serif', '/work/36-days-of-type', '/work/apple-2019', '/work/data-aeternum',
    '/work/thesis-explorations', '/work/motion-self-portrait', '/work/countdown-posters',
    '/work/future-internet', '/work/articulate-app', '/work/with-love', '/work/parsons-benefit',
    '/work/fluently-app', '/work/super8', '/work/experiential-web', '/work/ff-bua',
    '/work/here-is-new-york', '/work/helveticanism', '/work/motion', '/work/a-book-of-quotes',
    '/work/flatland', '/work/posters', '/work/various-logos',
  ],
  // 25 internal routes, all plain a[href]. A recon pass that only ever loaded '/' would see just
  // 3 of them, because the other 22 only exist in the markup of /work/.
}
```

---

## 4. belenjones.com — Next.js + styled-components

**The `rect.h = 45000` was decoration, not content, and this site does not scroll.**

`[class^="landing__BgStrip-"]` is `position: absolute`, `height: 45000`, sitting at `y = -22500` —
a decorative vertical strip centred on the viewport, containing 50 identical
`[class^="landing__BgStripSection-"]` tiles. It has no text. Meanwhile
`document.documentElement.scrollHeight === 900`: **the document never scrolls.**

The real architecture is a WebGL cube picker with a fixed detail overlay:

- `nav` / `[class^="landing__Nav-"]` holds 9 project names.
- `canvas` (1440x900) inside `[class^="landing__CubeWrapper-"]` draws a rotating 3D cube.
- `[class^="landing__Overlay-"]` is `position: fixed`, `z-index: 2`, `opacity: 0` at rest. Clicking
  opens it to `opacity: 1` with `scrollHeight 3531` — **it has its own internal scroll.**

### Why recon found 0 routes

Because there are none. The entire document contains exactly **2 anchors** — `mailto:belenjones2@gmail.com`
and a LinkedIn URL. The 9 project "links" are plain `<div>` with **no href, no role, no aria-label**:
`{t:'DIV', cls:'landing__NavigationButton-...', href:null, role:null}`. I clicked through to a project
and confirmed `location.href` stayed `https://www.belenjones.com/` with an empty hash. It is a
single-URL SPA; there is nothing for an `a[href]` crawler to find.

### How a script must drive it (verified sequence)

Clicking the nav `div` alone did **not** open the overlay — overlay stayed at `opacity: 0`. What
worked was clicking the **canvas**, i.e. the cube face:

1. `document.querySelectorAll('[class^="landing__NavigationButton-"]')` → 9 items; read
   `.textContent` for the project names.
2. Click the nav item to rotate the cube to that face.
3. Click `canvas` — this opens the overlay (verified: `opacity` 0 → 1, `pointerEvents` none → auto,
   text became "ASAP Rocky [2023] Bespoke Landing Page / Role / Sole Creative Web Developer / ...").
4. Scroll `[class^="landing__Overlay-"]`, **not the window** — `documentElement.scrollHeight` stays
   900 while the overlay's own `scrollHeight` is 3531.

```js
{
  slug: 'belenjones',
  url: 'https://www.belenjones.com',
  sectionMode: 'dom',
  totalScrollHeight: 900,   // verified: the document genuinely does not scroll
  smoothScroll: 'none',     // evidence: html and body className both empty; no lenis/locomotive
                            // global. window.gsapVersions IS present, so GSAP drives the cube and
                            // overlay animation, but there is no smooth-scroll hijack.
  sections: [
    { slug: 'project-nav',    selector: '[class^="landing__Nav-"]',        count: 1, height: 916, firstHeading: null }, // SENSE / ASAP Rocky / Bvlgari / GANT / Trident / Not in Miami / Gemini / Ksawery / Panda Express
    { slug: 'cube',           selector: '[class^="landing__CubeWrapper-"]', count: 1, height: 900, firstHeading: null },
    { slug: 'project-detail', selector: '[class^="landing__Overlay-"]',    count: 1, height: 900, firstHeading: null }, // opacity 0 until a cube face is clicked
    { slug: 'top-nav',        selector: '[class^="landing__TopNav-"]',     count: 1, height: 43,  firstHeading: null }, // "Belen Jones / Contact"
    { slug: 'about',          selector: '[class^="landing__InfoPanel-"]',  count: 1, height: 276, firstHeading: null }, // "About / A Berlin-based creative developer with n..."
    { slug: 'meta-footer',    selector: '[class^="landing__BottomNav-"]',  count: 1, height: 59,  firstHeading: null }, // "BERLIN, Germany / CET 18:27"
  ],
  // Verified NOT unique, do not use as section selectors:
  //   [class^="landing__NavigationButton-"] = 9, [class^="landing__BgStripSection-"] = 50.
  // 'main' = 1 and 'main > div' = 1 both work as the page root.
  primaryCta:      { selector: 'button', count: 1, height: 43 },  // "Belen Jones" in the top nav;
                   // the only <button> in the document
  navToggle:       null,   // no hamburger at 1440x900; [class^="landing__MobileBg-"],
                           // MobileHeading and MobileScrollSpacer all measure height 0 here,
                           // so the mobile chrome is present in the DOM but collapsed
  card:            { selector: '[class^="landing__NavigationButton-"]', count: 9, height: 93 },
  signatureEffect: { selector: 'canvas', count: 1, height: 900 },  // the rotating 3D project cube
  durabilityWarning:
    'The scripted pass reported classes like landing__PageContainer-sc-803efe7c-1 koBINu. TWO of ' +
    'those three segments are build-derived: sc-803efe7c is the styled-components componentId ' +
    'hash and koBINu is the generated class. [class*="sc-803efe7c"] matches 149 elements and will ' +
    'break on any rebuild — never use it.\n' +
    'The STABLE alternative is the displayName prefix, which the styled-components babel plugin ' +
    'derives from the source filename plus the component variable name (landing.js + Nav -> ' +
    '"landing__Nav"), not from content. So [class^="landing__Nav-"] is durable across rebuilds and ' +
    'breaks only if the component is renamed or the file is split. I verified every prefix ' +
    'selector above resolves to exactly 1.\n' +
    'Use the ^= (starts-with) form, not *=: [class*="landing__Nav"] would also catch ' +
    'landing__NavigationButton. The trailing hyphen in "landing__Nav-" is what separates them.\n' +
    '#__next is a Next.js framework constant and is safe, but it adds nothing here — prefer main.',
  hazards: [
    'CUSTOM CURSOR: [class^="landing__Cursor-"], position fixed, z-index 100, textContent ' +
      '"view project". It follows the pointer and will be baked into screenshots wherever the ' +
      'mouse was left.',
    'PRELOADER: [class^="loader__LoaderContainer-"], position fixed, z-index 1000, full 1440x900, ' +
      'text "BELEN JONES". It animates to opacity 0 / pointerEvents none but STAYS IN THE DOM ' +
      'indefinitely — I re-measured at 4s and again at 10s and it was opacity 0 both times. Do not ' +
      'wait for it to be removed; wait for opacity to reach 0.',
    'The 45000px [class^="landing__BgStrip-"] is decorative and sits at y=-22500. Any heuristic ' +
      'that picks the tallest element picks this, and photographs an empty strip. This is exactly ' +
      'what the scripted pass did.',
    'Project detail content only mounts/reveals after clicking the canvas (see sequence above).',
    'The overlay scrolls internally (scrollHeight 3531 vs clientHeight 900) while the window does ' +
      'not move at all. A window-scroll frame sequence produces 1 identical frame forever.',
  ],
  routes: [],  // genuinely none — single URL, 2 anchors and both external/mailto
  routeEnumeration:
    'Not possible via a[href]. Enumerate the 9 projects from the textContent of ' +
    '[class^="landing__NavigationButton-"]: SENSE, ASAP Rocky, Bvlgari, GANT, Trident, ' +
    'Not in Miami, Gemini, Ksawery, Panda Express. There is no URL per project.',
}
```

---

## 5. y-n10.com — Yamauchi No.10 Family Office

Sections were never the problem here. Two things are, and the second one is severe.

### The route answer: genuinely a single-page site

`document.querySelectorAll('a').length === 0` — there is **not one anchor element in the document**,
and `button, [role=button], [role=link]` is also 0. Navigation is four `<li>` elements carrying
`data-id`:

```html
<ul class="main">
  <li class="statement hov cssbgsvg hideText" data-id="statement">Statement</li>
  <li class="legacy hov cssbgsvg hideText" data-id="legacy">Legacy</li>
  <li class="philosophy hov cssbgsvg hideText" data-id="philosophy">
    Philosophy
  </li>
  <li class="about hov cssbgsvg hideText" data-id="about">About</li>
</ul>
```

plus `<h1 data-id="top">`. Each `data-id` maps 1:1 onto an in-page `section#<data-id>`. I clicked all
four and `location.href` never changed and `location.hash` stayed empty. **A script enumerates these
with `#navi [data-id]` and maps to `section#<id>`; there are no URLs to crawl.** The active chapter is
readable from `#navi li.current` — verified: after clicking Legacy, that `li` had
`class="legacy hov cssbgsvg current"`.

### The severe finding: the visible page is WebGL, the DOM is a skeleton

The nine sections the scripted pass outlined are real boxes with correct geometry and real text, but
**screenshotting them as elements yields nothing**, for two independent reasons I verified:

1. `.hideText` — applied to essentially every text node — computes to
   `{ text-align: left; text-indent: -99999px; overflow: hidden; display: block }`. I read the rule
   out of `document.styleSheets`. The text is pushed 99999px off-screen. It is present for SEO and
   layout, and is not what a human reads.
2. `canvas#view` is `position: fixed`, **`z-index: 2`**, 1440x900. `main#main` is `z-index: 1`. The
   canvas paints **over** the entire DOM. There is a second `canvas#dot` at `z-index: 0`.

Additionally `#main > .container` carries a live `matrix3d(...)` transform, so `getBoundingClientRect`
on any descendant does not correspond to what is painted. Use `offsetTop`/`offsetHeight` only.

### Two scroll regimes — this trips everything

There is an **intro gate**: `#top .button.hov` with text "Enter", alongside a notice
"このサイトは音が流れます。 Sound is played on this site." The scroll model differs on either side of it.

- **Before entering:** `window.scrollTo` and `documentElement.scrollTop` do **nothing** (verified:
  `window.scrollY` stayed 0 after both). The only thing that moved the page was
  `document.querySelector('#main').scrollTop = N`. All four content sections are
  `position: absolute` **stacked at the same `offsetTop` of 900**, so `#main.scrollHeight` is only 5812.
- **After clicking Enter:** the model flips. `#dummy` (`position: absolute`, height 22592) becomes a
  spacer that gives the _document_ its height, `documentElement.scrollHeight` becomes 22592, sections
  un-stack into a sequential layout, and **`window.scrollTo` is now the correct method** (verified to
  land exactly on target at 8 offsets). `#main` stays `position: fixed` with `scrollHeight === clientHeight === 900`,
  so `#main.scrollTop` now does nothing. The two methods are exact opposites either side of the gate.

### The infinite-scroll trap

Driving this site by absolute scroll offsets is unsafe. I ran a settle loop that repeatedly jumped to
`documentElement.scrollHeight`; the height grew **22592 → 316288** over 12 iterations without
converging, and section offsets moved with it (`#legacy.offsetTop` went from 8370 to 279474). It is a
virtual looping scroll that extends `#dummy` as you approach the end.

Navigating by nav click instead is stable: from a fresh load, clicking each of the four items in turn
left `documentElement.scrollHeight` at 22592 throughout and landed on consistent offsets. **Drive this
site by `#navi li[data-id]` clicks, and never scroll past the end.**

```js
{
  slug: 'y-n10',
  url: 'https://y-n10.com',
  // Sections are real, unique, id-based and perfectly durable. But an element-clip screenshot of
  // any of them is blank, because canvas#view paints over the DOM (z 2 vs 1) and all text is at
  // text-indent -99999px. Use the section boxes as SCROLL ANCHORS and take VIEWPORT screenshots.
  sectionMode: 'dom',
  captureMode: 'viewport-only',
  totalScrollHeight: 22592,  // stable ONLY if you never scroll to the very end (see trap above)
  smoothScroll: 'custom',
  // Evidence: no lenis/locomotive/gsap/barba/swup global at all (filtered Object.keys(window) and
  // got []). html className is a Modernizr feature string. The mechanism is bespoke: a #dummy
  // absolute spacer of height 22592 supplies document scroll height, main#main is position:fixed,
  // and #main > .container is driven by a matrix3d transform from the scroll position.
  scrollMethod: 'window.scrollTo AFTER clicking Enter; #main.scrollTop BEFORE. Prefer nav clicks.',
  sections: [
    { slug: 'intro-gate', selector: 'section#top',        count: 1, offsetTop: 0,     height: 900,  firstHeading: 'Yamauchi No.10 Family Office' },
    { slug: 'statement',  selector: 'section#statement',  count: 1, offsetTop: 2242,  height: 4592, firstHeading: '01. STATEMENT' },   // h2: 挑戦と、生きていく。 / Dream. Leap. Live.
    { slug: 'legacy',     selector: 'section#legacy',     count: 1, offsetTop: 8370,  height: 4912, firstHeading: '02. LEGACY' },      // h2: 継承。そして使命。 / Our family journey - What we're about
    { slug: 'philosophy', selector: 'section#philosophy', count: 1, offsetTop: 14818, height: 2144, firstHeading: '03. PHILOSOPHY' },  // h2: 4つの理念
    { slug: 'about',      selector: 'section#about',      count: 1, offsetTop: 18498, height: 2752, firstHeading: '04. ABOUT' },       // then h1 ACTIVITIES, h2 01. Business Incubation
    { slug: 'activities', selector: 'section#about .activities', count: 1, height: 2650, firstHeading: null },
  ],
  // Bare 'section' = 8 (the 5 above plus nested .en language variants and .activities).
  // Always use the #id form. 'section#about .activities > *' = 2.
  primaryCta:      { selector: '#top .button.hov',      count: 1, height: 96 },  // the "Enter" gate
  navToggle:       { selector: '#toggleMenu',           count: 1, height: 0  },  // hamburger, 3 <hr>
                   // VERIFIED display:none at 1440x900 — present in DOM but inert at this
                   // viewport. Treat as null for desktop capture; it is real on mobile.
  card:            null,  // no repeating card unit; each chapter is bespoke long-form editorial
  signatureEffect: { selector: 'canvas#view', count: 1, height: 900 },  // the entire visible page
  durabilityWarning:
    'None — this is the most durable of the five. Selectors are ids the author wrote ' +
    '(#top, #statement, #legacy, #philosophy, #about, #navi, #main, #dummy, #view, #dot) plus ' +
    'author-set data-id attributes. No build hashes, no CSS modules, no framework-generated ' +
    'classes anywhere. Ironically it is the site whose selectors are safest and whose CAPTURE is ' +
    'hardest.',
  hazards: [
    'INTRO GATE: must click #top .button.hov ("Enter"). The scroll method is different before and ' +
      'after, in opposite directions — see above. Allow ~5s to load, then ~7s for the enter ' +
      'transition before reading the DOM.',
    'canvas#view is position:fixed z-index 2 OVER main#main at z-index 1, and is the entire ' +
      'visible page. Element-clip screenshots are useless here; only viewport screenshots capture ' +
      'the real design.',
    'canvas#dot at z-index 0 is a second full-viewport canvas.',
    'ALL text carries .hideText { text-indent: -99999px; overflow: hidden }. Do not try to read ' +
      'the design from the DOM; do not expect DOM text to appear in an image.',
    '#main > .container carries a live matrix3d transform, so getBoundingClientRect on any ' +
      'descendant is scaled and wrong mid-animation. I measured #philosophy at h=162247 during a ' +
      'transition vs its true offsetHeight of 2144. Use offsetTop/offsetHeight.',
    'INFINITE SCROLL: scrolling to the end grows documentElement.scrollHeight without bound ' +
      '(22592 -> 316288 over 12 jumps) and moves section offsets. Never drive by absolute offset ' +
      'near the end; navigate by #navi li[data-id] clicks and allow ~4.5s per transition.',
    'Sound: the site plays audio and announces it on the gate. Launch muted.',
    'Chapter transitions are ~4s of 3D animation. Reading geometry early gives garbage.',
  ],
  routes: [],
  routeEnumeration:
    'Genuinely a single-page site — 0 <a> elements in the entire document, location.href never ' +
    'changes, location.hash stays empty. Enumerate the 4 chapters from #navi [data-id] ' +
    '(statement, legacy, philosophy, about; plus h1[data-id="top"]), each mapping to ' +
    'section#<data-id>. Read the active chapter from #navi li.current.',
}
```

---

## Cross-site summary

| site                   | sectionMode                 | sections | scroll method         | build-hash risk                                         |
| ---------------------- | --------------------------- | -------- | --------------------- | ------------------------------------------------------- |
| pacomepertant `/`      | canvas-only                 | 0        | n/a (no scroll)       | none                                                    |
| pacomepertant `/about` | dom                         | 7        | any of three          | none                                                    |
| guglieri               | dom                         | 7        | native window         | **high** — use `data-framer-name`, not `framer-XXXXX`   |
| helloshivam `/work/`   | dom                         | 6        | native window         | none                                                    |
| belenjones             | dom                         | 6        | overlay-internal only | **high** — use `[class^="landing__X-"]`, not `sc-` hash |
| y-n10                  | dom (viewport capture only) | 6        | flips at the gate     | none                                                    |

Three of the six pages are gated by a click that must happen before anything is measured
(pacomepertant "enter without sound", y-n10 "Enter", belenjones cube-click for project detail), and
two are painted entirely into a WebGL canvas that sits above the DOM (pacomepertant `/`, y-n10).
Those are the failures a scripted pass cannot see, and they matter more than any selector here.
