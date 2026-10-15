# Plan: Should This Be AI? Phase 1, the static lab

Spec: `docs/plans/2026-10-09-should-this-be-ai-design.md` (sections "Phase 1: static lab", "Rulings", "Testing and quality gates", "UNVERIFIED").
Branch: `feat/lab-phase-1`, cut from `main` after the spec and this plan land. Never work on `main`.
Persona: principal front-end engineer (Next.js 16 static export, React 19, TypeScript, Tailwind v4 tokens, WCAG 2.2 AA, Vitest and Playwright with axe).
Plan file: `docs/plans/2026-10-09-should-this-be-ai-phase-1-static-lab-plan.md`.

## Goal

Ship `/lab/should-this-be-ai/`: a visitor lists up to 8 steps of a workflow, answers five questions per step (plus one follow-up when the decision is a checklist), and a rubric written in code gives each step one of six verdicts with the reason and the rule as code. Everything runs in the browser with no AWS call. Results can be carried to the contact page in the URL fragment.

How to run this plan: one fresh subagent per task, in strict order P1-T1 to P1-T28. Each task names its files, consumes only what earlier tasks produced, ends with its own verification and one commit that stages only the paths it names. Tasks marked OWNER are done by the owner, not an agent.

## Global Constraints

- Read every file before editing it. Edit only the files a task names. Read-only on everything else.
- No comments of any kind in any file written: no `//`, `/* */`, `{/* */}`, JSDoc. Exempt tool directives only: `'use client'`, `@vitest-environment`, and the one `eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex` directive allowed by the Ruling on scroll regions.
- Color comes only from token class names that exist in the `@theme` block of `app/web/src/styles/globals.css`: `base`, `surface`, `elevated`, `border`, `border-strong`, `muted`, `text`, `brand`, `accent`, `accent-hover`, `on-accent`, `glow-red`. Never type a hex, `rgb()`, `hsl()` or `oklch()` value. No new tokens. If no token fits, stop and report the gap.
- `color-brand` is never a label or a text fill. It appears only as the progress rail line, the `do-not-automate` inline marker and the `do-not-automate` card rule, as the spec fixes.
- Never use the `text-base` class (eslint blocks it; `--color-base` makes it a color).
- No new packages. Everything needed is installed (`react`, `next`, `shiki`, `class-variance-authority`, Vitest, Testing Library, Playwright, `@axe-core/playwright`).
- Nothing under `components/lab/` imports `three`, `motion`, or anything under `components/effects/` (eslint `no-restricted-imports` already enforces the effects and motion paths). Motion goes through `components/motion/Reveal` and the token readers in `components/motion/tokens.ts`.
- Content files under `src/content/` never import components (eslint enforces).
- All lab strings live in `app/web/src/content/lab/copy.ts`, except each rule's `why`, which lives in its rule file (Ruling R-COPY below).
- No `localStorage`, `sessionStorage`, IndexedDB, cookies or analytics. Step names stay in React state only.
- Every interactive control the lab renders (buttons, links, radio labels) is at least 44 by 44 px: `Button` at `size="md"` (`h-11`, `components/ui/button.tsx:19`) plus `min-w-11`, or `min-h-11 min-w-11` on a plain element. P1-T25 measures it at 390 px.
- `react-hooks/set-state-in-effect` is on (eslint-config-next 16.3.6 spreads `eslint-plugin-react-hooks@7.1.1` recommended rules, `node_modules/.pnpm/eslint-config-next@16.3.6*/.../dist/index.js:168`). Never call a state setter synchronously in an effect body. Set state in event handlers, in timer callbacks, or during render with a guard.
- Errors are explicit: throw with a clear message. The only non-throwing failure path is `decodeLabResult`, which returns `null` for untrusted input by contract.
- Per-task verification, run from the repo root, all must pass with output shown:
  - `pnpm -F web exec tsc --noEmit` prints nothing and exits 0.
  - `pnpm -F web lint` exits 0 with no new warnings.
  - `pnpm -F web test:run` ends with `Test Files  N passed (N)` and no failures.
  - `pnpm exec prettier --check <every path the task touched>` prints `All matched files use Prettier code style!`.
- e2e tasks build first: `NEXT_PUBLIC_SITE_URL=https://example.com NEXT_PUBLIC_BOOKING_URL=https://booking.example.com/ci pnpm build:raw` (the same env CI uses, `.github/workflows/ci.yml:38-40`; no `op` prompt), then `pnpm -F web test:e2e --project=chromium --grep "should-this-be-ai"`. The Playwright web server serves `app/web/out` (`app/web/playwright.config.ts` `webServer.command`), so a stale build tests stale code.
- Commits: each task ends with `git add <exact paths>` and one conventional commit. Never `git add -A` or `.`. Never push. lefthook pre-commit runs prettier and eslint `--fix` on staged files; if it rewrites a file, re-run the task's verification before moving on.
- No backup files. If a step fails three times, stop and report the exact error.
- Per `CLAUDE.md`: any change to this plan or the spec goes to three independent ui-ux-pro subagents first.

## Review Focus

1. The thirteen rules in P1-T2 to P1-T5 are mutually exclusive and total over all 4,096 answer sets; P1-T6 proves it, so check the conditions read the way an owner would expect. R2 and R12 split "costly and nobody checks first" on whether the work is a fixed-form checklist.
2. Preset answers in P1-T17 and the verdict they produce are content decisions with brand weight; check each line against the copy rules (no client, outcome or team-size claims).
3. Focus management and the status region in P1-T15 and P1-T16 are where keyboard and screen-reader users succeed or fail, including the Undo pause and the re-keyed status text.
4. `decodeLabResult` in P1-T20 parses untrusted URL input; check it rejects every malformed shape and never throws.
5. The sticky summary in P1-T19 is sticky for every visitor and carries `data-sticky-layout`; P1-T24 narrows the reduced-motion "no sticky element" e2e gate (`tests/e2e/motion.spec.ts:59-65`) to skip it, because that gate exists for pinned scroll scenes (`components/motion/Pinned.tsx:29-30`).

## Rulings

