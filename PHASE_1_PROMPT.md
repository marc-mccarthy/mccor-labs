# Phase 1 handoff prompt

Paste the block below into a **fresh** Claude Code session started from the
repository root (`/Users/mj/repos/mccor-labs`).

Everything outside the fenced block is context for you, not for the agent.

---

## Before you start

```bash
cd /Users/mj/repos/mccor-labs
git status          # confirm the branch and see what is uncommitted
```

**Commit the working tree first.** The spec, the phase 1 plan, all five content
drafts in `docs/content/`, `FUTURE-NOTES.md`, the reference-corpus work and a
`.gitignore` change are currently uncommitted or untracked. Phase 1 adds thirteen
commits on top; without a baseline there is no way to separate its changes from
what was already there.

Stay on the current branch — the plan does not create or switch branches.

## What you should expect

- **Thirteen tasks, thirteen commits.** One per task, with the message the plan
  specifies.
- **No deployment.** No `aws` command runs at any point in phase 1.
- **No manual intervention expected.** `pnpm approve-builds lefthook` is
  non-interactive when the package is named, and Playwright's browser is already
  cached, so nothing downloads.
- **Three tasks deliberately break things** to prove the safety net works — a
  lint rule must fire, a git hook must reformat a file, a push must be refused.
  A rule that never fires and a hook that never installed both look identical to
  passing, so these are not optional.
- **`op` must be signed in** for `pnpm dev` and `pnpm build`, which resolve
  environment values from 1Password (vault `Development`, item `mccor-labs`). A
  locked vault fails the pre-push hook's build step with an `op` error, not a
  code error — check that first before debugging the build.

## Definition of done

`pnpm verify` green; `pnpm build` producing `app/web/out/` with a separate
`index.html` for all ten routes plus `404.html`; the Playwright suite passing
against the exported build; hooks demonstrably blocking a bad push. **Nothing
deployed.** Production route resolution and 404 status stay unverified until the
CloudFront handoff in phase 4 — a local static server resolves directory indexes
and CloudFront with a plain S3 origin does not, so local green does not prove
production works.

---

## The prompt

```
Execute phase 1 of the McCor Labs website.

Plan: docs/superpowers/plans/2026-09-27-mccorlabs-website-phase-1-foundation.md
Spec: docs/superpowers/specs/2026-09-27-mccorlabs-website-design.md

Read both in full before starting. Use superpowers:subagent-driven-development
as the plan's header requires — one fresh subagent per task, a fresh reviewer
after each — working Tasks 1 through 13 in order.

Stay on the current branch. Do not create, switch or merge branches.

HARD RULES, from the plan's Global Constraints:

- Never create, edit or delete anything under infra/. Reading it is fine. Where
  infrastructure is needed, write the contract and report it to the owner.
- Nothing is deployed in phase 1. No aws command runs at any point.
- Never run `playwright install`. @playwright/test is pinned to exactly 1.61.0
  at the repo root to match the already-cached chromium-1228. The disk is at
  89% capacity. Never widen that pin to a caret range, and never add Playwright
  to app/web — two versions in one repo is the hazard the pin guards against.
- The root package.json ALREADY EXISTS and owns the recon/capture scripts, a
  "//" comment and the exact Playwright pin. Task 1 MERGES into it. Never
  overwrite it. Verify nothing was lost, as Task 1 Step 2 instructs.
- app/web/package.json must set "name": "web". Without it every `pnpm -F web`
  script silently matches nothing while exiting 0 — the failure looks exactly
  like success.
- pnpm only, never npm or yarn. TypeScript only in app/web/src — no .js or .jsx.
- Tokens only: no raw hex, rgb(), hsl() or oklch() in any component. Colours
  live in src/styles/globals.css and nowhere else.
- Environment values come from 1Password, vault `Development`, item
  `mccor-labs`, via `op run --env-file=app/web/.env.template`. The template
  holds op:// references, not values, so it is committed. Never create a
  .env.local. Never hardcode a value the template references.
- One commit per task, using the message that task's final step gives. No other
  commits.
- Do NOT skip the steps that deliberately break things: Task 4 Step 5 (the
  colour lint rule must actually fire), Task 5 Step 6 (the pre-commit hook must
  actually reformat a staged file), Task 13 Step 4 (the push must actually be
  refused). A lint rule that never fires and a hook that never installed are
  indistinguishable from passing ones. These steps are the only thing that
  tells them apart.

CONTENT SCOPE:

Draft copy exists in docs/content/ (team, services, careers, job-postings,
privacy-policy) for PHASE 2. Phase 1 does not consume it. Do not pull that copy
into phase 1 files beyond what the plan's own code blocks specify.

WHEN TO STOP:

Stop and report rather than improvising if:
- a verification step fails twice
- a pinned version will not install
- a step would require touching infra/
- the root package.json does not look as the plan describes

REPORTING:

Finish by reporting in the exact wording of Task 13 Step 7, including the
qualification that production route resolution and 404 status remain unverified
pending the CloudFront handoff. Do not describe the site as "working" — it
builds and passes locally, which is a different claim.

Then list for the owner any TODO(owner) markers remaining in
app/web/src/content/, and state that phase 2 is blocked until the reference
corpus at docs/ui-references/ has tier-1 captures.
```

---

## Decisions already made, for reference

These are settled. An implementing agent should not revisit them.

| Area      | Decision                                                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16.3.6, App Router, static export (`output: 'export'`, `trailingSlash: true`)                                              |
| Runtime   | React 19.3.0, TypeScript strict                                                                                                    |
| Styling   | Tailwind CSS 4.3.3 with `@theme` tokens, shadcn/ui as owned source                                                                 |
| Animation | Motion 13.4.4 as the single JS animation system (phase 3)                                                                          |
| Tests     | Vitest 5, Playwright 1.61.0 pinned at the repo root                                                                                |
| Tooling   | ESLint 10 flat config, Prettier 3.9.9, Lefthook 2.1.14 — all at the root                                                           |
| Hooks     | Fast pre-commit (format + lint on staged files), strict pre-push (typecheck, lint, format, tests, build, smoke)                    |
| Layout    | pnpm workspace, site at `app/web` named `web`, Lambda stays at `app/api`                                                           |
| Theme     | Dark only. `#070a12` base, `#527bff` accent, `#3d6bff` brand for large display only. Twelve contrast pairs measured, zero failures |
| Entity    | McCor Labs LLC, Minnesota                                                                                                          |
| Contact   | `marcm@mccorlabs.com`                                                                                                              |
| Booking   | `NEXT_PUBLIC_BOOKING_URL` from 1Password; production build fails without it                                                        |
| Tagline   | "A small senior team building websites, applications and AI features for companies that need them to actually work."               |
| Deploy    | Static export to the existing S3 + CloudFront. Phase 4, owner-implemented                                                          |

## Still open — none block phase 1

1. A real PO box to replace the fabricated Blaine address. Blocks publishing the
   privacy policy.
2. Salary ranges, benefits, EEO statement and remote policy for the five job
   postings. Currently omitted rather than invented.
3. Whether CloudFront access logging is enabled — the privacy policy carries a
   branch for each case and one must be deleted in phase 4.
4. Nate's, Kirsten's and Ashley's bios are invented and flagged, awaiting their
   own corrections.
