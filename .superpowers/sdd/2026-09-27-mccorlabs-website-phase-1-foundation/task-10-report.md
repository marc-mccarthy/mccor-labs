# Task 10 report: sitemap and robots

## Step 1-2: RED

Command:
```
PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/app/seo.test.ts
```

Real output (trimmed to the failure):
```
 FAIL  src/app/seo.test.ts [ src/app/seo.test.ts ]
Error: Failed to resolve import "./robots" from "src/app/seo.test.ts". Does the file exist?
  Plugin: vite:import-analysis
  File: /Users/mj/repos/mccor-labs/app/web/src/app/seo.test.ts:2:19
  1  |  import { describe, expect, it } from "vitest";
  2  |  import robots from "./robots";
     |                      ^
  3  |  import sitemap from "./sitemap";
  4  |  import { footerNav } from "@/content/nav";

 Test Files  1 failed (1)
      Tests  no tests
```

Matches the brief's expected failure exactly: cannot resolve `./robots` (sitemap.ts/robots.ts do not exist yet).

## Step 3-4: implement

`app/web/src/app/sitemap.ts` and `app/web/src/app/robots.ts` created exactly as the brief specifies, no deviation in the implementation code itself.

## Step 5: GREEN

Command:
```
PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/app/seo.test.ts
```

Real output:
```
 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  13:34:21
   Duration  446ms
```

## Lint / typecheck

`PATH=/opt/homebrew/bin:$PATH pnpm -F web lint` → exit 0, no findings. No autofix or rule-loosening was needed for this task — the brief's literal code already satisfied `consistent-type-definitions`, `dot-notation`, and `no-unused-vars` as written (no interfaces, no bracket access, no unused args). **No deviations from the brief's literal code in this task.**

`PATH=/opt/homebrew/bin:$PATH pnpm -F web exec tsc --noEmit` → exit 0.

## Full suite

```
PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run
```
```
 Test Files  7 passed (7)
      Tests  43 passed (43)
```
Was 6 files / 40 tests before this change; now 7 files / 43 tests (+1 file, +3 tests — seo.test.ts).

## Step 6: build and export check

Command: `PATH=/opt/homebrew/bin:$PATH pnpm build` (root script, routes through `op run --env-file=app/web/.env.template -- pnpm -F web build`). Exit 0. Route table included `○ /robots.txt` and `○ /sitemap.xml` as static routes.

```
test -f app/web/out/sitemap.xml && echo "ok sitemap"
test -f app/web/out/robots.txt && echo "ok robots"
grep -c '<url>' app/web/out/sitemap.xml
```
Real output:
```
ok sitemap
ok robots
9
```
9 `<url>` entries — matches expectation (home + 8 footerNav destinations, all deduplicated: services, work, process, about, contact, careers, privacy, terms). `robots.txt` content:
```
User-Agent: *
Allow: /

Sitemap: https://mccorlabs.com/sitemap.xml
```

## Side effect noted and reverted

Running `next build` for the first time in this worktree auto-rewrote `app/web/tsconfig.json` (reformatted `lib`/`plugins`/`paths`/`include` arrays onto multiple lines, changed `"jsx": "preserve"` to `"jsx": "react-jsx"`, added `.next/dev/types/**/*.ts` to `include`) and `app/web/next-env.d.ts` (added two `.next/types` import lines). Neither file is in the brief's scope and neither change was requested. I reverted both with `git checkout -- app/web/next-env.d.ts app/web/tsconfig.json` before staging, so they are not part of this commit. Disclosing in case this Next.js auto-rewrite behavior is relevant to a future task that runs a fresh `next build` for the first time.

## Files changed (committed)

- `app/web/src/app/sitemap.ts` (new)
- `app/web/src/app/robots.ts` (new)
- `app/web/src/app/seo.test.ts` (new)

Commit: `dd0f207` — "feat(web): static sitemap and robots driven by env"

## infra/ check

`git status --short` before commit showed only `infra/deploy.sh`, `infra/settings.auto.tfvars.tpl`, `infra/terraform.env` modified (pre-existing, owned by another session) and my three new files untracked. Nothing under `infra/` was staged or touched.

## Concerns

None. All verification steps passed on the first attempt; no test or rule was adjusted to fit the implementation.
