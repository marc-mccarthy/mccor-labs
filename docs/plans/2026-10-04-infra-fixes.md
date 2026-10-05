# Infra $0 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix F5, F4, F16, F11, F12, F14, F7, F13, F15, F22 and F2 from the infra review. Every fix costs $0 a month, and the website keeps all of its functionality.

**Architecture:** All changes are edits in place under `infra/`, on top of the owner's uncommitted work. Task 5 adds one new module. Each task is implemented by a Terraform/AWS implementer agent and then checked by a different reviewer agent before the next task starts. Agents never apply. The only live AWS command is `./infra/deploy.sh plan` in Task 6.

**Tech Stack:** Terraform 1.16.1, hashicorp/aws 6.66.0 (locked), CloudFront Functions `cloudfront-js-2.0`, bash (`deploy.sh`), node 26 `node:test`, tflint 0.64.0, trivy 0.74.0.

**Spec:** `docs/plans/2026-10-04-infra-review.md`. Finding IDs (F-numbers) refer to that document.

## Global Constraints

- Owner decisions, 2026-10-04:
  - Edit in place on `feat/website-phase-1`. Nothing is committed, staged or stashed; the owner reviews and commits.
  - Agents may run `./infra/deploy.sh plan` (Task 6 only). Never apply, import, run `state`, destroy, or `publish`.
  - F2 is opt-in: the role is used only when an AWS profile named `publish` exists.
  - The CSP ships as `Content-Security-Policy-Report-Only`.
- The owner lifted the "never touch `infra/`" rule for this plan only. `app/` stays untouched: another session works there.
- Preserve every uncommitted owner line not named in a task. Never `git checkout` or `git restore` anything under `infra/`. Create no backup files.
- No new comments, except a short why-comment for a non-obvious gotcha. Do not delete existing comments: that is out of scope, and the owner decides it separately.
- No provider or Terraform upgrades. `.terraform.lock.hcl` must not change.
- Never install anything and never change mise config. Run linters by absolute path:
  - `~/.local/share/mise/installs/tflint/*/tflint`
  - `~/.local/share/mise/installs/trivy/*/trivy`
- Never print a secret value. The only `op` use allowed is the counting check in Task 1 and whatever `deploy.sh plan` does itself.
- Only one implementer runs at a time.
- CloudFront Function code is limited to 10 KB on runtime 2.0. Before using any JS feature, check it against <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-features.html>.
- Every task ends with a green run of:
  - `terraform fmt -check -recursive infra`
  - `terraform -chdir=infra validate`, which requires the existing `infra/.terraform`; do not re-init.
  - `bash -n infra/deploy.sh && shellcheck -x infra/deploy.sh`
  - that task's own tests

## Review Focus

1. **Redirect loop.** If `PRIMARY_HOST` renders with different case or a trailing dot, every request 301s to itself. Task 3 tests a mixed-case alias, rendered through `lower()`.
2. **Publish guard false positive.** A legitimate new file type (`.ico`, `.webmanifest`) blocks publish. The error must name the file and say where the allow-list lives. Task 4 asserts the message.
3. **Stale `404/` and `_not-found/` objects already in the bucket.** Removing them from `STAGE`, rather than using `--exclude`, lets the existing `--delete` pass remove them from S3. Task 4 checks that `STAGE` no longer has them.
4. **HSTS `includeSubDomains` versus an HTTP-only subdomain.** Today only `mail.` port 80 (ACME, not a browser) and the CloudFront HTTPS copies exist. The Task 2 reviewer must grep `infra/` for any other http-only hostname.
5. **Missing opt-in profile.** When there is no `publish` profile, publish must behave exactly as today (`terraform` profile, else `default`). Task 5 reviewer checks it by reading the `deploy.sh` branch.

## Agents

| Role        | `subagent_type`         | Model | Persona                                       | Skills, invoked first                                                                   | MCP                                                                                                                                                                                 |
| ----------- | ----------------------- | ----- | --------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementer | `fable-baton:architect` | opus  | Terraform + AWS CloudFront/IAM engineer       | `terraform:terraform-style-guide`, `terraform:terraform-test`, `security-and-hardening` | `mcp__terraform-registry__get_provider_details`, `mcp__plugin_aws-agents_awsknowledge__aws___search_documentation`, `mcp__plugin_aws-agents_awsknowledge__aws___read_documentation` |
| Reviewer    | `verifier`              | opus  | Adversarial AWS security + Terraform reviewer | `doubt-driven-development`, `terraform:terraform-policy`, `code-review-and-quality`     | same, read-only                                                                                                                                                                     |