- Ruling R-IDS: rule ids are `R1` to `R13`, one file each at `app/web/src/content/lab/rules/R<n>.ts`. `R1` to `R11` are numbered in question order; `R12` and `R13` were added by the 2026-10-09 rubric fix and take the next free numbers, so no id changes meaning (cost if wrong: renaming ids later breaks phase 3 feedback counts keyed by rule id, so it needs a `RUBRIC_VERSION` major bump).
- Ruling R-EXCLUSIVE: every rule's `when` is self-contained and the thirteen rules are mutually exclusive and total, so list order cannot change a verdict and each "rule as code" snippet tells the whole story on its own (cost if wrong: longer conditions in the snippets; `classifyStep` still takes the first match).
- Ruling R-KEYS: `StepAnswers` keys are `fixedForm` (question 1), `checklist` (question 2), `changes` (follow-up 2b, shown only when question 2 is yes), `costly`, `checkable`, `pastCases` (questions 3 to 5) and `frequency` (question 6) (cost if wrong: one rename across the four phase plans).
- Ruling R-Q1: question 1 asks whether both the information a step uses and the result it produces come in a fixed form, so a step that turns a spreadsheet into written sentences is a language-model step (cost if wrong: a fixed-input, free-text-output step that a template could fill is sent to a language model; the visitor can still answer yes).
- Ruling R-TREE: the verdict logic is: an unknown cost of a mistake gives `unclear` (R1); costly with an unknown check gives `unclear` (R3); once those are known, an unknown form gives `unclear` (R4) and a fixed form with an unknown checklist gives `unclear` (R6). Costly and not checkable gives `do-not-automate` (R2) unless the form is fixed and the decision is a checklist, which gives `plain-code` with no sign-off (R12). When a mistake is cheap or a person checks first: free text gives `language-model` (R5); a fixed-form checklist gives `plain-code` when the team rarely changes it (R7), `rules` when the team changes it more than a few times a year (R8), and `unclear` when that is unknown (R13); fixed input without a checklist gives `unclear` when past cases are unknown (R9), `classic-ml` with 200 or more past cases (R10), and `do-not-automate` without them (R11) (cost if wrong: R12 ignores follow-up 2b, so a costly, unchecked checklist the team edits often is still "a simple program"; the R12 reason tells the visitor to test it on past cases first).
- Ruling R-READS: each rule also exports `reads`, the question keys its condition uses, so the Why drawer shows "the answers that triggered it" without parsing code; a test checks `reads` against the condition source (cost if wrong: one extra field beyond the spec's `{id, when, verdict, humanSignOff, why}`).
- Ruling R-SIGNOFF: `humanSignOff` is a function of the answers. It is `costly === 'yes' && checkable === 'yes'` for every tool verdict (`plain-code`, `rules`, `classic-ml`, `language-model`) and always `false` for `do-not-automate` and `unclear`; `rules` no longer always carries sign-off (cost if wrong: none; the P1-T6 proof pins it over every answer set).
- Ruling R-COPY: each rule's `why` lives in its rule file next to its condition, so the code snippet shows the reason; the shared `assertNoClaims` check scans `copy.ts` and every rule's `why` (cost if wrong: one place outside `copy.ts` holds visitor-facing strings).
- Ruling R-CLAIMS: the banned-claims check is one exported helper, `assertNoClaims(text: string)` in `app/web/src/test/noClaims.ts`, so phases 2 and 3 run the same list over their copy (cost if wrong: a phase that adds its own list can drift from this one).
- Ruling R-TEMPLATES: templated strings are plain strings with `{name}` slots filled by `fillTemplate`, which throws on a missing value, so the content test can scan every string (cost if wrong: no compile-time check that a slot name exists; the throw catches it in tests).
- Ruling R-VERSION: `RUBRIC_VERSION` starts at `2.0.0`, a major bump over the `1.0.0` drafted before the 2026-10-09 rubric fix, because the fix changes verdicts for the same answers; any later rule change bumps it again (cost if wrong: none; no `1.x` rubric ever shipped).
- Ruling R-METHOD: phase 1 ships the method note sentence "Nothing you type leaves this page unless you send it to us." Phase 2 swaps in "Nothing you type leaves this page unless you send it to us, or run a live test, which sends that test's text to Amazon Bedrock." in the same release that adds live tests (cost if wrong: if phase 2 forgets the swap, the page under-describes what reaches Bedrock; phase 2 owns that copy change).
- Ruling R-START: the builder starts with one empty step, `step-1`; ids are `step-<n>` from a counter in state, so server and client render the same markup (cost if wrong: none).
- Ruling R-EDGES: "Move up" on the first step and "Move down" on the last stay focusable with `aria-disabled="true"` and do nothing, so focus can stay on the same button after a move to the edge (cost if wrong: screen-reader users hear a dimmed button they can press with no effect).
- Ruling R-ANNOUNCE: the status region speaks on add, move, remove, undo, preset load, and on an answer change only when the verdict or its sign-off changes. Each announcement increments a counter that re-keys the status text node, so two identical messages in a row are both spoken (cost if wrong: an answer that does not change the verdict is silent).
- Ruling R-RESEQ: the status text renders inside `<span key={seq}>`, and `seq` increments on every announcement, so two identical messages in a row are each read (cost if wrong: one extra state field).
- Ruling R-ONE-STATUS: the page has exactly one `role="status"` region, the builder's; verdict cards, the summary and the send section carry no `aria-live`, `role="status"` or `role="log"` (cost if wrong: phase 2 lanes must announce through the builder region, which phase 2 does through `onAnnounce`).
- Ruling R-UNDO: Undo shows for 10 seconds after a remove. The countdown pauses while focus is inside the Undo block and restarts at 10 seconds when focus leaves. If the countdown ends while focus is still inside the block (the window lost focus, so the block saw a blur), focus moves to "Add a step" before the block goes. At 8 steps the Undo block is hidden, and the Undo handler announces and moves focus only when the reducer really restored the step (cost if wrong: a visitor who fills all 8 slots after a remove cannot undo it).
- Ruling R-ADD-LIMIT: at 8 steps "Add a step" keeps its accessible name, gets `aria-disabled="true"`, and a visible "Up to 8 steps" note is attached through `aria-describedby` (cost if wrong: none; the name a voice-control user speaks stays the same).
- Ruling R-MARKS: `WorkflowBuilder` owns a `Set` of sent feedback marks keyed `${stepId}:${verdict}:${ruleId}` and exposes it through `FeedbackMarksProvider` and `useFeedbackMarks()`, so phase 3's "Wrong?" control can read `alreadySent` and survive a card remount (cost if wrong: phase 1 ships a small context nothing reads until phase 3; its own tests cover it).
- Ruling R-PRESET: loading a preset replaces all steps, opens the first step, keeps focus on the preset button and announces the load; there is no undo for a preset load (cost if wrong: a visitor who clicks a preset loses typed steps; the preset intro says so).
- Ruling R-PRESETS: preset content is the twelve steps in P1-T17; every verdict except `unclear` appears at least once, and sign-off appears on `plain-code`, `rules`, `language-model` and `classic-ml` (cost if wrong: owner rewrites the step names; the tests pin rule ids and sign-off, not wording).
- Ruling R-RESOLVED: a step is resolved for the progress rail when every visible question has any answer, "Not sure" included: questions 1 to 5, plus follow-up 2b when question 2 is yes (cost if wrong: the rail can reach full while verdicts still say "Worth a conversation").
- Ruling R-STICKY-ALL: the summary column is `lg:sticky lg:top-24` for every visitor, reduced motion included, and carries `data-sticky-layout`; the reduced-motion gate in `tests/e2e/motion.spec.ts:59-65` skips `[data-sticky-layout]`, because sticky layout is not motion and the gate exists for `Pinned` scroll scenes (cost if wrong: a future pinned scene that wrongly carries `data-sticky-layout` escapes the gate).
- Ruling R-STAGGER: verdict cards use `Reveal` with `delay = Math.min(revealOrder, 3) * staggerInterval()`, where `staggerInterval` is a module-level lazy getter in `VerdictCard.tsx` that reads the existing `--stagger-interval` token (`globals.css:62`) with `readDurationSeconds` once on the client instead of editing `Stagger.tsx`, and not `<Stagger>` itself, because `Stagger` wraps each child in a `div` and the cards live inside separate `<li>` elements of one `<ol>`. `revealOrder` is the step's index only for steps present at first mount or a preset load, and `0` for steps added later, and the cap of 3 keeps the last card under a quarter second (cost if wrong: none visible; the token is the same 80 ms).
- Ruling R-FADE: a later verdict change remounts only that card's label block by `key` with `motion-safe:transition-opacity motion-safe:starting:opacity-0` at `duration-(--duration-pointer)` and `ease-(--ease-pointer)`; no keyframes are added to `globals.css` (cost if wrong: the fade does not run in browsers without `@starting-style`; the text is still correct).
- Ruling R-ACCORDION: below `md` the accordion is CSS-driven (`hidden md:block` on closed step bodies, the toggle `md:hidden`) with one open step held in state; the toggle contract is `onToggle = () => setOpenId(open ? null : step.id)`, so opening one step closes the others; no `matchMedia` in render, so no hydration mismatch (cost if wrong: at `md` and up the toggle state is ignored, which is the intent).
- Ruling R-SCROLL: each horizontal scroll container (rule code, summary table) gets `tabIndex={0}`, `role="region"` and an `aria-label`, with one `eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex` directive, because axe `scrollable-region-focusable` needs keyboard access and jsx-a11y's recommended config only allows `tabpanel` (`eslint-plugin-jsx-a11y/lib/index.js:107-110`) (cost if wrong: one directive per container).
- Ruling R-HASH: the fragment payload is versioned JSON `{v: 1, rubricVersion, steps: [{name, verdict, humanSignOff, ruleId, unanswered}]}`, UTF-8, base64url without padding. `decodeLabResult` rejects anything that is not exactly this shape, including a verdict that does not match its rule id, `unanswered: true` on anything but an `R1` `unclear` step, more than 8 steps or a name over 60 characters, and returns `null`; the contact page rebuilds the message text from the parsed data with `copy.ts`, never from raw fragment text (cost if wrong: a crafted link can only prefill a valid lab summary, never arbitrary text).
- Ruling R-ASK: the sent text labels a step with no answers at all "not answered yet" instead of "Worth a conversation", and ends with "What I would like help with: " so the visitor's own words follow the results (cost if wrong: one more line in every message).
- Ruling R-MAILTO: with no contact endpoint, the contact page shows "Email us these results" as a `mailto:` link; whole step lines are dropped from the end, keeping the intro and the closing "What I would like help with: " line, until the encoded body is at most 1,500 characters, and a "More steps were cut" line is added when anything was dropped (cost if wrong: very long step names shorten the email).
- Ruling R-PREFILL: the contact page reads the hash with `useSyncExternalStore` on `hashchange`, takes it into state during render with a guard, and clears it with `history.replaceState` in an effect that sets no state; the textarea is remounted by `key` with the text as `defaultValue` (cost if wrong: none; this is the pattern that passes `react-hooks/set-state-in-effect`).
- Ruling R-BOOK: the "Book a call" option on the contact page appears inside the lab notice, so the existing contact page is unchanged for visitors who did not come from the lab (cost if wrong: the header CTA is the only booking link for other visitors, as today).
- Ruling R-HEADER: `PageHeader` is not changed; its `description` reads "The wrong-tool test. …" so the subtitle is the first sentence of the lede (cost if wrong: the subtitle is not styled apart from the promise).
- Ruling R-ROUTES: the lab path is added to `ROUTES` in `tests/e2e/support.ts`, `PATHS` in `tests/e2e/a11y.spec.ts`, and the local route list in `tests/e2e/routes.spec.ts`, so the existing CLS, reduced-motion, no-three, h1 and header-CTA gates all cover it (cost if wrong: about 15 more e2e cases per run).
- Ruling R-INP: a lab INP test is added to `budgets.spec.ts`, measuring radio clicks, because the spec's no-WebGL Ruling exists to protect INP on this route and the existing INP test only covers `/` (cost if wrong: one more budgets case).
- Ruling R-RACE: `RecordedRace` is not built in phase 1. No committed Nova trace exists, and the spec Ruling allows it only with a real trace. Phase 2 creates it (cost if wrong: phase 1 has no race preview, as the spec accepts).
- Ruling R-SERVICES: the Services page link block is not in phase 1; the spec ships it after hole 2 is fixed. The footer link ships here (cost if wrong: one entry point at launch, as the spec accepts).

## File Structure

Create:

- `app/web/src/content/lab/rubric.ts`: shared types, constants, `visibleQuestions`, `getRule`, `classifyStep`.
- `app/web/src/content/lab/rubric.test.ts`
- `app/web/src/content/lab/rules/R1.ts` to `R13.ts`: one rule each.
- `app/web/src/content/lab/rules/index.ts`: `RULES`, in id order.
- `app/web/src/content/lab/rules/rules.test.ts`
- `app/web/src/content/lab/limits.ts`: `MAX_STEPS`, `NAME_MAX`.
- `app/web/src/content/lab/copy.ts`: every lab string, `fillTemplate`, `stepLabel`, `verdictPhrase`, presets.
- `app/web/src/content/lab/copy.test.ts`: content rules.
- `app/web/src/test/noClaims.ts`: `assertNoClaims`, the banned-claims check shared by all phases.
- `app/web/src/test/contrast.ts`: token reader and contrast ratio for tests.
- `app/web/src/components/lab/verdictStyle.ts`, `verdictStyle.test.ts`
- `app/web/src/components/lab/workflowState.ts`, `workflowState.test.ts`
- `app/web/src/components/lab/StepCard.tsx`, `StepCard.test.tsx`
- `app/web/src/lib/ruleSource.ts`, `ruleSource.test.ts`
- `app/web/src/components/lab/WhyDrawer.tsx`, `WhyDrawer.test.tsx`
- `app/web/src/components/lab/VerdictCard.tsx`, `VerdictCard.test.tsx`
- `app/web/src/components/lab/feedbackMarks.tsx`, `feedbackMarks.test.tsx`
- `app/web/src/components/lab/WorkflowBuilder.tsx`, `WorkflowBuilder.test.tsx`, `WorkflowBuilder.marks.test.tsx`, `WorkflowBuilder.stagger.test.tsx`
- `app/web/src/components/lab/SummaryTable.tsx`, `SummaryTable.test.tsx`
- `app/web/src/components/lab/ProgressRail.tsx`, `ProgressRail.test.tsx`
- `app/web/src/lib/labResult.ts`, `labResult.test.ts`
- `app/web/src/components/lab/SendResult.tsx`, `SendResult.test.tsx`
- `app/web/src/components/contact/useLabPrefill.ts`, `useLabPrefill.test.tsx`
- `app/web/src/app/lab/should-this-be-ai/page.tsx`, `page.test.tsx`
- `app/web/tests/e2e/lab.spec.ts`

Edit:

- `app/web/src/components/ui/badge.tsx`: six verdict variants.
- `app/web/src/components/substance/CodeBlock.tsx` and its test: optional `scrollLabel`.
- `app/web/src/components/contact/ContactForm.tsx` and its test: lab prefill, notice, mailto branch.
- `app/web/src/content/nav.ts`: footer entry.
- `app/web/src/app/seo.test.ts`: sitemap includes the lab.
- `app/web/tests/e2e/support.ts`, `a11y.spec.ts`, `routes.spec.ts`, `budgets.spec.ts`, `motion.spec.ts`.

Not edited: `app/web/src/components/motion/Stagger.tsx` (Ruling R-STAGGER). Not created in phase 1: `RecordedRace.tsx` (Ruling R-RACE).

## Shared interfaces (fixed for all four phases)

From `app/web/src/content/lab/rubric.ts`:

```ts
export type Answer = 'yes' | 'no' | 'not-sure' | null
export type Frequency = 'daily' | 'weekly' | 'monthly-or-less' | null
export type QuestionKey =
  'fixedForm' | 'checklist' | 'changes' | 'costly' | 'checkable' | 'pastCases'
export type StepAnswers = Readonly<Record<QuestionKey, Answer>> & {
  readonly frequency: Frequency
}
export type Verdict =
  'plain-code' | 'rules' | 'classic-ml' | 'language-model' | 'do-not-automate' | 'unclear'
export type RuleId =
  | 'R1'
  | 'R2'
  | 'R3'
  | 'R4'
  | 'R5'
  | 'R6'
  | 'R7'
  | 'R8'
  | 'R9'
  | 'R10'
  | 'R11'
  | 'R12'
  | 'R13'
export interface RubricResult {
  readonly verdict: Verdict
  readonly humanSignOff: boolean
  readonly ruleId: RuleId
  readonly why: string
  readonly rubricVersion: string
}
export const RUBRIC_VERSION: string
export function visibleQuestions(answers: StepAnswers): readonly QuestionKey[]
export function classifyStep(answers: StepAnswers): RubricResult
```

From `app/web/src/lib/labResult.ts`: `encodeLabResult(result: LabResult): string` and `decodeLabResult(encoded: string): LabResult | null`. The contact page reads `#lab=<encoded>`.

From `app/web/src/components/lab/feedbackMarks.tsx` (Ruling R-MARKS): `markKey(stepId: string, verdict: Verdict, ruleId: RuleId): string`, `FeedbackMarksProvider`, and `useFeedbackMarks(): { alreadySent: (key: string) => boolean; recordSent: (key: string) => void }`. Phase 3 reads `alreadySent` for each card and calls `recordSent` after a send.

---

## Tasks

### P1-T1: rubric vocabulary and types

Files:

- Create: `app/web/src/content/lab/rubric.ts`
- Create: `app/web/src/content/lab/rubric.test.ts`

Interfaces:

- Consumes: nothing.
- Produces: `Answer`, `Frequency`, `QuestionKey`, `QUESTION_KEYS`, `StepAnswers`, `Verdict`, `VERDICTS`, `RuleId`, `RULE_IDS`, `Rule`, `RubricResult`, `RUBRIC_VERSION`, `EMPTY_ANSWERS`, `visibleQuestions`.

- [ ] Write the failing test `app/web/src/content/lab/rubric.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  EMPTY_ANSWERS,
  QUESTION_KEYS,
  RUBRIC_VERSION,
  RULE_IDS,
  VERDICTS,
  visibleQuestions,
} from './rubric'

describe('rubric vocabulary', () => {
  it('fixes the six verdict ids in the spec order', () => {
    expect(VERDICTS).toEqual([
      'plain-code',
      'rules',
      'classic-ml',
      'language-model',
      'do-not-automate',
      'unclear',
    ])
  })

  it('numbers thirteen rule ids from R1', () => {
    expect(RULE_IDS).toEqual(Array.from({ length: 13 }, (_, i) => `R${String(i + 1)}`))
  })

  it('asks the questions in the spec order, with the checklist follow-up after question 2', () => {
    expect(QUESTION_KEYS).toEqual([
      'fixedForm',
      'checklist',
      'changes',
      'costly',
      'checkable',
      'pastCases',
    ])
  })

  it('shows the checklist follow-up only when question 2 is yes', () => {
    expect(visibleQuestions(EMPTY_ANSWERS)).not.toContain('changes')
    expect(visibleQuestions({ ...EMPTY_ANSWERS, checklist: 'no' })).not.toContain(
      'changes',
    )
    expect(visibleQuestions({ ...EMPTY_ANSWERS, checklist: 'yes' })).toEqual(
      QUESTION_KEYS,
    )
  })

  it('starts every answer unanswered', () => {
    expect(Object.values(EMPTY_ANSWERS).every((value) => value === null)).toBe(true)
    expect(Object.keys(EMPTY_ANSWERS)).toEqual([...QUESTION_KEYS, 'frequency'])
  })

  it('carries a semantic rubric version', () => {
    expect(RUBRIC_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
```

- [ ] Run `pnpm -F web test:run src/content/lab/rubric.test.ts`. Expected: FAIL, `Failed to resolve import "./rubric"`.
- [ ] Implement `app/web/src/content/lab/rubric.ts`:

```ts
export type Answer = 'yes' | 'no' | 'not-sure' | null

export type Frequency = 'daily' | 'weekly' | 'monthly-or-less' | null

export const QUESTION_KEYS = [
  'fixedForm',
  'checklist',
  'changes',
  'costly',
  'checkable',
  'pastCases',
] as const

export type QuestionKey = (typeof QUESTION_KEYS)[number]

export type StepAnswers = Readonly<Record<QuestionKey, Answer>> & {
  readonly frequency: Frequency
}

export const VERDICTS = [
  'plain-code',
  'rules',
  'classic-ml',
  'language-model',
  'do-not-automate',
  'unclear',
] as const

export type Verdict = (typeof VERDICTS)[number]

export const RULE_IDS = [
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
  'R9',
  'R10',
  'R11',
  'R12',
  'R13',
] as const

export type RuleId = (typeof RULE_IDS)[number]

export interface Rule {
  readonly id: RuleId
  readonly reads: readonly QuestionKey[]
  readonly verdict: Verdict
  readonly why: string
  readonly when: (answers: StepAnswers) => boolean
  readonly humanSignOff: (answers: StepAnswers) => boolean
}

export interface RubricResult {
  readonly verdict: Verdict
  readonly humanSignOff: boolean
  readonly ruleId: RuleId
  readonly why: string
  readonly rubricVersion: string
}

export const RUBRIC_VERSION = '2.0.0'

export const EMPTY_ANSWERS: StepAnswers = {
  fixedForm: null,
  checklist: null,
  changes: null,
  costly: null,
  checkable: null,
  pastCases: null,
  frequency: null,
}

export function visibleQuestions(answers: StepAnswers): readonly QuestionKey[] {
  return QUESTION_KEYS.filter((key) => key !== 'changes' || answers.checklist === 'yes')
}
```

- [ ] Run `pnpm -F web test:run src/content/lab/rubric.test.ts`. Expected: `6 passed`.
- [ ] Run the four global checks (tsc, lint, `pnpm -F web test:run`, prettier on both paths). Expected: all pass.
- [ ] Commit:

```
git add app/web/src/content/lab/rubric.ts app/web/src/content/lab/rubric.test.ts
git commit -m "feat(lab): add the rubric vocabulary and shared types"
```

### P1-T2: rules R1, R3 and R4 (unknown cost, check and form)

Files:

- Create: `app/web/src/content/lab/rules/R1.ts`, `R3.ts`, `R4.ts`
- Create: `app/web/src/content/lab/rules/rules.test.ts`

Interfaces:

- Consumes: `Rule`, `StepAnswers`, `EMPTY_ANSWERS` from P1-T1.
- Produces: `R1`, `R3`, `R4` (each `Rule`); the `given`, `UNKNOWN`, `SAFE`, `UNCHECKED`, `KNOWN_GATES` and `UNKNOWN_GATES` helpers in `rules.test.ts`, used by P1-T3 to P1-T5.

Every rule file imports only `import type { Rule } from '../rubric'`, so `rubric.ts` can import the rules in P1-T6 without a runtime cycle.

The thirteen rules follow Ruling R-TREE. Two clauses recur and are written inline in every rule that uses them (Ruling R-EXCLUSIVE):

- known gates: `(a.costly === 'no' || (a.costly === 'yes' && (a.checkable === 'yes' || a.checkable === 'no')))`, the cost of a mistake is known and, when costly, so is the check;
- safe: `(a.costly === 'no' || (a.costly === 'yes' && a.checkable === 'yes'))`, a mistake is cheap or a person checks first.

Every tool verdict (`plain-code`, `rules`, `classic-ml`, `language-model`) uses `humanSignOff: (a) => a.costly === 'yes' && a.checkable === 'yes'`; every `unclear` and `do-not-automate` rule uses `humanSignOff: () => false` (Ruling R-SIGNOFF).

- [ ] Write the failing test `app/web/src/content/lab/rules/rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { EMPTY_ANSWERS, type Answer, type StepAnswers } from '../rubric'
import { R1 } from './R1'
import { R3 } from './R3'
import { R4 } from './R4'

const UNKNOWN: readonly Answer[] = [null, 'not-sure']
const SAFE: readonly Partial<StepAnswers>[] = [
  { costly: 'no' },
  { costly: 'yes', checkable: 'yes' },
]
const UNCHECKED: Partial<StepAnswers> = { costly: 'yes', checkable: 'no' }
const KNOWN_GATES: readonly Partial<StepAnswers>[] = [...SAFE, UNCHECKED]
const UNKNOWN_GATES: readonly Partial<StepAnswers>[] = [
  { costly: null },
  { costly: 'not-sure' },
  { costly: 'yes', checkable: null },
  { costly: 'yes', checkable: 'not-sure' },
]

function given(partial: Partial<StepAnswers>): StepAnswers {
  return { ...EMPTY_ANSWERS, ...partial }
}

describe('R1: the cost of a mistake is unknown', () => {
  it.each(UNKNOWN)('fires when costly is %s', (costly) => {
    expect(R1.when(given({ costly }))).toBe(true)
  })
  it.each(['yes', 'no'] as const)('stays silent when costly is %s', (costly) => {
    expect(R1.when(given({ costly }))).toBe(false)
  })
  it('says unclear with no sign-off', () => {
    expect(R1.verdict).toBe('unclear')
    expect(R1.humanSignOff(given({}))).toBe(false)
  })
})

describe('R3: costly and the check is unknown', () => {
  it.each(UNKNOWN)('fires when checkable is %s', (checkable) => {
    expect(R3.when(given({ costly: 'yes', checkable }))).toBe(true)
  })
  it.each(['yes', 'no'] as const)('stays silent when checkable is %s', (checkable) => {
    expect(R3.when(given({ costly: 'yes', checkable }))).toBe(false)
  })
  it('stays silent when a mistake is cheap', () => {
    expect(R3.when(given({ costly: 'no', checkable: null }))).toBe(false)
  })
  it('says unclear', () => {
    expect(R3.verdict).toBe('unclear')
  })
})

describe('R4: the form is unknown once the cost gates are known', () => {
  it.each(
    KNOWN_GATES.flatMap((gate) => UNKNOWN.map((fixedForm) => ({ ...gate, fixedForm }))),
  )('fires for %o', (partial) => {
    expect(R4.when(given(partial))).toBe(true)
  })
  it.each(UNKNOWN_GATES)('stays silent while a cost gate is unknown: %o', (partial) => {
    expect(R4.when(given({ ...partial, fixedForm: null }))).toBe(false)
  })
  it.each(['yes', 'no'] as const)('stays silent when fixedForm is %s', (fixedForm) => {
    expect(R4.when(given({ costly: 'no', fixedForm }))).toBe(false)
  })
  it('says unclear', () => {
    expect(R4.verdict).toBe('unclear')
  })
})
```

- [ ] Run `pnpm -F web test:run src/content/lab/rules`. Expected: FAIL, `Failed to resolve import "./R1"`.
- [ ] Implement the three files. Template (R3 shown in full; the others follow the table):

```ts
import type { Rule } from '../rubric'

export const R3: Rule = {
  id: 'R3',
  reads: ['costly', 'checkable'],
  when: (a) => a.costly === 'yes' && a.checkable !== 'yes' && a.checkable !== 'no',
  verdict: 'unclear',
  humanSignOff: () => false,
  why: 'A mistake here is costly. Whether a person can check the result first decides between automating with a sign-off and keeping a person on it. Answer question 4.',
}
```

| File    | reads                                  | when                                                                                                                                                         | verdict     | humanSignOff  | why                                                                                                         |
| ------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| `R1.ts` | `['costly']`                           | `(a) => a.costly !== 'yes' && a.costly !== 'no'`                                                                                                             | `'unclear'` | `() => false` | `We need to know what a mistake here would cost before we can suggest a tool. Answer question 3.`           |
| `R4.ts` | `['costly', 'checkable', 'fixedForm']` | `(a) => (a.costly === 'no' \|\| (a.costly === 'yes' && (a.checkable === 'yes' \|\| a.checkable === 'no'))) && a.fixedForm !== 'yes' && a.fixedForm !== 'no'` | `'unclear'` | `() => false` | `Whether the information and the result both come in a fixed form decides most of this. Answer question 1.` |

(The `\|` in the table is a pipe; write `||` in code.)

- [ ] Run `pnpm -F web test:run src/content/lab/rules`. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/content/lab/rules/R1.ts app/web/src/content/lab/rules/R3.ts app/web/src/content/lab/rules/R4.ts app/web/src/content/lab/rules/rules.test.ts
git commit -m "feat(lab): add rubric rules R1, R3 and R4 for unknown cost, check and form"
```

### P1-T3: rules R2, R6 and R12 (unknown checklist, costly and unchecked)

Files:

- Create: `app/web/src/content/lab/rules/R2.ts`, `R6.ts`, `R12.ts`
- Edit: `app/web/src/content/lab/rules/rules.test.ts`

Interfaces:

- Consumes: `Rule` (P1-T1); the test helpers from P1-T2.
- Produces: `R2`, `R6`, `R12`.

| File     | reads                                               | when                                                                                                                               | verdict             | humanSignOff  | why                                                                                                                                                                                                                                                                  |
| -------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `R2.ts`  | `['costly', 'checkable', 'fixedForm', 'checklist']` | `(a) => a.costly === 'yes' && a.checkable === 'no' && (a.fixedForm === 'no' \|\| (a.fixedForm === 'yes' && a.checklist === 'no'))` | `'do-not-automate'` | `() => false` | `A mistake here is costly, nobody can check the result before it takes effect, and the decision is not a fixed checklist. The judgment is the job, so keep a person on it.`                                                                                          |
| `R6.ts`  | `['costly', 'checkable', 'fixedForm', 'checklist']` | known gates `&& a.fixedForm === 'yes' && a.checklist !== 'yes' && a.checklist !== 'no'`                                            | `'unclear'`         | `() => false` | `The information and the result both come in a fixed form. Whether you could write the decision as a checklist decides the rest. Answer question 2.`                                                                                                                 |
| `R12.ts` | `['costly', 'checkable', 'fixedForm', 'checklist']` | `(a) => a.costly === 'yes' && a.checkable === 'no' && a.fixedForm === 'yes' && a.checklist === 'yes'`                              | `'plain-code'`      | sign-off rule | `The information and the result both come in a fixed form and the decision is a checklist, so a simple program applies it the same way every time. A mistake is costly and nobody checks the result first, so test the program on past cases before you rely on it.` |

(The `\|` in the table is a pipe; write `||` in code. R12's sign-off rule is always `false` for its own answers, because `checkable` is `no`; it keeps the shared tool-verdict form so the P1-T6 proof reads one rule.)

- [ ] Append failing tests to `rules.test.ts` (add the three imports at the top):

```ts
describe('R2: costly, unchecked, and not a fixed checklist', () => {
  it.each([
    { fixedForm: 'no', checklist: null },
    { fixedForm: 'no', checklist: 'yes' },
    { fixedForm: 'yes', checklist: 'no' },
  ] as const)('fires for %o', (partial) => {
    expect(R2.when(given({ ...UNCHECKED, ...partial }))).toBe(true)
  })
  it.each([
    { fixedForm: 'yes', checklist: 'yes' },
    { fixedForm: 'yes', checklist: null },
    { fixedForm: null, checklist: 'no' },
  ] as const)('stays silent for %o', (partial) => {
    expect(R2.when(given({ ...UNCHECKED, ...partial }))).toBe(false)
  })
  it.each(SAFE)('stays silent when the step is safe: %o', (partial) => {
    expect(R2.when(given({ ...partial, fixedForm: 'no' }))).toBe(false)
  })
  it('keeps a person on it with no sign-off', () => {
    expect(R2.verdict).toBe('do-not-automate')
    expect(R2.humanSignOff(given({ ...UNCHECKED, fixedForm: 'no' }))).toBe(false)
  })
})

describe('R6: fixed form, checklist unknown', () => {
  it.each(
    KNOWN_GATES.flatMap((gate) => UNKNOWN.map((checklist) => ({ ...gate, checklist }))),
  )('fires for %o', (partial) => {
    expect(R6.when(given({ ...partial, fixedForm: 'yes' }))).toBe(true)
  })
  it.each(['yes', 'no'] as const)('stays silent when checklist is %s', (checklist) => {
    expect(R6.when(given({ costly: 'no', fixedForm: 'yes', checklist }))).toBe(false)
  })
  it.each(UNKNOWN_GATES)('stays silent while a cost gate is unknown: %o', (partial) => {
    expect(R6.when(given({ ...partial, fixedForm: 'yes' }))).toBe(false)
  })
  it('stays silent on free text', () => {
    expect(R6.when(given({ costly: 'no', fixedForm: 'no' }))).toBe(false)
  })
})

describe('R12: costly and unchecked, but a fixed-form checklist', () => {
  it('fires on the exact combination, whatever the follow-up says', () => {
    for (const changes of ['yes', 'no', 'not-sure', null] as const) {
      expect(
        R12.when(given({ ...UNCHECKED, fixedForm: 'yes', checklist: 'yes', changes })),
      ).toBe(true)
    }
  })
  it.each(SAFE)('stays silent when the step is safe: %o', (partial) => {
    expect(R12.when(given({ ...partial, fixedForm: 'yes', checklist: 'yes' }))).toBe(
      false,
    )
  })
  it('says a simple program with no sign-off and tells the visitor to test it', () => {
    expect(R12.verdict).toBe('plain-code')
    expect(
      R12.humanSignOff(given({ ...UNCHECKED, fixedForm: 'yes', checklist: 'yes' })),
    ).toBe(false)
    expect(R12.why).toMatch(/past cases/)
  })
})
```

- [ ] Run `pnpm -F web test:run src/content/lab/rules`. Expected: FAIL, `Failed to resolve import "./R2"`.
- [ ] Implement the three files per the table, in the R3 shape from P1-T2. "known gates" is the clause from P1-T2; "sign-off rule" is `(a) => a.costly === 'yes' && a.checkable === 'yes'`.
- [ ] Run `pnpm -F web test:run src/content/lab/rules`. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/content/lab/rules/R2.ts app/web/src/content/lab/rules/R6.ts app/web/src/content/lab/rules/R12.ts app/web/src/content/lab/rules/rules.test.ts
git commit -m "feat(lab): add rubric rules R2, R6 and R12 for costly unchecked steps"
```

### P1-T4: rules R7, R8 and R13 (a safe fixed-form checklist and how often it changes)

Files:

- Create: `app/web/src/content/lab/rules/R7.ts`, `R8.ts`, `R13.ts`
- Edit: `app/web/src/content/lab/rules/rules.test.ts`

Interfaces:

- Consumes: `Rule` (P1-T1); the test helpers from P1-T2.
- Produces: `R7`, `R8`, `R13`.

All three use reads `['costly', 'checkable', 'fixedForm', 'checklist', 'changes']` and the safe clause, then `&& a.fixedForm === 'yes' && a.checklist === 'yes' && …`:

| File     | last condition                              | verdict        | humanSignOff  | why                                                                                                                                                                                                                                |
| -------- | ------------------------------------------- | -------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `R7.ts`  | `a.changes === 'no'`                        | `'plain-code'` | sign-off rule | `The information and the result both come in a fixed form, the decision is a checklist your team rarely changes, and a mistake is cheap or checked first. A simple program does this the same way every time.`                     |
| `R8.ts`  | `a.changes === 'yes'`                       | `'rules'`      | sign-off rule | `The information and the result both come in a fixed form and the decision is a checklist, but your team changes it more than a few times a year. Keep the checklist where your team can read and change it without a programmer.` |
| `R13.ts` | `a.changes !== 'yes' && a.changes !== 'no'` | `'unclear'`    | `() => false` | `The decision is a checklist. How often your team changes it decides between a simple program and a checklist your team can edit. Answer the follow-up to question 2.`                                                             |

- [ ] Append failing tests to `rules.test.ts` (add the three imports at the top):

```ts
const CHECKLIST = { fixedForm: 'yes', checklist: 'yes' } as const

describe('R7, R8 and R13: a safe fixed-form checklist', () => {
  it.each(SAFE)('R7 fires when the team rarely changes it: %o', (partial) => {
    expect(R7.when(given({ ...partial, ...CHECKLIST, changes: 'no' }))).toBe(true)
    expect(R7.verdict).toBe('plain-code')
  })
  it.each(SAFE)('R8 fires when the team changes it often: %o', (partial) => {
    expect(R8.when(given({ ...partial, ...CHECKLIST, changes: 'yes' }))).toBe(true)
    expect(R8.verdict).toBe('rules')
  })
  it.each(UNKNOWN)('R13 fires when changes is %s', (changes) => {
    expect(R13.when(given({ costly: 'no', ...CHECKLIST, changes }))).toBe(true)
    expect(R13.verdict).toBe('unclear')
  })
  it('signs off only when a mistake is costly and checked first', () => {
    for (const [rule, changes] of [
      [R7, 'no'],
      [R8, 'yes'],
    ] as const) {
      expect(rule.humanSignOff(given({ costly: 'no', ...CHECKLIST, changes }))).toBe(
        false,
      )
      expect(
        rule.humanSignOff(
          given({ costly: 'yes', checkable: 'yes', ...CHECKLIST, changes }),
        ),
      ).toBe(true)
    }
    expect(
      R13.humanSignOff(given({ costly: 'yes', checkable: 'yes', ...CHECKLIST })),
    ).toBe(false)
  })
  it.each([UNCHECKED, ...UNKNOWN_GATES])(
    'all three stay silent unless the step is safe: %o',
    (partial) => {
      for (const changes of ['yes', 'no', null] as const) {
        for (const rule of [R7, R8, R13]) {
          expect(rule.when(given({ ...partial, ...CHECKLIST, changes }))).toBe(false)
        }
      }
    },
  )
  it('all three stay silent without a fixed-form checklist', () => {
    for (const rule of [R7, R8, R13]) {
      expect(
        rule.when(
          given({ costly: 'no', fixedForm: 'no', checklist: 'yes', changes: 'no' }),
        ),
      ).toBe(false)
      expect(
        rule.when(
          given({ costly: 'no', fixedForm: 'yes', checklist: 'no', changes: 'no' }),
        ),
      ).toBe(false)
    }
  })
})
```

- [ ] Run `pnpm -F web test:run src/content/lab/rules`. Expected: FAIL, `Failed to resolve import "./R7"`.
- [ ] Implement the three files per the table, in the R3 shape from P1-T2. "sign-off rule" is `(a) => a.costly === 'yes' && a.checkable === 'yes'`.
- [ ] Run `pnpm -F web test:run src/content/lab/rules`. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/content/lab/rules/R7.ts app/web/src/content/lab/rules/R8.ts app/web/src/content/lab/rules/R13.ts app/web/src/content/lab/rules/rules.test.ts
git commit -m "feat(lab): add rubric rules R7, R8 and R13 for checklists and how often they change"
```

### P1-T5: rules R5, R9, R10 and R11 (free text and past cases)

Files:

- Create: `app/web/src/content/lab/rules/R5.ts`, `R9.ts`, `R10.ts`, `R11.ts`
- Edit: `app/web/src/content/lab/rules/rules.test.ts`

Ruling: keep four source files in one task, because each is one exported constant of about ten lines and all four share the safe clause and one test block (cost if wrong: one larger commit to review; splitting R5 into its own task later is a move, not a rewrite).

Interfaces:

- Consumes: `Rule` (P1-T1); the test helpers from P1-T2.
- Produces: `R5`, `R9`, `R10`, `R11`.

`R5` reads `['costly', 'checkable', 'fixedForm']` and is the safe clause `&& a.fixedForm === 'no'`. `R9` to `R11` read `['costly', 'checkable', 'fixedForm', 'checklist', 'pastCases']` and are the safe clause, then `&& a.fixedForm === 'yes' && a.checklist === 'no' && …`:

| File     | last condition                                  | verdict             | humanSignOff  | why                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | ----------------------------------------------- | ------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `R5.ts`  | `a.fixedForm === 'no'`                          | `'language-model'`  | sign-off rule | `The information or the result is free text, such as emails, PDFs, photos or written paragraphs. Reading and writing text is what a language model does well. Use it to read and pull out the facts. If the decision after the reading needs judgment or affects a person, such as hiring or pricing, make that its own step and answer the questions again for it.` |
| `R9.ts`  | `a.pastCases !== 'yes' && a.pastCases !== 'no'` | `'unclear'`         | `() => false` | `There is no checklist for this decision, so it depends on whether you have enough past cases to learn from. Answer question 5.`                                                                                                                                                                                                                                     |
| `R10.ts` | `a.pastCases === 'yes'`                         | `'classic-ml'`      | sign-off rule | `There is no checklist, but you have a record of past cases where you know the right answer. A model trained on that record can predict the next one.`                                                                                                                                                                                                               |
| `R11.ts` | `a.pastCases === 'no'`                          | `'do-not-automate'` | `() => false` | `There is no checklist and no record of right answers to learn from, so for now the judgment is the job. Keeping a record of each decision is the first step to automating it later.`                                                                                                                                                                                |

- [ ] Append failing tests to `rules.test.ts` (add the four imports at the top):

```ts
describe('R5: free text once the step is safe', () => {
  it.each(SAFE)('fires on free text: %o', (partial) => {
    expect(R5.when(given({ ...partial, fixedForm: 'no' }))).toBe(true)
  })
  it.each([UNCHECKED, ...UNKNOWN_GATES])(
    'stays silent unless the step is safe: %o',
    (partial) => {
      expect(R5.when(given({ ...partial, fixedForm: 'no' }))).toBe(false)
    },
  )
  it('signs off only when a mistake is costly and checked first', () => {
    expect(
      R5.humanSignOff(given({ costly: 'yes', checkable: 'yes', fixedForm: 'no' })),
    ).toBe(true)
    expect(R5.humanSignOff(given({ costly: 'no', fixedForm: 'no' }))).toBe(false)
  })
  it('says a language model', () => {
    expect(R5.verdict).toBe('language-model')
  })
})

const NO_CHECKLIST = { costly: 'no', fixedForm: 'yes', checklist: 'no' } as const

describe('R9 to R11: fixed input with no checklist', () => {
  it.each(UNKNOWN)('R9 fires when pastCases is %s', (pastCases) => {
    expect(R9.when(given({ ...NO_CHECKLIST, pastCases }))).toBe(true)
    expect(R9.verdict).toBe('unclear')
  })
  it('R10 fires with past cases and signs off only when costly', () => {
    expect(R10.when(given({ ...NO_CHECKLIST, pastCases: 'yes' }))).toBe(true)
    expect(R10.verdict).toBe('classic-ml')
    expect(R10.humanSignOff(given({ ...NO_CHECKLIST, pastCases: 'yes' }))).toBe(false)
    expect(
      R10.humanSignOff(
        given({ ...NO_CHECKLIST, costly: 'yes', checkable: 'yes', pastCases: 'yes' }),
      ),
    ).toBe(true)
  })
  it('R11 fires with no past cases and keeps a person on it', () => {
    expect(R11.when(given({ ...NO_CHECKLIST, pastCases: 'no' }))).toBe(true)
    expect(R11.verdict).toBe('do-not-automate')
    expect(R11.humanSignOff(given({ ...NO_CHECKLIST, pastCases: 'no' }))).toBe(false)
  })
  it.each([UNCHECKED, ...UNKNOWN_GATES])(
    'all three stay silent unless the step is safe: %o',
    (partial) => {
      for (const rule of [R9, R10, R11]) {
        expect(
          rule.when(
            given({ ...partial, fixedForm: 'yes', checklist: 'no', pastCases: 'yes' }),
          ),
        ).toBe(false)
      }
    },
  )
})
```

- [ ] Run `pnpm -F web test:run src/content/lab/rules`. Expected: FAIL, `Failed to resolve import "./R5"`.
- [ ] Implement the four rules per the table, in the R3 shape from P1-T2. "sign-off rule" is `(a) => a.costly === 'yes' && a.checkable === 'yes'`.
- [ ] Run `pnpm -F web test:run src/content/lab/rules`. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/content/lab/rules/R5.ts app/web/src/content/lab/rules/R9.ts app/web/src/content/lab/rules/R10.ts app/web/src/content/lab/rules/R11.ts app/web/src/content/lab/rules/rules.test.ts
git commit -m "feat(lab): add rubric rules R5 and R9 to R11 for free text and past cases"
```

### P1-T6: the rule list, classifyStep and the exhaustive rubric proof

Files:

- Create: `app/web/src/content/lab/rules/index.ts`
- Edit: `app/web/src/content/lab/rubric.ts`
- Edit: `app/web/src/content/lab/rubric.test.ts`, `app/web/src/content/lab/rules/rules.test.ts`

Interfaces:

- Consumes: `R1` to `R13` (P1-T2 to P1-T5).
- Produces: `RULES: readonly Rule[]` and `RULE_VERDICT: Readonly<Record<RuleId, Verdict>>` (a literal object) from `rules/index.ts`, in `RULE_IDS` order; `classifyStep(answers: StepAnswers): RubricResult`, `getRule(id: RuleId): Rule`.

`rules/index.ts`:

```ts
import type { Rule } from '../rubric'
import { R1 } from './R1'
import { R10 } from './R10'
import { R11 } from './R11'
import { R12 } from './R12'
import { R13 } from './R13'
import { R2 } from './R2'
import { R3 } from './R3'
import { R4 } from './R4'
import { R5 } from './R5'
import { R6 } from './R6'
import { R7 } from './R7'
import { R8 } from './R8'
import { R9 } from './R9'

export const RULES: readonly Rule[] = [
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
]

export const RULE_VERDICT: Readonly<Record<RuleId, Verdict>> = {
  R1: 'unclear',
  R2: 'do-not-automate',
  R3: 'unclear',
  R4: 'unclear',
  R5: 'language-model',
  R6: 'unclear',
  R7: 'plain-code',
  R8: 'rules',
  R9: 'unclear',
  R10: 'classic-ml',
  R11: 'do-not-automate',
  R12: 'plain-code',
  R13: 'unclear',
}
```

`RULE_VERDICT` is a literal object so the phase 3 drift test can read it as text. Change the first line of the file to `import type { Rule, RuleId, Verdict } from '../rubric'`.

- [ ] Append failing tests to `rules.test.ts` (import `RULES` and `RULE_VERDICT` from `./index` and `RULE_IDS` from `../rubric`):

```ts
describe('RULES', () => {
  it('lists every rule once, in id order', () => {
    expect(RULES.map((rule) => rule.id)).toEqual(RULE_IDS)
  })

  it('RULE_VERDICT matches every rule verdict', () => {
    for (const rule of RULES) {
      expect(RULE_VERDICT[rule.id]).toBe(rule.verdict)
    }
    expect(Object.keys(RULE_VERDICT)).toEqual([...RULE_IDS])
  })
  it('gives every rule a plain reason', () => {
    for (const rule of RULES) {
      expect(rule.why.length, rule.id).toBeGreaterThan(20)
    }
  })
})
```

- [ ] Append failing tests to `rubric.test.ts` (extend the import from `./rubric` with `classifyStep`, `getRule`, `type Answer`, `type StepAnswers`; import `RULES` from `./rules`):

```ts
const VALUES: readonly Answer[] = ['yes', 'no', 'not-sure', null]

function everyAnswerSet(): StepAnswers[] {
  return QUESTION_KEYS.reduce<StepAnswers[]>(
    (sets, key) =>
      sets.flatMap((set) => VALUES.map((value) => ({ ...set, [key]: value }))),
    [EMPTY_ANSWERS],
  )
}

const ALL = everyAnswerSet()

describe('classifyStep', () => {
  it('covers all 4,096 answer sets', () => {
    expect(ALL).toHaveLength(4096)
  })

  it('matches exactly one rule for every answer set', () => {
    for (const answers of ALL) {
      const matching = RULES.filter((rule) => rule.when(answers)).map((rule) => rule.id)
      expect(matching, JSON.stringify(answers)).toHaveLength(1)
    }
  })

  it('returns the matching rule, its reason and the rubric version', () => {
    for (const answers of ALL) {
      const result = classifyStep(answers)
      const rule = getRule(result.ruleId)
      expect(rule.when(answers)).toBe(true)
      expect(result.verdict).toBe(rule.verdict)
      expect(result.why).toBe(rule.why)
      expect(result.rubricVersion).toBe(RUBRIC_VERSION)
    }
  })

  it('gives unclear only when an answer the matching rule reads is missing or not sure', () => {
    for (const answers of ALL) {
      const result = classifyStep(answers)
      if (result.verdict !== 'unclear') continue
      const known = getRule(result.ruleId).reads.every(
        (key) => answers[key] === 'yes' || answers[key] === 'no',
      )
      expect(known, JSON.stringify(answers)).toBe(false)
    }
  })

  it('never changes a firm verdict when a missing or not-sure answer is filled in', () => {
    for (const answers of ALL) {
      const result = classifyStep(answers)
      if (result.verdict === 'unclear') continue
      const open = QUESTION_KEYS.filter(
        (key) => answers[key] !== 'yes' && answers[key] !== 'no',
      )
      for (const key of open) {
        for (const value of ['yes', 'no'] as const) {
          expect(
            classifyStep({ ...answers, [key]: value }).verdict,
            JSON.stringify({ answers, key, value }),
          ).toBe(result.verdict)
        }
      }
    }
  })

  it('keeps a person on a costly unchecked step unless it is a fixed-form checklist', () => {
    for (const answers of ALL.filter((a) => a.costly === 'yes' && a.checkable === 'no')) {
      const result = classifyStep(answers)
      const fixedChecklist = answers.fixedForm === 'yes' && answers.checklist === 'yes'
      const notChecklist =
        answers.fixedForm === 'no' ||
        (answers.fixedForm === 'yes' && answers.checklist === 'no')
      if (fixedChecklist) {
        expect(result.ruleId, JSON.stringify(answers)).toBe('R12')
      } else if (notChecklist) {
        expect(result.verdict, JSON.stringify(answers)).toBe('do-not-automate')
      } else {
        expect(result.verdict, JSON.stringify(answers)).toBe('unclear')
      }
    }
  })

  it('adds sign-off exactly when the verdict is a tool and a costly mistake is checked first', () => {
    for (const answers of ALL) {
      const result = classifyStep(answers)
      const tool = result.verdict !== 'do-not-automate' && result.verdict !== 'unclear'
      expect(result.humanSignOff, JSON.stringify(answers)).toBe(
        tool && answers.costly === 'yes' && answers.checkable === 'yes',
      )
    }
  })

  it('ignores how often the step happens', () => {
    for (const frequency of ['daily', 'weekly', 'monthly-or-less', null] as const) {
      expect(
        classifyStep({ ...EMPTY_ANSWERS, costly: 'no', fixedForm: 'no', frequency })
          .ruleId,
      ).toBe('R5')
    }
  })

  it.each(RULES)('$id reads exactly the answers its condition uses', (rule) => {
    const source = rule.when.toString()
    const used = QUESTION_KEYS.filter((key) => source.includes(`.${key}`))
    expect(new Set(rule.reads)).toEqual(new Set(used))
  })

  it('throws for an unknown rule id', () => {
    expect(() => getRule('R99' as never)).toThrow(/R99/)
  })
})

describe('classifyStep on worked examples', () => {
  it.each([
    {
      example: 'read supplier invoice PDFs before payment',
      answers: { fixedForm: 'no', costly: 'yes', checkable: 'yes' },
      ruleId: 'R5',
      verdict: 'language-model',
      humanSignOff: true,
    },
    {
      example: 'sort incoming support emails by topic',
      answers: { fixedForm: 'no', costly: 'no' },
      ruleId: 'R5',
      verdict: 'language-model',
      humanSignOff: false,
    },
    {
      example: 'quote a job from the rate card with no check before it is sent',
      answers: {
        fixedForm: 'yes',
        checklist: 'yes',
        changes: 'no',
        costly: 'yes',
        checkable: 'no',
      },
      ruleId: 'R12',
      verdict: 'plain-code',
      humanSignOff: false,
    },
    {
      example: 'auto-approve refunds under a set limit with no check',
      answers: {
        fixedForm: 'yes',
        checklist: 'yes',
        changes: 'yes',
        costly: 'yes',
        checkable: 'no',
      },
      ruleId: 'R12',
      verdict: 'plain-code',
      humanSignOff: false,
    },
    {
      example: 'pick a shipping rate from a table the team edits monthly',
      answers: { fixedForm: 'yes', checklist: 'yes', changes: 'yes', costly: 'no' },
      ruleId: 'R8',
      verdict: 'rules',
      humanSignOff: false,
    },
    {
      example:
        'write the monthly report from a spreadsheet: the input is a spreadsheet but the result is written paragraphs, so fixedForm is no',
      answers: {
        fixedForm: 'no',
        checklist: 'no',
        costly: 'yes',
        checkable: 'yes',
        pastCases: 'yes',
        frequency: 'monthly-or-less',
      },
      ruleId: 'R5',
      verdict: 'language-model',
      humanSignOff: true,
    },
    {
      example: 'screen job applicant CVs for a shortlist',
      answers: { fixedForm: 'no', costly: 'yes', checkable: 'yes' },
      ruleId: 'R5',
      verdict: 'language-model',
      humanSignOff: true,
    },
  ] as const)('$example gives $verdict', ({ answers, ruleId, verdict, humanSignOff }) => {
    const result = classifyStep({ ...EMPTY_ANSWERS, ...answers })
    expect(result.ruleId).toBe(ruleId)
    expect(result.verdict).toBe(verdict)
    expect(result.humanSignOff).toBe(humanSignOff)
  })
})
```

- [ ] Run `pnpm -F web test:run src/content/lab/rubric.test.ts src/content/lab/rules`. Expected: FAIL, `Failed to resolve import "./index"` in `rules.test.ts` and `classifyStep is not a function` (or a missing export error) in `rubric.test.ts`.
- [ ] Create `rules/index.ts` as above.
- [ ] Implement in `rubric.ts`: add `import { RULES } from './rules'` at the top and append:

```ts
export function getRule(id: RuleId): Rule {
  const rule = RULES.find((candidate) => candidate.id === id)
  if (rule === undefined) throw new Error(`Unknown rubric rule id: ${id}`)
  return rule
}

export function classifyStep(answers: StepAnswers): RubricResult {
  const rule = RULES.find((candidate) => candidate.when(answers))
  if (rule === undefined) {
    throw new Error(
      `No rubric rule matched ${JSON.stringify(answers)}; the rules must be total`,
    )
  }
  return {
    verdict: rule.verdict,
    humanSignOff: rule.humanSignOff(answers),
    ruleId: rule.id,
    why: rule.why,
    rubricVersion: RUBRIC_VERSION,
  }
}
```

- [ ] Run `pnpm -F web test:run src/content/lab`. Expected: all pass, including `rules.test.ts`.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/content/lab/rules/index.ts app/web/src/content/lab/rules/rules.test.ts app/web/src/content/lab/rubric.ts app/web/src/content/lab/rubric.test.ts
git commit -m "feat(lab): classify a step by the one rule that matches its answers"
```

### P1-T7: lab copy and its content test

Files:

- Create: `app/web/src/content/lab/copy.ts`, `app/web/src/content/lab/limits.ts`, `app/web/src/test/noClaims.ts`
- Create: `app/web/src/content/lab/copy.test.ts`

Interfaces:

- Consumes: `Verdict`, `QuestionKey`, `Answer`, `Frequency` types (P1-T1); `RULES` (P1-T6) in the test only.
- Produces: `assertNoClaims(text: string): void` from `app/web/src/test/noClaims.ts` (Ruling R-CLAIMS); `labPageCopy`, `verdictCopy`, `signOffCopy`, `questionCopy`, `frequencyQuestionCopy`, `answerCopy`, `frequencyCopy`, `builderCopy`, `statusCopy`, `whyCopy`, `summaryCopy`, `progressCopy`, `sendCopy`, `contactLabCopy`, `fillTemplate`, `stepLabel`, `verdictPhrase`; `MAX_STEPS = 8`, `NAME_MAX = 60`.

- [ ] Write the failing test `app/web/src/content/lab/copy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { assertNoClaims } from '@/test/noClaims'
import * as copyModule from './copy'
import { fillTemplate, questionCopy, stepLabel, verdictCopy, verdictPhrase } from './copy'
import { RULES } from './rules'

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value !== null && typeof value === 'object')
    return Object.values(value).flatMap(strings)
  return []
}

