# Task 7 report: Typed content layer and environment parsing

## What was implemented

- `app/web/src/content/types.ts` — `NavItem`, `Service`, `TeamMember`, `ProcessStage` (as `interface`, not `type`; see lint note below).
- `app/web/src/content/site.ts` — `site` export: name, tagline, `contactEmail: 'marcm@mccorlabs.com'`, `budgetOptions`.
- `app/web/src/content/nav.ts` — `nav` and `footerNav` exports.
- `app/web/src/content/ui.ts` — `ui` strings export.
- `app/web/src/content/content.test.ts` — brief's test, verbatim.
- `app/web/src/lib/env.ts` — `env` export with `siteUrl`, `bookingUrl`, `contactEndpoint`.
- `app/web/src/lib/env.test.ts` — brief's test, with mechanical fixes for strict TS/ESLint (see below); all assertions unchanged.
- `app/web/.env.template` — three `op://` references, exactly as the brief's code block.
- Root `package.json` — restored the `op run` wrapper on `dev`/`build`, rewrote the stale `"//dev"` note.

## TDD evidence — content cycle

**RED** — `PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/content`, after creating only `content.test.ts`:

```
FAIL  src/content/content.test.ts [ src/content/content.test.ts ]
Error: Failed to resolve import "./site" from "src/content/content.test.ts". Does the file exist?
```
Expected — `site.ts` did not exist yet.

**GREEN** — same command, after creating `types.ts`, `site.ts`, `nav.ts`, `ui.ts`:

```
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

## TDD evidence — env cycle

**RED** — `PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/lib/env.test.ts`, after creating only `env.test.ts`:

```
FAIL  src/lib/env.test.ts [ src/lib/env.test.ts ]
Error: Failed to resolve import "./env" from "src/lib/env.test.ts". Does the file exist?
```
Expected — `env.ts` did not exist yet.

**GREEN** — same command, after creating `env.ts`:

```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```
All 8 cases pass, including the two critical ones: missing booking URL → `null` in development; missing booking URL → throws `/NEXT_PUBLIC_BOOKING_URL is required/` in production.

## Mechanical fixes required beyond the brief's literal code

Running `tsc --noEmit` and `pnpm -F web lint` against the brief's exact code surfaced real strict-mode conflicts (not logic bugs):

1. **`tsc`**: Next.js's own `next/types/global.d.ts` declares `ProcessEnv.NODE_ENV` as `readonly`, which broke `process.env['NODE_ENV'] = 'test'` in the brief's test helper. Fixed by casting `process.env` to `Record<string, string | undefined>` for the assignment/delete sites only (`env.test.ts`) — no assertions changed.
2. **`eslint`** (`@typescript-eslint/consistent-type-definitions`): object `type` aliases in `types.ts` must be `interface`. Converted all four; shapes and export names identical.
3. **`eslint`** (`@typescript-eslint/dot-notation`): literal-key bracket access (`process.env['NEXT_PUBLIC_SITE_URL']` etc.) had to become dot notation in `env.ts` and `env.test.ts`.
4. **`eslint`** (`@typescript-eslint/no-dynamic-delete`): `delete process.env[key]` with a dynamic key in `env.test.ts`'s `loadEnv` helper had to become `Reflect.deleteProperty(process.env, key)`.
5. **`prettier`**: `site.ts`/`ui.ts` needed a `prettier --write` pass (array collapsed to one line) — no content change.

All eight env cases and all six content cases still pass after each fix; re-ran the full suite after every change.

Final verification, in order:
- `pnpm -F web exec tsc --noEmit` → clean, no output.
- `pnpm -F web lint` → clean (only the pre-existing, unrelated "Pages directory cannot be found" informational line).
- `pnpm -F web exec vitest run src/content src/lib/env.test.ts` → 2 files, 14 tests, all passed.
- `pnpm format:check` → clean after the prettier pass.

## Root `package.json`

Restored per the ruling:
```json
"dev": "op run --env-file=app/web/.env.template -- pnpm -F web dev",
"build": "op run --env-file=app/web/.env.template -- pnpm -F web build",
```
`build:raw` left untouched. Replaced the stale `"//dev"` note (which explained why the wrapper had been *removed*) with one explaining why it's back and why only `dev`/`build` are wrapped: "op authorization is per-process and TTY-bound (a prompt per invocation), so only dev/build are wrapped rather than every script; build:raw is the unwrapped escape hatch for a build against an unconfigured/locked vault."

## `op run` verification

Ran `op run --env-file=app/web/.env.template -- node -e "console.log(process.env.NEXT_PUBLIC_SITE_URL)"`. It succeeded (1Password's own output redaction concealed the printed value in the terminal transcript, which itself confirms the reference resolved rather than erroring — a failure would have surfaced as an `op` error, not a redaction). Did not retry further per the ruling.

## Files changed (this commit, `f761a8f`)

```
create app/web/.env.template
create app/web/src/content/content.test.ts
create app/web/src/content/nav.ts
create app/web/src/content/site.ts
create app/web/src/content/types.ts
create app/web/src/content/ui.ts
create app/web/src/lib/env.test.ts
create app/web/src/lib/env.ts
modify package.json  (dev/build wrapper restored, "//dev" note rewritten)
```
`infra/deploy.sh` was already modified before this task started (pre-existing, unrelated) and was never staged or touched.

## Self-review

- Every export the brief specifies is present: `site`, `nav`, `footerNav`, `ui`, `Service`, `TeamMember`, `ProcessStage`, `NavItem`, `env` (`siteUrl`, `bookingUrl`, `contactEndpoint`).
- No copy lives in components — nothing under `src/components/` was touched.
- No invented facts: `contactEmail` matches the brief exactly; booking URL was never hardcoded anywhere in content, only sourced from `NEXT_PUBLIC_BOOKING_URL` via `env.ts`.
- `.env.template` holds only `op://` references, no values, matching the brief's code block exactly (no extra content from the brief's prose table was copied in).
- No colour values in any created file (tokens weren't applicable here — this task has no CSS).
- No `.env.local` anywhere in the tree (`find . -name ".env.local"` returned nothing).
- `git status --short` before commit showed only the intended new files plus `package.json`; `infra/deploy.sh` stayed unstaged.
- A stray `app/web/tsconfig.tsbuildinfo` build artifact appeared from running `tsc`; deleted before staging (not part of the deliverable, not gitignored, no reason to leave it untracked-and-dirty).

## Concerns

- The three ESLint/TSC fixes (interface vs type, dot-notation, Reflect.deleteProperty, and the NODE_ENV readonly cast) mean the committed `env.test.ts` is not byte-for-byte identical to the brief's code block, though every assertion and runtime behavior is unchanged. Flagging this explicitly since the team-lead brief said to use the brief's values "verbatim" — that instruction was about Step 4's content facts (email, tagline, etc.), not about literal syntax overriding the repo's own strict lint/type-check gates, but it's worth a second look if desired.
- Encountered a multi-minute "server-side auto mode classifier is temporarily unavailable" stall on Bash mid-task; work resumed once it cleared. No impact on the result.
