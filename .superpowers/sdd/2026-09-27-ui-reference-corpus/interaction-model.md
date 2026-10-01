# Interaction model — recorded from the OWNER's real clicks, 2026-09-27

Method: Chrome launched with `--remote-debugging-port=9222`, Playwright attached over CDP, the
owner drove each site by hand for ~15s while a capture-phase click/keydown listener recorded the
real event targets. Every selector below is one a human actually hit. Screenshots in the session
scratchpad under `live/`.

This is the artifact a script could not produce: it records what is CLICKABLE and what HAPPENS,
not what the DOM looks like at rest.

| # | site | entry | nav pattern | routes | doc height | notes |
|---|---|---|---|---|---|---|
| 1 | david-hckh | none | `button.header-link.header-home-link.children-unclickable` scroll-to | `/project/{cubewar,quibbo,sharkie,particles,pokedex}` | 5336 | header items are BUTTONS, not links |
| 2 | pacomepertant | **GATED** `button.button.enter.show` "enter with sound" | `span` "list"/"spiral" toggle, `.overlay`, menu letters | `/projects/jupiter` … | 817 → **2868 on a project route** | project pages are REAL DOM |
| 3 | topology-vc | none | `a.link-hover.js-desktop-nav-link` | **none — swaps in place** | 817 (never scrolls) | `canvas#webgl` at z-index −1 |
| 4 | belenjones | none | **`canvas` click opens project**; name text is INERT | none — URL never changes | 817 | overlay chrome `button.landing__OverlayButton-…` = `/RETURN`, `NEXT` |
| 5 | squadeasy | none | conventional links | `/challenges` | 11918 → 3535 | French copy, conventional marketing site |
| 6 | y-n10 | **GATED** `div.button.hov.hideText` (raw mouse click only) | `#navi li[data-id]` | none — single page | 817 → **22592 after entry** | `canvas#view` z2, `canvas#dot` z0 |
| 7 | shopify | none | conventional | `/enterprise` | 11027 / 11676 | **11 videos home, 14 on /enterprise** |
| 8 | raggededge | none | `a.c-nav__link`, `a.o-btn.o-btn--sm` | `/happenings` | 12081 | BEM/ITCSS naming; 2 canvases; **15 videos** |
| 9 | guglieri | none | `strong.framer-text` links | `/downloads`, `/feed` | 1903 → **21940 on /feed** | headings are SPLIT PER WORD for stagger |
| 10 | helloshivam | none | `a.open-index` (Work), `a.open-info` (Information) | `/work/experiential-web` … | 817 → 3398 | thumbnails are `video.image-wrapper`, **9 videos** |

## Findings that change the capture design

1. **Only 2 of 10 are gated** — pacomepertant and y-n10. Every other "empty page" reading earlier in
   this project was a measurement artifact, not a gate.

2. **y-n10's gate: use the selector for GEOMETRY, a raw mouse click for DELIVERY.** The element
   `div.button.hov.hideText` exists and its text is "Enter" (hidden via `text-indent:-99999px`), but
   `getComputedStyle` reports `pointer-events: none` and `elementFromPoint` returns `main`.
   Playwright's `locator.click()` therefore TIMES OUT on its actionability check — yet the owner's
   real click landed on that exact div (its class gained `hover`). So: measure the rect from the
   selector, then dispatch `page.mouse.click(cx, cy)`, which bypasses actionability. This is durable
   across viewports, unlike hard-coded coordinates.

3. **pacomepertant is NOT interaction-states-only.** Ruling 18 was based on the home route alone. The
   owner clicked through to `/projects/jupiter`: 2868px of real scrollable DOM with a `<video>` and an
   `<h1>`. So the site is HYBRID — a WebGL spiral on `/`, conventional section-capture on project
   routes. Capture both.

4. **belenjones: the canvas IS the button.** Clicking the project NAME
   (`div.landing__NavigationButton-…`) is inert — confirmed twice, `bodyText` stayed 437 across every
   click. Clicking the `canvas` opens a project overlay whose chrome is
   `button.landing__OverlayButton-sc-803efe7c-34` with `/RETURN` and `NEXT`. On this site `bodyText`
   is useless as a state signal; only `visibleEls` (39→49) moved.

5. **topology-vc has no routes and never scrolls.** Nav swaps content in place at a constant 817px
   with an unchanged URL. Capture needs one state per nav item, keyed by nav label.

6. **guglieri splits headings per word.** `"A" "growing" "collection" "of" "unique" "digital"` are
   separate elements for staggered animation — not broken extraction. Typography extraction must
   reassemble them or it will report six headings where there is one sentence.

7. **Video is the dominant medium in the conventional tier.** raggededge 15, shopify 14, helloshivam 9
   (its work thumbnails are `<video>` elements, not images). Any rebuild matching these references is
   a video-delivery problem as much as a layout one.

## Probe limitation, recorded honestly
The click listener lives in the page, so a real navigation wipes it — squadeasy and shopify show
`YOUR_ACTIONS []` despite the owner clicking, because the click caused a page load. The URL delta is
the evidence in those cases. A capture that needs full click traces must re-install the listener on
`framenavigated`.

## Hover-state deltas — MEASURED (raw data in `hover-deltas.json`)

Captured in a clean context at 1440x900 @2x, after `load` -> networkidle -> `fonts.ready` -> 3.5s
settle -> lazy-scroll sweep -> return to top. Each target: computed style before, hover, 900ms wait
(past the longest transition observed), computed style after, diffed to only changed properties.

### raggededge — `a.o-btn` (x5, "All partnerships")
    color             #FFFFFF -> #181F1F
    background-color  #181F1F -> #96EBEB      (mint)
    border-color      #FFFFFF -> #181F1F
    transition: color, background-color, border-color, text-decoration-color, fill, stroke
                0.3s cubic-bezier(0.4, 0, 0.2, 1)  DELAY 0.05s
A full colour inversion, and the 50ms delay is deliberate — invisible in a screenshot, and the kind
of number this corpus exists to capture.

Inline link `a[href*=work]`: `text-decoration-color` transparent -> `rgba(24,31,31,0.4)` over 0.15s,
same easing. Underline fades in at 40% opacity rather than switching on.

### david-hckh — much faster tempo than raggededge
    button.header-link (x3)  color #2D2A24 -> #FFFFFF        0.1s ease-in-out
    a.button-wrapper "GET IN TOUCH"  background #FF8400 -> #2D2A24   0.1s ease-in-out
0.1s vs raggededge's 0.3s: a measurably snappier interaction feel, from the same class of control.

### guglieri — motion is JS-DRIVEN, not CSS
    a[data-framer-name] (x11)  transform matrix(1,0,0,1,0,0) -> matrix(1.00076, ..., -0.244421, ...)
    strong.framer-text (x6)    color #CFCFCF -> #111111
    BOTH report `transition: all 0s ease`
**A 0s CSS transition with a visible change proves the animation is driven in JavaScript** (Framer
Motion springs), not by CSS. Easing for this site CANNOT be read from computed style — it must be
sampled frame-by-frame with a rAF sampler. Any extraction that trusts `transition-duration` here
will record "0s" and be wrong about every animation on the site.

### Honest negatives (recorded, not hidden)
    a.preview-card (david-hckh)  no computed change on hover
    a.c-nav__link  (raggededge)  no computed change on hover
Their hover effect lives on a CHILD element or in canvas, not on the hovered element itself. Worth
re-probing children before concluding these controls have no hover state.
