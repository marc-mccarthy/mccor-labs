# Contact page polish plan

Route: `/contact/` (http://localhost:3000/contact/). Baton ledger: `docs/plans/contact-polish.baton.json`. Companion plan: `docs/plans/2026-10-13-landing-polish-plan.md`, called "the landing plan" below. Its milestone items are written `L-M0.n`.

## Context

The page is `app/web/src/app/contact/page.tsx`. It renders `PageHeader` (title "Contact", the lede, image `/media/brand/cta-terminus.webp`, no video, `page.tsx:17-21`), then `Section > Container > ContactForm endpoint={env.contactEndpoint}` (`page.tsx:22-26`). The app is a Next.js 16 static export in `app/web` with Tailwind 4, motion 13, lenis and three. `app/template.tsx` wraps every route in `RouteTransition`.

`ContactForm` (`app/web/src/components/contact/ContactForm.tsx`) has two states. `NEXT_PUBLIC_CONTACT_ENDPOINT` decides between them at build time:

- Live form (`endpoint !== null`, `ContactForm.tsx:136-257`). Five fields (name, email, company, budget, message), each in its own `Reveal`. A honeypot. A primary submit `Button` ("Send message", "Sending…" while sending). One status `p[role=status][aria-live=polite]`. State is `Status = 'idle' | 'sending' | 'sent' | 'error'` (`:22`). A lab prefill banner appears when the URL hash starts with `#lab=` (`useLabPrefill.ts`).
- Mailto fallback (`endpoint === null`, `ContactForm.tsx:65-85`). A bordered surface card with `ui.contactNotLive`, `BookingCta`, an optional lab "email results" link and the raw email as a link button.

A second build-time value changes what `BookingCta` renders (`BookingCta.tsx:15-20`):

- `env.bookingUrl !== null`: an external "Book a call" link (`ui.bookCall`).
- `env.bookingUrl === null`: a mailto link "Email us directly" (`ui.contactFallback`) to the same address as the raw email link.

`env.bookingUrl` is required in a production build (`lib/env.ts:35-43` throws when `NODE_ENV === 'production'` and it is missing). So the null-booking state exists only in `pnpm -F web dev` and in unit tests. The capture ran on the dev server, so it shows the null-booking state: every "Email us directly" pill in the shots is a mailto.

The dev server runs with `NEXT_PUBLIC_CONTACT_ENDPOINT=/api/contact`, so the capture shows the live form. The fallback was not captured.

### Scope

- Ambition: bold showcase. Shader and WebGL work, scroll choreography and signature moments are in scope. Each is held to reduced-motion parity, `budgets.spec.ts` and `a11y.spec.ts`.
- New npm dependencies: allowed when justified and flagged for owner approval, never installed. This plan proposes none.
- Local launch: `pnpm -F web dev`.
- The reusable piece for other pages is the saved workflow that produced this plan. It is outside this plan.

### Hard rules for every task

- Colours come only from the `@theme` block in `app/web/src/styles/globals.css` (lines 19-32). Name tokens. Never type hex, rgb(), hsl() or oklch() values. Tests compare colours through a token probe (`tokenColor`, see C0.7), never through literals.
- `color-mix()` only as one token mixed with `transparent` (pattern in `Spotlight.tsx:6-7`). Tailwind alpha on a token for a fill or a border (`bg-brand/5`, `bg-base/60`) is the same thing and is allowed. Never mix two tokens. If no token fits, stop and report the gap.
- Text never sits at partial opacity (landing hard rule). `--color-muted` at reduced opacity over `--color-surface` falls below 4.5:1. De-emphasise text with a token colour, a border or a background, never with `opacity` or `text-*/NN`.
- Shaders take colour only through uniforms fed by `ctx.color('<token>')` in `SceneRuntime`. New shader code changes the intensity or alpha of one colour uniform. It never interpolates between two colour uniforms.
- No code comments of any kind, including GLSL in template strings and CSS. Exempt: tool directives (`'use client'`, `@vitest-environment`, `eslint-disable`).
- No text baked into images or SVG. The select chevron is a path-only SVG.
- Every motion effect has a reduced-motion fallback through `useReducedMotion` (`app/web/src/components/motion/useReducedMotion.ts`) or a CSS gate. Use the landing `motion-on:` variant (L-M0.0) once it lands. Until then use `motion-safe:` or `@media (prefers-reduced-motion: no-preference)`. Every transition on a new element is gated too (`motion-on:transition-*`). Do not rely on the global 0.01 ms rule (`globals.css:137-145`).
- `motion.spec.ts:25` runs per route, including `/contact/`. Under reduce nothing animates (`document.getAnimations().length === 0`), no `[data-reveal]` is below opacity 1, nothing is sticky outside the header, and no three or scene script loads. Every new keyframe or scroll-driven animation lives behind `motion-on:` or inside the no-preference media query. Filled animations still count, so a one-shot keyframe uses `animation-fill-mode: backwards` or `none`, never `both` or `forwards`, unless it is inside the no-preference gate and finishes before the test reads.
- Paused-mode parity: once L-M0.3 lands, `html[data-motion="paused"]` stops decorative motion. Every new decorative animation in this plan renders its end state when paused (the `motion-on:` variant does this).
- SSR renders the motion branch (the media-query server snapshot is false). Layout differences between modes come from `motion-reduce:` CSS, never from a JS branch alone.
- `app/web/tests/e2e/budgets.spec.ts` and `a11y.spec.ts` are not edited and must keep passing. Never edit a test to make buggy code pass. New cases go in new spec files (C0.7).
- Do not run or edit git. Do not touch `app.env`, `pw.json`, `AGENTS.md` or `docs/plans/should-this-be-ai-*`.
- Session `add-team-portraits-tint` owns the contact backend. Keep these unchanged in ContactForm: labels, ids, roles, `aria-*` on fields, the honeypot, the "Send message" button text, and the status-line markup. The status line is `<p role="status" aria-live="polite" className="text-sm text-muted">` with `StatusText` inside, including the anchor class `text-accent underline underline-offset-4` (`ContactForm.tsx:45`). `ContactForm.test.tsx` passes unmodified after every task. A build check greps "Send message" in `out/contact/index.html`.
- Never POST to the live endpoint. Every e2e state uses `page.route('**/api/contact', ...)`.

Ruling: no task edits `ContactForm.test.tsx`; new assertions go into new unit files and new e2e specs (cost if wrong: a state the backend session also wants pinned is guarded only by e2e; that task then gains a Coordination step before it edits the test file).

Ruling: style the pinned status `p` and its mailto anchor only from ancestors (form `data-*` attributes and wrapper child selectors), never by editing their class strings (cost if wrong: wrapper selectors need higher specificity than `.text-muted`; C1.6 and C1.7 assert the computed colour to prove it).

### How to run checks (from the repo root)

- Unit: `pnpm -F web test:run <path relative to app/web>`.
- E2E serves the static export from `app/web/out`, so build first. A production build needs a booking URL (`lib/env.ts:35-43`). Use the shell value when present, else a placeholder on the reserved `.invalid` domain:
  - Live-form build: `NEXT_PUBLIC_BOOKING_URL=${NEXT_PUBLIC_BOOKING_URL:-https://booking.invalid/call} NEXT_PUBLIC_CONTACT_ENDPOINT=/api/contact pnpm build:raw`
  - Fallback build: `env -u NEXT_PUBLIC_CONTACT_ENDPOINT NEXT_PUBLIC_BOOKING_URL=${NEXT_PUBLIC_BOOKING_URL:-https://booking.invalid/call} pnpm build:raw`
  - `tests/e2e/support.ts:6` `builtWithEndpoint()` reports which build is in `out/`.
- Chromium project (Desktop Chrome, 1280x720 by default, `playwright.config.ts:17`): `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium <spec>`.
- Budgets project (serial, matches any file name ending `budgets.spec.ts`): `pnpm -F web exec playwright test -c playwright.config.ts --project=budgets --no-deps <spec>`.
- SSR text check after a live-form build: `grep -q 'Send message' app/web/out/contact/index.html`.
- Visual check: `pnpm -F web dev` in the background, then open http://localhost:3000/contact/ at 1440x900 and 390x844, normal and reduced motion. The dev server is also the only place to see the null-booking state.
- Every e2e case below has an exact title, so `-g "<title>"` runs it alone. Cases at phone width live in a `test.describe('at 390', ...)` with `test.use({ viewport: { width: 390, height: 844 } })`, and their titles start with `390 `.

Ruling: new contact e2e cases go in two new files owned by this plan, `tests/e2e/contact-states.spec.ts` (chromium) and `tests/e2e/contact-budgets.spec.ts` (budgets project); the existing `contact.spec.ts` has uncommitted edits from another session and `budgets.spec.ts` stays unedited (cost if wrong: `contact-budgets.spec.ts` copies `measureCls`, `observeWorstInteraction`, `CLS_MAX` and `INP_MAX_MS` from `budgets.spec.ts:11-12`, so a budget change must be made in two places).

Ruling: the build commands use a `.invalid` placeholder booking URL only when the shell has none (cost if wrong: e2e sees "Book a call" pointing nowhere; no test clicks it, and `routes.spec.ts:30` only needs a visible https or mailto link).

## Capture findings

Inventory: `docs/ui-audits/contact/inventory.json`. Screenshots: `docs/ui-audits/contact/shots/`. Vitals: LCP 80 ms (the header image), CLS 0. Console: six expected errors, all from `page.route` mocks (429 x2, 400 x2, 500 x2). No POST reached the live endpoint (9 mocked POSTs). 28 interactive elements, 22 notable non-interactive ones.

### Header (chrome)

Shots: `shots/desktop-normal-section-00.png`, `shots/desktop-normal-full.png`, `shots/int-005-*.png`, `shots/mobile-normal-section-00.png`.

Sticky `bg-base/80` blur bar. "Contact" carries the current-page brand underline. The accent "Email us directly" pill top right (`Header.tsx:76`, inside `hidden md:block`) duplicates the page goal and competes with "Send message", which is below the fold at 1440x900. The current-page "Contact" link (int-005) has no visible hover change: its underline is already drawn (`underline.ts`, `aria-[current=page]:after:scale-x-100`), so `hover:after:scale-x-100` changes nothing. Logo hover changes only opacity. The mobile menu toggle and its links (int-007 to int-012) measured 0x0 because the menu was closed. The mobile menu CTA (`Header.tsx:152`) on `/contact/` was never captured.

### Page hero (PageHeader with image)

Shots: `shots/desktop-normal-section-01.png`, `shots/mobile-normal-section-01.png`, `shots/desktop-reduced-section-01.png`.

Strongest part of the page. A node lattice with an accent orb at roughly 72% across, and a painted light trail sweeping from lower left toward it. The left 45% is near-black, so type reads well. Weak: "Contact" at `text-display-md` and a small muted `text-lg` lede promise less than the image. After 800 ms (lede-in and band-signal hairline) nothing moves. There is no scroll or pointer response. The brand hairline at the hero bottom is the only seam into the form.

At 390 the image (`object-cover object-right`, `PageHeader.tsx:43`) crops so the orb sits at the left edge, about x=95, and the painted trail falls outside the frame. Phones see a lattice with an orb but no transmission line.

### Contact form section

Shots: `shots/desktop-normal-section-02.png`, `shots/desktop-normal-form-idle.png`, `shots/mobile-normal-form-idle.png`.

The flattest region of the site at the conversion moment. At 1440 the form is `max-w-xl` (576 px) pinned left at x=168. About 700 px to its right is empty base. About 200 px of dead space sits under the submit before the footer. There is no frame, heading, intro, alternative path or trust cue. Five identical 42 px boxes. Budget is a native select at 38 px with larger text and computed `cursor: default` (int-016). Required fields carry no marker; optional ones say "(optional)".

Unverified: a background tone step at exactly y=900 (desktop) and about y=845 (mobile) in full-page shots. It is likely the fixed `body::after` grain sized to the viewport. Treat it as a capture artifact until checked live (Verification step 12).

### Focus and typing

Shots: `shots/desktop-normal-form-focus-typing-name.png`, `shots/desktop-normal-form-filled-focus-message.png`, `shots/int-013-*.png` to `shots/int-017-*.png`.

Focus is only the global 2 px accent outline (`globals.css:117-120`). Border, background, label and caret do not change. Hover changes nothing on any field. Typing gives no feedback.

### Validation errors

Shots: `shots/desktop-normal-form-validation-empty.png`, `shots/desktop-normal-form-validation-partial.png`, `shots/desktop-normal-form-validation-focus-invalid.png`, `shots/mobile-normal-form-validation-empty.png`.

Small `text-brand` lines under each invalid field. `aria-invalid` and `aria-describedby` are correct, but the field border stays `border-strong`. The focused invalid email shows an accent ring next to red text: two competing hues. Errors pop in and push layout 22 px each. Focus stays on the submit button. The sticky header overlaps the top field in state shots.

### Submit press and sending

Shots: `shots/desktop-normal-form-sending.png`, `shots/int-019-*.png`.

Accent pill, 145x44. Hover and press change only the background. Computed cursor is `default`. Sending: label "Sending…", disabled, opacity 0.5. It reads as greyed brown. Fields stay editable and bright.

### Success

Shots: `shots/desktop-normal-form-success-reference.png`, `shots/desktop-normal-form-success-no-reference.png`, `shots/mobile-normal-form-success-reference.png`.

One `text-sm text-muted` line under the button ("Thanks — your message has reached us. Reference MC-7Q4K."). Same style as every error. The form stays filled and "Send message" re-arms, inviting a duplicate send. The reference is plain text. Nothing on screen celebrates the send.

### Server errors

Shots: `shots/desktop-normal-form-error-daily-cap.png`, `shots/desktop-normal-form-error-rate-limit.png`, `shots/desktop-normal-form-error-too-fast.png`, `shots/desktop-normal-form-error-validation-server.png`, `shots/desktop-normal-form-error-server.png`, `shots/mobile-normal-form-error-server-mailto.png`.

All five render as the same muted line. `daily_cap` and `server` add an accent underlined mailto link that keeps the typed message. It is a good recovery path but visually lost, and the link has no hover, press or focus treatment beyond the global outline.

### Lab prefill banner

Shots: `shots/desktop-normal-form-lab-prefill.png`, `shots/desktop-normal-form-lab-prefill-full.png`, `shots/mobile-normal-form-lab-prefill.png`.

A `rounded-xl` surface box with "We added your results. Edit or remove them." and a small accent `BookingCta`. It has the same weight as a field, and its CTA is a third accent pill on screen. At 390 the prefilled textarea clips mid-line at `rows=6`. The capture did not remount the form, so the shots also show a stale server-error status from the previous step. From code, a fresh mount starts with an empty status (`ContactForm.tsx:55-56`), so a real `#lab=` arrival should not show a stale status. That is an inference; C1.8 adds a test that checks it.

### Mailto fallback (not captured)

Read from `ContactForm.tsx:65-85`. A bordered surface card with `ui.contactNotLive`, `BookingCta`, the optional lab link and the raw email as a link button. In the null-booking state the `BookingCta` is a second mailto to the same address. The card already has the panel framing the live form lacks. It needs its own capture from a fallback build (C1.10).

### Footer (chrome)

Shot: `shots/desktop-normal-section-03.png`.

Tidy brand line and two link columns with underline hover. No contact detail on this page. The section shot shows a red top edge and the full-page shot a grey border. I do not know which is live (Verification step 12).

### Token gaps

`@theme` has no success or positive colour and no warning colour. Success uses `--color-accent` plus `--color-elevated` and `--color-text`. Wait states (`rate_limit`, `too_fast`) use `--color-muted` and `--color-border-strong`. Hard failures use `--color-brand`. Reported, not invented.

## Existing effects

- `RouteTransition` (via `app/template.tsx:5`): WAAPI fade plus `translateY(--space-md)` on client navigation. Skipped on first load and under reduce (`RouteTransition.tsx:11-25`).
- `PageHeader` (`components/sections/PageHeader.tsx`, shared by 8 routes): `Parallax speed=0.15` on the image (`:36-45`), mask `mask-t-from-80% mask-b-from-45%` (`:14`), gradient scrim (`:48`), `motion-safe:animate-lede` on the lede (`:23`), brand `header-signal` hairline with `band-signal` (`:50-54`). The h1 has no motion.
- `ContactForm`: each field in its own `Reveal` (rise, y 24 to 0, `--duration-standard`, `--delay-considered`, `--ease-standard`). Elements in view at load render as `data-reveal=shown` with no animation (`Reveal.tsx:45,60-65`). `BookingCta` wraps `Magnetic` (pointer pull, ±6 px, gated by `usePointerEffects`). `Button` primary has `transition-colors`.
- Header: nav links use `UNDERLINE` (`layout/underline.ts`), mobile menu items stagger in with `MOBILE_ITEM` (`Header.tsx:20-21`).
- Global: `:focus-visible` accent outline (`globals.css:117-120`). Grain `body::after`. Reduce rule collapses durations (`globals.css:137-145`).
- No scene, no scroll timeline and no pointer effect on the form.

## Dependencies on the landing plan (M0)

The capture summary cites landing items by an older numbering. The current landing numbering is used here.

| Landing item                                    | Contact use                                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| L-M0.0 `motion-on` variant, `tokenColor` helper | Every new gate in this plan; the token probe pattern copied into `contact-states.spec.ts`                       |
| L-M0.3 motion pause                             | Scene pauses in place; scroll timelines and the sent signature render end states when paused (C2.1, C2.2, C2.5) |
| L-M0.4 SceneRuntime adaptive DPR                | Beam scene frame cost (C2.1)                                                                                    |
| L-M0.6 focus ring two-tone and settle           | Field focus; invalid fields opt out of the settle (C0.1)                                                        |
| L-M0.7 press utility and button cursor          | Submit press and pointer cursor (C1.5), copy and reset buttons, mobile menu CTA                                 |
| L-M0.8 signal sweep                             | Panel top edge gradient (C1.2, C2.2, C2.5)                                                                      |
| L-M0.9 Spotlight size and rAF                   | Panel glow, plus the `trigger` prop added in C0.3                                                               |
| L-M0.10 Reveal className, Stagger itemClassName | Field Stagger (C1.3); the focus guard (C0.5) protects every Reveal                                              |
| L-M0.11 SectionHeading eyebrow; Section size    | Eyebrow extracted to `ui/eyebrow.tsx` (C0.2); `Section size="compact"` (C1.2)                                   |
| L-M0.12 GlowField                               | Lit space behind the panel (C1.2)                                                                               |
| L-M0.13 scene frame stats                       | Beam scene measurement (C2.4)                                                                                   |
| L-M0.1 scroll progress MotionValue              | Indirect: `Parallax` migrates there; the beam rides the same Parallax wrapper                                   |

Not needed: L-M0.2 (hero video). L-M0.5 (grain) only for the tone-step check.

Ruling: contact work that needs a landing primitive waits for that primitive and does not fork it (cost if wrong: C1.2 and M2 stall behind landing M0; the field, status and receipt tasks do not depend on landing and can land first, using `motion-safe:` until `motion-on:` exists).

## Changes

Task ids are `C<milestone>.<n>`. Each task lists target, what, files, tokens, reduced motion, validation and reuse tag. Every task touching a Coordination path (see Coordination) starts with a Coordination step: run `ListAgents`, then `SendMessage` to `add-team-portraits-tint` naming the files, the change, and that `ContactForm.test.tsx` stays unmodified. Do not land until the message is sent.

### M0: shared primitives

#### C0.1 Shared `fieldVariants` with select kind [perf-a11y-field-variants, perf-a11y-select-system]

- Target: `FIELD` constant (`ContactForm.tsx:24-25`).
- What: new `src/components/ui/field.ts` exports cva `fieldVariants({ kind: 'input' | 'select' | 'textarea' })`.
  - Base: `w-full rounded-lg border border-border-strong bg-base/60 text-text placeholder:text-muted px-3 text-base scroll-mt-24 motion-on:transition-[border-color,box-shadow] motion-on:duration-(--duration-pointer) motion-on:ease-(--ease-pointer)`. `bg-base/60` is a recessed well inside the surface panel. The full `border-border-strong` stays at rest, so the boundary keeps 3:1 non-text contrast.
  - Hover: `hover:border-muted`.
  - Focus: `focus-visible:border-accent` plus `focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_24%,transparent)]`. The global solid outline stays primary (a11y.spec focus check).
  - Invalid: `aria-[invalid=true]:border-brand aria-[invalid=true]:focus-visible:outline-brand aria-[invalid=true]:focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-brand)_24%,transparent)] aria-[invalid=true]:focus-visible:animate-none`.
  - `input` and `select`: `h-11`. `select`: `appearance-none pr-10 cursor-pointer` (L-M0.7's cursor rule covers only `button` and `[role=button]`; inventory int-016 shows `cursor: default` on the select). `textarea`: `py-2 min-h-[calc(6lh+1rem)] max-h-[60vh] field-sizing-content`.
- No React state per keystroke. Labels get `group-focus-within:text-accent` from the wrapper `group` (applied in C1.3).
- Files: `src/components/ui/field.ts`, `src/components/ui/field.test.ts`.
- Tokens: `--color-border-strong`, `--color-muted`, `--color-accent`, `--color-brand`, `--color-base`, `--color-text`, `--duration-pointer`, `--ease-pointer`, `--radius-lg`.
- Reduced motion: states still apply. Transitions are behind `motion-on:`, so changes are instant. The ring is a static box-shadow, not an animation.
- Validation: `pnpm -F web test:run src/components/ui/field.test.ts` (cases: each kind returns `h-11` or the textarea classes; select has `cursor-pointer` and `appearance-none`; invalid classes present; no colour literal in any output).
- Reuse: shared-primitive (lab `RaceInputs`, `WorkflowBuilder`, any future form).

Ruling: invalid fields set `animate-none` on focus, so L-M0.6's settle keyframe (brand to accent outline) cannot paint an accent ring on an invalid field (cost if wrong: invalid fields lose the settle flourish only).

Ruling: `field-sizing: content` lives once in `fieldVariants` (cost if wrong: Firefox lacks it and falls back to the min-height of about 6 rows; the lab prefill still scrolls inside the box there).

#### C0.2 Eyebrow primitive and PageHeader scale and image position [visual-pageheader-eyebrow-scale]

- Target: L-M0.11 eyebrow renderer in `section-heading.tsx`; `PageHeader` text block and image (`PageHeader.tsx:17-46`).
- What:
  - Extract the L-M0.11 eyebrow into `src/components/ui/eyebrow.tsx`: `Eyebrow({ index: string; label: string; className?: string })`. A `font-mono text-xs uppercase tracking-widest` line with a 16 px `bg-brand` tick that draws with `band-signal` only under `motion-on:`. The index is `text-text`, then a slash, then the label in `text-muted`. `SectionHeading` imports it with identical output.
  - `PageHeader` gains `eyebrow?: { index: string; label: string }`, `size?: 'md' | 'lg'` (default `md`) and `imageClassName?: string` (merged onto the img with `cn`).
  - `size="lg"`: h1 `text-display-lg` (its letter-spacing token applies through the Tailwind text utility); lede `text-xl text-text max-w-[48ch] text-pretty`.
  - Default props render byte-identical markup to today on the 7 other routes. No h1 word reveal.
- Files: `src/components/ui/eyebrow.tsx`, `src/components/ui/eyebrow.test.tsx`, `src/components/ui/section-heading.tsx`, `src/components/ui/section-heading.test.tsx` (add cases only), `src/components/sections/PageHeader.tsx`, `src/components/sections/PageHeader.test.tsx` (add cases only).
- Tokens: `--text-display-lg`, `--text-display-lg--letter-spacing`, `--text-display-md`, `--font-mono`, `--color-brand`, `--color-text`, `--color-muted`, `--duration-scene`, `--ease-standard`.
- Reduced motion: tick full width, no draw. Lede-in is already `motion-safe:`.
- Validation: `pnpm -F web test:run src/components/ui/eyebrow.test.tsx src/components/ui/section-heading.test.tsx src/components/sections/PageHeader.test.tsx` (cases: no new props renders the same class strings as today; `size="lg"` sets `text-display-lg` and a lede without any `/NN` alpha; eyebrow renders outside the h1 so the h1 accessible name stays the title; `imageClassName` reaches the img).
- Depends on: L-M0.11.
- Coordination: yes (`components/ui/*`, `PageHeader.tsx`).
- Reuse: shared-primitive. All 8 PageHeader routes can opt in: about, careers, services, work, process, lab/evals, lab/should-this-be-ai.

Ruling: drop the h1 words reveal (cost if wrong: a static h1; Reveal renders in-view-at-load elements as `data-reveal=shown`, so the reveal would not play and would only add SSR-versus-hydrated risk).

Ruling: the `size="lg"` lede uses full `text-text`, not the reviewed `text-text/80` (cost if wrong: the lede reads a step brighter than drafted; the landing rule bans text at partial opacity).

#### C0.3 Spotlight focus-within trigger [perf-a11y-form-panel-shell enabler]

- Target: `Spotlight` after L-M0.9.
- What: add `trigger?: 'hover' | 'focus-within'` to L-M0.9's `Spotlight` (default `hover`, output unchanged). `focus-within` adds `group-focus-within:opacity-100` alongside `group-hover:opacity-100`. It also sets default `--spot-x: 50%` and `--spot-y: 0%` in the inline style, so the radial-gradient is valid before any pointer move. No `activeElement` rect reads.
- Files: `src/components/motion/Spotlight.tsx`, `src/components/motion/Spotlight.test.tsx`.
- Tokens: `--color-brand`, `--duration-standard`, `--ease-pointer`.
- Reduced motion: renders null unless `usePointerEffects` (unchanged). Keyboard focus feedback on fields comes from C0.1, not Spotlight.
- Validation: `pnpm -F web test:run src/components/motion/Spotlight.test.tsx` (cases: default has no `group-focus-within` class; `trigger="focus-within"` has it and inline `--spot-x` and `--spot-y`).
- Depends on: L-M0.9. If the landing plan has already added a trigger option, reuse it and skip this task.
- Coordination: yes (`components/motion/*`).
- Reuse: shared-primitive (any panel holding inputs; `CapabilityBlock` keeps hover).

#### C0.4 BookingCta link variant, header demotion, current-link hover [perf-a11y-cta-hierarchy, header part]

- Target: `BookingCta` (`layout/BookingCta.tsx:11-24`); desktop header CTA (`Header.tsx:76`); mobile menu CTA (`Header.tsx:152`); `UNDERLINE` (`layout/underline.ts`).
- What:
  - `BookingCta` gains `variant?: 'primary' | 'link'` (default `primary`, unchanged). `link` skips `Magnetic` (no pointermove listener) and renders `Button variant="link"` with the same accessible name and href, in both the null and non-null booking branches.
  - `Header.tsx:76` (desktop, inside `hidden md:block`) passes `variant="link"` when the existing `current` (`stripTrailingSlash(pathname)`, `Header.tsx:29`) equals `'/contact'`.
  - `Header.tsx:152` (mobile menu) stays `primary` on every route, `/contact/` included.
  - `UNDERLINE` gains `aria-[current=page]:hover:after:h-0.5`, so hovering the current-page link thickens its drawn underline from 1 px to 2 px. It affects the current link on every route.
- Files: `src/components/layout/BookingCta.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/underline.ts`, `src/components/layout/layout.test.tsx` (add cases only), `tests/e2e/contact-states.spec.ts` (cases below).
- Tokens: `--color-accent`, `--color-text`, `--color-brand`, `--color-glow-red`.
- Reduced motion: no change. The link variant has no motion. The underline thickness change is instant.
- Validation:
  - `pnpm -F web test:run src/components/layout/layout.test.tsx src/components/contact/ContactForm.test.tsx` (`ContactForm.test.tsx` runs unmodified; new cases go in `layout.test.tsx` only: link variant renders no `[data-magnetic]` and keeps name and href with `env.bookingUrl` mocked to null and to a URL; Header on `/contact` renders the desktop CTA without `[data-magnetic]` and the mobile CTA with it).
  - Live-form build, then `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/routes.spec.ts tests/e2e/lab.spec.ts`.
  - e2e "current contact link thickens on hover": at 1440, hover the `aria-current="page"` link, `getComputedStyle(link, '::after').height` goes from `'1px'` to `'2px'`.
  - e2e "390 mobile menu on contact keeps one accent CTA": at 390x844 on `/contact/`, click the menu button, `#mobile-nav` is visible with five links and the CTA, the "Contact" link has `aria-current="page"`, the CTA is in the viewport, axe is clean with the menu open, Escape closes it and focus returns to the menu button.
- Coordination: yes (`Header.tsx` and `BookingCta.tsx` are also edited by L-M0.3 and L-M0.7).
- Reuse: shared-primitive.

Ruling: the desktop header uses the link variant on /contact rather than secondary (cost if wrong: header loses pill parity with other routes on this one page; one prop to change to secondary).

Ruling: the mobile menu CTA stays a primary pill on /contact (cost if wrong: two accent pills exist on the page at 390, but the open menu covers the form, so only one is in view at a time; demoting it would leave the open menu with no clear action).

#### C0.5 Reveal focus guard [perf-a11y-reveal-focus-safety, guard half]

- Target: every `Reveal` site.
- What: in `globals.css`, `[data-reveal]:focus-within { opacity: 1 !important; transform: none !important; clip-path: none !important; }`. A field tabbed to before its in-view callback is then never invisible. The stylesheet `!important` beats motion's inline styles. No change to `Reveal.tsx`.
- Files: `src/styles/globals.css`, `tests/e2e/contact-states.spec.ts` (case below).
- Tokens: none.
- Reduced motion: Reveal renders bare children; the guard is inert.
- Validation: e2e "390 contact field revealed on keyboard focus": at 390x844, Tab to `#message` straight after load, computed opacity of its `[data-reveal]` ancestor is `'1'`. Also `pnpm -F web test:run src/components/motion/Reveal.test.tsx src/components/motion/Reveal.ssr.test.tsx`.
- Coordination: yes (`globals.css`).
- Reuse: shared-primitive (all Reveal users).

Ruling: the guard is checked in e2e, not in jsdom (cost if wrong: none for coverage; jsdom does not compute `:focus-within` with `!important` reliably).

#### C0.6 CopyButton [visual-success-receipt, perf-a11y-mailto-fallback-polish]

- Target: new `src/components/ui/copy-button.tsx`.
- What: `CopyButton({ value: string; label: string; copiedLabel: string; failedLabel: string })`. A `Button variant="secondary" size="sm"` that calls `navigator.clipboard.writeText(value)`. On success the visible label swaps to `copiedLabel` for 2 s, then reverts. On rejection, or when `navigator.clipboard` is missing, it shows `failedLabel` as visible text in a sibling `p` (`text-sm text-brand`), never a silent catch. A polite live region inside the component announces the result. The accessible name is `label`, never the value.
- Files: `src/components/ui/copy-button.tsx`, `src/components/ui/copy-button.test.tsx`.
- Tokens: through `Button` (`--color-surface`, `--color-elevated`, `--color-text`, `--color-border-strong`), plus `--color-brand`.
- Reduced motion: none.
- Validation: `pnpm -F web test:run src/components/ui/copy-button.test.tsx` (cases: writes value; shows copied label, reverts after 2 s with fake timers; rejected promise shows failed text; missing clipboard shows failed text; accessible name equals label).
- Coordination: yes (`components/ui/*`).
- Reuse: shared-primitive (lab result reference, any code display).

Ruling: the copied label reverts after a fixed 2 s (cost if wrong: a slow reader may miss the visual swap; the live region has already announced it, and a second click copies again).

#### C0.7 Contact e2e harness and budget gates [perf-a11y-contact-state-gates]

- Target: new `tests/e2e/contact-states.spec.ts` and `tests/e2e/contact-budgets.spec.ts`.
- What:
  - `contact-states.spec.ts` (chromium project). Helpers at the top: `tokenColor(page, name)` (the L-M0.0 probe: append a div with `style.color = 'var(<name>)'`, return its computed colour), `noOverflow(page)` (asserts `document.documentElement.scrollWidth === document.documentElement.clientWidth`), and `labHash()` (builds the `#lab=` value the same way `lab.spec.ts:248-260` does).
  - Live-form cases use `test.skip(!builtWithEndpoint())`. A separate `describe('fallback')` uses `test.skip(builtWithEndpoint())`.
  - A `beforeEach` installs `page.route('**/api/contact', ...)` with a per-test responder and a `page.on('request')` collector. An `afterEach` asserts every `/api/contact` request was fulfilled by the mock. No `test.fail`.
  - Mocks match `submitContact` parsing (`lib/contact.ts:57-87`): success `200 {"reference":"MC-7Q4K"}` and `200 {}`; `daily_cap` `429 {"reason":"daily_cap"}`; `rate_limit` `429 {}`; `too_fast` `400 {"reason":"too_fast"}`; validation `400 {}`; server `500 {}`. Sending uses a responder that awaits a promise the test resolves.
  - Axe matrix: one parameterised case per state, title `contact state <state> passes axe at <width> <motion>`. States: idle, empty validation, focus-invalid, sending, success with reference, success without reference, daily_cap, rate_limit, too_fast, validation, server, `#lab=` prefill. Widths 1440 and 390. Motion `reduce` and `no-preference`. Each runs `AxeBuilder` with the `a11y.spec.ts` tag set and `noOverflow`.
  - Later tasks add their own named cases here.
  - `contact-budgets.spec.ts` (budgets project, serial). It copies `measureCls`, `observeWorstInteraction`, `CLS_MAX` and `INP_MAX_MS` from `budgets.spec.ts`. Cases:
    - "/contact/ has no layout shift under reduced motion at 1440" (CLS 0).
    - "/contact/ server layout matches the hydrated layout under reduced motion at 1440" (SSR `scrollHeight` equals hydrated, the pattern at `budgets.spec.ts:169-189`).
    - "/contact/#lab= CLS is under budget" (CLS below `CLS_MAX` on a fresh `#lab=` arrival; the strip and prefill arrive after hydration).
    - "INP on /contact/ while typing is under budget" (type 40 characters into `#message` and Tab through the fields at 1440; no scene required).
- Files: `tests/e2e/contact-states.spec.ts`, `tests/e2e/contact-budgets.spec.ts`.
- Tokens: none (colours read through `tokenColor`).
- Reduced motion: every axe state runs under both contexts.
- Validation: live-form build, then `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/contact-states.spec.ts -g "contact state"` and `pnpm -F web exec playwright test -c playwright.config.ts --project=budgets --no-deps tests/e2e/contact-budgets.spec.ts`.
- Reuse: page-specific.

Ruling: the INP case at M0 types without a scene; the beam variant is added by C2.4 after C2.1 exists (cost if wrong: M0 measures the form alone; the scene's input cost is measured only at M2).

#### C0.8 Inline link states [gap: links without hover, press or focus treatment]

- Target: the mailto anchor inside the status line (`ContactForm.tsx:45`, styled from an ancestor only), the aside email link (C1.2), the fallback display address and lab "email results" link (C1.10).
- What: new `src/components/ui/inline-link.ts` exports:
  - `inlineLink = 'rounded-sm text-accent underline decoration-1 underline-offset-4 motion-on:transition-colors motion-on:duration-(--duration-pointer) motion-on:ease-(--ease-pointer) hover:decoration-2 hover:text-accent-hover active:text-text'`.
  - `inlineLinkDescendant = '[&_a]:rounded-sm [&_a:hover]:decoration-2 [&_a:hover]:text-accent-hover [&_a:active]:text-text'`, for a wrapper whose anchors cannot be edited.
  - Focus stays the global accent outline; `rounded-sm` shapes it. Press changes colour, not transform, because inline anchors ignore transforms.
- Files: `src/components/ui/inline-link.ts`, `src/components/ui/inline-link.test.ts`.
- Tokens: `--color-accent`, `--color-accent-hover`, `--color-text`, `--radius-sm`, `--duration-pointer`, `--ease-pointer`.
- Reduced motion: colour changes are instant (transition behind `motion-on:`).
- Validation: `pnpm -F web test:run src/components/ui/inline-link.test.ts` (cases: both constants contain hover, active and decoration classes; no colour literal); the e2e anchor cases in C1.6 and C1.10.
- Coordination: yes (`components/ui/*`).
- Reuse: shared-primitive.

### M1: page-specific polish

#### C1.1 Form status hook [visual-form-status-data]

- Target: `<form>` (`ContactForm.tsx:137-143`).
- What: add `data-status={status}` (`idle | sending | sent | error`), `data-error={errorKind ?? undefined}` (the `ContactError` from the last failed result, held in new state), `aria-busy={status === 'sending'}` and the class `group/form`. Store `reference` from `result.reference` in state for C1.7. The status `p` and its text are unchanged. This is the only status attribute in the plan; the name `data-contact-status` is not used.
- Files: `src/components/contact/ContactForm.tsx`, `tests/e2e/contact-states.spec.ts` (case below).
- Tokens: none.
- Reduced motion: attributes only.
- Validation: `pnpm -F web test:run src/components/contact/ContactForm.test.tsx` (unmodified, passes); live-form build, `grep -q 'Send message' app/web/out/contact/index.html`; e2e "contact form exposes status" (success mock gives `data-status=sent`; server mock gives `data-status=error` and `data-error=server`).
- Coordination: yes (`components/contact/*`).
- Reuse: page-specific.

#### C1.2 Contact panel shell and aside [perf-a11y-form-panel-shell]

- Target: `page.tsx:17-26`; fallback root div (`ContactForm.tsx:67`); live form `max-w-xl` (`ContactForm.tsx:142`).
- What: new `src/components/contact/ContactPanel.tsx`, used by `page.tsx`:
  - `Section size="compact"` (L-M0.11) with `relative isolate`, and a `GlowField anchor="right"` (L-M0.12) behind the grid.
  - `Container` holding `div.grid gap-(--space-2xl) lg:grid-cols-[minmax(0,36rem)_1fr]`. Source order is panel, then aside, so the aside stacks under the form below `lg`.
  - Left cell: `relative isolate group rounded-xl border border-border bg-surface p-6 sm:p-8`. It holds `Spotlight size="panel" trigger="focus-within"` (L-M0.9 plus C0.3), an `aria-hidden` top edge `span[data-panel-edge][data-signal-sweep]` (L-M0.8 gradient, `absolute inset-x-6 top-0 h-px`, drawn and static here; C2.2 and C2.5 animate it), and the `ContactForm` child.
  - Right cell: `aside` with an h2 (`ui.contactAsideHeading`, draft "Other ways in") and a `dl`.
    - Email row: the address as a mailto link styled with `inlineLink` (C0.8) and a `CopyButton` (C0.6) labelled `ui.contactCopyEmail`.
    - Booking row: `BookingCta variant="link"` (C0.4). It renders only when `env.bookingUrl !== null`, because in the null-booking state it would be a second mailto next to the email row. It also hides with `group-has-[[data-lab-strip]]/panel:hidden` while the lab strip (C1.8) shows its own booking link.
    - Response-time row: renders only if the owner supplies `ui.contactResponsePromise`.
    - When `endpoint === null` the aside renders only its heading and a short `ui.contactAsideFallback` line, because the fallback panel shows the email and the booking CTA (C1.10).
  - `ContactForm` fallback root drops `rounded-xl border border-border bg-surface p-6` and becomes a plain `div`, so there is no card in a card. The live form drops `max-w-xl` (the grid column sets width).
  - `page.tsx` passes `size="lg"`, `eyebrow={{ index: '00', label: ui.contactEyebrowLabel }}` (draft "New project") and `imageClassName` (C1.11) to `PageHeader` (C0.2). The h1 text stays "Contact" (`routes.spec.ts:12`).
- Pure CSS grid; no JS sizing. CLS stays 0.
- Files: `src/app/contact/page.tsx`, `src/components/contact/ContactPanel.tsx`, `src/components/contact/ContactPanel.test.tsx`, `src/components/contact/ContactForm.tsx`, `src/content/ui.ts` (additive keys), `tests/e2e/contact-states.spec.ts` (cases below).
- Tokens: `--color-surface`, `--color-border`, `--color-brand`, `--color-glow-red`, `--color-accent`, `--color-base`, `--color-text`, `--color-muted`, `--radius-xl`, `--space-2xl`, `--duration-standard`, `--ease-pointer`.
- Reduced motion: Spotlight renders null; GlowField is static; the edge is static; layout identical.
- Validation:
  - `pnpm -F web test:run src/components/contact/ContactPanel.test.tsx src/components/contact/ContactForm.test.tsx`. Panel cases, with `env.bookingUrl` mocked: (a) live, booking URL set: one mailto link with the address and one "Book a call" link in the aside; (b) live, booking null: the aside has no booking row and exactly one mailto link; (c) fallback, either booking value: the aside has no email and no booking row.
  - Live-form build, `grep -q 'Send message' app/web/out/contact/index.html`.
  - `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/routes.spec.ts tests/e2e/a11y.spec.ts -g contact`.
  - `pnpm -F web exec playwright test -c playwright.config.ts --project=budgets --no-deps -g contact`.
  - e2e "390 panel stacks form before aside without overflow": at 390x844, the panel's bounding box bottom is above the aside's top, both span the container width within 1 px, and `noOverflow` holds after scrolling to the footer.
  - e2e "panel sits beside aside at 1440": at 1440x900, the aside's left edge is right of the panel's right edge.
- Depends on: L-M0.8, L-M0.9, L-M0.11, L-M0.12, C0.2, C0.3, C0.4, C0.6, C0.8.
- Coordination: yes (`components/contact/*`, `content/ui.ts`).
- Reuse: shared-primitive (the shell pattern) with a page-specific instance.

Ruling: the form stays in the left column under the H1 and lede axis (x=168) and the aside goes right (cost if wrong: the eye path is fine on desktop; on mobile the aside stacks below the form, which is the right order for conversion).

Ruling: no response-time promise ships until the owner gives the copy (cost if wrong: the aside is shorter; inventing a promise nobody maintains is worse).

Ruling: the aside booking CTA is the link variant and is omitted when `bookingUrl` is null or the lab strip shows (cost if wrong: booking is quieter; it stays in the header, the strip and the fallback, and the page never shows two mailto links side by side).

#### C1.3 Field system applied, chevron, staggered arrival [perf-a11y-field-variants, perf-a11y-select-system, perf-a11y-reveal-focus-safety stagger half]

- Target: the five field blocks (`ContactForm.tsx:151-240`).
- What: replace `FIELD` with `fieldVariants({ kind })` per element. Each field wrapper `div` gets `group`. Each label gets `motion-on:transition-colors motion-on:duration-(--duration-pointer) group-focus-within:text-accent`. The select sits in a `div.relative` with an `aria-hidden` inline SVG chevron: one `path`, `stroke="currentColor"`, `fill="none"`, classes `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted group-focus-within:text-accent motion-on:transition-transform motion-on:group-focus-within:rotate-180`. Replace the five independent `Reveal`s with one `Stagger`. It returns a fragment of `Reveal`s, so `space-y-5` still spaces them. Ids, names, labels and `aria-*` stay unchanged.
- Files: `src/components/contact/ContactForm.tsx`, `tests/e2e/contact-states.spec.ts` (cases below).
- Tokens: as C0.1, plus `--stagger-interval`, `--duration-standard`, `--ease-standard`.
- Reduced motion: no stagger (Reveal renders bare children), no chevron rotation, no label transition. Colour and border states still apply.
- Validation:
  - `pnpm -F web test:run src/components/contact/ContactForm.test.tsx src/components/motion/Stagger.test.tsx`.
  - e2e "budget select matches input height and has pointer cursor": `#budget` box height equals `#name`; computed cursor `'pointer'`.
  - e2e "invalid field shows brand border": submit empty; `#name` computed `borderColor` equals `tokenColor('--color-brand')`; focused `#email` with a bad value has `outlineColor` equal to `tokenColor('--color-brand')`.
  - e2e "chevron stays still under reduced motion": reduce context, focus `#budget`, the chevron's computed `transform` is `'none'` and `document.getAnimations().length === 0`.
  - `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/motion.spec.ts -g contact`.
- Depends on: C0.1, C0.5.
- Coordination: yes.
- Reuse: page-specific.

Ruling: keep the native select and style only the closed control (cost if wrong: the open list is OS-styled; a custom listbox would add JS and keyboard risk).

Ruling: the two-up field grouping (name with email, company with budget) from the rejected visual-reveal-stagger-fields is not planned (cost if wrong: the column stays five rows tall; it would need its own proposal and markup churn).

Ruling: no required-field marker is added; required fields stay unmarked and optional ones keep "(optional)" (cost if wrong: a user may not know which fields are required until submit; adding a marker means new label text or `aria-required`, both pinned by the backend session, and three of five fields are required, so marking the minority is the clearer convention).

#### C1.4 Focus the first invalid field and clear the sticky header [perf-a11y-invalid-focus-scroll]

- Target: validation branch (`ContactForm.tsx:104-111`).
- What: a `validationRun` counter increments when validation finds errors. A `useEffect` keyed on it calls `form.querySelector('[aria-invalid="true"]')?.focus({ preventScroll: false })`. `scroll-mt-24` from C0.1 makes the field clear the 4 rem sticky header. Error `p` elements get `motion-on:animate-[field-error_var(--duration-pointer)_var(--ease-pointer)_backwards]`. `@keyframes field-error` (opacity 0 and `translateY(calc(var(--space-xs) * -1))` to none) is defined in `globals.css`. Error space is not reserved.
- Lenis check: with Lenis active, run the e2e case below. Only if it fails because Lenis swallowed the scroll, add `useLenis()?.scrollTo(element, { offset: -96 })` after focus.
- Files: `src/components/contact/ContactForm.tsx`, `src/styles/globals.css`, `tests/e2e/contact-states.spec.ts` (case below).
- Tokens: `--duration-pointer`, `--ease-pointer`, `--color-brand`, `--space-xs`.
- Reduced motion: focus move and scroll margin apply; errors appear without animation.
- Validation: e2e "first invalid field takes focus below the header" in a no-preference context with Lenis active: click "Send message" empty, `expect(page.locator('#name')).toBeFocused()`, `#name` box top is greater than the header height (64 px). Also `pnpm -F web test:run src/components/contact/ContactForm.test.tsx`, and after a live-form build `grep -q 'Send message' app/web/out/contact/index.html`.
- Coordination: yes (`components/contact/*`, `globals.css`).
- Reuse: page-specific.

Ruling: error lines are not given reserved space (cost if wrong: each error pushes later fields down about 22 px; the shift follows a click, so CLS excludes it, and reserving three empty lines would add dead space to every idle form).

Ruling: the Lenis `scrollTo` fallback is added only if the e2e case fails with Lenis active (cost if wrong: one extra line later; adding it unconditionally would double-scroll when native focus scrolling already works).

#### C1.5 Busy state while sending [perf-a11y-sending-busy]

- Target: form and submit row while `status === 'sending'` (`ContactForm.tsx:247-251`).
- What: uses `data-status` and `aria-busy` from C1.1; no new attribute.
  - Inputs and textarea get `readOnly={status === 'sending'}` (keeps focus, unlike `disabled` or `inert`).
  - Fields de-emphasise with token colours, not opacity: `group-data-[status=sending]/form:border-border group-data-[status=sending]/form:text-muted` from `fieldVariants`.
  - The submit keeps `disabled` and the "Sending…" swap exactly as today. `disabled:opacity-100` is merged through `cn`, so it no longer greys out.
  - The submit row becomes `relative` with `cursor-progress` while sending. The disabled button has `pointer-events-none`, so the cursor goes on the row.
  - While sending only, an `aria-hidden` 2 px track (`bg-border`, `overflow-hidden`, `rounded-full`) under the button holds a child bar in `bg-accent`. The bar runs `motion-on:animate-[send-sweep_calc(var(--duration-standard)*4)_linear_infinite]` (`translateX(-100%)` to `translateX(100%)`, `animation-fill-mode: none`). Without the gate the bar is static and full width. The track unmounts when not sending.
  - Press scale and pointer cursor come from L-M0.7 on the Button base.
- Files: `src/components/contact/ContactForm.tsx`, `src/components/ui/field.ts`, `src/styles/globals.css`, `tests/e2e/contact-states.spec.ts` (cases below).
- Tokens: `--color-accent`, `--color-border`, `--color-muted`, `--duration-standard`.
- Reduced motion: no sweep; a static full-width accent bar; the label carries the state; no press scale.
- Validation:
  - e2e "sending state is busy and read-only" (held responder, no-preference): form `aria-busy="true"`; `#name` `toHaveJSProperty('readOnly', true)`; submit computed opacity `'1'`; after the responder resolves, `document.getAnimations().length === 0`.
  - e2e "sending bar is static under reduced motion" (held responder, reduce): the bar's computed `transform` is `'none'`, its width equals the track width, and `document.getAnimations().length === 0` while sending.
  - `pnpm -F web test:run src/components/contact/ContactForm.test.tsx src/components/ui/field.test.ts`.
  - After a live-form build, `grep -q 'Send message' app/web/out/contact/index.html`.
- Depends on: C1.1; L-M0.7 for press and cursor.
- Coordination: yes.
- Reuse: page-specific.

Ruling: the budget select is not made read-only, because `readOnly` is not valid on `select`; it de-emphasises with the rest (cost if wrong: a user can change budget during a sub-second send; the request was built from `FormData` before the await, so nothing is lost).

Ruling: sending fields switch to `text-muted` instead of the reviewed `opacity-60` (cost if wrong: a slightly weaker dim; partial-opacity text would fail the landing contrast rule over `--color-surface`).

#### C1.6 Tiered server-error treatment [visual-error-status-tiers]

- Target: the unchanged status `p` and its mailto anchor, through a new wrapper `div` and the form's `group/form` attributes.
- What: the `p` markup, class string and text stay as today. A new wrapper `div[data-status-wrap]` around it carries every style. Text colour reaches the `p` only through a child selector on the wrapper (`[&>p]:text-text`), because a colour class on a parent cannot override `.text-muted` set on the `p` itself.
  - `daily_cap` and `server`: callout on the wrapper, `group-data-[error=daily_cap]/form:border-l-2 group-data-[error=daily_cap]/form:border-brand group-data-[error=daily_cap]/form:bg-brand/5 group-data-[error=daily_cap]/form:py-3 group-data-[error=daily_cap]/form:pl-4 group-data-[error=daily_cap]/form:rounded-r-lg group-data-[error=daily_cap]/form:[&>p]:text-text`, and the same set for `server`. The mailto anchor inside then reads as the recovery path.
  - Anchor states for both: the wrapper carries `inlineLinkDescendant` from C0.8 (`[&_a:hover]:decoration-2 [&_a:hover]:text-accent-hover [&_a:active]:text-text [&_a]:rounded-sm`). The anchor class itself is not edited.
  - `rate_limit` and `too_fast`: a muted inline note with a `border-l-2 border-border-strong pl-4` wait rule. The `p` stays `text-muted`. No generated text, no eyebrow.
  - `validation`: `[&>p]:text-brand`, like field errors.
  - No submit shake.
- Files: `src/components/contact/ContactForm.tsx`, `tests/e2e/contact-states.spec.ts` (cases below).
- Tokens: `--color-brand`, `--color-text`, `--color-muted`, `--color-border-strong`, `--color-accent`, `--color-accent-hover`, `--radius-lg`.
- Reduced motion: static styling only.
- Validation:
  - e2e "server errors are tiered": for each mock, the status `p` text equals the `ui` string; wrapper computed `borderLeftColor` equals `tokenColor('--color-brand')` for `daily_cap` and `server` and `tokenColor('--color-border-strong')` for `rate_limit` and `too_fast`; the status `p` computed `color` equals `tokenColor('--color-text')` for `daily_cap` and `server`, `tokenColor('--color-muted')` for `rate_limit` and `too_fast`, and `tokenColor('--color-brand')` for `validation`; axe clean.
  - e2e "status mailto link has hover and press states": server mock, hover the anchor, computed `textDecorationThickness` is `'2px'` and `color` equals `tokenColor('--color-accent-hover')`; `mouse.down()` gives `color` equal to `tokenColor('--color-text')`.
  - e2e "390 server error callout keeps the mailto in view": at 390x844, server mock, the anchor's bounding box is inside the viewport width, and `noOverflow` holds.
  - `pnpm -F web test:run src/components/contact/ContactForm.test.tsx`.
- Depends on: C1.1, C0.8.
- Coordination: yes.
- Reuse: page-specific.

Ruling: no `::before` "Wait" text and no aria-hidden eyebrow (cost if wrong: wait states rely on rule colour and the sentence; generated content would be read into the live region and copy would bypass `content/ui.ts`).

#### C1.7 Success receipt [visual-success-receipt]

- Target: `status === 'sent'`.
- What:
  - Wrap the field stack and submit row in `div.grid` with `grid-rows-[1fr] group-data-[status=sent]/form:grid-rows-[0fr] motion-on:transition-[grid-template-rows] motion-on:duration-(--duration-scene) motion-on:ease-(--ease-route)` and an inner `overflow-hidden min-h-0`. Set `inert` on it when sent, plus `motion-reduce:hidden` when sent, so reduce hides it instantly.
  - The status `p` stays the live region, unchanged. The C1.6 wrapper lifts its colour with `group-data-[status=sent]/form:[&>p]:text-text`.
  - New `ContactReceipt({ reference: string | null; onReset: () => void })` renders after the status wrapper when sent:
    - An elevated sub-panel: `rounded-lg bg-elevated p-6 border border-border`, with a 2 px `bg-accent` top rule.
    - An h2 eyebrow (`font-mono text-xs uppercase tracking-widest text-muted`, `ui.contactReceiptHeading`, draft "Received", `tabIndex={-1}`) with a small `bg-brand` tick `span[data-receipt-tick]`.
    - The reference in `span[data-receipt-reference]`, `font-mono text-display-sm tracking-wide text-text break-all`.
    - `CopyButton` (C0.6) with `ui.contactReceiptCopy` ("Copy reference"), `ui.contactCopied` and `ui.contactCopyFailed`.
    - A ghost `Button` `ui.contactReceiptReset` ("Send another message") that calls `onReset`.
    - Without a reference: the heading plus a muted next-step line `ui.contactReceiptNext`.
  - After sent renders, focus moves to the receipt h2. Focus was on the disabled submit inside the now inert stack, so it would otherwise fall to body.
  - `onReset`: `form.reset()`, status `idle`, message `''`, reference `null`, then focus `#name`.
  - Success uses accent and elevated, never green.
- Files: `src/components/contact/ContactReceipt.tsx`, `src/components/contact/ContactReceipt.test.tsx`, `src/components/contact/ContactForm.tsx`, `src/content/ui.ts` (additive keys), `tests/e2e/contact-states.spec.ts` (cases below).
- Tokens: `--color-elevated`, `--color-accent`, `--color-brand`, `--color-text`, `--color-muted`, `--color-border`, `--font-mono`, `--text-display-sm`, `--radius-lg`, `--duration-scene`, `--ease-route`.
- Reduced motion: no collapse animation; fields hidden instantly (`inert` plus `motion-reduce:hidden`).
- Validation:
  - `pnpm -F web test:run src/components/contact/ContactReceipt.test.tsx src/components/contact/ContactForm.test.tsx` (receipt cases: renders reference; no-reference line; reset callback; heading is focusable).
  - e2e "success becomes a receipt": mock `{reference:'MC-7Q4K'}`; status `p` text equals `` `${ui.formSuccess} ${ui.formReference} MC-7Q4K.` ``; status `p` computed `color` equals `tokenColor('--color-text')`; receipt visible; `#name` not visible; receipt heading focused; axe clean in both motion modes.
  - e2e "send another restores an empty form": `#name` focused and empty.
  - e2e "390 receipt fits the panel": at 390x844 after the success mock, `[data-receipt-reference]` box right edge is inside the panel, the copy and reset buttons are visible, and `noOverflow` holds.
  - After a live-form build, `grep -q 'Send message' app/web/out/contact/index.html`.
- Depends on: C1.1, C1.6, C0.6.
- Coordination: yes. This is a behaviour change to the backend session's form (collapse after send); announce it explicitly.
- Reuse: page-specific.

Ruling: collapse the fields after success instead of only resetting them (cost if wrong: a user who wants to send a second message clicks "Send another message" once; the gain is no duplicate send and a legible receipt).

Ruling: focus goes to the receipt heading, not "Send another" (cost if wrong: one extra Tab to reset; the heading puts the reference next in reading order).

#### C1.8 Lab prefill strip [perf-a11y-cta-hierarchy, banner part]

- Target: prefill banner (`ContactForm.tsx:144-149`).
- What: the banner becomes a quiet strip with `data-lab-strip`: `flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-elevated border-l-2 border-accent px-4 py-3`. The text is unchanged (`contactLabCopy.added`). The CTA is `BookingCta variant="link" size="sm"` (C0.4). In the null-booking state that link is the "Email us directly" mailto, which keeps `ContactForm.test.tsx`'s `bookingLinks()` count at 1. C0.1's `field-sizing` fixes the textarea clip at 390.
- Files: `src/components/contact/ContactForm.tsx`, `tests/e2e/contact-states.spec.ts`, `tests/e2e/contact-budgets.spec.ts` (cases below).
- Tokens: `--color-elevated`, `--color-accent`, `--color-text`.
- Reduced motion: none.
- Validation:
  - e2e "lab prefill strip has one accent pill": open `/contact/#lab=<labHash()>` at 1440; among visible buttons and links, the count whose computed `backgroundColor` equals `tokenColor('--color-accent')` is 1 ("Send message").
  - e2e "fresh lab arrival shows an empty status": a new browser context, `goto('/contact/#lab=<labHash()>')`, the status `p` text is `''` and the form has `data-status="idle"`.
  - e2e "390 lab strip wraps and the prefilled message is not clipped": at 390x844, the strip's `scrollWidth` equals its `clientWidth`; `#message` `scrollHeight` is at most `clientHeight` plus 1 (Chromium supports `field-sizing`); `noOverflow` holds.
  - Budgets: "/contact/#lab= CLS is under budget" (C0.7).
  - `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/lab.spec.ts`; `pnpm -F web test:run src/components/contact/ContactForm.test.tsx`.
- Depends on: C0.1, C0.4, C0.7.
- Coordination: yes.
- Reuse: page-specific.

Ruling: the lab-arrival booking CTA drops from an accent pill to a link (cost if wrong: the warmest leads, who arrive with results, see booking less prominently; "Send message" with their results already filled is the stronger next step, and the link stays one Tab away).

#### C1.9 Message minimum-length hairline [perf-a11y-message-progress]

- Target: `#message` wrapper (`ContactForm.tsx:219-240`).
- What: export `MESSAGE_MIN = 10` from `lib/contact.ts` and use it in `validateContact` (`:40`). One shared `onInput` handler on the form (also used by C2.3) writes `--fill` = `min(1, trimmed message length / MESSAGE_MIN)` to the message wrapper with `style.setProperty`, no `setState`. Under the textarea sits an `aria-hidden` 2 px track with a bar: `origin-left scale-x-(--fill) bg-border-strong motion-on:transition-transform motion-on:duration-(--duration-pointer) motion-on:ease-(--ease-pointer)`. It turns `bg-accent` through a `data-met` attribute set by the same handler when `--fill` reaches 1.
- Files: `src/components/contact/ContactForm.tsx`, `src/lib/contact.ts`, `src/lib/contact.test.ts` (add a case only), `tests/e2e/contact-states.spec.ts` (cases below).
- Tokens: `--color-border-strong`, `--color-accent`, `--duration-pointer`, `--ease-pointer`.
- Reduced motion: the bar jumps; the transition class does not apply.
- Validation:
  - `pnpm -F web test:run src/lib/contact.test.ts src/components/contact/ContactForm.test.tsx` (new case: `MESSAGE_MIN` equals the boundary `validateContact` uses).
  - e2e "message hairline tracks the minimum": type 5 characters, wrapper `--fill` equals `'0.5'`.
  - e2e "message hairline jumps under reduced motion": reduce context, type 5 characters, the bar's computed `transitionDuration` is `'0s'` and `document.getAnimations().length === 0`.
- Coordination: yes (`lib/contact.ts` belongs to the backend session).
- Reuse: page-specific.

Ruling: ship the hairline although the taste reviewer called a 10-character meter trivial (cost if wrong: one small aria-hidden line that fills within a word; delete the bar and keep the `MESSAGE_MIN` export, which C2.3 also reads).

#### C1.10 Mailto fallback as a first-class panel state [perf-a11y-mailto-fallback-polish]

- Target: fallback branch (`ContactForm.tsx:65-85`), inside the C1.2 panel.
- What, in order:
  - `ui.contactNotLive` in `text-lg text-text`.
  - The address as a large mono mailto link: `inlineLink` (C0.8) plus `font-mono text-display-sm break-all`. Its accessible name stays the address, so the unit test's `/mccorlabs\.com/` link query still finds exactly one link.
  - `CopyButton` (C0.6) labelled `ui.contactCopyEmail` (draft "Copy address", never matching `/mccorlabs\.com/`).
  - `BookingCta` primary. With a booking URL it is "Book a call". In the null-booking state it is "Email us directly", a second mailto to the same address. That is dev-only (see Context), and both links are required by `ContactForm.test.tsx:21-31`.
  - With a prefill, the lab "email results" link styled with `inlineLink` instead of `Button variant="link"`.
  - The aside shows only its heading and fallback line in this state (C1.2).
- Files: `src/components/contact/ContactForm.tsx`, `src/content/ui.ts` (additive keys), `tests/e2e/contact-states.spec.ts` (fallback cases below).
- Tokens: `--font-mono`, `--text-display-sm`, `--color-text`, `--color-accent`, `--color-accent-hover`, `--color-surface`.
- Reduced motion: static.
- Validation:
  - `pnpm -F web test:run src/components/contact/ContactForm.test.tsx` (no-endpoint cases: one `/mccorlabs\.com/` link and one booking link; both hold).
  - Fallback build, then `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/contact.spec.ts tests/e2e/a11y.spec.ts tests/e2e/contact-states.spec.ts -g "contact|fallback"`.
  - e2e "fallback shows the address as the hero link": exactly one link whose name matches the address in the panel, one booking link, the copy button present; axe clean.
  - e2e "390 fallback email wraps without overflow": at 390x844, the address link's box is inside the panel, and `noOverflow` holds.
  - Capture `docs/ui-audits/contact/shots/desktop-normal-fallback.png` and `mobile-normal-fallback.png` from that build.
- Depends on: C1.2, C0.6, C0.8.
- Coordination: yes.
- Reuse: page-specific.

Ruling: the fallback keeps `BookingCta` as the one primary pill while the aside hides its email and booking rows (cost if wrong: in the dev-only null-booking state the panel shows two mailto links to one address, a pill and the large address; the unit tests require both, and hiding the aside rows keeps the page at two, not four).

#### C1.11 Phone hero crop shows the transmission [capture finding: 390 crop]

- Target: hero image at widths below `sm` on `/contact/` only.
- What: `page.tsx` passes `imageClassName="max-sm:object-[60%_50%]"` to `PageHeader` (C0.2). The starting value moves the crop left, so the orb sits right of centre and the head of the painted trail enters the frame at 390. Tune the first percentage by screenshot at 360, 390 and 430 until the orb is fully in frame and the trail is visible; record the final value here.
- Files: `src/app/contact/page.tsx`, `tests/e2e/contact-states.spec.ts` (case below).
- Tokens: none.
- Reduced motion: static image in both modes.
- Validation: e2e "390 hero crop shows orb and trail": at 390x844, `[data-testid=header-image]` computed `objectPosition` equals the recorded value; at 1440 it is `'100% 50%'` (unchanged). Manual: `shots/mobile-normal-section-01-after.png` shows orb and trail.
- Depends on: C0.2.
- Coordination: no (page file only).
- Reuse: page-specific (the `imageClassName` prop is shared).

Ruling: phones get a crop fix and the on-panel sent signature (C2.5), not WebGL (cost if wrong: the phone hero stays still; a mobile scene would add a WebGL context on a form page for an effect that scrolls away as soon as the user starts typing).

### M2: signature moments

#### C2.1 Live transmission beam over the hero [showcase-contact-beam-scene] (signature)

- Target: PageHeader image band on `/contact/`.
- What:
  - `PageHeader` gains `scene?: ReactNode`. Inside `Parallax`, the image and the scene share one inner `div.relative h-full` (the C2.2 scale target), so the beam rides the same parallax `y` as the painted trail. Routes that pass no scene render identical markup.
  - `ContactBeamScene` is built on `SceneRuntime`, lazy through `motionScene`, fallback `null` (the image stays the LCP and the fallback). One full-band quad with an additive fragment shader: a filament along a cubic bezier from behind the H1 to the orb, one travelling packet on a slow cadence (one pass per 6 s or slower, so it never pulls focus from the form), and a soft orb bloom breathing on a 4 s cycle. The pointer bends the control point by up to 4% of band width, eased with `easeVelocity`; `velocityRef` stretches the packet.
  - `contactBeamPath.ts`: pure functions mapping the orb and trail anchors to uv from the canvas aspect and the `object-cover object-right` crop.
  - Uniforms: `uColorBrand` (`--color-brand`), `uColorGlowRed` (`--color-glow-red`), `uColorAccent` (`--color-accent`), `uColorBase` (`--color-base`), all through `ctx.color`. Each pass scales the intensity or alpha of one uniform; no `mix()` between two colour uniforms.
  - Mounts only at `md` and up with a fine pointer (`useMediaQuery('(min-width: 768px)')` and `usePointerEffects()`). Phones keep the static image and no WebGL context. The canvas is `pointer-events-none`.
  - Pauses in place under L-M0.3; DPR steps down under L-M0.4.
  - Alignment gate: check the beam against the painted trail at 768, 1024 and 1440 crops. If it cannot align, drop the scene; do not ship a second, misaligned trail.
- Files: `src/components/effects/ContactBeamScene.tsx`, `src/components/effects/ContactBeamScene.test.tsx`, `src/components/effects/contactBeamPath.ts`, `src/components/effects/contactBeamPath.test.ts`, `src/components/sections/PageHeader.tsx`, `src/components/sections/PageHeader.test.tsx` (add cases only), `src/app/contact/page.tsx`, `tests/e2e/scene-lazy.spec.ts` (add a `/contact/` case).
- Tokens: `--color-brand`, `--color-glow-red`, `--color-accent`, `--color-base`.
- Reduced motion: `SceneRuntime` bails to the fallback before loading three (`SceneRuntime.tsx:120-123`). No canvas, no rAF, no three request. `motion.spec.ts` covers `/contact/`. Coarse pointer or below md: not mounted.
- Validation:
  - `pnpm -F web test:run src/components/effects/ContactBeamScene.test.tsx src/components/effects/contactBeamPath.test.ts src/components/sections/PageHeader.test.tsx` (no scene prop renders identical markup; anchors map into 0..1 for 768, 1024 and 1440 aspects).
  - Live-form build, then `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/motion.spec.ts tests/e2e/a11y.spec.ts tests/e2e/scene-lazy.spec.ts -g contact`. The scene-lazy case: `[data-scene-status=active]` after idle at 1440; a three request only after load; none at 390.
  - `pnpm -F web exec playwright test -c playwright.config.ts --project=budgets --no-deps -g contact`.
  - Manual: screenshots at 768, 1024 and 1440 show the beam on the painted trail.
- Depends on: L-M0.3, L-M0.4; C2.4 lands with it.
- Coordination: yes (`PageHeader.tsx` is shared by 8 routes; `scene-lazy.spec.ts` is shared with the landing plan).
- New deps: none.
- Reuse: page-specific (the `scene` slot is shared).

Ruling: ship the beam desktop-only (cost if wrong: phones keep a still hero; they also keep their battery and avoid a WebGL context on a form page).

Ruling: about 150 KB gzip of three loads lazily on /contact/, shared and cached from `/` (cost if wrong: first-visit desktop users fetch three after idle; LCP is untouched because the canvas is not an LCP candidate).

#### C2.2 Hero seam hands off to the panel edge [showcase-seam-to-panel-morph]

- Target: `[data-panel-edge]` from C1.2; PageHeader band image wrapper.
- What: CSS only, no JS per frame.
  - Under `@supports (animation-timeline: scroll())` and the `motion-on` gate, `[data-panel-edge]` scales `scaleX(0.08)` to `scaleX(1)` from centre on `animation-timeline: scroll(root)` with `animation-range: 0 40vh`.
  - The hero scrim fades toward `--color-base`, and the image-and-scene wrapper (C2.1's inner div, not the Parallax `m.div`) scales 1 to 1.04 on the same timeline.
  - The PageHeader part is opt-in through `data-handoff`, set only by `/contact/`.
- Files: `src/styles/globals.css`, `src/components/sections/PageHeader.tsx`, `src/components/contact/ContactPanel.tsx`, `tests/e2e/contact-states.spec.ts` (case below).
- Tokens: `--color-brand`, `--color-glow-red`, `--color-base`.
- Reduced motion: no timelines. The edge renders fully drawn and the hero stays static. Browsers without scroll timelines get the same.
- Validation:
  - `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/motion.spec.ts -g contact`.
  - `pnpm -F web exec playwright test -c playwright.config.ts --project=budgets --no-deps -g contact` (CLS 0 under reduce, SSR equals hydrated).
  - e2e "panel edge is drawn under reduced motion": reduce context, `[data-panel-edge]` computed `transform` is `'none'`.
  - Manual at 1440 and 390: scrolling 40vh draws the edge as the hero dims.
- Depends on: L-M0.0, L-M0.3, L-M0.8, C1.2, C2.1 (shares the wrapper; without C2.1 the wrapper still holds the image).
- Coordination: yes (`globals.css`, `PageHeader.tsx`).
- Reuse: shared-primitive (the `data-handoff` opt-in can serve the other 7 PageHeader routes).

Ruling: drive the edge from `scroll(root)` over the first 40vh instead of the proposed `view()` entry range (cost if wrong: a reader who never scrolls sees an 8% edge; with `view()` the edge was already in view at load at 1440x900, so the hand-off would never show, as the taste reviewer found).

#### C2.3 Form progress charges the beam [showcase-form-uplink] (signature)

- Target: `ContactForm` `onInput` and status writes; `ContactBeamScene` uniforms.
- What: `src/components/contact/contactSignal.ts` is a `subscribe` and `getSnapshot` store holding `{ charge: 0..1, phase: 'idle' | 'sending' | 'sent' | 'error' }`, with `reset()`.
  - The shared `onInput` from C1.9 computes `charge` from trimmed name, a valid-looking email and message length against `MESSAGE_MIN`.
  - Wherever `setStatus` runs, write `phase`.
  - `ContactForm` calls `reset()` on unmount, so a client navigation back to `/contact/` never shows a stale `sent`.
  - `ContactBeamScene` reads the store into refs (no React render per frame). `uCharge` lengthens the filament and brightens the packet. `sending` runs a faster packet loop. `sent` fires one orb flare (`uFlare` decays over `--duration-scene`, read with `readDurationSeconds`). `error` flickers the filament once by dropping accent intensity and raising brand intensity, each on its own uniform.
  - When `window.__contactSignal` exists (set by a spec through `addInitScript`), the store mirrors its snapshot there; otherwise nothing is exposed. Markup unchanged.
- Files: `src/components/contact/contactSignal.ts`, `src/components/contact/contactSignal.test.ts`, `src/components/contact/ContactForm.tsx`, `src/components/effects/ContactBeamScene.tsx`, `tests/e2e/contact-states.spec.ts` (case below).
- Tokens: `--color-accent`, `--color-brand`, `--color-glow-red`, `--duration-scene`.
- Reduced motion: the store updates but the scene never mounts, so nothing animates. The form's own UI (C1.5, C1.6, C1.7, C2.5) carries the meaning.
- Validation: `pnpm -F web test:run src/components/contact/contactSignal.test.ts src/components/contact/ContactForm.test.tsx` (store: charge math, reset, subscribe); e2e "contact signal reaches sent": `addInitScript` sets `window.__contactSignal = {}`, mock 200, fill and submit, expect `phase === 'sent'`.
- Depends on: C2.1, C1.9.
- Coordination: yes.
- Reuse: page-specific.

Ruling: ship the uplink last and cut it if C2.1 is dropped (cost if wrong: the taste reviewer is right that at 1440x900 the orb is off screen while the message field is in use and on mobile the hero is never visible; the visible payoff is the flare after scrolling up, and the cost is one store and one handler).

#### C2.4 Measured scene cost on /contact/ [showcase-contact-perf-gate]

- Target: beam scene frame cost and input latency with the scene active.
- What:
  - With L-M0.13 landed, extend `tests/e2e/scene-frame.spec.ts` with a `/contact/` pass at 1440. It logs p95 render and p95 rAF gap for the beam (log only, as L-M0.13 does).
  - Add to `contact-budgets.spec.ts`: "INP on /contact/ with the beam scene active is under budget". At 1440, wait for `[data-scene-status="active"]`, then type 40 characters into `#message` and Tab through the fields.
  - C2.1 does not merge until both have run and the numbers are written into this plan under Verification.
- Files: `tests/e2e/scene-frame.spec.ts`, `tests/e2e/contact-budgets.spec.ts`.
- Tokens: none.
- Reduced motion: the frame spec asserts zero active scenes under reduce.
- Validation: `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/scene-frame.spec.ts -g contact`; `pnpm -F web exec playwright test -c playwright.config.ts --project=budgets --no-deps tests/e2e/contact-budgets.spec.ts -g "INP on /contact/ with the beam scene active"`.
- Depends on: L-M0.13, C2.1.
- Coordination: yes (`scene-frame.spec.ts` comes from the landing plan).
- Reuse: page-specific.

Ruling: the frame-cost estimate (0.3 to 0.6 ms per frame on an M1) is a guess until C2.4 measures it (cost if wrong: if p95 render exceeds 4 ms or INP fails, drop the pointer bend first, then the scene).

#### C2.5 Sent signature on the panel [gap: on-panel send payoff] (signature)

- Target: `[data-panel-edge]` (C1.2), `[data-receipt-tick]` and `[data-receipt-reference]` (C1.7), when the form is `data-status="sent"`.
- What: one CSS-only moment, visible at every width because it lives on the panel the user is looking at.
  - Panel edge transmit: under the `motion-on` gate, `ContactPanel`'s left cell uses `has-[form[data-status=sent]]:` to run `@keyframes panel-transmit` on `[data-panel-edge]`. A bright head travels the edge left to right over `--duration-scene` with `--ease-route`: it animates `background-size` and `background-position` of the existing L-M0.8 gradient and the edge's `opacity` from 0.4 to 1. Fill mode `backwards`, one iteration.
  - Receipt tick draws: `[data-receipt-tick]` runs `scaleX(0)` to `scaleX(1)` from the left over `--duration-standard`, delayed by `--duration-scene` so it follows the edge. Fill `backwards`.
  - Reference rises: `[data-receipt-reference]` runs opacity 0 and `translateY(var(--space-xs))` to none over `--duration-standard`, delayed by `--duration-scene` plus `--stagger-interval`. Fill `backwards`.
  - End state is the static state: edge drawn, tick full, reference in place. Nothing loops.
  - The keyframes and selectors live in `globals.css` under the `motion-on` gate.
- Files: `src/styles/globals.css`, `src/components/contact/ContactPanel.tsx`, `src/components/contact/ContactReceipt.tsx`, `tests/e2e/contact-states.spec.ts` (cases below).
- Tokens: `--color-brand`, `--color-glow-red`, `--color-accent`, `--duration-scene`, `--duration-standard`, `--stagger-interval`, `--ease-route`, `--space-xs`.
- Reduced motion and paused: no keyframes apply. The receipt appears with the edge drawn, the tick full and the reference in place.
- Validation:
  - e2e "sent signature plays once and settles": no-preference at 1440, success mock; `document.getAnimations()` includes an animation whose `animationName` is `panel-transmit`; `expect.poll` until `document.getAnimations().length === 0`; then `[data-panel-edge]` computed `opacity` is `'1'`.
  - e2e "390 sent signature plays on the panel": same at 390x844, with the edge inside the viewport when it plays.
  - e2e "sent signature is static under reduced motion": reduce context, success mock, `document.getAnimations().length === 0` right after the receipt appears, and the tick computed `transform` is `'none'`.
  - `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/motion.spec.ts -g contact`.
- Depends on: C1.2, C1.7, L-M0.0, L-M0.8.
- Coordination: yes (`globals.css`, `components/contact/*`).
- Reuse: page-specific.

Ruling: the send payoff lives on the panel, not only in the hero (cost if wrong: one more short animation at the conversion moment; without it, the only celebration was the C2.3 orb flare, which is off screen at 1440x900 while the form is in use and never visible on phones).

### M3: full verification

See Verification. M3 runs every step there on both builds.

## Shared primitives

| Primitive                                                                 | API sketch                                                                                                                                        | Other adopters                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `fieldVariants` (`ui/field.ts`)                                           | `fieldVariants({ kind: 'input' \| 'select' \| 'textarea' }): string`                                                                              | Lab `RaceInputs`, `WorkflowBuilder`, any future form                      |
| `inlineLink`, `inlineLinkDescendant` (`ui/inline-link.ts`, C0.8)          | Two class-string constants: one for an anchor, one for a wrapper whose descendant anchors it styles                                               | Footer mail link, legal pages, lab result links                           |
| `Eyebrow` (`ui/eyebrow.tsx`)                                              | `Eyebrow({ index: string; label: string; className?: string })`                                                                                   | `SectionHeading` (L-M0.11), every PageHeader route                        |
| `PageHeader` `size`, `eyebrow`, `imageClassName`, `scene`, `data-handoff` | `PageHeader({ title, description, image?, video?, size?: 'md' \| 'lg', eyebrow?: { index; label }, imageClassName?: string, scene?: ReactNode })` | about, careers, services, work, process, lab/evals, lab/should-this-be-ai |
| `Spotlight` `trigger`                                                     | `Spotlight({ size?: 'card' \| 'panel'; trigger?: 'hover' \| 'focus-within' })`                                                                    | Any panel holding inputs; CTA panel                                       |
| `BookingCta` `variant`                                                    | `BookingCta({ size?, variant?: 'primary' \| 'link' })`                                                                                            | not-found, CtaBlock where a second CTA competes                           |
| `UNDERLINE` current-link hover                                            | `aria-[current=page]:hover:after:h-0.5` in the shared constant                                                                                    | Every route's current nav link                                            |
| `CopyButton` (`ui/copy-button.tsx`)                                       | `CopyButton({ value; label; copiedLabel; failedLabel })`                                                                                          | Lab result references, code snippets                                      |
| Reveal focus guard (CSS)                                                  | `[data-reveal]:focus-within` rule                                                                                                                 | Every Reveal site                                                         |
| `ContactPanel` shell pattern                                              | `ContactPanel({ endpoint: string \| null; children })`                                                                                            | Careers application, lab feedback if they get forms                       |

## New deps needing owner approval

None. `class-variance-authority` (already a dependency, `app/web/package.json:21`), `three`, `motion` and `lenis` cover every task.

## Coordination

Session `add-team-portraits-tint` owns the contact backend. Before landing any task that touches these paths, run `ListAgents`, then `SendMessage` to that session with the files and the change:

- `app/web/src/styles/globals.css` (C0.5, C1.4, C1.5, C2.2, C2.5)
- `app/web/src/components/motion/*` (C0.3)
- `app/web/src/components/ui/*` (C0.1, C0.2, C0.6, C0.8, C1.5)
- `app/web/src/components/contact/*` (C1.1 to C1.10, C2.2, C2.3, C2.5)
- `app/web/src/content/*.ts` (C1.2, C1.7, C1.10: additive `ui.ts` keys only)
- `app/web/src/lib/contact.ts` (C1.9: export `MESSAGE_MIN`)
- `app/web/src/components/sections/PageHeader.tsx` (C0.2, C2.1, C2.2: shared by 8 routes, also named by the landing plan)
- `app/web/src/components/layout/BookingCta.tsx`, `Header.tsx`, `underline.ts` (C0.4: also edited by L-M0.3 and L-M0.7)
- `app/web/tests/e2e/scene-lazy.spec.ts`, `scene-frame.spec.ts` (C2.1, C2.4: shared with the landing plan)

`ContactForm.test.tsx` is not edited by any task. If an executor finds it must be, stop and send a Coordination message first.

Draft `ui.ts` keys (owner may change copy): `contactEyebrowLabel` "New project", `contactAsideHeading` "Other ways in", `contactAsideFallback` "The details are in the panel.", `contactAsideBook` "Book a call", `contactAsideEmail` "Email", `contactReceiptHeading` "Received", `contactReceiptCopy` "Copy reference", `contactReceiptReset` "Send another message", `contactReceiptNext` "We will reply by email.", `contactCopyEmail` "Copy address", `contactCopied` "Copied", `contactCopyFailed` "Copy failed. Select the text and copy it by hand." `contactResponsePromise` is owner-supplied; the row is hidden until it exists.

## Rejected

| Id                               | Title                                          | Reason                                                                                                                                                                                                             |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| motion-transmission-sequence     | Transmission: send, carry, land                | Duplicate of perf-a11y-sending-busy, visual-success-receipt and L-M0.7; bundles three states into one L task; its arbitrary-variant selector is invalid; collapsing the stack that holds focus drops focus to body |
| motion-terminus-signal-scene     | Living terminus shader orb                     | Duplicate of showcase-contact-beam-scene plus showcase-form-uplink, which split scene and store more cleanly; a window CustomEvent bus has no reset on unmount                                                     |
| motion-console-panel-spotlight   | Console panel with cursor light and focus glow | Duplicate of perf-a11y-form-panel-shell; relied on a Spotlight API that L-M0.9 does not define; backdrop-blur adds a layer for no gain                                                                             |
| motion-field-states              | Field hover, focus, typing and filled states   | Duplicate of perf-a11y-field-variants; self-contradictory spec; per-keystroke DOM writes where CSS suffices                                                                                                        |
| motion-invalid-feedback          | Invalid fields with nudge                      | Duplicate of perf-a11y-field-variants and perf-a11y-invalid-focus-scroll; the shake adds vestibular motion and no signal                                                                                           |
| motion-status-tiers              | Status line tiers with cool-down               | Duplicate of visual-error-status-tiers and visual-success-receipt; keying a wrapper remounts the live region; invented 60 s window                                                                                 |
| motion-hero-scroll-handoff       | Hero to form scroll handoff                    | Duplicate of showcase-seam-to-panel-morph; the H1 mask reveal would not play on an in-view element; short page gives no runway                                                                                     |
| motion-channel-aside             | Channel aside with ambient status              | Duplicate of the aside in perf-a11y-form-panel-shell; infinite breathing dot needs a pause control; response-time copy unknown                                                                                     |
| motion-budget-select             | Budget select on-system                        | Duplicate of perf-a11y-select-system; chevron technique self-contradictory                                                                                                                                         |
| motion-message-length-meter      | Message readiness meter                        | Duplicate of perf-a11y-message-progress; glint is noise                                                                                                                                                            |
| motion-lab-results-attached      | Lab prefill attached strip                     | Duplicate of perf-a11y-cta-hierarchy and the field-sizing fix; mask reveal on a post-hydration strip adds motion without function                                                                                  |
| motion-fallback-channel-card     | Mailto fallback console panel                  | Duplicate of perf-a11y-mailto-fallback-polish; stagger on a static card has no purpose                                                                                                                             |
| motion-contact-arrival           | Arrival choreography for fields                | Duplicate of perf-a11y-reveal-focus-safety; its wrapper-div risk claim is wrong                                                                                                                                    |
| visual-contact-split-stage       | Two-column stage with brief rail               | Duplicate of perf-a11y-form-panel-shell; unconditional sticky rail breaks motion.spec under reduce; moves the form off the H1 axis                                                                                 |
| visual-form-panel-shell          | Glass FormPanel with gradient hairline         | Duplicate of perf-a11y-form-panel-shell; backdrop-blur and mask-composite ring add cost; activeElement rect reads add layout work                                                                                  |
| visual-field-system              | Field system with label tint and filled states | Duplicate of perf-a11y-field-variants; `border-strong/60` on `base/60` fails 3:1 non-text contrast; `:valid` tick shows on empty fields                                                                            |
| visual-select-on-system          | Budget select with CSS chevron                 | Duplicate of perf-a11y-select-system; `h-12` diverges from `h-11`                                                                                                                                                  |
| visual-invalid-state             | Invalid fields own the error                   | Duplicate of perf-a11y-field-variants and perf-a11y-invalid-focus-scroll                                                                                                                                           |
| visual-transmit-sweep            | Perimeter signal while sending                 | Duplicate of perf-a11y-sending-busy; conic `@property` spin repaints every frame; a sub-second state shows as flicker; invalid CSS as written                                                                      |
| visual-lab-results-strip         | Lab prefill strip, one accent                  | Duplicate of perf-a11y-cta-hierarchy; secondary BookingCta keeps Magnetic                                                                                                                                          |
| visual-terminus-orb-listens      | Orb answers form focus and scroll              | Duplicate of showcase-contact-beam-scene and showcase-form-uplink; blend glow tied to crop-dependent image coordinates                                                                                             |
| visual-reveal-stagger-fields     | Fields arrive as one staggered sequence        | Duplicate of perf-a11y-reveal-focus-safety; its two-up grouping is separate markup churn (see Ruling in C1.3)                                                                                                      |
| visual-contact-seam-glow         | Seam and ambient glow placement                | Duplicate of showcase-seam-to-panel-morph and the GlowField in perf-a11y-form-panel-shell; a second seam adds noise                                                                                                |
| perf-a11y-status-receipt         | Status receipt around the live region          | Duplicate of visual-success-receipt and visual-error-status-tiers; `form.reset()` alone leaves "Send message" armed                                                                                                |
| perf-a11y-hero-ember-scene       | Hero ember trail overlay                       | Duplicate of showcase-contact-beam-scene; a 600-point spline is more fragile to crop than a single-quad shader                                                                                                     |
| showcase-form-console-panel      | Transmission console with cursor-lit panel     | Duplicate of perf-a11y-form-panel-shell; dot grid is noise and needs Spotlight vars it does not expose                                                                                                             |
| showcase-field-ignite            | Field ignition                                 | Duplicate of perf-a11y-field-variants, perf-a11y-select-system and perf-a11y-invalid-focus-scroll; three focus signals at once; `calc`-less CSS is invalid; `:user-valid` ticks blank optional fields              |
| showcase-submit-transmit         | Submit press and scanning state                | Duplicate of perf-a11y-sending-busy; mixes two tokens into a new colour (forbidden); second attribute name                                                                                                         |
| showcase-status-receipt          | Receipt with decoding reference                | Duplicate of visual-success-receipt; glyph decode hurts legibility; disabling fields loses focus                                                                                                                   |
| showcase-lab-payload-dock        | Lab results dock                               | Duplicate of perf-a11y-cta-hierarchy; rows from prefill cause a post-hydration shift; connector is decorative                                                                                                      |
| showcase-mailto-fallback-console | Fallback direct-line console                   | Duplicate of perf-a11y-mailto-fallback-polish; depends on uplink charge for no user value                                                                                                                          |
| showcase-contact-hero-type       | Hero title mask-rise                           | Duplicate of visual-pageheader-eyebrow-scale; on-load reveal needs a new Reveal contract and risks an SSR-hidden h1                                                                                                |
| showcase-contact-perf-gate       | Perf and reduced-motion gates                  | Reduce-list part duplicates perf-a11y-contact-state-gates; its INP-with-scene case is folded into C2.4                                                                                                             |

## Verification

Run from the repo root after each milestone, and in full for M3. Every e2e step needs the named build in `app/web/out` first.

1. Types: `pnpm -F web exec tsc --noEmit`.
2. Lint: `pnpm -F web lint`.
3. Unit: `pnpm -F web test:run`. `src/components/contact/ContactForm.test.tsx` passes unmodified.
4. Live-form build: `NEXT_PUBLIC_BOOKING_URL=${NEXT_PUBLIC_BOOKING_URL:-https://booking.invalid/call} NEXT_PUBLIC_CONTACT_ENDPOINT=/api/contact pnpm build:raw`, then `grep -q 'Send message' app/web/out/contact/index.html`, then `pnpm -F web test:e2e`.
5. Budgets: `pnpm -F web exec playwright test -c playwright.config.ts --project=budgets --no-deps` (runs `budgets.spec.ts` and `contact-budgets.spec.ts`).
6. Accessibility, both widths: `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/a11y.spec.ts tests/e2e/contact-states.spec.ts`. The `contact state ... passes axe` matrix covers 1440 and 390 in both motion modes.
7. Phone width: `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/contact-states.spec.ts -g "390 "` runs every `390 ` case (panel stacking, error callout, receipt, lab strip, mobile menu, field reveal, hero crop, sent signature), each with `noOverflow`.
8. Fallback build: `env -u NEXT_PUBLIC_CONTACT_ENDPOINT NEXT_PUBLIC_BOOKING_URL=${NEXT_PUBLIC_BOOKING_URL:-https://booking.invalid/call} pnpm build:raw`, then `pnpm -F web exec playwright test -c playwright.config.ts --project=chromium tests/e2e/contact.spec.ts tests/e2e/a11y.spec.ts tests/e2e/contact-states.spec.ts -g "contact|fallback"`.
9. No live POST: the `contact-states.spec.ts` `afterEach` collector reports zero unmocked `/api/contact` requests.
10. No colour literals in new or changed source files. Both commands print nothing:
    - `grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(' app/web/src/components/contact app/web/src/app/contact app/web/src/components/ui/field.ts app/web/src/components/ui/eyebrow.tsx app/web/src/components/ui/copy-button.tsx app/web/src/components/ui/inline-link.ts app/web/src/components/ui/section-heading.tsx app/web/src/components/effects/ContactBeamScene.tsx app/web/src/components/effects/contactBeamPath.ts app/web/src/components/sections/PageHeader.tsx app/web/src/components/motion/Spotlight.tsx app/web/src/components/layout/BookingCta.tsx app/web/src/components/layout/Header.tsx app/web/src/components/layout/underline.ts app/web/tests/e2e/contact-states.spec.ts app/web/tests/e2e/contact-budgets.spec.ts`
    - `awk '/^@theme/{f=1} f&&/^}/{f=0;next} !f' app/web/src/styles/globals.css | grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\('` (the `@theme` block is the only place literals live).
11. No comments in new or changed files, including trailing comments and GLSL inside template strings. This prints nothing: `grep -rnE '(^|[^:])//|/\*|<!--' <the step 10 paths> app/web/src/styles/globals.css | grep -vE 'eslint-disable|@vitest-environment'`. The `[^:]` guard skips `https://` URLs.
12. Manual at 1440 and 390, normal and reduced motion, with `pnpm -F web dev` (the null-booking state): every state from Capture findings, compared with its screenshot. Check the null-booking aside (no booking row) and the fallback (pill plus address). Check live and report without fixing unless real: the y=900 tone step (grain layer) and the footer top edge colour (red versus grey).
13. Scene numbers from C2.4 recorded here: p95 render ms, p95 rAF gap ms, INP ms on /contact/ with the beam active.

## Implementation rulings (2026-10-14)

Ruling: C1.3 field wrappers use the named `group/field`, because the panel cell is an unnamed `group` (cost if wrong: none; unnamed would light every label at once).
Ruling: C1.4 no Lenis `scrollTo` fallback; native focus scrolling passes with Lenis active (cost if wrong: one line later).
Ruling: C1.5 the submit keeps `aria-disabled` and overrides its opacity and cursor only while sending (cost if wrong: none).
Ruling: C1.6 status variants escape underscores with `String.raw` and the inline link adds `hover:active` so press wins over hover (cost if wrong: none).
Ruling: C1.7 per owner, a sent form has no reset; it collapses to a receipt plus an aria-hidden "Message sent" toast, focus moves to the receipt heading, and the backend session's focus tests were rewritten to match (cost if wrong: a second message needs a reload).
Ruling: C1.7 CopyButton gains `announce` so the receipt's copy button adds no second status region (cost if wrong: one prop).
Ruling: C1.10 the fallback address is `text-xl` below `sm` so it does not break mid-word at 390 (cost if wrong: a smaller address on phones).
Ruling: C1.11 the phone crop is `max-sm:object-[70%_50%]`; 60% cut the orb at 390 (cost if wrong: one value).
Ruling: C2.1 the beam drops `uColorBase` and blends with screen, and mounts on a combined media query instead of `usePointerEffects` so it pauses in place (cost if wrong: a darkening pass would need a new blend mode).
Ruling: C2.1 SceneRuntime starts scenes from `requestIdleCallback` with a 2000 ms timeout (cost if wrong: a scene may start during light activity instead of never).
Ruling: C2.3 charge counts the email through `validateContact` and the flare fires on the next rendered frame (cost if wrong: charge follows the email rule; an off-screen flare waits for scroll-up).
Ruling: C2.5 the sent signature uses a `:has()` selector on `[data-panel-cell]` for specificity over the C2.2 scroll animation (cost if wrong: none).

Verification note (C2.4, 2026-10-14): beam p95 render 0.1 to 0.2 ms, p95 rAF gap 25 ms in headless Chromium; INP with the beam active 56 to 64 ms in 7 of 8 runs, one 288 ms spike under investigation.
