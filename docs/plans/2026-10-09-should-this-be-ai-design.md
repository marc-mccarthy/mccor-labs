# Design: Should This Be AI? (the wrong-tool test)

Status: revised after plan reviews 2026-10-09; awaiting owner approval of plans
Sources: `~/.claude/prompt-results/mccorlabs-aws-next-level-ideas-10-8-26.md` section 3, `docs/plans/open-work.md`, code map of 2026-10-09, the three reviews.

## Goal

A public lab at `/lab/should-this-be-ai/` where a visitor lays out the steps of a workflow and a rubric written in code labels each step with one of six verdicts, and shows why in plain words. Later phases let a small model argue the other side or race a simple program on the visitor's own examples, with the cost shown, and a learning loop that grows the rubric's tests in public.

The six verdicts (ids stay fixed; labels and one-line glosses live in `copy.ts`):

| Id                | Label                              | Gloss                                         |
| ----------------- | ---------------------------------- | --------------------------------------------- |
| `plain-code`      | A simple program                   | Fixed steps, no judgment                      |
| `rules`           | A checklist your team can edit     | If this, then that                            |
| `classic-ml`      | A model trained on your past cases | Predicts from history                         |
| `language-model`  | An AI language model               | Reads and writes text                         |
| `do-not-automate` | Keep a person on it                | The judgment is the job                       |
| `unclear`         | Worth a conversation               | Answer the not-sure questions to sharpen this |

Any verdict except `do-not-automate` and `unclear` can carry a "+ human sign-off" modifier.

Success means:

- In 5 moderated sessions with non-technical owners, at least 4 can say which of their steps needs AI within 2 minutes (the site keeps no analytics, so this is measured by sessions, not traffic).
- Every verdict is deterministic, unit-tested, and explained by the rule that fired.
- No stranger can cost more than the named daily caps.
- Leads arrive through a working contact form, and replies reach them.

Audience: business owners and operators who come for help (primary), and technical buyers who judge craft (secondary).

## Owner decisions (2026-10-09)

