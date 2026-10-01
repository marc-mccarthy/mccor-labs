# Task 11 report: contact form client with a graceful missing-endpoint path

## Cycle 1 — `src/lib/contact.ts`

### Step 1/2: RED

Wrote `app/web/src/lib/contact.test.ts` verbatim from the brief's Step 1.

Command: `PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/lib/contact.test.ts`

Real output (truncated to the relevant error):

```
 FAIL  src/lib/contact.test.ts [ src/lib/contact.test.ts ]
Error: Failed to resolve import "./contact" from "src/lib/contact.test.ts". Does the file exist?
  Plugin: vite:import-analysis
...
 Test Files  1 failed (1)
      Tests  no tests
```

Expected per brief: FAIL — cannot resolve `./contact`. Matches: `./contact` did not exist yet, so
the import could not resolve. Confirmed RED for the right reason (missing module, not a typo/syntax
error in the test itself).

### Step 3: implement

Created `app/web/src/lib/contact.ts` verbatim from the brief's Step 3 (no deviation).

### Step 4: GREEN

Command: `PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/lib/contact.test.ts`

Real output:

```
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

**Deviation / discrepancy to disclose:** the brief's Step 4 says "Expected: PASS — all twelve
cases." Counting the `it(` blocks in the Step 1 test source (verbatim, unmodified): `validateContact`
has 5, `submitContact` has 6, total 11 (`grep -c "  it(" contact.test.ts` → `11`). Vitest's own
count agrees: "11 passed (11)". This is not a bug in the implementation or a missed case — the test
file is an exact transcription of the brief's Step 1 code block — it is the brief's prose
undercounting/overcounting its own fixture. Flagging rather than silently treating 11 as 12.

Proof the null-endpoint path never calls fetch (from the same run, case-level):
`submitContact` test `'returns a server error without fetching when no endpoint is configured'`
passed — it spies on `globalThis.fetch`, calls `submitContact(valid, null)`, asserts
`result` equals `{ ok: false, error: 'server' }` **and** `expect(fetchSpy).not.toHaveBeenCalled()`.
Both assertions passed in the same run above (no failures reported).

## Cycle 2 — `src/components/contact/ContactForm.tsx`

### Step 5: test written verbatim from the brief's Step 5.

### Step 6: install `@testing-library/user-event`

`@testing-library/user-event@^15` does not exist on the npm registry. Real pnpm output:

```
Error: ERR_PNPM_NO_MATCHING_VERSION
  × adding a new package
  ╰─▶ Failed to resolve dependency tree: No matching version found for
      @testing-library/user-event@^15 while fetching it from https://
      registry.npmjs.org/
  help: The latest release of @testing-library/user-event is "14.6.7".
```

Per ruling 4, substituted the newest resolvable major: `@testing-library/user-event@^14`, which
resolved to **14.6.7** (confirmed in `app/web/package.json`:
`"@testing-library/user-event": "^14.6.7"`). 14.x is a long-lived stable major (no API changes
relevant to this test file versus a hypothetical 15). **Substitution: `^15` → `^14.6.7`.**

### Step 7: RED

Command: `PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/components/contact`

Real output:

```
 FAIL  src/components/contact/ContactForm.test.tsx [ src/components/contact/ContactForm.test.tsx ]
Error: Failed to resolve import "./ContactForm" from "src/components/contact/ContactForm.test.tsx". Does the file exist?
...
 Test Files  1 failed (1)
      Tests  no tests
```

Matches brief's expectation: FAIL — cannot resolve `./ContactForm`.

### Step 8: implement

Created `app/web/src/components/contact/ContactForm.tsx` verbatim from the brief's Step 8.
Checked every class string against the `--color-base`/`text-base` trap described in this task's
brief (Tailwind v4 makes bare `text-base` resolve to the dark `--color-base` colour, not a font
size, in this project): the component uses `text-text`, `text-accent`, `text-muted`, `text-sm` —
never bare `text-base`. No invisible-label risk.

### Step 9: GREEN

Command: `PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/components/contact`

Real output:

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

Matches brief exactly: "all five cases."

**Honeypot proof** (from the passing `'keeps the honeypot out of the tab order'` case): asserts
`document.querySelector('input[name="honeypot"]')` has `tabindex="-1"` and `aria-hidden="true"`.
The component wraps the honeypot in a div styled `absolute left-[-9999px] h-0 w-0 overflow-hidden`
— explicitly not `display: none` (the brief's own comment states why: some bots detect
`display:none` and skip the field). Confirmed by reading the source, not just the passing test.

**Null-endpoint form proof** (from the passing `'shows a real way to make contact instead of a
dead button'` case): with `endpoint={null}`, `screen.queryByRole('button', { name: ui.formSubmit
})` is asserted `.not.toBeInTheDocument()` (no submit button rendered — the component's early
return for `endpoint === null` renders no `<form>` at all), and
`screen.getByRole('link', { name: /mccorlabs\.com/i })` is asserted to have
`href="mailto:marcm@mccorlabs.com"` (a working mailto, sourced from `site.contactEmail`).

## Step 10: wire the route

Replaced `app/web/src/app/contact/page.tsx` verbatim from the brief's Step 10.

## Step 11: build

Ran the root-level `op`-wrapped script per ruling 2 (not `pnpm -F web build`):

Command: `PATH=/opt/homebrew/bin:$PATH pnpm build` → `op run --env-file=app/web/.env.template --
pnpm -F web build` → `next build`.

Real output (tail): build compiled, TypeScript pass finished, 13 static pages generated including
`/contact`. `test -f app/web/out/contact/index.html && echo "ok contact"` → `ok contact`.

Per ruling 3, `next build` auto-rewrote `app/web/tsconfig.json` (reformatted + added
`.next/dev/types/**/*.ts` to `include`, `jsx` flipped to `react-jsx`) and `app/web/next-env.d.ts`
(added two `.next/types` references). Reverted both with `git checkout --
app/web/tsconfig.json app/web/next-env.d.ts` before staging; neither is staged or committed.

## ESLint deviations from the brief's literal code (ruling 5)

Ran `pnpm -F web lint` after Step 10; it failed with 9 errors, none from loosened rules —
all mechanical:

1. **`contact.ts`**: `export type ContactRequest = {...}` → `export interface ContactRequest
   {...}` (`@typescript-eslint/consistent-type-definitions`). `ContactResponse` (a union) and
   `ContactErrors` (`Partial<Record<...>>`) were not flagged and were left as `type`.
2. **`ContactForm.tsx`**: `import { useState, type FormEvent } from 'react'` →
   `import { useState, type SubmitEvent } from 'react'`. `@typescript-eslint/no-deprecated`
   flagged `FormEvent` — @types/react marks it `@deprecated FormEvent doesn't actually exist`,
   pointing at `ChangeEvent`/`InputEvent`/`SubmitEvent`/`SyntheticEvent`. For a `<form>` submit
   handler, `SubmitEvent<HTMLFormElement>` (defined in the same `@types/react` file) is the
   correct replacement; `onSubmit`'s parameter type was updated to match.
