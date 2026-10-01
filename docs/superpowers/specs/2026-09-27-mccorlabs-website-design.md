# McCor Labs marketing website — design

Date: 2026-09-27 (revised after adversarial review)
Status: revised, awaiting review · visual and motion sections PROVISIONAL pending reference corpus
Domain: mccorlabs.com · Hosting: existing S3 + CloudFront (`infra/modules/static_site/`)
Delivery: four phases, one implementation plan each

---

## Purpose

McCor Labs is a 3–5 person development firm that builds websites and applications
for clients. The firm has no website. This spec defines one.

The site's job is to convert a stranger into a booked call. Everything else —
the animation, the imagery, the copy — serves that outcome or it does not belong.

A development firm's own website is its portfolio. A visitor judges the firm by
the artifact in front of them before reading a word of it. This raises the bar
twice: the site must look extraordinary, and it must _be_ extraordinary
underneath — fast, accessible, correctly built. A beautiful site that janks on
scroll or fails an audit actively costs the firm work, because the people
qualified to notice are the people with budgets.

## Success criteria

1. A visitor understands what the firm does within five seconds of landing, and
   can reach the booking flow in one click from any page.
2. 60fps scroll on a 2019-era laptop and a mid-range Android phone. Core Web
   Vitals pass on 4G: LCP < 2.5s, INP < 200ms, CLS < 0.1.
3. Lighthouse ≥ 95 on Performance, Accessibility, Best Practices and SEO on every
   route, measured against the production build.
4. Every interactive element is keyboard reachable with a visible focus
   indicator, and the site stays usable and legible under
   `prefers-reduced-motion: reduce`.
5. Adding a service, team member or process step means editing one typed content
   file, with no component changes.
6. A new developer clones the repo and has the site running with two commands.
7. Each of the ten routes serves its own content at its own URL with the correct
   HTTP status — including a real 404. (See _CloudFront handoff_; this is not
   true of the current infrastructure.)

## Constraints

1. **`infra/` is off limits.** No file under `infra/` may be created, edited or
   deleted by the implementing agent. Reading it to understand behaviour is
   permitted. Where the site needs infrastructure change, this spec defines the
   contract and hands it to the owner.
2. **TypeScript only.** No `.js`/`.jsx` in application source.
3. **pnpm.** Not npm, not yarn, not bun.
4. **Static export** to the existing bucket and distribution. No new hosting
   service, no second bill, no DNS change.
5. **KISS, scalable by addition.** Growth happens by adding a file, not
   rewriting one.
6. **Every effect degrades.** No effect may be load-bearing for comprehension.
7. **Accessibility is not a later pass.** Contrast is measured here, not
   asserted.

## What v1 is, and is not

**v1 is** ten static routes, a booking link, a contact form posting to an
owner-provisioned endpoint, a typed content layer, one signature visual moment
per page, and a documented build/deploy path.

**v1 is not** a blog, CMS, per-project case studies, light mode, analytics,
i18n, or a client portal. Each is recorded in `FUTURE-NOTES.md` with its
reasoning and the cost of adopting it later. `/work` ships as a designed teaser,
because the firm has no showable, permissioned client work yet.

---

## Phases

The review of this spec's first draft found it too large for a single
implementation plan. It is delivered as four, each with its own plan, its own
review and its own definition of done.

**Phases 2 and 3 keep the full scope agreed here.** The revision gate permits
changing _provisional visual values_ — type scale, durations, easings, which
effect lands where — from measured corpus data. It is not licence to drop a
feature. The four effects, the intro overlay, the audio system, the ten routes
and the media pipeline are all in scope regardless of what the corpus shows.

| Phase                     | Scope                                                                                                                                                                      | Blocked by                                                       | Plan                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| **1 — Foundation**        | Workspace, tooling, hooks, tokens, layout shell, ten routes as working skeletons, sitemap/robots, contact form client against a mock, production build verified locally.   | Nothing. **Can start immediately.**                              | `2026-09-27-mccorlabs-website-phase-1-foundation.md` |
| **2 — Content and pages** | Real copy, all page sections, typed content layer populated, media planned/sourced/integrated, accessibility and budget tests green.                                       | Reference corpus; media skills; owner answers to open questions. | `...-phase-2-content.md`                             |
| **3 — Signature moments** | The four effects, tiered, each with its fallback. Intro overlay. Audio system.                                                                                             | Phase 2; corpus.                                                 | `...-phase-3-moments.md`                             |
| **4 — Launch**            | CloudFront handoff implemented by the owner, then deploy verification against a preview environment, real-device checks, Lighthouse on production, content TODOs resolved. | Phases 1–3 complete and running locally.                         | `...-phase-4-launch.md`                              |

Phase 1 deliberately contains everything that does not depend on the reference
corpus or on the owner's content answers. It is the phase that proves the
architecture — including that a route other than `/` actually resolves in
production, which the current infrastructure does not allow.

**Phase 1 definition of done, local only:** `pnpm verify` passes; `pnpm build`
produces `app/web/out/` containing a separate `index.html` for all ten routes
plus `404.html`; the Playwright suite passes against the exported build served
locally; hooks demonstrably block a bad push. Nothing is deployed in phase 1.

**Phase 4 definition of done:** the CloudFront handoff has landed; every route
resolves to its own content on a real preview environment; a nonexistent URL
returns HTTP 404; Lighthouse ≥ 95 on all four categories measured against the
deployed site; `CONTENT-TODO.md` is empty.

**The deferred-deploy risk, stated deliberately.** The owner implements the
CloudFront change after phases 1–3 are complete and running locally. This is a
legitimate sequencing choice, but it means the deploy path is unverified until
the end, and route resolution and 404 status are the two things that cannot be
proven locally at all — a local static file server resolves directory indexes
automatically, which CloudFront with a plain S3 origin does not. Consequences
that phases 1–3 must respect: no phase before 4 may claim the site "works"
without qualifying it as "builds and passes locally"; the Playwright suite's
route assertions are necessary but not sufficient; and phase 4 must run against
a preview `ENV_ID` environment before production, never straight to
production.

---

## PROVISIONAL STATUS — read before implementing

A parallel effort is capturing ten reference websites into `docs/ui-references/`
as a measured corpus: screenshots at four viewports, scroll-frame sequences with
measured positions, page-transition frames, computed-style extraction and
per-site stack notes. Its spec is
`docs/superpowers/specs/2026-09-27-ui-reference-corpus-design.md`.

**As of this document's date only the recon pass has landed**
(`docs/ui-references/_recon/<slug>.json`, ten files). No capture directories
exist.

| #   | slug            | origin                      | tier |
| --- | --------------- | --------------------------- | ---- |
| 1   | `david-hckh`    | https://david-hckh.com      | 1    |
| 2   | `pacomepertant` | https://pacomepertant.com   | 1    |
| 3   | `topology-vc`   | https://www.topology.vc     | 1    |
| 4   | `belenjones`    | https://www.belenjones.com  | 1    |
| 5   | `squadeasy`     | https://www.squadeasy.com   | 2    |
| 6   | `y-n10`         | https://y-n10.com           | 2    |
| 7   | `shopify`       | https://www.shopify.com     | 2    |
| 8   | `raggededge`    | https://raggededge.com      | 3    |
| 9   | `guglieri`      | https://guglieri.com        | 3    |
| 10  | `helloshivam`   | https://www.helloshivam.com | 3    |

### What is final and what is not

| Section                                                | Status           |
| ------------------------------------------------------ | ---------------- |
| Purpose, criteria, constraints, phases                 | FINAL            |
| Architecture, repository layout, CloudFront handoff    | FINAL            |
| Technology decisions and versions                      | FINAL            |
| Colour tokens and contrast                             | FINAL — measured |
| Motion architecture and reduced-motion rules           | FINAL            |
| Tooling, testing, budgets, deploy, contact contract    | FINAL            |
| Type scale, spacing, radii                             | PROVISIONAL      |
| Motion values — durations, easings, stagger            | PROVISIONAL      |
| Which effect lands on which page, and its choreography | PROVISIONAL      |
| Media plan and imagery direction                       | PROVISIONAL      |

