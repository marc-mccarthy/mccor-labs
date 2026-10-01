# Entry-gate inventory — MEASURED, controller-run, 2026-09-27

Method: Playwright MCP `browser_run_code_unsafe`, viewport 1440x900, `domcontentloaded` + 2.5-3s
intro settle, click the entry affordance, wait for content growth, screenshot both states.
Images: session scratchpad `gates/<slug>-{gate,content}.png`. Every number below was observed in
this run; nothing here is inferred from CSS or z-index.

## Confirmed gated

### pacomepertant.com — GATED
- Affordance: `button:has-text("enter with sound")`. TWO buttons offered: "enter with sound" and
  "enter without sound". Chose **with sound** — sound is part of the site's design intent.
- Before: `main.children = 1`, `scrollHeight = 900`, bodyText 292 chars, entry buttons present.
- After:  `main.children = 0`, `scrollHeight = 900`, bodyText 216 chars, entry buttons GONE,
  sound toggle appears bottom-right.
- **The DOM gets emptier while the page fills up.** Verified visually: post-entry the viewport shows
  a WebGL 3D spiral of ~10 project thumbnails floating in space, a `spiral | list` view toggle, a
  `menu` button, and a rotating "showreel 2025" marker.
- localStorage: no key set. The gate re-appears on every fresh context; it cannot be pre-seeded.
- **CAPTURE IMPLICATION:** this site has neither DOM sections nor scroll. `sectionMode` must be a
  third kind — interaction states (spiral view, list view, menu open, project hover/open), captured
  as viewport screenshots. Scroll-frame capture would produce 16 identical images.

### y-n10.com — GATED
- Affordance: **`div.button.hov.hideText`** at viewport (970, 642) — neither `<button>` nor `<a>`,
  which is why every tag-based selector missed it. Text reads "Enter ->".
  Gate screen also states "Sound is played on this site".
- Before: `scrollHeight = 900`, `#main.scrollHeight = 5812`, bodyText 3314.
- After:  `scrollHeight = 22592`, `#main.scrollHeight = 900`, bodyText 3207.
- **Scroll driver INVERTS across the gate** — measured, confirming the deepdive's claim:
  pre-entry `#main.scrollTop` is the scroller; post-entry `window.scrollTo` works
  (set 500, read back 500) and `#main.scrollTop` stays 0.
- Verified visually: post-entry is an isometric VOXEL WORLD — Lego-like 3D terrain with trees,
  figures, a rainbow unicorn, the No10 logo built from cubes. Nav: Statement / Legacy / Philosophy /
  About. Sound On/Off control. A "View" mode toggle.
- **CAPTURE IMPLICATION:** 22592px of real scroll AFTER entry. Capture must enter first, then use
  `window.scrollTo`. The earlier 316288px runaway reading was almost certainly an infinite/looping
  scroll world — cap scroll travel and verify frames differ, per the SCROLL_STUCK guard.

## Confirmed NOT gated

### helloshivam.com — NO GATE
- `hasGateWord` false; no enter/begin/start text anywhere in the body.
- `scrollHeight = 900`, bodyText 123 chars. Full visible text is:
  "Shivam Sinha Designer, Creative Coder, & Thinker. Currently a Designer at Work&Co
   Work Information LinkedIn Instagram (c)2026"
- This is a deliberate minimal single-screen landing page. It is NOT broken and NOT gated; the
  earlier "empty main" reading was accurate but the "no content" conclusion was wrong — the text
  renders outside `<main>`'s box.
- Real depth lives at `/work/` (3998px, 22 `a.thumb` cards, 25 routes).
- **CAUTION LOGGED:** a previous generic sweep matched `[class*="enter"]` against a CONTENT element
  here and clicked a LinkedIn link, opening a stray tab. Proof that the centre-click / broad-class
  fallback must NOT run on ungated pages.

## Remaining seven — ALL MEASURED, none gated

| site | gate | scrollHeight | main.children | localStorage keys | note |
|---|---|---|---|---|---|
| guglieri | none | 2100 | no `<main>` | - | Framer; `data-framer-name` is the durable selector basis |
| belenjones | none | 900 | 1 | - | page itself does not scroll; content is in an internally-scrolling overlay |
| david-hckh | none | 5864 | no `<main>` | `portfolio-soundsEnabled`, `portfolio-locale` | sound settings WITHOUT a gate |
| topology-vc | none | 900 | 1 | - | 2422 chars of text in a non-scrolling document |
| squadeasy | none | 11903 | 1 | `_gcl_ls` | one fixed z-9999 div `#hs-web-interactives-top-anchor` (HubSpot), empty text |
| shopify | none | 11278 | 15 | 5 analytics keys | the only site with a conventional `<main>` structure |
| raggededge | none | 11770 | 3 | - | conventional, tallest of the non-gated set |

**Final tally: 2 of 10 gated** — pacomepertant and y-n10 only.

