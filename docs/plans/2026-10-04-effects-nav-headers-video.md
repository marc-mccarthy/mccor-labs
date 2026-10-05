# Effects round: nav bar, page headers, motion gaps, header video

Owner request (2026-10-04): cooler effects and visuals for the navigation bar and the page
headers, motion where there is none yet, and video wherever it fits. Owner: plan only, do not
build yet.

Sources: three independent design proposals (creative director, creative technologist,
conversion UX lead; each used the ui-ux-pro-max skill and read the components), a motion audit of
every route, and Antigravity's capability answer. Where the three agreed, this plan follows them.
Where they split, the ruling and its cost are recorded under each task.

## Facts this plan rests on

- **Antigravity cannot generate video.** It has `image-generator` (stills) only, and has
  confirmed no Veo or other text-to-video tool exists in its environment. `hero-loop` and
  `systems-push` were rendered by scripts that animate a still: a 2.5D depth push plus a
  travelling crimson/ember pulse, piped to FFmpeg. New video is made the same way.
- **The audit corrected two of its own assumptions.** The 404 page exists
  (`app/web/src/app/not-found.tsx`), but it is plain text. The pipeline line draw also exists
  (`components/substance/useScrollDrawn.ts`, `PipelineDiagram.tsx:30,43-49`), but every edge
  draws at once and in grey.
- **No motion today:**
  - the nav bar (color change on hover only)
  - the mobile menu (shown and hidden with the `hidden` attribute, `Header.tsx:96`)
  - the footer
  - `ServiceBlock` and `CapabilityBlock` on /services
  - the 404 page
- **Page-header bands** on /services, /process, /about and /contact are a still image plus
  Parallax.