### Revision gate — mandatory, blocks phases 2 and 3

Phase 1 needs none of this and proceeds regardless. Before any phase-2 or
phase-3 work:

1. Confirm `docs/ui-references/<slug>/` exists with captures for at least the
   four tier-1 sites. **If not, STOP and report to the owner.** Do not proceed on
   the placeholder values. Do not invent measurements and attribute them to the
   reference sites.
2. Run the `design-director` skill over the corpus: read
   `<slug>/design-system.json` and `<slug>/extract.<viewport>.json` for measured
   type scales, spacing rhythms, easing curves and durations; read
   `<slug>/notes.md` and `<slug>/tech-stack.md`; inspect
   `<slug>/scroll/NN-y<position>.desktop.jpg` sequences for scroll choreography
   and `<slug>/transitions/NN-<from>-to-<to>/` for page transitions.
3. Produce a direction document naming, with measured values: type scale, motion
   language, composition system, and **what is deliberately not taken from the
   references.**
4. Update the PROVISIONAL sections here from that document and re-submit to the
   owner before implementing.

Copying a reference site is failure. The corpus grounds decisions in measurement
instead of taste; the firm's site must be its own thing.

---

## CloudFront handoff — OWNER-IMPLEMENTED, BLOCKS PHASE 1 COMPLETION

The existing `static_site` module was written for a single-page app and will
serve this site incorrectly. The implementing agent must not fix it — `infra/` is
off limits. This section is the contract.

### The problem, precisely

`infra/modules/static_site/main.tf` currently has:

- `default_root_object = "index.html"` (line 42) — handles `/` only.
- No `aws_cloudfront_function`, no Lambda@Edge, no `function_association`, no
  `ordered_cache_behavior`.
- The bucket is a plain bucket behind Origin Access Control, **not** an S3
  website endpoint. Plain buckets do not resolve a directory path to
  `index.html`; only website-hosting mode does that.
- And this (lines 63–68):

```hcl
custom_error_response {
  error_code            = 403
  response_code         = 200
  response_page_path    = "/index.html"
  error_caching_min_ttl = 10
}
```

Consequences for a statically exported multi-page site:

1. A request for `/services/` asks S3 for a key that does not exist. OAC buckets
   return **403**. CloudFront converts that to **200 serving `/index.html`** — so
   the visitor sees the _home page_ at `/services/`. Nine of ten routes break
   this way, silently, with no error anywhere.
2. Every genuinely missing URL also returns 200 with the home page — a soft 404.
   Search engines treat these as duplicate content, and success criterion 7 fails.

### Required change

```hcl
# 1. Rewrite directory-style URIs to the underlying object.
resource "aws_cloudfront_function" "rewrite_uri" {
  name    = "${var.name_prefix}-rewrite-uri"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-JS
    function handler(event) {
      var request = event.request
      var uri = request.uri
      if (uri.endsWith('/')) {
        request.uri = uri + 'index.html'
      } else if (!uri.split('/').pop().includes('.')) {
        request.uri = uri + '/index.html'
      }
      return request
    }
  JS
}

# 2. Associate it with the default cache behavior.
#    Inside default_cache_behavior:
#      function_association {
#        event_type   = "viewer-request"
#        function_arn = aws_cloudfront_function.rewrite_uri.arn
#      }

# 3. REPLACE the existing 403 -> 200 -> /index.html block with real errors.
custom_error_response {
  error_code            = 403
  response_code         = 404
  response_page_path    = "/404.html"
  error_caching_min_ttl = 10
}

custom_error_response {
  error_code            = 404
  response_code         = 404
  response_page_path    = "/404.html"
  error_caching_min_ttl = 10
}
```

Note the deletion is as important as the addition: leaving the 403→200 rule in
place keeps the soft-404 behaviour even once rewriting works.

If this module is shared with anything that still needs SPA fallback behaviour,
the owner should gate it behind a module variable rather than changing it
globally.

### Until it lands

The site is built with `trailingSlash: true`, producing `out/services/index.html`
etc. Phase 1's deploy verification runs against a personal `ENV_ID` environment.
If the CloudFront change has not been made, phase 1 reports "routes other than
`/` do not resolve — blocked on CloudFront handoff" rather than marking the phase
done. Local `next dev` and the Playwright suite (which serves `out/` with a
static server that _does_ resolve directory indexes) will both pass regardless,
so **local green does not prove production works.** This is stated explicitly
because it is exactly the kind of gap that ships broken.

---

## Architecture

### Repository layout

```
mccor-labs/
  pnpm-workspace.yaml         # packages: app/*   + allowBuilds for lefthook
  package.json                # private root: scripts + shared devDeps only
  lefthook.yml                # git hooks — must be at repo root
  prettier.config.ts
  eslint.config.ts            # flat config, root-level
  .node-version               # 24
  .gitignore                  # MODIFIED — see below
  pnpm-lock.yaml              # NEWLY COMMITTED
  FUTURE-NOTES.md
  README.md                   # MODIFIED — add website dev + deploy sections
  docs/
    ui-references/            # reference corpus — read-only to this work
    superpowers/specs|plans/
  app/
    web/                      # the website — name field MUST be "web"
    api/                      # existing Lambda source, untouched by v1
  infra/                      # OFF LIMITS (readable, never writable)
```

The root `package.json` is `private: true`, holds no runtime dependencies, and
exists for workspace scripts plus the devDependencies the hooks need
(`prettier`, `eslint`, `typescript`, `lefthook`). Everything the site needs
belongs to `app/web/package.json`.

**`app/web/package.json` must set `"name": "web"`** — `pnpm -F web` filters on
the package's `name` field, not its directory. A mismatch makes every script in
this spec fail with "no projects matched the filters".

### Site structure

```
app/web/
  package.json                # name: "web"
  next.config.ts              # output: 'export', trailingSlash: true
  tsconfig.json
  vitest.config.ts
  playwright.config.ts
  scripts/
    optimize-media.ts         # sharp pipeline — see Media
  public/
    fonts/                    # self-hosted .woff2
    media/                    # generated, committed image variants
  src/
    app/
      layout.tsx
      page.tsx                    /
      services/page.tsx
      work/page.tsx               teaser
      about/page.tsx
      process/page.tsx
      contact/page.tsx
      careers/page.tsx
      privacy/page.tsx
      terms/page.tsx
      not-found.tsx               -> exports to out/404.html
      sitemap.ts
      robots.ts
    components/
      ui/                     # shadcn primitives — owned source
      layout/                 # Header, Footer, Nav, Container, Section
      sections/               # composed page sections
      motion/                 # Reveal, Stagger, Parallax, Magnetic
      effects/                # one dir per signature moment, lazy only
    content/                  # the ONLY place copy lives
      services.ts  team.ts  process.ts  nav.ts  site.ts  types.ts
    lib/
      cn.ts  contact.ts  env.ts  media.ts
    styles/
      globals.css             # @theme tokens + base layer
      motion.css              # keyframes, reduced-motion overrides
    hooks/
    test/
      setup.ts
```

**Rules the layout enforces.** Route files compose sections and nothing else — no
data, no copy, no effect implementation. Sections are presentational and take
typed props. Copy lives only in `src/content/`. Each effect lives in its own
directory under `effects/` and is imported only via `next/dynamic`, so no page
pays for an effect it does not render. Files stay under roughly 200 lines; past
that, split.

### Build and deploy flow

```
  pnpm -F web build
        │
        ├─ prebuild: tsx scripts/optimize-media.ts   (idempotent, cached)
        ├─ next build  (output: 'export', trailingSlash: true)
        │     └─ app/web/out/   index.html, services/index.html, 404.html, ...
        │
        └─ aws s3 sync out/ s3://<site-bucket> --delete
              └─ aws cloudfront create-invalidation --paths '/*'
                    └─ https://mccorlabs.com   (requires CloudFront handoff)
```

### Static export consequences