const ALL_TEXT = [...strings(Object.values(copyModule)), ...RULES.map((rule) => rule.why)]

describe('lab copy', () => {
  it('makes no client, team-size, percent or outcome claim in copy.ts or any rule reason', () => {
    expect(RULES).toHaveLength(13)
    for (const text of ALL_TEXT) {
      assertNoClaims(text)
    }
  })

  it.each([
    'Built for Medicare teams',
    'Our franchise partners',
    'Trusted by our clients',
    'A team of 40 engineers',
    'Cuts errors by 30%',
    'Saves you time every week',
    'Guaranteed results',
  ])('the claims check rejects "%s"', (claim) => {
    expect(() => {
      assertNoClaims(claim)
    }).toThrow()
  })

  it('uses the verdict labels and glosses the spec fixes', () => {
    expect(verdictCopy).toEqual({
      'plain-code': { label: 'A simple program', gloss: 'Fixed steps, no judgment' },
      rules: { label: 'A checklist your team can edit', gloss: 'If this, then that' },
      'classic-ml': {
        label: 'A model trained on your past cases',
        gloss: 'Predicts from history',
      },
      'language-model': { label: 'An AI language model', gloss: 'Reads and writes text' },
      'do-not-automate': {
        label: 'Keep a person on it',
        gloss: 'The judgment is the job',
      },
      unclear: {
        label: 'Worth a conversation',
        gloss: 'Answer the not-sure questions to sharpen this',
      },
    })
  })

  it('asks question 1 about both the information and the result', () => {
    expect(questionCopy.fixedForm.text).toBe(
      'Do the information it uses and the result it produces both come in a fixed form, like spreadsheet rows or form fields, rather than emails, PDFs, photos or written paragraphs?',
    )
    expect(questionCopy.fixedForm.example).toMatch(/the result is a written reply\.$/)
  })

  it('asks follow-up 2b about changes the team makes itself', () => {
    expect(questionCopy.changes.text).toBe(
      'Does your team change this checklist themselves, more than a few times a year, such as prices, limits or who qualifies?',
    )
  })

  it('fills template slots and throws on a missing one', () => {
    expect(fillTemplate('Step {n}', { n: 2 })).toBe('Step 2')
    expect(() => fillTemplate('Step {n}', {})).toThrow(/\{n\}/)
  })

  it('labels a step with and without a name', () => {
    expect(stepLabel(2, '')).toBe('Step 2')
    expect(stepLabel(2, '  Send invoices ')).toBe('Step 2, Send invoices')
  })

  it('phrases a verdict for the status region in lower case with the modifier', () => {
    expect(verdictPhrase('plain-code', false)).toBe('a simple program')
    expect(verdictPhrase('rules', true)).toBe(
      'a checklist your team can edit + human sign-off',
    )
  })
})
```

- [ ] Run `pnpm -F web test:run src/content/lab/copy.test.ts`. Expected: FAIL, `Failed to resolve import "@/test/noClaims"`.
- [ ] Implement `app/web/src/test/noClaims.ts`. It is the one banned list for all phases (Ruling R-CLAIMS): clients and named programmes, team size, percent figures, and outcome claims:

```ts
import { expect } from 'vitest'

const BANNED: readonly RegExp[] = [
  /medicare/i,
  /franchise/i,
  /\bclients?\b/i,
  /\d[\d,]*\s*(engineers|people|staff|employees)\b/i,
  /\d\s*%|\bper ?cent\b/i,
  /\bguarantee/i,
  /\bproven\b/i,
  /\btrusted by\b/i,
  /\bcase stud(y|ies)\b/i,
  /\bROI\b/,
  /\bsav(e|es|ed|ing) (you |your team )?(time|money|hours|\d)/i,
  /\b\d+x\b|\b\d+ times (faster|cheaper)\b/i,
  /\b(cut|cuts|reduce|reduces|reduced|slash|slashes) (costs?|time|errors?)\b/i,
]

export function assertNoClaims(text: string): void {
  for (const pattern of BANNED) {
    expect(text, `banned claim ${String(pattern)}`).not.toMatch(pattern)
  }
}
```

- [ ] Implement `limits.ts`:

```ts
export const MAX_STEPS = 8

export const NAME_MAX = 60
```

- [ ] Implement `copy.ts`. Exact strings:

```ts
import type { Answer, Frequency, QuestionKey, Verdict } from './rubric'

interface VerdictText {
  readonly label: string
  readonly gloss: string
}

interface QuestionText {
  readonly text: string
  readonly short: string
  readonly example: string
}

export const labPageCopy = {
  title: 'Should This Be AI?',
  subtitle: 'the wrong-tool test',
  headerDescription:
    'The wrong-tool test. Find out which steps of your work need AI, and which need a simple program, a checklist or a person.',
  metaDescription:
    'A free test that sorts each step of a workflow into the tool that fits it, with the reason in plain words.',
  howItWorksHeading: 'How it works',
  howItWorks: [
    'Name the steps of one workflow.',
    'Answer a few short questions about each step.',
    'See which tool fits each step, and the rule that decided it.',
  ],
  methodHeading: 'How the verdicts are made',
  methodBody:
    'Every verdict comes from a fixed set of rules written in code. For any set of answers exactly one rule matches, so the same answers always give the same verdict. Nothing you type leaves this page unless you send it to us.',
  rubricVersion: 'Rubric version {version}',
} as const

export const verdictCopy: Readonly<Record<Verdict, VerdictText>> = {
  'plain-code': { label: 'A simple program', gloss: 'Fixed steps, no judgment' },
  rules: { label: 'A checklist your team can edit', gloss: 'If this, then that' },
  'classic-ml': {
    label: 'A model trained on your past cases',
    gloss: 'Predicts from history',
  },
  'language-model': { label: 'An AI language model', gloss: 'Reads and writes text' },
  'do-not-automate': { label: 'Keep a person on it', gloss: 'The judgment is the job' },
  unclear: {
    label: 'Worth a conversation',
    gloss: 'Answer the not-sure questions to sharpen this',
  },
}

export const signOffCopy = '+ human sign-off'

export const questionCopy: Readonly<Record<QuestionKey, QuestionText>> = {
  fixedForm: {
    text: 'Do the information it uses and the result it produces both come in a fixed form, like spreadsheet rows or form fields, rather than emails, PDFs, photos or written paragraphs?',
    short: 'Fixed form',
    example:
      'Yes: an order form with the same fields every time. No: people describe what they want in an email, or the result is a written reply.',
  },
  checklist: {
    text: 'Could you write the decision as a checklist a new hire follows without asking you?',
    short: 'Checklist',
    example:
      'Yes: refunds under a set amount are approved. No: it depends on how the request reads.',
  },
  changes: {
    text: 'Does your team change this checklist themselves, more than a few times a year, such as prices, limits or who qualifies?',
    short: 'Checklist changes often',
    example:
      'Yes: shipping rates that change every month. No: a returns policy that has stayed the same for years.',
  },
  costly: {
    text: 'If it gets one wrong, does it cost money, a customer, or a legal problem?',
    short: 'Costly mistake',
    example: 'Yes: paying the wrong supplier. No: tagging an email with the wrong topic.',
  },
  checkable: {
    text: 'Can a person check the result before it takes effect?',
    short: 'Checked first',
    example:
      'Yes: a draft reply waits for approval. No: the payment goes out on its own.',
  },
  pastCases: {
    text: 'Do you have past cases where you know the right answer, say 200 or more?',
    short: 'Past cases',
    example: 'Yes: two years of quotes with the final price. No: each case is new.',
  },
}

export const frequencyQuestionCopy: QuestionText = {
  text: 'How often does it happen?',
  short: 'How often',
  example: 'Optional. A later version uses it to estimate cost.',
}

export const answerCopy: Readonly<Record<NonNullable<Answer> | 'unanswered', string>> = {
  yes: 'Yes',
  no: 'No',
  'not-sure': 'Not sure',
  unanswered: 'Not answered',
}

export const frequencyCopy: Readonly<Record<NonNullable<Frequency>, string>> = {
  daily: 'Daily',
  weekly: 'Weekly',
  'monthly-or-less': 'Monthly or less',
}

export const builderCopy = {
  heading: 'Your workflow',
  intro: 'Up to 8 steps. Names stay in this browser tab and are not stored.',
  stepLabel: 'Step {n}',
  stepLabelNamed: 'Step {n}, {name}',
  stepNameLabel: 'Name of step {n}',
  stepNamePlaceholder: 'For example: send invoices',
  optional: '(optional)',
  add: 'Add a step',
  addLimit: 'Up to 8 steps',
  moveUp: 'Move {step} up',
  moveDown: 'Move {step} down',
  remove: 'Remove {step}',
  removedNotice: 'Step removed.',
  undo: 'Undo',
  answered: '{count} of {total} answered',
  toggle: '{step}. {verdict}. {answered}',
} as const

export const statusCopy = {
  added: '{step} added.',
  movedUp: 'Moved up. Now {step}.',
  movedDown: 'Moved down. Now {step}.',
  removed: '{step} removed. Undo is available for 10 seconds.',
  restored: '{step} restored.',
  verdict: '{step}: {verdict}',
  loaded: 'Loaded the {preset} example with {count} steps.',
} as const

export const whyCopy = {
  button: 'Why?',
  forStep: 'for {step}',
  triggered: 'Your answers that decided it',
  showCode: 'Show the rule as code',
  codeLabel: 'Rule {rule} as code',
  ruleLine: 'Rule {rule}, rubric {version}',
} as const

export const summaryCopy = {
  heading: 'Your workflow at a glance',
  intro: 'This is also what "Send us this result" sends.',
  viewLabel: 'Show as',
  cards: 'Cards',
  table: 'Table',
  caption: 'Each step, its verdict, the reason and the rule that decided it',
  scrollLabel: 'Workflow summary table',
  columns: { step: 'Step', verdict: 'Verdict', reason: 'Reason', rule: 'Rule' },
} as const

export const progressCopy = {
  heading: 'So far',
  resolved: '{resolved} of {total} steps answered',
} as const

export const sendCopy = {
  heading: 'Send us this result',
  body: 'Opens our contact page with these results in the message. You can edit them before sending.',
  includeNames: 'Include my step names',
  previewLabel: 'Exactly what we will receive',
  button: 'Send us this result',
  intro: 'Results from Should This Be AI? (the wrong-tool test)',
  line: '{step}: {verdict} (rule {rule}, rubric {version})',
  truncated: 'More steps were cut to fit an email.',
  subject: 'Should This Be AI? results',
  notAnswered: 'not answered yet',
  ask: 'What I would like help with: ',
} as const

export const contactLabCopy = {
  added: 'We added your results. Edit or remove them.',
  emailResults: 'Email us these results',
} as const

export function fillTemplate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key]
    if (value === undefined)
      throw new Error(`Missing value for {${key}} in "${template}"`)
    return String(value)
  })
}

export function stepLabel(position: number, name: string): string {
  const trimmed = name.trim()
  return trimmed === ''
    ? fillTemplate(builderCopy.stepLabel, { n: position })
    : fillTemplate(builderCopy.stepLabelNamed, { n: position, name: trimmed })
}

export function verdictPhrase(verdict: Verdict, humanSignOff: boolean): string {
  const label = verdictCopy[verdict].label
  const lower = label.charAt(0).toLowerCase() + label.slice(1)
  return humanSignOff ? `${lower} ${signOffCopy}` : lower
}
```

Note `verdictPhrase` lowercases only the first character, so "An AI language model" becomes "an AI language model".

- [ ] Run `pnpm -F web test:run src/content/lab`. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/content/lab/copy.ts app/web/src/content/lab/limits.ts app/web/src/test/noClaims.ts app/web/src/content/lab/copy.test.ts
git commit -m "feat(lab): add lab copy, step limits and the shared claims check"
```

### P1-T8: verdict Badge variants, verdict styling and the contrast test

Files:

- Edit: `app/web/src/components/ui/badge.tsx`
- Create: `app/web/src/components/lab/verdictStyle.ts`
- Create: `app/web/src/test/contrast.ts`
- Create: `app/web/src/components/lab/verdictStyle.test.ts`

Interfaces:

- Consumes: `VERDICTS`, `Verdict` (P1-T1).
- Produces: `Badge` variants `'plain-code' | 'rules' | 'classic-ml' | 'language-model' | 'do-not-automate' | 'unclear'`; `VERDICT_STYLE: Readonly<Record<Verdict, { marker: string; card: string; cardRule?: string }>>`; `colorTokens()`, `contrastRatio(a, b)`.

Measured on 2026-10-09 from `globals.css` while writing this plan (ratios only): text on surface 17.43, text on elevated 16.22, accent on surface 7.26, muted on surface 6.84, border-strong on surface 3.63, border-strong on elevated 3.38, border on surface 1.17, brand on elevated 4.98. These confirm the spec's UNVERIFIED reviewer numbers; the test below re-measures them on every run.

