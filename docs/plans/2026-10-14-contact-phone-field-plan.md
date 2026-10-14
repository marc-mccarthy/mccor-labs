# Contact Form Phone Field Plan

Created: 2026-10-14 · Last updated: 2026-10-14

## Context

Owner wants name, email, phone, message required; phone auto-formatted while typing; phone + email validated; message non-empty; placeholders on every field. Owner decisions: single Name field; US/Canada phone only, no new package; message min 10 chars kept; phone validated in API, in owner email, listed in privacy text; errors on blur + submit, cleared as fixed.

Form is not live yet (P0-T21/T23-T25 pending). Reviewed by three ui-ux-pro-max reviewers (a11y, interaction, system); edits below are the arbitrated result.

## Branch

`feat/contact-phone-field` off main 9765aa0, worktree `../mccor-labs-phone`. Ship with `/ship` after done-gate.

## Shared phone rules

- Example number everywhere a valid one is needed: `(202) 555-0123` / `+12025550123`. `5551234567` is format-only and invalid (exchange starts with 1).
- Digits: strip non-digits; drop one leading `1` whenever it is the first digit; cap at 10.
- Valid: 10 digits, area code and exchange start 2-9. API wire format E.164 only: `^\+1[2-9]\d{2}[2-9]\d{6}$`.

## Tasks

T1 Phone lib — new `app/web/src/lib/phone.ts` + `phone.test.ts`
ST1 `phoneDigits(raw)` per shared rules.
ST2 `formatUsPhone(raw)` progressive, no trailing separator: `202` → `202`, `2025` → `(202) 5`, `2025550` → `(202) 555-0`, full → `(202) 555-0123`.
ST3 `isValidUsPhone(raw)` accepts formatted, bare, and E.164 input.
ST4 `toE164(raw)` → `+1XXXXXXXXXX`.
ST5 Shared case table (mirrored in API tests): valid E.164; `2025550123`; `+1 202 555 0123`; `+1 (202) 555-0123`; `1-202-555-0123`; `+11025550123` invalid; `+12021550123` invalid; short; letters; empty.

T2 Validation + payload — `app/web/src/lib/contact.ts`, `contact.test.ts`
ST1 Add `phone: string` to `ContactRequest`; add `'phone'` to `ContactErrors` keys.
ST2 `validateContact`: empty → `ui.contactErrorPhone`; invalid → `ui.contactErrorPhoneInvalid`. Other rules unchanged.
ST3 `submitContact` posts `{...request, phone: toE164(request.phone)}` (validation at :86 stays on raw value). Test asserts posted body has `phone: '+12025550123'`. Update `valid` fixture.

T3 Copy — `app/web/src/content/ui.ts`, `ui.test.ts`
ST1 `contactLabelPhone: 'Phone'`, `contactPhoneHint: 'US or Canadian number'`, `contactErrorPhone: 'Please enter your phone number.'`, `contactErrorPhoneInvalid`: 10-digit US/Canadian ask plus an "or email us at {site.contactEmail}" way out (match `formErrorServer` style).
ST2 Placeholders: name `Your full name`, email `you@company.com`, phone `(202) 555-0123`, company `Company name`, message `What are you building, and where are you stuck?`.
ST3 Add new keys to `ui.test.ts` assertNoClaims `it.each`.