## david-hckh project routes (measured by clicking through)

Five real routes under `/project/`, all server-routed with proper `href`s:

    /project/cubewar    CubeWar          Multiplayer strategy game
    /project/quibbo     Quibbo           Multiplayer gaming platform
    /project/sharkie    Sharkie          2D adventure game
    /project/particles  WebGL Particles  Dynamic 3D particles
    /project/pokedex    Pokedex          Open-source learning project

`/project/cubewar` measured: 4779px tall, 1 `<video>`, 1 `<canvas>`, 12 images.
Verified visually — dark navy hero, oversized white wordmark, colour-coded tech-stack pills
(Three.js orange / Node.js green / WebSockets blue / Redis red), a "LIVE VIEW" pill CTA, description
in a right-hand column, then a large rounded-corner panel holding gameplay media. Back arrow
top-left; GET IN TOUCH + sound toggle top-right.

Project cards on the home route are `a.preview-card.children-unclickable[href^="/project/"]`,
447x308, in a 2-up grid starting at absolute y=3536. **`children-unclickable` is a deliberate
pointer-events pattern** — the card is the click target, its children are not; worth noting for the
UI spec.

CAPTURE NOTE: the cards sit at absolute y~3536 on a 5864px page, so a naive "click the first
plausible link in the viewport" targets the header's `mailto:` CTA instead. Scroll the card into
view by its own measured offset before interacting.

## Rules this establishes for the capture system
1. Gate detection cannot rely on tag names. y-n10's gate is a `div`. Match on TEXT plus clickable
   geometry, then click by coordinates.
2. Content growth must be asserted on MULTIPLE signals. pacomepertant's `main.children` DECREASES
   and `scrollHeight` is unchanged on a successful entry; only the disappearance of the gate element
   and the visual change prove it worked.
3. Never run a broad-class or centre-click fallback on a page with no gate evidence — it clicks real
   links.
4. Re-measure `scrollHeight` AFTER entry. Pre-entry values are meaningless: y-n10 reads 900 and is
   actually 22592.

## Reconciliation with the independent agent pass (2026-09-27, later)

An independent agent swept all ten sites for gates. Reconciling against the controller's own
measurements:

**DISAGREEMENT — y-n10's gate. Controller finding stands.**
The agent reports the gate as "canvas-painted, zero DOM selectors match it, needs a raw coordinate
click". That is wrong in its first half. Measured directly:
  - `document.querySelector("div.button.hov")` EXISTS (3 instances), `textContent` is "Enter",
    `text-indent: -99999px`, rect 96x96.
  - The OWNER's real click landed on that exact element — the recorded event target was
    `div.button.hov.hideText.hover` (note the appended `hover` class).
  - `getComputedStyle` reports `pointer-events: none` and `elementFromPoint` returns `main`, which is
    why `locator.click()` times out on its actionability check.
CONCLUSION: the element is real and does receive events. Use the SELECTOR to measure the rect, then
dispatch `page.mouse.click(cx, cy)`. This is viewport-durable; hard-coded coordinates are not.

**NEW AND ACCEPTED — cookie banners are a SEPARATE category from entry gates.**
squadeasy and raggededge carry GDPR consent banners ("Accepter" / "Accept All"). These are not
design-intent splash gates and must not be captured as `entry-gate.png`. They belong to the
`VIEWPORT_OBSTRUCTED` overlay guard instead.
This explains an anomaly in the controller's own data: raggededge measured 17821px with the banner up
and 11770px after accepting. The controller's hover run measured 11770px — i.e. it was measuring
post-dismissal without knowing why. **Any height measured with a consent banner present is suspect.**

**NEW AND ACCEPTED — substring matching on "enter" is a real hazard.**
The agent's sweep navigated AWAY from two homepages because "Enter" matches inside "Enterprise"
(shopify nav) and `[class*="enter"]` matched a nav container (topology-vc). The controller's own
sweep used an anchored regex `^(enter|...)$` and avoided this — but by drafting luck, not by design.
REQUIRED: anchored/word-boundary text matching, PLUS a same-URL assertion after any gate click. If
the URL changed, the click was not a gate click — navigate back and record a warning.

**NEW AND ACCEPTED — no pre-seed shortcut exists.**
Neither real gate (pacomepertant, y-n10) writes to localStorage or sessionStorage; both reappear in
every fresh context, confirmed 2/2. The hoped-for optimisation of pre-seeding a consent key and
skipping the click is NOT available. Every context must click through, so the gate step must be
reliable rather than clever. Cookie-banner consent may use actual cookies — unchecked, and a
worthwhile follow-up since `storageState` could then pre-seed those two.

**CONFIRMED INDEPENDENTLY — pacomepertant is a 3D orbit scene, not a tall page.**
scrollHeight stays 900 before AND after entry because the content is an orbit-navigable 3D gallery.
Matches the controller's finding and explains the `lenis.limit === 0` reading.