- [ ] Write the failing test `app/web/src/components/lab/verdictStyle.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { badgeVariants } from '@/components/ui/badge'
import { VERDICTS } from '@/content/lab/rubric'
import { colorTokens, contrastRatio } from '@/test/contrast'
import { VERDICT_STYLE } from './verdictStyle'

const TOKEN = '(border-strong|border|elevated|surface|base|muted|text|brand|accent)'

function tokenOf(classes: string, prefix: 'text' | 'bg' | 'border'): string | undefined {
  return new RegExp(`(?:^|\\s)${prefix}-${TOKEN}(?=\\s|$)`).exec(classes)?.[1]
}

function cardBackground(verdict: (typeof VERDICTS)[number]): string {
  return tokenOf(VERDICT_STYLE[verdict].card, 'bg') ?? 'surface'
}

describe('verdict styling', () => {
  const tokens = colorTokens()

  it.each(VERDICTS)('%s label meets 4.5:1 on its card', (verdict) => {
    const label = tokenOf(badgeVariants({ variant: verdict }), 'text')
    expect(label, `${verdict} badge has no text token`).toBeDefined()
    expect(
      contrastRatio(tokens[label!]!, tokens[cardBackground(verdict)]!),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it.each(VERDICTS)('%s marker meets 3:1 on its card', (verdict) => {
    const marker = VERDICT_STYLE[verdict].marker
    const token = tokenOf(marker, 'bg') ?? tokenOf(marker, 'border')
    expect(token, `${verdict} marker has no color token`).toBeDefined()
    expect(
      contrastRatio(tokens[token!]!, tokens[cardBackground(verdict)]!),
    ).toBeGreaterThanOrEqual(3)
  })

  it.each(VERDICTS)('%s marker is an inline shape, never positioned', (verdict) => {
    expect(VERDICT_STYLE[verdict].marker).not.toMatch(/\b(absolute|inset-\S+)\b/)
  })

  it('gives only do-not-automate a card rule, positioned inside a clipped card', () => {
    for (const verdict of VERDICTS) {
      if (verdict === 'do-not-automate') continue
      expect(VERDICT_STYLE[verdict].cardRule).toBeUndefined()
    }
    const style = VERDICT_STYLE['do-not-automate']
    expect(style.marker).toBe('h-3 w-px bg-brand')
    expect(style.cardRule).toBe('absolute inset-y-0 left-0 w-px bg-brand')
    expect(style.card).toMatch(/(?:^|\s)relative(?=\s|$)/)
    expect(style.card).toMatch(/(?:^|\s)overflow-hidden(?=\s|$)/)
    expect(
      contrastRatio(
        tokens[tokenOf(style.cardRule!, 'bg')!]!,
        tokens[cardBackground('do-not-automate')]!,
      ),
    ).toBeGreaterThanOrEqual(3)
  })

  it('never uses brand as a label color', () => {
    for (const verdict of VERDICTS) {
      expect(badgeVariants({ variant: verdict })).not.toMatch(/\btext-brand\b/)
    }
  })

  it('keeps control edges at 3:1 on the card and on the chosen fill', () => {
    expect(
      contrastRatio(tokens['border-strong']!, tokens.surface!),
    ).toBeGreaterThanOrEqual(3)
    expect(
      contrastRatio(tokens['border-strong']!, tokens.elevated!),
    ).toBeGreaterThanOrEqual(3)
  })

  it('gives each verdict a distinct marker shape', () => {
    const markers = VERDICTS.map((verdict) => VERDICT_STYLE[verdict].marker)
    expect(new Set(markers).size).toBe(VERDICTS.length)
  })
})
```

- [ ] Run `pnpm -F web test:run src/components/lab/verdictStyle.test.ts`. Expected: FAIL, missing `./verdictStyle` and `@/test/contrast`.
- [ ] Implement `app/web/src/test/contrast.ts` (the same math as `src/styles/tokens.test.ts:5-31`, exported):

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function colorTokens(): Readonly<Record<string, string>> {
  const css = readFileSync(join(import.meta.dirname, '../styles/globals.css'), 'utf8')
  const out: Record<string, string> = {}
  for (const match of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[match[1]!] = match[2]!.toLowerCase()
  }
  return out
}

function channel(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
```

If lint flags the non-null assertions in this non-test file, replace `match[1]!` with a guard that skips the match.

- [ ] Implement `app/web/src/components/lab/verdictStyle.ts` (spec table, tokens by name):

```ts
import type { Verdict } from '@/content/lab/rubric'

interface VerdictStyle {
  readonly marker: string
  readonly card: string
  readonly cardRule?: string
}

export const VERDICT_STYLE: Readonly<Record<Verdict, VerdictStyle>> = {
  'plain-code': { marker: 'size-3 bg-text', card: 'border-border-strong' },
  rules: { marker: 'size-3 border border-border-strong', card: 'border-border-strong' },
  'classic-ml': {
    marker: 'size-3 rounded-full border border-accent',
    card: 'border-border',
  },
  'language-model': { marker: 'size-3 rounded-full bg-accent', card: 'border-border' },
  'do-not-automate': {
    marker: 'h-3 w-px bg-brand',
    card: 'relative overflow-hidden border-border bg-elevated',
    cardRule: 'absolute inset-y-0 left-0 w-px bg-brand',
  },
  unclear: {
    marker: 'size-3 border border-dashed border-border-strong',
    card: 'border-border',
  },
}
```

`marker` is an inline shape that sits in normal flow wherever a verdict is named: the `Badge` in the VerdictCard heading, the ProgressRail list, and any later list or table. `cardRule` is optional, set only for `do-not-automate`, and only VerdictCard renders it, as a hidden `<span>` directly inside the `relative overflow-hidden` card, so the full-height rule never escapes into a list.

- [ ] Edit `app/web/src/components/ui/badge.tsx`: add six entries to `variants.variant` after `default`, each `'gap-2 bg-transparent normal-case tracking-normal text-sm <label color>'` with label colors from the spec: `plain-code` `text-text`, `rules` `text-text`, `classic-ml` `text-accent`, `language-model` `text-accent`, `do-not-automate` `text-text`, `unclear` `text-muted`. Leave `default` and `defaultVariants` unchanged so `primitives.test.tsx` still passes.
- [ ] Run `pnpm -F web test:run src/components/lab src/components/ui src/styles`. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/components/ui/badge.tsx app/web/src/components/lab/verdictStyle.ts app/web/src/components/lab/verdictStyle.test.ts app/web/src/test/contrast.ts
git commit -m "feat(lab): add verdict badge variants and markers with a contrast test"
```

### P1-T9: workflow state reducer

Files:

- Create: `app/web/src/components/lab/workflowState.ts`
- Create: `app/web/src/components/lab/workflowState.test.ts`

Interfaces:

- Consumes: `EMPTY_ANSWERS`, `StepAnswers`, `QuestionKey`, `Answer`, `Frequency` (P1-T1); `MAX_STEPS`, `NAME_MAX` (P1-T7).
- Produces: `Step`, `StepSeed`, `RemovedStep`, `WorkflowState`, `WorkflowAction`, `initialWorkflow()`, `workflowReducer(state, action)`.

- [ ] Write the failing test `app/web/src/components/lab/workflowState.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { EMPTY_ANSWERS } from '@/content/lab/rubric'
import { MAX_STEPS, NAME_MAX } from '@/content/lab/limits'
import {
  initialWorkflow,
  workflowReducer,
  type WorkflowAction,
  type WorkflowState,
} from './workflowState'

function run(...actions: WorkflowAction[]): WorkflowState {
  return actions.reduce(workflowReducer, initialWorkflow())
}

const ids = (state: WorkflowState) => state.steps.map((step) => step.id)

describe('workflowReducer', () => {
  it('starts with one empty step', () => {
    expect(initialWorkflow().steps).toEqual([
      { id: 'step-1', name: '', answers: EMPTY_ANSWERS },
    ])
  })

  it('adds steps up to the limit and no further', () => {
    const adds = Array.from({ length: MAX_STEPS + 2 }, (): WorkflowAction => ({
      type: 'add',
    }))
    expect(run(...adds).steps).toHaveLength(MAX_STEPS)
  })

  it('caps names at the name limit', () => {
    const state = run({ type: 'rename', id: 'step-1', name: 'x'.repeat(NAME_MAX + 5) })
    expect(state.steps[0]!.name).toHaveLength(NAME_MAX)
  })

  it('records an answer and a frequency', () => {
    const state = run(
      { type: 'answer', id: 'step-1', key: 'costly', value: 'yes' },
      { type: 'frequency', id: 'step-1', value: 'weekly' },
    )
    expect(state.steps[0]!.answers).toEqual({
      ...EMPTY_ANSWERS,
      costly: 'yes',
      frequency: 'weekly',
    })
  })

  it('moves a step and ignores a move past either edge', () => {
    const state = run(
      { type: 'add' },
      { type: 'add' },
      { type: 'move', id: 'step-3', direction: 'up' },
    )
    expect(ids(state)).toEqual(['step-1', 'step-3', 'step-2'])
    expect(
      ids(workflowReducer(state, { type: 'move', id: 'step-1', direction: 'up' })),
    ).toEqual(ids(state))
    expect(
      ids(workflowReducer(state, { type: 'move', id: 'step-2', direction: 'down' })),
    ).toEqual(ids(state))
  })

  it('removes a step, remembers it, and restores it in place on undo', () => {
    const removed = run(
      { type: 'add' },
      { type: 'add' },
      { type: 'remove', id: 'step-2' },
    )
    expect(ids(removed)).toEqual(['step-1', 'step-3'])
    expect(removed.removed?.index).toBe(1)
    const restored = workflowReducer(removed, { type: 'undo' })
    expect(ids(restored)).toEqual(['step-1', 'step-2', 'step-3'])
    expect(restored.removed).toBeNull()
  })

  it('returns the same state from undo when the steps are full again', () => {
    const adds = Array.from({ length: 8 }, (): WorkflowAction => ({ type: 'add' }))
    const state = run(...adds, { type: 'remove', id: 'step-2' }, { type: 'add' })
    expect(state.steps).toHaveLength(MAX_STEPS)
    expect(state.removed).not.toBeNull()
    expect(workflowReducer(state, { type: 'undo' })).toBe(state)
  })

  it('never removes the last step', () => {
    expect(run({ type: 'remove', id: 'step-1' }).steps).toHaveLength(1)
  })

  it('forgets the removed step when undo expires', () => {
    const state = run(
      { type: 'add' },
      { type: 'remove', id: 'step-2' },
      { type: 'expire-undo' },
    )
    expect(state.removed).toBeNull()
    expect(ids(workflowReducer(state, { type: 'undo' }))).toEqual(['step-1'])
  })

  it('replaces every step when a preset loads, with fresh ids', () => {
    const seeds = [
      { name: 'One', answers: EMPTY_ANSWERS },
      { name: 'Two', answers: EMPTY_ANSWERS },
    ]
    const state = run({ type: 'add' }, { type: 'load', seeds })
    expect(state.steps.map((step) => step.name)).toEqual(['One', 'Two'])
    expect(ids(state)).toEqual(['step-3', 'step-4'])
    expect(state.removed).toBeNull()
  })
})
```

- [ ] Run `pnpm -F web test:run src/components/lab/workflowState.test.ts`. Expected: FAIL, missing module.
- [ ] Implement `workflowState.ts`:

```ts
import { MAX_STEPS, NAME_MAX } from '@/content/lab/limits'
import {
  EMPTY_ANSWERS,
  type Answer,
  type Frequency,
  type QuestionKey,
  type StepAnswers,
} from '@/content/lab/rubric'

export interface Step {
  readonly id: string
  readonly name: string
  readonly answers: StepAnswers
}

export interface StepSeed {
  readonly name: string
  readonly answers: StepAnswers
}

export interface RemovedStep {
  readonly step: Step
  readonly index: number
}

export interface WorkflowState {
  readonly steps: readonly Step[]
  readonly nextId: number
  readonly removed: RemovedStep | null
}

export type WorkflowAction =
  | { readonly type: 'add' }
  | { readonly type: 'rename'; readonly id: string; readonly name: string }
  | {
      readonly type: 'answer'
      readonly id: string
      readonly key: QuestionKey
      readonly value: Answer
    }
  | { readonly type: 'frequency'; readonly id: string; readonly value: Frequency }
  | { readonly type: 'move'; readonly id: string; readonly direction: 'up' | 'down' }
  | { readonly type: 'remove'; readonly id: string }
  | { readonly type: 'undo' }
  | { readonly type: 'expire-undo' }
  | { readonly type: 'load'; readonly seeds: readonly StepSeed[] }

export function initialWorkflow(): WorkflowState {
  return {
    steps: [{ id: 'step-1', name: '', answers: EMPTY_ANSWERS }],
    nextId: 2,
    removed: null,
  }
}

function updateStep(
  state: WorkflowState,
  id: string,
  change: (step: Step) => Step,
): WorkflowState {
  return {
    ...state,
    steps: state.steps.map((step) => (step.id === id ? change(step) : step)),
  }
}

function addStep(state: WorkflowState): WorkflowState {
  if (state.steps.length >= MAX_STEPS) return state
  const step: Step = {
    id: `step-${String(state.nextId)}`,
    name: '',
    answers: EMPTY_ANSWERS,
  }
  return { ...state, steps: [...state.steps, step], nextId: state.nextId + 1 }
}

function moveStep(
  state: WorkflowState,
  id: string,
  direction: 'up' | 'down',
): WorkflowState {
  const from = state.steps.findIndex((step) => step.id === id)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from === -1 || to < 0 || to >= state.steps.length) return state
  const steps = [...state.steps]
  const [moving] = steps.splice(from, 1)
  if (moving === undefined) return state
  steps.splice(to, 0, moving)
  return { ...state, steps }
}

function removeStep(state: WorkflowState, id: string): WorkflowState {
  const index = state.steps.findIndex((step) => step.id === id)
  const step = state.steps[index]
  if (step === undefined || state.steps.length <= 1) return state
  return {
    ...state,
    steps: state.steps.filter((s) => s.id !== id),
    removed: { step, index },
  }
}

function undoRemove(state: WorkflowState): WorkflowState {
  if (state.removed === null || state.steps.length >= MAX_STEPS) return state
  const steps = [...state.steps]
  steps.splice(Math.min(state.removed.index, steps.length), 0, state.removed.step)
  return { ...state, steps, removed: null }
}

function loadSeeds(state: WorkflowState, seeds: readonly StepSeed[]): WorkflowState {
  const steps = seeds.slice(0, MAX_STEPS).map((seed, offset) => ({
    id: `step-${String(state.nextId + offset)}`,
    name: seed.name.slice(0, NAME_MAX),
    answers: seed.answers,
  }))
  return { steps, nextId: state.nextId + steps.length, removed: null }
}

export function workflowReducer(
  state: WorkflowState,
  action: WorkflowAction,
): WorkflowState {
  switch (action.type) {
    case 'add':
      return addStep(state)
    case 'rename':
      return updateStep(state, action.id, (step) => ({
        ...step,
        name: action.name.slice(0, NAME_MAX),
      }))
    case 'answer':
      return updateStep(state, action.id, (step) => ({
        ...step,
        answers: { ...step.answers, [action.key]: action.value },
      }))
    case 'frequency':
      return updateStep(state, action.id, (step) => ({
        ...step,
        answers: { ...step.answers, frequency: action.value },
      }))
    case 'move':
      return moveStep(state, action.id, action.direction)
    case 'remove':
      return removeStep(state, action.id)
    case 'undo':
      return undoRemove(state)
    case 'expire-undo':
      return { ...state, removed: null }
    case 'load':
      return loadSeeds(state, action.seeds)
  }
}
```

- [ ] Run `pnpm -F web test:run src/components/lab/workflowState.test.ts`. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/components/lab/workflowState.ts app/web/src/components/lab/workflowState.test.ts
git commit -m "feat(lab): add the workflow state reducer"
```

### P1-T10: StepCard questions and step controls

Files:

- Create: `app/web/src/components/lab/StepCard.tsx`
- Create: `app/web/src/components/lab/StepCard.test.tsx`

Interfaces:

- Consumes: `Step` (P1-T9); copy (P1-T7); `QUESTION_KEYS`, `visibleQuestions` (P1-T1); `NAME_MAX`; `Card` (`components/ui/card.tsx`); `Button` (`components/ui/button.tsx`).
- Produces: `StepCard`, `StepControl = 'name' | 'up' | 'down' | 'remove' | 'toggle'`, `StepCardProps`:

```ts
export interface StepCardProps {
  readonly step: Step
  readonly position: number
  readonly total: number
  readonly onRename: (name: string) => void
  readonly onAnswer: (key: QuestionKey, value: Answer) => void
  readonly onFrequency: (value: Frequency) => void
  readonly onMove: (direction: 'up' | 'down') => void
  readonly onRemove: () => void
  readonly controlRef: (control: StepControl, element: HTMLElement | null) => void
  readonly children?: ReactNode
}
```

Markup contract:

- Root is `<li data-testid={`step-${position}`}>` containing a `Card`.
- Header row: an `<h3>` with `stepLabel(position, name)`, then "Move up", "Move down", "Remove" buttons. Every StepCard button is `<Button variant="ghost" size="md" className="min-w-11">` (`h-11`, `components/ui/button.tsx:19`), so each is at least 44 by 44 px. Accessible names come from `builderCopy.moveUp`, `moveDown` and `remove` filled with `{ step: stepLabel(position, step.name) }`. "Move up" has `aria-disabled="true"` when `position === 1`, "Move down" when `position === total` (Ruling R-EDGES); clicking an `aria-disabled` button does nothing. "Remove" is not rendered when `total === 1`.
- Body `<div id={`${step.id}-body`}>`: a labelled `<input>` (`id={`${step.id}-name`}`, label from `builderCopy.stepNameLabel`, `maxLength={NAME_MAX}`, controlled by `step.name`, class `border-border-strong`); then one `<fieldset>` per `visibleQuestions(step.answers)` entry (follow-up 2b, `changes`, appears only when question 2 is yes) with `<legend>` = `questionCopy[key].text` only, `aria-describedby` pointing at a `<p>` with the example; then the frequency fieldset with `frequencyQuestionCopy.text` and the `builderCopy.optional` text inside a separate `<span>` after the legend text.
- Each option is `<label className="flex min-h-11 min-w-11 items-center gap-2 rounded-lg border border-border-strong px-3 has-checked:bg-elevated has-checked:font-semibold">` wrapping `<input type="radio" className="size-5 appearance-none rounded-full border-2 border-border-strong checked:border-[6px] checked:border-text" name={`${step.id}-${key}`} value=… checked=… onChange=…>` and the answer text. The checked radio changes shape (thick ring), and the label changes fill and weight: never color alone.
- `controlRef` is called from callback refs for the name input (`'name'`) and the three buttons (`'up'`, `'down'`, `'remove'`).
- `children` (the verdict card) renders at the end of the body.

- [ ] Write the failing test `StepCard.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { answerCopy, builderCopy, fillTemplate, questionCopy } from '@/content/lab/copy'
import { NAME_MAX } from '@/content/lab/limits'
import { EMPTY_ANSWERS, visibleQuestions } from '@/content/lab/rubric'
import { StepCard, type StepCardProps } from './StepCard'

function setup(overrides: Partial<StepCardProps> = {}) {
  const props: StepCardProps = {
    step: { id: 'step-2', name: 'Send invoices', answers: EMPTY_ANSWERS },
    position: 2,
    total: 3,
    onRename: vi.fn(),
    onAnswer: vi.fn(),
    onFrequency: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    controlRef: vi.fn(),
    ...overrides,
  }
  render(
    <ol>
      <StepCard {...props} />
    </ol>,
  )
  return props
}

describe('StepCard', () => {
  it('labels the name field and caps its length', () => {
    setup()
    const input = screen.getByLabelText(fillTemplate(builderCopy.stepNameLabel, { n: 2 }))
    expect(input).toHaveAttribute('maxlength', String(NAME_MAX))
    expect(input).toHaveClass('border-border-strong')
  })

  it('asks each visible question in a fieldset whose legend is the question', () => {
    setup()
    for (const key of visibleQuestions(EMPTY_ANSWERS)) {
      const group = screen.getByRole('group', { name: questionCopy[key].text })
      expect(within(group).getAllByRole('radio')).toHaveLength(3)
    }
    expect(
      screen.queryByRole('group', { name: questionCopy.changes.text }),
    ).not.toBeInTheDocument()
  })

  it('asks the checklist follow-up only when question 2 is yes', () => {
    setup({
      step: {
        id: 'step-2',
        name: 'Send invoices',
        answers: { ...EMPTY_ANSWERS, checklist: 'yes' },
      },
    })
    expect(
      screen.getByRole('group', { name: questionCopy.changes.text }),
    ).toBeInTheDocument()
  })

  it('makes every step button at least 44 by 44 px', () => {
    setup()
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass('min-w-11')
      expect(button.className).toMatch(/(^|\s)(min-)?h-11(\s|$)/)
    }
  })

  it('starts every question unanswered', () => {
    setup()
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
  })

  it('reports an answer with its question key', async () => {
    const props = setup()
    const group = screen.getByRole('group', { name: questionCopy.costly.text })
    await userEvent.click(within(group).getByRole('radio', { name: answerCopy.yes }))
    expect(props.onAnswer).toHaveBeenCalledWith('costly', 'yes')
  })

  it('gives every option a 44 px target and a non-color chosen state', () => {
    setup()
    const label = screen.getAllByRole('radio')[0]!.closest('label')!
    expect(label).toHaveClass(
      'min-h-11',
      'min-w-11',
      'has-checked:bg-elevated',
      'has-checked:font-semibold',
    )
  })

  it('names the move and remove buttons with the step number and name', async () => {
    const props = setup()
    await userEvent.click(
      screen.getByRole('button', { name: 'Move Step 2, Send invoices up' }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Step 2, Send invoices' }),
    )
    expect(props.onMove).toHaveBeenCalledWith('up')
    expect(props.onRemove).toHaveBeenCalled()
  })

  it('keeps edge moves focusable but inert', async () => {
    const props = setup({ position: 1, total: 1 })
    const up = screen.getByRole('button', { name: /Move Step 1, Send invoices up/ })
    expect(up).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(up)
    expect(props.onMove).not.toHaveBeenCalled()
  })

  it('hides Remove when only one step is left', () => {
    setup({ position: 1, total: 1 })
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
  })
})
```

- [ ] Run `pnpm -F web test:run src/components/lab/StepCard.test.tsx`. Expected: FAIL, missing module.
- [ ] Implement `StepCard.tsx` (`'use client'`) per the markup contract. Keep helpers small: one `AnswerGroup` function component for a fieldset, one `StepControls` for the button row.
- [ ] Run the test. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/components/lab/StepCard.tsx app/web/src/components/lab/StepCard.test.tsx
git commit -m "feat(lab): add the step card with accessible questions and controls"
```

### P1-T11: StepCard accordion below md

Files:

- Edit: `app/web/src/components/lab/StepCard.tsx`
- Edit: `app/web/src/components/lab/StepCard.test.tsx`

Interfaces:

- Consumes: P1-T10.
- Produces: new required props `open: boolean`, `verdictLabel: string`, `onToggle: () => void` on `StepCardProps`.

Markup contract (Ruling R-ACCORDION):

- The header gets a second heading, `<h3 className="md:hidden">`, holding `<Button variant="ghost" size="md" className="h-auto min-h-11 min-w-11 w-full justify-start whitespace-normal py-2 text-left" type="button" data-step-toggle aria-expanded={open} aria-controls={`${step.id}-body`} onClick={onToggle}>` (`cn` drops `h-11` for `h-auto`, so a long name wraps while the target stays at least 44 px), whose text is `fillTemplate(builderCopy.toggle, { step: stepLabel(position, name), verdict: verdictLabel, answered: fillTemplate(builderCopy.answered, { count, total }) })`, where `total` is `visibleQuestions(step.answers).length` and `count` is how many of those answers are non-null. The existing `<h3>` gets `hidden md:block`.
- The body gets `className={cn(open ? 'block' : 'hidden', 'md:block')}`.
- `controlRef('toggle', element)` is called for the toggle button.

- [ ] Add failing tests to `StepCard.test.tsx` (pass `open: true, verdictLabel: 'Worth a conversation', onToggle: vi.fn()` in the `setup` defaults first so the earlier tests compile):

```tsx
describe('StepCard accordion', () => {
  it('summarises a collapsed step with its name, verdict and answered count', () => {
    setup({
      open: false,
      verdictLabel: 'A simple program',
      step: {
        id: 'step-2',
        name: 'Send invoices',
        answers: { ...EMPTY_ANSWERS, costly: 'no', fixedForm: 'yes' },
      },
    })
    const toggle = screen.getByRole('button', {
      name: /Step 2, Send invoices\. A simple program\. 2 of 5 answered/,
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'step-2-body')
    expect(document.getElementById('step-2-body')).toHaveClass('hidden', 'md:block')
  })

  it('shows the body when open and reports a toggle', async () => {
    const props = setup({ open: true })
    expect(document.getElementById('step-2-body')).toHaveClass('block', 'md:block')
    await userEvent.click(screen.getByRole('button', { name: /answered/ }))
    expect(props.onToggle).toHaveBeenCalled()
  })
})
```

- [ ] Run `pnpm -F web test:run src/components/lab/StepCard.test.tsx`. Expected: the two new tests FAIL.
- [ ] Implement the contract.
- [ ] Run the test file. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/components/lab/StepCard.tsx app/web/src/components/lab/StepCard.test.tsx
git commit -m "feat(lab): collapse steps into an accordion below the md breakpoint"
```

### P1-T12: rule source reader and a focusable CodeBlock scroll region

Files:

- Create: `app/web/src/lib/ruleSource.ts`, `app/web/src/lib/ruleSource.test.ts`
- Edit: `app/web/src/components/substance/CodeBlock.tsx`, `app/web/src/components/substance/CodeBlock.test.tsx`

Interfaces:

- Consumes: `RULE_IDS`, `RuleId` (P1-T1).
- Produces: `readRuleSource(id: RuleId): string` (server only, build time); `CodeBlock` gains optional `scrollLabel?: string`.

- [ ] Write the failing test `ruleSource.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { RULE_IDS } from '@/content/lab/rubric'
import { RULES } from '@/content/lab/rules'
import { readRuleSource } from './ruleSource'

describe('readRuleSource', () => {
  it.each(RULE_IDS)(
    'returns the source of rule %s with its condition and reason',
    (id) => {
      const source = readRuleSource(id)
      const rule = RULES.find((candidate) => candidate.id === id)!
      expect(source).toContain(`export const ${id}: Rule`)
      expect(source).toContain('when:')
      expect(source).toContain(rule.why.slice(0, 30))
    },
  )
})
```

- [ ] Add a failing test to `CodeBlock.test.tsx`:

```tsx
it('makes the scroll area a labelled, focusable region when asked', async () => {
  render(
    await CodeBlock({
      code: 'const x = 1',
      lang: 'typescript',
      scrollLabel: 'Rule R1 as code',
    }),
  )
  const region = screen.getByRole('region', { name: 'Rule R1 as code' })
  expect(region).toHaveAttribute('tabindex', '0')
})

it('adds no region without a label', async () => {
  render(await CodeBlock({ code: 'const x = 1', lang: 'typescript' }))
  expect(screen.queryByRole('region')).not.toBeInTheDocument()
})
```

- [ ] Run `pnpm -F web test:run src/lib/ruleSource.test.ts src/components/substance/CodeBlock.test.tsx`. Expected: FAIL.
- [ ] Implement `ruleSource.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { RuleId } from '@/content/lab/rubric'

const RULES_DIR = join(process.cwd(), 'src', 'content', 'lab', 'rules')

export function readRuleSource(id: RuleId): string {
  return readFileSync(join(RULES_DIR, `${id}.ts`), 'utf8').trimEnd()
}
```

- [ ] Edit `CodeBlock.tsx`: add `scrollLabel?: string` to the props; on the inner scroll `div` spread `{...(scrollLabel === undefined ? {} : { role: 'region', 'aria-label': scrollLabel, tabIndex: 0 })}`. If `jsx-a11y/no-noninteractive-tabindex` still reports, write the three attributes directly under a single `{/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}` directive (Ruling R-SCROLL). Existing calls without `scrollLabel` render exactly as before.
- [ ] Run the two test files. Expected: all pass, including the three existing CodeBlock tests.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/lib/ruleSource.ts app/web/src/lib/ruleSource.test.ts app/web/src/components/substance/CodeBlock.tsx app/web/src/components/substance/CodeBlock.test.tsx
git commit -m "feat(lab): read rule sources at build time and label code scroll regions"
```

### P1-T13: WhyDrawer

Files:

- Create: `app/web/src/components/lab/WhyDrawer.tsx`, `app/web/src/components/lab/WhyDrawer.test.tsx`

Interfaces:

- Consumes: `RubricResult`, `StepAnswers`, `getRule` (P1-T6); `whyCopy`, `questionCopy`, `answerCopy`, `fillTemplate`, `stepLabel` (P1-T7).
- Produces: `WhyDrawer({ position, name, result, answers, snippet }: { position: number; name: string; result: RubricResult; answers: StepAnswers; snippet: ReactNode })`.

Markup contract:

- `'use client'`. Two `useState` booleans (`open`, `codeOpen`) and two `useId` ids.
- Both disclosure buttons are `<Button variant="link" size="md" className="min-w-11">` (`h-11`), so each target is at least 44 by 44 px (P1-T25 measures it).
- A `<Button type="button" aria-expanded aria-controls={panelId}>` reading `whyCopy.button` plus `<span className="sr-only"> {fillTemplate(whyCopy.forStep, { step: stepLabel(position, name) })}</span>`. Clicking toggles `open`; focus stays on the button (no focus calls).
- `<div id={panelId} hidden={!open}>`: `<p>{result.why}</p>`; `<p>{whyCopy.triggered}</p>`; a `<dl>` with one `<div><dt>{questionCopy[key].short}</dt><dd>{answer text or answerCopy.unanswered}</dd></div>` per key in `getRule(result.ruleId).reads`; a `<p className="font-mono text-sm text-muted">` with `fillTemplate(whyCopy.ruleLine, { rule: result.ruleId, version: result.rubricVersion })`; then a nested `<Button type="button" aria-expanded aria-controls={codeId}>{whyCopy.showCode}</Button>` and `<div id={codeId} hidden={!codeOpen}>{snippet}</div>`.

- [ ] Write the failing test `WhyDrawer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { answerCopy, questionCopy, whyCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { WhyDrawer } from './WhyDrawer'

const answers = {
  ...EMPTY_ANSWERS,
  costly: 'yes',
  checkable: 'no',
  fixedForm: 'no',
} as const

function setup() {
  render(
    <WhyDrawer
      position={2}
      name="Pay suppliers"
      result={classifyStep(answers)}
      answers={answers}
      snippet={<pre>R2 source</pre>}
    />,
  )
  return screen.getByRole('button', { name: /^Why\?/ })
}

describe('WhyDrawer', () => {
  it('names the step in the button and starts closed', () => {
    const button = setup()
    expect(button).toHaveAccessibleName('Why? for Step 2, Pay suppliers')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(classifyStep(answers).why)).not.toBeVisible()
  })

  it('opens inline, keeps focus on the button, and shows the reason first', async () => {
    const button = setup()
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveFocus()
    expect(screen.getByText(classifyStep(answers).why)).toBeVisible()
    expect(document.getElementById(button.getAttribute('aria-controls')!)).toBeVisible()
  })

  it('lists only the answers the rule read', async () => {
    await userEvent.click(setup())
    expect(screen.getByText(questionCopy.costly.short)).toBeVisible()
    expect(screen.getByText(questionCopy.checkable.short)).toBeVisible()
    expect(screen.queryByText(questionCopy.pastCases.short)).not.toBeInTheDocument()
    expect(screen.getAllByText(answerCopy.yes).length).toBeGreaterThan(0)
  })

  it('shows the rule as code behind a nested disclosure', async () => {
    await userEvent.click(setup())
    const code = screen.getByRole('button', { name: whyCopy.showCode })
    expect(screen.getByText('R2 source')).not.toBeVisible()
    await userEvent.click(code)
    expect(code).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('R2 source')).toBeVisible()
  })
})
```

- [ ] Run `pnpm -F web test:run src/components/lab/WhyDrawer.test.tsx`. Expected: FAIL, missing module.
- [ ] Implement `WhyDrawer.tsx`.
- [ ] Run the test. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/components/lab/WhyDrawer.tsx app/web/src/components/lab/WhyDrawer.test.tsx
git commit -m "feat(lab): explain each verdict in an inline Why drawer"
```

### P1-T14: VerdictCard

Files:

- Create: `app/web/src/components/lab/VerdictCard.tsx`, `app/web/src/components/lab/VerdictCard.test.tsx`, `app/web/src/components/lab/VerdictCard.delay.test.tsx`

`app/web/src/components/motion/Stagger.tsx` is not edited (Ruling R-STAGGER).

Interfaces:

- Consumes: `Badge` variants, `VERDICT_STYLE` (P1-T8); `WhyDrawer` (P1-T13); `Reveal` from `@/components/motion/Reveal`; `readDurationSeconds` from `@/components/motion/tokens`; `verdictCopy`, `signOffCopy`.
- Produces: `VerdictCard({ position, name, result, answers, snippet, revealOrder }: { …; revealOrder: number })`.

Markup contract:

- Wrapped in `<Reveal delay={Math.min(revealOrder, 3) * staggerInterval()}>` (Ruling R-STAGGER). `staggerInterval` is a module-level lazy getter in `VerdictCard.tsx`: a `let cachedStagger: number | undefined` and a function that, when the cache is empty and `typeof window !== 'undefined'`, sets it to `readDurationSeconds('--stagger-interval')` once, then returns `cachedStagger ?? Number.NaN`. So the token is read once per page load, not on every render. On the server `readToken` returns `''` (`components/motion/tokens.ts:2`), so the delay is `NaN`; that is harmless and not cached, because `Reveal` reads `delay` only in its `ready` phase on the client (`components/motion/Reveal.tsx:77`). `Reveal` renders its children in the DOM in every phase, so the verdict text exists as soon as it is computed.
- `<Card className={cn('mt-4', VERDICT_STYLE[verdict].card)}>`; no `aria-live` anywhere. When `VERDICT_STYLE[verdict].cardRule` is set (only `do-not-automate`), the first child of the card is `<span aria-hidden="true" className={VERDICT_STYLE[verdict].cardRule} />`, positioned against the card's `relative overflow-hidden`.
- Inside, a block with `data-verdict-block`, keyed by `${verdict}-${String(humanSignOff)}`, with `motion-safe:transition-opacity motion-safe:duration-(--duration-pointer) motion-safe:ease-(--ease-pointer) motion-safe:starting:opacity-0` (Ruling R-FADE), holding an `<h4>` with `<Badge variant={verdict}><span aria-hidden="true" className={VERDICT_STYLE[verdict].marker} />{verdictCopy[verdict].label}</Badge>` and, when `humanSignOff`, a `<span className="text-sm text-text">{signOffCopy}</span>`; then `<p className="text-sm text-muted">{gloss}</p>`.
- Then `<WhyDrawer …/>`.

- [ ] Write the failing test `VerdictCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signOffCopy, verdictCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, classifyStep, type StepAnswers } from '@/content/lab/rubric'
import { VerdictCard } from './VerdictCard'

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function renderCard(answers: StepAnswers) {
  return render(
    <VerdictCard
      position={1}
      name=""
      result={classifyStep(answers)}
      answers={answers}
      snippet={<pre />}
      revealOrder={0}
    />,
  )
}