- The reviewer gets the task text, the finding text from the spec and `git diff -- <task files>`. It does not get the implementer's report.
- The reviewer re-runs every check itself and returns `VERDICT: AGREE | OBJECT` with `file:line` and a required fix.
- On OBJECT, the lead decides. After 3 failed rounds on one task, stop and report to the owner.
- The deny-list from the review applies to every agent. Never call any of these `mcp__plugin_aws-serverless_*` tools: `deploy_webapp`, `sam_*`, `configure_domain`, `update_webapp_frontend`, `get_metrics`. Run no `aws` CLI commands.

---

### Task 1: F5 — reference the 1Password item by ID

**Files:**

- Modify: `infra/settings.auto.tfvars.tpl:12-44`. Every `op://Development/mccorlabs-infra/` becomes `op://Development/qtxqnkc35hhbcnufogpx6vsd74/`.

**Interfaces:** Produces a template that `op inject` resolves. Task 6 depends on it.

- [ ] **Step 1: Prove the failure.** Run `op inject -i infra/settings.auto.tfvars.tpl 2>&1 >/dev/null | head -1`. Expected: `"mccorlabs-infra" isn't an item in the "Development" vault`.
- [ ] **Step 2: Edit the references.** Use the ID form, which `infra/terraform.env` already uses. Change nothing else in the file.
- [ ] **Step 3: Check that it resolves.** Run `op inject -i infra/settings.auto.tfvars.tpl | grep -c 'op://'`. Expected: exit 0 and output `0`. The values go only to `grep -c` and are never displayed.
- [ ] **Step 4: Run the global checks.** Expected: all pass.

### Task 2: F4 + F16 — security headers policy and HTTP/3

**Files:**

- Modify: `infra/modules/static_site/main.tf`
  - Add `locals { csp = ... }`.
  - Add `resource "aws_cloudfront_response_headers_policy" "site"`.
  - Set `response_headers_policy_id` in `default_cache_behavior` (`:70-82`).
  - Set `http_version = "http2and3"` on the distribution (`:56`).
- Create: `infra/modules/static_site/tests/static_site.tftest.hcl`

**Interfaces:** Produces `aws_cloudfront_response_headers_policy.site` and `local.csp`. Moving the CSP to enforced later is a one-line move of `local.csp`, from the custom header into `security_headers_config.content_security_policy`.

Exact values:

- `name = "${var.name}-security-headers"`
- `strict_transport_security`: `access_control_max_age_sec = 31536000`, `include_subdomains = true`, `preload = false`, `override = true`
- `content_type_options { override = true }`
- `frame_options`: `frame_option = "DENY"`, `override = true`
- `referrer_policy`: `referrer_policy = "strict-origin-when-cross-origin"`, `override = true`
- `custom_headers_config` items, each with `override = true`:
  - `Content-Security-Policy-Report-Only` = `local.csp`
  - `Permissions-Policy` = `camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `local.csp` = `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
  - `upgrade-insecure-requests` is left out on purpose: browsers ignore it in Report-Only and log a warning, and HSTS plus redirect-to-https already cover it.

- [ ] **Step 1: Write the failing test.** `static_site.tftest.hcl` uses `mock_provider "aws"`, with `override_data` for `data.aws_cloudfront_cache_policy.optimized` (`id = "658327ea-f89d-4fab-a63d-7e88639e58f6"`) and for `data.aws_iam_policy_document.site` (`json = "{}"`). It has variables `name = "t"`, `aliases = ["example.com", "www.example.com"]`, `certificate_arn = "arn:aws:acm:us-east-1:111111111111:certificate/x"`, and `run "headers" { command = plan }` asserting:
  - `aws_cloudfront_distribution.site.http_version == "http2and3"`
  - the HSTS max-age is `31536000`, and `include_subdomains` and `override` are true
  - `frame_option == "DENY"`
  - the custom header set contains `Content-Security-Policy-Report-Only` with value `local.csp`, and `Permissions-Policy`
  - `strcontains(local.csp, "script-src 'self' 'unsafe-inline'")`, and `!strcontains(local.csp, "upgrade-insecure-requests")`
  - The distribution's `response_headers_policy_id` cannot be asserted under mocks. The reviewer checks it by reading the code.