| Lost                            | Handled by                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `next/image` runtime optimizer  | Build-time `sharp` pipeline; `images.unoptimized: true`.                              |
| Route Handlers / Server Actions | Contact form posts to owner-provisioned API Gateway.                                  |
| ISR / revalidation              | Content ships with a deploy.                                                          |
| Middleware                      | Not needed.                                                                           |
| `next/font` runtime             | Fonts self-hosted from `public/fonts/`, `font-display: swap`, display face preloaded. |

---

## Technology decisions

| Layer      | Choice                         | Version         | Why                                                                                                                                                                                                |
| ---------- | ------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework  | Next.js App Router             | 16.3.6          | Static export, route-level splitting, React 19 support.                                                                                                                                            |
| UI runtime | React                          | 19.3.0          | Current stable; View Transitions stable.                                                                                                                                                           |
| Language   | TypeScript                     | 5.x             | Constraint.                                                                                                                                                                                        |
| Styling    | Tailwind CSS                   | 4.3.3           | `@theme` compiles tokens to CSS custom properties — no runtime, and the token discipline light mode later depends on.                                                                              |
| Components | shadcn/ui                      | current         | Source copied into the repo and owned. Supports Tailwind v4 + React 19.                                                                                                                            |
| Animation  | Motion                         | 13.4.4          | Single JS animation system.                                                                                                                                                                        |
| 3D         | `@react-three/fiber` + `three` | 9.8.1 / 0.186.1 | Only where a 3D moment ships, dynamically imported.                                                                                                                                                |
| Unit tests | Vitest                         | 5.0.2           | Vite-native, documented for Next.js.                                                                                                                                                               |
| E2E        | Playwright                     | 1.61.0          | Runs against the exported build. Pinned exactly: 1.61.0 is the last version whose bundled browser revision matches the already-cached chromium-1228, and a caret range triggers a ~500MB download. |
| Lint       | ESLint + typescript-eslint     | 10.x / 8.70.1   | Flat config, type-aware.                                                                                                                                                                           |
| Format     | Prettier                       | 3.9.9           | Plus Tailwind class sorting.                                                                                                                                                                       |
| Hooks      | Lefthook                       | 2.1.14          | Single binary, declarative YAML.                                                                                                                                                                   |

### Rejected alternatives

**Astro** — ships less JS on content pages, but this site is deliberately motion-
and 3D-heavy, precisely where the islands model helps least. Every interactive
surface would fight it; shadcn support is second-class.

**Vercel / Amplify hosting** — duplicates S3 + CloudFront the firm already runs,
and splits DNS from the existing Route 53 setup.

**MUI, Mantine** — application-UI libraries with opinionated visual languages and
style runtimes. Fighting their defaults costs more than composing owned
primitives.

**GSAP** — now genuinely free for commercial use including all plugins (Webflow,
30 April 2025), so cost is not the objection. Rejected because Motion plus R3F
covers the required choreography and a second imperative animation system beside
React is complexity a 3–5 person team should not carry.

**Google Analytics 4** — needs a consent banner, ships a heavy script,
contradicts the firm's own pitch. No analytics in v1; alternatives in
`FUTURE-NOTES.md`.

---

## Motion architecture

### The decision and its evidence

**Motion is the single JavaScript animation system.** CSS is used for state
transitions (hover, focus, active) and for the Baseline-safe declarative
features listed below. No second JS animation library, and no CSS
scroll-driven animation.

The alternative — CSS-first with Motion lazy-loaded, as argued in
`CSS-First-Plus-Lazy-Motion-vs-Motion-Framer-Motion.md` — rests on CSS
scroll-driven animations being free. They are not yet safely available:

| Feature                                   | Support                                 | Baseline           | Used here                    |
| ----------------------------------------- | --------------------------------------- | ------------------ | ---------------------------- |
| `animation-timeline: view()` / `scroll()` | Chrome 115+, Firefox 159+, Safari 26+   | **Limited** (~80%) | **No**                       |
| `@starting-style`                         | Chrome 117+, Firefox 129+, Safari 17.5+ | Newly available    | Yes                          |
| `transition-behavior: allow-discrete`     | Chrome 121+, Firefox 129+, Safari 17.4+ | Newly available    | Yes                          |
| View Transitions, same-document           | Broad                                   | Newly available    | Yes                          |
| View Transitions, cross-document          | Safari 18.2+, Firefox partial/disabled  | **Not baseline**   | Progressive enhancement only |

Scroll-driven CSS would need a JS fallback for roughly a fifth of visitors, so
"zero-JS scroll reveals" is not achievable and two half-systems is worse than one
whole one. Three further reasons make it decisive: scroll must drive the 3D
scenes through `useScroll`/`useTransform`, and a second independent scroll engine
cannot be choreographed against it; CSS easing is fixed-duration, so an
interrupted animation jumps rather than settles, and velocity-aware springs are
most of what separates expensive-feeling motion from merely animated; and one
mental model is worth more than kilobytes to a small team.

### Bundle discipline

Motion is imported as `LazyMotion` plus the `m` component — roughly 4.6kB for
`m` plus ~15kB for the `domAnimation` feature bundle, against ~34kB for the full
`motion` API. Every signature effect and every R3F scene uses `next/dynamic` with
`ssr: false` and a defined loading state.

### Motion primitives

Four wrappers in `components/motion/`. Sections use these and never call Motion
directly, so timing stays consistent and has one place to change.

| Primitive    | Purpose                               |
| ------------ | ------------------------------------- |
| `<Reveal>`   | Enter-on-scroll for one element.      |
| `<Stagger>`  | Sequenced children reveal.            |
| `<Parallax>` | Scroll-linked transform.              |
| `<Magnetic>` | Pointer-reactive attraction for CTAs. |

### Reduced motion — hard requirement

Under `prefers-reduced-motion: reduce`: all scroll-linked and scroll-triggered
motion is disabled and reveals become immediate visibility; shader and 3D
backgrounds are replaced by their static fallback; video does not autoplay and
shows its poster with an explicit play control; only opacity transitions under
150ms remain. No content may be reachable only through an animation.

**Test:** with Playwright's `reducedMotion: 'reduce'` context option, assert for
each route that every element carrying a reveal attribute has computed
`opacity: 1` and no transform offset immediately after load, that
`document.getAnimations()` returns an empty array 500ms after load, and that no
`<video>` element has `autoplay` set.

### Provisional values

Durations, easing curves, stagger intervals and scroll ranges come from measured
tier-1 data at the revision gate. Until then: 200ms state changes, 400ms
reveals, 600ms large compositions, standard ease-out — explicitly placeholder.

---

## Design direction

### Colour tokens — FINAL, measured

Dark only. Every ratio computed from these exact values against WCAG 2.2; zero
failures across twelve pairs.

| Token                   | Value     | Role                                                  |
| ----------------------- | --------- | ----------------------------------------------------- |
| `--color-base`          | `#070a12` | Page background.                                      |
| `--color-surface`       | `#0d121d` | Cards, panels.                                        |
| `--color-elevated`      | `#151c2b` | Raised surfaces, popovers.                            |
| `--color-border`        | `#1d2534` | Decorative dividers only — **never** control borders. |
| `--color-border-strong` | `#5a6780` | Inputs, controls, anything conveying a boundary.      |
| `--color-muted`         | `#8a94a6` | Secondary text.                                       |
| `--color-text`          | `#eef2f8` | Primary text and headings.                            |
| `--color-brand`         | `#3d6bff` | Large display type and non-text graphics **only**.    |
| `--color-accent`        | `#527bff` | Links, small text, button fill, focus rings.          |

| Check                          | Ratio | Required | Result |
| ------------------------------ | ----- | -------- | ------ |
| text on base                   | 17.61 | 4.5      | PASS   |
| text on surface                | 16.67 | 4.5      | PASS   |
| text on elevated               | 15.16 | 4.5      | PASS   |
| muted on base                  | 6.47  | 4.5      | PASS   |
| muted on surface               | 6.12  | 4.5      | PASS   |
| accent link on base            | 5.31  | 4.5      | PASS   |
| accent link on surface         | 5.03  | 4.5      | PASS   |
| dark label on accent button    | 5.31  | 4.5      | PASS   |
| brand as large display on base | 4.47  | 3.0      | PASS   |
| control border on base         | 3.47  | 3.0      | PASS   |
| control border on surface      | 3.29  | 3.0      | PASS   |
| focus ring on base             | 5.31  | 3.0      | PASS   |