describe('VerdictCard', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  it('puts the verdict label in a heading with a hidden marker', () => {
    renderCard({
      ...EMPTY_ANSWERS,
      costly: 'no',
      fixedForm: 'yes',
      checklist: 'yes',
      changes: 'no',
    })
    const heading = screen.getByRole('heading', { level: 4 })
    expect(heading).toHaveTextContent(verdictCopy['plain-code'].label)
    expect(heading.querySelector('[aria-hidden="true"]')).toHaveClass('bg-text')
  })

  it('shows the sign-off modifier when the rule adds it', () => {
    renderCard({
      ...EMPTY_ANSWERS,
      costly: 'yes',
      checkable: 'yes',
      fixedForm: 'yes',
      checklist: 'yes',
      changes: 'no',
    })
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(signOffCopy)
  })

  it('raises the do-not-automate card and never makes it live', () => {
    const { container } = renderCard({
      ...EMPTY_ANSWERS,
      costly: 'yes',
      checkable: 'no',
      fixedForm: 'no',
    })
    const card = container.querySelector('.bg-elevated')
    expect(card).not.toBeNull()
    expect(card).toHaveClass('relative', 'overflow-hidden')
    expect(card!.querySelector(':scope > span[aria-hidden="true"]')).toHaveClass(
      'absolute',
      'inset-y-0',
      'left-0',
      'w-px',
      'bg-brand',
    )
    const marker = screen
      .getByRole('heading', { level: 4 })
      .querySelector('[aria-hidden="true"]')
    expect(marker).toHaveClass('h-3', 'w-px', 'bg-brand')
    expect(marker).not.toHaveClass('absolute')
    expect(container.querySelector('[aria-live],[role=status],[role=log]')).toBeNull()
  })

  it('renders no card rule for other verdicts', () => {
    const { container } = renderCard({ ...EMPTY_ANSWERS, costly: 'no', fixedForm: 'no' })
    expect(container.querySelector('.absolute')).toBeNull()
  })

  it('renders everything at once under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = renderCard(EMPTY_ANSWERS)
    expect(screen.getByText(verdictCopy.unclear.label)).toBeInTheDocument()
    expect(container.querySelector('[data-reveal]')).toBeNull()
  })
})
```

- [ ] Write the failing test `VerdictCard.delay.test.tsx`. It mocks `Reveal` and the token reader, so it lives in its own file:

```tsx
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { VerdictCard } from './VerdictCard'

const { readDurationSeconds } = vi.hoisted(() => ({
  readDurationSeconds: vi.fn((name: string) =>
    name === '--stagger-interval' ? 0.08 : 0,
  ),
}))

vi.mock('@/components/motion/Reveal', () => ({
  Reveal: ({ children, delay }: { children: ReactNode; delay?: number }) => (
    <div data-delay={String(delay)}>{children}</div>
  ),
}))

vi.mock('@/components/motion/tokens', () => ({ readDurationSeconds }))

function delayFor(revealOrder: number) {
  const { container, unmount } = render(
    <VerdictCard
      position={1}
      name=""
      result={classifyStep(EMPTY_ANSWERS)}
      answers={EMPTY_ANSWERS}
      snippet={<pre />}
      revealOrder={revealOrder}
    />,
  )
  const delay = Number(
    container.querySelector('[data-delay]')?.getAttribute('data-delay'),
  )
  unmount()
  return delay
}

describe('VerdictCard reveal delay', () => {
  it('staggers by the --stagger-interval token and caps at three intervals', () => {
    expect(delayFor(0)).toBe(0)
    expect(delayFor(1)).toBeCloseTo(0.08)
    expect(delayFor(3)).toBeCloseTo(0.24)
    expect(delayFor(7)).toBeCloseTo(0.24)
  })

  it('reads the --stagger-interval token once, not on every render', () => {
    delayFor(2)
    delayFor(2)
    expect(
      readDurationSeconds.mock.calls.filter(([name]) => name === '--stagger-interval'),
    ).toHaveLength(1)
  })
})
```

- [ ] Run `pnpm -F web test:run src/components/lab/VerdictCard.test.tsx src/components/lab/VerdictCard.delay.test.tsx`. Expected: FAIL, missing module.
- [ ] Implement `VerdictCard.tsx`.
- [ ] Run `pnpm -F web test:run src/components/lab src/components/motion`. Expected: all pass, including the unchanged `Stagger.test.tsx`.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/components/lab/VerdictCard.tsx app/web/src/components/lab/VerdictCard.test.tsx app/web/src/components/lab/VerdictCard.delay.test.tsx
git commit -m "feat(lab): render each verdict as a labelled card with its Why drawer"
```

### P1-T15: WorkflowBuilder core (add, name, answer, status region)

Files:

- Create: `app/web/src/components/lab/WorkflowBuilder.tsx`, `app/web/src/components/lab/WorkflowBuilder.test.tsx`

Interfaces:

- Consumes: `workflowReducer`, `initialWorkflow` (P1-T9); `StepCard` (P1-T11); `VerdictCard` (P1-T14); `classifyStep`; copy; `MAX_STEPS`; `Section`, `Container`, `Button`.
- Produces: `WorkflowBuilder({ snippets }: { snippets: Readonly<Record<RuleId, ReactNode>> })`.

Behavior contract:

- `'use client'`. `useReducer(workflowReducer, undefined, initialWorkflow)`; `openId` state (starts `'step-1'`); `status` state `{ text: string; seq: number }`, set only through `announce(text)`, which increments `seq` on every call so a repeated identical message is still a new DOM node (Ruling R-RESEQ).
- `staggerIds` state, a `ReadonlySet<string>` initialised lazily to the ids present at first mount (`useState<ReadonlySet<string>>(() => new Set(initialWorkflow().steps.map((step) => step.id)))`); P1-T17 replaces it with the preset's ids on a preset load. Steps added later are not in it, so their cards reveal with `revealOrder` 0 (Ruling R-STAGGER).
- `const controls = useRef(new Map<string, HTMLElement>())`, keyed `${stepId}:${control}`; `const pendingFocus = useRef<string | null>(null)`; `addRef` for the Add button. One `useEffect` with no dependency array: if `pendingFocus.current` is set, focus that element (`'add'` means the Add button) and reset the ref. No state is set in any effect.
- Renders `<Section aria-labelledby="lab-builder-heading"><Container>`: `<h2 id="lab-builder-heading">{builderCopy.heading}</h2>`, `<p>{builderCopy.intro}</p>`, an `<ol>` of `StepCard`s (each with `open={step.id === openId}`, `onToggle={() => { setOpenId(open ? null : step.id) }}` where `open` is that card's `step.id === openId`, so opening one step closes the others (Ruling R-ACCORDION), `verdictLabel` from `verdictCopy`, and a `VerdictCard` child with `revealOrder={staggerIds.has(step.id) ? index : 0}` and `snippet={snippets[result.ruleId]}`), then the Add button, then `<p role="status" data-lab-status className="sr-only"><span key={status.seq}>{status.text}</span></p>`. Every "set status" below means `announce(...)`.
- Add: if `steps.length >= MAX_STEPS` do nothing. Otherwise dispatch `add`, set `openId` to the new id (`step-${state.nextId}`), set `pendingFocus` to `${newId}:name`, set status `fillTemplate(statusCopy.added, { step: stepLabel(steps.length + 1, '') })`.
- At `MAX_STEPS` the Add button keeps focus ability, gets `aria-disabled="true"` and reads `builderCopy.addLimit`.
- Rename dispatches `rename` and never touches `status`.
- Answer: compute `before = classifyStep(step.answers)` and `after = classifyStep({ ...step.answers, [key]: value })` in the handler; dispatch; if `before.verdict !== after.verdict || before.humanSignOff !== after.humanSignOff`, set status `fillTemplate(statusCopy.verdict, { step: stepLabel(position, step.name), verdict: verdictPhrase(after.verdict, after.humanSignOff) })` (Ruling R-ANNOUNCE).
- Move and remove are wired in P1-T16; until then pass no-op handlers is not allowed (dead code), so implement this task's `onMove`/`onRemove` as the real dispatches without focus or status, and P1-T16 adds focus, status and undo.

- [ ] Write the failing test `WorkflowBuilder.test.tsx`:

```tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  answerCopy,
  builderCopy,
  fillTemplate,
  questionCopy,
  verdictCopy,
} from '@/content/lab/copy'
import { MAX_STEPS } from '@/content/lab/limits'
import { RULE_IDS, type RuleId } from '@/content/lab/rubric'
import { WorkflowBuilder } from './WorkflowBuilder'

const snippets = Object.fromEntries(
  RULE_IDS.map((id) => [id, <pre key={id}>{id}</pre>]),
) as Record<RuleId, ReactNode>

function status() {
  return document.querySelector('[data-lab-status]')
}

function nameField(n: number) {
  return screen.getByLabelText(fillTemplate(builderCopy.stepNameLabel, { n }))
}

async function answer(n: number, key: keyof typeof questionCopy, value: 'yes' | 'no') {
  const step = screen.getByTestId(`step-${String(n)}`)
  const group = within(step).getByRole('group', { name: questionCopy[key].text })
  await userEvent.click(within(group).getByRole('radio', { name: answerCopy[value] }))
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('WorkflowBuilder', () => {
  it('starts with one unanswered step that is worth a conversation', () => {
    render(<WorkflowBuilder snippets={snippets} />)
    expect(screen.getAllByTestId(/^step-\d+$/)).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(
      verdictCopy.unclear.label,
    )
  })

  it('focuses the new name field and announces an added step', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    expect(nameField(2)).toHaveFocus()
    expect(status()).toHaveTextContent('Step 2 added.')
  })

  it('never announces name keystrokes', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.type(nameField(1), 'Send invoices')
    expect(status()?.textContent).toBe('')
  })

  it('announces a verdict change with the step name', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.type(nameField(1), 'Pay suppliers')
    await answer(1, 'costly', 'yes')
    await answer(1, 'checkable', 'no')
    await answer(1, 'fixedForm', 'no')
    expect(status()).toHaveTextContent('Step 1, Pay suppliers: keep a person on it')
  })

  it('stops at eight steps with an aria-disabled Add that says why', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    for (let i = 1; i < MAX_STEPS; i += 1) {
      await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    }
    const add = screen.getByRole('button', { name: builderCopy.add })
    expect(add).toHaveAttribute('aria-disabled', 'true')
    expect(add).toHaveAccessibleDescription(builderCopy.addLimit)
    await userEvent.click(add)
    expect(screen.getAllByTestId(/^step-\d+$/)).toHaveLength(MAX_STEPS)
  })

  it('keeps one step open at a time', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    const body = (n: number) => document.getElementById(`step-${String(n)}-body`)
    const toggle = (n: number) =>
      within(screen.getByTestId(`step-${String(n)}`)).getByRole('button', {
        name: /answered/,
      })
    expect(body(2)).toHaveClass('block')
    expect(body(1)).toHaveClass('hidden')
    await userEvent.click(toggle(1))
    expect(body(1)).toHaveClass('block')
    expect(body(2)).toHaveClass('hidden')
    await userEvent.click(toggle(1))
    expect(body(1)).toHaveClass('hidden')
    expect(body(2)).toHaveClass('hidden')
  })

  it('under full motion remounts only the changed step verdict block', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await waitFor(() => {
      expect(document.querySelector('[data-reveal="pending"]')).toBeNull()
    })
    const block = (n: number) =>
      screen.getByTestId(`step-${String(n)}`).querySelector('[data-verdict-block]')
    await answer(1, 'costly', 'no')
    const firstBefore = block(1)
    const secondBefore = block(2)
    await answer(1, 'fixedForm', 'no')
    expect(block(1)).not.toBe(firstBefore)
    expect(block(1)).toHaveClass('motion-safe:starting:opacity-0')
    expect(block(1)).toHaveTextContent(verdictCopy['language-model'].label)
    expect(block(2)).toBe(secondBefore)
  })
})
```

- [ ] Run `pnpm -F web test:run src/components/lab/WorkflowBuilder.test.tsx`. Expected: FAIL, missing module.
- [ ] Implement `WorkflowBuilder.tsx`. Keep handlers as small named functions inside the component.
- [ ] Run the test. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass. If `react-hooks/refs` flags reading `controls.current` during render, move the read into the callback ref or the effect.
- [ ] Commit:

```
git add app/web/src/components/lab/WorkflowBuilder.tsx app/web/src/components/lab/WorkflowBuilder.test.tsx
git commit -m "feat(lab): build a workflow step by step with a status region"
```

### P1-T16: WorkflowBuilder move, remove, undo and focus

Files:

- Edit: `app/web/src/components/lab/WorkflowBuilder.tsx`, `app/web/src/components/lab/WorkflowBuilder.test.tsx`

Interfaces:

- Consumes: P1-T15.
- Produces: no new exports.

Behavior contract:

- Move: if the target position is off either edge, do nothing (the button is `aria-disabled`). Otherwise dispatch, set `pendingFocus` to `${id}:${direction === 'up' ? 'up' : 'down'}`, set status `fillTemplate(direction === 'up' ? statusCopy.movedUp : statusCopy.movedDown, { step: stepLabel(newPosition, name) })`.
- Remove: dispatch; the next step is the one now at the same index, else none. Set `openId` and `pendingFocus` to that step's `name`, or `pendingFocus = 'add'` if none. Status `fillTemplate(statusCopy.removed, { step: stepLabel(position, name) })`.
- While `state.removed` is set and `state.steps.length < MAX_STEPS`, render between the list and the Add button, so Undo is one Shift+Tab before Add: `<div ref={undoRef} data-undo onFocus={pauseUndo} onBlur={resumeUndo}><p>{builderCopy.removedNotice}</p><Button variant="link" size="md" className="min-w-11" type="button" onClick={undo}>{builderCopy.undo}</Button></div>`. At `MAX_STEPS` the block is not rendered (Ruling R-UNDO).
- Pause (Ruling R-UNDO): `undoFocused` state, set to `true` in `pauseUndo` (the block's `onFocus`) and to `false` in `resumeUndo` (the block's `onBlur`) only when `event.relatedTarget` is not inside `event.currentTarget`. Both are event handlers, so no state is set in an effect.
- Undo: `const next = workflowReducer(state, { type: 'undo' })`; if `next === state` (nothing to restore, or `MAX_STEPS` reached) return with no dispatch, no status and no focus change. Otherwise dispatch `undo`, set `openId` and `pendingFocus` to the restored step's `name`, status `fillTemplate(statusCopy.restored, { step: stepLabel(index + 1, name) })`.
- Expiry: `useEffect(() => { if (state.removed === null || undoFocused) return; const timer = window.setTimeout(expireUndo, 10_000); return () => { window.clearTimeout(timer) } }, [state.removed, undoFocused])`. Focus leaving the block restarts the full 10 seconds. `expireUndo` runs in the timer callback, not the effect body: if `undoRef.current?.contains(document.activeElement)` (the window lost focus while Undo held it), set `pendingFocus = 'add'`; then dispatch `expire-undo`, and the no-dependency focus effect moves focus to Add after the block unmounts.

- [ ] Add failing tests:

```tsx
describe('WorkflowBuilder move, remove and undo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  async function threeSteps() {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.type(nameField(1), 'One')
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await userEvent.type(nameField(2), 'Two')
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await userEvent.type(nameField(3), 'Three')
  }

  it('keeps focus on the same button of the moved step', async () => {
    await threeSteps()
    await userEvent.click(screen.getByRole('button', { name: 'Move Step 2, Two up' }))
    expect(screen.getByRole('button', { name: 'Move Step 1, Two up' })).toHaveFocus()
    expect(status()).toHaveTextContent('Moved up. Now Step 1, Two.')
  })

  it('focuses the next step name after a remove, or Add when none is left', async () => {
    await threeSteps()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 2, Two' }))
    expect(nameField(2)).toHaveValue('Three')
    expect(nameField(2)).toHaveFocus()
    expect(status()).toHaveTextContent(
      fillTemplate(statusCopy.removed, { step: 'Step 2, Two' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 2, Three' }))
    expect(screen.getByRole('button', { name: builderCopy.add })).toHaveFocus()
  })

  it('re-renders the status node when the same removal message repeats', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 2' }))
    const first = status()?.firstElementChild
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 2' }))
    const second = status()?.firstElementChild
    expect(second?.textContent).toBe(first?.textContent)
    expect(second).not.toBe(first)
  })

  it('offers Undo that restores the step in place', async () => {
    await threeSteps()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 2, Two' }))
    expect(screen.getByText(builderCopy.removedNotice)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: builderCopy.undo }))
    expect(nameField(2)).toHaveValue('Two')
    expect(nameField(2)).toHaveFocus()
    expect(status()).toHaveTextContent('Step 2, Two restored.')
  })

  async function removeWithFakeTimers() {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<WorkflowBuilder snippets={snippets} />)
    await user.click(screen.getByRole('button', { name: builderCopy.add }))
    await user.click(screen.getByRole('button', { name: 'Remove Step 2' }))
  }

  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  function undoButton() {
    return screen.queryByRole('button', { name: builderCopy.undo })
  }

  it('withdraws Undo after ten seconds', async () => {
    await removeWithFakeTimers()
    expect(undoButton()).toBeInTheDocument()
    await advance(10_000)
    expect(undoButton()).not.toBeInTheDocument()
  })

  it('pauses the Undo countdown while focus is inside the Undo block', async () => {
    await removeWithFakeTimers()
    act(() => {
      undoButton()?.focus()
    })
    await advance(15_000)
    expect(undoButton()).toBeInTheDocument()
    act(() => {
      screen.getByRole('button', { name: builderCopy.add }).focus()
    })
    await advance(9_999)
    expect(undoButton()).toBeInTheDocument()
    await advance(1)
    expect(undoButton()).not.toBeInTheDocument()
  })

  it('moves focus to Add when Undo expires while it still holds focus', async () => {
    await removeWithFakeTimers()
    const undo = undoButton()
    act(() => {
      undo?.focus()
    })
    fireEvent.blur(undo!, { relatedTarget: null })
    expect(undo).toHaveFocus()
    await advance(10_000)
    expect(undoButton()).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: builderCopy.add })).toHaveFocus()
  })

  it('hides Undo at eight steps and never announces a restore that did not happen', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    for (let i = 1; i < MAX_STEPS; i += 1) {
      await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    }
    await userEvent.click(
      screen.getByRole('button', { name: `Remove Step ${String(MAX_STEPS)}` }),
    )
    expect(undoButton()).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    expect(screen.getAllByTestId(/^step-\d+$/)).toHaveLength(MAX_STEPS)
    expect(undoButton()).not.toBeInTheDocument()
    expect(screen.queryByText(builderCopy.removedNotice)).not.toBeInTheDocument()
    expect(status()).not.toHaveTextContent(/restored/)
    expect(nameField(MAX_STEPS)).toHaveFocus()
  })
})
```

Add `act` and `fireEvent` to the `@testing-library/react` import, `afterEach` to the `vitest` import, and `statusCopy` to the `@/content/lab/copy` import.

- [ ] Run the test file. Expected: the eight new tests FAIL.
- [ ] Implement the contract.
- [ ] Run the test file. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/components/lab/WorkflowBuilder.tsx app/web/src/components/lab/WorkflowBuilder.test.tsx
git commit -m "feat(lab): move, remove and undo steps with managed focus"
```

### P1-T16b: feedback marks context

Files:

- Create: `app/web/src/components/lab/feedbackMarks.tsx`, `app/web/src/components/lab/feedbackMarks.test.tsx`
- Edit: `app/web/src/components/lab/WorkflowBuilder.tsx`
- Create: `app/web/src/components/lab/WorkflowBuilder.marks.test.tsx`

Interfaces:

- Consumes: `Verdict`, `RuleId` (P1-T1); `WorkflowBuilder` (P1-T16).
- Produces (Ruling R-MARKS, the shared interface above): `markKey(stepId: string, verdict: Verdict, ruleId: RuleId): string`, which returns `${stepId}:${verdict}:${ruleId}`; `FeedbackMarksProvider({ children }: { children: ReactNode })`; `useFeedbackMarks(): { alreadySent: (key: string) => boolean; recordSent: (key: string) => void }`.

Behavior contract:

- `'use client'`. `FeedbackMarksProvider` holds `useState<ReadonlySet<string>>(() => new Set())`. `recordSent(key)` sets a new `Set` with the key added, and returns the same set when the key is already there. `alreadySent(key)` reads the current set. Both are wrapped in `useCallback`, and the context value in `useMemo`, so consumers re-render only when the set changes.
- `useFeedbackMarks()` outside a provider throws `Error('useFeedbackMarks must be used inside FeedbackMarksProvider')`.
- `WorkflowBuilder` wraps everything it returns in `<FeedbackMarksProvider>`, so the marks live as long as the builder, not as long as any card. P1-T17's preset section and P1-T18's summary go inside the same provider.
- Nothing in phase 1 calls `recordSent`; phase 3's "Wrong?" control does (Ruling R-MARKS).

- [ ] Write the failing test `feedbackMarks.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FeedbackMarksProvider, markKey, useFeedbackMarks } from './feedbackMarks'