- [ ] **Step 2: Run the test and see it fail.** `terraform -chdir=infra/modules/static_site init -backend=false` writes `.terraform` inside the module dir; delete only that dir at the end of the task. Then `terraform -chdir=infra/modules/static_site test`. Expected: FAIL on the missing resource and attributes.
- [ ] **Step 3: Implement the values above.** Check each argument name against aws 6.66.0 `aws_cloudfront_response_headers_policy` via the terraform-registry MCP.
- [ ] **Step 4: Run the test again.** Expected: PASS.
- [ ] **Step 5: Run trivy on the module.** Expected: trivy no longer reports a missing response headers policy, and nothing new above LOW appears.
- [ ] **Step 6: Run the global checks.** Expected: all pass.

### Task 3: F11 + F12 + F14 — CloudFront Function

**Files:**

- Modify: `infra/modules/static_site/viewer_request.js.tftpl` (rewrite the logic and drop `REDIRECT_HOSTS`)
- Modify: `infra/modules/static_site/main.tf:47-53`. `templatefile` takes only `primary_host = lower(var.aliases[0])`. Update the comment at `:38-41` to match the new behaviour.
- Modify: `infra/modules/static_site/variables.tf`. Delete `variable "redirect_hosts"` (`:22-31`).
- Modify: `infra/main.tf:46-47`. Delete the `redirect_hosts` argument and its comment line.
- Create: `infra/modules/static_site/tests/viewer_request.test.mjs`
- Modify: `infra/modules/static_site/tests/static_site.tftest.hcl`. Add a `run "function"` that asserts the function code contains `var PRIMARY_HOST = "example.com";` (with alias `"Example.com"`) and does not contain `REDIRECT_HOSTS`.

**Interfaces:** `handler(event)` behaves as follows, in this order:

1. If `host !== PRIMARY_HOST`, return a 301 to `https://` + PRIMARY_HOST + `uri` + query string. This covers www and `*.cloudfront.net`.
2. If `uri` ends in `/`, append `index.html` and pass the request on.
3. If the last path segment has no `.`, return a 301 to `uri + '/'` + query string, on the same host.
4. Otherwise pass the request on unchanged.

The query string is `?` + raw string, or empty. Use `request.rawQueryString()` if the AWS helper-methods page confirms it on runtime 2.0. If it does not, keep a joiner that emits a bare `key` when a parameter has no value.

- [ ] **Step 1: Write the failing node test.** The test renders the template by replacing `${jsonencode(primary_host)}` with `JSON.stringify("example.com")`, then loads `handler` with `new Function`. The event stub provides `request.rawQueryString()`. Cases are `host, uri, raw query → expected`:
  - `example.com`, `/`, `` → request uri `/index.html`
  - `example.com`, `/services/`, `` → `/services/index.html`
  - `example.com`, `/services`, `a=1` → 301 `location` `https://example.com/services/?a=1`
  - `example.com`, `/services/index.txt`, `_rsc=x` → passes through unchanged
  - `example.com`, `/_next/static/chunks/a.js`, `` → passes through
  - `example.com`, `/v1.2/foo`, `` → 301 to `/v1.2/foo/`
  - `www.example.com`, `/services/`, `flag` → 301 `https://example.com/services/?flag`
  - `d111.cloudfront.net`, `/about`, `` → 301 `https://example.com/about`
  - `www.example.com`, `/x`, `utm=a%20b&a=1&a=2` → 301 with the query byte-identical
- [ ] **Step 2: Run it and see it fail.** Run `node --test infra/modules/static_site/tests/`. Expected: FAIL on the no-slash case and the cloudfront.net case.
- [ ] **Step 3: Implement.** Rewrite the template, then make the `main.tf`, `variables.tf` and root `main.tf` edits. Check that the rendered code is under 10 KB.
- [ ] **Step 4: Run the node tests and the terraform test.** Expected: PASS.
- [ ] **Step 5: Run the global checks.** Expected: all pass. The root `validate` must not mention `redirect_hosts`.

