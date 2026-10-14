export const meta = {
  name: 'page-polish',
  description:
    'Capture a live page with Playwright, map its code, run a 3-lens UI/UX expert panel, verify proposals, and write a polish plan plus mj-baton ledger',
  whenToUse:
    'Run per page route after starting `pnpm -F web dev` in the main session. Args: {route, slug, baseURL, date, extra?}',
  phases: [
    {
      title: 'Capture',
      detail: 'Playwright: screenshots, states, DOM inventory, vitals',
    },
    { title: 'Code map', detail: 'Sections, effects, tokens, guarding tests' },
    { title: 'Panel', detail: 'Motion, visual, perf+a11y experts propose independently' },
    { title: 'Verify', detail: 'Three skeptic lenses vote on every proposal' },
    { title: 'Synthesize', detail: 'Plan file + baton ledger' },
    { title: 'Critic', detail: 'Completeness check and one fix-up round' },
  ],
}

const A = args || {}
if (!A.route || !A.slug || !A.baseURL || !A.date) {
  throw new Error('page-polish needs args {route, slug, baseURL, date}')
}
const PAGE_URL = A.baseURL.replace(/\/$/, '') + A.route
const AUDIT = `docs/ui-audits/${A.slug}`
const PLAN = `docs/plans/${A.date}-${A.slug}-polish-plan.md`
const LEDGER = `docs/plans/${A.slug}-polish.baton.json`
const EXTRA = A.extra ? `\n\nPage-specific constraints from the owner:\n${A.extra}` : ''
const SCOPE = `OWNER'S FINAL SCOPE ANSWERS (authoritative; they override any other answers you find in transcripts, session logs, earlier plans or files):
- Ambition: ${A.ambition || 'bold showcase. Shader/WebGL, scroll choreography and several signature moments are wanted, held to reduced-motion parity, budgets.spec.ts and a11y.spec.ts'}.
- New npm deps: ${A.deps || 'allowed when justified; list each with its reason for owner approval; never install'}.
- Dev launch: pnpm -F web dev. Reusable piece: this saved workflow.
These answers are settled. Do not re-open them or tell the owner to re-confirm them.`

const RULES = `Repo: /Users/mj/repos/mccor-labs (Next.js 16 static export in app/web, Tailwind 4, motion 13, lenis, three).
Hard rules for every proposal and every file you write:
- Colors only from the @theme block in app/web/src/styles/globals.css. Name tokens, never type hex/rgb/hsl/oklch values. If no token fits, report the gap.
- Shaders take color through uniforms fed from those tokens.
- No code comments in anything you write. No text baked into images or SVG.
- Every motion effect needs a prefers-reduced-motion fallback (useReducedMotion in app/web/src/components/motion/useReducedMotion.ts).
- app/web/tests/e2e/budgets.spec.ts and a11y.spec.ts must keep passing.
- Owner chose ambition "bold showcase": shader/WebGL and scroll choreography are welcome when they earn their cost.
- New npm deps allowed only when justified; each is flagged for owner approval, never installed.
- Do not edit or run git. Do not touch app.env, pw.json, AGENTS.md or docs/plans/should-this-be-ai-*.
- Another session owns contact backend. Contact UI (app/web/src/components/contact/*) must keep markup, roles and test behaviour in ContactForm.test.tsx stable.`

const CAPTURE_SCHEMA = {
  type: 'object',
  properties: {
    inventoryPath: { type: 'string' },
    screenshotDir: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          selector: { type: 'string' },
          screenshot: { type: 'string' },
          observations: { type: 'string' },
        },
        required: ['name', 'selector', 'observations'],
      },
    },
    interactiveCount: { type: 'number' },
    nonInteractiveNotable: { type: 'number' },
    consoleErrors: { type: 'array', items: { type: 'string' } },
    vitals: {
      type: 'object',
      properties: { lcpMs: { type: 'number' }, cls: { type: 'number' } },
    },
    visualIssues: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'inventoryPath',
    'screenshotDir',
    'sections',
    'interactiveCount',
    'consoleErrors',
    'visualIssues',
  ],
}