const KEY = markKey('step-1', 'language-model', 'R5')

function Probe() {
  const { alreadySent, recordSent } = useFeedbackMarks()
  return (
    <button
      type="button"
      data-sent={String(alreadySent(KEY))}
      onClick={() => {
        recordSent(KEY)
      }}
    >
      Mark
    </button>
  )
}

function Harness({ probeKey }: { probeKey: string }) {
  return (
    <FeedbackMarksProvider>
      <Probe key={probeKey} />
    </FeedbackMarksProvider>
  )
}

describe('feedbackMarks', () => {
  it('builds the key from step id, verdict and rule id', () => {
    expect(KEY).toBe('step-1:language-model:R5')
  })

  it('records a mark and keeps it when the consumer remounts', async () => {
    const { rerender } = render(<Harness probeKey="a" />)
    expect(screen.getByRole('button', { name: 'Mark' })).toHaveAttribute(
      'data-sent',
      'false',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mark' }))
    const before = screen.getByRole('button', { name: 'Mark' })
    expect(before).toHaveAttribute('data-sent', 'true')
    rerender(<Harness probeKey="b" />)
    const after = screen.getByRole('button', { name: 'Mark' })
    expect(after).not.toBe(before)
    expect(after).toHaveAttribute('data-sent', 'true')
  })

  it('throws outside a provider', () => {
    expect(() => render(<Probe />)).toThrow(/FeedbackMarksProvider/)
  })
})
```

- [ ] Write the failing test `WorkflowBuilder.marks.test.tsx`. It mocks `VerdictCard` with a consumer of the marks, so it lives in its own file:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { builderCopy, fillTemplate } from '@/content/lab/copy'
import { RULE_IDS, type RubricResult, type RuleId } from '@/content/lab/rubric'
import { markKey, useFeedbackMarks } from './feedbackMarks'
import { WorkflowBuilder } from './WorkflowBuilder'

vi.mock('./VerdictCard', () => ({
  VerdictCard: ({ name, result }: { name: string; result: RubricResult }) => {
    const { alreadySent, recordSent } = useFeedbackMarks()
    const key = markKey(name, result.verdict, result.ruleId)
    return (
      <button
        type="button"
        data-sent={String(alreadySent(key))}
        onClick={() => {
          recordSent(key)
        }}
      >
        Mark
      </button>
    )
  },
}))

const snippets = Object.fromEntries(
  RULE_IDS.map((id) => [id, <pre key={id}>{id}</pre>]),
) as Record<RuleId, ReactNode>

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('WorkflowBuilder feedback marks', () => {
  it('keeps a mark when the verdict card remounts after remove and undo', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    const nameField = (n: number) =>
      screen.getByLabelText(fillTemplate(builderCopy.stepNameLabel, { n }))
    await userEvent.type(nameField(1), 'One')
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await userEvent.type(nameField(2), 'Two')
    const mark = (n: number) =>
      within(screen.getByTestId(`step-${String(n)}`)).getByRole('button', {
        name: 'Mark',
      })
    await userEvent.click(mark(1))
    const before = mark(1)
    expect(before).toHaveAttribute('data-sent', 'true')
    expect(mark(2)).toHaveAttribute('data-sent', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 1, One' }))
    await userEvent.click(screen.getByRole('button', { name: builderCopy.undo }))
    expect(nameField(1)).toHaveValue('One')
    expect(mark(1)).not.toBe(before)
    expect(mark(1)).toHaveAttribute('data-sent', 'true')
    expect(mark(2)).toHaveAttribute('data-sent', 'false')
  })
})
```

- [ ] Run `pnpm -F web test:run src/components/lab/feedbackMarks.test.tsx src/components/lab/WorkflowBuilder.marks.test.tsx`. Expected: FAIL, `Failed to resolve import "./feedbackMarks"`.
- [ ] Implement `feedbackMarks.tsx` and wrap the `WorkflowBuilder` tree in `FeedbackMarksProvider`.
- [ ] Run `pnpm -F web test:run src/components/lab`. Expected: all pass, including the unchanged `WorkflowBuilder.test.tsx`.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/components/lab/feedbackMarks.tsx app/web/src/components/lab/feedbackMarks.test.tsx app/web/src/components/lab/WorkflowBuilder.tsx app/web/src/components/lab/WorkflowBuilder.marks.test.tsx
git commit -m "feat(lab): keep sent feedback marks above the verdict cards"
```

### P1-T17: example presets

Files:

- Edit: `app/web/src/content/lab/copy.ts`, `app/web/src/content/lab/copy.test.ts`
- Edit: `app/web/src/components/lab/WorkflowBuilder.tsx`, `app/web/src/components/lab/WorkflowBuilder.test.tsx`
- Create: `app/web/src/components/lab/WorkflowBuilder.stagger.test.tsx`

Interfaces:

- Consumes: `StepAnswers`, `Answer`, `Frequency`, `classifyStep`; reducer `load` action.
- Produces: `presetsCopy`, `Preset`, `presets: readonly Preset[]` in `copy.ts`.

Preset content (Ruling R-PRESETS). Answers are `fixedForm, checklist, changes, costly, checkable, pastCases, frequency`; `changes` is `null` (shown as `-`) whenever `checklist` is not `yes`, because follow-up 2b is hidden then:

| Preset         | Step                                                        | Answers                                   | Expected rule, verdict       |
| -------------- | ----------------------------------------------------------- | ----------------------------------------- | ---------------------------- |
| Invoice intake | Read the supplier's invoice PDF                             | no, no, -, no, yes, yes, daily            | R5 language-model            |
|                | Match the invoice to its purchase order                     | yes, yes, no, yes, yes, yes, daily        | R7 plain-code + sign-off     |
|                | Send invoices over the spending limit to the right approver | yes, yes, yes, yes, yes, yes, weekly      | R8 rules + sign-off          |
|                | Decide whether to dispute a charge                          | yes, no, -, yes, no, no, monthly-or-less  | R2 do-not-automate           |
| Support inbox  | Sort incoming emails by topic                               | no, no, -, no, yes, yes, daily            | R5 language-model            |
|                | Fill the order-status reply template from the order system  | yes, yes, no, no, yes, yes, daily         | R7 plain-code                |
|                | Flag customers likely to cancel                             | yes, no, -, no, yes, yes, weekly          | R10 classic-ml               |
|                | Reply to a complaint about a late delivery                  | no, no, -, yes, yes, yes, daily           | R5 language-model + sign-off |
| Quote requests | Pull job details from the request email                     | no, no, -, no, yes, yes, daily            | R5 language-model            |
|                | Price a standard job from the rate card                     | yes, yes, yes, yes, yes, yes, daily       | R8 rules + sign-off          |
|                | Estimate how long a custom job takes                        | yes, no, -, yes, yes, yes, weekly         | R10 classic-ml + sign-off    |
|                | Decide whether to take on an unusual job                    | yes, no, -, yes, yes, no, monthly-or-less | R11 do-not-automate          |

Every step name is at most `NAME_MAX` (60) characters, because `loadSeeds` cuts longer names; the copy test pins it. Ruling: the order-status step reads "Fill the order-status reply template from the order system" (58 characters), not "Fill in the order-status reply template from the order system" (61), so the name is never cut (cost if wrong: one word of wording the owner can change within the limit).

Invoice-to-PO matching and the unusual job are both costly (`costly` yes): a wrong match pays the wrong amount, and a wrong call on an unusual job loses money or a customer. Both are checked first, so the match carries sign-off and the unusual job stays with a person because there is no record to learn from.

Code shape in `copy.ts`:

```ts
export const presetsCopy = {
  heading: 'Load an example workflow',
  intro: 'Each example replaces your steps with four answered ones.',
  load: 'Load {preset}',
} as const

export interface Preset {
  readonly id: 'invoice-intake' | 'support-inbox' | 'quote-requests'
  readonly title: string
  readonly steps: readonly { readonly name: string; readonly answers: StepAnswers }[]
}

type Six = readonly [Answer, Answer, Answer, Answer, Answer, Answer]

function seed(
  name: string,
  [fixedForm, checklist, changes, costly, checkable, pastCases]: Six,
  frequency: Frequency,
) {
  return {
    name,
    answers: { fixedForm, checklist, changes, costly, checkable, pastCases, frequency },
  }
}
```

then `export const presets: readonly Preset[] = [...]` with the table above, titles `Invoice intake`, `Support inbox`, `Quote requests`. Change the `copy.ts` type import to include `StepAnswers`.

Builder: a first `<Section aria-labelledby="lab-presets-heading">` before the builder section, `<h2>` `presetsCopy.heading`, the intro, and one `Button variant="secondary"` per preset labelled `fillTemplate(presetsCopy.load, { preset: title })`. Clicking dispatches `load`, sets `openId` to the first new id (`step-${state.nextId}`), sets `staggerIds` to the new ids so the loaded cards stagger in step order (Ruling R-STAGGER), sets status `fillTemplate(statusCopy.loaded, { preset: title, count: steps.length })`, and moves no focus (Ruling R-PRESET).

- [ ] Add failing tests. In `copy.test.ts`:

```ts
import { presets } from './copy'
import { NAME_MAX } from './limits'
import { classifyStep, visibleQuestions } from './rubric'

const EXPECTED: Readonly<Record<string, readonly string[]>> = {
  'invoice-intake': ['R5', 'R7+', 'R8+', 'R2'],
  'support-inbox': ['R5', 'R7', 'R10', 'R5+'],
  'quote-requests': ['R5', 'R8+', 'R10+', 'R11'],
}

describe('presets', () => {
  it('offers the three spec examples with four fully answered steps each', () => {
    expect(presets.map((preset) => preset.id)).toEqual([
      'invoice-intake',
      'support-inbox',
      'quote-requests',
    ])
    for (const preset of presets) {
      expect(preset.steps).toHaveLength(4)
      for (const step of preset.steps) {
        expect(step.name.length, step.name).toBeLessThanOrEqual(NAME_MAX)
        for (const key of visibleQuestions(step.answers))
          expect(step.answers[key], `${preset.id} ${step.name} ${key}`).not.toBeNull()
        if (step.answers.checklist !== 'yes') expect(step.answers.changes).toBeNull()
        expect(step.answers.frequency).not.toBeNull()
      }
    }
  })

  it.each(presets)('$id lands on the rules and sign-offs the plan pins', (preset) => {
    expect(
      preset.steps.map((step) => {
        const result = classifyStep(step.answers)
        return `${result.ruleId}${result.humanSignOff ? '+' : ''}`
      }),
    ).toEqual(EXPECTED[preset.id])
  })
})
```

In `WorkflowBuilder.test.tsx`:

```tsx
it('loads a preset, announces it and keeps focus on the preset button', async () => {
  render(<WorkflowBuilder snippets={snippets} />)
  const load = screen.getByRole('button', { name: 'Load Invoice intake' })
  await userEvent.click(load)
  expect(screen.getAllByTestId(/^step-\d+$/)).toHaveLength(4)
  expect(nameField(1)).toHaveValue("Read the supplier's invoice PDF")
  expect(status()).toHaveTextContent('Loaded the Invoice intake example with 4 steps.')
  expect(load).toHaveFocus()
})
```

New file `WorkflowBuilder.stagger.test.tsx`. It mocks `Reveal` to expose `data-delay` and fixes the token at 80 ms, so it lives in its own file. It checks the `revealOrder` wiring of Ruling R-STAGGER end to end; the cap itself is pinned in `VerdictCard.delay.test.tsx`, because a preset has four steps, so its last index is exactly 3:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { builderCopy } from '@/content/lab/copy'
import { RULE_IDS, type RuleId } from '@/content/lab/rubric'
import { WorkflowBuilder } from './WorkflowBuilder'

vi.mock('@/components/motion/Reveal', () => ({
  Reveal: ({ children, delay }: { children: ReactNode; delay?: number }) => (
    <div data-delay={String(delay)}>{children}</div>
  ),
}))

vi.mock('@/components/motion/tokens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/motion/tokens')>()),
  readDurationSeconds: (name: string) => (name === '--stagger-interval' ? 0.08 : 0),
}))

const snippets = Object.fromEntries(
  RULE_IDS.map((id) => [id, <pre key={id}>{id}</pre>]),
) as Record<RuleId, ReactNode>

function delays(): number[] {
  return screen
    .getAllByTestId(/^step-\d+$/)
    .map((step) => Number(step.querySelector('[data-delay]')?.getAttribute('data-delay')))
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('WorkflowBuilder reveal order', () => {
  it('gives the first step order 0 and a step added later order 0', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    expect(delays()).toEqual([0])
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    expect(delays()).toEqual([0, 0])
  })

  it('staggers a preset load by step index, capped at 3', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: 'Load Invoice intake' }))
    const loaded = delays()
    expect(loaded).toHaveLength(4)
    loaded.forEach((delay, index) => {
      expect(delay).toBeCloseTo(Math.min(index, 3) * 0.08)
    })
  })
})
```

- [ ] Run `pnpm -F web test:run src/content/lab src/components/lab`. Expected: the new tests FAIL.
- [ ] Implement the presets and the preset section.
- [ ] Run the same command. Expected: all pass, including the copy content test over the new strings.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/content/lab/copy.ts app/web/src/content/lab/copy.test.ts app/web/src/components/lab/WorkflowBuilder.tsx app/web/src/components/lab/WorkflowBuilder.test.tsx app/web/src/components/lab/WorkflowBuilder.stagger.test.tsx
git commit -m "feat(lab): load one of three example workflows"
```

### P1-T18: SummaryTable with the Cards / Table toggle

Files:

- Create: `app/web/src/components/lab/SummaryTable.tsx`, `app/web/src/components/lab/SummaryTable.test.tsx`
- Edit: `app/web/src/components/lab/WorkflowBuilder.tsx` (render it after the builder section)

Interfaces:

- Consumes: `RubricResult`; `summaryCopy`, `verdictCopy`, `signOffCopy`, `stepLabel`.
- Produces: `SummaryRow { position: number; name: string; result: RubricResult }`; `SummaryTable({ rows }: { rows: readonly SummaryRow[] })`.

Markup contract:

- `'use client'`. `<Section aria-labelledby="lab-summary-heading">`, `<h2>` `summaryCopy.heading`, `<p>` intro.
- A `<div role="group" aria-label={summaryCopy.viewLabel}>` with two `Button variant="secondary" size="sm"` toggles using `aria-pressed`; default view is `table`.
- Table view: a scroll container (`overflow-x-auto`, Ruling R-SCROLL, `aria-label={summaryCopy.scrollLabel}`) holding `<table>` with `<caption className="sr-only">`, `<th scope="col">` headers from `summaryCopy.columns`, one row per step: step label, verdict label plus sign-off, `result.why`, rule id in `font-mono`.
- Cards view: `<ul>` with one `Card` per step showing the same four facts in a `<dl>`.

- [ ] Write the failing test:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { summaryCopy, verdictCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { SummaryTable } from './SummaryTable'

const rows = [
  {
    position: 1,
    name: 'Send invoices',
    result: classifyStep({
      ...EMPTY_ANSWERS,
      costly: 'no',
      fixedForm: 'yes',
      checklist: 'yes',
    }),
  },
  { position: 2, name: '', result: classifyStep(EMPTY_ANSWERS) },
]

describe('SummaryTable', () => {
  it('opens as a captioned table with one row per step', () => {
    render(<SummaryTable rows={rows} />)
    const table = screen.getByRole('table', { name: summaryCopy.caption })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText(verdictCopy['plain-code'].label)).toBeInTheDocument()
    expect(within(table).getByText('R7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: summaryCopy.table })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('wraps the table in a labelled, focusable scroll region', () => {
    render(<SummaryTable rows={rows} />)
    expect(screen.getByRole('region', { name: summaryCopy.scrollLabel })).toHaveAttribute(
      'tabindex',
      '0',
    )
  })

  it('switches to cards for any visitor', async () => {
    render(<SummaryTable rows={rows} />)
    await userEvent.click(screen.getByRole('button', { name: summaryCopy.cards }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('button', { name: summaryCopy.cards })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
```

- [ ] Run it. Expected: FAIL, missing module.
- [ ] Implement `SummaryTable.tsx` and render `<SummaryTable rows={…} />` after the builder section in `WorkflowBuilder`.
- [ ] Run `pnpm -F web test:run src/components/lab`. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/components/lab/SummaryTable.tsx app/web/src/components/lab/SummaryTable.test.tsx app/web/src/components/lab/WorkflowBuilder.tsx
git commit -m "feat(lab): summarise the workflow as a table or cards"
```

### P1-T19: ProgressRail and the sticky summary column

Files:

- Create: `app/web/src/components/lab/ProgressRail.tsx`, `app/web/src/components/lab/ProgressRail.test.tsx`
- Edit: `app/web/src/components/lab/WorkflowBuilder.tsx`

Interfaces:

- Consumes: `visibleQuestions`, `VERDICTS`, `StepAnswers`, `RubricResult`; `progressCopy`, `verdictCopy`; `VERDICT_STYLE`.
- Produces: `summarize(steps: readonly { answers: StepAnswers; result: RubricResult }[]): { resolved: number; total: number; tally: Readonly<Record<Verdict, number>> }`; `ProgressRail({ resolved, total, tally })`.

Markup contract:

- `<h2>` `progressCopy.heading`; `<p>` `fillTemplate(progressCopy.resolved, { resolved, total })`.
- Rail: `<div aria-hidden="true" className="h-px w-full bg-border">` containing `<div data-progress-fill className="h-px origin-left bg-brand motion-safe:transition-transform motion-safe:duration-(--duration-standard) motion-safe:ease-(--ease-standard)" style={{ transform: `scaleX(${String(total === 0 ? 0 : resolved / total)})` }} />`.
- `<ul>` of verdicts with a count above zero, each with its hidden inline marker (`<span aria-hidden="true" className={VERDICT_STYLE[verdict].marker} />`, never `cardRule`), label and count.
- A step is resolved when every `visibleQuestions(step.answers)` answer is non-null: questions 1 to 5, plus follow-up 2b when question 2 is yes (Ruling R-RESOLVED).
- In `WorkflowBuilder`, the builder section becomes a two-column grid at `lg` (`lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10`): the list on the left, `<aside aria-label={progressCopy.heading} data-sticky-layout className="self-start lg:sticky lg:top-24">` with `ProgressRail` on the right. It is sticky for every visitor, reduced motion included, because sticky layout is not motion; P1-T24 narrows the reduced-motion gate to skip `[data-sticky-layout]`. Below `lg` the aside stacks after the list (Ruling R-STICKY-ALL).

- [ ] Write the failing test:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { verdictCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, classifyStep, type StepAnswers } from '@/content/lab/rubric'
import { ProgressRail, summarize } from './ProgressRail'

const full: StepAnswers = {
  ...EMPTY_ANSWERS,
  fixedForm: 'yes',
  checklist: 'yes',
  changes: 'no',
  costly: 'no',
  checkable: 'not-sure',
  pastCases: 'no',
}
const steps = [full, EMPTY_ANSWERS].map((answers) => ({
  answers,
  result: classifyStep(answers),
}))

describe('ProgressRail', () => {
  it('counts a step as resolved once every visible question has any answer', () => {
    expect(
      summarize([{ answers: { ...full, changes: null }, result: classifyStep(full) }])
        .resolved,
    ).toBe(0)
    const summary = summarize(steps)
    expect(summary.resolved).toBe(1)
    expect(summary.total).toBe(2)
    expect(summary.tally['plain-code']).toBe(1)
    expect(summary.tally.unclear).toBe(1)
  })

  it('scales a brand line by resolved over total and says it in text', () => {
    const { container } = render(<ProgressRail {...summarize(steps)} />)
    const fill = container.querySelector('[data-progress-fill]')!
    expect(fill).toHaveClass('h-px', 'bg-brand', 'origin-left')
    expect(fill).toHaveStyle({ transform: 'scaleX(0.5)' })
    expect(fill.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('1 of 2 steps answered')).toBeInTheDocument()
  })

  it('lists only the verdicts present', () => {
    render(<ProgressRail {...summarize(steps)} />)
    expect(screen.getByText(verdictCopy['plain-code'].label)).toBeInTheDocument()
    expect(screen.queryByText(verdictCopy['classic-ml'].label)).not.toBeInTheDocument()
  })

  it('draws the do-not-automate marker inline, never as a positioned rule', () => {
    const answers: StepAnswers = {
      ...EMPTY_ANSWERS,
      costly: 'yes',
      checkable: 'no',
      fixedForm: 'no',
    }
    render(<ProgressRail {...summarize([{ answers, result: classifyStep(answers) }])} />)
    const marker = screen
      .getByText(verdictCopy['do-not-automate'].label)
      .closest('li')
      ?.querySelector('[aria-hidden="true"]')
    expect(marker).toHaveClass('h-3', 'w-px', 'bg-brand')
    expect(marker).not.toHaveClass('absolute')
  })
})
```

Add to `WorkflowBuilder.test.tsx`:

```tsx
it('keeps the summary sticky at lg for every visitor and marks it as sticky layout', () => {
  render(<WorkflowBuilder snippets={snippets} />)
  const aside = screen.getByRole('complementary')
  expect(aside).toHaveClass('lg:sticky', 'lg:top-24')
  expect(aside).not.toHaveClass('lg:motion-safe:sticky')
  expect(aside).toHaveAttribute('data-sticky-layout')
})
```

- [ ] Run `pnpm -F web test:run src/components/lab`. Expected: the new tests FAIL.
- [ ] Implement `ProgressRail.tsx` and the grid in `WorkflowBuilder.tsx`.
- [ ] Run the same command. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/components/lab/ProgressRail.tsx app/web/src/components/lab/ProgressRail.test.tsx app/web/src/components/lab/WorkflowBuilder.tsx app/web/src/components/lab/WorkflowBuilder.test.tsx
git commit -m "feat(lab): show progress and a verdict tally beside the steps"
```

### P1-T20: lab result encoding for the contact page

Files:

- Create: `app/web/src/lib/labResult.ts`, `app/web/src/lib/labResult.test.ts`

Interfaces:

- Consumes: `RULE_IDS`, `VERDICTS`, `QUESTION_KEYS`, `getRule`, `RubricResult`, `RuleId`, `StepAnswers`, `Verdict`, `RUBRIC_VERSION`; `MAX_STEPS`, `NAME_MAX`; `sendCopy`, `verdictCopy`, `signOffCopy`, `fillTemplate`, `stepLabel`.
- Produces:

```ts
export interface LabResultStep {
  readonly name: string | null
  readonly verdict: Verdict
  readonly humanSignOff: boolean
  readonly ruleId: RuleId
  readonly unanswered: boolean
}
export interface LabResult {
  readonly rubricVersion: string
  readonly steps: readonly LabResultStep[]
}
export const MAILTO_BODY_MAX = 1500
export function toLabResult(
  steps: readonly { name: string; result: RubricResult; answers: StepAnswers }[],
  includeNames: boolean,
): LabResult
export function encodeLabResult(result: LabResult): string
export function decodeLabResult(encoded: string): LabResult | null
export function formatLabResult(result: LabResult): string
export function labMailtoHref(email: string, text: string): string
```

Format (Ruling R-HASH): `JSON.stringify({ v: 1, rubricVersion, steps })`, UTF-8 via `TextEncoder`, base64 via `btoa`, then `+`→`-`, `/`→`_`, trailing `=` removed. Decoding reverses it with `atob` and `new TextDecoder('utf-8', { fatal: true })` inside one `try`; any throw returns `null`. Then a parser accepts only: an object with `v === 1`; `rubricVersion` a string of 1 to 20 characters; `steps` an array of 1 to `MAX_STEPS` items; each item exactly `{name, verdict, humanSignOff, ruleId, unanswered}` with `name` `null` or a string of at most `NAME_MAX` characters, `verdict` in `VERDICTS`, `ruleId` in `RULE_IDS`, `getRule(ruleId).verdict === verdict`, `humanSignOff` a boolean that is `false` for `do-not-automate` and `unclear`, and `unanswered` a boolean that is `true` only with `ruleId === 'R1'`.

`toLabResult` sets `unanswered` to `true` when every `QUESTION_KEYS` answer and `frequency` are `null` (Ruling R-ASK).

`formatLabResult` returns `sendCopy.intro`, then one line per step `fillTemplate(sendCopy.line, { step: stepLabel(i + 1, name ?? ''), verdict: unanswered ? sendCopy.notAnswered : label + (humanSignOff ? ` ${signOffCopy}` : ''), rule: ruleId, version: rubricVersion })`, then `sendCopy.ask` as the last line, joined with `\n` (Ruling R-ASK).

`labMailtoHref` (Ruling R-MAILTO): `mailto:${email}?subject=${encodeURIComponent(sendCopy.subject)}&body=${encodeURIComponent(body)}`, where `body` drops whole step lines from the end, keeping the intro and the closing `sendCopy.ask` line, and adds `sendCopy.truncated` before the `sendCopy.ask` line once anything was dropped, until `encodeURIComponent(body).length <= MAILTO_BODY_MAX`.

- [ ] Write the failing test `labResult.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sendCopy } from '@/content/lab/copy'
import {
  EMPTY_ANSWERS,
  RUBRIC_VERSION,
  classifyStep,
  type StepAnswers,
} from '@/content/lab/rubric'
import {
  MAILTO_BODY_MAX,
  decodeLabResult,
  encodeLabResult,
  formatLabResult,
  labMailtoHref,
  toLabResult,
} from './labResult'