### Task 4: F7 + F13 + F15 + F22 — publish pass in `deploy.sh`

**Files:**

- Create: `infra/publish-guard.sh`. It defines `check_publish_stage STAGE_DIR REPO_ROOT`, which returns non-zero with messages on stderr. It is sourced, not executed.
- Modify: `infra/deploy.sh:302-360`
  - Source the guard.
  - Call it after the robots.txt check (`:318-321`).
  - Remove `STAGE/404` and `STAGE/_not-found` after the guard.
  - Add the media cache class.
  - Delete the second `_next/static` sync, the `--delete` one at `:350-351`.
- Create: `infra/tests/publish-guard.test.sh`. A plain bash test using `mktemp -d` fixtures. It exits non-zero on the first failure.

**Interfaces:**

- `check_publish_stage` fails (exit 1) if any of these holds:
  - (a) a file under STAGE has a basename starting with `.`
  - (b) a file has an extension outside `html txt js css json xml woff2 webp avif jpg svg mp4 webm glsl`
  - (c) a file's basename equals the basename of any file under `REPO_ROOT/rejected-media/` (recursive)
  - (d) `git -C REPO_ROOT ls-files --others --ignored --exclude-standard -- app/web/public` is non-empty
- Each failure prints the offending path and `allowed extensions are set in infra/publish-guard.sh`.
- In `deploy.sh`, add `MEDIA="public, max-age=86400, stale-while-revalidate=604800"`. Upload order:
  1. `_next/static/` with IMMUTABLE
  2. `media/` and `fonts/` with MEDIA
  3. the rest with REVALIDATE, using `--exclude "_next/static/*" --exclude "media/*" --exclude "fonts/*"`

  After the invalidation, the deferred `--delete` passes run only for `media/`, `fonts/` and the rest. `_next/static/` is never deleted from, so old chunks stay for tabs still open on the previous build. They cost about 1.7 MB a build; there is no pruning (YAGNI).

- [ ] **Step 1: Write the failing test.** Fixtures and expected results:
  - a clean stage → exit 0
  - a stage with `media/brand/.DS_Store` → exit 1, and the message contains `.DS_Store`
  - a stage with `a.psd` → exit 1, and the message contains `allowed extensions`
  - a stage with `media/brand/ai-neural.webp` while `rejected-media/ai-neural.webp` exists → exit 1
  - a temp git repo with an ignored file under `app/web/public` → exit 1
- [ ] **Step 2: Run the test and see it fail.** Run `bash infra/tests/publish-guard.test.sh`. Expected: FAIL, because the guard file does not exist yet.
- [ ] **Step 3: Implement the guard and the `deploy.sh` edits.** Edit only the publish branch; every other owner line stays byte-identical.
- [ ] **Step 4: Run the test.** Expected: PASS. Also run `check_publish_stage` against a copy of the current `app/web/out` and the real repo root. Expected: exit 0. If it fails, quote the output and stop.
- [ ] **Step 5: Run the global checks plus `shellcheck -x infra/publish-guard.sh infra/tests/publish-guard.test.sh`.** Expected: all pass.
- [ ] **Step 6: Manual check, because the S3 passes cannot run without AWS.** Paste the final publish block and walk through the upload order and the delete passes against the Interfaces list above.

### Task 5: F2 — opt-in scoped publish role

**Files:**

- Create: `infra/modules/publish_role/main.tf`, `variables.tf`, `outputs.tf`, `tests/publish_role.tftest.hcl`
- Modify: `infra/main.tf`. After `module "site"`, add `module "publish_role"`. Reuse the existing `data.aws_caller_identity` (`main.tf:21`), which tflint currently flags as unused.
- Modify: `infra/outputs.tf`. Add `output "publish_role_arn"` with a description.
- Modify: `infra/deploy.sh:24-31`. When `ACTION == publish`, `AWS_PROFILE` is unset, and `aws configure list-profiles` contains `publish`, set `AWS_PROFILE=publish`. Otherwise behave exactly as today.

**Interfaces:**

