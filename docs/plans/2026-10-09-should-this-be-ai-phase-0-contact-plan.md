# Should This Be AI? Phase 0: Contact Backend Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to run this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

- Spec: `docs/plans/2026-10-09-should-this-be-ai-design.md` (section "Phase 0: contact backend", plus Rulings, Data and privacy, Testing and quality gates, Dependencies and order).
- Plan file: `docs/plans/2026-10-09-should-this-be-ai-phase-0-contact-plan.md`.
- Branches: `feat/contact-backend` from main for P0-T1 to P0-T19 (backend ships dark). `feat/contact-go-live` from main after P0-T21 for P0-T22 to P0-T25 (endpoint flip and privacy text).
- Persona: principal engineer (Next.js 16 static export, TypeScript on AWS Lambda, Terraform for CloudFront, Lambda, DynamoDB and SES).
- Goal: the existing contact form posts to `/api/contact` on the same CloudFront distribution. A Lambda behind a Function URL with OAC checks the form, takes one unit from a daily DynamoDB counter, and emails the owner through SES. Nothing stores the message.
- Architecture: new pnpm workspace `app/api` (package `api`) bundled by esbuild into `dist/contact.zip`. New Terraform module `infra/modules/lab_api` (table, role, log group, function, Function URL). `infra/modules/static_site` gains Lambda origins and `/api/*` cache behaviors. The browser signs nothing; it sends the SHA-256 of the body in `x-amz-content-sha256`, and CloudFront OAC signs the origin request.
- Tech stack: Node 24, TypeScript 5, Vitest 5, esbuild 0.28.2, AWS SDK v3 (`client-dynamodb`, `lib-dynamodb`, `client-sesv2`), `aws-sdk-client-mock`, Terraform 1.16.1 with hashicorp/aws (locked 6.66.0), GitHub Actions.