const signedOff: StepAnswers = {
  ...EMPTY_ANSWERS,
  costly: 'yes',
  checkable: 'yes',
  fixedForm: 'yes',
  checklist: 'yes',
  changes: 'yes',
}
const notSure: StepAnswers = { ...EMPTY_ANSWERS, costly: 'not-sure' }

const steps = [
  { name: 'Envoyer les factures é', result: classifyStep(signedOff), answers: signedOff },
  { name: 'Second', result: classifyStep(EMPTY_ANSWERS), answers: EMPTY_ANSWERS },
  { name: 'Third', result: classifyStep(notSure), answers: notSure },
]

function rawStep(overrides: Record<string, unknown>) {
  return {
    name: null,
    verdict: 'unclear',
    humanSignOff: false,
    ruleId: 'R1',
    unanswered: false,
    ...overrides,
  }
}

function encodeRaw(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

describe('lab result fragment', () => {
  it('round-trips names, verdicts, sign-off and rule ids', () => {
    const result = toLabResult(steps, true)
    expect(decodeLabResult(encodeLabResult(result))).toEqual(result)
  })

  it('leaves names out unless the visitor opts in', () => {
    expect(toLabResult(steps, false).steps.every((step) => step.name === null)).toBe(true)
  })

  it('uses only URL-safe characters', () => {
    expect(encodeLabResult(toLabResult(steps, true))).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it.each([
    ['not base64', '!!!'],
    ['not JSON', encodeRaw('x').slice(0, 3)],
    ['wrong version', encodeRaw({ v: 2, rubricVersion: RUBRIC_VERSION, steps: [] })],
    ['no steps', encodeRaw({ v: 1, rubricVersion: RUBRIC_VERSION, steps: [] })],
    [
      'unknown verdict',
      encodeRaw({ v: 1, rubricVersion: '1.0.0', steps: [rawStep({ verdict: 'magic' })] }),
    ],
    [
      'verdict that is not its rule',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: [rawStep({ verdict: 'plain-code' })],
      }),
    ],
    [
      'sign-off on keep a person',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: [
          rawStep({ verdict: 'do-not-automate', humanSignOff: true, ruleId: 'R2' }),
        ],
      }),
    ],
    [
      'unanswered on a rule other than R1',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: [rawStep({ ruleId: 'R4', unanswered: true })],
      }),
    ],
    [
      'name too long',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: [rawStep({ name: 'x'.repeat(61) })],
      }),
    ],
    [
      'missing unanswered',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: [rawStep({ unanswered: undefined })],
      }),
    ],
    [
      'extra field',
      encodeRaw({ v: 1, rubricVersion: '1.0.0', steps: [rawStep({ note: 'hi' })] }),
    ],
    [
      'nine steps',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: Array.from({ length: 9 }, () => rawStep({})),
      }),
    ],
  ])('rejects %s without throwing', (_label, encoded) => {
    expect(decodeLabResult(encoded)).toBeNull()
  })

  it('marks only a step with no answers at all as unanswered', () => {
    expect(toLabResult(steps, false).steps.map((step) => step.unanswered)).toEqual([
      false,
      true,
      false,
    ])
  })

  it('formats one readable line per step and ends with the ask line', () => {
    expect(formatLabResult(toLabResult(steps, false)).split('\n')).toEqual([
      'Results from Should This Be AI? (the wrong-tool test)',
      `Step 1: A checklist your team can edit + human sign-off (rule R8, rubric ${RUBRIC_VERSION})`,
      `Step 2: not answered yet (rule R1, rubric ${RUBRIC_VERSION})`,
      `Step 3: Worth a conversation (rule R1, rubric ${RUBRIC_VERSION})`,
      sendCopy.ask,
    ])
    expect(sendCopy.ask).toBe('What I would like help with: ')
  })

  it('caps the mailto body at whole lines, says so, and keeps the ask line last', () => {
    const long = Array.from({ length: 8 }, (_, i) => ({
      name: `${'é'.repeat(59)}${String(i)}`,
      result: classifyStep(EMPTY_ANSWERS),
      answers: EMPTY_ANSWERS,
    }))
    const href = labMailtoHref(
      'a@mccorlabs.com',
      formatLabResult(toLabResult(long, true)),
    )
    const body = new URL(href).searchParams.get('body') ?? ''
    expect(encodeURIComponent(body).length).toBeLessThanOrEqual(MAILTO_BODY_MAX)
    expect(body).toContain(sendCopy.truncated)
    expect(body.split('\n').at(-1)).toBe(sendCopy.ask)
    expect(href.startsWith('mailto:a@mccorlabs.com?subject=')).toBe(true)
  })
})
```

- [ ] Run `pnpm -F web test:run src/lib/labResult.test.ts`. Expected: FAIL, missing module.
- [ ] Implement `labResult.ts` with small private helpers (`toBase64Url`, `fromBase64Url`, `parseStep`, `parseLabResult`, `verdictText`).
- [ ] Run the test. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/lib/labResult.ts app/web/src/lib/labResult.test.ts
git commit -m "feat(lab): encode lab results for the contact page fragment"
```

### P1-T21: SendResult

Files:

- Create: `app/web/src/components/lab/SendResult.tsx`, `app/web/src/components/lab/SendResult.test.tsx`
- Edit: `app/web/src/components/lab/WorkflowBuilder.tsx` (render it after the summary)

Interfaces:

- Consumes: `toLabResult`, `encodeLabResult`, `formatLabResult` (P1-T20); `sendCopy`; `Button`; `next/link`.
- Produces: `SendResult({ steps }: { steps: readonly { name: string; result: RubricResult; answers: StepAnswers }[] })`.

Markup contract:

- `'use client'`. `<Section aria-labelledby="lab-send-heading">`, `<h2>` and body from `sendCopy`.
- A checkbox labelled `sendCopy.includeNames`, unchecked by default.
- A preview: `<p id=…>{sendCopy.previewLabel}</p>` and `<pre aria-labelledby=… className="whitespace-pre-wrap font-mono text-sm">{formatLabResult(result)}</pre>`.
- `<Button asChild><Link href={`/contact/#lab=${encodeLabResult(result)}`}>{sendCopy.button}</Link></Button>`.

- [ ] Write the failing test:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { sendCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { decodeLabResult, formatLabResult } from '@/lib/labResult'
import { SendResult } from './SendResult'

const steps = [
  { name: 'Send invoices', result: classifyStep(EMPTY_ANSWERS), answers: EMPTY_ANSWERS },
]

function sentResult() {
  const href =
    screen.getByRole('link', { name: sendCopy.button }).getAttribute('href') ?? ''
  expect(href.startsWith('/contact/#lab=')).toBe(true)
  return decodeLabResult(href.slice('/contact/#lab='.length))
}

describe('SendResult', () => {
  it('leaves step names out by default and previews the exact text', () => {
    render(<SendResult steps={steps} />)
    expect(
      screen.getByRole('checkbox', { name: sendCopy.includeNames }),
    ).not.toBeChecked()
    expect(screen.queryByText(/Send invoices/)).not.toBeInTheDocument()
    expect(formatLabResult(sentResult()!)).toBe(
      document.querySelector('pre')?.textContent,
    )
  })

  it('adds the names to the preview and the link when ticked', async () => {
    render(<SendResult steps={steps} />)
    await userEvent.click(screen.getByRole('checkbox', { name: sendCopy.includeNames }))
    expect(document.querySelector('pre')).toHaveTextContent('Step 1, Send invoices')
    expect(sentResult()?.steps[0]?.name).toBe('Send invoices')
  })
})
```

- [ ] Run it. Expected: FAIL, missing module.
- [ ] Implement `SendResult.tsx` and render it in `WorkflowBuilder` after `SummaryTable`, passing each step's `name`, `classifyStep(answers)` result and `answers`.
- [ ] Run `pnpm -F web test:run src/components/lab`. Expected: all pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Commit:

```
git add app/web/src/components/lab/SendResult.tsx app/web/src/components/lab/SendResult.test.tsx app/web/src/components/lab/WorkflowBuilder.tsx
git commit -m "feat(lab): preview and send the result to the contact page"
```

### P1-T22: contact page reads the lab fragment

Files:

- Create: `app/web/src/components/contact/useLabPrefill.ts`, `app/web/src/components/contact/useLabPrefill.test.tsx`
- Edit: `app/web/src/components/contact/ContactForm.tsx`, `app/web/src/components/contact/ContactForm.test.tsx`

Interfaces:

- Consumes: `decodeLabResult`, `formatLabResult`, `labMailtoHref` (P1-T20); `contactLabCopy`; `BookingCta`; `site.contactEmail`.
- Produces: `useLabPrefill(): string | null`; `ContactForm` behavior below. Its props do not change, so `app/web/src/app/contact/page.tsx` stays untouched.

Hook contract (Ruling R-PREFILL):

```ts
'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import { decodeLabResult, formatLabResult } from '@/lib/labResult'

const PREFIX = '#lab='

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
  }
}

function readHash(): string {
  return window.location.hash
}

function serverHash(): string {
  return ''
}

export function useLabPrefill(): string | null {
  const hash = useSyncExternalStore(subscribe, readHash, serverHash)
  const [taken, setTaken] = useState<string | null>(null)
  if (hash.startsWith(PREFIX) && hash !== taken) setTaken(hash)

  useEffect(() => {
    if (taken !== null && window.location.hash === taken) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      )
    }
  }, [taken])

  return useMemo(() => {
    if (taken === null) return null
    const result = decodeLabResult(taken.slice(PREFIX.length))
    return result === null ? null : formatLabResult(result)
  }, [taken])
}
```

ContactForm changes:

- Call `const prefill = useLabPrefill()` before the `endpoint === null` branch.
- When `prefill !== null`, render a notice block at the top: `<p>{contactLabCopy.added}</p>` and `<BookingCta size="sm" />` (Ruling R-BOOK).
- Endpoint branch: the message `<textarea>` gets `key={prefill ?? 'empty'}` and `defaultValue={prefill ?? undefined}`.
- No-endpoint branch: when `prefill !== null`, add `<Button asChild variant="link"><a href={labMailtoHref(site.contactEmail, prefill)}>{contactLabCopy.emailResults}</a></Button>` before the existing mailto link. The existing link and its test stay unchanged.

- [ ] Write the failing hook test `useLabPrefill.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { encodeLabResult, toLabResult } from '@/lib/labResult'
import { useLabPrefill } from './useLabPrefill'

function Probe() {
  return <p data-testid="prefill">{useLabPrefill() ?? 'none'}</p>
}

const encoded = encodeLabResult(
  toLabResult(
    [{ name: 'A', result: classifyStep(EMPTY_ANSWERS), answers: EMPTY_ANSWERS }],
    false,
  ),
)

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('useLabPrefill', () => {
  it('reads a lab fragment, formats it, and clears the hash', () => {
    window.history.replaceState(null, '', `/contact/#lab=${encoded}`)
    render(<Probe />)
    expect(screen.getByTestId('prefill')).toHaveTextContent('Step 1: not answered yet')
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/contact/')
  })

  it('ignores a malformed fragment but still clears it', () => {
    window.history.replaceState(null, '', '/contact/#lab=garbage')
    render(<Probe />)
    expect(screen.getByTestId('prefill')).toHaveTextContent('none')
    expect(window.location.hash).toBe('')
  })

  it('leaves other fragments alone', () => {
    window.history.replaceState(null, '', '/contact/#top')
    render(<Probe />)
    expect(screen.getByTestId('prefill')).toHaveTextContent('none')
    expect(window.location.hash).toBe('#top')
  })
})
```

- [ ] Add failing tests to `ContactForm.test.tsx`. Import `encodeLabResult`, `toLabResult`, `classifyStep`, `EMPTY_ANSWERS`, `RUBRIC_VERSION` and `contactLabCopy`. Give the new `describe` the same `beforeEach` `matchMedia` mock the endpoint block uses (`ContactForm.test.tsx:20-27`; `BookingCta` uses `Magnetic`, which reads it) and an `afterEach` that runs `window.history.replaceState(null, '', '/')`:

```tsx
describe('ContactForm with lab results in the fragment', () => {
  const encoded = encodeLabResult(
    toLabResult(
      [{ name: 'A', result: classifyStep(EMPTY_ANSWERS), answers: EMPTY_ANSWERS }],
      false,
    ),
  )

  it('pre-fills the message and says so', () => {
    window.history.replaceState(null, '', `/contact/#lab=${encoded}`)
    render(<ContactForm endpoint="https://api.test/contact" />)
    expect(screen.getByLabelText(/message/i)).toHaveValue(
      `Results from Should This Be AI? (the wrong-tool test)\nStep 1: not answered yet (rule R1, rubric ${RUBRIC_VERSION})\nWhat I would like help with: `,
    )
    expect(screen.getByText(contactLabCopy.added)).toBeInTheDocument()
    expect(window.location.hash).toBe('')
  })

  it('puts the results in a mailto body when no endpoint is set', () => {
    window.history.replaceState(null, '', `/contact/#lab=${encoded}`)
    render(<ContactForm endpoint={null} />)
    const link = screen.getByRole('link', { name: contactLabCopy.emailResults })
    expect(link.getAttribute('href')).toMatch(/^mailto:.+\?subject=.+&body=Results/)
  })
})
```

- [ ] Run `pnpm -F web test:run src/components/contact`. Expected: the new tests FAIL.
- [ ] Implement the hook and the ContactForm changes.
- [ ] Run `pnpm -F web test:run src/components/contact`. Expected: all pass, including the five existing ContactForm tests.
- [ ] Run the four global checks. Expected: all pass, with no `react-hooks/set-state-in-effect` report.
- [ ] Commit:

```
git add app/web/src/components/contact/useLabPrefill.ts app/web/src/components/contact/useLabPrefill.test.tsx app/web/src/components/contact/ContactForm.tsx app/web/src/components/contact/ContactForm.test.tsx
git commit -m "feat(contact): pre-fill the message from lab results in the URL fragment"
```

### P1-T23: the lab page route

Files:

- Create: `app/web/src/app/lab/should-this-be-ai/page.tsx`, `app/web/src/app/lab/should-this-be-ai/page.test.tsx`

Before writing, read `app/web/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` (passing server-rendered content to a client component as a prop), per `app/web/CLAUDE.md`.

Interfaces:

- Consumes: `PageHeader`, `Section`, `Container`, `CodeBlock` (P1-T12), `readRuleSource`, `WorkflowBuilder`, `RULE_IDS`, `RUBRIC_VERSION`, `labPageCopy`, `whyCopy`, `fillTemplate`.
- Produces: default export `LabPage` (async server component) and `metadata`.

Page contract (spec page order; `RecordedRace` omitted per Ruling R-RACE):

1. `<PageHeader title={labPageCopy.title} description={labPageCopy.headerDescription} image="/media/brand/systems-lattice.webp" />`, no video (Ruling R-HEADER).
2. `<Section aria-labelledby="lab-how-heading">`: `<h2 className="sr-only">` `howItWorksHeading`, then `<ol className="grid gap-4 font-mono text-sm text-muted sm:grid-cols-3">` with the three steps.
3. `<WorkflowBuilder snippets={snippets} />` (presets, builder, summary, send).
4. `<Section aria-labelledby="lab-method-heading">`: `<h2>` `methodHeading`, `<p>` `methodBody`, `<p className="font-mono text-sm text-muted">` `fillTemplate(labPageCopy.rubricVersion, { version: RUBRIC_VERSION })`.

Snippets are resolved on the server so the page test can render them:

```tsx
const entries = await Promise.all(
  RULE_IDS.map(async (id) => {
    const block = await CodeBlock({
      code: readRuleSource(id),
      lang: 'typescript',
      filename: `rules/${id}.ts`,
      scrollLabel: fillTemplate(whyCopy.codeLabel, { rule: id }),
    })
    return [id, block] as const
  }),
)
const snippets = Object.fromEntries(entries) as Record<RuleId, ReactNode>
```

`metadata = { title: labPageCopy.title, description: labPageCopy.metaDescription }`.

- [ ] Write the failing test `page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { labPageCopy, whyCopy } from '@/content/lab/copy'
import { RUBRIC_VERSION } from '@/content/lab/rubric'
import LabPage, { metadata } from './page'