Two traps this encodes. `#3d6bff` measures 4.47 on the base — it fails AA for
body text by 0.03, so it is restricted to large display type and graphics and
`#527bff` is the functional accent. And `#1d2534` measures 1.29, correct for a
decorative hairline but illegal on an input border, hence two border tokens.
**A component must never choose a colour by eye. Tokens only**, enforced by lint.

Gradient glow — violet `#7c5cff` to cyan `#22d3ee`, heavily blurred, low
opacity, slow drift — is a _light source_ behind content. It never sits under
text and never carries meaning.

### Light mode readiness

Dark ships. Two rules keep the retrofit cheap: no raw colour value in any
component, only `var(--color-*)`; and `<html>` carries `data-theme="dark"` from
day one, otherwise unused. Adding light mode is then one token block plus
re-authoring each effect — estimated in `FUTURE-NOTES.md`.

### Typography, spacing, radii — PROVISIONAL

Set at the revision gate from measured data. Fixed now: at most two families
(one display, one text), self-hosted `.woff2` in `public/fonts/`, variable fonts
where available, `font-display: swap`, display face preloaded, total font weight
under 150kB. Fluid type via `clamp()` between defined viewport bounds.

---

## Pages

Ten routes, one signature moment each. The rest of each page is restrained and
fast — which is what stops the site feeling exhausting and keeps the one
memorable thing memorable.

| Route       | Purpose                             | Signature moment (PROVISIONAL)            | Tier |
| ----------- | ----------------------------------- | ----------------------------------------- | ---- |
| `/`         | Position the firm, drive to booking | Hero WebGL shader field, pointer-reactive | 1    |
| `/services` | What the firm sells                 | Service cards assembling on scroll        | 2    |
| `/work`     | Hold the space credibly             | Countdown / teaser composition            | 1    |
| `/about`    | The four humans                     | Team reveal with depth on scroll          | 2    |
| `/process`  | How engagement works                | Pinned scroll sequence through stages     | 2    |
| `/contact`  | Capture the lead                    | Considered field-level motion             | 3    |
| `/careers`  | Hiring posture                      | Typographic treatment only                | 3    |
| `/privacy`  | Legal                               | None — clean long-form reading            | —    |
| `/terms`    | Legal                               | None — clean long-form reading            | —    |
| `404`       | Recover                             | Playful typographic moment                | 3    |

### Signature moment rules

Tier 1 must ship. Tier 2 ships if it reaches the quality bar. Tier 3 is
enhancement. Available techniques, all approved: WebGL shader backgrounds;
pinned scroll scenes; poster-first background video; R3F 3D objects. Which lands
where is decided at the revision gate.

**The fallback rule.** Every moment is removable without leaving a hole: the page
must read as finished with the effect replaced. Which specific fallback applies
to which page is decided with the effect at the revision gate, but every effect
must satisfy all of these, and this is a review gate, not a suggestion:

1. The fallback is a **static rendering of the same composition** — for a shader
   or 3D background, a committed poster image or CSS gradient occupying the same
   box at the same aspect ratio; for a scroll-choreographed sequence, all content
   visible in document order with no transform; for video, the poster frame.
2. The fallback is what renders **before** the dynamic chunk resolves, so there
   is no layout shift when it does — the effect replaces it in place.
3. The fallback renders when any of: reduced-motion is set; WebGL context
   creation fails; the dynamic import rejects; `navigator.connection.saveData` is
   true.
4. No text, heading, link or control lives inside an effect component. Effects
   are backgrounds and decoration; content sits above them in normal DOM.

Rule 4 is what actually guarantees rule 1 is achievable. An effect that contains
content cannot be cut.

Regardless of choice: one WebGL context per route and never more than one;
intersection-gated or idle-callback initialisation so a below-fold effect never
delays LCP; every effect counts against its route's budget and is cut if it
breaks it.

### `/work` — the teaser

Must look deliberate, not unfinished. A countdown or "in production" composition
carrying a tier-1 signature budget, spent on making the absence read as
confidence. The countdown target is **Tuesday 29 September 2026, 15:00 America/Chicago**
(`2026-09-29T15:00:00-05:00`), confirmed by the owner. Store it as a single ISO
string in `src/content/site.ts` so it is edited in one place, and render the
remaining time from it rather than from a hardcoded digit set.

**The page must handle the target having passed.** Once the deadline is in the
past it renders the "in production" state — the same composition, with the
countdown replaced by a statement that case studies are coming and the booking
link as the action. It must never display zeros, negative values, or a frozen
clock. This is required regardless of the date: a countdown that outlives its
target and says so gracefully is fine, one that shows `-00:14:32` is not.

The countdown must also be correct without JavaScript and before hydration: the
statically exported HTML carries the human-readable target date in text, and the
live ticking digits are progressive enhancement. `prefers-reduced-motion` does
not disable the count — it is information, not decoration — but the digits must
not animate beyond the value change itself.

**A note on timing.** This target is 48 hours from the date of this spec, and
`/work` is built in phase 2, after phase 1's thirteen tasks and the reference
corpus. The countdown will therefore almost certainly be in the past by the time
the page first ships, and the expiry behaviour above is what the visitor will
actually see. The owner has confirmed the date with that understood. If a
different target is wanted later it is a one-line change in
`src/content/site.ts`.

Copy states
plainly that case studies are coming and routes to the booking link. **No fake
projects, no placeholder logos, no invented client names.**

### Content model

All copy lives in `src/content/` as typed exports. A missing field is a build
error, not a blank space.

```ts
// src/content/types.ts — shape, not final field list
export type Service = {
  slug: string
  title: string
  summary: string
  detail: string
  deliverables: readonly string[]
}

export type TeamMember = {
  slug: string
  name: string
  role: string
  bio: string
  mediaSlot: string | null // null = non-photographic treatment
  links?: readonly { label: string; href: string }[]
}

export type ProcessStage = {
  index: number
  title: string
  summary: string
  duration: string
}

/** Single source of truth for the /work countdown. ISO 8601 with offset. */
export type SiteMeta = {
  workCountdownTarget: string
}
```

`site.workCountdownTarget` holds the ISO string. Parse it once, and treat an
unparseable or absent value as "target has passed" rather than throwing — a
malformed date must not take the page down.

Accessible names follow the copy rule: any `aria-label`, form label, validation
message or visually-hidden string that a _visitor reads_ lives in
`src/content/`, because it is copy. Purely structural ARIA attributes
(`aria-hidden`, `aria-live`, `role`) are markup and stay inline.

### Copy

Draft copy is written during phase 2: specific, credible, in the voice of a small
senior firm. Not lorem ipsum — placeholder text hides layout problems that real
copy lengths expose.

**Every invented fact must be marked.** Any claim not sourced from the owner —
years in business, client counts, technologies used, biographies, outcomes — is
written as a plausible draft, flagged inline with
`{/* TODO(owner): verify or replace */}`, and collected into
`app/web/CONTENT-TODO.md` as one review checklist. Four names are known from
`infra/settings.auto.tfvars`: marcm, nateb, kirstenh, ashleyt. Everything else
about them is invented and must be flagged.

No fabricated testimonials, client logos, awards, certifications or metrics.

---

## Intro overlay and audio

Both are phase 3. Neither may be load-bearing for content, indexing or
navigation.

### Intro overlay

A full-screen branded overlay over **fully rendered content**. The content is in
the DOM and indexable from the first byte; the overlay is a `fixed` layer above
it that fades out. This is deliberately not an entry gate.

An entry gate — content withheld until an "Enter" click — was rejected. Googlebot
does not click buttons, so gated content risks not being indexed at all, which
for a site whose job is inbound leads defeats the point. It also inserts a step
between a visitor and the pitch, which costs most on paid and referral traffic.
The reference corpus skews to individual portfolios (`david-hckh`,
`pacomepertant`, `belenjones`), where an entry gate costs nothing because nobody
arrives with search intent. A B2B firm is a different job; the convention does
not transfer.

