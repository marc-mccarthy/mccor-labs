---
agent: ml-pipeline-full (Claude Code session mccor-labs-e9)
date: 2026-10-05
repo: mccor-labs
commit: df8e79b (main), reviewed on branch feat/ci-terraform-apply
scope: parked infra/main.tf:58-115, infra/outputs.tf:5-17, infra/modules/{auth,database,api}
reference: legacy-benefits-mn main 5f38168 (read-only)
outcome: parked blocks and modules deleted after this review
confidence: V = verified by command/file read, D = AWS docs read, M = from memory (unverified)
---

# Parked backend modules (auth, database, api): review

## Verdict

Not usable with this repo. Deleted. Rebuild as one small module only when the contact form needs a backend.

## Facts

| #   | Claim                                                                                                                                                  | Evidence                                                                                                                                | Conf |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | Root parked block fails `terraform validate`: undeclared `local.web_dir`                                                                               | `infra/main.tf:110-111`; validate on a scratch copy                                                                                     | V    |
| 2   | `module "api"` source_dir `../app/api` does not exist                                                                                                  | `infra/main.tf:82`; `ls app` = `web` only                                                                                               | V    |
| 3   | `aws_s3_object.web` would overwrite the Next.js `index.html`                                                                                           | `infra/main.tf:102-114`                                                                                                                 | V    |
| 4   | `config.js` object is deleted by publish `sync --delete` and read by no app code                                                                       | `infra/main.tf:90-100`; no `APP_CONFIG` reader in app/web                                                                               | V    |
| 5   | Each module validates alone on aws 6.66.0; trivy 0.74.0: 0 HIGH/CRITICAL (db AWS-0024 MED, AWS-0025 LOW; api AWS-0001 MED, AWS-0017 LOW, AWS-0066 LOW) | scratch run                                                                                                                             | V    |
| 6   | auth: self-signup default true + api accepts any valid JWT = any stranger gets full CRUD                                                               | `modules/auth/variables.tf:21-25`, `modules/api/main.tf:125-126`                                                                        | V    |
| 7   | auth: Cognito LITE + `managed_login_version = 1` = classic hosted UI only; new managed login needs Essentials                                          | `modules/auth/main.tf:14,72`; Cognito pricing page                                                                                      | V, D |
| 8   | database: DynamoDB PROVISIONED 5/5, no autoscaling, PITR off                                                                                           | `modules/database/main.tf:12-14`, `variables.tf:24-28`                                                                                  | V    |
| 9   | api: `/items` CRUD template, JWT on every route, no handler code (`index.mjs` absent)                                                                  | `modules/api/variables.tf:37`, `main.tf:125-126`                                                                                        | V    |
| 10  | Only backend consumer in app/web: contact form, unauthenticated JSON POST to `NEXT_PUBLIC_CONTACT_ENDPOINT` (unset, so mailto fallback)                | `app/web/src/lib/env.ts:46`, `contact.ts:43-59`, `components/contact/ContactForm.tsx:29`; `app/web/.env` has only SITE_URL, BOOKING_URL | V    |
| 11  | Site is a static export: no server routes possible in Next                                                                                             | `app/web/next.config.ts:4`                                                                                                              | V    |
| 12  | CSP `connect-src 'self'` (report-only today) would block a cross-origin execute-api URL once enforced                                                  | `infra/modules/static_site/main.tf:45,76`                                                                                               | V    |
| 13  | POST through CloudFront OAC to a Lambda Function URL requires client `x-amz-content-sha256` of the body                                                | CloudFront OAC-for-Lambda docs                                                                                                          | D    |
| 14  | legacy-benefits-mn sends that header from the browser                                                                                                  | legacy `src/lib/post-json.ts:2,17`                                                                                                      | V    |
| 15  | legacy stores DB password and app secrets in plain Lambda env vars                                                                                     | legacy `infra/compute.tf:33,299`                                                                                                        | V    |
| 16  | `nodejs24.x` Lambda runtime supported to 2028-04-30                                                                                                    | Lambda runtimes page                                                                                                                    | D    |

## Best current options (small marketing site; forms, little data, maybe admin login)

| Area                | Parked                       | Recommended                                                                                            | Idle $/mo       | Conf               |
| ------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------ | --------------- | ------------------ |
| API                 | HTTP API + JWT, cross-origin | Lambda Function URL (AWS_IAM) behind existing CloudFront with OAC at `/api/*`; same origin, no CORS    | ~0              | D                  |
| Spam/auth for forms | none                         | Cloudflare Turnstile server check; no user auth                                                        | 0               | V (legacy pattern) |
| Data                | DynamoDB provisioned         | DynamoDB on-demand; Aurora DSQL if relational                                                          | ~0              | D                  |
| Not recommended     |                              | Aurora Serverless v2: needs VPC, ~15 s resume from auto-pause fails short form timeouts; RDS always-on | storage / ~12+  | D / M              |
| Admin login         | Cognito Lite, open signup    | Cognito Essentials, invite-only, TOTP MFA; only if needed                                              | 0 under 10k MAU | D                  |

## Reuse when building the contact backend

- Model: legacy `infra/compute.tf` (Function URL + OAC + `/api/*` behavior), `src/api/index.ts` route map, `src/lib/post-json.ts` (payload hash), `src/lib/security/turnstile.ts`.
- Do not copy: plain-env secrets (fact 15); Aurora + VPC for form data.
- Send mail via the SES identity in `modules/mailserver` (`main.tf:26-41`).

## Unverified

- DynamoDB free-tier 25 RCU/WCU, Lambda/CloudFront free tiers, RDS smallest-instance cost, COGNITO_DEFAULT email daily cap.