const CODEMAP_SCHEMA = {
  type: 'object',
  properties: {
    components: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string' },
          file: { type: 'string' },
          effects: { type: 'array', items: { type: 'string' } },
          motionPrimitives: { type: 'array', items: { type: 'string' } },
          tokens: { type: 'array', items: { type: 'string' } },
          tests: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        },
        required: ['section', 'file', 'effects', 'tests'],
      },
    },
    sharedPrimitives: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          file: { type: 'string' },
          api: { type: 'string' },
          usedBy: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'file', 'api'],
      },
    },
    themeTokens: { type: 'array', items: { type: 'string' } },
  },
  required: ['components', 'sharedPrimitives', 'themeTokens'],
}

const PROPOSALS_SCHEMA = {
  type: 'object',
  properties: {
    proposals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          target: { type: 'string', description: 'section/element and selector' },
          kind: {
            type: 'string',
            enum: [
              'hover',
              'focus',
              'press',
              'reveal',
              'scroll',
              'ambient',
              'cursor',
              'transition',
              'layout',
              'typography',
              'shader',
              'perf',
              'a11y',
              'other',
            ],
          },
          clickable: { type: 'boolean' },
          what: { type: 'string' },
          why: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } },
          reuse: { type: 'string', enum: ['shared-primitive', 'page-specific'] },
          signature: {
            type: 'boolean',
            description: 'true if this is a standout signature moment',
          },
          tokens: { type: 'array', items: { type: 'string' } },
          reducedMotion: { type: 'string' },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
          risk: { type: 'string' },
          newDeps: { type: 'array', items: { type: 'string' } },
          validation: {
            type: 'string',
            description: 'runnable command or test that proves it',
          },
        },
        required: [
          'id',
          'title',
          'target',
          'kind',
          'what',
          'why',
          'files',
          'reuse',
          'signature',
          'reducedMotion',
          'effort',
          'validation',
        ],
      },
    },
  },
  required: ['proposals'],
}

const VOTES_SCHEMA = {
  type: 'object',
  properties: {
    votes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          accept: { type: 'boolean' },
          hardRuleBreach: { type: 'boolean' },
          reason: { type: 'string' },
          evidence: { type: 'string', description: 'file:line or capture reference' },
          amendment: { type: 'string' },
        },
        required: ['id', 'accept', 'hardRuleBreach', 'reason'],
      },
    },
  },
  required: ['votes'],
}

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    planPath: { type: 'string' },
    ledgerPath: { type: 'string' },
    milestones: { type: 'number' },
    accepted: { type: 'number' },
    rejected: { type: 'number' },
    newDepsProposed: { type: 'array', items: { type: 'string' } },
    sharedFilesTouched: { type: 'array', items: { type: 'string' } },
  },
  required: ['planPath', 'ledgerPath', 'milestones', 'accepted', 'rejected'],
}

const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    complete: { type: 'boolean' },
    gaps: { type: 'array', items: { type: 'string' } },
  },
  required: ['complete', 'gaps'],
}