Behaviour:

| Aspect           | Rule                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dismiss          | Auto after ~1.2s, **or** immediately on any click, scroll, keypress or touch.                                                                                                   |
| Frequency        | Once per visitor, recorded in `localStorage`. Never shown again.                                                                                                                |
| Skipped entirely | `prefers-reduced-motion: reduce`; `navigator.connection.saveData`; a `localStorage` hit; any request whose user agent matches a known crawler.                                  |
| Focus            | Focus is trapped for its lifetime, `Escape` dismisses, focus returns to `<body>` start. `aria-hidden` is **not** set on `<main>` — the content stays in the accessibility tree. |
| Scroll           | Body scroll locked while visible; unlocked on dismiss. Never left locked on error.                                                                                              |
| Weight           | Counts toward the route's initial budget. No new font, no video, no WebGL in the overlay.                                                                                       |
| Failure          | If its script fails, the overlay must not render at all. A stuck overlay is a fully broken site, so it renders only after its own dismiss handler is attached.                  |

The last row is the important one: this component can white-screen the entire
site. It gets a test asserting that content is reachable with JavaScript
disabled.

### Audio

Owner's decision, against my recommendation, recorded plainly: an ambient bed
starts as soon as the intro is dismissed by a click, with a visible control. My
objection was that a B2B audience is disproportionately browsing from offices and
meetings, where unrequested audio is a liability rather than a flourish. The
owner has the context and the call; it is specified here in full.

**The gesture constraint, which shapes the real behaviour.** Browsers refuse to
start audio without a user gesture, with no workaround. An overlay that
auto-dismisses on a timer is _not_ a gesture. Therefore:

- Intro dismissed **by click, tap or keypress** → audio starts, faded in over
  ~800ms to its target volume.
- Intro dismissed **by timeout** → audio does not start. The toggle shows its
  "off" state and the visitor may enable it.
- **Returning visitor** (overlay skipped) → no gesture exists, so audio does not
  start. Silent until the toggle is pressed.
- Reduced-motion, Save-Data, or a remembered "off" choice → audio never starts
  and assets are never fetched.

This is not a defect to engineer around. It is stated so that "sound plays on
arrival" is understood as "sound plays for a first-time visitor who clicked,"
which is the most any site can do.

**Controls and conformance.** WCAG 1.4.2 is **Level A** — audio longer than three
seconds must have a pause or stop mechanism. A persistent, visible, keyboard
reachable toggle lives in the header on every route, with `aria-pressed`
reflecting state and an accessible name from `src/content/`. It is never hidden
behind a menu, never icon-only without a label, and present even while the
overlay is up. The choice persists in `localStorage`; **once a visitor mutes,
audio never auto-starts again on any later visit.**

**Implementation rules.**

| Rule                                                                                        | Reason                                                               |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Audio assets fetched only on first enable, via dynamic import.                              | The majority never enable it; they must pay zero bytes.              |
| Ambient loop ≤ 900kB, target −24 LUFS or quieter, seamless loop.                            | It is a bed, not a track.                                            |
| Interaction SFX as one sprite ≤ 60kB, only audible when enabled.                            | Where sound actually reads as craft.                                 |
| Pause on `visibilitychange` when the tab is hidden; resume on return only if still enabled. | Audio from a background tab is the single most-hated web behaviour.  |
| Single shared `AudioContext`, created lazily on the gesture, never at module load.          | Creating one before a gesture leaves it suspended and wastes memory. |
| No audio on `/privacy`, `/terms` or `404`.                                                  | Nobody reading a legal page wants a soundtrack.                      |
| Audio never conveys information.                                                            | Nothing is audio-only.                                               |

Audio weight is excluded from the page-weight budgets because it is opt-in and
post-load, but it has its own ceiling above and is asserted separately: a test
confirms **no audio request occurs** on a default page load.

## Media

Two skills in sequence. Neither substitutes for the other, and **phase 2 stops
if either has not run** — the implementing agent must not source images ad hoc.

**1. `media-planner`** produces `docs/ui-reference/MEDIA-PLAN.md`: the slot table
(id, route/component, aspect ratio, delivery widths, sourcing lane, launch
criticality), per-slot direction stating what each image must and must not show,
license obligations with their shipping consequences, video egress arithmetic,
and a per-page weight budget backed by arithmetic. It plans; it does not search.
Its output format is defined by the skill, not by this spec.

**2. `sourcing-media`** executes that plan across its four phases — brief, route,
acquire, hand off — producing `media-manifest.json` (slot → file variants,
intrinsic size, alt text, license, credit line, usage risk) and
`MEDIA-CREDITS.md`. It sources; it does not plan.

The implementing agent then resolves every asset through `src/lib/media.ts`
reading `media-manifest.json`, and never searches for an asset itself. A slot
referenced in content but absent from the manifest is a build error.

### Rules, enforced

1. **No third-party CDN URLs in shipped code.** Every asset downloaded once and
   committed.
2. **License read per file, not per source.** Openverse and Wikimedia mix CC0,
   CC BY, CC BY-NC and all-rights-reserved in one search.
3. **`unknown` license is blocked**, never assumed free.
4. **CC BY / CC BY-SA attribution is a visible shipping obligation** — it appears
   on the site. `MEDIA-CREDITS.md` is a record, not compliance.
5. **Free is not public domain.** Unsplash left CC0 in 2017, Pixabay in 2019.
6. **No model releases in the catalog.** A recognisable face is acceptable
   editorially; in anything advertising-like it is legal exposure. Team
   photographs must be the firm's own.
7. **No bulk downloading.** Prohibited by every source.

### Audio sourcing

Audio is not covered by `sourcing-media`'s image catalog, and **audio licensing is
materially stricter than stock photography**: much "royalty-free" music is
licensed per-project or per-platform, written with video in mind rather than a
site that plays sound, and background music on a company site is unambiguously
commercial use.

Approved sources, in priority order:

| Need          | Source                                                                        | Licence                          | Obligation                                                                                 |
| ------------- | ----------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| Interface SFX | **Kenney** — `kenney.nl/assets/interface-sounds`, `kenney.nl/assets/ui-audio` | CC0 1.0 public domain dedication | None. Preferred: CC0 is a dedication, not a licence with terms to breach.                  |
| Ambient bed   | **Pixabay Music** — `pixabay.com/music/`                                      | Pixabay Content License          | None. Commercial use permitted, no attribution, unlimited projects.                        |
| SFX gap-fill  | **Mixkit** — `mixkit.co/free-sound-effects/`                                  | Mixkit free licence              | None for SFX. **Read the music licence separately — it is narrower than the SFX licence.** |
| Last resort   | **Freesound** — filtered to CC0 only                                          | CC0                              | None, _if_ filtered. Unfiltered it mixes CC0, CC BY and CC BY-NC side by side.             |

**Rejected sources, with reasons.** Zapsplat — large, but free-tier use requires
attribution, which is a visible shipping obligation and the same trap the image
rules exist to avoid. Epidemic Sound — best music quality, but the Creator tier
forbids use in marketing or promotion for a company, so a business website needs
Pro or higher, and its licence is built around music under _productions_ rather
than UI sound. Both are acceptable only if the owner buys an appropriate tier and
records it; neither may be used on a free tier.

**Rules.**

1. **No source is assumed free.** The licence is read for the specific file, as
   with images. Pixabay content is royalty-free but still copyrighted.
2. **Standalone redistribution is prohibited by every source above.** Embedding a
   sound in the site is fine; serving the raw asset as a downloadable file is not.
   No audio asset may be linked as a download.
3. **Provenance is committed.** Each audio file is recorded in
   `MEDIA-CREDITS.md` alongside image credits — file name, source URL, licence
   name, licence URL, and date retrieved. Audio extends the existing credits
   artifact rather than adding a parallel `LICENSES.md`, so there is one place to
   look.
