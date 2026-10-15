@AGENTS.md

# McCor Labs

Next.js 16 static export (app/web), Terraform (infra/), brand media (app/web/public/media/brand/). Antigravity (agy) is a second agent for assets and diff review.

## Process

- No user interaction is needed for commits, pushes, and merges for any work. Create separate branches for any issues/stories, in which the main expert agent is in charge of getting it into main.
- Plans and spec files should have tasks (ex. T1, T2) should be in sequential order of work with indented sub-tasks (ex. ST1, ST2) and reviewed for accuracy, bugs, issues, errors, missing parts, etc. before being approved by the main expert agent and any agents helping to create those files before any work on those files is done.
- Work is not finished until a merge to main happens and the working branch is deleted locally and remotely after main is repulled.
- Record each design or implementation tradeoff in the plan file as `Ruling: <decision> (cost if wrong: <cost>)`.

## Code

- Always implement best practices and proper design when planning code or implementing code in order to keep solutions as lean and KISS, while still completing the given task to completion with all that is directed.
- Communicate with main expert agents in the same repo to confirm any overlapping work and to work together where that occurs in order to have complete and correct code and design.
- Use subagent driven work by taking any task that takes up more than 50% of the context maximum of the subagents.
- After each subagent finished a sub-task, it will discourse with the main expert agent until the correct solution is decided, then it will commit.
- Delete code comments you come across. Exempt: tool directives (`@vitest-environment`, `eslint-disable`, `use client`) and package.json `"//"` keys. Commented-out code: ask first. No lint rule backs this; review-only.
- Tests: after a change, run only the tests for the changed file(s) (`pnpm -F web exec vitest related <files> --run`). Never the full suite. `test:e2e`, `test:e2e:smoke` and `test:a11y` run only before a push.

## Media

Brand media under app/web/public/ is tracked, so a clean checkout has it.

## Deployment

- Before merging into main branch, ask for other completed branches from other agents or by checking open branches in order to merge those branches properly first so no finished branch is waiting for another to finish a deploy. All finished branches merge before merging to main branch.

## Communication with the user

- Never pattern match; always focus on completing the given task the proper way and no synconography with the user on design.
- Implement concise and clear communication about any given subject.
