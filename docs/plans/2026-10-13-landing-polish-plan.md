# Landing page polish plan

Route: `/` (http://localhost:3000/). Baton ledger: `docs/plans/landing-polish.baton.json`.

## Context

The landing page is `app/web/src/app/page.tsx`. It renders seven sections in order: Hero, DeliveredStrip, ServicesPreview, SystemsScene, PipelineSection, ProcessScroller, CtaBlock (`page.tsx:13-19`). The app is a Next.js 16 static export in `app/web` with Tailwind 4, motion 13, lenis and three. The header (`components/layout/Header.tsx`) and footer (`components/layout/Footer.tsx`) wrap every route.

### Scope

- Ambition: bold showcase. Shader and WebGL work, scroll choreography and several signature moments are in scope. Each one keeps reduced-motion parity and keeps `budgets.spec.ts` and `a11y.spec.ts` green.
- New npm dependencies: allowed when justified and flagged for owner approval, never installed. This plan proposes none.
- Local launch: `pnpm -F web dev` (root `pnpm run dev` wraps `op run` and prompts on a TTY).
- The reusable piece for other pages is the saved workflow that produced this plan. It is outside this plan.

Ruling: plan to the final scope answers relayed with this task (bold showcase), which differ from the narrower answers recorded in the capture notes (polish plus 1-2 signatures, no deps) (cost if wrong: M2 carries five signature moments; trim M2 to M2.1 and M2.2 and the rest of the plan still stands).

### Hard rules for every task

- Colors only from the `@theme` block in `app/web/src/styles/globals.css` (lines 19-32). Name tokens. Never type hex, rgb(), hsl() or oklch() values. Tests compare colours through a token probe (see M0.0), never through literals.
- `color-mix()` is allowed only as one token mixed with `transparent` (the pattern in `Spotlight.tsx:6-7`). Never mix two tokens into a new colour. For a tint over a surface, layer a token-with-transparent element over the surface. If no token fits, stop and report the gap.
- Shaders take colour only through uniforms fed by `context.color('<token>')` in `SceneRuntime`. New shader code does not interpolate between two colour uniforms; it changes intensity or alpha of one uniform. The existing `mix(uColorRed, uColorOrange, vPulse)` at `NodeLatticeScene.tsx:54` predates this plan and stays as it is.
- No code comments of any kind, including GLSL and CSS. Exempt: tool directives (`'use client'`, `@vitest-environment`, `eslint-disable`).
- No text baked into images or SVG. Stage labels, descriptors and counters stay in HTML or CSS generated content.
- Every motion effect has a reduced-motion fallback through `useReducedMotion` (`app/web/src/components/motion/useReducedMotion.ts`) or `motion-safe:` / `motion-reduce:` / `@media (prefers-reduced-motion: no-preference)`.
- Every motion effect also has a paused-mode behaviour (see "Paused-mode parity" below), once M0.3 lands.
- `motion.spec.ts:5-15` asserts `document.getAnimations().length === 0` under reduce. Every new CSS keyframe or scroll-driven animation uses the `motion-on:` variant or lives inside `@media (prefers-reduced-motion: no-preference)` with `:root:not([data-motion="paused"])`. Do not rely on the global 0.01ms rule, because filled animations still count.
- `budgets.spec.ts:169-189` requires SSR `scrollHeight` to equal hydrated `scrollHeight` under reduce on `/` and `/process/`. SSR renders the motion branch (the media-query snapshot is false). Layout differences between modes come from `motion-reduce:` CSS, never from a JS branch alone.
- Text never sits at partial opacity. Axe in `a11y.spec.ts:19-33` runs in motion mode at rest, and `--color-muted` at reduced opacity over `--color-surface` falls below 4.5:1. De-emphasise with border, background or position, or hide fully with `opacity: 0` plus reserved space.
- `app/web/tests/e2e/budgets.spec.ts` and `a11y.spec.ts` are not edited and must keep passing. Never edit a test to make buggy code pass. New test cases are allowed. Count changes caused by an intended new scene (M2.5) are allowed and named.
- Do not run or edit git. Do not touch `app.env`, `pw.json`, `AGENTS.md` or `docs/plans/should-this-be-ai-*`.
- Contact UI (`app/web/src/components/contact/*`) is not edited. Its markup, roles and `ContactForm.test.tsx` behaviour stay stable. Any task that changes `Button`, `Reveal`, `useReducedMotion.ts` or `content/ui.ts` re-runs `src/components/contact/ContactForm.test.tsx`.

### Paused-mode parity

M0.3 adds `html[data-motion="paused"]`, set by a page-wide toggle. Paused mode stops autoplaying and decorative motion. It keeps scroll-linked motion that carries content, because removing it would hide content or shift layout.

| Effect                                                                                | Paused behaviour                         | How                                                                 |
| ------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| Grain drift (M0.5)                                                                    | static texture                           | `motion-on` gate in CSS                                             |
| Header scroll timeline, footer sweep, `[data-service-rail]`, `band-signal` (existing) | drawn at end state                       | M0.3 adds `:root:not([data-motion="paused"])` to the existing rules |
| Focus settle (M0.6)                                                                   | static two-tone ring                     | `motion-on` gate                                                    |
| Press scale (M0.7)                                                                    | no scale; cursor and pressed border stay | `motion-on:` on the `press` utility                                 |
| Signal sweep, SectionSeam, CTA edge sweep, CTA stag drift (M0.8, M1.5)                | drawn, final position                    | `motion-on` gate                                                    |
| Word rise, eyebrow tick (M0.10, M0.11)                                                | static text, full tick                   | `motion-on` gate; the reveal end state is the static state          |
| Hero badge `animate-pulse`, lede `animate-lede` (existing)                            | static                                   | switch `Hero.tsx:40,48` to `motion-on:` (M1.1)                      |
| Process rail fill, duration-chip pulse (M2.1)                                         | static full rail, no pulse               | `motion-on` gate                                                    |
| Process track horizontal shift (M2.1)                                                 | keeps scrubbing                          | it carries cards 3-5 into view; stopping it hides content           |
| Lattice gate states, pipeline stage states (M2.2, M2.3)                               | keep updating                            | DOM text states are content                                         |
| `Parallax`                                                                            | static (plain div)                       | reads `useMotionPaused` like reduced                                |
| `Magnetic`, `Spotlight`                                                               | off                                      | `usePointerEffects()` returns false when paused                     |
| SceneRuntime scenes (stag, lattice, pipeline, CTA stag)                               | last frame held, no rAF                  | M0.3 pause in place; exit dissolve and packet freeze with it        |
| Videos                                                                                | paused                                   | `useVideoAttach` reads `useMotionPaused`                            |
| Lenis                                                                                 | native scroll                            | `lenis.stop()` smoothing off                                        |
| `Reveal` entrance (finite, under 5 s)                                                 | unchanged                                | WCAG 2.2.2 covers motion over 5 s only                              |

Ruling: in paused mode keep the process track scrub and the gate and stage DOM states, and stop everything decorative (cost if wrong: a paused user still sees cards slide while scrolling; switching the track to a stacked layout on toggle would change page height after hydration).

Ruling: `usePointerEffects()` returns false when paused, while `useReducedMotion()` stays OS-only (cost if wrong: pointer glows switch off for paused users who wanted only autoplay stopped; one boolean to drop).

### How to run checks (from the repo root)

- Unit: `pnpm -F web test:run <path relative to app/web>`.
- E2E serves the static export, so build first: `pnpm build:raw`, then `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium <spec>`.
- Budgets run in their own project: `pnpm -F web exec playwright test -c playwright.config.ts --project=budgets --no-deps`.
- New landing e2e checks go in one new file, `app/web/tests/e2e/landing.spec.ts` (chromium project; its `testIgnore` only excludes budgets). M0.0 creates it. Each later task appends a titled test, so `-g "<title>"` runs it alone, and lists the file in its Files.
- Visual check: `pnpm -F web dev` in the background, then open http://localhost:3000/ at 1440 and 390, in normal, reduced and paused modes.

Ruling: new e2e checks go in a new `landing.spec.ts`, not into `budgets.spec.ts` or `a11y.spec.ts` (cost if wrong: timing-sensitive checks run under chromium parallel load and are noisier than in the serial budgets project).

## Capture findings

Inventory: `docs/ui-audits/landing/inventory.json`. Screenshots: `docs/ui-audits/landing/shots/`. Vitals: LCP 208 ms, CLS 0. No console or page errors in four runs; one headless "GPU stall due to ReadPixels" warning from a WebGL canvas. Mobile has no horizontal overflow at 390 px (scrollWidth equals clientWidth). Full pages: `shots/desktop-normal-full.png`, `shots/desktop-reduced-full.png`, `shots/mobile-normal-full.png`, `shots/mobile-reduced-full.png`.

| Section                | Screenshots                                                                                                         | Finding                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero                   | `shots/desktop-normal-section-00.png`, `shots/mobile-normal-section-00.png`                                         | Strongest section: monolith video, particle stag, H1, one orange CTA, parallax. The H1 is `text-display-sm`, the same step as every section H2 (`Hero.tsx:44`, `section-heading.tsx:10`), so the page has no top of hierarchy. At 390 px the stag body sits behind the badge, H1 and the muted lede, which lowers lede contrast.                                                                                              |
| Delivered              | `shots/desktop-normal-section-01.png`, `shots/mobile-normal-section-01.png`                                         | 190 px band, a "DELIVERED" label and two mono proof lines. Weak hierarchy, no dividers, reads generic.                                                                                                                                                                                                                                                                                                                        |
| What we build          | `shots/desktop-normal-section-02.png`, `shots/mobile-normal-section-02.png`                                         | Five identical cards in a 3+2 grid leave the sixth cell empty. The AI integration card has a permanent `border-brand` that reads like an error state. Links show only a focus outline; no hover or press change.                                                                                                                                                                                                              |
| Built to be evaluated  | `shots/desktop-normal-section-03.png`, `shots/mobile-normal-section-03.png`                                         | Full-bleed lattice video plus WebGL behind a large H2: the signature visual. Desktop section is 1350 px tall with about 450 px of empty pinned runway and no proof or action inside. It pins at every width; at 390 the heading and body sit mid-stage with room below.                                                                                                                                                       |
| How retrieval is built | `shots/desktop-normal-section-04.png`, `shots/mobile-normal-section-04.png`                                         | Seven empty circles on a red line with tiny mono labels and no stage descriptions. Reads thin at 1440 px. Becomes a vertical list on mobile.                                                                                                                                                                                                                                                                                  |
| How an engagement runs | `shots/desktop-normal-section-05.png`, `shots/desktop-reduced-section-05.png`, `shots/mobile-normal-section-05.png` | Pinned horizontal track from md in an 1800 px section. At rest 2.5 cards show, card 3 is clipped at the right viewport edge, and about 300 px of void sits under the cards inside the sticky stage. The larger void in full-page captures is a pin artifact. Reduced motion stacks five wide one-line cards that feel empty. Below md in motion mode it is a plain stack of five cards (1361 px at 390) with no progress cue. |
| Final CTA              | `shots/desktop-normal-section-06.png`, `shots/mobile-normal-section-06.png`                                         | Glass panel over network imagery with a low-poly red stag (xl only). Closes well, but the stag art style differs from the hero particle stag.                                                                                                                                                                                                                                                                                 |

Interaction captures (`shots/int-*.png`, `inventory.json` interactive list):

- Service-card links (Websites to Hands-on teaching): `pressChanges: []`, only the focus outline. Card containers are not interactive.
- Pause toggles `int-013` (hero) and `int-020` (systems): `cursor: default` (Tailwind 4 preflight resets button cursor), no press change, paused state shown only by icon shape.
- Logo: press changes opacity only. Header nav Services, About, Contact and the header CTA: `pressChanges: []`.
- Footer links (Services to Terms, eight links): `pressChanges: []`.
- Mobile menu button and the five mobile menu items: not captured ("not visible at rest" at 1440). No capture exists at 390 with the menu open.
- Skip link `int-000`: sr-only until focused, so no hover or press shots exist.
- The "N" badge bottom-left is the Next.js dev indicator and does not ship.

## Existing effects

Global (`layout.tsx`, `template.tsx`, `globals.css`):

- `LenisProvider` smooth scroll, destroyed under reduced motion (`LenisProvider.tsx:57-102`).
- `RouteTransition` WAAPI fade and translate on client navigation; skipped on first load and under reduced motion (`RouteTransition.tsx:11-25`).
- `body::after` grain tile animating `background-position` in 16 steps on a fixed full-viewport layer (`globals.css:96-131`); `animation: none` under reduce (`:147-149`).
- Global `:focus-visible` outline 2 px `--color-accent` inside `@layer base` (`globals.css:117-120`), so utilities override it.
- Header scroll-timeline blur, brand edge and progress bar (`globals.css:153-210`). The header `::after` already runs `header-progress`; never add a second animation to it.
- `@keyframes band-signal` (scaleX from 0, `globals.css:213-217`), `[data-service-rail]` view() rail (`:241`), footer sweep on a view() timeline (`:250-266`).
- `layout.tsx:35-37` noscript rule: `[data-reveal]{opacity:1!important;transform:none!important}`.
- Header: desktop nav links use `UNDERLINE` hover; `BookingCta` sits in `hidden md:block` (`Header.tsx:75`); menu button `md:hidden` (`:77-87`); mobile items use `MOBILE_ITEM` with a `--i` stagger (`:123-150`). Footer links use `UNDERLINE` (`Footer.tsx:23-31`).

Per section:

- Hero: `Parallax` wrapper (speed 0.3), `VideoMotionHero` poster then loop with `VideoPauseToggle`, `StagScene` point cloud via `motionScene` (fallback `HeroMotionCanvas` at opacity-30), badge `animate-pulse` dot (`Hero.tsx:40`), `motion-safe:animate-lede` (`:48`), `BookingCta` inside `Magnetic`.
- DeliveredStrip: `SectionHeading` mask reveal, `Stagger` rise of proof lines.
- ServicesPreview: mask heading, `Stagger` rise of cards, `Spotlight` pointer glow (fine pointer only), featured `border-brand` on `ai-engineering`.
- SystemsScene: `Pinned` 150vh at every width; poster to video crossfade at >= 768 px when on screen; `NodeLatticeScene` driven by `useScrollProgress` (uProgress, opacity sin(pi*p), dolly, yaw, velocity stretch); `VideoPauseToggle`; raw `h2`, no reveal.
- PipelineSection: mask heading; `Pipeline3D` particles (hidden below sm, aria-hidden, fallback null, shaders inline in `Pipeline3D.tsx`); `PipelineDiagram` SVG edges drawn by `useScrollDrawn` (IO 0.4); horizontal SVG at sm+, vertical below; labels are an HTML `ol`.
- ProcessScroller: `Pinned` 200vh from md; track translateX by `--shift-md` / `--shift-lg` computed every render from `useScrollProgress` (`ProcessScroller.tsx:67-71`); reduced branch is a separate static `ol` chosen in JS (`:50-65`); card copy is `text-muted` (`:24`, `:28`).
- CtaBlock: `cta-terminus.webp` background with `mask-y-from-70%`; xl-only `mccor-stag-stride.webp` (`data-testid=cta-stag`); gradient panel; mask heading; `Reveal` body and CTA; `BookingCta` in `Magnetic`.

Facts the executor must know first:

- `useScrollProgress` calls `setProgress` on every Lenis or window scroll tick with no visibility gate (`useScrollProgress.ts:19-45`). Three consumers re-render every scroll frame.
- `Stagger` wraps each child in `Reveal` (`Stagger.tsx:16-20`). In motion mode the grid item is the `Reveal` wrapper div; under reduced motion `Reveal` returns a fragment and the Card is the grid item. `Reveal` has no `className` prop.
- `VideoMotionHero` calls `useVideoAttach` without `onScreenRef` (`VideoMotionHero.tsx:137`), so the hero loop never pauses off screen.
- `StagScene` has a module-level `let assembled = false` (`StagScene.tsx:43`, read at `:94`, `:182-187`) and hard-codes alignment to the hero poster stag (`StagScene.tsx:27-34`).
- `SceneRuntime` `started` flag and `canvasKey` (`SceneRuntime.tsx:152-181`) give no restart path after teardown.
- `ProcessScroller.test.tsx` asserts zero `[aria-hidden]` nodes inside the component.
- `scene-lazy.spec.ts:34` expects 3 `[data-scene-status]` nodes and `:35` one active at load; `motion.spec.ts:80-90` expects exactly three fallbacks under reduce.
- The 150vh systems pin is sticky only for scroll progress of about 0.4 to 0.6 (progress is `(vh - top) / (vh + height)`).
- Hero scroll progress at scrollY 0 is about 0.54, not 0.
- Baseline greps are clean today: no colour literals outside `@theme`, no two-token `color-mix`, no comments in `app/web/src`, `app/web/tests` or the `.glsl` shaders. M3 greps the whole tree, so any match is new.

## Changes

Paths are relative to `app/web/` unless they start with `docs/`. Each change lists target, files, tokens, reduced motion, paused mode where it differs, validation and reuse tag. Source proposal ids are in brackets; reviewer amendments are already applied.

### M0: shared primitives

#### M0.0 Landing e2e harness and the `motion-on` variant

- Target: new `tests/e2e/landing.spec.ts`; `globals.css`.
- What: create `landing.spec.ts` with two helpers and the first test. `tokenColor(page, name)` appends a probe div with `style.color = 'var(<name>)'` and returns its computed colour, so tests never type colour literals. `atViewport(page, width, height)` sets the viewport before `goto`. First test, "no horizontal overflow at 390": viewport 390x844, `goto('/')`, scroll to the bottom in steps, assert `document.documentElement.scrollWidth === document.documentElement.clientWidth`. In `globals.css` add `@custom-variant motion-on { @media (prefers-reduced-motion: no-preference) { :root:not([data-motion="paused"]) & { @slot; } } }`. Until M0.3 lands no element carries `data-motion`, so the variant equals `motion-safe`.
- Files: `tests/e2e/landing.spec.ts`, `src/styles/globals.css`.
- Tokens: none.
- Reduced motion: not applicable.
- Validation: `pnpm build:raw && pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/landing.spec.ts -g "no horizontal overflow at 390"`.
- Reuse: shared-primitive.

Ruling: one `motion-on` variant gates every new animation on both the OS setting and the pause toggle (cost if wrong: if Tailwind 4 rejects the nested block form, fall back to a plain `@media` plus `:root:not(...)` wrapper per rule).

#### M0.1 Scroll progress without per-frame React renders [perf-a11y-01]

- Target: `useScrollProgress` and its three consumers.
- What: attach the scroll listener only while an IntersectionObserver (rootMargin `50% 0px`) reports the element near the viewport; clamp to 0 or 1 on exit. Keep the "no IO means always attached" jsdom fallback. Add `useScrollProgressValue(ref): MotionValue<number>` that never calls setState. Migrate `Parallax` (it already writes a MotionValue, `Parallax.tsx:18-24`), `SystemsScene` and `NodeLatticeScene` (read the MotionValue into the existing progress ref), and `ProcessScroller` (write `--shift-*` with `element.style.setProperty` from a MotionValue `change` subscriber, and on mount so first paint matches).
- Files: `src/components/motion/useScrollProgress.ts`, `useScrollProgress.test.ts`, `Parallax.tsx`, `src/components/sections/SystemsScene.tsx`, `src/components/effects/NodeLatticeScene.tsx`, `src/components/effects/useProgressRef.ts`, `src/components/sections/ProcessScroller.tsx`.
- Tokens: none.
- Reduced motion: unchanged. Returns 0 or a MotionValue fixed at 0; no observer or listener.
- Validation: `pnpm -F web test:run src/components/motion/useScrollProgress.test.ts src/components/motion/Parallax.test.tsx src/components/sections/ProcessScroller.test.tsx src/components/sections/SystemsScene.test.tsx`. Add a case: mocked IO reporting not-intersecting means a scroll event causes no render (render-count spy). Then the budgets INP test (`-g INP`).
- Reuse: shared-primitive.

Ruling: keep the setState-based `useScrollProgress(ref): number` exported for back-compat after migrating all landing consumers (cost if wrong: a second code path to maintain; removing it now would touch HeaderVideo and PageHeader on other routes outside this plan).

#### M0.2 Pause the hero video off screen [perf-a11y-02]

- Target: `VideoMotionHero` `useVideoAttach` call.
- What: pass the root div ref as `onScreenRef` so the existing IO play/pause path runs. Check that the canplay crossfade still fires when IO triggers the first play.
- Files: `src/components/motion/VideoMotionHero.tsx`, `VideoMotionHero.test.tsx`, `tests/e2e/systems-video.spec.ts` (new case).
- Tokens: none.
- Reduced motion: unchanged; video never attaches.
- Validation: `pnpm -F web test:run src/components/motion/VideoMotionHero.test.tsx` (add: IO with `isIntersecting=false` calls `video.pause`); e2e case "hero video pauses off screen": scroll to the CTA, `expect(page.locator('section video').first()).toHaveJSProperty('paused', true)`.
- Reuse: shared-primitive (HeaderVideo on other routes benefits).

#### M0.3 Page-wide motion pause control (WCAG 2.2.2) [perf-a11y-03]

- Target: new `MotionPauseProvider`, header toggle, consumers.
- What: `useReducedMotion` stays OS-only. Add `MotionPauseProvider` and `useMotionPaused(): { paused: boolean; osReduced: boolean; toggle(): void }`. The user override persists in localStorage inside try/catch that reports failures, never silently. A pre-hydration inline script sets only `html[data-motion="paused"]`, never markup, so the SSR snapshot stays "not paused". `SceneRuntime` reads `useMotionPaused` and pauses in place on its last frame (no fallback swap, no CLS, no refetch) and exposes `data-scene-paused` on its root. `useVideoAttach` pauses videos and reads reduced motion reactively instead of its one-shot `matchMedia` (`VideoMotionHero.tsx:37-40`). Lenis stops smoothing. `Parallax` renders static when paused. `usePointerEffects()` returns false when paused. In `globals.css`, add `:root:not([data-motion="paused"])` to the existing grain, header scroll-timeline, `[data-service-rail]`, `band-signal` and footer-sweep rules, so they render their end state when paused. The toggle `MotionPauseToggle` is a quiet icon-only ghost button matching `VideoPauseToggle` (same size, border `--color-border`, pressed border `--color-accent`, class `press` from M0.7), `aria-pressed`, label from `content/ui.ts`. Place it in the header bar outside the `hidden md:block` wrapper, immediately before the menu button, so it is visible at every width: next to `BookingCta` at md+, next to the menu button below md.
- Files: `src/components/motion/MotionPauseProvider.tsx`, `MotionPauseProvider.test.tsx`, `MotionPauseToggle.tsx`, `MotionPauseToggle.test.tsx`, `src/components/motion/useReducedMotion.ts` (`usePointerEffects` only), `src/components/motion/Parallax.tsx`, `src/components/effects/SceneRuntime.tsx`, `src/components/motion/VideoMotionHero.tsx`, `src/components/motion/LenisProvider.tsx`, `src/components/layout/Header.tsx`, `src/app/layout.tsx`, `src/content/ui.ts`, `src/styles/globals.css`, `tests/e2e/landing.spec.ts`.
- Tokens: `--color-muted`, `--color-accent`, `--color-border`, `--duration-pointer`, `--ease-pointer`.
- Reduced motion: with the OS setting on, the toggle shows pressed and `aria-disabled` with a hint; behaviour equals today's reduced path. The override never re-enables motion against the OS.
- Validation: `pnpm -F web test:run src/components/motion/MotionPauseProvider.test.tsx src/components/motion/MotionPauseToggle.test.tsx src/components/effects/SceneRuntime.test.tsx src/components/motion/Parallax.test.tsx src/components/layout src/components/contact/ContactForm.test.tsx`. Landing e2e: "motion pause stops scenes and video" (click toggle; every `video` has `paused === true`; every active scene root has `data-scene-paused`); "motion pause stops looping and scroll-linked animations" (after the toggle, `document.getAnimations().filter(a => a.effect?.getTiming().iterations === Infinity || a.timeline !== document.timeline).length === 0`); "motion pause toggle is visible at 390" (viewport 390x844, toggle `toBeVisible()` and `toBeInViewport()`). Then `keyboard.spec.ts` (one extra tab stop, under the 60-tab limit at `:53`) and `a11y.spec.ts`.
- Effort: L.
- Reuse: shared-primitive.

Ruling: keep `useReducedMotion` OS-only and add a separate `useMotionPaused` (cost if wrong: two hooks to read; folding them would swap scenes to fallbacks and break `motion.spec` counts).

Ruling: the toggle adds one tab stop to the header on every route, before the menu button (cost if wrong: keyboard users pass one more stop per page; `keyboard.spec.ts:53` allows 60 tabs to the footer, well above today's count).

Ruling: place the toggle outside `hidden md:block` so a page-wide pause exists at 390 (cost if wrong: one more icon in the cramped mobile bar; hiding it below md would fail WCAG 2.2.2 on phones).

#### M0.4 SceneRuntime adaptive resolution and pre-warm [perf-a11y-04 (a), (b)]

- Target: `SceneRuntime` loop and observers.
- What: (a) rolling mean of frame delta; above 20 ms for 30 frames, step `setPixelRatio` 1.5 to 1 to 0.75, never back up; expose `data-scene-tier`. (b) a second observer with rootMargin `25% 0px` for `startOnce()` only, so three, shaders and points load before entry; the strict observer still drives pause and resume.
- Files: `src/components/effects/SceneRuntime.tsx`, `SceneRuntime.test.tsx`.
- Tokens: none.
- Reduced motion: not applicable; SceneRuntime falls back before this runs (`SceneRuntime.tsx:120-123`).
- Validation: `pnpm -F web test:run src/components/effects/SceneRuntime.test.tsx` (add: fake rAF at 33 ms steps calls `setPixelRatio(1)`); `scene-lazy.spec.ts` (at-load statuses unchanged) and budgets.
- Reuse: shared-primitive.

Ruling: drop part (c), releasing WebGL contexts after 30 s off screen, because no restart path exists (`started` flag, `canvasKey` only bumps on cleanup) (cost if wrong: four live contexts after M2.5, still far below the browser eviction limit of about 16).

#### M0.5 Compositor-only grain [perf-a11y-12]

- Target: `body::after` grain, `globals.css:96-131`.
- What: oversized pseudo-element (`inset: -256px`) animating `transform: translate3d()` with the same `steps(16)`, plus `contain: strict`. Gate on `:root:not([data-motion="paused"])`.
- Files: `src/styles/globals.css`.
- Tokens: none.
- Reduced motion: unchanged, `animation: none`. Paused: static texture.
- Validation: `motion.spec.ts`, budgets; landing e2e "no horizontal overflow at 390"; manual Chrome DevTools Rendering > Paint flashing shows no full-screen flash every 0.5 s.
- Reuse: shared-primitive.

#### M0.6 Focus ring: two-tone backing and settle [perf-a11y-14, motion-focus-ring-settle]

- Target: global `:focus-visible`.
- What: keep `outline: 2px solid var(--color-accent)` as the primary ring. Add `box-shadow: 0 0 0 4px var(--color-base)` as backing so the ring reads over bright media. Under the `motion-on` gate only, add `@keyframes focus-settle`: `outline-offset` 6px to 2px and `outline-color` `--color-brand` to `--color-accent` over `--duration-pointer` with `--ease-pointer`. Do not restyle `SkipLink` (already a `focus:not-sr-only` accent pill) and do not add `tabIndex=-1` to `main`.
- Files: `src/styles/globals.css`.
- Tokens: `--color-accent`, `--color-brand`, `--color-base`, `--duration-pointer`, `--ease-pointer`.
- Reduced motion and paused: static two-tone ring, no keyframe.
- Validation: `a11y.spec.ts -g "focus indicator"` and the skip-link test; `motion.spec.ts` (getAnimations 0 under reduce).
- Reuse: shared-primitive.

Ruling: ship the settle although the taste reviewer called it ornament (cost if wrong: one CSS block to delete; the backing ring is the real fix and stays).

Ruling: the box-shadow backing is clipped by `overflow-hidden` parents (Hero, SystemsScene inner); the outline stays primary (cost if wrong: backing missing on those few elements, ring still visible).

#### M0.7 Press feedback and pointer cursor [perf-a11y-09]

- Target: `@layer base`, every interactive control on the landing page and in the header and footer.
- What: base rule `button:not(:disabled), [role="button"] { cursor: pointer }`. `@utility press` with `transition: transform var(--duration-pointer) var(--ease-pointer)` and, under the `motion-on` gate, `&:active { transform: scale(0.96) }`. Apply `press` to: `VideoPauseToggle`, `MotionPauseToggle` (M0.3), the `Button` cva base, the logo link, header nav links (keep `UNDERLINE`), the mobile menu button (`Header.tsx:77-87`), the mobile menu links (`Header.tsx:129-139`, already `flex` so transform applies), and footer links (`Footer.tsx:23-31`, grid items so transform applies). `VideoPauseToggle` and `MotionPauseToggle` border switches to `--color-accent` when `aria-pressed="true"`, so state is not shown by icon shape alone. The systems link (M2.2) and service cards (M1.3) get their own states in those tasks.
- Files: `src/styles/globals.css`, `src/components/motion/VideoPauseToggle.tsx`, `VideoPauseToggle.test.tsx`, `src/components/motion/MotionPauseToggle.tsx`, `src/components/ui/button.tsx`, `button.test.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`, `tests/e2e/landing.spec.ts`.
- Tokens: `--duration-pointer`, `--ease-pointer`, `--color-accent`, `--color-border`.
- Reduced motion and paused: no scale; cursor and pressed border still apply.
- Validation: `pnpm -F web test:run src/components/motion/VideoPauseToggle.test.tsx src/components/ui/button.test.tsx src/components/layout src/components/contact/ContactForm.test.tsx` (add: pause toggle and Button carry `press`). Landing e2e: "pause toggle has pointer cursor" (`getComputedStyle(pause button).cursor === 'pointer'`); "press scales on active and pause toggle pressed border uses accent" (emulate `reducedMotion: 'no-preference'`, hover the hero pause toggle, `mouse.down()`, `expect.poll` on computed `transform` not `'none'`, `mouse.up()`; click it, then `borderTopColor` equals `tokenColor(page, '--color-accent')`); "mobile menu opens at 390 with pointer cursor and press feedback" (viewport 390x844, menu button cursor `pointer`, click it, `#mobile-nav` visible with five links plus the CTA, a menu link carries `press` and its transform is not `'none'` while the mouse is down); "footer links carry press feedback" (every `nav[aria-label="Footer"] a` has class `press`; one shows a non-`none` transform while pressed).
- Reuse: shared-primitive.

Ruling: add `press` to the `Button` cva base, which changes every Button site-wide, including the ContactForm submit and lab pages (cost if wrong: an unwanted scale on some lab button; it is class-only, so ContactForm markup and roles stay the same and `ContactForm.test.tsx` is re-run to prove it).

#### M0.8 Signal sweep primitive [perf-a11y-11 primitive, visual-section-seam]

- Target: new `[data-signal-sweep]` attribute rule and `SectionSeam` component.
- What: `[data-signal-sweep]` is a 1px line with `linear-gradient(to right, transparent, var(--color-brand), var(--color-glow-red), transparent)`. Under `@supports (animation-timeline: view())` and the `motion-on` gate, it runs `scaleX(0)` to `scaleX(1)` from centre on `animation-timeline: view()` with `animation-range: entry 0% cover 40%`. Otherwise it renders fully drawn. `SectionSeam` (`src/components/ui/section-seam.tsx`) renders `<Container><div aria-hidden data-section-seam data-signal-sweep /></Container>`, opacity 40% (decorative line, no text), optional `variant="node"` with a small `--color-brand` dot.
- Files: `src/styles/globals.css`, `src/components/ui/section-seam.tsx`, `section-seam.test.tsx`.
- Tokens: `--color-brand`, `--color-glow-red`.
- Reduced motion and paused: static full-width line.
- Validation: `pnpm -F web test:run src/components/ui/section-seam.test.tsx` (aria-hidden, `data-section-seam`); `motion.spec.ts`, `a11y.spec.ts`.
- Reuse: shared-primitive.

Ruling: leave the existing footer-sweep rule untouched apart from the paused gate, rather than migrating it to `[data-signal-sweep]` (cost if wrong: two near-identical rules; migrating touches the footer on every route and its legal/careers exclusion).

#### M0.9 Spotlight size and rAF coalescing [motion-cta-panel-light, perf-a11y-08]

- Target: `Spotlight`.
- What: add `size?: 'card' | 'panel'` (18rem default, 32rem panel). Cache the rect on `pointerenter`; coalesce `pointermove` writes of `--spot-x` / `--spot-y` into one rAF (today it calls `getBoundingClientRect` on every move, `Spotlight.tsx:17-21`).
- Files: `src/components/motion/Spotlight.tsx`, `Spotlight.test.tsx`.
- Tokens: `--color-brand`.
- Reduced motion and paused: renders null unless `usePointerEffects`.
- Validation: `pnpm -F web test:run src/components/motion/Spotlight.test.tsx` (add: at most one write per animation frame; panel size).
- Reuse: shared-primitive (CapabilityBlock on `/services/`).

#### M0.10 Reveal className, Stagger itemClassName, words variant [visual-services-bento enabler, showcase-heading-word-rise]

- Target: `Reveal`, `Stagger`.
- What: `Reveal` gains `className?: string`. When `className` is set, the reduced path renders `<div className>` instead of a fragment, so SSR and hydrated trees match. `Stagger` gains `itemClassName?: (index: number) => string | undefined` passed to each `Reveal`. Add `variant="words"`: the stagger is CSS-driven, each word span carries `data-word` and `--i`, and under the `motion-on` gate words rise from `translateY(100%)` inside `overflow-clip` line boxes when the ancestor has `data-reveal="shown"`, with delay `calc(var(--i) * var(--stagger-interval))`, `--duration-standard`, `--ease-route`. No motion component per word. Extend the noscript rule in `layout.tsx` to `[data-reveal] [data-word]`.
- Files: `src/components/motion/Reveal.tsx`, `Reveal.test.tsx`, `Reveal.ssr.test.tsx` (must keep passing unchanged), `Stagger.tsx`, `Stagger.test.tsx`, `src/app/layout.tsx`, `src/styles/globals.css`.
- Tokens: `--duration-standard`, `--stagger-interval`, `--ease-route`, `--delay-considered`.
- Reduced motion and paused: static text; word spans have no transform.
- Validation: `pnpm -F web test:run src/components/motion/Reveal.test.tsx src/components/motion/Reveal.ssr.test.tsx src/components/motion/Stagger.test.tsx src/components/contact/ContactForm.test.tsx`; budgets.
- Reuse: shared-primitive (TeamGrid on `/about/`).

Ruling: ship the words variant despite the taste reject (cost if wrong: headings get a trope; revert by dropping the SectionHeading opt-in only).

#### M0.11 SectionHeading size and eyebrow; Section size [visual-type-scale, visual-section-eyebrow-index]

- Target: `SectionHeading`, `Section`.
- What: `SectionHeading` gains `size?: 'sm' | 'md'` (default `sm` keeps other routes unchanged; `md` uses `text-display-md` with its letter-spacing token) and `eyebrow?: { index: string; label: string }`. The eyebrow renders inside the `Reveal` wrapper but outside the `h2`, as a `font-mono text-xs uppercase tracking-widest` line: a 16px `--color-brand` tick, the index in `--color-text`, a slash, the label in `--color-muted`. The tick draws with `band-signal` only under the `motion-on` gate. When the child is a plain string, the h2 splits words for M0.10 `words` (spaces preserved so the accessible name is unchanged). `Section` gains `size?: 'compact' | 'default' | 'spacious'` mapping to `py-12 sm:py-16`, `py-16 sm:py-24` (default, unchanged), `py-24 sm:py-32`. Body copy under headings gets `max-w-[60ch] text-pretty`.
- Files: `src/components/ui/section-heading.tsx`, `section-heading.test.tsx`, `src/components/layout/Section.tsx`.
- Tokens: `--text-display-sm`, `--text-display-md`, `--text-display-md--letter-spacing`, `--font-mono`, `--color-brand`, `--color-text`, `--color-muted`, `--duration-standard`, `--ease-standard`.
- Reduced motion and paused: tick full width, no draw; words static.
- Validation: `pnpm -F web test:run src/components/ui/section-heading.test.tsx` (add: eyebrow outside h2; h2 accessible name unchanged; `parentElement` still has `data-reveal`); `pnpm -F web test:run src/components/sections/CtaBlock.test.tsx`; `a11y.spec.ts`.
- Reuse: shared-primitive.

Ruling: ship numbered eyebrows despite the taste reject, and drop the "01 Proof" eyebrow on the Delivered strip (cost if wrong: one prop to remove per section; the strip already has its own label).

#### M0.12 GlowField [visual-glow-field]

- Target: new `src/components/ui/glow-field.tsx`.
- What: an empty absolute div (`-z-10 pointer-events-none`, no `aria-hidden`, it has no content) with two radial gradients: `color-mix(in oklab, var(--color-brand) 8%, transparent)` and `color-mix(in oklab, var(--color-accent) 6%, transparent)`, positioned by `anchor?: 'left' | 'right' | 'center'`, edges faded with a radial mask. No drift. Parent sections need `relative isolate`.
- Files: `src/components/ui/glow-field.tsx`, `glow-field.test.tsx`.
- Tokens: `--color-brand`, `--color-accent`, `--color-base`.
- Reduced motion and paused: static already.
- Validation: `pnpm -F web test:run src/components/ui/glow-field.test.tsx` (renders no text, no aria-hidden); `a11y.spec.ts` (contrast).
- Reuse: shared-primitive.

Ruling: drop the background-position drift (cost if wrong: a static glow; drift would repaint a large layer every frame, the cost M0.5 removes).

#### M0.13 Per-scene frame cost instrumentation [showcase-scene-frame-budget]

- Target: `SceneRuntime` loop; new `tests/e2e/scene-frame.spec.ts`.
- What: when `window.__sceneStats` exists (set by the spec via `addInitScript`), record each scene's `render()` duration in a ring buffer keyed by the scene root. The spec wheels through `/` and logs a SOFT line per scene (p95 render, p95 rAF gap). Log only, no `expect`, until baselines exist. Zero cost when the flag is absent.
- Files: `src/components/effects/SceneRuntime.tsx`, `SceneRuntime.test.tsx`, `tests/e2e/scene-frame.spec.ts`.
- Tokens: none.
- Reduced motion: the spec asserts zero active scenes under reduce.
- Validation: `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/scene-frame.spec.ts`; unit case "records nothing without the flag".
- Reuse: shared-primitive.

### M1: page-specific polish

#### M1.1 Hero type scale, mobile scrim, gated badge and lede [visual-type-scale, perf-a11y-10]

- Target: `Hero.tsx:33-49`.
- What: H1 `text-display-md` below lg and `text-display-lg` (with its letter-spacing token) at lg+, `text-balance`, the two slogan sentences on two lines at lg. Below lg, add an `aria-hidden` scrim div behind the copy block, confined to its bounding box: gradient from `color-mix(in oklab, var(--color-base) 85%, transparent)` at the bottom to `transparent`. Do not move, translate or fade the StagScene canvas; it is aligned to the poster stag. Switch the badge dot `animate-pulse` (`:40`) and the lede `motion-safe:animate-lede` (`:48`) to `motion-on:` so both stop when paused. H1 text and poster unchanged, so LCP is untouched.
- Files: `src/components/sections/Hero.tsx`, `Hero.test.tsx`.
- Tokens: `--text-display-md`, `--text-display-md--letter-spacing`, `--text-display-lg`, `--text-display-lg--letter-spacing`, `--color-base`, `--color-muted`, `--color-text`, `--animate-lede`.
- Reduced motion and paused: same scrim; badge and lede static.
- Validation: `pnpm -F web test:run src/components/sections/Hero.test.tsx` (add: scrim exists, aria-hidden); `routes.spec.ts` (h1 text), budgets LCP and CLS; manual 390 px screenshot review against `shots/mobile-normal-section-00.png`.
- Reuse: page-specific.

Ruling: replace the proposed pixel-luminance contrast e2e with a scrim-exists assertion plus screenshot review (cost if wrong: no automated contrast number; a luminance probe over a moving canvas would be flaky).

#### M1.2 Delivered strip [perf-a11y-11 restyle]

- Target: `DeliveredStrip.tsx`.
- What: one `[data-signal-sweep]` line on the strip's top border. Proof lines become two columns separated by a vertical `--color-border` rule at sm+, each with a small mono index (`01`, `02`) in `--color-accent`; claims lift to `text-xl text-text`. Keep `Stagger` and keep the mono face (existing tests assert both).
- Files: `src/components/sections/DeliveredStrip.tsx`, `DeliveredStrip.test.tsx` (add cases only).
- Tokens: `--color-brand`, `--color-glow-red`, `--color-border`, `--color-accent`, `--color-text`, `--color-muted`, `--font-mono`.
- Reduced motion and paused: line static; Stagger already static under reduce.
- Validation: `pnpm -F web test:run src/components/sections/DeliveredStrip.test.tsx`; `motion.spec.ts`, `a11y.spec.ts`; landing e2e "no horizontal overflow at 390".
- Reuse: page-specific.

Ruling: keep `Stagger` and `font-mono` instead of removing Stagger and switching claims to sans (cost if wrong: a little motion JS stays on the strip; changing either breaks `DeliveredStrip.test` assertions about behaviour that is not buggy).

#### M1.3 Services bento with whole-card interaction [visual-services-bento, perf-a11y-08]

- Target: `ServicesPreview.tsx:12-43`.
- What: lg grid 3 columns by 2 rows. The featured `ai-engineering` card (third in `content/services.ts`) takes `lg:row-span-2` and auto-places in column 3, so five cards fill six cells. Spans go through `Stagger itemClassName` (M0.10). sm stays 2 columns with featured `sm:col-span-2`. Featured card: lazy `mccor-ai-neural.webp` backdrop (`loading="lazy" decoding="async" alt=""`), masked to the top half, opacity 50; a mono "Featured" text label above the title. Remove the permanent `border-brand`. Every card: the h3 `Link` becomes a stretched link (`after:absolute after:inset-0 after:rounded-[inherit]`). Remove the link's own `focus-visible:outline` classes (`ServicesPreview.tsx:37`) and add `focus-visible:outline-none focus-visible:shadow-none` to the link, so neither the global outline nor the M0.6 backing shadow draws around the inline link text. The card carries `has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2` and the same `--color-base` backing shadow. Hover: `motion-on:hover:-translate-y-0.5` plus `hover:border-border-strong`; featured hover border is a `::before` mask-composite hairline in `--color-brand`. Press: `motion-on:active:translate-y-0 motion-on:active:scale-[0.99]`. `Spotlight` stays inside. Keep `data-service` and `data-featured`. No sixth card.
- Files: `src/components/sections/ServicesPreview.tsx`, `ServicesPreview.test.tsx`, `tests/e2e/landing.spec.ts`.
- Tokens: `--color-surface`, `--color-border`, `--color-border-strong`, `--color-brand`, `--color-accent`, `--color-base`, `--color-muted`, `--color-text`, `--duration-pointer`, `--ease-pointer`, `--radius-xl`.
- Reduced motion and paused: no translate or scale; border and ring change instantly; image static.
- Validation: `pnpm -F web test:run src/components/sections/ServicesPreview.test.tsx` (add: featured has `data-featured` and the row-span class on its grid item; still exactly 5 h3; link has no outline classes). Landing e2e "service card shows hover lift, press and card-edge focus ring" at 1440: hover the first card, `expect.poll` computed `transform` not `'none'` and `borderTopColor` equals `tokenColor(page, '--color-border-strong')`; `mouse.down()` and `expect.poll` transform changes again; Tab until the first card link is focused, then the card's `outlineStyle` is not `'none'` and the link's `outlineStyle` is `'none'` and `boxShadow` is `'none'`. Then `a11y.spec.ts`, `keyboard.spec.ts`, budgets. The executor opens `public/media/brand/mccor-ai-neural.webp` and confirms it has no baked-in text before use.
- Reuse: page-specific.

Ruling: accept the featured card in column 3 rather than forcing column 1 with `grid-flow-dense` (cost if wrong: emphasis sits right, not left; one class to change).

Ruling: move the visible focus indicator from the h3 link to the card edge with `has-[:focus-visible]` (cost if wrong: in a browser without `:has()` the card shows no ring while the link ring is suppressed; every supported browser ships `:has()`, and the e2e asserts the card ring).

#### M1.4 Eyebrows, heading size, seams and glow placement [visual-section-eyebrow-index, visual-type-scale, visual-section-seam, visual-glow-field]

- Target: `page.tsx` and five sections.
- What: eyebrows from `content/ui.ts`: 01 Services, 02 Evaluation, 03 Retrieval, 04 Engagement, 05 Contact on ServicesPreview, SystemsScene (raw h2, add the eyebrow markup by hand above it), PipelineSection, ProcessScroller, CtaBlock. Landing headings use `size="md"`. Sections use `Section size` steps (Delivered compact; Services and Pipeline default; CTA spacious). `SectionSeam` between ServicesPreview and SystemsScene and between PipelineSection and ProcessScroller, in `page.tsx` only (keeps aria-hidden nodes out of ProcessScroller's test container); none above DeliveredStrip, which already has `border-y`. `GlowField` in ServicesPreview (anchor right), PipelineSection (center) and ProcessScroller (left); those sections get `relative isolate`.
- Files: `src/app/page.tsx`, `src/content/ui.ts`, `src/components/sections/ServicesPreview.tsx`, `SystemsScene.tsx`, `PipelineSection.tsx`, `ProcessScroller.tsx`, `CtaBlock.tsx`.
- Tokens: as M0.8, M0.11, M0.12.
- Reduced motion and paused: from the primitives.
- Validation: `pnpm -F web test:run src/components/sections src/components/ui`; `a11y.spec.ts`, `pages.spec.ts`, budgets (SSR height parity on `/` and `/process/`).
- Reuse: page-specific.

Ruling: eyebrow labels are new copy and need owner sign-off before merge (cost if wrong: one string file edit).

#### M1.5 Cursor-lit CTA panel [motion-cta-panel-light]

- Target: `CtaBlock.tsx:19-37`.
- What: the panel becomes `group relative isolate` with `<Spotlight size="panel" />`. A `[data-signal-sweep]`-style light moves along the panel top edge on a view() timeline under the `motion-on` gate. The Container carries `group/cta` so `group-has-[a:hover]/cta` can brighten a `--color-accent` drop-shadow on the stag. The stag drift is a CSS view() timeline translate (24px rise and fade) under `motion-on`, not `Parallax`. After M2.5 these stag treatments apply only to the webp fallback.
- Files: `src/components/sections/CtaBlock.tsx`, `CtaBlock.test.tsx`, `src/styles/globals.css`.
- Tokens: `--color-accent`, `--color-brand`, `--color-border`, `--color-surface`, `--duration-standard`, `--ease-pointer`, `--radius-xl`.
- Reduced motion and paused: Spotlight null; sweep and drift absent; stag in final position. The hover drop-shadow is a state change, not motion, and stays.
- Validation: `pnpm -F web test:run src/components/motion/Spotlight.test.tsx src/components/sections/CtaBlock.test.tsx` (cta-stag attributes unchanged); `motion.spec.ts`, budgets.
- Reuse: page-specific.

### M2: signature moments

#### M2.1 Process track with focus card, rail and counter [motion-process-track-focus] (signature)

- Target: `ProcessScroller` pinned track (md+), the stacked list (below md and reduced), and `StageCard`.
- What, md+ with motion: centre heading and track as one group inside the sticky stage. Wrap the track in a clip box equal to the Container width (`overflow-x-clip`), so card 3 is fully hidden at rest instead of cut at the viewport edge. Measure `track.scrollWidth - container.clientWidth` (ResizeObserver) and write the shift as a CSS var, so card 5 ends flush right at fraction 1. Set `PIN_UNITS` to 150. Above the cards, a progress rail: a 1px `--color-border` line with a `--color-brand` fill scaled by fraction and five ticks, drawn with pseudo-elements or empty divs that carry no `aria-hidden`. A counter shows `0N / 05` through CSS `counter-reset: active var(--active-index)` and `content: "0" counter(active) " / 05" / ""`, so it adds no DOM text and assistive tech skips it. Cards by distance from the active index: the active card gets `border-border-strong bg-elevated`; neighbours keep `border-border bg-surface` and `translateY(8px)`. Every card keeps full opacity, so muted copy keeps its contrast. The duration chip pulses once when its card becomes active (`motion-on` only).
- What, stacked list (below md in motion mode, and every width under reduce): one shared vertical rail on the left of the `ol` using the `[data-service-rail]` view() pattern, filling as each card scrolls past under `motion-on`, and a static full rail otherwise. At lg under reduce, a two-column grid. Apply both with `max-md:` and `motion-reduce:` classes on the shared markup as well as the reduced branch, so `/process/` SSR height equals hydrated height under reduce.
- Files: `src/components/sections/ProcessScroller.tsx`, `ProcessScroller.test.tsx`, `src/styles/globals.css`, `tests/e2e/pages.spec.ts` (add cases only), `tests/e2e/landing.spec.ts`.
- Tokens: `--color-border`, `--color-border-strong`, `--color-brand`, `--color-surface`, `--color-elevated`, `--color-muted`, `--color-text`, `--font-mono`, `--radius-xl`, `--duration-standard`, `--ease-standard`.
- Reduced motion: static ol, static rail, lg two columns, no transforms. Paused: track still scrubs; rail static full; no chip pulse.
- Validation: `pnpm -F web test:run src/components/sections/ProcessScroller.test.tsx` (add: shift clamps so the last card right edge equals the container edge at fraction 1; active index from fraction; still zero `[aria-hidden]`; no card has an opacity class below 100). `pages.spec.ts` (`:80` pinned vs stacked hooks kept), `keyboard.spec.ts`, budgets. Landing e2e at 1440x900: "process track shows no clipped card at rest at 1440" (scroll until the sticky stage top is 0; for every card whose left edge is left of the clip box right edge, its right edge is at most the clip box right edge plus 1 px); "process stage content is centred while pinned at 1440" (the heading-plus-track group centre is within 10% of the viewport height from the viewport centre); "process cards keep full-opacity text" (every card's computed `opacity` is `'1'` at rest); "process stack shows a rail at 390" (viewport 390x844, the rail element is visible and as tall as the `ol` within 2 px).
- Reuse: page-specific (also renders on `/process/`).

Ruling: de-emphasise neighbour cards with border, background and an 8 px offset, never opacity (cost if wrong: the active card stands out less; 0.55 opacity puts muted copy near 2.9:1 on surface and fails axe in `a11y.spec.ts`).

Ruling: clip the track to the Container width so partially visible cards never show at rest (cost if wrong: the track loses its "more to the right" hint; the rail and counter carry that cue instead).

Ruling: drop the rolling digit column and render the counter as CSS generated content (cost if wrong: the number swaps instead of rolling; a DOM digit column would break the zero-aria-hidden test or be read aloud).

Ruling: shorten `PIN_UNITS` 200 to 150 and centre the stage (cost if wrong: the scrub runs faster; centring alone fixes the 300 px gap, so revert to 200 if the scrub feels rushed).

#### M2.2 Lattice gates while pinned [showcase-lattice-proof-sweep, with perf-a11y-06 link] (signature)

- Target: `SystemsScene` Pinned 150vh block and `NodeLatticeScene`.
- What: under `systemsBody`, a mono `ol` of three gates: Evaluation, Approval gate, Cost ceiling. Pure `gatesPassed(progress, thresholds)` in `nodeLattice.ts`; thresholds derived from the pinned window (`PIN_START` / `PIN_END` as in `ProcessScroller.tsx:12-19`, about 0.43, 0.5, 0.57 for 150vh). Each gate gets `data-state="pending|passed"`; the dot moves `--color-border-strong` to `--color-accent` with a short scale pop under `motion-on`. A `uGateFlash` uniform (0..1, decays) raises the intensity and alpha of the existing `uColorOrange` (`--color-accent`) contribution for a moment on each pass. It never adds a new mix weight between `uColorRed` and `uColorOrange`. Gate text stays real text at full opacity; no `aria-live`, no `aria-current`. Writes go through CSS vars or data attributes from the M0.1 MotionValue, not React state per frame. Add one always-visible, always-focusable link below the gates to the evaluation service (`/services/#evaluation`; the executor confirms the anchor id in the built HTML). Link states: `text-text` with `UNDERLINE` hover in `--color-accent`, `press`, and the global focus ring. Layout below sm: the gates render as one `flex-wrap` row of compact items (`gap-x-4 gap-y-1 text-xs`), the copy block stays vertically centred in the `h-screen` stage, and heading plus body plus gates plus link must fit between the header bottom and the viewport bottom at 390x844.
- Files: `src/components/sections/SystemsScene.tsx`, `src/components/effects/NodeLatticeScene.tsx`, `src/components/effects/nodeLattice.ts`, `src/content/ui.ts`, `SystemsScene.test.tsx`, `nodeLattice.test.ts`, `tests/e2e/landing.spec.ts`.
- Tokens: `--color-glow-red`, `--color-accent`, `--color-border-strong`, `--color-muted`, `--color-text`, `--font-mono`, `--duration-standard`, `--ease-standard`, `--duration-pointer`, `--ease-pointer`.
- Reduced motion: all gates `data-state="passed"` with static accent dots, no flash; poster stays the visual. Paused: gate states keep updating; no flash because the scene holds its frame.
- Validation: `pnpm -F web test:run src/components/effects/nodeLattice.test.ts src/components/sections/SystemsScene.test.tsx` (gatesPassed table; reduced renders all passed; link always present and carries `press`). Landing e2e: "systems copy, gates and link fit the 390 viewport while pinned" (viewport 390x844, scroll until the systems sticky stage top is 0, then the h2 top is at least the header bottom and the link bottom is at most 844); "systems evaluation link has hover, press and focus states" (1440: hover changes the underline `transform`, press gives a non-`none` transform, Tab focus gives a non-`none` `outlineStyle`). Then `systems-video.spec.ts`, `a11y.spec.ts`, `keyboard.spec.ts` (`:49` no focus trap), budgets.
- Reuse: page-specific.

Ruling: the gate flash changes intensity and alpha of the accent uniform only (cost if wrong: a softer flash than a red-to-orange sweep; interpolating two colour uniforms would invent untokenised colours, which the colour rule forbids for new code).

Ruling: gate wording and link label are new copy taken from existing `systemsBody`; owner signs off before merge (cost if wrong: a string edit).

#### M2.3 Query packet runs the pipeline [showcase-pipeline-query-packet] (signature)

- Target: `PipelineSection`, `Pipeline3D`, `PipelineDiagram`.
- What: a section ref feeds `useScrollProgressValue` into `Pipeline3D` as `progress` (ref-synced like `NodeLatticeScene`). Add `uProgress` to the inline `VERTEX_SHADER` in `Pipeline3D.tsx`: about 40 points cluster on the packet head with a soft additive halo of `uColor` (`--color-accent`) by intensity; particles behind the head keep the ambient drift. `PipelineDiagram` gains optional `activeIndex`; when present it overrides `useScrollDrawn`, and without it the default path is unchanged for CapabilityBlock on `/services/`. Each stage `li` gets `data-stage-state="pending|passed"`. Passed nodes switch stroke to `--color-brand`, with fill as a `color-mix(in oklab, var(--color-brand) 20%, transparent)` layer over the existing `--color-surface` fill. One mono descriptor per stage in the HTML `ol` (content in `content/substance.ts`), reserved height in every mode; inactive descriptors are `opacity: 0`, never partially dimmed. Scrub over the section's natural transit; no fixed height and no new pin. Keep the SVG `role="img"`, title and desc, and the aria-hidden canvas. No text in SVG.
- Files: `src/components/sections/PipelineSection.tsx`, `src/components/effects/Pipeline3D.tsx`, `src/components/effects/pipelinePath.ts`, `src/components/substance/PipelineDiagram.tsx`, `src/content/substance.ts`, `Pipeline3D.test.tsx`, `PipelineDiagram.test.tsx`, new `src/components/sections/PipelineSection.test.tsx`, `tests/e2e/landing.spec.ts`.
- Tokens: `--color-accent`, `--color-brand`, `--color-surface`, `--color-border-strong`, `--color-muted`, `--font-mono`, `--duration-pointer`, `--ease-standard`.
- Reduced motion: Pipeline3D falls back to null; PipelineDiagram ignores `activeIndex`, shows every node passed and every descriptor. Below sm the vertical list shows descriptors always. Paused: stage states keep updating; particles hold their frame.
- Validation: `pnpm -F web test:run src/components/effects/Pipeline3D.test.tsx src/components/substance/PipelineDiagram.test.tsx src/components/sections/PipelineSection.test.tsx` (the existing PipelineDiagram default-path cases cover CapabilityBlock, which has no test file). Landing e2e "pipeline stages light as the packet passes" (1440x900: with the section below the fold, zero `[data-stage-state="passed"]`; after scrolling the section through the viewport in steps, `expect.poll` reaches 7; under `reducedMotion: 'reduce'`, 7 at load). Then `a11y.spec.ts` (`:56-58`, `:75-79`), `motion.spec.ts`, budgets.
- Reuse: page-specific.

Ruling: drop the 120vh section height and scrub over natural transit (cost if wrong: a shorter scrub window; a fixed motion-only height risks SSR-vs-hydrated parity).

Ruling: passed-node fill is a brand-with-transparent layer over surface, not a two-token `color-mix` (cost if wrong: a slightly different tint; mixing two tokens invents an untokenised colour).

Ruling: stage descriptor copy needs owner sign-off before merge (cost if wrong: placeholder copy ships).

#### M2.4 Hero stag dissolves into embers on exit [showcase-stag-scroll-dissolve] (signature)

- Target: `StagScene` and `stag-points.vert.glsl` / `.frag.glsl`.
- What: a pure `stagExitAmount(scrollY, heroHeight)` returns `smoothstep(0.35, 0.9, clamp(scrollY / heroHeight))`, so scrollY 0 gives 0 (raw `useScrollProgress` is about 0.54 at the top and is not used). Hero passes it to `StagScene` as an `exit` MotionValue; StagScene writes `uExit` from it. Tune against Parallax speed 0.3. The vertex shader mixes the assembled position toward `aScatterPos` offset down along -y by `aSeed`; the fragment shader fades alpha by `uExit`. Scrolling back up reassembles. Independent of the assembled flag. The scene root exposes `data-stag-exit` with the value rounded to one decimal, written only when the rounded value changes. GLSL has no comments.
- Files: `src/components/effects/StagScene.tsx`, `src/components/effects/stagExit.ts`, `stagExit.test.ts`, `public/media/brand/shaders/stag-points.vert.glsl`, `stag-points.frag.glsl`, `src/components/sections/Hero.tsx`, `StagScene.test.tsx`, `tests/e2e/stag-scene.spec.ts`.
- Tokens: `--color-brand`, `--color-accent`, `--color-base`.
- Reduced motion: StagScene never mounts; `HeroMotionCanvas` static frame unchanged. Paused: the scene holds its frame.
- Validation: `pnpm -F web test:run src/components/effects/stagExit.test.ts src/components/effects/StagScene.test.tsx src/components/effects/stagAttributes.test.ts` (add: `stagExitAmount(0, h) === 0`, `stagExitAmount(0.8 * h, h) > 0`; in StagScene.test, setting the exit MotionValue to 0.8 then 0 sets `uExit` above 0 then back to 0). e2e case in `stag-scene.spec.ts` "hero stag dissolves on scroll and reassembles on return": at 1440x900 wait for the hero scene to be active, `data-stag-exit` is `'0'`; scroll to 0.8 of the hero height, `expect.poll` gives a value above 0; scroll to 0, `expect.poll` gives `'0'`. Then budgets.
- Reuse: page-specific.

#### M2.5 CTA stag bookend [perf-a11y-13] (signature)

- Target: CtaBlock xl stag, `StagScene`.
- What: at xl with motion, a second `StagScene` replaces the visible stride webp and assembles from scattered to formed on the CTA's view progress. Make assembly state per instance: a module-level map keyed by an `instanceId` prop (`"hero"` keeps today's "assemble once per session" behaviour; `"cta"` assembles on view). The scene wrapper carries `data-stag-instance` and the root sets `data-stag-assembled="true"` when assembly completes. Add `layout?: 'poster' | 'centred'` (default `poster` keeps hero alignment). Same token uniforms, cached three, same `stag-points.json` and shader fetch. The webp stays as the `motionScene` fallback and keeps `data-testid="cta-stag"` and its tested attributes. The scene wrapper is aria-hidden.
- Files: `src/components/sections/CtaBlock.tsx`, `src/components/effects/StagScene.tsx`, `CtaBlock.test.tsx`, `StagScene.test.tsx`, `tests/e2e/stag-scene.spec.ts`, `tests/e2e/motion.spec.ts`, `tests/e2e/scene-lazy.spec.ts`.
- Tokens: `--color-brand`, `--color-accent`, `--color-base`, `--duration-scene`.
- Reduced motion: motionScene renders today's webp; no three fetch. Paused: the scene holds its frame.
- Validation: `pnpm -F web test:run src/components/effects/StagScene.test.tsx src/components/sections/CtaBlock.test.tsx` (add: two instances assemble independently). e2e cases in `stag-scene.spec.ts`: "CTA stag assembles on view at xl" (viewport 1600x1000, scroll the CTA into view, `[data-stag-instance="cta"] [data-scene-status]` becomes `active` and `data-stag-assembled` becomes `"true"`); "CTA stag stays a webp below xl" (viewport 1200x900, the CTA scene status never becomes `active` and no extra WebGL context is created). Then `scene-lazy.spec.ts`, `motion.spec.ts`, `a11y.spec.ts`, budgets.
- Effort: M-L.
- Reuse: page-specific.

Ruling: update the scene counts in `scene-lazy.spec.ts` (`:34` to 4, at-load statuses to `['active','idle','idle','idle']`, `:47` to 4) and `motion.spec.ts:80-90` (four fallbacks), because a fourth scene is the intended new behaviour; motionScene renders its status node even when the xl-only wrapper is hidden (cost if wrong: masking a real regression in scene lazy-loading; the executor changes only the counts, never the assertions' intent).

Ruling: the hero and CTA stags hold two live WebGL contexts at once because M0.4 (c) is dropped; SceneRuntime still pauses the offscreen one (cost if wrong: extra GPU memory on low-end devices; M0.4 adaptive DPR limits frame cost).

### M3: full verification

See Verification.

## Shared primitives

| Primitive                                                       | API sketch                                                                                                                  | Other pages that can adopt it                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `motion-on:` variant                                            | Tailwind variant: no-preference and not paused.                                                                             | Every route.                                                  |
| `useScrollProgress` / `useScrollProgressValue`                  | `useScrollProgress(ref): number` (unchanged); `useScrollProgressValue(ref): MotionValue<number>`; IO-gated; 0 under reduce. | Every `Parallax` user (HeaderVideo, PageHeader), `/process/`. |
| `MotionPauseProvider` / `useMotionPaused` / `MotionPauseToggle` | `useMotionPaused(): { paused; osReduced; toggle }`; `html[data-motion="paused"]`.                                           | Every route (header).                                         |
| `SceneRuntime`                                                  | adds `data-scene-tier`, `data-scene-paused`, pre-warm observer, pause-in-place, test-only `__sceneStats`.                   | All scenes.                                                   |
| `VideoMotionHero`                                               | now pauses off screen and when paused.                                                                                      | HeaderVideo pages.                                            |
| Focus ring                                                      | two-tone `:focus-visible`, settle under `motion-on`.                                                                        | Every route.                                                  |
| `press` utility, button cursor                                  | `className="press"`; base cursor rule.                                                                                      | Every Button, nav link, footer link and toggle.               |
| `[data-signal-sweep]` / `SectionSeam`                           | attribute on any 1px element; `<SectionSeam variant?="node" />`.                                                            | `/services/`, `/process/`, careers, footer later.             |
| `Spotlight`                                                     | `Spotlight({ size?: 'card' \| 'panel' })`, rAF-coalesced.                                                                   | CapabilityBlock on `/services/`, lab cards.                   |
| `Reveal` / `Stagger`                                            | `Reveal({ className?, variant?: 'rise' \| 'mask' \| 'words' })`; `Stagger({ itemClassName?: (i) => string \| undefined })`. | TeamGrid (`/about/`), any grid with spans.                    |
| `SectionHeading`                                                | `size?: 'sm' \| 'md'`, `eyebrow?: { index; label }`.                                                                        | ServiceBlock, RoleBlock pages.                                |
| `Section`                                                       | `size?: 'compact' \| 'default' \| 'spacious'`.                                                                              | Every route.                                                  |
| `GlowField`                                                     | `<GlowField anchor?="left" \| "right" \| "center" />` in a `relative isolate` parent.                                       | `/services/`, `/process/`, lab.                               |
| `StagScene`                                                     | `instanceId`, `layout?: 'poster' \| 'centred'`, `exit?: MotionValue<number>`.                                               | 404 page, OG-style headers.                                   |
| `PipelineDiagram`                                               | optional `activeIndex`; default path unchanged.                                                                             | CapabilityBlock on `/services/`.                              |
| `landing.spec.ts` helpers                                       | `tokenColor(page, name)`, `atViewport(page, w, h)`.                                                                         | Any future page spec (copy or extract to `support.ts` later). |

## New deps needing owner approval

None. Every change uses React, Tailwind 4, motion, lenis and three, which are already installed.

## Coordination

Before landing any change to these shared paths, run `ListAgents` and send session `add-team-portraits-tint` a `SendMessage` that names the files and the change:

- `app/web/src/styles/globals.css` (M0.0, M0.3, M0.5, M0.6, M0.7, M0.8, M0.10, M1.5, M2.1)
- `app/web/src/components/motion/*` (M0.1, M0.2, M0.3, M0.7, M0.9, M0.10)
- `app/web/src/components/ui/*` (M0.7 `button.tsx`, M0.8, M0.11, M0.12)
- `app/web/src/content/*.ts` (M0.3, M1.4, M2.2 `ui.ts`; M2.3 `substance.ts`); the other session asked to be told before any change here and has uncommitted edits in `legal.ts` and `legal.test.ts`
- `app/web/tests/e2e/support.ts`, `contact.spec.ts`, `lab.spec.ts` (not edited by this plan; the other session changed them for the live endpoint, so re-read before relying on them)
- `app/web/src/components/contact/*` (not edited, but `Button`, `Reveal`, `useReducedMotion.ts` and `content/ui.ts` changes affect ContactForm; re-run `ContactForm.test.tsx`)

Other notes:

- Another session owns the contact backend. ContactForm markup, roles and test behaviour stay stable.
- `src/content/ui.ts` gains keys (motion pause label and hint, eyebrow labels, gate labels, systems link). Additive only.
- `src/components/layout/*` (`Header.tsx`, `Footer.tsx`, `Section.tsx`) and `src/app/layout.tsx` render on every route; re-run `src/components/layout`, `src/app/template.test.tsx`, `keyboard.spec.ts`.
- `ProcessScroller` renders on `/process/`; M2.1 re-runs `pages.spec.ts` and budgets for `/process/`.

Ruling: message the other session before each shared-file change, not once up front (cost if wrong: extra messages; a missed one risks lost edits, since nothing locks).

## Rejected

| Proposal                          | Reason                                                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| motion-service-card-states        | Duplicate of perf-a11y-08; its border-image sweep ignores border-radius, so rounded-xl cards get square corners.                                                 |
| motion-press-feedback-primitive   | Duplicate of perf-a11y-09; the extra glint repaints on hover and fixes no captured defect.                                                                       |
| motion-systems-gates              | Duplicate of showcase-lattice-proof-sweep; thresholds 0.2 and 0.8 fall outside the 0.4-0.6 pin window; its CTA appears late, so focus can land on a hidden link. |
| motion-pipeline-signal-run        | Duplicate of showcase-pipeline-query-packet; unfinished spec; replaces useScrollDrawn globally, breaking CapabilityBlock reuse.                                  |
| motion-text-decode                | Fixed ch width overflows 390 px; no SSR final text; decode is a cliche on sober client proof.                                                                    |
| motion-hero-cursor-and-scrim      | Scrim duplicates perf-a11y-10; StagScene yaw desyncs the cloud from the poster stag.                                                                             |
| motion-section-tone-handoff       | Duplicate of visual-section-seam; a Section ::before clashes with ProcessScroller negative margins and SystemsScene py-0.                                        |
| motion-route-signal               | Header ::after already runs header-progress; a second animation overrides it; template remount happens after navigation.                                         |
| motion-services-grid-fill         | Conflicts with the bento; a sixth h3 breaks the 5-h3 test; copy missing; extra canvas.                                                                           |
| visual-surface-tones              | Duplicate of perf-a11y-08 for interaction; Card cva refactor touches about 7 lab consumers; StageCard and CTA panel are not Cards.                               |
| visual-delivered-ledger           | Sans claims break the mono test; sector tags need client-naming sign-off; layout duplicates perf-a11y-11.                                                        |
| visual-systems-gates              | Duplicate of showcase-lattice-proof-sweep; chips over 3D hotspots need per-frame projection; windows ignore the pin span.                                        |
| visual-pipeline-signal            | Puts index text inside SVG circles, breaching the no-text-in-SVG rule; otherwise duplicate.                                                                      |
| visual-process-rail               | Duplicate of motion-process-track-focus; aria-hidden rail breaks ProcessScroller.test; JS-only reduced layout risks SSR parity.                                  |
| visual-hero-mobile-scrim          | Duplicate of perf-a11y-10; camera offsetY desyncs from the poster stag.                                                                                          |
| visual-cta-stag-bookend           | Duplicate of perf-a11y-13; needs a still asset that does not exist.                                                                                              |
| visual-control-affordances        | Duplicate of perf-a11y-09; targets a non-existent SiteHeader.tsx; underline already exists via UNDERLINE.                                                        |
| perf-a11y-05                      | Duplicate of showcase-pipeline-query-packet; adds a third pin; 0.4-opacity captions fail contrast.                                                               |
| perf-a11y-06                      | Duplicate of showcase-lattice-proof-sweep; windows run past the pin; its always-visible link is folded into M2.2.                                                |
| perf-a11y-07                      | Duplicate of motion-process-track-focus; aria-hidden rail breaks the test; measured pin height shifts layout after hydration.                                    |
| showcase-lattice-to-line-morph    | Nodes and edges do not share a buffer; the morph window falls after the pin, where lattice opacity is near 0.                                                    |
| showcase-process-track-choreo     | Duplicate of motion-process-track-focus; mask fade hides the clip instead of fixing it; same SSR-parity gap.                                                     |
| showcase-decode-text              | getByText throws on duplicate text nodes; adds rAF JS where perf-a11y-11 fixes hierarchy with none; decode rejected as cliche.                                   |
| showcase-service-card-interaction | Duplicate of perf-a11y-08; sixth cell breaks the 5-h3 test; reads as a placeholder.                                                                              |
| showcase-scene-bloom-pass         | Bloom output is opaque over the alpha lattice and video, adds tone mapping that shifts token colours, highest INP risk.                                          |
| showcase-cta-stag-points          | Duplicate of perf-a11y-13; omits scene-count and layout updates.                                                                                                 |
| showcase-hero-mobile-legibility   | Duplicate of perf-a11y-10; moving POSTER_OBJECT_X desyncs from the poster; axe cannot measure contrast over canvas.                                              |
| showcase-control-press-states     | Duplicate of perf-a11y-09; underline already exists.                                                                                                             |

## Verification

Per task: run that task's validation commands, plus lint and format on touched files.

M3 gate, from the repo root, with output shown in the report:

1. `pnpm -F web exec tsc --noEmit`
2. `pnpm -F web lint`
3. `pnpm format:check`
4. `pnpm -F web test:run`
5. `pnpm build:raw`
6. `pnpm -F web test:e2e` (chromium and budgets projects; includes `landing.spec.ts` and `scene-frame.spec.ts`)
7. `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/a11y.spec.ts`
8. `pnpm -F web exec playwright test -c playwright.config.ts --project=budgets --no-deps`
9. Comment check (baseline is clean, so any match is new):
   `! grep -rnE '(^|[[:space:]])//|/\*|\{/\*' app/web/src app/web/tests app/web/public/media/brand/shaders --include='*.ts' --include='*.tsx' --include='*.css' --include='*.glsl' | grep -vE 'eslint-disable|@vitest-environment'`
10. Colour checks (baseline is clean):
    - TS and TSX: `! grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(' app/web/src app/web/tests --include='*.ts' --include='*.tsx'`
    - CSS outside `@theme`: `! awk '/@theme \{/,/^\}/{next}1' app/web/src/styles/globals.css | grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\('`
    - Shaders: `! grep -nE 'vec3\([0-9.]+, *[0-9.]+, *[0-9.]+\)|#[0-9a-fA-F]{3,8}\b' app/web/public/media/brand/shaders/*.glsl` and the same pattern over `app/web/src/components/effects/*.tsx`. A non-colour direction vector that trips this check is written as a named `const` uniform or a single-argument `vec3(...)` constructor.
    - Two-token `color-mix`: `! grep -rnoE 'color-mix\(in [a-z]+, *var\(--[a-z-]+\)( [0-9]+%)?, *[^t ][^)]*' app/web/src`
11. Manual pass with `pnpm -F web dev` at 1440 and 390, in normal, reduced and paused modes. The automated part is `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/landing.spec.ts`. Then re-capture the seven sections and compare with `docs/ui-audits/landing/shots/`. Check: no empty sixth services cell and no permanent red ring; card 5 ends flush and card 3 is never clipped at rest; no void under the process cards; process neighbours readable; systems runway shows gates and a link, and at 390 they fit the stage; pipeline packet and descriptors visible; mobile lede readable over the stag; hero stag dissolves on exit and reassembles; CTA stag assembles at xl; the mobile menu at 390 shows press feedback; the pause toggle stops everything decorative.

## Implementation rulings (2026-10-14)

Ruling: L-M0.3 destroys Lenis when paused instead of `lenis.stop()` (cost if wrong: one re-create on unpause; `stop()` blocks wheel scrolling).
Ruling: L-M0.3 keeps Parallax as an `m.div` with `y = 0` when paused (cost if wrong: none visible; swapping to a plain div would remount the hero scene and video).
Ruling: L-M0.3 paused header draws the progress bar full as its end state (cost if wrong: a static full bar under the paused header; one rule to change to hidden).
Ruling: L-M0.3 HeroMotionCanvas treats paused like reduced and redraws one still frame (cost if wrong: particles re-seed on toggle on non-WebGL devices).
Ruling: L-M0.4 caps each frame sample at 50 ms in the slow-frame window and passes a live `pixelRatioRef` to scenes (cost if wrong: one long hitch never forces a step down; point sizes track the live ratio).
Ruling: L-M0.7 `press` transitions transform and colour properties together (cost if wrong: colour transitions are no longer separately configurable on press elements).
Ruling: L-M0.8 the SectionSeam node dot sits outside the swept line so it never scales (cost if wrong: none).
Ruling: L-M0.10 words hide only in the client-set `armed` state, never in SSR `pending` (cost if wrong: in-view-at-load headings do not rise; they are never invisible before hydration).
Ruling: L-M1.1 the hero copy wrapper widens to `lg:max-w-5xl` so the slogan sits on two lines at lg (cost if wrong: a wider measure for the H1 only; the lede keeps `max-w-2xl`).
Ruling: L-M1.3 the featured card uses a GlowField, not `mccor-ai-neural.webp`, because that image has baked-in text and a third-party logo (cost if wrong: no image texture on the featured card until a text-free asset exists).
Ruling: L-M1.3 cards use one Reveal each with an index delay instead of Stagger `itemClassName`, because ServicesPreview is a server component and cannot pass a function prop (cost if wrong: two stagger code paths).
Ruling: Reveal always renders a wrapper div under reduced motion so the client tree matches SSR (cost if wrong: one extra div per Reveal; without it hydration reused nodes and caused a one-frame layout shift).
Ruling: the global reduced-motion rule sets `transition-duration: 0s` (cost if wrong: none; 0.01 ms still created transient transitions that `getAnimations()` counted).
Ruling: `budgets.spec.ts` INP-on-/ cancels link navigation from its blind clicks and asserts the URL, approved by the owner (cost if wrong: the test no longer follows a link it happens to click).
Ruling: L-M2.1 only the cards adjacent to the active card drop 8 px, and the pin markup is inlined instead of using `Pinned` (cost if wrong: pages.spec stays green; a second pin implementation to maintain).
Ruling: L-M2.2 the evaluation link targets `/services/#ai-engineering`, the section that holds evaluation, because `#evaluation` does not exist (cost if wrong: one href).
Ruling: L-M2.2 gate DOM states are driven from NodeLatticeScene because sections may not import effects (cost if wrong: gates update once the lattice chunk loads).
Ruling: L-M2.3 the packet halo uses normal blending and the passed tint is a rounded rect (cost if wrong: a softer glow; a one-element swap).
Ruling: L-M2.4 Hero passes its section ref and StagScene owns the exit MotionValue, because sections may not import motion/react (cost if wrong: none; the listener lives in the lazy chunk).
Ruling: L-M2.5 StagScene gains `assembleOn: 'mount' | 'view'`, the CTA box is aria-hidden, and scene-lazy counts five WebGL contexts at 1280 (xl) (cost if wrong: one extra live context at xl, as the M2.5 ruling accepts).