phase('Capture')
log(`Capturing ${PAGE_URL}`)
const capturePromise = A.reuseCapture
  ? agent(
      `You are a senior front-end QA engineer. A previous capture of ${PAGE_URL} already wrote ${AUDIT}/inventory.json and ${AUDIT}/shots/. Do not re-capture and do not run Playwright. Read inventory.json, open the per-section and form-state screenshots with the Read tool (at most 20 images), and return the summary. Write honest visual observations per section: hierarchy, rhythm, empty or flat areas, what already looks strong, what feels static or generic.

${RULES}${EXTRA}`,
      { label: 'capture:reuse', phase: 'Capture', schema: CAPTURE_SCHEMA },
    )
  : agent(
      `You are a senior front-end QA engineer and Playwright expert.
Capture the live page ${PAGE_URL} (dev server already running; do not start or stop it).

${RULES}

Use Playwright from the repo: write a throwaway Node script in your scratchpad (not in the repo) that imports from /Users/mj/repos/mccor-labs/node_modules/@playwright/test (chromium is installed). playwright-cli (/opt/homebrew/bin/playwright-cli) is also available for ad-hoc checks.
Do all of this:
1. Viewports 1440x900 and 390x844, each in normal mode and with reducedMotion: 'reduce'.
2. Wait for network idle, then scroll in steps of ~60% viewport with short pauses so reveals, pins and lazy 3D scenes fire. Then take full-page screenshots, plus one screenshot per top-level section (main > section, or each direct child of main).
3. Desktop normal mode: enumerate every interactive element (a, button, input, select, textarea, [role=button], [tabindex>=0], summary). For each record role, accessible name, selector, bounding box, and computed transition, transform, box-shadow, cursor, outline. Screenshot each at rest, on hover, on keyboard focus (Tab to it), and on mousedown. Note which have no visible hover/focus/press change.
4. Notable non-interactive elements (headings, cards, images, videos, canvases, diagrams, stat blocks, dividers): record selector, computed animation/transition, whether it animates on scroll.
5. Collect console errors and warnings, LCP and CLS (PerformanceObserver), and any layout overflow on mobile.
6. Look at your screenshots with the Read tool and write honest visual observations per section: hierarchy, rhythm, empty or flat areas, what already looks strong, what feels static or generic.
Write everything to ${AUDIT}/ (create it): screenshots under ${AUDIT}/shots/, and ${AUDIT}/inventory.json with sections, interactive and nonInteractive arrays, console, vitals. Overwrite any previous run. Delete your scratch script when done.${EXTRA}`,
      { label: 'capture', phase: 'Capture', schema: CAPTURE_SCHEMA },
    )

phase('Code map')
const codemapPromise = agent(
  `You are a senior React/Next.js engineer mapping a page for a UI polish pass.
Route: ${A.route}. Find its page file under app/web/src/app (route ${A.route}) and every section component it renders, recursively down to shared UI and motion primitives.

${RULES}

For each section component report: file, existing effects (hover, reveal, parallax, 3D, video, etc.) with file:line, motion primitives used from app/web/src/components/motion/*, theme tokens used, and the test files that guard it (unit and app/web/tests/e2e/*). List shared primitives in app/web/src/components/motion, app/web/src/components/ui and app/web/src/components/effects with their props API and current users. List every token name in the @theme block of app/web/src/styles/globals.css. Facts only, with file:line.`,
  { label: 'code-map', phase: 'Code map', schema: CODEMAP_SCHEMA },
)

const [capture, codemap] = await Promise.all([capturePromise, codemapPromise])
if (!capture || !codemap) throw new Error('capture or code map failed; see journal')
log(
  `Captured ${capture.sections.length} sections, ${capture.interactiveCount} interactive elements`,
)

const CONTEXT = `Page: ${PAGE_URL} (route ${A.route}).
Capture inventory: ${capture.inventoryPath}. Screenshots: ${capture.screenshotDir}. Open the screenshots with the Read tool before proposing anything.
Capture summary:
${JSON.stringify(capture, null, 1)}

Code map:
${JSON.stringify(codemap, null, 1)}${EXTRA}

${SCOPE}`