- **Defects found along the way:**
  - The mobile menu has no booking button; `Header.tsx:51` hides `BookingCta` below `md`.
  - Mobile menu links are about 20 px tall, below the 44 px tap-target minimum.
  - No nav link has `aria-current`.
  - Two hovers are slower than the spec's 0.12 s pointer rule: the logo (`Logo.tsx:27`, 0.3 s)
    and the button (`button.tsx:8`, Tailwind's 150 ms default).
  - **WCAG 2.2.2 (Level A):** `hero-loop` and `systems-push` loop indefinitely, and the user has no
    way to pause them. The only `pause()` calls are automatic off-screen pauses in
    `VideoMotionHero.tsx:60,71`.

## Hard rules every task keeps

- **Reduced motion is fully gated.** Every new animation or transition lives inside
  `@media (prefers-reduced-motion: no-preference)` or uses Tailwind `motion-safe:`. Under reduced
  motion the effect does not exist at all, so `document.getAnimations()` is empty 500 ms after
  load (spec lines 180–231). The global reduce clamp alone is not enough.
- **Effects stay off the legal pages and /careers.** Turn them off with `body:has([data-legal])`,
  as the grain overlay does in `globals.css`.
- **Orange means clickable, crimson means signal.**
- **Pointer feedback** takes at most `--duration-pointer` (0.12 s).
- **No `motion/react` imports outside the primitives** (ESLint enforces this).
- **No new WebGL surface** (single-context invariant, `3d-council-consensus.md` §5). No new
  dependencies.
- **Header images are LCP elements.** Never fade, wipe or delay the band `<img>`.
- **Scroll-driven CSS** (`animation-timeline`) sits behind `@supports`. Browsers without it,
  Firefox included, keep today's static look. The Firefox e2e project therefore sees the static
  look.
- **Budgets:**
  - INP < 200 ms.
  - CLS 0.
  - The no-JS page height must equal the hydrated page height.
  - Lighthouse a11y, best practices and SEO ≥ 95.
  - Lighthouse perf: mobile ≥ 85 (currently 86–90 on `/`), desktop ≥ 90.
- **No code comments. Tokens only.**
- **Uncommitted work in `Hero.tsx`.** It carries another session's uncommitted slogan-h1 edit, plus
  this session's uncommitted lede. No task touches `Hero.tsx`, and every commit stages explicit
  paths only.

## Tasks (each ends in a commit of its own paths; each slice gets a Mode B agy review)

### 1. Pause control for every looping video (WCAG 2.2.2)

- **What:** add a 44×44 pause/play toggle to the shared video component, used by the hero,
  SystemsScene and the new header loops.
- **Behaviour:**
  - The button has `aria-pressed`, with the label "Pause background video" / "Play background
    video".
  - It is rendered only while a video is attached, and has a visible focus ring.
  - It is placed bottom-right of the video area. Its style is muted and unobtrusive; it uses
    orange only on hover/focus, because it is clickable.
- **Tests:** a unit test for the toggle and labels; an e2e test that pausing stops `currentTime`.
- **Ruling:** do this before adding any new loop. Cost if wrong: one small button on 3 sections.

### 2. Pointer-timing fixes

- **What:** `Logo.tsx:27` and `button.tsx:8` change to `--duration-pointer` and `--ease-pointer`.
- **Tests:** unit tests assert the class.

### 3. Nav: current page and hover underline

- **Current page:** `Header.tsx` (already a client component) adds `usePathname()` and sets
  `aria-current="page"` on the active link.
  - Compare with the trailing slash stripped on both sides, because `trailingSlash: true` is set
    in `next.config`.
  - The static export renders the attribute into the HTML.
- **Underline:** a 1 px `::after` line under each link.
  - The current link shows a full-width crimson line (brand into glow-red).
  - On hover, an accent-orange line grows `scaleX` 0→1 from the left in `--duration-pointer`.
  - Under reduced motion the line appears with no growth.
- **Ruling:** current page is crimson ("you are here"), hover is orange ("clickable"). The
  proposals split three ways on the hover color; orange follows the brand rule. Cost if wrong:
  one token.
- **Tests:** a unit test for `aria-current` on each route, including with and without the
  trailing slash.

### 4. Header scroll state and progress line (CSS only)

- **Scroll state:** inside `@supports (animation-timeline: scroll())` and `no-preference`, over
  the first 0–80 px of `scroll(root)`:
  - the bottom border changes from `--color-border` to a transparent → brand → glow-red →
    transparent hairline;
  - the blur deepens from `backdrop-blur` to `backdrop-blur-xl`.
- **Progress line:** a 1 px crimson line along the bottom edge scales with page progress
  (`scaleX`, `scroll(root)`).
  - Off on legal pages and /careers.
  - Implemented as a pseudo-element, so CLS stays 0. No JS, so INP is unaffected.
- **Ruling:** keep the header sticky and in normal flow; no transparent-at-top state. It would
  change the layout and risk CLS. Cost if wrong: a slightly less dramatic top state.
- **Tests:** CSS presence via a unit snapshot of the classes. An e2e test in Chrome checks that
  the line's computed transform changes after scrolling (skipped where unsupported).

### 5. Mobile menu

- **Open/close animation:** keep the `hidden` attribute, so accessibility behaviour does not
  change. Add `@starting-style` plus `transition-behavior: allow-discrete` on
  `display`/`opacity`/`translate`.
  - Opening takes `--duration-standard`; closing takes `--duration-pointer`.
  - Links follow one after another with `transition-delay: calc(var(--i) * var(--stagger-interval))`.
- **Menu icon:** three `<line>`s morph into an X (`motion-safe` only).
- **Defect fixes in the same slice:**
  - links get `min-h-11` (44 px);
  - a full-width `BookingCta` goes at the bottom of the menu.
- **Ruling:** the `BookingCta` in the menu is a content change. It is included because mobile
  visitors have no booking button at all today, and the site's job is booking calls. Cost if
  wrong: one line to remove.
- **Tests:** open/close behaviour unchanged (`hidden` toggles, focus handling); the CTA is present
  in the menu; tap targets ≥ 44 px (e2e at 390 px).

### 6. Pipeline: stage-by-stage draw and node ignition

- **What:** in the three diagrams that use `useScrollDrawn` (Pipeline, Integration, Workflow),
  each edge gets `transitionDelay: index × --stagger-interval`.
  - The edge stroke changes to `--color-brand`.
  - Each node's stroke moves from `--color-border-strong` to `--color-brand` as its edge arrives,
    keyed off the existing `drawn` state.
  - It still triggers on entering the view; no scroll scrubbing, because Pipeline3D already
    scrubs.
- **Tests:** unit tests assert the delays and the drawn-state classes. The reduced-motion e2e test
  still passes.

### 7. Page-header text treatment

- **Where:** only on bands that have an image (/services, /process, /about, /contact).
- **What:**
  - a 1 px crimson line along the bottom of the band draws `scaleX` 0→1 over `--duration-scene`
    (CSS keyframes, `motion-safe`);
  - the description gets the existing `motion-safe:animate-lede`.
  - The h1 and the image stay static, to keep the LCP safe.
  - Reveal's "already in view = shown" rule means a mask wipe would never play here anyway.
- **Tests:** a unit test for the classes. The e2e no-JS vs hydrated height gate stays equal.

### 8. Header video loops for /services and /process

1. **Assets (Antigravity Mode A, resumed session, sandboxed, writing to `candidates/` only).**
   - Render from the existing stills `header-services.webp` and `header-process.webp`.
   - Format:
     - 180 frames at 30 fps (6 s), about 1920 px wide at the band's aspect.
     - VP9 webm plus H.264 mp4, with faststart and no audio.
   - **Size targets:** webm ≤ 0.9 MB, mp4 ≤ 1.6 MB.
   - **The camera path must be periodic (sin/cos), so frame 0 equals frame 180.** A straight
     push cannot loop cleanly; that is the cause of the known hero-loop seam, about 3× a normal
     frame step.
   - **NO TEXT.** Open the brief with the WORLD block from HANDOFF-PHASE-3 §5.
   - **/services loop:** slow elliptical drift, ±2 % parallax. An ember packet runs up the
     trunk from bottom-left and splits into five branches. The five nodes flare in turn, 80 ms
     apart.
   - **/process loop:** gentle elliptical drift along the ring axis. A crimson bead travels the
     core beam left to right, and each ring's rim catches crimson as the bead passes.
2. **QA by the controller before approval:**
   - `ffprobe`: codec, frame count, duration, no audio, faststart;
   - mean difference between consecutive frames (proves real motion);
   - seam step vs a normal step (target ≤ 1.5×);
   - open frames 0, 45, 90 and 135 at full size plus brightened corners: no glyphs, no padding
     seams, no brand look-alikes.
   - Log the approval in the ledger, then copy into `public/media/brand/` (left untracked, the
     owner's pattern).
3. **Wiring:**
   - `PageHeader` gains an optional `video` prop. A small client child reuses `useVideoAttach` from
     `VideoMotionHero.tsx` on desktop only (`(min-width: 768px)`), after `load`.
   - It is skipped for reduced motion and Save-Data, crossfades over the poster as SystemsScene
     does, and includes task 1's pause toggle.
   - The server-rendered `<img fetchPriority="high">` stays the LCP element.
4. **Rulings:**
   - No video on /about: portraits do the work there, and motion next to them undercuts the
     "real firm size" message.
   - No video on /contact: it is the conversion page and must stay light, and its still repeats in
     CtaBlock.
   - No video in CtaBlock, the 404 or the footer: weight is not worth it.
   - Cost if wrong: one more loop later, about 0.8 MB on desktop.
5. **Tests:**
   - unit: the prop wires the `<video>` sources; the poster is unchanged.
   - e2e: no video request on mobile or under reduced motion; LCP is still the image; desktop
     Lighthouse ≥ 90 on /services and /process.

### 9. /services: ServiceBlock and CapabilityBlock

- **ServiceBlock:**
  - A 1 px crimson rail on the left edge fills top to bottom via `animation-timeline: view()`
    (`@supports` + `no-preference`).
  - A `:target` cue: arriving at `#slug` from a home card fades in a crimson line under that
    block's heading (opacity only).
  - Do NOT use Stagger on the `<li>`s: it would produce invalid `ul > div` markup.
- **CapabilityBlock:** the existing `Spotlight` on the substance panel, which is pointer-only and
  off under reduced motion. Wrap the panel in `Reveal`; Reveal accepts server children, so the
  async server component stays as it is.
- **Tests:** unit tests for the classes and the Spotlight presence; e2e checks that the `:target`
  line is visible after `/services/#<slug>`.

### 10. Footer

- **What:**
  - The top border becomes a hairline whose crimson part sweeps left to right as the footer
    enters the view (`view()` timeline; no looping).
  - Footer links get the same hover underline as the nav (task 3).
  - Off on legal pages.
- **Ruling:** no `BookingCta` in the footer; CtaBlock sits directly above it on the main routes.
  Cost if wrong: one line.

### 11. 404 "signal lost"

- **What:** keep the page's text and its home button. Add:
  - a mono eyebrow, "404 · signal lost";
  - an inline SVG of three nodes, with a crimson edge that draws in once and stops short of a
    dim, unlit node (CSS one-shot, `motion-safe`, fixed `viewBox` so CLS is 0);
  - a `BookingCta`.
- No three.js.
- **Tests:** a unit test for the SVG, eyebrow and CTA. The axe e2e test covers the route.

### 12. Done-gate

- **Static checks:** tsc 0; lint 0 errors.
- **Unit:** all tests pass.
- **Build:** once.
- **e2e:** all pass. This includes:
  - the reduced-motion `getAnimations()` assertion;
  - the no-JS vs hydrated height gate.
- **Budgets:** CLS 0; INP on a quiet machine (1-min load average < 5).
- **Lighthouse:** 3 runs per changed route, median.
- **Screenshots** of the nav (390 / 1280, scrolled and not), the mobile menu open, every band, the
  footer and the 404. Open every one.
- **Reviews:** Mode B agy per slice, then a `/code-review` reviewer subagent.

## Explicitly not doing

- **A route indicator that slides between nav links.** It needs JS measurement or React
  `<ViewTransition>`, which would be a second route-transition system next to `RouteTransition`.
  CSS anchor positioning does not animate between anchors.
- **WebGL in the nav, header bands, footer or 404.** It breaks the single-context invariant and
  consensus §5.
- **Any fade or wipe on page h1s or header images.** It would delay LCP.
- **Text scramble, typing effects, magnetic nav links or a custom cursor.** They hurt INP and
  screen readers, and fit a brochure, not the Linear/Vercel register.
- **Effects on /careers, /privacy and /terms.** The spec rules them out.
- **JS scroll listeners for chrome effects.** CSS scroll timelines cost nothing.
- **Video on /about, /contact, CtaBlock, the 404 or the footer.**

## Open risks

- **Browser support is unverified.** Safari support for `animation-timeline` is assumed, not
  checked. Everything degrades to today's static look.
- **Video sizes are estimates**, scaled from `systems-push` (0.93 MB webm / 2.18 MB mp4 at
  1920×1080). They are not encodes.
- **Lighthouse noise.** The Lighthouse script takes one sample per route with no load check (one
  run read 50 under load this session). Task 12 takes 3 runs and the median.