describe('LabPage', () => {
  it('renders the header, the builder and the method note with the rubric version', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(await LabPage())
    expect(
      screen.getByRole('heading', { level: 1, name: labPageCopy.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(`Rubric version ${RUBRIC_VERSION}`)).toBeInTheDocument()
    expect(screen.getByTestId('header-image')).toHaveAttribute(
      'src',
      '/media/brand/systems-lattice.webp',
    )
    expect(document.querySelector('video')).toBeNull()
    expect(document.querySelector('canvas')).toBeNull()
    expect(metadata.title).toBe(labPageCopy.title)
    await userEvent.click(screen.getByRole('button', { name: /^Why\?/ }))
    await userEvent.click(screen.getByRole('button', { name: whyCopy.showCode }))
    expect(screen.getByRole('region', { name: 'Rule R1 as code' })).toBeVisible()
    expect(screen.getByText('rules/R1.ts')).toBeInTheDocument()
  }, 20_000)
})
```

- [ ] Run `pnpm -F web test:run src/app/lab`. Expected: FAIL, missing `./page`.
- [ ] Implement `page.tsx`.
- [ ] Run the test. Expected: pass.
- [ ] Run the four global checks. Expected: all pass.
- [ ] Build: `NEXT_PUBLIC_SITE_URL=https://example.com NEXT_PUBLIC_BOOKING_URL=https://booking.example.com/ci pnpm build:raw`. Expected: exits 0 and `ls app/web/out/lab/should-this-be-ai/index.html` lists the file; `grep -c "rules/R11.ts" app/web/out/lab/should-this-be-ai/index.html` prints at least `1` (the snippets for rules not shown yet travel in the inlined server-component payload).
- [ ] Commit:

```
git add app/web/src/app/lab/should-this-be-ai/page.tsx app/web/src/app/lab/should-this-be-ai/page.test.tsx
git commit -m "feat(lab): add the Should This Be AI? page"
```

### P1-T24: footer link, sitemap and e2e route lists

Files:

- Edit: `app/web/src/content/nav.ts`, `app/web/src/app/seo.test.ts`
- Edit: `app/web/tests/e2e/support.ts`, `app/web/tests/e2e/a11y.spec.ts`, `app/web/tests/e2e/routes.spec.ts`, `app/web/tests/e2e/motion.spec.ts`

Interfaces:

- Consumes: the built route (P1-T23); the `data-sticky-layout` summary (P1-T19).
- Produces: `footerNav` entry `{ label: 'Should This Be AI?', href: '/lab/should-this-be-ai/' }` placed after Contact; `/lab/should-this-be-ai/` in `ROUTES`, `PATHS` and the local route list (heading `Should This Be AI?`). `sitemap.ts` needs no edit: it maps `footerNav` (`app/web/src/app/sitemap.ts:10`). The main `nav` is unchanged.

- [ ] Add a failing test to `seo.test.ts`:

```ts
it('lists the lab', () => {
  expect(sitemap().map((e) => e.url)).toContain(
    'https://mccorlabs.com/lab/should-this-be-ai/',
  )
})
```

- [ ] Run `pnpm -F web test:run src/app/seo.test.ts`. Expected: the new test FAILS.
- [ ] Edit `nav.ts`: insert the entry into `footerNav` after `...nav`.
- [ ] Run `pnpm -F web test:run`. Expected: all pass, including `content.test.ts` (trailing slash), `layout.test.tsx` (every footer link renders) and `seo.test.ts`.
- [ ] Edit the three e2e route files to add the path (Ruling R-ROUTES).
- [ ] Narrow the reduced-motion sticky gate in `motion.spec.ts` (Ruling R-STICKY-ALL). Read the file first; the selector at `tests/e2e/motion.spec.ts:59-65` becomes:

```ts
const sticky = await page.evaluate(
  () =>
    [
      ...document.querySelectorAll('body *:not(header, header *, [data-sticky-layout])'),
    ].filter((element) => getComputedStyle(element).position === 'sticky').length,
)
expect(sticky).toBe(0)
```

The gate still fails for any other sticky element, so a `Pinned` scroll scene is still caught under reduced motion.

- [ ] Run the four global checks. Expected: all pass.
- [ ] Build as in P1-T23, then `pnpm -F web test:e2e --project=chromium --grep "should-this-be-ai"`. Expected: the axe test, the h1 test and the reduced-motion test for the new route pass (the reduced-motion test confirms no sticky element outside `[data-sticky-layout]`, no running animation, no three request). Then `pnpm -F web test:e2e --project=chromium tests/e2e/motion.spec.ts`. Expected: every route passes, so the narrowed selector did not open the gate elsewhere. Then `pnpm -F web test:e2e --project=chromium --grep "no internal link is broken"`. Expected: pass.
- [ ] Commit:

```
git add app/web/src/content/nav.ts app/web/src/app/seo.test.ts app/web/tests/e2e/support.ts app/web/tests/e2e/a11y.spec.ts app/web/tests/e2e/routes.spec.ts app/web/tests/e2e/motion.spec.ts
git commit -m "feat(lab): link the lab from the footer, sitemap and route gates"
```

### P1-T25: e2e axe on a filled lab at 390 px

Files:

- Create: `app/web/tests/e2e/lab.spec.ts`

Interfaces:

- Consumes: the built route; copy imports through the `@/` alias (as `tests/e2e/routes.spec.ts:3` does).
- Produces: shared helpers inside `lab.spec.ts`: `PATH`, `openStep(page, n)`, `answerStep(page, n, name)`.

- [ ] Write the test:

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import {
  answerCopy,
  builderCopy,
  fillTemplate,
  questionCopy,
  whyCopy,
} from '@/content/lab/copy'
import { QUESTION_KEYS } from '@/content/lab/rubric'

const PATH = '/lab/should-this-be-ai/'

async function openStep(page: Page, n: number) {
  const toggle = page.getByTestId(`step-${String(n)}`).locator('[data-step-toggle]')
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute('aria-expanded')) === 'false'
  ) {
    await toggle.click()
  }
}

async function answerStep(page: Page, n: number, name: string) {
  await openStep(page, n)
  const step = page.getByTestId(`step-${String(n)}`)
  await step.getByLabel(fillTemplate(builderCopy.stepNameLabel, { n })).fill(name)
  for (const key of QUESTION_KEYS) {
    await step
      .getByRole('group', { name: questionCopy[key].text })
      .getByRole('radio', { name: answerCopy.yes })
      .check()
  }
}

test.describe('lab at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('/lab/should-this-be-ai/ filled with three steps and Why open has no axe violations', async ({
    page,
  }) => {
    await page.goto(PATH)
    const add = page.getByRole('button', { name: builderCopy.add })
    await add.click()
    await add.click()
    for (const [index, name] of [
      'Read invoices',
      'Match orders',
      'Approve payments',
    ].entries()) {
      await answerStep(page, index + 1, name)
    }
    await openStep(page, 1)
    const why = page.getByTestId('step-1').getByRole('button', { name: /^Why\?/ })
    await why.click()
    await expect(why).toHaveAttribute('aria-expanded', 'true')
    const showCode = page
      .getByTestId('step-1')
      .getByRole('button', { name: whyCopy.showCode })
    await showCode.click()
    await expect(showCode).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByTestId('step-1').getByRole('region')).toBeVisible()
    await page.waitForFunction(
      () => document.querySelector('[data-reveal="pending"]') === null,
    )
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })

  test('/lab/should-this-be-ai/ step controls are at least 44 by 44 px', async ({
    page,
  }) => {
    await page.goto(PATH)
    await page.getByRole('button', { name: builderCopy.add }).click()
    await openStep(page, 1)
    const targets = page.locator(
      '[data-testid^=step-] button:visible, [data-testid^=step-] a:visible, [data-testid^=step-] label:has(input[type=radio]):visible',
    )
    const count = await targets.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i += 1) {
      const target = targets.nth(i)
      const box = await target.boundingBox()
      const label = (await target.textContent()) ?? String(i)
      expect(box, label).not.toBeNull()
      expect(box!.width, label).toBeGreaterThanOrEqual(44)
      expect(box!.height, label).toBeGreaterThanOrEqual(44)
    }
  })

  test('/lab/should-this-be-ai/ a checked answer has a different fill from an unchecked one', async ({
    page,
  }) => {
    await page.goto(PATH)
    const group = page
      .getByTestId('step-1')
      .getByRole('group', { name: questionCopy.costly.text })
    await group.getByRole('radio', { name: answerCopy.yes }).check()
    const fill = (name: string) =>
      group
        .locator('label', { has: page.getByRole('radio', { name }) })
        .evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(await fill(answerCopy.yes)).not.toBe(await fill(answerCopy.no))
  })
})
```

- [ ] Build as in P1-T23. Run `pnpm -F web test:e2e --project=chromium --grep "should-this-be-ai"`. Expected: the new test passes along with the P1-T24 cases. If axe reports a violation, fix the component in a follow-up task the orchestrator assigns; never weaken the test.
- [ ] Run `pnpm -F web lint` and `pnpm exec prettier --check app/web/tests/e2e/lab.spec.ts`. Expected: pass.
- [ ] Commit:

```
git add app/web/tests/e2e/lab.spec.ts
git commit -m "test(lab): run axe on a filled lab at phone width"
```

### P1-T26: e2e keyboard-only flow through to the contact page

Files:

- Edit: `app/web/tests/e2e/lab.spec.ts`

Interfaces:

- Consumes: P1-T25 helpers; `statusCopy`, `sendCopy`, `contactLabCopy`, `whyCopy`.
- Produces: `tabTo(page, target, key)` helper.

- [ ] Add the tests: one at the default 1280 px viewport, where every step is open and toggles are hidden, and one at 390 px, where the accordion is live and focus must land on a visible control:

```ts
async function tabTo(page: Page, target: Locator, key: 'Tab' | 'Shift+Tab' = 'Tab') {
  for (let i = 0; i < 80; i += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press(key)
  }
  throw new Error(`Keyboard focus never reached ${target.toString()}`)
}

test('/lab/should-this-be-ai/ works by keyboard alone through to the contact page', async ({
  page,
}) => {
  await page.goto(PATH)
  const status = page.locator('[data-lab-status]')

  await tabTo(page, page.getByRole('button', { name: builderCopy.add }))
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Name of step 2')).toBeFocused()
  await expect(status).toHaveText('Step 2 added.')

  await page.keyboard.type('Send invoices')
  await expect(status).toHaveText('Step 2 added.')

  const step2 = page.getByTestId('step-2')
  for (const key of QUESTION_KEYS) {
    await tabTo(
      page,
      step2
        .getByRole('group', { name: questionCopy[key].text })
        .getByRole('radio', { name: answerCopy.yes }),
    )
    await page.keyboard.press('Space')
  }
  await expect(status).toHaveText(
    'Step 2, Send invoices: a checklist your team can edit + human sign-off',
  )

  await tabTo(
    page,
    page.getByRole('button', { name: 'Move Step 2, Send invoices up' }),
    'Shift+Tab',
  )
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('button', { name: 'Move Step 1, Send invoices up' }),
  ).toBeFocused()
  await expect(status).toHaveText('Moved up. Now Step 1, Send invoices.')

  await tabTo(page, page.getByRole('button', { name: 'Remove Step 1, Send invoices' }))
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Name of step 1')).toBeFocused()
  await expect(status).toHaveText(
    'Step 1, Send invoices removed. Undo is available for 10 seconds.',
  )

  const why = page.getByTestId('step-1').getByRole('button', { name: /^Why\?/ })
  await tabTo(page, why)
  await page.keyboard.press('Enter')
  await expect(why).toHaveAttribute('aria-expanded', 'true')
  await expect(why).toBeFocused()

  await tabTo(page, page.getByRole('link', { name: sendCopy.button }))
  await page.keyboard.press('Enter')
  await page.waitForURL('**/contact/')
  await expect(page.getByText(contactLabCopy.added)).toBeVisible()
  expect(new URL(page.url()).hash).toBe('')
})

test.describe('lab by keyboard at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('/lab/should-this-be-ai/ keeps the focused control visible after Add, Remove and Undo', async ({
    page,
  }) => {
    await page.goto(PATH)
    const add = page.getByRole('button', { name: builderCopy.add })
    const name2 = page.getByLabel('Name of step 2')

    await tabTo(page, add)
    await page.keyboard.press('Enter')
    await expect(name2).toBeFocused()
    await expect(name2).toBeVisible()

    await tabTo(page, page.getByRole('button', { name: 'Remove Step 2' }), 'Shift+Tab')
    await page.keyboard.press('Enter')
    await expect(add).toBeFocused()
    await expect(add).toBeVisible()

    await tabTo(page, page.getByRole('button', { name: builderCopy.undo }), 'Shift+Tab')
    await page.keyboard.press('Enter')
    await expect(name2).toBeFocused()
    await expect(name2).toBeVisible()

    const step2 = page.getByTestId('step-2')
    await tabTo(page, step2.getByRole('button', { name: /^Why\?/ }))
    await page.keyboard.press('Enter')
    await tabTo(page, step2.getByRole('button', { name: whyCopy.showCode }))
    await page.keyboard.press('Enter')
    const code = step2.getByRole('region', {
      name: fillTemplate(whyCopy.codeLabel, { rule: 'R1' }),
    })
    await tabTo(page, code)
    await expect(code).toBeFocused()
    await expect(code).toBeVisible()
  })
})
```

Add `type Locator` to the Playwright import and `statusCopy`, `sendCopy`, `contactLabCopy` to the copy import only if used.

- [ ] Build as in P1-T23 and run `pnpm -F web test:e2e --project=chromium --grep "should-this-be-ai"`. Expected: all pass. If the contact notice never appears after client navigation, apply the fallback in UNVERIFIED item 3 as a separate orchestrator-assigned fix.
- [ ] Run lint and prettier on the file. Expected: pass.
- [ ] Commit:

```
git add app/web/tests/e2e/lab.spec.ts
git commit -m "test(lab): drive the lab by keyboard through to the contact page"
```

### P1-T27: no three.js on the lab, and a lab INP budget

Files:

- Edit: `app/web/tests/e2e/lab.spec.ts`
- Edit: `app/web/tests/e2e/budgets.spec.ts`

Interfaces:

- Consumes: `trackThreeRequests`, `trackSceneRequests` (`tests/e2e/support.ts:15-21`); `presetsCopy`, `presets`.
- Produces: in `budgets.spec.ts`, a helper `observeWorstInteraction(page)` extracted from the existing INP test's init script (`budgets.spec.ts:174-189`); the existing test calls it, with identical behavior.

- [ ] Add to `lab.spec.ts` (full motion, not reduced; the reduced case is already covered by `motion.spec.ts` through `ROUTES`). Import `trackThreeRequests` and `trackSceneRequests` from `./support`, and `presets` and `presetsCopy` from `@/content/lab/copy`:

```ts
test('/lab/should-this-be-ai/ never fetches three.js or a scene while in use', async ({
  page,
}) => {
  const three = trackThreeRequests(page)
  const scenes = trackSceneRequests(page)
  await page.goto(PATH, { waitUntil: 'load' })
  await page
    .getByRole('button', {
      name: fillTemplate(presetsCopy.load, { preset: presets[0]!.title }),
    })
    .click()
  await page.mouse.wheel(0, 4000)
  await page.waitForTimeout(1000)
  expect(await three()).toEqual([])
  expect(await scenes()).toEqual([])
  await expect(page.locator('canvas')).toHaveCount(0)
})
```

- [ ] Add to `budgets.spec.ts` inside `hard gates`:

```ts
test('INP on /lab/should-this-be-ai/ while answering is under 200 ms', async ({
  page,
}) => {
  await observeWorstInteraction(page)
  await page.goto('/lab/should-this-be-ai/')
  await page.getByRole('button', { name: 'Load Invoice intake' }).click()
  const costly = page.getByTestId('step-1').getByRole('group', { name: /cost money/ })
  for (let i = 0; i < 15; i += 1) {
    await costly.getByRole('radio', { name: i % 2 === 0 ? 'Yes' : 'No' }).click()
    await page.waitForTimeout(120)
  }
  const worst = await page.evaluate(() => (window as unknown as { worst: number }).worst)
  expect(worst).toBeLessThan(INP_MAX_MS)
})
```

- [ ] Build as in P1-T23. Run `pnpm -F web test:e2e --project=chromium --grep "should-this-be-ai"`. Expected: all pass. Run `pnpm -F web test:e2e --project=budgets --no-deps --grep "should-this-be-ai|INP on /"`. Expected: the lab CLS test, the new lab INP test and the existing `/` INP test pass.
- [ ] Run lint and prettier on both files. Expected: pass.
- [ ] Commit:

```
git add app/web/tests/e2e/lab.spec.ts app/web/tests/e2e/budgets.spec.ts
git commit -m "test(lab): prove the lab loads no three.js and meets the INP budget"
```

### P1-T28 OWNER: five moderated sessions (phase gate)

No repo change and no commit.

- [ ] Recruit 5 non-technical business owners or operators. Use a staging or local build (`pnpm build`, then `pnpm -F web exec serve out`).
- [ ] Per session: ask them to enter one workflow they run, then ask "Which of your steps needs AI?" Start a timer at page load; stop it when they answer.
- [ ] Record per session: time to answer, whether the answer matches the lab's verdicts, where they hesitated, any question wording they misread. Keep no names.
- [ ] Gate: at least 4 of 5 answer correctly within 2 minutes (spec "Success means"). If the gate fails, list the wording or flow changes; each becomes a new task, and any rule change bumps `RUBRIC_VERSION`.
- [ ] Phase 1 ships only after this gate and the done-gate (lint, format, tests, `/code-review` reviewer subagent) pass.

---

## UNVERIFIED

1. `starting:` (`@starting-style`) as a Tailwind 4.3.3 variant and its fade on a keyed remount in Chromium. It affects only the look of a verdict change; text correctness is tested.
2. `process.cwd()` is `app/web` while `next build` renders the page, so `readRuleSource` finds `src/content/lab/rules`. P1-T23's build step and its `grep` check settle it. Fallback: resolve from `import.meta.dirname` of `ruleSource.ts`.
3. A client-side `Link` navigation to `/contact/#lab=…` leaves the hash readable when `useLabPrefill` first runs. P1-T26 settles it. Fallback: render the send button as a plain `<a href>` for a full page load.
4. `atob` accepts unpadded base64url input in browsers and jsdom (forgiving-base64 says it does). P1-T20's round-trip test covers jsdom; P1-T26 covers Chromium.
5. Playwright 1.61's `--no-deps` flag on the `budgets` project. Fallback: run `--project=budgets` without it and accept the chromium project running first.
6. The header height behind `lg:top-24` on the sticky summary. Check visually at 1280 px; adjust the spacing class only.
7. `has-checked:` is the Tailwind 4.3.3 spelling of the `:has(:checked)` variant. P1-T25's computed-background check settles it in Chromium.
8. `@testing-library/react`'s `fireEvent.blur` also fires `focusout`, which React's `onBlur` listens to, so P1-T16's expiry-with-focus test reaches `resumeUndo`. Fallback: `fireEvent.focusOut(undo, { relatedTarget: null })`.
9. `Reveal` in jsdom under full motion settles out of `pending` (P1-T15's fade test waits for it). If it stays `pending`, the keyed-node assertions still hold, because the placeholder `div` does not change between the two answers.
10. `eslint-plugin-react-hooks@7.1.1`'s `refs` rule accepts writes to a `Map` held in a ref from callback refs. P1-T15's lint step settles it.
11. Shiki highlighting 13 snippets in the P1-T23 Vitest run stays under the 20-second timeout set on that test.
12. Whether the spread-attributes form in P1-T12 avoids `jsx-a11y/no-noninteractive-tabindex`; the directive is the fallback either way.
13. Whether five moderated sessions can be recruited (OWNER).

## Self-review against the spec

| Spec item (Phase 1)                                                                                                                                                                                                                                            | Task                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageHeader` with title, subtitle, promise, `systems-lattice.webp`, no video                                                                                                                                                                                   | P1-T23 (Ruling R-HEADER)                                                                                                                      |
| Three-step "how it works" strip in `font-mono`, `text-muted`                                                                                                                                                                                                   | P1-T23                                                                                                                                        |
| Three presets (invoice intake, support inbox, quote requests), 4 answered steps each                                                                                                                                                                           | P1-T17                                                                                                                                        |
| Builder, two columns at `lg`, sticky summary with counts and rail; verdict under each step                                                                                                                                                                     | P1-T15, P1-T19, P1-T24 (Ruling R-STICKY-ALL; `motion.spec.ts` gate skips `[data-sticky-layout]`)                                              |
| Summary table (step, verdict, reason, rule id) with a Cards / Table toggle for everyone                                                                                                                                                                        | P1-T18                                                                                                                                        |
| "Send us this result"                                                                                                                                                                                                                                          | P1-T21                                                                                                                                        |
| `RecordedRace` only with a real trace                                                                                                                                                                                                                          | Not built (Ruling R-RACE)                                                                                                                     |
| Method note with `RUBRIC_VERSION`                                                                                                                                                                                                                              | P1-T23                                                                                                                                        |
| `rubric.ts` types, `RubricResult`, `classifyStep` over ordered rules, version bump rule                                                                                                                                                                        | P1-T1, P1-T6                                                                                                                                  |
| One rule per file exporting `{id, when, verdict, humanSignOff, why}`                                                                                                                                                                                           | P1-T2 to P1-T5, thirteen rules (adds `reads`, Ruling R-READS)                                                                                 |
| Five questions plus follow-up 2b (shown only when question 2 is yes) plus optional frequency, all starting unanswered; question 1 asks about both the information and the result (Ruling R-Q1), with the question 1 and 2b texts pinned in `copy.test.ts`      | P1-T1, P1-T7, P1-T10                                                                                                                          |
| Unanswered or not sure gives `unclear`; costly plus checkable gives sign-off; costly and not checkable gives `do-not-automate` unless it is a fixed-form checklist (R12)                                                                                       | P1-T6 (proved over all 4,096 answer sets, plus seven worked examples; Ruling R-TREE)                                                          |
| Vitest covers every rule, boundary, the modifier, and that every rule id has a snippet and a reason                                                                                                                                                            | P1-T2 to P1-T6, P1-T12                                                                                                                        |
| `<ol>` of 1 to 8 steps, names capped at 60, memory only                                                                                                                                                                                                        | P1-T9, P1-T15                                                                                                                                 |
| Move up, Move down, Remove named with number and name; no drag-only action                                                                                                                                                                                     | P1-T10                                                                                                                                        |
| Focus after Add, Move and Remove; polite "Step removed. Undo" for 10 seconds, paused while focused, focus to Add on expiry, hidden at 8 steps                                                                                                                  | P1-T15, P1-T16 (Ruling R-UNDO), P1-T26 at 390 px                                                                                              |
| At 8 steps Add stays focusable, `aria-disabled`, "Up to 8 steps"; Remove hidden with one step                                                                                                                                                                  | P1-T10, P1-T15                                                                                                                                |
| One hidden `role="status"` region; fires on answers, never on name keystrokes                                                                                                                                                                                  | P1-T15 (Ruling R-ANNOUNCE)                                                                                                                    |
| `StepCard` on `Card`, fieldset and legend per question, 44 px targets (`Button size="md"` plus `min-w-11`), `border-border-strong`, chosen state by fill and text                                                                                              | P1-T10, P1-T25 (measured at 390 px, checked fill compared)                                                                                    |
| Accordion below `md`, one step open at a time, collapsed step shows name, verdict and answered count                                                                                                                                                           | P1-T11, P1-T15 (Ruling R-ACCORDION)                                                                                                           |
| `VerdictCard` on `Card`, verdict in heading through a `Badge` variant; DOM at once; staggered first reveal from `--stagger-interval` capped at 3; pointer-speed fade on change; instant under reduced motion; no `aria-live`                                   | P1-T8, P1-T14, P1-T15, P1-T17 (Rulings R-STAGGER, R-FADE; `Stagger.tsx` not edited; token read once; reveal order tested through the builder) |
| Verdict styling table, label 4.5:1, control edges 3:1, contrast test reads `globals.css`, brand never a label; inline `marker` everywhere, `cardRule` only on the do-not-automate card                                                                         | P1-T8, P1-T14, P1-T19                                                                                                                         |
| `WhyDrawer` inline disclosure, focus stays, reason and answers first, nested code disclosure, build-time `CodeBlock` per rule as `Record<RuleId, ReactNode>`, focusable labelled scroll container                                                              | P1-T12, P1-T13, P1-T23                                                                                                                        |
| Progress rail `h-px bg-brand` scaled at `duration-standard`; resolved means every visible question answered                                                                                                                                                    | P1-T19 (Ruling R-RESOLVED)                                                                                                                    |
| `SendResult` text lines, names opt-in, exact preview, `/contact/#lab=`, hash cleared, "We added your results…", mailto fallback capped near 1,500 characters, both Send and Book a call; "not answered yet" and a closing "What I would like help with: " line | P1-T20, P1-T21, P1-T22 (Rulings R-HASH, R-ASK, R-MAILTO, R-BOOK)                                                                              |
| All strings in `copy.ts`; shared `assertNoClaims` rejects client, programme, team-size, percent and outcome claims over `copy.ts` and every rule's `why`                                                                                                       | P1-T7, P1-T17 (Rulings R-COPY, R-CLAIMS)                                                                                                      |
| Page header image and no video                                                                                                                                                                                                                                 | P1-T23 (asserted in `page.test.tsx`)                                                                                                          |
| Footer entry with phase 1; Services block deferred; sitemap, `ROUTES`, `PATHS`                                                                                                                                                                                 | P1-T24 (Ruling R-SERVICES)                                                                                                                    |
| Playwright axe on empty route and filled state at 390 px                                                                                                                                                                                                       | P1-T24, P1-T25                                                                                                                                |
| Keyboard-only flow with focus and status assertions                                                                                                                                                                                                            | P1-T26                                                                                                                                        |
| No three.js chunk on the route                                                                                                                                                                                                                                 | P1-T24 (reduced motion), P1-T27 (full motion)                                                                                                 |
| Existing budgets (CLS 0.1, INP 200 ms, fonts 150 kB)                                                                                                                                                                                                           | P1-T24 (CLS through `ROUTES`), P1-T27 (INP); fonts are route-independent                                                                      |
| Phase gate: 5 moderated sessions                                                                                                                                                                                                                               | P1-T28                                                                                                                                        |
| Sent feedback marks survive a verdict card remount, for phase 3's "Wrong?" control                                                                                                                                                                             | P1-T16b (Ruling R-MARKS)                                                                                                                      |
| No new tokens; token gap reported only                                                                                                                                                                                                                         | Global Constraints; no task adds a token                                                                                                      |

Gaps found and closed while reviewing: the 2026-10-09 rubric fix carried through P1-T2 to P1-T6 (follow-up 2b, R12, R13, 4,096 answer sets, seven worked examples; Ruling R-TREE); the reduced-motion sticky gate narrowed to `[data-sticky-layout]` (Ruling R-STICKY-ALL); Undo paused while focused, focus to Add on expiry, hidden at 8 steps (Ruling R-UNDO); every lab button at 44 px, measured at 390 px; the presets re-answered for follow-up 2b with sign-off pinned in the test; `react-hooks/set-state-in-effect` shaping the prefill hook (Ruling R-PREFILL); `Stagger` cannot wrap list items (Ruling R-STAGGER); `PageHeader` has no subtitle slot (Ruling R-HEADER); jsx-a11y blocks `tabIndex` on a region (Ruling R-SCROLL). Final review fixes: question 1 and the R4, R5 and R6 reasons cover the result as well as the input, and the monthly-report example answers `fixedForm` no because its result is written paragraphs (Ruling R-Q1); follow-up 2b asks about changes the team makes itself; preset step names fit `NAME_MAX` and are pinned; the `feedbackMarks` context the shared interface promised now has its own task, P1-T16b (Ruling R-MARKS); the do-not-automate marker split into an inline `marker` and a card-only `cardRule`, so a full-height rule cannot escape into the ProgressRail list; Undo at 8 steps returns the same state object; the `--stagger-interval` token is read once per page load.