3. **`ContactForm.tsx`**: six `String(data.get('name') ?? '')`-style calls triggered
   `@typescript-eslint/no-base-to-string` (`FormDataEntryValue | null` includes `File`, whose
   default `String()` stringification is `[object Object]`). Replaced with a local
   `field(key: string)` helper that does `typeof value === 'string' ? value : ''`, applied
   uniformly to all six fields (`name`, `email`, `company`, `message`, `budget`, `honeypot`).
   Behaviourally identical for the string inputs this form actually produces (there is no
   `<input type="file">` in the form); the helper only changes what happens on the
   impossible-in-practice case of a `File` value, from `"[object Object]"` to `''`.
4. **`ContactForm.tsx`**: `<form onSubmit={onSubmit} ...>` triggered
   `@typescript-eslint/no-misused-promises` (`onSubmit` is `async`, returning `Promise<void>`,
   where JSX's `onSubmit` prop wants a plain `void`-returning function). Wrapped in a sync arrow:
   `onSubmit={(event) => { void onSubmit(event) }}`. No rule was loosened; this is the standard
   fix for this exact eslint rule.

Re-ran `pnpm -F web lint` after these four fixes: exit 0, no output (clean).
`pnpm -F web exec tsc --noEmit`: exit 0, no output (clean).

## Pre-existing, out-of-scope test failure (not introduced by this task)

Before the ESLint fixes were applied, a full-suite run (`pnpm -F web test:run`) surfaced one
failing test unrelated to contact: `src/components/ui/button.test.tsx >
'keeps text-base as the deliberate colour pairing on the primary variant'`, expecting
`buttonVariants({ variant: 'primary' })` to contain `'text-base'`, but the current
`app/web/src/components/ui/button.tsx` on disk uses `text-on-accent` instead (with a comment
explaining the token rename to avoid a tailwind-merge collision with the `lg` size's
`text-[1rem]`). This session's git status at conversation start showed only `infra/*` files
modified; `button.tsx` and `button.test.tsx` are not part of Task 11's file list and were modified,
uncommitted, by a different concurrent session during this task (confirmed via `git status
--short`, which by the time of the build also showed `app/web/src/styles/globals.css` and
`app/web/src/styles/tokens.test.ts` as modified-but-untouched-by-me). Per the brief's scope and the
"do not touch, stage, revert or stash" instruction for files owned by another session, `button.tsx`
/`button.test.tsx` were left exactly as found and were not staged or committed. This task's own
contact-scoped tests (11 + 5 = 16 cases) are unaffected and pass regardless of that file's state.

## Files changed (staged and committed)

```
app/web/package.json
app/web/src/app/contact/page.tsx
app/web/src/components/contact/ContactForm.test.tsx
app/web/src/components/contact/ContactForm.tsx
app/web/src/lib/contact.test.ts
app/web/src/lib/contact.ts
pnpm-lock.yaml
```

Verified `pnpm-lock.yaml`'s diff before staging contained only the `@testing-library/user-event`
addition (checked with `git diff pnpm-lock.yaml`) — no unrelated lockfile churn from the other
concurrent session's work leaked in.

## Commit

`8764bc9` — `feat(web): contact form client that degrades without an endpoint`
(7 files changed, 427 insertions(+), 4 deletions(-)). Lefthook's pre-commit hook ran Prettier
(reformatted the two new files and reordered a few Tailwind class strings via
`prettier-plugin-tailwindcss` — e.g. `border-border bg-surface` → `border border-border bg-surface`
ordering) and ESLint, both passing. Re-ran the contact-scoped test files after the commit
(`vitest run src/lib/contact.test.ts src/components/contact`) to confirm Prettier's reformatting
didn't change behaviour: `Test Files 2 passed (2)`, `Tests 16 passed (16)`.

## git status --short before committing

```
M  app/web/package.json
M  app/web/src/app/contact/page.tsx
A  app/web/src/components/contact/ContactForm.test.tsx
A  app/web/src/components/contact/ContactForm.tsx
 M app/web/src/components/ui/button.test.tsx
 M app/web/src/components/ui/button.tsx
A  app/web/src/lib/contact.test.ts
A  app/web/src/lib/contact.ts
 M app/web/src/styles/globals.css
 M app/web/src/styles/tokens.test.ts
 M infra/deploy.sh
 M infra/settings.auto.tfvars.tpl
 M infra/terraform.env
M  pnpm-lock.yaml
```

Nothing under `infra/` staged (all three `infra/*` lines are unstaged `M `, untouched). No
`tsconfig.json`/`next-env.d.ts` present at all (reverted before this point). Only the six brief-
listed paths plus `pnpm-lock.yaml` show a staged (`M `/`A `) status.

## Concerns

1. Brief's Step 4 says "all twelve cases" for the client test; the verbatim Step 1 source has 11
   `it()` blocks and vitest reports 11 passed — a discrepancy in the brief's prose, not in the
   code or coverage (see Cycle 1 section above).
2. `@testing-library/user-event@^15` does not exist; substituted `^14.6.7` per ruling 4.
3. Another concurrent session has uncommitted, unstaged changes to
   `app/web/src/components/ui/button.tsx`, `button.test.tsx`, `app/web/src/styles/globals.css`,
   and `app/web/src/styles/tokens.test.ts` that were present throughout this task and left
   untouched. One test in that WIP (`button.test.tsx`'s `text-base` assertion) currently fails
   against the current `button.tsx` on disk — this is not something Task 11 introduced or can fix
   without touching files outside its scope.
4. No other concerns; all verification steps from the task brief passed.

---

## Addendum: content-layer refactor (spec gap fix + three test-gap closures)

Dispatched separately to fix a plan defect: Task 11's brief authored contact-form copy inline,
contradicting the plan's Global Constraint and `src/content/ui.ts`'s own header rule that every
string a visitor reads belongs in `src/content/`. This addendum moves that copy and closes three
untested bounds the brief's fixture left uncovered.

### Strings moved, with new keys (`app/web/src/content/ui.ts`)

| New key | Value | Moved from |
|---|---|---|
| `contactNotLive` | "Our contact form is not live yet — book a call or email us directly." | `ContactForm.tsx` fallback panel |
| `contactLabelName` | "Name" | `ContactForm.tsx` name `<label>` |
| `contactLabelEmail` | "Email" | `ContactForm.tsx` email `<label>` |
| `contactLabelCompany` | "Company" | `ContactForm.tsx` company `<label>` |
| `contactLabelBudget` | "Budget" | `ContactForm.tsx` budget `<label>` |
| `contactLabelMessage` | "Message" | `ContactForm.tsx` message `<label>` |
| `contactOptional` | "(optional)" | Company and Budget label suffixes |
| `contactBudgetPlaceholder` | "Prefer not to say" | Budget `<select>` default `<option>` |
| `contactHoneypotLabel` | "Leave this empty" | Honeypot `<label>` |
| `contactErrorName` | "Please tell us your name." | `contact.ts` `validateContact` |
| `contactErrorNameLength` | "That name is too long." | `contact.ts` `validateContact` |
| `contactErrorEmail` | "Please enter a valid email address." | `contact.ts` `validateContact` |
| `contactErrorCompanyLength` | "That company name is too long." | `contact.ts` `validateContact` |
| `contactErrorMessage` | "Please add a little more detail." | `contact.ts` `validateContact` |
| `contactErrorMessageLength` | "Please shorten this to under 5000 characters." | `contact.ts` `validateContact` |

No copy was invented — every value above is the exact wording that existed inline before the move.
Existing keys (`formSubmit`, `formSending`, `formSuccess`, `formErrorValidation`,
`formErrorRateLimit`, `formErrorServer`, `contactFallback`, etc.) were untouched.

`contact.ts` gained one import, `import { ui } from '@/content/ui'` — allowed direction; the
ESLint boundary rule forbids content importing components, not the reverse.

`ContactForm.tsx` structural ARIA (`aria-hidden`, `aria-live`, `role`, `aria-invalid`,
`aria-describedby`) stayed inline as markup, not copy, per the brief.

`ContactForm.test.tsx` needed one change: the inline-error assertion
(`screen.findByText('Please tell us your name.')`) now asserts
`screen.findByText(ui.contactErrorName)`. `contact.test.ts`'s existing `validateContact` cases
assert only `.toBeTruthy()` on the error fields, so they needed no change — verified by reading
before editing, not assumed.

### Three closed test gaps (`app/web/src/lib/contact.test.ts`)

1. **`name` over 100 characters** — new case asserts `validateContact({ ...valid, name: 'x'.repeat(101) }).name` is truthy.
2. **`company` over 100 characters** — new case asserts `validateContact({ ...valid, company: 'x'.repeat(101) }).company` is truthy.
3. **`submitContact` with a non-empty `honeypot`** — read `contact.ts` first: `submitContact` has
   no honeypot-specific branch. It runs the same `validateContact` (which never inspects
   `honeypot`) and, if that passes, POSTs the full request — honeypot value included — to the
   endpoint exactly like any other submission. So the client does not filter or short-circuit a
   filled honeypot; it is purely a pass-through field. The new test pins that: it fills
   `honeypot`, mocks `fetch` to resolve `{ ok: true }` (the documented server response when the
   honeypot trips — discarded server-side without sending), and asserts `fetch` **was** called
   with the filled honeypot in the JSON body, and that `submitContact` returns `{ ok: true }`.
   This documents the existing contract (server owns honeypot discrimination; client is a dumb
   relay) rather than inventing new client-side blocking behavior, per instruction.

### Commands run, with real output

`PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/lib src/components/contact src/content`
→ `Test Files 4 passed (4)` / `Tests 33 passed (33)` (both before and after the pre-commit
formatter ran).

`PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run` (full suite)
→ `Test Files 9 passed (9)` / `Tests 64 passed (64)` — up from 9 files / 61 tests, i.e. exactly
the 3 new cases, no regressions, no new files.

`cd app/web && PATH=/opt/homebrew/bin:$PATH pnpm exec eslint src/content/ui.ts src/lib/contact.ts src/lib/contact.test.ts src/components/contact/ContactForm.tsx src/components/contact/ContactForm.test.tsx`
→ exit 0, no output.

`PATH=/opt/homebrew/bin:$PATH pnpm -F web lint` (full package)
→ exit 1, but the only errors are 3 `@typescript-eslint/dot-notation` violations in
`app/web/playwright.config.ts` (task12's untracked file, out of scope and untouched by this
task). The 5 files this task touched lint clean in isolation (see above).

`PATH=/opt/homebrew/bin:$PATH pnpm -F web exec tsc --noEmit` → exit 0, no output.

`git status --short` before staging showed exactly the 5 intended files modified, plus the
pre-existing unstaged `infra/*`, `package.json`, `pnpm-lock.yaml` (other sessions') and untracked
`app/web/playwright.config.ts` / `app/web/tests/e2e/` (task12's) — none of which were staged,
touched, or reverted.

### Commit

`8df1e5a` — `refactor(web): move contact copy into the content layer`
5 files changed, 57 insertions(+), 19 deletions(-):
`app/web/src/components/contact/ContactForm.test.tsx`,
`app/web/src/components/contact/ContactForm.tsx`, `app/web/src/content/ui.ts`,
`app/web/src/lib/contact.test.ts`, `app/web/src/lib/contact.ts`.

The repo's `lefthook` pre-commit hook ran its own Prettier `format` step during commit, which
reflowed a few lines (e.g. collapsing some multi-line `expect(...)` chains) without changing
logic; re-ran the scoped vitest suite after the commit to confirm — still 33/33 passing.

### Concerns

None blocking. One pre-existing, out-of-scope item noted in this same report's earlier section
(the `button.test.tsx` `text-base` failure from WIP Task 9/10 files) is unrelated to this change
and was not touched.