- Module inputs: `name` (string), `account_id` (string), `site_bucket_arn` (string), `distribution_arn` (string), `state_bucket` (string), `state_key` (string).
- Module output: `role_arn`.
- Root wiring:
  - `state_bucket = "${replace(var.domain_name, ".", "-")}-tfstate"`. The implementer confirms this matches `local.state_bucket` in `infra/setup/main.tf` and `backend.hcl` (`mccorlabs-com-tfstate`).
  - `state_key = terraform.workspace == "default" ? "app/terraform.tfstate" : "env:/${terraform.workspace}/app/terraform.tfstate"`
- Role:
  - name `"${var.name}-publish"`
  - trust policy: principal `arn:aws:iam::${account_id}:root`, action `sts:AssumeRole`
- Inline policy, exactly these statements:
  - `s3:ListBucket` on `site_bucket_arn`
  - `s3:PutObject` and `s3:DeleteObject` on `${site_bucket_arn}/*`
  - `cloudfront:CreateInvalidation` and `cloudfront:GetInvalidation` on `distribution_arn`
  - `s3:ListBucket` on `arn:aws:s3:::${state_bucket}`
  - `s3:GetObject` on `arn:aws:s3:::${state_bucket}/${state_key}`

  The state bucket has no `setup/*` access, by design.

- [ ] **Step 1: Write the failing test.** `publish_role.tftest.hcl` uses `mock_provider "aws"` and `command = plan`. It decodes the role's trust policy and the inline policy JSON with `jsondecode`, and asserts:
  - exactly 5 statements, each with the action set and resource listed above
  - no `"*"` resource
  - no statement mentions `setup/`
  - the trust principal is the account root

  Build the policies with `jsonencode` or the `aws_iam_policy_document` data source. With the data source, `override_data` is needed in the test, so prefer `jsonencode`.

- [ ] **Step 2: Run `terraform -chdir=infra/modules/publish_role init -backend=false && terraform -chdir=infra/modules/publish_role test`.** Expected: FAIL.
- [ ] **Step 3: Implement the module, the root wiring, the output and the `deploy.sh` profile branch.**
- [ ] **Step 4: Run the test.** Expected: PASS. Then run root `validate` and tflint. Expected: the `aws_caller_identity` unused warning is gone and no new warnings appear.
- [ ] **Step 5: Run the global checks.** Expected: all pass.
- [ ] **Step 6: Record the profile snippet for the owner.** It goes in the final report, not in any file. The owner adds it to `~/.config/aws/config` themselves:
  ```
  [profile publish]
  role_arn = <publish_role_arn output>
  source_profile = default
  ```
- [ ] **Step 7: Record the stated limit.** This contains damage from mistakes made during publish. It does not contain a leaked admin key: the `default` key can still do everything. Retiring that key (Identity Center or `aws login`) is outside this plan.

### Task 6: Live plan and final review

- [ ] **Step 1: Run the plan.** Run `./infra/deploy.sh plan` from the repo root. It runs `op inject`, which may prompt the owner for Touch ID, then init, `workspace select default` and plan. If 1Password asks for approval, say so in one line and wait.
- [ ] **Step 2: Read the plan.**
  - Expected creates: `module.site.aws_cloudfront_response_headers_policy.site`, `module.publish_role.aws_iam_role.publish`, and its policy.
  - Expected in-place updates: `module.site.aws_cloudfront_distribution.site` and `module.site.aws_cloudfront_function.viewer_request`.
  - Expected destroys: **none**. If any destroy appears (F9: `module.auth`, `module.database`, `module.api`, `aws_s3_object.*`), stop and report it to the owner verbatim.
- [ ] **Step 3: Run the reviews.** Run a reviewer subagent with the built-in `/code-review` skill over `git diff -- infra`, and a fresh Antigravity review (`sandbox: true`, `add_dirs: []`) of the same diff. The lead resolves every OBJECT.
- [ ] **Step 4: Report to the owner.**
  - the plan summary
  - the diff stat
  - every test and lint output
  - the profile snippet and the F2 limit
  - the CSP flip step: after checking the browser console on all 9 routes, move `local.csp` from the Report-Only custom header into `security_headers_config.content_security_policy`
  - a proposed commit message
