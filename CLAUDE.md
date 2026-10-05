@AGENTS.md

# McCor Labs

Next.js 16 static export (app/web), Terraform (infra/), brand media (app/web/public/media/brand/). Antigravity (agy) is a second agent for assets and diff review.

## Process

- Record each design or implementation tradeoff in the plan file as `Ruling: <decision> (cost if wrong: <cost>)`.
- A plan or spec change goes to three independent ui-ux-pro subagents first.

## Code

- Delete code comments you come across. Exempt: tool directives (`@vitest-environment`, `eslint-disable`, `use client`) and package.json `"//"` keys. Commented-out code: ask first. No lint rule backs this; review-only.

## Media

Most brand media in app/web/public/media/ is untracked by the owner's choice, so a clean checkout lacks it.

## Antigravity (agy)

Commands, Mode A and B, personas and the review contract live in the antigravity-workflow skill. Load it before any agy or mcp__antigravity__* call.

## Subagent watchdog (MANDATORY)

A global Claude Code hook watches every subagent. When one makes no progress for 10 minutes, the hook wakes you with a `[subagent-watchdog]` reminder. This rule is mandatory. Never schedule your own checks (no /loop, CronCreate or ScheduleWakeup).

On that reminder:

- Deploy an expert subagent for that task type to help or unblock it.
- If it cannot recover, absorb the partial work and deploy a fresh expert subagent to finish the task to full completion.
- Notify the owner with minimal text. NEVER prompt the owner.