4. **The committed file is a derivative.** The bed must be trimmed to a seamless
   loop and normalised to −24 LUFS or quieter; a stock track will satisfy neither
   as downloaded. This is permitted under all the licences above, and it makes
   rule 3 more important, because the shipped file no longer matches the
   downloaded one byte for byte. Record both the original file name and the
   transformation applied.
5. **`unknown` licence is blocked**, exactly as for images.

### The image pipeline — concrete

`app/web/scripts/optimize-media.ts`, run by a `prebuild` script via `tsx`, not a
webpack loader and not a Next plugin.

Input: source files recorded in `media-manifest.json`. For each slot it emits, to
`public/media/<slot>/`, AVIF and WebP at the slot's declared widths plus a
base64 blur placeholder, and writes `src/lib/media.generated.ts` exporting a
typed map of slot → variants, widths, intrinsic dimensions, blur data URI and
alt text. It is idempotent: a variant whose source hash is unchanged is skipped,
so incremental builds stay fast. It fails the build on a manifest slot whose
source file is missing.

Components consume the generated map through `src/lib/media.ts`, so every
`<img>` gets explicit `width`, `height`, `srcset` and `sizes` — CLS stays at
zero by construction. Generated variants are committed, so a clean clone builds
without re-encoding.

Video is `preload="none"`, poster-first, muted, `playsinline`, attached only
after the poster has painted and only when reduced-motion is not set.

---

## Performance budgets

Per route, on the production build. Enforced by
`app/web/tests/e2e/budgets.spec.ts`, which fails the suite — and therefore the
pre-push hook — when exceeded.

| Budget                                | Limit   |
| ------------------------------------- | ------- |
| Initial JS, gzipped                   | 160kB   |
| Any single lazy effect chunk, gzipped | 250kB   |
| CSS                                   | 40kB    |
| Fonts total                           | 150kB   |
| LCP image                             | 250kB   |
| Total page weight, no video           | 1.2MB   |
| Total page weight, with video         | 4MB     |
| LCP (4G, mid-tier mobile)             | < 2.5s  |
| CLS                                   | < 0.1   |
| INP                                   | < 200ms |

**Measurement method, so the numbers are unambiguous.** "Initial JS" is the sum
of `transfer_size` for every response with a JavaScript content type recorded via
Playwright's `response` event from navigation until the `load` event, on a page
loaded with no scrolling. Motion counts toward it, because it is imported by the
layout. An effect chunk counts as lazy only if it is requested _after_ `load`, in
response to scroll or intersection — a chunk that arrives before `load` is
initial by definition, whatever its import syntax. Budgets are asserted against
the production build served from `out/`, never against `next dev`.

The lazy ceiling is 250kB rather than 200kB because `three` alone is roughly
155kB gzipped before R3F, and a 200kB ceiling would make any real 3D scene
impossible to ship — a budget that forbids a decision this spec approves is a
broken budget. **If a 3D moment still cannot fit 250kB, it is cut in favour of a
shader**, which costs a fraction and, on a `#070a12` base, is arguably more
striking. Budgets are limits, not targets: cut the effect, not the budget.

---

## Accessibility

WCAG 2.2 AA, with AAA on body-text contrast (met at 17.61).

Semantic landmarks; exactly one `h1` per route with no skipped heading levels —
including the legal and 404 routes, no exemptions. A visible focus indicator on
every interactive element using `--color-accent` at 3:1 minimum (measured 5.31).
Full keyboard operability including skip-to-content. Accessible names on every
control, with icon-only buttons carrying `aria-label` sourced from
`src/content/`. Form fields with associated `<label>`s, errors announced via
`aria-live` and linked by `aria-describedby`. No meaning by colour alone.
`prefers-reduced-motion` honoured as specified. Decorative media `aria-hidden`
with empty `alt`. `<html lang="en">`.

**WCAG 1.4.2 (Level A) — audio control.** Because the site plays an ambient audio
bed, a visible, keyboard-reachable pause/stop control must be present on every
route that can play audio, at all times, including while the intro overlay is
displayed. This is the lowest conformance tier, so failing it fails the whole
accessibility target regardless of how the rest scores. Asserted by an explicit
test rather than left to the axe sweep, which cannot detect a missing audio
control.

**Intro overlay accessibility.** Focus trapped for its lifetime with `Escape`
dismissing it; `<main>` is never `aria-hidden`, so content stays in the
accessibility tree; body scroll is restored on dismiss even if the dismiss path
errors.

Verified by `@axe-core/playwright` on all ten routes, failing the suite on any
violation. Automated checks catch roughly half of real problems, so a manual
keyboard-only pass over every route is a required step in phase 2, and its result
is reported explicitly rather than assumed.

---

## Contact form contract — OWNER-IMPLEMENTED

The endpoint lives in `infra/` and is outside this work. The implementing agent
builds the client against this contract and must not create the Lambda or its
Terraform.

```ts
// src/lib/contact.ts — shared types
export type ContactRequest = {
  name: string // 1-100 chars
  email: string // RFC 5322 basic validation
  company?: string // 0-100
  message: string // 10-5000 chars
  budget?: string // enum from content/site.ts
  honeypot: string // MUST be empty; non-empty => silent 200, no send
}

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: 'validation' | 'rate_limit' | 'server'; detail?: string }
```

**Owner side:** `POST /contact` on the existing API Gateway HTTP API; CORS
restricted to `https://mccorlabs.com` and `https://www.mccorlabs.com`; throttling
at 5 requests/minute/IP returning `rate_limit`; validation mirroring the
constraints above, returning `validation` with no detail that aids probing; SES
send to a mailbox on the domain with `Reply-To` set to the submitter; `honeypot`
non-empty returns `{ ok: true }` without sending; message bodies never logged.

**Client side.** Validation happens twice and the split is explicit: the client
validates shape and required fields locally and **never sends a request it knows
is invalid**, rendering its own inline messages on blur and submit; the server's
`validation` error is treated as a bug-or-attack path and shown as a generic
"Something was wrong with that submission" rather than field-level text, since
the client should have caught it. `rate_limit` and `server` get distinct, honest
messages. The form is a real `<form>` progressively enhanced. Submit is disabled
with a live-region status while in flight. Success and failure are both announced
to screen readers. The honeypot is visually hidden but not `display: none`, and
not keyboard reachable (`tabindex="-1"`, `aria-hidden="true"`).

**Before the endpoint exists**, phase 1 builds the client against a Playwright
route mock covering success and all three error branches. Absence of the endpoint
must not block phase 1, and the form must not be wired to a URL that 404s in
production — if `NEXT_PUBLIC_CONTACT_ENDPOINT` is unset at build time the form
renders with the booking link as its call to action and a short note to email
directly, rather than a button that silently fails.

Anti-spam in v1 is the honeypot plus API Gateway throttling. Turnstile is
recorded in `FUTURE-NOTES.md`.

### Booking link

The primary CTA everywhere. The destination is `NEXT_PUBLIC_BOOKING_URL`, resolved
at build time from 1Password (vault `Development`, item `mccor-labs`) via
`op run --env-file=app/web/.env.template`. It is configuration rather than content
specifically so a preview environment can point at a throwaway calendar instead
of taking real bookings against the live one.

Rendered as an ordinary external link with `rel="noopener noreferrer"` — no
embedded third-party scheduler script, which keeps third-party JavaScript off the
site entirely.

**A production build fails if it is missing.** `src/lib/env.ts` treats the value
as optional in development, so `pnpm dev` works without 1Password, and mandatory
when `NODE_ENV` is production. Without that check a production build made with a
locked vault would silently fall back to the email CTA and ship a site with no
booking link, and nothing in the test suite would notice.

### Environment variables

`src/lib/env.ts` parses and validates exactly these at module load, failing the
build on a malformed value. Static export inlines them at build time, so all are
`NEXT_PUBLIC_`.