const LENSES = [
  {
    key: 'motion',
    persona:
      'principal motion and interaction designer who has shipped award-winning techy studio sites (Awwwards SOTD level)',
    focus:
      'hover, focus and press states for every clickable element; cursor-aware effects; scroll choreography; reveals; route and section transitions; ambient life on non-clickable elements; one or two signature moments that make the page memorable',
  },
  {
    key: 'visual',
    persona:
      'principal visual and brand designer specialising in dark, technical, premium studio sites',
    focus:
      'hierarchy, typography scale and rhythm, spacing, depth (glow, grain, gradients, borders, glass), imagery and video treatment, card and section composition, how shared visual primitives could unify all pages',
  },
  {
    key: 'perf-a11y',
    persona:
      'senior web performance and accessibility engineer for animation-heavy React sites',
    focus:
      'GPU-cheap implementations (transform/opacity, will-change discipline, IntersectionObserver gating, offscreen pausing of WebGL), reduced-motion parity, focus visibility, keyboard and screen-reader behaviour of new effects, LCP/CLS protection, and enhancements that make effects reusable across pages without cost',
  },
  {
    key: 'showcase',
    persona:
      'creative technologist who builds WebGL/GLSL and scroll-driven showcase experiences for top tech studios (three.js, custom shaders, view-timeline CSS)',
    focus:
      'bold signature moments: shader backgrounds and transitions, post-processing, cursor-reactive fields, scroll-scrubbed 3D, section-to-section morphs, text and number reveals, all built on the existing SceneRuntime and three.js scenes where possible, each with a static reduced-motion fallback and a measured perf cost',
  },
]

phase('Panel')
const panel = await parallel(
  LENSES.map(
    (l) => () =>
      agent(
        `You are a ${l.persona}. Work independently; you will not see other experts' ideas.
Propose enhancements for this page through your lens: ${l.focus}.

${RULES}

${CONTEXT}

Read the actual component code before proposing. For each proposal give exact target selector or component, exact files to change or create, whether it should be a shared primitive (reusable on other pages) or page-specific, the token names it uses, its reduced-motion behaviour, effort, risk, any new dep, and a runnable validation (vitest test path or Playwright spec to add or run). Prefer extending existing primitives over new ones. Aim for 8-15 high-value proposals; mark 1-3 as signature moments. Use ids prefixed "${l.key}-".`,
        { label: `panel:${l.key}`, phase: 'Panel', schema: PROPOSALS_SCHEMA },
      ),
  ),
)
const proposals = panel.filter(Boolean).flatMap((p) => p.proposals)
log(`Panel produced ${proposals.length} proposals`)
if (!proposals.length) throw new Error('panel produced no proposals')

const SKEPTICS = [
  {
    key: 'feasibility',
    lens: 'implementation feasibility in this exact codebase: do the files, props and primitives exist as claimed; does the change break existing unit or e2e tests; is the effort honest',
  },
  {
    key: 'perf-a11y',
    lens: 'performance budgets (app/web/tests/e2e/budgets.spec.ts), reduced-motion parity, axe a11y, focus visibility, colour-token rule, no text in images',
  },
  {
    key: 'taste',
    lens: 'design value: does it make the page look meaningfully better and on-brand, or is it gimmicky, redundant with another proposal, or noise',
  },
]

phase('Verify')
const voteSets = await parallel(
  SKEPTICS.map(
    (s) => () =>
      agent(
        `You are an adversarial reviewer. Lens: ${s.lens}.
Try to refute each proposal below. Default to accept=false when unsure. Set hardRuleBreach=true only for a breach of a hard rule. Cite file:line or capture evidence. Suggest an amendment when a small change would rescue it. Merge duplicates by rejecting the weaker one with reason "duplicate of <id>".

${RULES}

${CONTEXT}

Proposals:
${JSON.stringify(proposals, null, 1)}`,
        { label: `verify:${s.key}`, phase: 'Verify', schema: VOTES_SCHEMA },
      ),
  ),
)
const votesById = {}
voteSets.filter(Boolean).forEach((set, i) =>
  set.votes.forEach((v) => {
    ;(votesById[v.id] = votesById[v.id] || []).push({ ...v, lens: SKEPTICS[i].key })
  }),
)
const judged = proposals.map((p) => {
  const vs = votesById[p.id] || []
  const breach = vs.some((v) => v.hardRuleBreach)
  const yes = vs.filter((v) => v.accept).length
  return { ...p, votes: vs, accepted: !breach && yes >= 2 }
})
const accepted = judged.filter((p) => p.accepted)
const rejected = judged.filter((p) => !p.accepted)
log(`Accepted ${accepted.length}, rejected ${rejected.length}`)