Each task is marked OWNER, laptop (an agent on the owner's machine) or CI. Each laptop task ends in a verification and a commit that stages only the paths it names. Nothing is pushed by an agent. Run every shell block in bash.

## Global Constraints

- No code comments in any file written. Exempt: tool directives (`@vitest-environment`, `eslint-disable`, `use client`, shebangs).
- No color values typed anywhere. Phase 0 adds no styling; reuse existing classes only.
- No backup files. Git holds prior state.
- Never modify a test to make buggy code pass. Tests change only where this plan changes the contract, and each such change is listed in the task.
- Re-read every file right before editing it.
- No new packages beyond the owner-approved list (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-sesv2`, `esbuild`, `aws-sdk-client-mock`). `typescript`, `vitest` and `@types/node` are already in the workspace and are reused at the same ranges.
- `pnpm-workspace.yaml` stays unchanged, including `allowBuilds: esbuild: false`.
- No test calls real AWS. Handlers are tested with `aws-sdk-client-mock`.
- Handlers log metadata only: outcome, reference, counter value, error name. Never a name, email address, company, budget or message.
- Per task gates: web tasks run `pnpm -F web exec tsc --noEmit`, `pnpm -F web lint`, `pnpm -F web test:run`; api tasks run `pnpm -F api exec tsc --noEmit`, `pnpm -F api lint`, `pnpm -F api test:run`; every code task runs `pnpm format:check`; infra tasks run `terraform fmt -check -recursive infra`, `terraform -chdir=infra validate`, `tflint` and `trivy` as in `ci.yml`.

## Review Focus

1. OAC on a Lambda Function URL rejects POST without `x-amz-content-sha256`; the hash must be of the exact bytes sent (P0-T9, P0-T20).
2. The cap is a conditional UpdateItem; a race between two requests can never send email 51 (P0-T4).
3. IAM: the function can only UpdateItem `contact#*` keys and only `ses:SendEmail` from one address on the `mccorlabs.com` identity (P0-T13).
4. The form goes live only after the SES launch gate and the approved privacy text, in one release (P0-T21 to P0-T25).
5. Zips are byte-identical across builds, so CI applies do not redeploy an unchanged function (P0-T8, P0-T17).

## Rulings

- Ruling: Lambda runtime `nodejs24.x`, arm64. AWS docs (Lambda runtimes table, read 2026-10-09) list `nodejs24.x` as supported on Amazon Linux 2023 with deprecation Apr 30, 2028; `nodejs26.x` is public preview. This matches `engines.node >=24` (`package.json:8`) and the CI Node 24 setup. The spec text says Node 22; this ruling supersedes it (cost if wrong: one string in `infra/modules/lab_api/main.tf` and the esbuild `target`).
- Ruling: `allowBuilds: esbuild: false` stays. esbuild 0.28.2 locates its binary in the `@esbuild/<platform>` optional package without its postinstall. Verified on this laptop: `node node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild --version` printed `0.28.2`, and a transform of `export const a = 1` succeeded. `app/api` pins `esbuild@0.28.2`, the version already in `pnpm-lock.yaml` (cost if wrong: the build fails loudly; set `esbuild: true` in `allowBuilds` after asking the owner).
- Ruling: zips are deterministic: fixed mtime 2000-01-01T00:00:00Z, mode 0644, `zip -X -j`, `TZ=UTC`. In CI the `build` job of `deploy.yml` runs `pnpm -F api build` and uploads artifact `api`; the `terraform` job downloads it into `app/api/dist` before `plan`. `ci.yml`'s terraform job builds the zips before `validate`. On the laptop, `pnpm -F api build` runs before `validate`, `terraform test` and `plan` (cost if wrong: after 24 h the `api` artifact expires like `site`, so "Re-run failed jobs" fails and a full `workflow_dispatch` is needed).
- Ruling: SES scope is `ses:SendEmail` only, on the `mccorlabs.com` domain identity ARN (new output `ses_identity_arn` from `modules/mailserver`), with `ses:FromAddress` equal to `CONTACT_FROM`. No `SendRawEmail`, no `*` (cost if wrong: if SES also authorizes the sandbox recipient identity, P0-T20 shows `AccessDenied` in the logs; add `identity/<CONTACT_TO>` to the resources).
- Ruling: handler env vars are `TABLE_NAME` (`mccorlabs-lab`), `CONTACT_DAILY_CAP` (`50`, the module default), `CONTACT_FROM` (`website@<domain_name>`), `CONTACT_TO` (`<admin_mailbox>@<domain_name>`). `TABLE_NAME` is not prefixed because phases 2 and 3 share the table (cost if wrong: one rename across module and handler).
- Ruling: a filled honeypot returns 200 with a reference and does nothing else (no counter unit, no email), as the privacy text already says "we discard the submission" (`legal.ts:59`). A form sent under 3,000 ms returns 400 `{"reason":"too_fast"}`; the client maps it to `ContactError` `too_fast`, shows `ui.formErrorTooFast` and keeps the fields (cost if wrong: a very fast human must press Send once more; bots learn nothing from the honeypot).
- Ruling: for `daily_cap` and `server` errors the status line renders the contact address as a `mailto:` link whose subject is `ui.formMailtoSubject` and whose body is the visitor's current message, capped by `contactMailtoHref` at 1,500 encoded characters (the same cap as phase 1's `labMailtoHref`), cutting whole code points from the end and appending `…` when anything was cut. Phase 0 defines its own helper because phase 1 may merge later (cost if wrong: a second mailto helper; phase 1 can switch either to the other after both merge).
- Ruling: `static_site` grants both `lambda:InvokeFunctionUrl` (with `function_url_auth_type = "AWS_IAM"`) and `lambda:InvokeFunction` (with `invoked_via_function_url = true`) to `cloudfront.amazonaws.com`, scoped by the distribution `source_arn`. The current CloudFront guide shows both `add-permission` commands. Both arguments exist in the locked provider 6.66.0 (checked with `terraform providers schema -json`). Because `api_origins` carries no function identity, `static_site` also gains `api_function_arns` (map(string), default `{}`), keyed by a static name so `for_each` keys are known at plan (cost if wrong: one extra harmless permission, or without it every call returns 403).
- Ruling: `module "lab_api"` has `count = local.has_domain ? 1 : 0`, like `module "mailserver"` (`infra/main.tf:31-33`), because it needs the SES identity. Root wiring uses `try(module.lab_api[0].api_origins, [])` and `try(module.lab_api[0].function_arns, {})` (cost if wrong: no API on a no-domain deploy, which has no mail either).
- Ruling: validation rules are duplicated in `app/api/src/lib/contactInput.ts` (name 1 to 100, email regex, company up to 100, message 10 to 5,000 after trim) rather than shared through a new package; the api tests mirror the web cases in `app/web/src/lib/contact.test.ts:15-43` (cost if wrong: rule drift makes the server reject input the browser accepted; the client shows the validation message).
- Ruling: the AWS SDK is bundled into the zip, not taken from the runtime, so the lockfile pins it (cost if wrong: a larger zip and about 100 ms more cold start).
- Ruling: no reserved concurrency in phase 0. The counter bounds email; Lambda invocations are bounded only by the account limit (cost if wrong: a flood costs about 1.80 USD per 10 million requests, per the spec's Costs section).
- Ruling: `app/api/src/lib/http.ts` defines minimal `LambdaFunctionURLEvent` and `LambdaFunctionURLResult` interfaces instead of adding `@types/aws-lambda`, which is not on the approved list (cost if wrong: a field the handler reads drifts from the real event shape; the owner can approve `@types/aws-lambda`).
- Ruling: release in two steps. Merge 1 ships backend, infra and client code while `NEXT_PUBLIC_CONTACT_ENDPOINT` is unset, so the form still shows the mailto fallback (`ContactForm.tsx:22-34`). Merge 2 sets the endpoint and the privacy text after the SES launch gate (cost if wrong: two deploys instead of one).
- Ruling: `ui.formSuccess` drops "we will reply within one working day" and shows the reference instead. The owner decides in P0-T25 whether to restore a reply-time promise once the SES gate has passed (cost if wrong: less reassurance until the owner restores a reply-time promise after the launch gate).
- Ruling: contact claims check. `app/web/src/content/ui.test.ts` runs phase 1's shared `assertNoClaims` over `formErrorTooFast`, `formErrorDailyCap`, `formErrorServer` and `formSuccess`. Phase 0 may merge before phase 1, so the test lands in P0-T11 when `app/web/src/test/noClaims.ts` exists, else in P0-T22 Step 0; phase 0 never creates `noClaims.ts` (cost if wrong: the contact strings ship unchecked until phase 1 merges).
- Ruling: the distribution-wide `custom_error_response` for 403 and 404 (`static_site/main.tf:125-137`) also applies to `/api/*`. The handler never returns 403 or 404, so an OAC or permission failure reaches the browser as the 404 page (cost if wrong: harder debugging; check the Lambda log group and CloudFront, not the page).
- Ruling: API behaviors use `viewer_protocol_policy = "https-only"`, because a redirect drops a POST body, and attach the existing security headers policy (cost if wrong: an http POST gets 403 instead of a redirect).
- Ruling: the path pattern is the exact `/api/contact`, not `/api/*`, so each phase adds its own behavior and unknown `/api/` paths fall to S3 and the 404 page (cost if wrong: one more behavior per endpoint).
- Ruling: `parseJsonBody<T>` keeps the shared signature, so it carries one `eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters` directive (cost if wrong: none; the directive is a tool directive and exempt).
- Ruling: `env.ts` accepts a root-relative endpoint such as `/api/contact`; today `optionalUrl` throws on it (`app/web/src/lib/env.ts:15-23`) (cost if wrong: none found; protocol-relative `//host` stays rejected).
- Ruling: the counter IAM statement is limited with `dynamodb:LeadingKeys` `contact#*` (cost if wrong: phase 2 adds its own statement for its keys).
- Ruling: no Playwright test for the live form. The e2e build has no endpoint, and the owner's live check in P0-T25 covers the path (cost if wrong: a regression in the live path shows only in production).
- Ruling: lefthook and the root `verify` script are not changed for `app/api`; CI runs the api gates (cost if wrong: api lint errors show at CI, not pre-push). Propose a lefthook change to the owner separately.

## UNVERIFIED

- Whether SES v2 `SendEmail` in the sandbox also authorizes against the recipient identity ARN. P0-T20 shows it.
- Whether trivy flags HIGH on the `:*` log-stream resource or the new table. If it does, P0-T16 adds a scoped entry in `.trivyignore.yaml` with a statement, as the repo does for other modules.
- Whether tflint's aws ruleset 0.44.0 accepts `nodejs24.x` without a warning.
- Whether `op run` passes a plain (non-`op://`) value such as `NEXT_PUBLIC_CONTACT_ENDPOINT="/api/contact"` through from `app.env` unchanged. P0-T24 checks it.
- Whether `var.admin_mailbox` is the owner's own mailbox (`marcm`, per `site.ts:7`). The owner confirms in P0-T18.
- Whether `AllViewerExceptHostHeader` forwards `x-amz-content-sha256` to the origin so OAC can sign it. The CloudFront guide's POST example implies it; P0-T20 proves it.
- Whether a Function URL delivers `application/json` bodies with `isBase64Encoded: false`. `parseJsonBody` handles both.
- Whether Info-ZIP on macOS and on the Linux runner produce the same bytes. Only CI zips are applied, so a laptop/CI difference shows as one function update after a laptop break-glass apply.
- Whether `terraform validate` reads `filebase64sha256` files. The plan avoids the question by always building first.
- The DynamoDB update expression order `SET ... ADD ...` is valid. P0-T4's tests cannot prove it (mocked); P0-T20 does.

## File Structure

```
app/api/
  package.json                  P0-T2   workspace package "api"
  tsconfig.json                 P0-T2
  vitest.config.ts              P0-T2
  scripts/build.mjs             P0-T8   esbuild bundle + deterministic zip per handler
  src/lib/http.ts(+test)        P0-T2   json(), parseJsonBody(), Function URL types
  src/lib/counter.ts(+test)     P0-T4   takeUnit()
  src/lib/contactInput.ts(+test) P0-T5  checkContact(): ok | spam | invalid
  src/lib/mail.ts(+test)        P0-T6   ownerEmailText(), sendOwnerEmail()
  src/handlers/contact.ts(+test) P0-T7  handler, readConfig()
app/web/src/
  lib/signedPost.ts(+test)      P0-T9   signedPostJson()
  lib/contact.ts(+test)         P0-T10  submitContact via signedPostJson, daily_cap, too_fast, reference, elapsedMs, contactMailtoHref
  components/contact/ContactForm.tsx(+test) P0-T11
  content/ui.ts                 P0-T11  formSuccess, formReference, formErrorDailyCap, formErrorTooFast, formErrorServer, formMailtoSubject
  content/ui.test.ts            P0-T11 or P0-T22  assertNoClaims over the new contact strings
  lib/env.ts(+test)             P0-T12  root-relative endpoint
  content/legal.ts(+legal.test.ts) P0-T22 privacy text
infra/
  modules/lab_api/{main,variables,outputs}.tf, tests/lab_api.tftest.hcl  P0-T13, P0-T14
  modules/static_site/{main,variables}.tf, tests/static_site.tftest.hcl  P0-T15
  modules/mailserver/outputs.tf P0-T16  ses_identity_arn
  main.tf                       P0-T16  module "lab_api", site wiring
.github/workflows/{ci,deploy}.yml P0-T17
eslint.config.ts, .gitignore, .prettierignore, pnpm-lock.yaml  P0-T2
app.env                         P0-T24  NEXT_PUBLIC_CONTACT_ENDPOINT
```

## Tasks

### P0-T1 laptop: confirm the AWS contract against current docs

Files: this plan only (Outcome lines below).
Interfaces: Consumes nothing. Produces the confirmed contract every later task relies on.

Pre-check by the plan author on 2026-10-09 (AWS knowledge MCP and terraform-registry MCP):

- CloudFront guide "Restrict access to an AWS Lambda function URL origin" (`https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-lambda.html`): "If you use `PUT` or `POST` methods with your Lambda function URL, your users must compute the SHA256 of the body and include the payload hash value of the request body in the `x-amz-content-sha256` header when sending the request to CloudFront. Lambda doesn't support unsigned payloads." Confirmed.
- Same page: the Function URL must use `AuthType` `AWS_IAM`; OAC origin type `lambda`, signing `always`, protocol `sigv4`; two permissions for `cloudfront.amazonaws.com` with the distribution `source-arn`: `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction`. The second one is new relative to the shared names; see Rulings.
- Lambda runtimes page: `nodejs24.x` supported, deprecation Apr 30, 2028; `nodejs26.x` preview.
- hashicorp/aws `aws_lambda_permission`: `function_url_auth_type` (only with `lambda:InvokeFunctionUrl`) and `invoked_via_function_url` (only with `lambda:InvokeFunction`); both present in locked 6.66.0.

- [x] Step 1: Load `aws___search_documentation` and `aws___read_documentation` through ToolSearch. Re-read the CloudFront page above and the Lambda runtimes page (`https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html`).
- [x] Step 2: Search "SES IAM ses:SendEmail sandbox recipient identity authorization" and record whether the recipient identity needs IAM permission.
- [x] Step 3: Run `terraform -chdir=infra providers schema -json | jq -r '.provider_schemas["registry.terraform.io/hashicorp/aws"].resource_schemas.aws_lambda_permission.block.attributes | keys | join(",")'`. Expected output contains `function_url_auth_type` and `invoked_via_function_url`.
- [x] Step 4: Fill the Outcome lines. If any fact differs from the pre-check, stop and report to the owner before P0-T2.

Outcome (sha256 header): confirmed 2026-10-09. The CloudFront guide page still says that for `PUT` or `POST` the viewer must send the SHA256 of the body in `x-amz-content-sha256` to CloudFront and that "Lambda doesn't support unsigned payloads". Its example hashes the exact body bytes with `hashlib.sha256(body).hexdigest()` (lowercase hex) and sends the same bytes.
Outcome (permissions): confirmed 2026-10-09. Function URL `AuthType` must be `AWS_IAM`. OAC: origin type `lambda`, `SigningBehavior: always`, `SigningProtocol: sigv4`; origin protocol HTTPS only. The guide shows two `aws lambda add-permission` commands for principal `cloudfront.amazonaws.com` with the distribution `--source-arn`: statement `AllowCloudFrontServicePrincipal` with action `lambda:InvokeFunctionUrl`, and `AllowCloudFrontServicePrincipalInvokeFunction` with action `lambda:InvokeFunction`. `terraform -chdir=infra providers schema -json` (locked hashicorp/aws 6.66.0) prints `action,event_source_token,function_name,function_url_auth_type,id,invoked_via_function_url,principal,principal_org_id,qualifier,region,source_account,source_arn,statement_id,statement_id_prefix`, which contains both `function_url_auth_type` and `invoked_via_function_url`. The registry MCP lists 6.68.0 as latest; the plan stays on the locked 6.66.0.
Outcome (runtime): confirmed 2026-10-09. The Lambda runtimes table lists `nodejs24.x` on Amazon Linux 2023 with deprecation Apr 30, 2028 (block create Jun 1, 2028, block update Jul 1, 2028). `nodejs26.x` is public preview with no schedule, and the page says preview runtimes "should not be used for production workloads". The page says all supported runtimes support x86_64 and arm64, and recommends bundling the SDK modules in the deployment package.
Outcome (SES sandbox recipient auth): not proven by docs; stays under UNVERIFIED and P0-T20. The SES IAM guide (`https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html`) says to restrict the identities a user may send from, set `Resource` to the ARNs of those identities, and treats recipients only as the condition key `ses:Recipients`. The Service Authorization Reference for SES lists `SendEmail` resource types `identity*`, `configuration-set` and `template`, with no recipient resource type. No page read says that the sandbox adds an IAM check on the recipient identity ARN; the sandbox pages only say the recipient must be a verified identity in the account. The Ruling on SES scope stands, with the `identity/<CONTACT_TO>` fallback if P0-T20 shows `AccessDenied`.
Outcome (Function URL OAC and POST): confirmed by the sha256 header and permissions outcomes above; whether `AllViewerExceptHostHeader` forwards `x-amz-content-sha256` is not stated on the page and stays UNVERIFIED until P0-T20. Behavior needs `allowed_methods` to include `POST` (all seven methods), and `viewer_protocol_policy = "https-only"` per the Ruling.
Outcome (viewer-request function and `/api/*`): the docs say a CloudFront Function is associated with "one or more cache behaviors" (`https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/associate-function.html`), and the aws provider schema shows `function_association` is a block of `ordered_cache_behavior`, so an ordered behavior without that block does not run `viewer_request`. It must stay off the API behavior: `infra/modules/static_site/viewer_request.js.tftpl` returns a 301 to `<uri>/` when the last path segment has no `.` (`needsSlash`), which would turn `POST /api/contact` into a body-less GET on `/api/contact/`, and it also redirects on any host that is not `PRIMARY_HOST`. P0-T15's `ordered_cache_behavior` block (task-15 brief) correctly has none.
Outcome (distribution-wide 403/404 rewrite): CloudFront custom error responses are configured only on the distribution (`CustomErrorResponses` in the distribution config; the aws provider schema lists `custom_error_response` as a top-level block of `aws_cloudfront_distribution` and `ordered_cache_behavior` has only `forwarded_values,function_association,grpc_config,lambda_function_association` blocks). The docs describe the rewrite as keyed on the status code the origin returns, and the error page is fetched through the behavior whose path pattern matches `ResponsePagePath` (`/404.html`, which falls to the default S3 behavior). CloudFront has no per-behavior opt-out, so a 403 or 404 from the Function URL (OAC or permission failure) reaches the browser as the 404 page with status 404 and a 10 s cache. Accepted by the Ruling on the distribution-wide `custom_error_response` (Rulings, `Ruling: the distribution-wide custom_error_response for 403 and 404`). Other codes (400, 429, 500, 502, 504) are not configured and pass through.

Ruling: no `function_association` on the `/api/contact` ordered behavior, so the viewer-request function never runs on API paths (cost if wrong: every POST to `/api/contact` would get a 301 to `/api/contact/`, the browser would resend it as a GET without a body, and the form would fail; P0-T15's behavior block has no `function_association` and no test asserts its absence, so review must keep it that way).

- [ ] Step 5: Commit.

```bash
git add docs/plans/2026-10-09-should-this-be-ai-phase-0-contact-plan.md
git commit -m "docs(plan): record AWS contract check for phase 0 contact backend"
```

### P0-T2 laptop: scaffold the `api` workspace with `http.ts`

Files:

- Create: `app/api/package.json`, `app/api/tsconfig.json`, `app/api/vitest.config.ts`, `app/api/src/lib/http.ts`, `app/api/src/lib/http.test.ts`.
- Edit: `eslint.config.ts` (ignores plus one typed block), `.gitignore` (`app/api/dist/`), `.prettierignore` (`app/api/dist/`), `pnpm-lock.yaml` (by pnpm).

Interfaces: Produces `json(status: number, body: unknown): LambdaFunctionURLResult`, `parseJsonBody<T>(event: LambdaFunctionURLEvent, maxBytes: number): T | null`, and the two interfaces.

- [ ] Step 1: Create `app/api/package.json`.

```json
{
  "name": "api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node scripts/build.mjs",
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

- [ ] Step 2: Install dependencies.

```bash
pnpm -F api add @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-sesv2
pnpm -F api add -D esbuild@0.28.2 aws-sdk-client-mock typescript@^5 vitest@^5 @types/node@^22
git diff --stat pnpm-workspace.yaml
```

Expected: both installs succeed with no prompt about build scripts; `git diff --stat pnpm-workspace.yaml` prints nothing.

- [ ] Step 3: Create `app/api/tsconfig.json`.

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "vitest.config.ts"]
}
```

- [ ] Step 4: Create `app/api/vitest.config.ts`.

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] Step 5: Edit `eslint.config.ts`. Add `'app/api/dist/**'` to the top-level `ignores` list after `'app/web/out/**'`. Add this block right after the existing `app/web/**/*.{ts,tsx}` typed block:

```ts
  {
    files: ['app/api/**/*.ts'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: join(import.meta.dirname, 'app/api'),
      },
    },
  },
```

Add `app/api/dist/` on its own line to `.gitignore` (after `app/web/out/`) and to `.prettierignore` (after `app/web/out/`).

- [ ] Step 6: Write the failing test `app/api/src/lib/http.test.ts`.

```ts
import { describe, expect, it } from 'vitest'
import { json, parseJsonBody, type LambdaFunctionURLEvent } from './http'

function event(
  body: string | undefined,
  isBase64Encoded = false,
): LambdaFunctionURLEvent {
  return { body, isBase64Encoded, requestContext: { http: { method: 'POST' } } }
}

describe('json', () => {
  it('serialises the body with a JSON content type and no caching', () => {
    expect(json(429, { reason: 'daily_cap' })).toEqual({
      statusCode: 429,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: '{"reason":"daily_cap"}',
    })
  })
})

describe('parseJsonBody', () => {
  it('parses a plain JSON body', () => {
    expect(parseJsonBody(event('{"a":1}'), 100)).toEqual({ a: 1 })
  })

  it('decodes a base64 body first', () => {
    const encoded = Buffer.from('{"a":1}', 'utf8').toString('base64')
    expect(parseJsonBody(event(encoded, true), 100)).toEqual({ a: 1 })
  })

  it('returns null for a missing body', () => {
    expect(parseJsonBody(event(undefined), 100)).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    expect(parseJsonBody(event('{"a":'), 100)).toBeNull()
  })

  it('returns null when the body is over the byte limit', () => {
    expect(parseJsonBody(event(JSON.stringify({ a: 'é'.repeat(10) })), 20)).toBeNull()
  })
})
```

- [ ] Step 7: Run `pnpm -F api test:run`. Expected: FAIL, `Failed to resolve import "./http"`.
- [ ] Step 8: Implement `app/api/src/lib/http.ts`.

```ts
export interface LambdaFunctionURLEvent {
  body?: string
  isBase64Encoded: boolean
  requestContext: { http: { method: string } }
}

export interface LambdaFunctionURLResult {
  statusCode: number
  headers: Record<string, string>
  body: string
}

export function json(status: number, body: unknown): LambdaFunctionURLResult {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  }
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function parseJsonBody<T>(
  event: LambdaFunctionURLEvent,
  maxBytes: number,
): T | null {
  if (event.body === undefined || event.body === '') return null
  const raw = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
  if (raw.byteLength > maxBytes) return null
  try {
    return JSON.parse(raw.toString('utf8')) as T
  } catch {
    return null
  }
}
```

If lint reports the directive as unused, delete the directive line; do not add any other comment.

- [ ] Step 9: Run the gates.

```bash
pnpm -F api test:run
pnpm -F api exec tsc --noEmit
pnpm -F api lint
pnpm -F web lint
pnpm format:check
```

Expected: 6 tests pass; tsc, both lints and the format check exit 0.

- [ ] Step 10: Commit.

```bash
git add app/api/package.json app/api/tsconfig.json app/api/vitest.config.ts app/api/src/lib/http.ts app/api/src/lib/http.test.ts eslint.config.ts .gitignore .prettierignore pnpm-lock.yaml
git commit -m "feat(api): add api workspace with Function URL JSON helpers"
```

### P0-T3 laptop: confirm the api toolchain in a clean install

Files: none changed (verification only; no commit).
Interfaces: Consumes P0-T2. Produces evidence that a frozen install works, as CI runs it.

- [ ] Step 1: Run `pnpm install --frozen-lockfile`. Expected: exit 0, "Lockfile is up to date".
- [ ] Step 2: Run `pnpm -F api exec esbuild --version`. Expected: `0.28.2`.
- [ ] Step 3: Run `pnpm -F web test:run`. Expected: all existing web tests pass (the workspace change touched nothing in web).
- [ ] Step 4: No commit. If Step 1 fails, return to P0-T2 Step 2.

### P0-T4 laptop: `takeUnit` daily counter

Files: Create `app/api/src/lib/counter.ts`, `app/api/src/lib/counter.test.ts`.
Interfaces: Produces `takeUnit(params: {client: DynamoDBDocumentClient; table: string; key: string; cap: number; ttlDays: number; now: Date}): Promise<{ok: boolean; used: number; remaining: number}>`.

- [ ] Step 1: Write the failing test.

```ts
import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { takeUnit } from './counter'

const ddb = mockClient(DynamoDBDocumentClient)
const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }))
const now = new Date('2026-10-09T12:00:00Z')
const params = {
  client,
  table: 'mccorlabs-lab',
  key: 'contact#2026-10-09',
  cap: 50,
  ttlDays: 7,
  now,
}

beforeEach(() => {
  ddb.reset()
})

describe('takeUnit', () => {
  it('takes a unit and reports what is left', async () => {
    ddb.on(UpdateCommand).resolves({ Attributes: { used: 3 } })
    expect(await takeUnit(params)).toEqual({ ok: true, used: 3, remaining: 47 })
  })

  it('sends one conditional update capped below the limit with a 7-day expiry', async () => {
    ddb.on(UpdateCommand).resolves({ Attributes: { used: 1 } })
    await takeUnit(params)
    const input = ddb.commandCalls(UpdateCommand)[0]?.args[0].input
    expect(input?.TableName).toBe('mccorlabs-lab')
    expect(input?.Key).toEqual({ pk: 'contact#2026-10-09' })
    expect(input?.ConditionExpression).toBe('attribute_not_exists(#used) OR #used < :cap')
    expect(input?.ExpressionAttributeValues).toEqual({
      ':one': 1,
      ':cap': 50,
      ':expiresAt': Math.floor(now.getTime() / 1000) + 7 * 86_400,
    })
  })

  it('refuses when the cap is reached', async () => {
    ddb
      .on(UpdateCommand)
      .rejects(new ConditionalCheckFailedException({ message: 'full', $metadata: {} }))
    expect(await takeUnit(params)).toEqual({ ok: false, used: 50, remaining: 0 })
  })

  it('rethrows any other failure', async () => {
    ddb.on(UpdateCommand).rejects(new Error('throttled'))
    await expect(takeUnit(params)).rejects.toThrow('throttled')
  })
})
```

- [ ] Step 2: Run `pnpm -F api test:run src/lib/counter.test.ts`. Expected: FAIL, cannot resolve `./counter`.
- [ ] Step 3: Implement `app/api/src/lib/counter.ts`.

```ts
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import { UpdateCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const DAY_SECONDS = 86_400

export interface TakeUnitParams {
  client: DynamoDBDocumentClient
  table: string
  key: string
  cap: number
  ttlDays: number
  now: Date
}

export interface TakeUnitResult {
  ok: boolean
  used: number
  remaining: number
}

export async function takeUnit(params: TakeUnitParams): Promise<TakeUnitResult> {
  const { client, table, key, cap, ttlDays, now } = params
  const expiresAt = Math.floor(now.getTime() / 1000) + ttlDays * DAY_SECONDS
  try {
    const result = await client.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk: key },
        UpdateExpression:
          'SET #expiresAt = if_not_exists(#expiresAt, :expiresAt) ADD #used :one',
        ConditionExpression: 'attribute_not_exists(#used) OR #used < :cap',
        ExpressionAttributeNames: { '#used': 'used', '#expiresAt': 'expiresAt' },
        ExpressionAttributeValues: { ':one': 1, ':cap': cap, ':expiresAt': expiresAt },
        ReturnValues: 'UPDATED_NEW',
      }),
    )
    const used = Number(result.Attributes?.used ?? 0)
    return { ok: true, used, remaining: Math.max(cap - used, 0) }
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return { ok: false, used: cap, remaining: 0 }
    }
    throw error
  }
}
```

- [ ] Step 4: Run `pnpm -F api test:run && pnpm -F api exec tsc --noEmit && pnpm -F api lint && pnpm format:check`. Expected: 10 tests pass; all exit 0.
- [ ] Step 5: Commit.

```bash
git add app/api/src/lib/counter.ts app/api/src/lib/counter.test.ts
git commit -m "feat(api): add conditional daily counter takeUnit"
```

### P0-T5 laptop: contact input check

Files: Create `app/api/src/lib/contactInput.ts`, `app/api/src/lib/contactInput.test.ts`.
Interfaces: Produces `checkContact(body: unknown): ContactCheck`, `ContactInput`, `MIN_FILL_MS = 3000`.

- [ ] Step 1: Write the failing test.

```ts
import { describe, expect, it } from 'vitest'
import { checkContact } from './contactInput'

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: '',
  budget: '',
  message: 'We need a marketing site and a client portal.',
  honeypot: '',
  elapsedMs: 5000,
}

describe('checkContact', () => {
  it('accepts a well-formed submission and trims it', () => {
    expect(checkContact({ ...valid, name: '  Ada Lovelace ' })).toEqual({
      kind: 'ok',
      value: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        company: '',
        budget: '',
        message: 'We need a marketing site and a client portal.',
      },
    })
  })

  it('treats a filled honeypot as spam before any other check', () => {
    expect(checkContact({ ...valid, honeypot: 'bot', elapsedMs: 1 })).toEqual({
      kind: 'spam',
    })
  })

  it('rejects a form sent in under 3 seconds', () => {
    expect(checkContact({ ...valid, elapsedMs: 2999 })).toEqual({
      kind: 'invalid',
      reason: 'too_fast',
    })
  })

  it.each([
    ['a non-object body', null],
    ['an array body', []],
    ['a missing elapsedMs', { ...valid, elapsedMs: undefined }],
    ['a non-string name', { ...valid, name: 5 }],
    ['an empty name', { ...valid, name: '   ' }],
    ['a name over 100 characters', { ...valid, name: 'x'.repeat(101) }],
    ['a malformed email', { ...valid, email: 'nope' }],
    ['an email with a line break', { ...valid, email: 'a@b.co\r\nBcc: x@y.z' }],
    ['a company over 100 characters', { ...valid, company: 'x'.repeat(101) }],
    ['a budget over 40 characters', { ...valid, budget: 'x'.repeat(41) }],
    ['a message under 10 characters', { ...valid, message: 'too short' }],
    ['a message over 5000 characters', { ...valid, message: 'x'.repeat(5001) }],
  ])('rejects %s', (_label, body) => {
    expect(checkContact(body)).toEqual({ kind: 'invalid', reason: 'validation' })
  })

  it('accepts a missing optional company and budget', () => {
    const { company: _company, budget: _budget, ...rest } = valid
    expect(checkContact(rest).kind).toBe('ok')
  })
})
```

- [ ] Step 2: Run `pnpm -F api test:run src/lib/contactInput.test.ts`. Expected: FAIL, cannot resolve `./contactInput`.
- [ ] Step 3: Implement `app/api/src/lib/contactInput.ts`.

```ts
export interface ContactInput {
  name: string
  email: string
  company: string
  budget: string
  message: string
}

export type ContactCheck =
  | { kind: 'ok'; value: ContactInput }
  | { kind: 'spam' }
  | { kind: 'invalid'; reason: 'validation' | 'too_fast' }

export const MIN_FILL_MS = 3000

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVALID: ContactCheck = { kind: 'invalid', reason: 'validation' }

function text(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  if (value === undefined) return ''
  return typeof value === 'string' ? value : null
}

function isValid(input: ContactInput): boolean {
  return (
    input.name.length >= 1 &&
    input.name.length <= 100 &&
    input.email.length <= 254 &&
    EMAIL.test(input.email) &&
    input.company.length <= 100 &&
    input.budget.length <= 40 &&
    input.message.length >= 10 &&
    input.message.length <= 5000
  )
}

export function checkContact(body: unknown): ContactCheck {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return INVALID
  const record = body as Record<string, unknown>
  const honeypot = text(record, 'honeypot')
  if (honeypot === null) return INVALID
  if (honeypot.trim() !== '') return { kind: 'spam' }

  const elapsed = record.elapsedMs
  if (typeof elapsed !== 'number' || !Number.isFinite(elapsed)) return INVALID
  if (elapsed < MIN_FILL_MS) return { kind: 'invalid', reason: 'too_fast' }

  const name = text(record, 'name')
  const email = text(record, 'email')
  const company = text(record, 'company')
  const budget = text(record, 'budget')
  const message = text(record, 'message')
  if (
    name === null ||
    email === null ||
    company === null ||
    budget === null ||
    message === null
  ) {
    return INVALID
  }

  const input: ContactInput = {
    name: name.trim(),
    email: email.trim(),
    company: company.trim(),
    budget: budget.trim(),
    message: message.trim(),
  }
  return isValid(input) ? { kind: 'ok', value: input } : INVALID
}
```

- [ ] Step 4: Run `pnpm -F api test:run && pnpm -F api exec tsc --noEmit && pnpm -F api lint && pnpm format:check`. Expected: all pass, exit 0.
- [ ] Step 5: Commit.

```bash
git add app/api/src/lib/contactInput.ts app/api/src/lib/contactInput.test.ts
git commit -m "feat(api): validate contact submissions with honeypot and fill-time checks"
```

### P0-T6 laptop: owner email through SES v2

Files: Create `app/api/src/lib/mail.ts`, `app/api/src/lib/mail.test.ts`.
Interfaces: Consumes `ContactInput` (P0-T5). Produces `ownerEmailText(input: ContactInput, reference: string): string` and `sendOwnerEmail(client: SESv2Client, email: {from: string; to: string; reference: string; input: ContactInput}): Promise<void>`.

- [ ] Step 1: Write the failing test.

```ts
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { ownerEmailText, sendOwnerEmail } from './mail'

const ses = mockClient(SESv2Client)
const input = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: '',
  budget: '$10k – $25k',
  message: 'We need a marketing site.',
}

beforeEach(() => {
  ses.reset()
})

describe('ownerEmailText', () => {
  it('lists every field and marks empty optional ones', () => {
    expect(ownerEmailText(input, 'AB12CD34')).toBe(
      [
        'Reference: AB12CD34',
        'Name: Ada Lovelace',
        'Email: ada@example.com',
        'Company: (not given)',
        'Budget: $10k – $25k',
        '',
        'We need a marketing site.',
      ].join('\n'),
    )
  })
})

describe('sendOwnerEmail', () => {
  it('sends one plain-text email to the owner with the visitor as reply-to', async () => {
    ses.on(SendEmailCommand).resolves({ MessageId: 'm-1' })
    await sendOwnerEmail(new SESv2Client({ region: 'us-east-1' }), {
      from: 'website@mccorlabs.com',
      to: 'owner@mccorlabs.com',
      reference: 'AB12CD34',
      input,
    })
    const sent = ses.commandCalls(SendEmailCommand)
    expect(sent).toHaveLength(1)
    const request = sent[0]?.args[0].input
    expect(request?.FromEmailAddress).toBe('website@mccorlabs.com')
    expect(request?.Destination).toEqual({ ToAddresses: ['owner@mccorlabs.com'] })
    expect(request?.ReplyToAddresses).toEqual(['ada@example.com'])
    expect(request?.Content?.Simple?.Subject?.Data).toBe('Website enquiry AB12CD34')
    expect(request?.Content?.Simple?.Body?.Text?.Data).toBe(
      ownerEmailText(input, 'AB12CD34'),
    )
    expect(request?.Content?.Simple?.Body?.Html).toBeUndefined()
  })

  it('propagates an SES failure', async () => {
    ses.on(SendEmailCommand).rejects(new Error('MessageRejected'))
    await expect(
      sendOwnerEmail(new SESv2Client({ region: 'us-east-1' }), {
        from: 'website@mccorlabs.com',
        to: 'owner@mccorlabs.com',
        reference: 'AB12CD34',
        input,
      }),
    ).rejects.toThrow('MessageRejected')
  })
})
```

- [ ] Step 2: Run `pnpm -F api test:run src/lib/mail.test.ts`. Expected: FAIL, cannot resolve `./mail`.
- [ ] Step 3: Implement `app/api/src/lib/mail.ts`.

```ts
import { SendEmailCommand, type SESv2Client } from '@aws-sdk/client-sesv2'
import type { ContactInput } from './contactInput'

export interface OwnerEmail {
  from: string
  to: string
  reference: string
  input: ContactInput
}

function orNotGiven(value: string): string {
  return value === '' ? '(not given)' : value
}

export function ownerEmailText(input: ContactInput, reference: string): string {
  return [
    `Reference: ${reference}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Company: ${orNotGiven(input.company)}`,
    `Budget: ${orNotGiven(input.budget)}`,
    '',
    input.message,
  ].join('\n')
}

export async function sendOwnerEmail(
  client: SESv2Client,
  email: OwnerEmail,
): Promise<void> {
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: email.from,
      Destination: { ToAddresses: [email.to] },
      ReplyToAddresses: [email.input.email],
      Content: {
        Simple: {
          Subject: { Data: `Website enquiry ${email.reference}`, Charset: 'UTF-8' },
          Body: {
            Text: {
              Data: ownerEmailText(email.input, email.reference),
              Charset: 'UTF-8',
            },
          },
        },
      },
    }),
  )
}
```

- [ ] Step 4: Run `pnpm -F api test:run && pnpm -F api exec tsc --noEmit && pnpm -F api lint && pnpm format:check`. Expected: all pass.
- [ ] Step 5: Commit.

```bash
git add app/api/src/lib/mail.ts app/api/src/lib/mail.test.ts
git commit -m "feat(api): send the owner a plain-text enquiry email through SES v2"
```

### P0-T7 laptop: contact handler

Files: Create `app/api/src/handlers/contact.ts`, `app/api/src/handlers/contact.test.ts`.
Interfaces: Consumes `json`, `parseJsonBody` (P0-T2), `takeUnit` (P0-T4), `checkContact` (P0-T5), `sendOwnerEmail` (P0-T6). Produces `handler(event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult>` and `readConfig(env: NodeJS.ProcessEnv)`. Responses: 200 `{ok: true, reference}`, 400 `{reason: 'validation' | 'too_fast'}`, 405 `{reason: 'method'}`, 429 `{reason: 'daily_cap'}`, 500 `{reason: 'server'}`.

- [ ] Step 1: Write the failing test.

```ts
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2'
import { mockClient } from 'aws-sdk-client-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LambdaFunctionURLEvent } from '../lib/http'
import { handler } from './contact'

const ddb = mockClient(DynamoDBDocumentClient)
const ses = mockClient(SESv2Client)

const form = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  budget: '',
  message: 'We need a marketing site and a client portal.',
  honeypot: '',
  elapsedMs: 5000,
}

function post(body: unknown, method = 'POST'): LambdaFunctionURLEvent {
  return {
    body: JSON.stringify(body),
    isBase64Encoded: false,
    requestContext: { http: { method } },
  }
}

beforeEach(() => {
  ddb.reset()
  ses.reset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-09T23:59:00Z'))
  vi.stubEnv('TABLE_NAME', 'mccorlabs-lab')
  vi.stubEnv('CONTACT_DAILY_CAP', '50')
  vi.stubEnv('CONTACT_FROM', 'website@mccorlabs.com')
  vi.stubEnv('CONTACT_TO', 'owner@mccorlabs.com')
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('contact handler', () => {
  it('refuses methods other than POST', async () => {
    expect((await handler(post(form, 'GET'))).statusCode).toBe(405)
  })

  it('returns 400 validation for malformed JSON', async () => {
    const result = await handler({ ...post(form), body: '{"name":' })
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body)).toEqual({ reason: 'validation' })
  })

  it('answers a filled honeypot with 200 and touches nothing', async () => {
    const result = await handler(post({ ...form, honeypot: 'bot' }))
    expect(result.statusCode).toBe(200)
    expect(ddb.commandCalls(UpdateCommand)).toHaveLength(0)
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(0)
  })

  it('returns 400 too_fast for a form sent in under 3 seconds', async () => {
    const result = await handler(post({ ...form, elapsedMs: 800 }))
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body)).toEqual({ reason: 'too_fast' })
    expect(ddb.commandCalls(UpdateCommand)).toHaveLength(0)
  })

  it('counts against the UTC day, emails the owner and returns a reference', async () => {
    ddb.on(UpdateCommand).resolves({ Attributes: { used: 1 } })
    ses.on(SendEmailCommand).resolves({ MessageId: 'm-1' })
    const result = await handler(post(form))
    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body) as { ok: boolean; reference: string }
    expect(body.ok).toBe(true)
    expect(body.reference).toMatch(/^[0-9A-F]{8}$/)
    expect(ddb.commandCalls(UpdateCommand)[0]?.args[0].input.Key).toEqual({
      pk: 'contact#2026-10-09',
    })
    expect(ses.commandCalls(SendEmailCommand)[0]?.args[0].input.Destination).toEqual({
      ToAddresses: ['owner@mccorlabs.com'],
    })
  })

  it('returns 429 daily_cap at the cap and sends no email', async () => {
    ddb
      .on(UpdateCommand)
      .rejects(new ConditionalCheckFailedException({ message: 'full', $metadata: {} }))
    const result = await handler(post(form))
    expect(result.statusCode).toBe(429)
    expect(JSON.parse(result.body)).toEqual({ reason: 'daily_cap' })
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(0)
  })

  it('returns 500 when SES fails', async () => {
    ddb.on(UpdateCommand).resolves({ Attributes: { used: 1 } })
    ses.on(SendEmailCommand).rejects(new Error('MessageRejected'))
    const result = await handler(post(form))
    expect(result.statusCode).toBe(500)
    expect(JSON.parse(result.body)).toEqual({ reason: 'server' })
  })

  it('returns 500 when configuration is missing', async () => {
    vi.stubEnv('CONTACT_TO', '')
    expect((await handler(post(form))).statusCode).toBe(500)
  })

  it('never logs the visitor fields', async () => {
    ddb.on(UpdateCommand).resolves({ Attributes: { used: 1 } })
    ses.on(SendEmailCommand).resolves({ MessageId: 'm-1' })
    await handler(post(form))
    const logged = vi.mocked(console.info).mock.calls.flat().join(' ')
    for (const value of [form.name, form.email, form.company, form.message]) {
      expect(logged).not.toContain(value)
    }
  })
})
```

- [ ] Step 2: Run `pnpm -F api test:run src/handlers/contact.test.ts`. Expected: FAIL, cannot resolve `./contact`.
- [ ] Step 3: Implement `app/api/src/handlers/contact.ts`.

```ts
import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { SESv2Client } from '@aws-sdk/client-sesv2'
import { checkContact } from '../lib/contactInput'
import { takeUnit } from '../lib/counter'
import {
  json,
  parseJsonBody,
  type LambdaFunctionURLEvent,
  type LambdaFunctionURLResult,
} from '../lib/http'
import { sendOwnerEmail } from '../lib/mail'

const MAX_BODY_BYTES = 32_768
const COUNTER_TTL_DAYS = 7

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const sesClient = new SESv2Client({})

export interface ContactConfig {
  table: string
  dailyCap: number
  from: string
  to: string
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (value === undefined || value === '') throw new Error(`${name} is not set`)
  return value
}

export function readConfig(env: NodeJS.ProcessEnv): ContactConfig {
  const dailyCap = Number(requireEnv(env, 'CONTACT_DAILY_CAP'))
  if (!Number.isInteger(dailyCap) || dailyCap < 1) {
    throw new Error('CONTACT_DAILY_CAP must be a positive integer')
  }
  return {
    table: requireEnv(env, 'TABLE_NAME'),
    dailyCap,
    from: requireEnv(env, 'CONTACT_FROM'),
    to: requireEnv(env, 'CONTACT_TO'),
  }
}

function counterKey(now: Date): string {
  return `contact#${now.toISOString().slice(0, 10)}`
}

function newReference(): string {
  return randomUUID().slice(0, 8).toUpperCase()
}

function log(fields: Record<string, string | number>): void {
  console.info(JSON.stringify(fields))
}

export async function handler(
  event: LambdaFunctionURLEvent,
): Promise<LambdaFunctionURLResult> {
  if (event.requestContext.http.method !== 'POST') return json(405, { reason: 'method' })

  const check = checkContact(parseJsonBody<unknown>(event, MAX_BODY_BYTES))
  if (check.kind === 'spam') {
    log({ outcome: 'spam' })
    return json(200, { ok: true, reference: newReference() })
  }
  if (check.kind === 'invalid') {
    log({ outcome: check.reason })
    return json(400, { reason: check.reason })
  }

  try {
    const config = readConfig(process.env)
    const now = new Date()
    const unit = await takeUnit({
      client: documentClient,
      table: config.table,
      key: counterKey(now),
      cap: config.dailyCap,
      ttlDays: COUNTER_TTL_DAYS,
      now,
    })
    if (!unit.ok) {
      log({ outcome: 'daily_cap' })
      return json(429, { reason: 'daily_cap' })
    }
    const reference = newReference()
    await sendOwnerEmail(sesClient, {
      from: config.from,
      to: config.to,
      reference,
      input: check.value,
    })
    log({ outcome: 'sent', reference, used: unit.used })
    return json(200, { ok: true, reference })
  } catch (error) {
    log({ outcome: 'error', error: error instanceof Error ? error.name : 'unknown' })
    return json(500, { reason: 'server' })
  }
}
```

The `console.info` line is the function's operational log (one JSON line per request, metadata only), not debug output.

- [ ] Step 4: Run `pnpm -F api test:run && pnpm -F api exec tsc --noEmit && pnpm -F api lint && pnpm format:check`. Expected: all pass.
- [ ] Step 5: Commit.

```bash
git add app/api/src/handlers/contact.ts app/api/src/handlers/contact.test.ts
git commit -m "feat(api): add contact handler with daily cap and owner email"
```

### P0-T8 laptop: deterministic build and zip

Files: Create `app/api/scripts/build.mjs`.
Interfaces: Consumes every `src/handlers/*.ts` that is not a test. Produces `app/api/dist/<name>/index.mjs` and `app/api/dist/<name>.zip` (one entry, `index.mjs`, handler `index.handler`).

The script cannot be unit-tested cheaply; Steps 3 to 6 are the manual check the done-gate asks for.

- [ ] Step 1: Create `app/api/scripts/build.mjs`.

```js
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, readdirSync, rmSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('..', import.meta.url))
const handlersDir = join(root, 'src/handlers')
const distDir = join(root, 'dist')
const fixedTime = new Date('2000-01-01T00:00:00Z')

const names = readdirSync(handlersDir)
  .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
  .map((file) => file.slice(0, -3))

if (names.length === 0) {
  throw new Error(`No handlers found in ${handlersDir}`)
}

rmSync(distDir, { recursive: true, force: true })

for (const name of names) {
  const outDir = join(distDir, name)
  const outfile = join(outDir, 'index.mjs')
  mkdirSync(outDir, { recursive: true })
  await build({
    entryPoints: [join(handlersDir, `${name}.ts`)],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    minify: true,
    keepNames: true,
    legalComments: 'none',
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
    logLevel: 'warning',
  })
  chmodSync(outfile, 0o644)
  utimesSync(outfile, fixedTime, fixedTime)
  execFileSync('zip', ['-X', '-q', '-j', join(distDir, `${name}.zip`), outfile], {
    env: { ...process.env, TZ: 'UTC' },
    stdio: 'inherit',
  })
}
```

- [ ] Step 2: Run `pnpm -F api lint && pnpm format:check`. Expected: exit 0.
- [ ] Step 3: Build and list.

```bash
pnpm -F api build
ls app/api/dist
unzip -l app/api/dist/contact.zip
```

Expected: `contact  contact.zip`; the zip lists exactly one file, `index.mjs`, dated `01-01-2000 00:00`.

- [ ] Step 4: Prove the zip is byte-identical across builds.

```bash
S=/private/tmp/claude-501/-Users-mj-repos-mccor-labs/zipcheck.sha
shasum -a 256 app/api/dist/contact.zip >"$S"
pnpm -F api build
shasum -a 256 -c "$S"
rm -f "$S"
```

Expected: `app/api/dist/contact.zip: OK`.

- [ ] Step 5: Prove the bundle loads without AWS configuration.

```bash
node --input-type=module -e "const m = await import('./app/api/dist/contact/index.mjs'); process.stdout.write(typeof m.handler + '\n')"
```

Expected: `function`.

- [ ] Step 6: Run `git status --short app/api`. Expected: only `?? app/api/scripts/` (dist is ignored).
- [ ] Step 7: Commit.

```bash
git add app/api/scripts/build.mjs
git commit -m "feat(api): bundle each handler with esbuild into a deterministic zip"
```

### P0-T9 laptop: `signedPostJson` in the web app

Files: Create `app/web/src/lib/signedPost.ts`, `app/web/src/lib/signedPost.test.ts`.
Interfaces: Produces `signedPostJson(endpoint: string, body: unknown): Promise<Response>`. It sends `JSON.stringify(body)` with `content-type: application/json` and `x-amz-content-sha256: <lowercase hex SHA-256 of those exact bytes>`.

- [ ] Step 1: Write the failing test. The expected digest was computed with `printf '%s' '{"a":1}' | shasum -a 256`. jsdom has no `crypto.subtle`, so this file runs in node.

```ts
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { signedPostJson } from './signedPost'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('signedPostJson', () => {
  it('posts the JSON body with the SHA-256 of the exact bytes sent', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))
    await signedPostJson('/api/contact', { a: 1 })
    expect(fetchSpy).toHaveBeenCalledWith('/api/contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-amz-content-sha256':
          '015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862',
      },
      body: '{"a":1}',
    })
  })

  it('returns the response unchanged', async () => {
    const response = new Response('', { status: 429 })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
    expect(await signedPostJson('/api/contact', {})).toBe(response)
  })

  it('lets a network failure reject', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    await expect(signedPostJson('/api/contact', {})).rejects.toThrow('offline')
  })
})
```

- [ ] Step 2: Run `pnpm -F web test:run src/lib/signedPost.test.ts`. Expected: FAIL, cannot resolve `./signedPost`.
- [ ] Step 3: Implement `app/web/src/lib/signedPost.ts`.

```ts
async function sha256Hex(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export async function signedPostJson(endpoint: string, body: unknown): Promise<Response> {
  const payload = JSON.stringify(body)
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-amz-content-sha256': await sha256Hex(payload),
    },
    body: payload,
  })
}
```

- [ ] Step 4: Run `pnpm -F web test:run && pnpm -F web exec tsc --noEmit && pnpm -F web lint && pnpm format:check`. Expected: all pass.
- [ ] Step 5: Commit.

```bash
git add app/web/src/lib/signedPost.ts app/web/src/lib/signedPost.test.ts
git commit -m "feat(web): add signedPostJson with the x-amz-content-sha256 body hash"
```

### P0-T10 laptop: `submitContact` uses the signed post

Files: Edit `app/web/src/lib/contact.ts`, `app/web/src/lib/contact.test.ts`.
Interfaces: Consumes `signedPostJson` (P0-T9). Produces `ContactRequest` with `elapsedMs: number`; `ContactError = 'validation' | 'too_fast' | 'rate_limit' | 'daily_cap' | 'server'`; `ContactResponse = {ok: true; reference: string | null} | {ok: false; error: ContactError; detail?: string}`; `MAILTO_BODY_MAX = 1500`; `contactMailtoHref(email: string, subject: string, message: string): string`.

Contract changes to existing tests (each is a deliberate behaviour change, not a fix-up): the fixture gains `elapsedMs: 5000`; tests mock `@/lib/signedPost` instead of spying on `fetch`; "reports success on a 200" now expects `{ ok: true, reference: null }`.

- [ ] Step 1: Re-read both files. Edit `contact.test.ts`:
  - Add after the imports:

```ts
vi.mock('@/lib/signedPost', () => ({ signedPostJson: vi.fn() }))
```

- Import `signedPostJson` from `@/lib/signedPost` and `beforeEach` from vitest; add `beforeEach(() => { vi.mocked(signedPostJson).mockReset() })`.
- Add `elapsedMs: 5000` to `valid`.
- In the `submitContact` block replace each `vi.spyOn(globalThis, 'fetch')` with `vi.mocked(signedPostJson)`; `mockResolvedValue` and `mockRejectedValue` stay as they are.
- Change the 200 expectation to `{ ok: true, reference: null }`.
- Change the honeypot test to `expect(signedPostJson).toHaveBeenCalledWith('https://api.test/contact', filled)` and expect `{ ok: true, reference: null }`.
- Add five tests to the `submitContact` block and one `describe` for the mailto helper. Import `MAILTO_BODY_MAX` and `contactMailtoHref` from `./contact`:

```ts
it('returns the reference from a 200', async () => {
  vi.mocked(signedPostJson).mockResolvedValue(
    new Response(JSON.stringify({ ok: true, reference: 'AB12CD34' }), { status: 200 }),
  )
  expect(await submitContact(valid, '/api/contact')).toEqual({
    ok: true,
    reference: 'AB12CD34',
  })
})

it('maps a 429 with reason daily_cap to daily_cap', async () => {
  vi.mocked(signedPostJson).mockResolvedValue(
    new Response(JSON.stringify({ reason: 'daily_cap' }), { status: 429 }),
  )
  expect(await submitContact(valid, '/api/contact')).toEqual({
    ok: false,
    error: 'daily_cap',
  })
})

it('maps a 429 with a non-JSON body to rate_limit', async () => {
  vi.mocked(signedPostJson).mockResolvedValue(new Response('Too Many', { status: 429 }))
  expect(await submitContact(valid, '/api/contact')).toEqual({
    ok: false,
    error: 'rate_limit',
  })
})

it('maps a 400 with reason too_fast to too_fast', async () => {
  vi.mocked(signedPostJson).mockResolvedValue(
    new Response(JSON.stringify({ reason: 'too_fast' }), { status: 400 }),
  )
  expect(await submitContact(valid, '/api/contact')).toEqual({
    ok: false,
    error: 'too_fast',
  })
})

it('maps a 400 with reason validation to validation', async () => {
  vi.mocked(signedPostJson).mockResolvedValue(
    new Response(JSON.stringify({ reason: 'validation' }), { status: 400 }),
  )
  expect(await submitContact(valid, '/api/contact')).toEqual({
    ok: false,
    error: 'validation',
  })
})

describe('contactMailtoHref', () => {
  it('carries the subject and the whole message when it fits', () => {
    expect(contactMailtoHref('hello@mccorlabs.com', 'Website enquiry', 'Hi there')).toBe(
      'mailto:hello@mccorlabs.com?subject=Website%20enquiry&body=Hi%20there',
    )
  })

  it('cuts a long message to the cap and marks the cut', () => {
    const href = contactMailtoHref(
      'hello@mccorlabs.com',
      'Website enquiry',
      'é'.repeat(5000),
    )
    const body = decodeURIComponent(href.split('&body=')[1] ?? '')
    expect(encodeURIComponent(body).length).toBeLessThanOrEqual(MAILTO_BODY_MAX)
    expect(body.endsWith('…')).toBe(true)
  })

  it('never splits a surrogate pair', () => {
    const href = contactMailtoHref(
      'hello@mccorlabs.com',
      'Website enquiry',
      '😀'.repeat(2000),
    )
    expect(() => decodeURIComponent(href.split('&body=')[1] ?? '')).not.toThrow()
  })
})
```

- [ ] Step 2: Run `pnpm -F web test:run src/lib/contact.test.ts`. Expected: FAIL on the reference, daily_cap, too_fast, honeypot and mailto cases, and a type error on `elapsedMs` under tsc.
- [ ] Step 3: Edit `contact.ts`:
  - Add `import { signedPostJson } from '@/lib/signedPost'`.
  - Add `elapsedMs: number` to `ContactRequest`.
  - Replace `ContactResponse` with:

```ts
export type ContactError =
  'validation' | 'too_fast' | 'rate_limit' | 'daily_cap' | 'server'

export type ContactResponse =
  | { ok: true; reference: string | null }
  | { ok: false; error: ContactError; detail?: string }
```

- Add above `submitContact`:

```ts
async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  const text = await response.text()
  try {
    const data: unknown = JSON.parse(text)
    return typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
```

- Replace the `try` block body in `submitContact` with:

```ts
const response = await signedPostJson(endpoint, request)
const data = await readJson(response)

if (response.ok) {
  return {
    ok: true,
    reference: typeof data?.reference === 'string' ? data.reference : null,
  }
}
if (response.status === 429) {
  return { ok: false, error: data?.reason === 'daily_cap' ? 'daily_cap' : 'rate_limit' }
}
if (response.status === 400) {
  return { ok: false, error: data?.reason === 'too_fast' ? 'too_fast' : 'validation' }
}
return { ok: false, error: 'server' }
```

- Add at the end of the file:

```ts
export const MAILTO_BODY_MAX = 1500

const CUT_MARK = '…'

function capBody(message: string): string {
  if (encodeURIComponent(message).length <= MAILTO_BODY_MAX) return message
  const room = MAILTO_BODY_MAX - encodeURIComponent(CUT_MARK).length
  let used = 0
  let kept = ''
  for (const point of message) {
    const size = encodeURIComponent(point).length
    if (used + size > room) break
    used += size
    kept += point
  }
  return `${kept}${CUT_MARK}`
}

export function contactMailtoHref(
  email: string,
  subject: string,
  message: string,
): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(capBody(message))}`
}
```

Iterating with `for...of` walks code points, so a surrogate pair is never split.

- [ ] Step 4: Run `pnpm -F web test:run src/lib/contact.test.ts`. Expected: PASS. `ContactForm.tsx` will not type-check until P0-T11 (missing `elapsedMs`); run `pnpm -F web exec tsc --noEmit` and expect exactly that one error in `ContactForm.tsx`.
- [ ] Step 5: Do not commit yet. P0-T11 commits both tasks together so every commit type-checks.

### P0-T11 laptop: `ContactForm` sends elapsed time and shows the new outcomes

Files: Edit `app/web/src/components/contact/ContactForm.tsx`, `app/web/src/components/contact/ContactForm.test.tsx`, `app/web/src/content/ui.ts`.
Interfaces: Consumes `submitContact`, `contactMailtoHref` (P0-T10). Produces `ui.formSuccess` (no reply-time promise), `ui.formReference`, `ui.formErrorDailyCap`, `ui.formErrorTooFast`, `ui.formMailtoSubject`, and the new `ui.formErrorServer`.

Contract changes to existing tests: the form test mocks `@/lib/signedPost` (jsdom has no `crypto.subtle`), the success test asserts the reference, and any existing assertion on the old `formErrorServer` text follows the key (tests reference `ui.formErrorServer`, not the literal).

- [ ] Step 1: Re-read the three files. Edit `ui.ts`: add `import { site } from './site'` at the top, change `formSuccess` and `formErrorServer`, and add four keys after `formSuccess`:

```ts
  formSuccess: 'Thanks — your message has reached us.',
  formReference: 'Reference',
  formErrorDailyCap: `Our form has reached today's limit. Email us at ${site.contactEmail}; your message is still in the box below.`,
  formErrorTooFast: 'That was quicker than we expect from a person. Please press Send again.',
  formMailtoSubject: 'Website enquiry',
```

```ts
  formErrorServer: `We could not send that. Email us at ${site.contactEmail}; your message is still in the box below.`,
```

Both mailto messages contain `site.contactEmail` exactly once; the form splits the text on it to place the link.

- [ ] Step 2: Edit `ContactForm.test.tsx`. Add `vi.mock('@/lib/signedPost', () => ({ signedPostJson: vi.fn() }))`, import `signedPostJson`, and add `vi.mocked(signedPostJson).mockReset()` to the existing `beforeEach`. Add a helper and replace the success test, then add two tests:

```tsx
async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/name/i), 'Ada Lovelace')
  await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
  await userEvent.type(
    screen.getByLabelText(/message/i),
    'We need a marketing site and a portal.',
  )
}

it('announces success with the reference in a live region', async () => {
  vi.mocked(signedPostJson).mockResolvedValue(
    new Response(JSON.stringify({ ok: true, reference: 'AB12CD34' }), { status: 200 }),
  )
  render(<ContactForm endpoint="/api/contact" />)
  await fillValidForm()
  await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
  const status = await screen.findByRole('status')
  expect(status).toHaveTextContent(ui.formSuccess)
  expect(status).toHaveTextContent('AB12CD34')
})

it('sends how long the form was open', async () => {
  vi.mocked(signedPostJson).mockResolvedValue(new Response('{}', { status: 200 }))
  render(<ContactForm endpoint="/api/contact" />)
  await fillValidForm()
  await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
  expect(signedPostJson).toHaveBeenCalledWith(
    '/api/contact',
    expect.objectContaining({ elapsedMs: expect.any(Number) as number }),
  )
})

it.each([
  ['daily cap', 429, 'daily_cap', ui.formErrorDailyCap],
  ['server error', 500, 'server', ui.formErrorServer],
])(
  'shows the %s message with a mailto link and keeps what was typed',
  async (_label, status, reason, text) => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ reason }), { status }),
    )
    render(<ContactForm endpoint="/api/contact" />)
    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    const statusLine = await screen.findByRole('status')
    expect(statusLine).toHaveTextContent(text)
    const link = within(statusLine).getByRole('link', { name: site.contactEmail })
    expect(link).toHaveAttribute(
      'href',
      contactMailtoHref(
        site.contactEmail,
        ui.formMailtoSubject,
        'We need a marketing site and a portal.',
      ),
    )
    expect(screen.getByLabelText(/message/i)).toHaveValue(
      'We need a marketing site and a portal.',
    )
  },
)

it('asks a too-fast sender to press Send again, with no link', async () => {
  vi.mocked(signedPostJson).mockResolvedValue(
    new Response(JSON.stringify({ reason: 'too_fast' }), { status: 400 }),
  )
  render(<ContactForm endpoint="/api/contact" />)
  await fillValidForm()
  await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
  const statusLine = await screen.findByRole('status')
  expect(statusLine).toHaveTextContent(ui.formErrorTooFast)
  expect(within(statusLine).queryByRole('link')).toBeNull()
})
```

Add `within` to the Testing Library import, and import `site` from `@/content/site` and `contactMailtoHref` from `@/lib/contact`.

- [ ] Step 3: Run `pnpm -F web test:run src/components/contact`. Expected: FAIL on the reference, elapsed, daily-cap, server and too-fast tests.
- [ ] Step 4: Edit `ContactForm.tsx`:
  - Change the React import to `import { useEffect, useRef, useState, type SubmitEvent } from 'react'`.
  - After the `useState` lines add:

```tsx
const openedAt = useRef(0)

useEffect(() => {
  openedAt.current = Date.now()
}, [])
```

- Both hooks sit with the `useState` calls, above the `if (endpoint === null)` early return, so hook order never changes. `Date.now()` runs only in the effect and the submit handler, never during render.
- Add `const [mailtoHref, setMailtoHref] = useState<string | null>(null)` with the other `useState` lines, and call `setMailtoHref(null)` wherever `setMessage` is called today.
- In `request` add `elapsedMs: Date.now() - openedAt.current,`.
- Replace the success branch and the error mapping:

```tsx
if (result.ok) {
  setStatus('sent')
  setMessage(
    result.reference === null
      ? ui.formSuccess
      : `${ui.formSuccess} ${ui.formReference} ${result.reference}.`,
  )
  setMailtoHref(null)
  return
}

setStatus('error')
setMessage(errorMessage(result.error))
setMailtoHref(
  offersMailto(result.error)
    ? contactMailtoHref(site.contactEmail, ui.formMailtoSubject, request.message)
    : null,
)
```

- Add above the component:

```tsx
function errorMessage(error: ContactError): string {
  if (error === 'daily_cap') return ui.formErrorDailyCap
  if (error === 'too_fast') return ui.formErrorTooFast
  if (error === 'rate_limit') return ui.formErrorRateLimit
  if (error === 'validation') return ui.formErrorValidation
  return ui.formErrorServer
}

function offersMailto(error: ContactError): boolean {
  return error === 'daily_cap' || error === 'server'
}

function StatusText({ text, href }: { text: string; href: string | null }) {
  if (href === null) return text
  const [before, after] = text.split(site.contactEmail)
  return (
    <>
      {before}
      <a href={href} className="text-accent underline underline-offset-4">
        {site.contactEmail}
      </a>
      {after}
    </>
  )
}
```

- Replace `{message}` inside the existing `<p role="status">` with `<StatusText text={message} href={mailtoHref} />`.
- Import `type ContactError` and `contactMailtoHref` from `@/lib/contact`.

- [ ] Step 5: Run `test -f app/web/src/test/noClaims.ts`. If it exists (phase 1 has merged), create `app/web/src/content/ui.test.ts`. If it does not, skip this step here and do it in P0-T22 Step 0; never create `noClaims.ts` in phase 0, because P1-T7 creates it (Ruling: contact claims check).

```ts
import { describe, expect, it } from 'vitest'
import { assertNoClaims } from '@/test/noClaims'
import { ui } from './ui'

describe('contact strings make no claims', () => {
  it.each([
    ['formErrorTooFast', ui.formErrorTooFast],
    ['formErrorDailyCap', ui.formErrorDailyCap],
    ['formErrorServer', ui.formErrorServer],
    ['formSuccess', ui.formSuccess],
  ])('%s passes the banned-claims check', (_key, text) => {
    expect(text.length).toBeGreaterThan(0)
    assertNoClaims(text)
  })
})
```

Run `pnpm -F web test:run src/content/ui.test.ts`. Expected: PASS, 4 tests.

- [ ] Step 6: Run the gates.

```bash
pnpm -F web test:run
pnpm -F web exec tsc --noEmit
pnpm -F web lint
pnpm format:check
```

Expected: all pass, including the unchanged "shows inline errors" and "honeypot" tests.

- [ ] Step 7: Commit P0-T10 and P0-T11 together. Add `app/web/src/content/ui.test.ts` to the `git add` line only if Step 5 created it.

```bash
git add app/web/src/lib/contact.ts app/web/src/lib/contact.test.ts app/web/src/components/contact/ContactForm.tsx app/web/src/components/contact/ContactForm.test.tsx app/web/src/content/ui.ts
git commit -m "feat(web): sign contact posts, send fill time, show reference and daily cap"
```

### P0-T12 laptop: accept a root-relative contact endpoint

Files: Edit `app/web/src/lib/env.ts`, `app/web/src/lib/env.test.ts`.
Interfaces: Produces `env.contactEndpoint: string | null` that accepts `/api/contact`.

- [ ] Step 1: Re-read both files. Add tests to `env.test.ts`:

```ts
it('accepts a root-relative contact endpoint', async () => {
  const env = await loadEnv({ NEXT_PUBLIC_CONTACT_ENDPOINT: '/api/contact' })
  expect(env.contactEndpoint).toBe('/api/contact')
})

it('rejects a protocol-relative contact endpoint', async () => {
  await expect(
    loadEnv({ NEXT_PUBLIC_CONTACT_ENDPOINT: '//evil.example/x' }),
  ).rejects.toThrow(/NEXT_PUBLIC_CONTACT_ENDPOINT/)
})

it('rejects a bare relative contact endpoint', async () => {
  await expect(loadEnv({ NEXT_PUBLIC_CONTACT_ENDPOINT: 'api/contact' })).rejects.toThrow(
    /NEXT_PUBLIC_CONTACT_ENDPOINT/,
  )
})
```

- [ ] Step 2: Run `pnpm -F web test:run src/lib/env.test.ts`. Expected: FAIL on the root-relative and protocol-relative cases.
- [ ] Step 3: In `env.ts` add after `optionalUrl`:

```ts
function optionalEndpoint(name: string, raw: string | undefined): string | null {
  if (raw === undefined || raw === '') return null
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  if (raw.startsWith('//')) {
    throw new Error(`${name} must not be protocol-relative, received: ${raw}`)
  }
  return optionalUrl(name, raw)
}
```

and change `contactEndpoint` to `optionalEndpoint('NEXT_PUBLIC_CONTACT_ENDPOINT', process.env.NEXT_PUBLIC_CONTACT_ENDPOINT)`.

- [ ] Step 4: Run `pnpm -F web test:run && pnpm -F web exec tsc --noEmit && pnpm -F web lint && pnpm format:check`. Expected: all pass.
- [ ] Step 5: Commit.

```bash
git add app/web/src/lib/env.ts app/web/src/lib/env.test.ts
git commit -m "feat(web): accept a root-relative contact endpoint"
```

### P0-T13 laptop: `lab_api` module, part 1 (table, log group, role)

Files: Create `infra/modules/lab_api/variables.tf`, `infra/modules/lab_api/main.tf`, `infra/modules/lab_api/tests/lab_api.tftest.hcl`.
Interfaces: Variables `name`, `package_dir`, `ses_identity_arn`, `contact_from`, `contact_to`, `contact_daily_cap` (number, default 50). Produces `aws_dynamodb_table.lab` (`${var.name}-lab`), `aws_cloudwatch_log_group.contact`, `aws_iam_role.contact`, `local.contact_policy`.

- [ ] Step 1: Create `variables.tf`.

```hcl
variable "name" {
  description = "Short project name used in resource names"
  type        = string
}

variable "package_dir" {
  description = "Directory holding the built handler zips, e.g. app/api/dist"
  type        = string
}

variable "ses_identity_arn" {
  description = "ARN of the verified SES domain identity the contact email is sent from"
  type        = string
}

variable "contact_from" {
  description = "From address of the contact email, inside the SES identity's domain"
  type        = string
}

variable "contact_to" {
  description = "Owner address that receives contact form messages"
  type        = string
}

variable "contact_daily_cap" {
  description = "Contact messages accepted per UTC day before the form returns daily_cap"
  type        = number
  default     = 50
}
```

- [ ] Step 2: Write the failing test `tests/lab_api.tftest.hcl`.

```hcl
mock_provider "aws" {}

override_resource {
  target          = aws_cloudwatch_log_group.contact
  override_during = plan
  values          = { arn = "arn:aws:logs:us-east-1:111111111111:log-group:/aws/lambda/t-contact" }
}

override_resource {
  target          = aws_dynamodb_table.lab
  override_during = plan
  values          = { arn = "arn:aws:dynamodb:us-east-1:111111111111:table/t-lab" }
}

variables {
  name             = "t"
  package_dir      = "../../../app/api/dist"
  ses_identity_arn = "arn:aws:ses:us-east-1:111111111111:identity/example.com"
  contact_from     = "website@example.com"
  contact_to       = "owner@example.com"
}

run "storage_and_role" {
  command = plan

  assert {
    condition     = aws_dynamodb_table.lab.name == "t-lab" && aws_dynamodb_table.lab.hash_key == "pk"
    error_message = "Table must be <name>-lab keyed by pk."
  }

  assert {
    condition     = aws_dynamodb_table.lab.billing_mode == "PAY_PER_REQUEST"
    error_message = "Table must be on-demand."
  }

  assert {
    condition     = aws_dynamodb_table.lab.ttl[0].attribute_name == "expiresAt" && aws_dynamodb_table.lab.ttl[0].enabled
    error_message = "TTL must be on expiresAt."
  }

  assert {
    condition     = aws_cloudwatch_log_group.contact.name == "/aws/lambda/t-contact" && aws_cloudwatch_log_group.contact.retention_in_days == 3
    error_message = "Contact logs must be kept 3 days."
  }

  assert {
    condition = anytrue([
      for s in local.contact_policy.Statement :
      s.Action == ["ses:SendEmail"] && s.Resource == ["arn:aws:ses:us-east-1:111111111111:identity/example.com"] && s.Condition.StringEquals["ses:FromAddress"] == "website@example.com"
    ])
    error_message = "SES must be SendEmail on the one identity from the one address."
  }

  assert {
    condition = anytrue([
      for s in local.contact_policy.Statement :
      s.Action == ["dynamodb:UpdateItem"] && s.Condition["ForAllValues:StringLike"]["dynamodb:LeadingKeys"] == ["contact#*"]
    ])
    error_message = "The counter statement must be UpdateItem on contact# keys only."
  }

  assert {
    condition     = length(local.contact_policy.Statement) == 3
    error_message = "The contact role must carry exactly logs, counter and mail."
  }
}
```

- [ ] Step 3: Run `terraform -chdir=infra/modules/lab_api init -backend=false -input=false && terraform -chdir=infra/modules/lab_api test`. Expected: FAIL, references to undeclared resources.
- [ ] Step 4: Create `main.tf`.

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
  }
}

resource "aws_dynamodb_table" "lab" {
  name         = "${var.name}-lab"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}

resource "aws_cloudwatch_log_group" "contact" {
  name              = "/aws/lambda/${var.name}-contact"
  retention_in_days = 3
}

locals {
  lambda_assume_policy = {
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  }

  contact_policy = {
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = ["${aws_cloudwatch_log_group.contact.arn}:*"]
      },
      {
        Sid       = "Counter"
        Effect    = "Allow"
        Action    = ["dynamodb:UpdateItem"]
        Resource  = [aws_dynamodb_table.lab.arn]
        Condition = { "ForAllValues:StringLike" = { "dynamodb:LeadingKeys" = ["contact#*"] } }
      },
      {
        Sid       = "Mail"
        Effect    = "Allow"
        Action    = ["ses:SendEmail"]
        Resource  = [var.ses_identity_arn]
        Condition = { StringEquals = { "ses:FromAddress" = var.contact_from } }
      },
    ]
  }
}

resource "aws_iam_role" "contact" {
  name               = "${var.name}-contact"
  assume_role_policy = jsonencode(local.lambda_assume_policy)
}

resource "aws_iam_role_policy" "contact" {
  name   = "contact"
  role   = aws_iam_role.contact.id
  policy = jsonencode(local.contact_policy)
}
```

- [ ] Step 5: Run the gates.

```bash
terraform fmt -check -recursive infra
terraform -chdir=infra/modules/lab_api test
```

Expected: fmt exits 0; `1 passed, 0 failed`. The two `override_resource` blocks give the ARNs known values at plan, as `static_site.tftest.hcl:17-21` does, so the `anytrue` assertions never see unknowns. `init` may create `infra/modules/lab_api/.terraform.lock.hcl`; do not stage it (no module in this repo tracks one).

- [ ] Step 6: Commit.

```bash
git add infra/modules/lab_api/variables.tf infra/modules/lab_api/main.tf infra/modules/lab_api/tests/lab_api.tftest.hcl
git commit -m "feat(infra): add lab_api module with counter table, contact role and logs"
```

### P0-T14 laptop: `lab_api` module, part 2 (function, Function URL, outputs)

Files: Edit `infra/modules/lab_api/main.tf`, `infra/modules/lab_api/tests/lab_api.tftest.hcl`. Create `infra/modules/lab_api/outputs.tf`.
Interfaces: Consumes `app/api/dist/contact.zip` (P0-T8). Produces outputs `api_origins` (`[{path_pattern = "/api/contact", function_url_domain = <host>}]`) and `function_arns` (`{contact = <arn>}`).

- [ ] Step 1: Run `pnpm -F api build` so the zip exists for the test.
- [ ] Step 2: Add to the test file, after `variables`:

```hcl
override_resource {
  target          = aws_lambda_function_url.contact
  override_during = plan
  values          = { function_url = "https://abc123.lambda-url.us-east-1.on.aws/" }
}

override_resource {
  target          = aws_lambda_function.contact
  override_during = plan
  values          = { arn = "arn:aws:lambda:us-east-1:111111111111:function:t-contact" }
}

run "function" {
  command = plan

  assert {
    condition     = aws_lambda_function.contact.runtime == "nodejs24.x" && aws_lambda_function.contact.architectures == ["arm64"]
    error_message = "Contact must run nodejs24.x on arm64."
  }

  assert {
    condition     = aws_lambda_function.contact.handler == "index.handler" && aws_lambda_function.contact.timeout == 10 && aws_lambda_function.contact.memory_size == 256
    error_message = "Handler, timeout or memory drifted."
  }

  assert {
    condition = aws_lambda_function.contact.environment[0].variables == {
      TABLE_NAME        = "t-lab"
      CONTACT_DAILY_CAP = "50"
      CONTACT_FROM      = "website@example.com"
      CONTACT_TO        = "owner@example.com"
    }
    error_message = "Contact environment variables drifted."
  }

  assert {
    condition     = aws_lambda_function_url.contact.authorization_type == "AWS_IAM"
    error_message = "The Function URL must require IAM so only CloudFront OAC can call it."
  }

  assert {
    condition     = output.api_origins == [{ path_pattern = "/api/contact", function_url_domain = "abc123.lambda-url.us-east-1.on.aws" }]
    error_message = "api_origins must carry the path and the bare Function URL host."
  }

  assert {
    condition     = output.function_arns == { contact = "arn:aws:lambda:us-east-1:111111111111:function:t-contact" }
    error_message = "function_arns must be keyed by function name."
  }
}
```

- [ ] Step 3: Run `terraform -chdir=infra/modules/lab_api test`. Expected: FAIL, undeclared `aws_lambda_function.contact`.
- [ ] Step 4: Append to `main.tf`:

```hcl
resource "aws_lambda_function" "contact" {
  function_name    = "${var.name}-contact"
  role             = aws_iam_role.contact.arn
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  handler          = "index.handler"
  filename         = "${var.package_dir}/contact.zip"
  source_code_hash = filebase64sha256("${var.package_dir}/contact.zip")
  memory_size      = 256
  timeout          = 10

  environment {
    variables = {
      TABLE_NAME        = aws_dynamodb_table.lab.name
      CONTACT_DAILY_CAP = tostring(var.contact_daily_cap)
      CONTACT_FROM      = var.contact_from
      CONTACT_TO        = var.contact_to
    }
  }

  depends_on = [aws_cloudwatch_log_group.contact, aws_iam_role_policy.contact]
}

resource "aws_lambda_function_url" "contact" {
  function_name      = aws_lambda_function.contact.function_name
  authorization_type = "AWS_IAM"
}
```

Create `outputs.tf`:

```hcl
output "api_origins" {
  description = "Path pattern and Function URL host per endpoint, for the CloudFront distribution"
  value = [{
    path_pattern        = "/api/contact"
    function_url_domain = split("/", aws_lambda_function_url.contact.function_url)[2]
  }]
}

output "function_arns" {
  description = "Function ARN per endpoint name, for the CloudFront invoke permissions"
  value       = { contact = aws_lambda_function.contact.arn }
}
```

- [ ] Step 5: Run `terraform fmt -check -recursive infra && terraform -chdir=infra/modules/lab_api test`. Expected: `2 passed, 0 failed`.
- [ ] Step 6: Commit.

```bash
git add infra/modules/lab_api/main.tf infra/modules/lab_api/outputs.tf infra/modules/lab_api/tests/lab_api.tftest.hcl
git commit -m "feat(infra): add contact Lambda with IAM-auth Function URL to lab_api"
```

### P0-T15 laptop: `static_site` Lambda origins and `/api` behaviors

Files: Edit `infra/modules/static_site/variables.tf`, `infra/modules/static_site/main.tf`, `infra/modules/static_site/tests/static_site.tftest.hcl`.
Interfaces: Consumes `api_origins` (list(object({path_pattern = string, function_url_domain = string})), default `[]`) and `api_function_arns` (map(string), default `{}`). Produces the Lambda OAC, origins, ordered cache behaviors and two permissions per function.

- [ ] Step 1: Re-read the three files. Append to `variables.tf`:

```hcl
variable "api_origins" {
  description = "Lambda Function URL origins served under the site domain, one per path pattern"
  type = list(object({
    path_pattern        = string
    function_url_domain = string
  }))
  default = []
}

variable "api_function_arns" {
  description = "Function ARN per endpoint name that CloudFront may invoke through its Function URL"
  type        = map(string)
  default     = {}
}
```

- [ ] Step 2: Edit the test. Add inside `mock_provider "aws"`:

```hcl
  override_data {
    target = data.aws_cloudfront_cache_policy.disabled
    values = {
      id = "cache-disabled-test"
    }
  }

  override_data {
    target = data.aws_cloudfront_origin_request_policy.all_viewer_except_host
    values = {
      id = "orp-test"
    }
  }
```

Append two runs:

```hcl
run "no_api" {
  command = plan

  assert {
    condition     = length(aws_cloudfront_distribution.site.ordered_cache_behavior) == 0 && length(aws_cloudfront_origin_access_control.api) == 0
    error_message = "Without api_origins the distribution must not change."
  }
}

run "api_origins" {
  command = plan

  variables {
    api_origins       = [{ path_pattern = "/api/contact", function_url_domain = "abc123.lambda-url.us-east-1.on.aws" }]
    api_function_arns = { contact = "arn:aws:lambda:us-east-1:111111111111:function:t-contact" }
  }

  assert {
    condition     = aws_cloudfront_origin_access_control.api[0].origin_access_control_origin_type == "lambda" && aws_cloudfront_origin_access_control.api[0].signing_behavior == "always"
    error_message = "The API OAC must be a Lambda OAC that always signs."
  }

  assert {
    condition     = anytrue([for o in aws_cloudfront_distribution.site.origin : o.domain_name == "abc123.lambda-url.us-east-1.on.aws" && o.origin_id == "api-contact"])
    error_message = "The Function URL host must be an origin."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.ordered_cache_behavior[0].path_pattern == "/api/contact" && aws_cloudfront_distribution.site.ordered_cache_behavior[0].target_origin_id == "api-contact"
    error_message = "The /api/contact behavior must route to its origin."
  }

  assert {
    condition     = contains(aws_cloudfront_distribution.site.ordered_cache_behavior[0].allowed_methods, "POST") && aws_cloudfront_distribution.site.ordered_cache_behavior[0].viewer_protocol_policy == "https-only"
    error_message = "The API behavior must allow POST over HTTPS only."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.ordered_cache_behavior[0].cache_policy_id == "cache-disabled-test" && aws_cloudfront_distribution.site.ordered_cache_behavior[0].origin_request_policy_id == "orp-test"
    error_message = "The API behavior must use CachingDisabled and AllViewerExceptHostHeader."
  }

  assert {
    condition     = aws_lambda_permission.api_url["contact"].action == "lambda:InvokeFunctionUrl" && aws_lambda_permission.api_url["contact"].function_url_auth_type == "AWS_IAM" && aws_lambda_permission.api_url["contact"].principal == "cloudfront.amazonaws.com"
    error_message = "CloudFront must be allowed lambda:InvokeFunctionUrl with AWS_IAM."
  }

  assert {
    condition     = aws_lambda_permission.api_invoke["contact"].action == "lambda:InvokeFunction" && aws_lambda_permission.api_invoke["contact"].invoked_via_function_url == true
    error_message = "CloudFront must be allowed lambda:InvokeFunction via the Function URL."
  }
}
```

- [ ] Step 3: Run `terraform -chdir=infra/modules/static_site test`. Expected: FAIL, undeclared data sources and resources.
- [ ] Step 4: Edit `main.tf`. After `data "aws_cloudfront_cache_policy" "optimized"` add:

```hcl
data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

resource "aws_cloudfront_origin_access_control" "api" {
  count                             = length(var.api_origins) > 0 ? 1 : 0
  name                              = "${var.name}-api-oac"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

Add to the existing `locals` block (`main.tf:46-48`):

```hcl
  api_origins = {
    for origin in var.api_origins :
    trim(replace(origin.path_pattern, "/[^a-z0-9]+/", "-"), "-") => origin
  }
```

Inside `aws_cloudfront_distribution.site`, after the S3 `origin` block add:

```hcl
  dynamic "origin" {
    for_each = local.api_origins
    content {
      origin_id                = origin.key
      domain_name              = origin.value.function_url_domain
      origin_access_control_id = aws_cloudfront_origin_access_control.api[0].id

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }
```

and after `default_cache_behavior` add:

```hcl
  dynamic "ordered_cache_behavior" {
    for_each = local.api_origins
    content {
      path_pattern               = ordered_cache_behavior.value.path_pattern
      target_origin_id           = ordered_cache_behavior.key
      viewer_protocol_policy     = "https-only"
      allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods             = ["GET", "HEAD"]
      compress                   = true
      cache_policy_id            = data.aws_cloudfront_cache_policy.disabled.id
      origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
      response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id
    }
  }
```

At the end of the file add:

```hcl
resource "aws_lambda_permission" "api_url" {
  for_each               = var.api_function_arns
  statement_id           = "AllowCloudFrontInvokeFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = each.value
  principal              = "cloudfront.amazonaws.com"
  source_arn             = aws_cloudfront_distribution.site.arn
  function_url_auth_type = "AWS_IAM"
}

resource "aws_lambda_permission" "api_invoke" {
  for_each                 = var.api_function_arns
  statement_id             = "AllowCloudFrontInvokeFunction"
  action                   = "lambda:InvokeFunction"
  function_name            = each.value
  principal                = "cloudfront.amazonaws.com"
  source_arn               = aws_cloudfront_distribution.site.arn
  invoked_via_function_url = true
}
```

- [ ] Step 5: Run `terraform fmt -check -recursive infra && terraform -chdir=infra/modules/static_site test`. Expected: `5 passed, 0 failed` (three existing runs plus two new).
- [ ] Step 6: Commit.

```bash
git add infra/modules/static_site/variables.tf infra/modules/static_site/main.tf infra/modules/static_site/tests/static_site.tftest.hcl
git commit -m "feat(infra): route /api paths to Lambda Function URLs through a Lambda OAC"
```

### P0-T16 laptop: wire `lab_api` into the root stack

Files: Edit `infra/main.tf`, `infra/modules/mailserver/outputs.tf`. Edit `.trivyignore.yaml` only if Step 4 requires it.
Interfaces: Consumes `module.mailserver[0].ses_identity_arn`, `module.lab_api[0].api_origins`, `module.lab_api[0].function_arns`.

- [ ] Step 1: Re-read the files. Append to `infra/modules/mailserver/outputs.tf`:

```hcl
output "ses_identity_arn" {
  description = "ARN of the SES domain identity, for least-privilege senders"
  value       = aws_ses_domain_identity.main.arn
}
```

- [ ] Step 2: In `infra/main.tf` add after `module "certificate"`:

```hcl
module "lab_api" {
  count  = local.has_domain ? 1 : 0
  source = "./modules/lab_api"

  name             = var.name
  package_dir      = "${path.module}/../app/api/dist"
  ses_identity_arn = module.mailserver[0].ses_identity_arn
  contact_from     = "website@${var.domain_name}"
  contact_to       = "${var.admin_mailbox}@${var.domain_name}"
}
```

and add two arguments to `module "site"`:

```hcl
  api_origins       = try(module.lab_api[0].api_origins, [])
  api_function_arns = try(module.lab_api[0].function_arns, {})
```

- [ ] Step 3: Validate and lint.

```bash
pnpm -F api build
terraform fmt -check -recursive infra
terraform -chdir=infra init -backend=false -input=false
terraform -chdir=infra validate
tflint --chdir=infra --init
tflint --chdir=infra
```

Expected: `Success! The configuration is valid.`; tflint prints no issues. Record any tflint warning about `nodejs24.x` in UNVERIFIED and report it; do not change the runtime.

- [ ] Step 4: Scan.

```bash
trivy config --severity HIGH,CRITICAL --ignorefile .trivyignore.yaml --exit-code 1 infra
```

Expected: exit 0. If it flags a HIGH or CRITICAL in `modules/lab_api` or the new `static_site` blocks, stop and report the ID to the owner with a proposed entry in the repo's form (`id`, `paths: ['**/modules/lab_api/**']`, `statement`). Add the entry only after the owner agrees.

- [ ] Step 5: Commit.

```bash
git add infra/main.tf infra/modules/mailserver/outputs.tf
git commit -m "feat(infra): wire the contact API into the site distribution"
```

Add `.trivyignore.yaml` to `git add` only if Step 4 changed it.

### P0-T17 laptop: build zips in CI before validate and plan

Files: Edit `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`.
Interfaces: Produces artifact `api` (`app/api/dist/*.zip`) from the deploy `build` job, consumed by the `terraform` job.

- [ ] Step 1: Re-read both files. In `ci.yml` job `quality`, after `- run: pnpm -F web test:run`, add:

```yaml
- run: pnpm -F api lint
- run: pnpm -F api exec tsc --noEmit
- run: pnpm -F api test:run
```

- [ ] Step 2: In `ci.yml` job `terraform`, before `- name: Init and validate`, add:

```yaml
- uses: pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86
- uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020
  with:
    node-version: ${{ env.NODE_VERSION }}
    cache: pnpm
- run: pnpm install --frozen-lockfile
- run: pnpm -F api build
```

- [ ] Step 3: In `deploy.yml` job `quality`, after `- run: pnpm -F web test:run`, add the same three api lines as Step 1.
- [ ] Step 4: In `deploy.yml` job `build`, after `- run: pnpm install --frozen-lockfile`, add:

```yaml
- run: pnpm -F api build
- uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a
  with:
    name: api
    path: app/api/dist/*.zip
    if-no-files-found: error
    retention-days: 1
```

- [ ] Step 5: In `deploy.yml` job `terraform`, after the `actions/checkout` step, add:

```yaml
- uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c
  with:
    name: api
    path: app/api/dist
- run: test -f app/api/dist/contact.zip
```

- [ ] Step 6: Verify syntax and order.

```bash
yq '.jobs.terraform.steps[].run // .jobs.terraform.steps[].uses' .github/workflows/deploy.yml
yq '.jobs.terraform.steps[] | (.name // .uses // .run)' .github/workflows/ci.yml
pnpm format:check
```

Expected: both parse; in deploy the download step and `test -f` come before `terraform -chdir=infra init`; in ci the `pnpm -F api build` step comes before `Init and validate`; format check exits 0.

- [ ] Step 7: Commit.

```bash
git add .github/workflows/ci.yml .github/workflows/deploy.yml
git commit -m "ci: test and build the api workspace and hand its zips to terraform"
```

### P0-T18 laptop: read-only dry run against real state

Files: none (no commit).
Interfaces: Consumes the branch. Produces the evidence the owner merges on.

- [ ] Step 1: Ask the owner to confirm `admin_mailbox` is their own mailbox (`marcm`). If not, stop: `contact_to` needs a different source.
- [ ] Step 2: Plan.

```bash
P=/private/tmp/claude-501/-Users-mj-repos-mccor-labs/p0.tfplan
r() { op run --no-masking --env-file=app.env -- "$@"; }
pnpm -F api build
r terraform -chdir=infra init -reconfigure
r terraform -chdir=infra plan -out="$P"
terraform -chdir=infra show -json "$P" | scripts/plan-guard.sh infra/destroy-allowlist.txt; echo "guard=$?"
terraform -chdir=infra show -no-color "$P" | grep -E '^  # '
rm -f "$P"
```

Expected: creates only for `module.lab_api[0]` (table, log group, role, role policy, function, function URL) and `module.site` (`aws_cloudfront_origin_access_control.api[0]`, `aws_lambda_permission.api_url["contact"]`, `aws_lambda_permission.api_invoke["contact"]`); one in-place update of `module.site.aws_cloudfront_distribution.site`; `guard=0`. Any destroy or replace means stop and report.

- [ ] Step 3: Run the full local gates once: `pnpm -F web test:run && pnpm -F api test:run && pnpm build:raw`. Expected: all pass; the static build still shows the mailto fallback because the endpoint is unset.

### P0-T19 OWNER: merge 1 (backend ships dark)

1. Push `feat/contact-backend` and open a PR. `CI` (quality, e2e, terraform) must be green. Fix real failures in code; never edit tests to pass them.
2. Merge. `Deploy` runs: quality, build (uploads `site` and `api`), terraform (downloads `api`, plans, guards, applies), deploy.
3. Verify from the laptop:

```bash
r() { op run --no-masking --env-file=app.env -- "$@"; }
r terraform -chdir=infra plan -detailed-exitcode; echo "exit=$?"
curl -sI https://mccorlabs.com/contact/ | head -1
```

Expected: `exit=0` (after `pnpm -F api build` on a laptop whose zip matches CI; a single `module.lab_api[0].aws_lambda_function.contact` update means the laptop zip differs from CI, see UNVERIFIED, and is not an error); `HTTP/2 200`.

### P0-T20 OWNER: smoke test `/api/contact` in production

This sends one real email to the owner and uses one of today's 50 units.

```bash
B='{"name":"Smoke Test","email":"owner-outside-address@example.com","company":"","budget":"","message":"Phase 0 smoke test from curl.","honeypot":"","elapsedMs":5000}'
H=$(printf '%s' "$B" | shasum -a 256 | cut -d' ' -f1)
curl -sS -X POST https://mccorlabs.com/api/contact -H 'content-type: application/json' -H "x-amz-content-sha256: $H" --data-raw "$B" -w '\n%{http_code}\n'
curl -sS -X POST https://mccorlabs.com/api/contact -H 'content-type: application/json' --data-raw "$B" -o /dev/null -w '%{http_code}\n'
```

Replace the email with a real outside address the owner reads. Expected: the first call prints `{"ok":true,"reference":"XXXXXXXX"}` and `200`; the email "Website enquiry XXXXXXXX" reaches the owner's `@mccorlabs.com` mailbox with Reply-To set to the outside address. The second call (no hash header) prints `404`, because OAC's 403 is rewritten to the 404 page (Rulings).

Then check:

```bash
a() { op run --no-masking --env-file=app.env -- env -u AWS_PROFILE aws "$@"; }
a dynamodb get-item --table-name mccorlabs-lab --key "{\"pk\":{\"S\":\"contact#$(date -u +%F)\"}}"
a logs tail /aws/lambda/mccorlabs-contact --since 15m
```

Expected: the item has `used` 1 and an `expiresAt` about 7 days ahead; the log shows one `{"outcome":"sent","reference":...,"used":1}` line and no name, email or message. If the log shows `AccessDenied` on `ses:SendEmail`, record it in UNVERIFIED and open a fix task adding the recipient identity ARN (Rulings).

### P0-T21 OWNER: SES launch gate (hole 1)

The form must not go live until a reply from a `@mccorlabs.com` mailbox reaches an outside address.

1. `a sesv2 get-account --query '{production:ProductionAccessEnabled,status:EnforcementStatus}'`. Expected: `production: true`, `status: HEALTHY`. If `false`, stop here; request production access again and do not start P0-T22.
2. In the mail client, reply from `marcm@mccorlabs.com` to the P0-T20 email (Reply-To is the outside address).
3. At the outside mailbox, confirm arrival in the inbox, not spam. Open the original headers and confirm `dkim=pass header.d=mccorlabs.com` and `spf=pass`.
4. Record here: Gate passed on: _date_, outside provider: _name_, DKIM: _pass/fail_.

### P0-T22 laptop: privacy text for the live form

Branch: `feat/contact-go-live` from main, created after P0-T21 passes.
Files: Edit `app/web/src/content/legal.ts`. Create `app/web/src/content/legal.test.ts`.
Interfaces: Produces the privacy text the owner approves in P0-T23.

- [ ] Step 0: Only if P0-T11 Step 5 was skipped. Run `test -f app/web/src/test/noClaims.ts`. If it now exists, create `app/web/src/content/ui.test.ts` exactly as in P0-T11 Step 5, run `pnpm -F web test:run src/content/ui.test.ts` (expected: PASS, 4 tests) and commit it alone with `git add app/web/src/content/ui.test.ts` and `git commit -m "test(web): check contact strings for banned claims"`. If it still does not exist, stop and tell the owner that the contact claims check waits for phase 1's `noClaims.ts`; continue with Step 1.
- [ ] Step 1: Write the failing test `legal.test.ts`.

```ts
import { describe, expect, it } from 'vitest'
import { privacy } from './legal'

function allText(): string {
  return privacy.sections
    .flatMap((section) =>
      section.blocks.flatMap((block) => ('items' in block ? block.items : [block.text])),
    )
    .join(' ')
}

describe('privacy policy for the live contact form', () => {
  it('says the message is emailed to us and stored nowhere else', () => {
    expect(allText()).toContain('emails your message to us')
    expect(allText()).toContain('does not save your message anywhere else')
  })

  it('names the 7-day counter and the 3-day log', () => {
    expect(allText()).toContain('deleted automatically after 7 days')
    expect(allText()).toContain('technical log for 3 days')
  })

  it('explains the fill-time check', () => {
    expect(allText()).toContain('within 3 seconds')
  })
})
```

Adjust `allText` to the block union in `app/web/src/content/types.ts` if its field names differ; read that file first.

- [ ] Step 2: Run `pnpm -F web test:run src/content/legal.test.ts`. Expected: FAIL on all three.
- [ ] Step 3: In `legal.ts`, section "What we collect, and when", after the paragraph ending "We do not have a mailing list." (`legal.ts:55`), insert:

```ts
        {
          kind: 'p',
          text: 'When you press Send, the form goes over HTTPS to a small program we run on Amazon Web Services. It checks the form, adds one to a count of today’s messages, and emails your message to us. It does not save your message anywhere else.',
        },
        {
          kind: 'p',
          text: 'The daily count is a number next to today’s date and holds nothing about you. It is deleted automatically after 7 days.',
        },
        {
          kind: 'p',
          text: 'The program keeps a technical log for 3 days: the time, whether the message was sent, and a reference number. It never logs your name, email address, company, budget or message.',
        },
        {
          kind: 'p',
          text: 'If the form is sent within 3 seconds of the page opening, we ask you to send it again. People rarely type that fast; scripts do.',
        },
```

Change the "Server logs" paragraph (`legal.ts:90`) text to: `'We do not keep server access logs for this website. The contact form’s 3-day technical log is described above.'`

- [ ] Step 4: Run `pnpm -F web test:run && pnpm -F web exec tsc --noEmit && pnpm -F web lint && pnpm format:check`. Expected: all pass.
- [ ] Step 5: Commit.

```bash
git add app/web/src/content/legal.ts app/web/src/content/legal.test.ts
git commit -m "feat(web): describe the live contact form, daily count and log in the privacy policy"
```

### P0-T23 OWNER: approve the privacy text

1. Read `git show HEAD -- app/web/src/content/legal.ts` on `feat/contact-go-live`.
2. Approve as written, or give replacement wording. Any change goes back to P0-T22 Steps 3 to 5 with the test strings updated to the approved wording.
3. Record: `Ruling (owner): privacy text for phase 0 approved on <date> (cost if wrong: the policy misdescribes the form).`

### P0-T24 laptop: set the contact endpoint

Files: Edit `app.env`.
Interfaces: Produces `NEXT_PUBLIC_CONTACT_ENDPOINT=/api/contact` in every build that reads `app.env` (laptop `pnpm build` and the deploy `build` job, which keeps `^NEXT_PUBLIC_` lines, `deploy.yml:85`).

- [ ] Step 1: Re-read `app.env`. Add after the `NEXT_PUBLIC_BOOKING_URL` line:

```
NEXT_PUBLIC_CONTACT_ENDPOINT="/api/contact"
```

- [ ] Step 2: Prove `op run` passes the plain value through.

```bash
op run --env-file=app.env -- printenv NEXT_PUBLIC_CONTACT_ENDPOINT
```

Expected: `/api/contact`. If it prints anything else, stop and report.

- [ ] Step 3: Build and check the output.

```bash
pnpm build
grep -rl '/api/contact' app/web/out/_next/static | head -1
grep -c 'Send message' app/web/out/contact/index.html
```

Expected: the build succeeds; one chunk path is printed; the count is at least 1 (the live form renders instead of the mailto fallback).

- [ ] Step 4: Commit.

```bash
git add app.env
git commit -m "feat(web): turn on the contact form at /api/contact"
```

### P0-T25 OWNER: merge 2 and live check

1. Push `feat/contact-go-live`, open a PR, wait for green `CI`, merge. `Deploy` runs.
2. In a private browser window open `https://mccorlabs.com/contact/`. Wait at least 3 seconds, fill the form with an outside address, press Send. Expected: the status line reads "Thanks — your message has reached us. Reference XXXXXXXX." and the email arrives.
3. Press Send again immediately on a reloaded page (under 3 seconds). Expected: "That was quicker than we expect from a person. Please press Send again.", with the fields still filled.
4. Check the log has no visitor fields: `a logs tail /aws/lambda/mccorlabs-contact --since 15m`.
5. Open `https://mccorlabs.com/privacy/` and confirm the approved text is live.
6. Decide whether `ui.formSuccess` should promise a reply time again now that the SES gate has passed. Record: `Ruling (owner): reply-time promise <restored as "<text>" | left out> on <date> (cost if wrong: a promise the owner cannot keep, or less reassurance for visitors).` A restored promise is a one-line `ui.formSuccess` change on a new branch, with the P0-T11 success test updated to the new text.

## Self-review against the spec

- Spec "Set `NEXT_PUBLIC_CONTACT_ENDPOINT=/api/contact` in `app.env`": P0-T24, plus P0-T12 because `env.ts` would otherwise throw on a relative path (gap found in `env.ts:15-23`).
- "`submitContact` adds `x-amz-content-sha256`": P0-T9 and P0-T10; confirmed required by AWS docs in P0-T1.
- Lambda `contact` step 1 (honeypot, 3 seconds, client sends elapsed ms): P0-T5, P0-T7, P0-T11.
- Step 2 (same validation rules): P0-T5, mirrored cases; drift risk in Rulings.
- Step 3 (conditional counter, `CONTACT_DAILY_CAP` default 50, 429 `{"reason":"daily_cap"}`): P0-T4, P0-T7, P0-T13, P0-T14.
- Step 4 (one plain-text email via SES v2 from the `mccorlabs.com` identity): P0-T6, P0-T13 IAM, P0-T16 identity output.
- Step 5 (200 with reference, store no body): P0-T7; no write path stores the body; logs tested in P0-T7.
- Client errors (400 split into `validation` and `too_fast`, 429 split into `rate_limit` and `daily_cap`, 5xx server, `ui.formErrorDailyCap`, `ui.formErrorTooFast`, values kept): P0-T10, P0-T11.
- `daily_cap` and `server` show the address as a `mailto:` link carrying the subject and the current message, capped at 1,500 encoded characters like phase 1's `labMailtoHref`: P0-T10 (`contactMailtoHref`), P0-T11.
- Success text makes no reply-time promise: P0-T11; the owner decides on restoring one after the SES gate in P0-T25 Step 6.
- New contact strings (`formErrorTooFast`, `formErrorDailyCap`, `formErrorServer`, `formSuccess`) pass phase 1's shared `assertNoClaims`: `ui.test.ts` in P0-T11 Step 5, or P0-T22 Step 0 when phase 1 merges later (Ruling: contact claims check).
- Privacy text in the same release: P0-T22, P0-T23, shipped with the endpoint flip in P0-T25.
- Launch gate (hole 1): P0-T21 blocks P0-T22 onward.
- Spec Node 22 versus this plan's `nodejs24.x`: deliberate, see Rulings.
- Shared names honoured: `app/api` package `api`, `src/handlers/contact.ts`, `src/lib/counter.ts` `takeUnit` signature, `src/lib/http.ts` `json` and `parseJsonBody`, table `mccorlabs-lab` with `pk` and `expiresAt`, key `contact#<YYYY-MM-DD>`, module `lab_api` with `api_origins` and `function_arns`, `static_site` variable `api_origins` with default `[]`, `signedPostJson`, `/api/contact`. Additions: `static_site.api_function_arns` and the `lambda:InvokeFunction` permission (Rulings).
- Spec testing gates per task: web and api triplets, format check, terraform fmt, validate, tflint, trivy, `terraform test` for both modules.
- Not covered by design: reserved concurrency, WAF, per-visitor limits (spec Out of scope or Rulings).

## Review fixes 2026-10-13

Ruling: milestone M3 (review fixes) runs before the M1 and M2 owner gates in the ledger, since none of its tasks depend on them (cost if wrong: none; ordering only).
Ruling: P0-T26 is accepted but not committed, because support.ts also holds the uncommitted P0-T24 work that waits on owner gates T21 and T23 (cost if wrong: the guard ships only with P0-T24).
Ruling: the contact POST timeout races the request against a 15 s timer instead of aborting fetch, matching postLab and keeping the signedPostJson call shape (cost if wrong: a timed-out request keeps running in the background until the browser drops it).
Ruling: a request that times out after the server already sent the email may lead the visitor to resend through the mailto offer (cost if wrong: one duplicate enquiry).
Ruling: the submit button uses aria-disabled while sending and after sent, so focus stays on it and the status live region announces once (cost if wrong: a pointer user sees a dimmed button that still takes focus).