| Variable                       | Required              | Purpose                                                                                                                                                                                                         |
| ------------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`         | yes                   | Absolute base URL for `sitemap.ts`, `robots.ts`, canonical tags and Open Graph. Defaults to `https://mccorlabs.com`; must be overridable so an `ENV_ID` preview environment does not advertise production URLs. |
| `NEXT_PUBLIC_BOOKING_URL`      | for production builds | Booking destination for the primary CTA. Optional in development; a production build throws without it. Point preview environments at a throwaway calendar.                                                     |
| `NEXT_PUBLIC_CONTACT_ENDPOINT` | no                    | Absolute URL of the contact endpoint. Unset ⇒ the fallback behaviour above.                                                                                                                                     |

All three values live in 1Password (vault `Development`, item `mccor-labs`) and
reach the build through `op run --env-file=app/web/.env.template`. That template
holds `op://` references rather than values, so it is committed. There is no
`.env.local` in this project. None of these is secret — a static export compiles
them into the published HTML — so 1Password is the single source of truth here,
not a secrecy mechanism.

---

## Tooling

### TypeScript

`strict: true`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`,
`noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`. `any`
banned by lint; `unknown` with narrowing where a type is genuinely open. Config
files are TypeScript: `next.config.ts`, `prettier.config.ts`, `eslint.config.ts`,
`vitest.config.ts`, `playwright.config.ts`.

### ESLint

**Lives at the repo root**, in the root `package.json`'s devDependencies, with a
single flat config at `eslint.config.ts` covering both `app/web` and future
packages. This matters because the pre-commit hook runs ESLint from the root
against staged paths anywhere in the tree; installing it only in `app/web` makes
that hook fail. `app/web` gets a `lint` script that runs the root binary against
its own directory.

**`next lint` was removed in Next.js 16** — ESLint is invoked directly.
Composition, in order: `eslint-config-next`; `typescript-eslint`
`strictTypeChecked` + `stylisticTypeChecked` with `projectService: true`;
`jsx-a11y`; then `eslint-config-prettier/flat` **last** so formatting rules do
not fight Prettier.

Project-specific rules, implemented with `no-restricted-syntax` and
`no-restricted-imports` rather than custom plugins:

| Rule                        | Mechanism                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No raw colour in components | `no-restricted-syntax` on JSX/`Literal` nodes matching `/#[0-9a-fA-F]{3,8}\b\|rgba?\(\|hsla?\(/`, scoped to `src/**/*.tsx`, excluding `src/styles/**`. |
| Motion only via primitives  | `no-restricted-imports` forbidding `motion`/`motion/react` outside `src/components/motion/**` and `src/components/effects/**`.                         |
| Effects imported lazily     | `no-restricted-imports` on patterns matching `*/components/effects/*` outside `effects/**`, with `next/dynamic` the intended access path.              |
| Copy stays in content       | `no-restricted-imports` preventing `src/content/**` importing from `src/components/**`.                                                                |

The colour rule is the one most likely to produce false positives (a hex in a
shader uniform, a test fixture). Overrides are added per-file with a comment
stating why, never by weakening the rule globally.

### Prettier

`prettier.config.ts` at the repo root — supported by Prettier 3.x, needs Node
≥ 22.6; the machine runs 24.20.

```ts
import type { Config } from 'prettier'

const config: Config = {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 90,
  plugins: ['prettier-plugin-tailwindcss'], // MUST be last
  tailwindStylesheet: './app/web/src/styles/globals.css',
}

export default config
```

Two details that are easy to get wrong. Tailwind v4 has no JS config file, so the
plugin needs **`tailwindStylesheet`** pointing at the CSS entry — `tailwindConfig`
is the v3 option and does nothing here; the path is relative to this config
file's location at the repo root. And `prettier-plugin-tailwindcss` uses Prettier
APIs only one plugin may hold, so it must be listed last. Import ordering is
therefore handled by ESLint rather than a second Prettier plugin, sidestepping
the conflict entirely.

### Lefthook

`lefthook` in the root `package.json` devDependencies. Hooks self-install via
postinstall — but **pnpm blocks postinstall scripts by default**, and this is the
single most likely setup failure.

Rather than hand-writing a settings key whose name differs across pnpm versions,
run:

```bash
pnpm approve-builds lefthook
```

which writes the correct allow-list entry into `pnpm-workspace.yaml` itself.
pnpm no longer reads settings from `package.json` at all. **Then verify
concretely** — `test -f .git/hooks/pre-commit` must succeed, and a deliberately
misformatted staged file must be reformatted by a test commit. A hook that
silently never installed looks identical to a hook that passes.

```yaml
# lefthook.yml — repo root
pre-commit:
  parallel: true
  commands:
    format:
      glob: '*.{ts,tsx,css,json,md,yml,yaml}'
      run: pnpm prettier --write {staged_files}
      stage_fixed: true
    lint:
      glob: '*.{ts,tsx}'
      run: pnpm eslint --fix --no-warn-ignored {staged_files}
      stage_fixed: true

pre-push:
  parallel: false
  commands:
    typecheck:
      run: pnpm -F web exec tsc --noEmit
      fail_text: 'Type errors. Fix before pushing.'
    lint:
      run: pnpm -F web lint
      fail_text: 'Lint errors. Fix before pushing.'
    format-check:
      run: pnpm format:check
      fail_text: 'Formatting drift. Run: pnpm format'
    test:
      run: pnpm -F web test:run
      fail_text: 'Unit/integration tests failing.'
    build:
      run: pnpm -F web build
      fail_text: 'Production build failed.'
    e2e:
      run: pnpm -F web test:e2e:smoke
      fail_text: 'Smoke tests failing.'
```

Both hook commands run from the repo root, where `prettier` and `eslint` are
installed — hence the root-level tooling decision above. `glob:` skips a command
entirely when no staged file matches, so a docs-only commit costs nothing.
`stage_fixed: true` re-stages formatter changes so a commit is never partially
formatted. `LEFTHOOK=0 git commit` bypasses hooks when genuinely necessary.

Pre-commit is deliberately limited to fast auto-fixing on staged files (2–5s);
everything slow runs pre-push, as the owner requested. The reasoning for not
putting slow checks on commit: a 90-second commit trains a developer into
`--no-verify`, after which the hooks protect nothing.

### Scripts

Every command invoked by a hook or by the README must exist here.

Root `package.json`:

| Script         | Runs                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `dev`          | `pnpm -F web dev`                                                                                                     |
| `build`        | `pnpm -F web build`                                                                                                   |
| `test`         | `pnpm -F web test`                                                                                                    |
| `verify`       | `pnpm -F web exec tsc --noEmit && pnpm -F web lint && pnpm format:check && pnpm -F web test:run && pnpm -F web build` |
| `format`       | `prettier --write .`                                                                                                  |
| `format:check` | `prettier --check .`                                                                                                  |

`app/web/package.json` (`"name": "web"`):

| Script           | Runs                                     |
| ---------------- | ---------------------------------------- |
| `dev`            | `next dev`                               |
| `prebuild`       | `tsx scripts/optimize-media.ts`          |
| `build`          | `next build`                             |
| `lint`           | `eslint .`                               |
| `test`           | `vitest`                                 |
| `test:run`       | `vitest run`                             |
| `test:e2e`       | `playwright test`                        |
| `test:e2e:smoke` | `playwright test --grep @smoke`          |
| `test:a11y`      | `playwright test tests/e2e/a11y.spec.ts` |

`test:a11y` is a convenience alias for running the accessibility spec alone; that
spec is also part of `test:e2e`, so it runs in the full suite regardless and is
not separately invoked by any hook.

### .gitignore changes — required

`.gitignore` currently contains:

```
node_modules/
pnpm-lock.yaml       # <- REMOVE
package-lock.json    # <- REMOVE
```

Correct when Node was only throwaway scripts; harmful for a deployed
application. Without a committed `pnpm-lock.yaml` every install resolves fresh
versions, so local and CI builds can differ — silently defeating the pinned
versions above. `node_modules/` stays ignored; both lockfile lines are removed
and `pnpm-lock.yaml` is committed. Added: `app/web/out/`, `app/web/.next/`,
`test-results/`, `playwright-report/`, `.media-work/`, `.env.local`.

---

## Testing