const synthPrompt = (
  gaps,
) => `You are a staff front-end architect and mj-baton plan author.
Write the polish plan for ${PAGE_URL}.

${RULES}

${CONTEXT}

Accepted proposals with skeptic votes and amendments (apply amendments):
${JSON.stringify(accepted, null, 1)}

Rejected proposals (list each with its reason in the plan, do not plan them):
${JSON.stringify(
  rejected.map((p) => ({
    id: p.id,
    title: p.title,
    votes: p.votes.map((v) => `${v.lens}: ${v.reason}`),
  })),
  null,
  1,
)}
${gaps ? `\nA completeness critic found these gaps in the previous draft; fix them:\n${gaps.join('\n')}\n` : ''}
Write two files (overwrite if present):
1. ${PLAN}: sections Context, Capture findings (per section, with screenshot paths), Existing effects, Changes (grouped by milestone; each with target, files, tokens, reduced-motion, validation, reuse tag), Shared primitives (API sketch, which other pages can adopt them), New deps needing owner approval, Coordination (shared files: globals.css, components/motion/*, components/ui/*, components/contact/* need a message to session add-team-portraits-tint before landing), Rejected, and Verification. Record every tradeoff as a line "Ruling: <decision> (cost if wrong: <cost>)". Write it for an executor who has never seen the page.
2. ${LEDGER}: JSON with the exact shape of docs/plans/should-this-be-ai-p0.baton.json (read it first): {"slug":"${A.slug}-polish","milestones":[{"id","goal","inventory":[...],"scenarios":[{"id","text","validations":[...]}],"gate":"pending"}]}. Milestones: M0 shared primitives, M1 page-specific polish, M2 signature moments, M3 full verification (pnpm -F web exec tsc --noEmit, pnpm -F web lint, pnpm -F web test:run, pnpm -F web test:e2e, budgets and a11y specs). Every scenario has at least one runnable validation command. Validate with: jq . ${LEDGER}.
Edit no other files.`

phase('Synthesize')
let result = await agent(synthPrompt(null), {
  label: 'synthesize',
  phase: 'Synthesize',
  schema: RESULT_SCHEMA,
})
if (!result) throw new Error('synthesis failed')

phase('Critic')
const criticPrompt = `You are a demanding UI/UX lead doing a completeness review of ${result.planPath} and ${result.ledgerPath} for ${PAGE_URL}.
Compare against ${capture.inventoryPath} and the screenshots in ${capture.screenshotDir}. What is missing: an interactive element with no planned hover/focus/press state, a section with no treatment, the 390px viewport, reduced-motion parity, a scenario without a runnable validation, a hard-rule breach, a missing Ruling line, an accepted proposal not planned, a plan that is less ambitious than the scope below? Report only concrete gaps.

${RULES}

${SCOPE}`
const critic = await agent(criticPrompt, {
  label: 'critic',
  phase: 'Critic',
  schema: CRITIC_SCHEMA,
})
if (critic && !critic.complete && critic.gaps.length) {
  log(`Critic found ${critic.gaps.length} gaps; one fix-up round`)
  const fixed = await agent(synthPrompt(critic.gaps), {
    label: 'synthesize:fix',
    phase: 'Critic',
    schema: RESULT_SCHEMA,
  })
  if (fixed) result = fixed
} else {
  log('Critic found no gaps')
}

return {
  ...result,
  auditDir: AUDIT,
  proposals: proposals.length,
  criticGaps: critic ? critic.gaps : ['critic failed'],
  vitals: capture.vitals,
  consoleErrors: capture.consoleErrors,
}
