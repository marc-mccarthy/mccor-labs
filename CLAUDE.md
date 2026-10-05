@AGENTS.md

# McCor Labs

Next.js 16 static export (app/web), Terraform (infra/), brand media (app/web/public/media/brand/). Antigravity (agy) is a second agent for assets and diff review.

## Hard stops

- Only the owner commits or pushes. Per-task commits in an owner-approved written plan are allowed, as in the global CLAUDE.md. Never push.
- Ask before removing files, installing anything, or writing to an external service.
- infra/: ask before editing. Never run `terraform apply`.
- Never run `playwright install` (@playwright/test is pinned to 1.61.0, disk is near capacity). Denied in .claude/settings.json.

## Autonomy

Ask open questions up front in one batch. After that, finish the task without stopping. Decide design and implementation tradeoffs yourself and record each as `Ruling: <decision> (cost if wrong: <cost>)` in the ledger. The hard stops above and the global CLAUDE.md still apply.
A plan or spec change goes to three independent ui-ux-pro subagents first.

## Code

- Claude Code owns .ts, .tsx, .css, Playwright and Vitest.
- Delete code comments you come across. Exempt: tool directives (`@vitest-environment`, `eslint-disable`, `use client`) and package.json `"//"` keys. Commented-out code: ask first. No lint rule backs this; review-only.
- Colour comes only from the `@theme` tokens in app/web/src/styles/globals.css. Raw colour literals in .ts and .tsx fail lint (eslint.config.ts). SVG, GLSL and images are review-only.
- node and pnpm come from mise (global `~/.config/mise/config.toml`). Run `pnpm` directly, no PATH prefix.

## Media

Most brand media in app/web/public/media/ is untracked by the owner's choice, so a clean checkout lacks it. Open every generated asset at full size before it enters public/: text in pixels is invisible to lint, tests and review. Rejected assets and reasons: .superpowers/sdd/2026-10-01-mccorlabs-website-phase-2/asset-audit-report.md. Never re-add them.

## Antigravity (agy)

- Rules for agy live in AGENTS.md. Commands, Mode A and B, personas and the review contract live in the antigravity-workflow skill. Load it before any agy or mcp__antigravity__* call.
- Never pass --add-dir on the repo root. Pass add_dirs [] for reviews.
- agy output enters app/web/public/ only after the skill's colour scan is clean and the asset has been opened at full size.

## Subagent watchdog (MANDATORY)

A global Claude Code hook watches every subagent. When one makes no progress for 10 minutes, the hook wakes you with a `[subagent-watchdog]` reminder. This rule is mandatory. Never schedule your own checks (no /loop, CronCreate or ScheduleWakeup).

On that reminder:

- Deploy an expert subagent for that task type to help or unblock it.
- If it cannot recover, absorb the partial work and deploy a fresh expert subagent to finish the task to full completion.
- Notify the owner with minimal text. NEVER prompt the owner.