Test author and implementer should not be the same agent where practical, so
tests cannot be shaped to fit the implementation.

**Unit / integration (Vitest + Testing Library).** Content modules satisfy their
types with no empty required strings. Motion primitives render children and
respect a mocked reduced-motion preference. The contact client validates,
serialises and maps every error branch, and refuses to send a known-invalid
payload. `src/lib/media.ts` throws on a slot missing from the manifest.
Utilities. Every section renders from typed fixtures without crashing, including
empty and overlong content.

**End-to-end (Playwright against the exported build via `webServer`).** Every
route renders its own `h1` and its own distinct content — not the home page's,
which is the specific failure the current CloudFront config would cause. The 404
route is asserted separately and expects a 404 status where the environment can
produce one. Nav and footer links resolve with no 404s. The booking CTA appears
on every route pointing at `bookingUrl`. The contact form validates locally and
handles mocked success plus each error branch. Keyboard traversal reaches every
interactive element with a visible focus ring. Reduced-motion assertions as
specified above. Budget assertions per the measurement method above.
`@axe-core/playwright` clean on all ten routes. A `@smoke` subset for pre-push.

**Intro overlay and audio tests, all `@smoke`.** Content is present and readable
in the DOM on first load _while the overlay is displayed_ — asserted by querying
`main` text with the overlay visible, which is the test that proves the overlay is
not a gate. Content is reachable with JavaScript disabled. A second visit shows no
overlay. `prefers-reduced-motion` and a `saveData` context both skip the overlay
entirely. `Escape` dismisses it and body scroll is restored. **No audio request
occurs on a default page load** — asserted by watching for any media content type
in network requests. The audio toggle is present, visible, keyboard focusable and
correctly reports `aria-pressed` on every route that can play audio. A muted
choice persists across a reload and audio does not auto-start.

**Explicitly not automatically tested:** whether the design is good, and whether
shaders render correctly — GPU output is not meaningfully assertable in CI. Both
need the owner's eyes, and this spec says so rather than implying coverage it
does not have.

---

## Local development and deployment

To be added to `README.md` in its existing voice, after _Your real frontend_.

```bash
# first time
pnpm install                  # also activates git hooks
pnpm approve-builds lefthook  # required, or hooks silently never install
test -f .git/hooks/pre-commit # must succeed

pnpm dev                      # http://localhost:3000

# before pushing (hooks run this automatically)
pnpm verify

# build the static site
pnpm build                    # -> app/web/out/

# deploy (owner runs; needs AWS credentials)
aws s3 sync app/web/out/ "s3://$(cd infra && terraform output -raw site_bucket)/" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(cd infra && terraform output -raw cloudfront_distribution_id)" \
  --paths '/*'
```

`.node-version` pins Node 24 to match the development machine. README additions
must state: Node and pnpm requirements; that the first `pnpm install` plus
`approve-builds` is what activates hooks, and how to verify; how to bypass hooks
and when that is acceptable; that copy is edited in `app/web/src/content/`; the
deploy pair above with a note that CloudFront invalidation is not instant; and
that routes other than `/` require the CloudFront handoff to have landed.

---

## Implementation handoff

This spec is not an implementation plan. Next step is `superpowers:writing-plans`,
producing **four** plans in `docs/superpowers/plans/`, matching the existing
mail-server plan's structure — numbered tasks, checkbox steps, literal bash
invocations, stated expected output, a commit per task.

### Skills, in order

| Stage | Skill                                | Produces                                                                            | Phase    |
| ----- | ------------------------------------ | ----------------------------------------------------------------------------------- | -------- |
| 1     | `superpowers:writing-plans`          | Phase 1 plan                                                                        | 1        |
| 2     | `nextjs`, `react-best-practices`     | Consulted during build                                                              | 1–3      |
| 3     | _(gate)_                             | Confirm tier-1 captures exist in `docs/ui-references/`. If absent, STOP and report. | before 2 |
| 4     | `design-director`                    | Direction document; updates PROVISIONAL sections                                    | before 2 |
| 5     | `media-planner`                      | `MEDIA-PLAN.md` — slots, licensing, weight budget                                   | 2        |
| 6     | `sourcing-media`                     | `media-manifest.json`, `MEDIA-CREDITS.md`, assets                                   | 2        |
| 7     | `superpowers:writing-plans`          | Phase 2 and 3 plans                                                                 | 2–3      |
| 8     | `impeccable`                         | Visual and interaction polish                                                       | 3        |
| 9     | `superpowers:requesting-code-review` | Review before finishing the branch                                                  | each     |

### Non-negotiables

1. Do not create, edit or delete anything under `infra/`. Reading it is fine.
   Where infrastructure is needed, write the contract and report it.
2. Do not proceed past the stage-3 gate on provisional values. Do not invent
   measurements and attribute them to the reference sites.
3. Do not source media outside `media-planner` → `sourcing-media`.
4. Flag every invented factual claim, in the file and in `CONTENT-TODO.md`.
5. Tokens only — never a raw colour in a component.
6. Every effect has a working fallback, satisfying all four fallback rules,
   before it is considered done.
7. Budgets are limits, not targets. Cut the effect, not the budget.
8. Local green does not prove production works. Route resolution and 404 status
   depend on the CloudFront handoff; say so rather than reporting success.
9. Do not commit unless asked; the owner creates commits.
10. Report honestly. A missed budget, a skipped test or a cut effect is stated
    plainly.

---

## Open questions for the owner

Most of these were answered during design. The drafts they produced live in
`docs/content/`.

| #   | Question                                         | Status                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | What does the firm sell?                         | **Answered.** Websites and applications primary, plus AI integration, developer consulting and hands-on teaching. See `docs/content/services.md`                                                                                                         |
| 2   | Positioning                                      | **Answered.** Tagline: "A small senior team building websites, applications and AI features for companies that need them to actually work."                                                                                                              |
| 3   | Booking destination                              | **Answered.** A Google Calendar appointment schedule, supplied via `NEXT_PUBLIC_BOOKING_URL` from 1Password                                                                                                                                              |
| 4   | Contact mailbox                                  | **Answered.** `marcm@mccorlabs.com`, the admin mailbox from `infra/settings.auto.tfvars`                                                                                                                                                                 |
| 5   | Team roles, bios, photographs                    | **Partly answered.** Marc's bio is from his own facts; Nate is a Consultation Specialist; Kirsten's and Ashley's bios are invented and flagged for their own correction. The owner is supplying real photographs of all four. See `docs/content/team.md` |
| 6   | `/work` countdown target                         | **Answered.** Tuesday 29 September 2026, 15:00 America/Chicago (`2026-09-29T15:00:00-05:00`)                                                                                                                                                             |
| 7   | Careers                                          | **Answered.** Actively hiring five roles. See `docs/content/careers.md` and `docs/content/job-postings.md`                                                                                                                                               |
| 8   | Legal entity                                     | **Answered.** McCor Labs LLC, Minnesota. Postal address is a knowingly fabricated Blaine PO box and **must be replaced with a real one before publishing**                                                                                               |
| 9   | Who implements the CloudFront handoff, and when? | **Answered.** The owner, in phase 4, after phases 1–3 are complete and running locally                                                                                                                                                                   |

### Genuinely still open

1. **A real PO box** to replace the fabricated Blaine address. A publishing blocker, not a build blocker.
2. **Salary ranges, benefits, EEO statement and remote policy** for the five job postings — see `docs/content/job-postings.md`. Currently omitted rather than invented.
3. **Whether CloudFront access logging is enabled** — the privacy policy carries a branch for each case and one must be deleted in phase 4.

None of these block phase 1. Items 1 and 2 block launch, because the site must be truthful.

## Out of scope

Blog or insights. Per-project case studies. Light mode and theme toggle.
Analytics. Cookie consent. CMS or admin. Internationalisation. Client portal or
authenticated area — Cognito exists in `infra/` but the marketing site does not
use it. Newsletter. Live chat. Search. Anything under `infra/`.

The first five are recorded in `FUTURE-NOTES.md` with reasoning and adoption
cost.