- Name and URL: "Should This Be AI?", subtitle "the wrong-tool test", at `/lab/should-this-be-ai/`.
- Scope: all four phases (0 to 3), broken into small sequential tasks.
- Contact backend: included as phase 0.
- Model: Amazon Nova 2 Lite, model ID kept in config.
- Backend approach: Lambda Function URLs behind the existing CloudFront distribution at `/api/*`, through OAC.
- Packages approved for a new `app/api` workspace: `@aws-sdk/client-bedrock-runtime`, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-ssm`, `@aws-sdk/client-sesv2` (runtime), `esbuild`, `aws-sdk-client-mock` (dev).
- Placement: linked from the Services page and the footer; main nav unchanged.
- Feedback marks carry `ruleId`, and the digest counts per rule and reason (approved).
- The rubric fix (follow-up question 2b, rules R12 and R13, narrowed R2, sign-off as a function of the answers) is approved.
- The reduced-motion "no sticky element" gate in `tests/e2e/motion.spec.ts` is narrowed to skip `[data-sticky-layout]` (approved).
- `app/api` defines minimal local Lambda Function URL event and result types instead of adding `@types/aws-lambda` (approved).

## Rulings

- Ruling: the rubric in code decides every verdict; the model only argues and races (cost if wrong: verdicts feel less "AI" to some visitors, but they stay testable and on-voice).
- Ruling: Lambda Function URLs behind CloudFront `/api/*` with OAC, not API Gateway (cost if wrong: a few lines of SHA-256 header code in the browser and no built-in throttling; keeps same-origin, `connect-src 'self'`, no CORS, no new domain).
- Ruling: one JSON response per call, not streaming; lanes appear once, labelled "measured" (cost if wrong: no ticking animation).
- Ruling: no CAPTCHA; honeypot, minimum fill time and daily caps instead (cost if wrong: more spam reaches the cap; keeps "we do not track you", `legal.ts:30`).
- Ruling: global daily caps, not per-visitor (cost if wrong: one script can drain a cap and visitors then see the recorded run; AWS WAF is the upgrade path).
- Ruling: no WebGL on the lab; `PageHeader` with the existing `/media/brand/systems-lattice.webp` and a DOM progress rail instead of `NodeLatticeScene` (cost if wrong: less spectacle; protects the INP 200 ms gate and keeps the 738 KB three.js chunk off this route).
- Ruling: verdicts differ by label and marker shape, with color secondary; no new tokens (cost if wrong: less color punch; works for color-blind visitors).
- Ruling: verdicts always render as DOM for every visitor, outside any scene or fallback (cost if wrong: none found).
- Ruling: lab results travel to the contact page in the URL fragment, cleared after reading; nothing goes in a query string (cost if wrong: results are lost if JavaScript is off; keeps step names out of servers).
- Ruling: lab copy makes no client, outcome or team-size claims and cites no past work, enforced by a content test (cost if wrong: drier copy).
- Ruling: the Services link block ships only after hole 2 (unbacked client claims, `services.ts:54`) is fixed; the footer link ships with phase 1 (cost if wrong: one less entry point at launch).
- Ruling: `RecordedRace` shows only a real Nova 2 Lite run whose raw trace is committed; with no real trace it is left out (cost if wrong: phase 1 has no race preview).
- Ruling: handlers live in a new pnpm workspace `app/api`, bundled by esbuild into one zip per function, built in CI before `terraform plan` (cost if wrong: a second build path to maintain).
- Ruling: no visitor step text or examples are stored, and Bedrock invocation logging stays off (cost if wrong: less material to learn from; the feedback loop uses enum-only marks instead).
- Ruling: phase 0 emails only the owner's own `@mccorlabs.com` address, which works while SES is in the sandbox (cost if wrong: none for inbound; outbound replies are a separate launch blocker, see Dependencies).
- Ruling: Lambda runtime `nodejs24.x`, arm64, matching `engines.node >=24` and CI (cost if wrong: one runtime string and the esbuild target).
- Ruling: `app/api` uses local `LambdaFunctionURLEvent` and `LambdaFunctionURLResult` types instead of `@types/aws-lambda` (cost if wrong: a field the handler reads drifts from the real event shape).
- Ruling: the banned-claims check is one shared helper, `assertNoClaims(text)` in `app/web/src/test/noClaims.ts`, run by every phase over its copy; it rejects client, team-size, percent and outcome claims (cost if wrong: none; a per-phase list would drift).

## Phase 0: contact backend

What it does: makes the existing contact form work and keeps the promise it makes.

- `ContactForm` already posts JSON to `env.contactEndpoint` (`app/web/src/components/contact/ContactForm.tsx:17`, `app/web/src/lib/contact.ts:41-60`). Set `NEXT_PUBLIC_CONTACT_ENDPOINT=/api/contact` in `app.env`.
- `submitContact` adds the `x-amz-content-sha256` header (SHA-256 of the body via `crypto.subtle`), which OAC requires on POST to a Function URL.
- Lambda `contact` (`nodejs24.x`, arm64):
  1. A filled honeypot returns 200 and does nothing else; a form sent in under 3 seconds returns 400 `{"reason":"too_fast"}` (client sends elapsed ms).
  2. Validate field shapes and sizes with the same rules as `validateContact`.
  3. Conditional-update a DynamoDB counter item `contact#<UTC date>`; at `CONTACT_DAILY_CAP` (default 50) return 429 with `{"reason":"daily_cap"}`.
  4. Send one plain-text email to the owner through SES v2 from the verified `mccorlabs.com` identity.
  5. Return 200 with a reference number. Store no message body.
- Client errors: 400 split into `validation` and a new `too_fast`, 429 split into `rate_limit` and a new `daily_cap`, 5xx `server`. Field values are kept on every error. Copy in `ui.ts`:
  - `ui.formErrorTooFast`: "That was quicker than we expect from a person. Please press Send again."
  - `ui.formErrorDailyCap`: "Our form has reached today's limit. Email us at {contactEmail}; your message is still in the box below."
  - `ui.formErrorServer`: "We could not send that. Email us at {contactEmail}; your message is still in the box below."
- For `daily_cap` and `server`, the contact address renders as a `mailto:` link whose subject is `ui.formMailtoSubject` and whose body is the visitor's current message, capped by `contactMailtoHref` at 1,500 encoded characters.
- Ruling: `daily_cap` and `server` errors carry a mailto link prefilled with the message body (cost if wrong: a second mailto helper beside phase 1's `labMailtoHref`).
- Ruling: CloudFront is granted both `lambda:InvokeFunctionUrl` (with `function_url_auth_type = "AWS_IAM"`) and `lambda:InvokeFunction` (with `invoked_via_function_url = true`), scoped to the distribution ARN and wired through a new `static_site` variable `api_function_arns` (cost if wrong: one extra harmless permission; without it every call returns 403).
- Until a test reply from a `@mccorlabs.com` mailbox reaches an outside address, the success text does not promise a reply time (`ui.ts:22`).
- Privacy text updated in the same release: the form, the email to the owner, and the 7-day counter.

## Phase 1: static lab

What it does: the whole builder and the verdicts run in the browser with no AWS call.

### Page order

1. `PageHeader`: title, subtitle "the wrong-tool test", a one-line promise, image `/media/brand/systems-lattice.webp`, no video.
2. A three-step "how it works" strip in `font-mono`, `text-muted`.
3. "Load an example workflow" with 3 presets from `copy.ts` (invoice intake, support inbox, quote requests), each loading 4 answered steps.
4. The builder. At the large breakpoint, two columns: steps on the left, a summary on the right (count per verdict plus the progress rail) that is `lg:sticky` with `data-sticky-layout` for every visitor, reduced motion included. Below it, each verdict sits under its step.
5. "Your workflow at a glance": a summary table (step, verdict, reason, rule id) with a Cards / Table toggle open to every visitor. It doubles as the preview of what "Send us this result" sends.
6. "Send us this result".
7. `RecordedRace`, only if a real trace exists (see Rulings).
8. A method note showing `RUBRIC_VERSION`.

### Rubric

- `app/web/src/content/lab/rubric.ts`: types `Answer = 'yes' | 'no' | 'not-sure' | null`, `Frequency = 'daily' | 'weekly' | 'monthly-or-less' | null`, `StepAnswers`, `Verdict`, `RubricResult {verdict, humanSignOff, ruleId, why, rubricVersion}`, and `classifyStep(answers): RubricResult`, a pure function over ordered rules. `RUBRIC_VERSION` is bumped on any rule change.
- Each rule lives in its own file `app/web/src/content/lab/rules/<ruleId>.ts` exporting `{id, when(answers), verdict, humanSignOff, why}`.
- Rule ids are `R1` to `R13`; the thirteen rules are mutually exclusive and total over every answer set. `RUBRIC_VERSION` starts at `2.0.0`.
- Questions (plain words, each with a one-line example in `copy.ts`), all starting unanswered. `StepAnswers` keys are in brackets:
  1. Do the information it uses and the result it produces both come in a fixed form, like spreadsheet rows or form fields, rather than emails, PDFs, photos or written paragraphs? (yes / no / not sure) [`fixedForm`]
  2. Could you write the decision as a checklist a new hire follows without asking you? (yes / no / not sure) [`checklist`]
     - 2b, shown only when question 2 is yes: Does your team change this checklist themselves, more than a few times a year, such as prices, limits or who qualifies? (yes / no / not sure) [`changes`]
  3. If it gets one wrong, does it cost money, a customer, or a legal problem? (yes / no / not sure) [`costly`]
  4. Can a person check the result before it takes effect? (yes / no / not sure) [`checkable`]
  5. Do you have past cases where you know the right answer, say 200 or more? (yes / no / not sure) [`pastCases`]
  6. How often does it happen? (daily / weekly / monthly or less; optional, used for cost estimates) [`frequency`]
- Ruling: question 1 asks about both the input and the result, so a step that turns a spreadsheet into written sentences is a language-model step (cost if wrong: a fixed-input, free-text-output step a template could fill goes to a language model; the visitor can still answer yes).
- Rule summary (from the phase 1 plan's Ruling R-TREE):
  - An unknown cost of a mistake gives `unclear` (R1). Costly with an unknown check gives `unclear` (R3).
  - Once those are known, an unknown form gives `unclear` (R4), and a fixed form with an unknown checklist gives `unclear` (R6).
  - Costly and not checkable gives `do-not-automate` (R2), unless the form is fixed and the decision is a checklist, which gives `plain-code` with no sign-off (R12).
  - When a mistake is cheap or a person checks first: free text gives `language-model` (R5).
  - A fixed-form checklist gives `plain-code` when the team rarely changes it (R7), `rules` when the team changes it more than a few times a year (R8), and `unclear` when that is unknown (R13).
  - Fixed input without a checklist gives `unclear` when past cases are unknown (R9), `classic-ml` with 200 or more past cases (R10), and `do-not-automate` without them (R11).
- Ruling: the verdict tree is R1 to R13 as above, with R2 narrowed by R12 (cost if wrong: R12 ignores follow-up 2b, so a costly, unchecked checklist the team edits often is still "a simple program"; the R12 reason tells the visitor to test it on past cases first).
- Ruling: "+ human sign-off" is `costly === 'yes' && checkable === 'yes'` for every verdict except `do-not-automate` and `unclear`, which never carry it; `rules` does not always carry it (cost if wrong: none; a proof over every answer set pins it).
- Vitest covers every rule, every boundary, the sign-off modifier, exclusivity and totality over every answer set, and that every rule id has a code snippet and a reason.

### Components (`app/web/src/components/lab/`)

- `WorkflowBuilder` (client): steps are an `<ol>`, 1 to 8 steps, names capped at 60 characters and kept in memory.
  - Each step has "Move up", "Move down" and "Remove" buttons whose names include the step number and name. No drag-only action.
  - Focus: after Add, the new step's name field; after Move, the same button on the moved step; after Remove, the next step's name field, or Add if none. A polite "Step removed. Undo" control shows for 10 seconds; the timer pauses while Undo has focus, focus moves to Add if the timer expires while Undo is focused, and Undo is hidden at 8 steps.
  - At 8 steps, Add stays focusable with `aria-disabled` and the text "Up to 8 steps". Remove is hidden when one step is left.
  - One visually hidden `role="status"` region, the only one on the page, announces adds, moves, removes, and verdict changes as "Step 2, Send invoices: a simple program". It fires on answer changes, never on name keystrokes.
- `StepCard`: uses the site `Card` (`components/ui/card.tsx`). Each question is a `fieldset` with a `legend` and radios; touch targets at least 44 by 44 px; controls use `border-border-strong`; the chosen state shows by fill (`bg-elevated`) and text, never color alone. Below the `md` breakpoint steps form an accordion with one open; a collapsed step shows its name, verdict and answered count.
- `VerdictCard`: uses `Card`; the verdict word sits in the card heading through a `Badge` variant per verdict. Verdict text is in the DOM as soon as it is computed. The first reveal wraps each card in `components/motion/Reveal` with `delay = Math.min(revealOrder, 3) * --stagger-interval`, and `Stagger` is left unchanged; steps added later get `revealOrder` 0. Later changes fade only the changed card at `duration-pointer` with `ease-pointer`; everything is instant under reduced motion. No `aria-live` on cards.
- Verdict styling lives in `VERDICT_STYLE` (tokens by name; label text always present). Each entry has `marker`, an inline shape used in badges and lists, and `cardRule`, used only by `VerdictCard`. Only `do-not-automate` has a `cardRule`: `absolute inset-y-0 left-0 w-px bg-brand` on a `relative overflow-hidden` card.

| Verdict           | Label color   | `marker`                               | Card                   | `cardRule`                                |
| ----------------- | ------------- | -------------------------------------- | ---------------------- | ----------------------------------------- |
| `plain-code`      | `text-text`   | solid square, `bg-text`                | `border-border-strong` | none                                      |
| `rules`           | `text-text`   | outline square, `border-border-strong` | `border-border-strong` | none                                      |
| `classic-ml`      | `text-accent` | outline circle, `border-accent`        | `border-border`        | none                                      |
| `language-model`  | `text-accent` | solid circle, `bg-accent`              | `border-border`        | none                                      |
| `do-not-automate` | `text-text`   | inline rule, `h-3 w-px bg-brand`       | `bg-elevated`          | `absolute inset-y-0 left-0 w-px bg-brand` |
| `unclear`         | `text-muted`  | dashed `border-border-strong`          | `border-border`        | none                                      |

- Ruling: `VERDICT_STYLE` splits `marker` (inline, in badges and lists) from `cardRule` (only on `VerdictCard`), so the do-not-automate left rule never stretches inside a badge or list item (cost if wrong: two style fields per verdict where one would do).

Minimums: verdict labels 4.5:1, control edges 3:1, checked by a contrast test that reads `globals.css`. `color-brand` is never a label or a fill.

- `WhyDrawer`: an inline disclosure, not a modal. A "Why?" button with `aria-expanded` and `aria-controls`; focus stays on the button. It shows the plain `why` and the answers that triggered it first, then a nested "Show the rule as code" disclosure. `page.tsx` (server) reads each `rules/<ruleId>.ts` at build time and renders one `CodeBlock` per rule, passed to the client as `Record<RuleId, ReactNode>`. The code scroll container gets `tabIndex={0}` and an `aria-label`.
- Progress rail: a `h-px bg-brand` line scaled to resolved steps over total at `duration-standard`. A step is resolved when every visible question has an answer, "Not sure" included: questions 1 to 5, plus 2b when question 2 is yes.
- Ruling: resolved counts "Not sure" as answered (cost if wrong: the rail can reach full while verdicts still say "Worth a conversation").
- `SendResult` ("Send us this result"): builds readable text from `copy.ts`, one line per step: "Step 2: A checklist your team can edit (rule R8, rubric <version>)". Step names are included only if the visitor ticks "Include my step names" (unchecked by default), and the exact text is previewed. It navigates to `/contact/#lab=<encoded>`; the contact page reads `location.hash` in a client effect, pre-fills the message, shows "We added your results. Edit or remove them.", and clears the hash with `history.replaceState`. With no endpoint, the same text goes in the mailto body, encoded and capped at about 1,500 characters. The contact page offers both "Send" and "Book a call".
- Copy: all strings in `app/web/src/content/lab/copy.ts`, plus each rule's `why`. The content test runs `assertNoClaims` over them; it rejects "Medicare", "franchise", "clients", digits followed by "engineers" or "people", percent figures, and outcome claims.

### Placement and routes

Footer entry in `footerNav` with phase 1. Services link block (after the `ServiceBlock` list, before `IntegrationMarks`, in the featured-card pattern of `ServicesPreview.tsx:30`) after hole 2 is fixed. Add the route to `sitemap.ts`, `ROUTES` in `tests/e2e/support.ts`, and `PATHS` in `tests/e2e/a11y.spec.ts`.

### Phase 1 tests

- Vitest for the rubric, rules, copy and components.
- Playwright: axe on the empty route and on a filled state (3 steps answered, Why open, 390 px viewport); a keyboard-only flow (add, name, answer, move, remove, open Why, reach "Send us this result") asserting focus after each action and the status text; a check that the route requests no three.js chunk; the existing budgets (CLS 0.1, INP 200 ms, fonts 150 kB).
- The reduced-motion "no sticky element" gate in `tests/e2e/motion.spec.ts` skips `[data-sticky-layout]`.
- Ruling: the summary column is `lg:sticky` with `data-sticky-layout` for every visitor, reduced motion included, and the motion gate is narrowed to skip it, because sticky layout is not motion and the gate exists for `Pinned` scroll scenes (cost if wrong: a future pinned scene that wrongly carries `data-sticky-layout` escapes the gate).
- Phase gate: 5 moderated sessions per the success metric.

## Phase 2: live lab

What it does: "Race this step" and "Argue the other side" call Nova 2 Lite on the server, with a cost line and hard caps.

### Infra

- New module `infra/modules/lab_api` (the phase 0 `contact` function moves into or starts in this module):
  - Lambda functions `lab` and later `feedback` and `digest`, `nodejs24.x` arm64, reserved concurrency 2 where the account allows, else a DynamoDB in-flight item.
  - Function URLs with `AWS_IAM` auth, invoked only by CloudFront OAC (`lambda` origin type).
  - DynamoDB table `mccorlabs-lab`, on-demand, TTL attribute `expiresAt`. Items `counter#<feature>#<UTC date>` (7-day TTL) and `mark#<id>` (90-day TTL, phase 3).
  - SSM parameter `/mccorlabs/labs/should-this-be-ai/enabled` (`true` or `false`).
  - CloudWatch log groups with 3-day retention; handlers log metadata only, never bodies.
  - Per-function IAM roles: `bedrock:InvokeModel` on the US inference profile `us.amazon.nova-2-lite-v1:0` and on the `amazon.nova-2-lite-v1:0` foundation model in us-east-1, us-east-2 and us-west-2, conditioned on that profile, `bedrock:ApplyGuardrail` on the one guardrail, the table, the parameter.
  - A Bedrock guardrail with content and prompt-attack filters.
- `infra/modules/static_site` gains a variable `api_origins` (path pattern plus Function URL domain) that adds origins, a Lambda OAC, and ordered cache behaviors with `CachingDisabled`, `AllViewerExceptHostHeader`, and methods including POST. For each entry of the phase 0 variable `api_function_arns` it grants CloudFront both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction` (`invoked_via_function_url = true`). Root `main.tf` wires the `lab_api` output `function_arns` in.
- Ruling: Nova 2 Lite is called through the US geographic inference profile `us.amazon.nova-2-lite-v1:0`, which routes from us-east-1 to us-east-1, us-east-2 and us-west-2 (cost if wrong: one string change in `config.ts` and the Terraform variable; a drift test catches a mismatch).
- Spend brake (#12): an AWS Budgets action that attaches a deny policy to the lab roles; a backstop only, because it lags.

### Handler for `/api/lab/*`

1. Read the kill flag (60-second in-memory cache); off returns the recorded run.
2. Validate: race up to 5 examples of 500 characters each with expected answers; argue one step summary of 300 characters.
3. Take one unit from the daily counter (`LAB_RACE_DAILY_CAP` 50, `LAB_ARGUE_DAILY_CAP` 100); at cap return the recorded run.
4. `ApplyGuardrail` on input.
5. Converse with Nova 2 Lite, reasoning off, fixed max tokens (argue 400 output tokens; race uses a forced tool call for structured answers).
6. `ApplyGuardrail` on output.
7. Score race answers in code against the expected answers.
8. Return JSON: result, accuracy, timings, token counts, cost, runs left today.

Model ID (`us.amazon.nova-2-lite-v1:0`), caps and prices live in `app/api/src/config.ts`. Prices from the services reference: Nova 2 Lite 0.00033 USD per 1K input tokens and 0.00275 USD per 1K output tokens (verified); Guardrails 0.15 USD per 1,000 text units (verified).

A one-off owner-run script records one real race into a committed trace JSON (prompt, output, tokens, timings, date, model ID). That trace feeds `RecordedRace` and the cap and kill-switch replay.

### Front end

- `RaceLane`, `ArgueLane`, `CostLine`, inside one `LiveLabPanel` under "Your workflow at a glance". Race lanes show accuracy first ("4 of 5 correct"), then time, tokens and cost in `font-mono tabular-nums`, right-aligned, no bars. Costs under 0.0001 USD show as "under 0.0001 USD".
- Cost formatters in `labCost.ts` return `{value, unit}`; the value renders in `font-mono tabular-nums` and the unit in a `text-muted` span. `formatText` joins them for sentences.
- Ruling: formatters return `{value, unit}` so every unit renders in `text-muted` (cost if wrong: one more call at each sentence site).
- "Cost of this run" line, then the monthly line "If this runs <frequency phrase>, one item each time: about <usd> USD a month for the model, against about 0 USD for a simple program", where the phrase is "once a day", "once a week" or "once a month or less", labelled "AWS list prices on <date>; excludes hosting". Copy uses USD, never `$`.
- `ArgueLane` shows the chosen step's verdict `Badge` above the argue text. The argue text renders as plain text on `bg-elevated` with no verdict colors, under the `font-mono text-muted` label `argueAttribution`: "written by a model; the verdict is from the rubric".
- Ruling: the verdict `Badge` sits above the argue text, outside its result section, so model text never sits next to a verdict color (cost if wrong: one more prop on `ArgueLane`).
- States for each lane: idle; running (`aria-busy`, button `aria-disabled` with "Racing…", 20-second client timeout); live result; recorded because of the cap ("Recording from <time>, live runs are used up for today"); recorded because switched off ("…live runs are off"); blocked by guardrail; network, 5xx or timeout error (`role="alert"`, Retry). A recorded run says "recorded cost" and never deducts from runs left.
- The page keeps exactly one `role="status"` region, the builder's. Live panels have none of their own and announce through the builder region via `onAnnounce`. Error states announce nothing extra and rely on `role="alert"` only.
- Retry moves focus to the lane trigger, then runs.
- Ruling: one status region, reached through `onAnnounce` (cost if wrong: a renamed prop breaks live announcements until fixed).
- Ruling: Retry focuses the lane trigger before running, because Retry sits inside the alert, which unmounts when the run starts, so focus would otherwise drop to `body` (cost if wrong: one `focus()` call a reviewer may question).
- Notice beside the race and argue inputs: "Sent to Amazon Bedrock to run this test, not stored by us. Don't paste customer names or personal details."
- `RecordedRace` uses the same `RaceLane` and `CostLine` components, so recorded and live look the same apart from their labels.

### Privacy

Rewritten in the same release: AI processing by Amazon Bedrock in AWS's US regions (N. Virginia, Ohio or Oregon), as the US inference profile routes; metadata-only logs for 3 days; usage counts shown in the cost line.

## Phase 3: learning loop

- "Wrong?" per verdict: a radio group of three fixed reasons, a Send button, and, after sending, a confirmation paragraph that receives focus. Nothing is announced through the status region. It is hidden for unresolved steps and for the `unclear` verdict. One send per step, verdict and rule (keys `<stepId>:<verdict>:<ruleId>`), even across flip-back and undo.
- `/api/feedback` accepts exactly `{verdictId, ruleId, rubricVersion, reason}`, at most 512 bytes, cap 500 per day, 90-day TTL. Any other key is rejected, as are `verdictId` `unclear` and any `verdictId`/`ruleId` pair that does not match the rubric's `RULE_VERDICT` map.
- Ruling: marks carry `ruleId` so the digest can point at the rule that misfired (cost if wrong: none found; the body stays under 120 bytes).
- Ruling: "Wrong?" is hidden for unresolved steps and for `unclear`, which already asks for a conversation (cost if wrong: no feedback on "Worth a conversation" verdicts).
- A weekly EventBridge Scheduler rule invokes `digest`, which emails the owner counts per rule and reason. No model.
- An eval gate in GitHub Actions: a narrow OIDC role allowed only the Nova model and the guardrail; runs the rubric Vitest plus 20 prompt cases scored by code first and a Nova judge second; at most 15 runs a month; writes trace JSON to `app/web/src/content/lab/evals/`.
- `/lab/evals/` renders the committed traces, including real failed runs; staged failures are labelled "staged". Its page order: header, latest run summary, run history, method note.

## Data and privacy

| Data                             | Where                            | How long                              |
| -------------------------------- | -------------------------------- | ------------------------------------- |
| Step names and answers           | Browser memory                   | Until the tab closes                  |
| Results sent to the contact page | URL fragment, cleared on arrival | Until cleared; never sent to a server |
| Contact message                  | Owner's email only               | Owner's mail policy                   |
| Daily counters                   | DynamoDB                         | 7 days                                |
| Feedback marks (enum only)       | DynamoDB                         | 90 days                               |
| Function logs (metadata)         | CloudWatch Logs                  | 3 days                                |
| Race examples and argue text     | Lambda memory only               | The request                           |

## Costs and capacity

From the panel document section 3.7, with Nova and Guardrails prices verified.

- Expected at an assumed 3,000 visitors a month: about 1.33 USD a month for phases 2 and 3; phases 0 and 1 are near zero.
- Worst case bounded by caps: about 12.0 USD a month for the lab, plus about 1.80 USD per 10 million raw POSTs that reach Lambda before the counter rejects them.
- The account budget is 25 USD a month and also covers the mail stack; check the combined worst case before phase 2 ships.

## Testing and quality gates

Every task runs `pnpm -F web exec tsc --noEmit`, `pnpm -F web lint` and `pnpm -F web test:run`; `app/api` tasks run the same three for that package; infra tasks run `terraform fmt -check`, `terraform validate`, tflint and trivy as in `ci.yml`. Phase gates add the Playwright chromium project, axe and budgets. Handlers are unit-tested with `aws-sdk-client-mock`; no test calls real AWS.

## Dependencies and order

0. Phase 0 and "Send us this result" do not go live until a test reply from a `@mccorlabs.com` mailbox reaches an outside address (hole 1: SES sandbox, production access denied).
1. Phase 0 before "Send us this result" posts; until then it falls back to mailto.
2. Phase 1 needs nothing in AWS.
3. Phase 2 needs phase 0's `/api/*` wiring, the spend brake, the recorded trace, and owner-approved privacy text.
4. Phase 3 needs phase 2.
5. Before phase 2, confirm the US inference profile `us.amazon.nova-2-lite-v1:0` is active in the account (`aws bedrock list-inference-profiles --region us-east-1`), and pick a successor before its end of life, no sooner than 2026-12-02.

## Out of scope

- Fixing the other holes in `docs/plans/open-work.md` (client claims, team-size copy, `TODO(owner)` legal strings, home page speed, enforcing the CSP). Hole 1 and hole 2 gate parts of this work as noted above.
- Streaming responses, per-visitor rate limits, AWS WAF, analytics, new design tokens.

## Token gap (report only)

The theme has no semantic status tokens and no hue clearly apart from the warm brand and accent pair. The verdict table works around this with marker shapes. A cool hue for "a simple program" would be a new-token request for the owner.

## UNVERIFIED

- Lambda Function URL plus CloudFront OAC for POST needs the `x-amz-content-sha256` header from the browser; confirm against current AWS docs in the first phase 0 task.
- Whether the account allows reserved concurrency 2.
- Nova 2 Lite end-of-life date. The model ID and US inference profile are confirmed in the phase 2 plan from the Bedrock user guide.
- Guardrails prompt-attack billing sits inside the content filter charge (from an AWS blog, not the reference).
- The 3,000-visitor assumption; the site keeps no analytics.
- Contrast ratios quoted by the visual reviewer (border on surface 1.17:1, border-strong 3.63:1, brand on elevated 4.98:1) come from its script; the plan's contrast test re-measures them.