T4 Form UI — `app/web/src/components/contact/ContactForm.tsx`, tests
ST1 Phone field after Email: `type="tel"`, `autoComplete="tel"`, `id/name="phone"`, NO `maxLength`, same `fieldVariants`/`LABEL`/error `<p id="phone-error">` with the `field-error` animation class copied verbatim. Visible hint `<p id="phone-hint">` (text-muted, size of optional marker); `aria-describedby="phone-hint"` plus `phone-error` when present.
ST2 Formatting: input stays uncontrolled. Phone's own `onInput`: compute digits before caret, set `el.value = formatUsPhone(...)`, `setSelectionRange` after the same digit count. If digits unchanged and `inputType` is `deleteContentBackward`/`deleteContentForward`, remove the neighbouring digit. Inserts never depend on `inputType` (Gboard composition). Unchanged digits otherwise → no rewrite.
ST3 Placeholders on name, email, phone, company, message. Color already `placeholder:text-muted` (field.ts:4, ~7:1); manual contrast check only.
ST4 Native `required` on name, email, phone, message (form keeps `noValidate`).
ST5 Extract `readRequest(form)` from the FormData block (:174-187), add phone; reuse on submit and blur.
ST6 Blur: form-level `onBlur`; dirty set in `useRef<Set>` filled from form `onInput`. On blur of a dirty field, set/clear only that key from `validateContact(readRequest(form))`. Skip when `relatedTarget` is the submit button. Never bump `validationRun`. While a field has an error, re-validate on input and clear when valid; never add errors on input. No live regions.
ST7 Signal — `components/contact/contactSignal.ts`: phone in `ContactFields`, `messageFill` passes `phone: ''`, `contactCharge` → quarters; `contactSignal.test.ts` thirds → quarters, fixtures get phone; confirm `ContactBeamScene` reads only `charge`.
ST8 Update `ContactForm.test.tsx` (fillValidForm, invalid case, phone label) and `ContactForm.focus.test.tsx` (fillPhone). New tests: formatting via input handler incl. autofill `+12025550123`, backspace over `) ` and `-`, Delete key, blur errors only when dirty, submit click not swallowed by blur.

T5 API — `app/api/src/lib/contactInput.ts`, `mail.ts`, tests
ST1 `phone` in `ContactInput`, `checkContact`, `isValid` with the E.164 regex after trim; missing → invalid.
ST2 `ownerEmailText`: `Phone: +12025550123` line after Email.
ST3 Update `contactInput.test.ts` (mirrored case table), `mail.test.ts`, `handlers/contact.test.ts` fixture and privacy loop (:209) incl. bare 10 digits never logged.

T6 Privacy — `app/web/src/content/legal.ts`, `legal.test.ts`
ST1 Item after email: `Your phone number — required (US or Canada)`.
ST2 Log sentence: "never logs your name, email address, phone number, company, budget or message."
ST3 One test per new string. T23 owner approval now covers this wording.

T7 E2E — `app/web/tests/e2e/`
ST1 `contact-states.spec.ts`: fill `#phone` in fillValid/focus/tier helpers; empty submit shows 4 errors incl. `#phone-error`, focus `#name`; typing `2025550123` → `(202) 555-0123`; dirty bad phone/email error on blur; Tab-through empty fields shows no errors. New states run through the 390/1440 axe matrix keeping PR #25's animation wait.
ST2 `contact-signal.spec.ts`, `contact.spec.ts`: fill/see `#phone`.
ST3 Run live-form specs locally with `NEXT_PUBLIC_CONTACT_ENDPOINT=/api/contact`.

## Execution

- Implementers: ui-ux-pro-max expert subagents. A = T1+T2+T3; C = T5+T6 (parallel with A); B = T4 (after A); D = T7 (after B).
- Main session verifies each: diff read, tests run, browser spot-check.

Ruling: US/Canada-only phone, hand-rolled formatter (cost if wrong: international visitors blocked; swap to libphonenumber-js).
Ruling: E.164 is the only wire format; formatted display in the form only; owner email shows E.164 (cost if wrong: small mail.ts change).
Ruling: blur errors only for dirty fields; empty-required errors on submit (cost if wrong: users see empty-field errors later).
Ruling: visible "US or Canadian number" hint (cost if wrong: one line of extra copy).
Ruling: `contactReceiptNext` "We will reply by email." left unchanged; flagged to owner (cost if wrong: copy tweak).

## Verification

- Before merge: prod `NEXT_PUBLIC_CONTACT_ENDPOINT` still unset (old bundles without phone would get 400 with no mailto fallback).
- `pnpm -F web exec tsc --noEmit`, `pnpm -F web lint`, `pnpm format:check`, `pnpm -F web test:run`, API test + typecheck.
- E2E contact + a11y specs with endpoint set.
- Manual: type/paste/autofill/backspace/delete in phone; blur errors; placeholder contrast.
- `/code-review` on the diff, then `/ship`.
