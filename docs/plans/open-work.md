# Open work

Created: 2026-10-17. Last update: 2026-10-17.

Verified not done on 2026-10-17 against the repo, origin/main and the live site. Replaces planned-enhancements, site-holes and LEFTOVERS.

## Owner content and legal

- 6 `TODO(owner)` live in `app/web/src/content/legal.ts`: 6 (privacy date), 21 (PO box), 277 (terms date), 284 (attorney review), 329 (liability wording), 338 (governing law).
- Named client claims with no case study: `proof.ts:4-5`, `services.ts:54`, `team.ts:10`. `/work/` is a stub, indexable (200, no noindex), still shown in `substance.ts:107` excerpt.
- `careers.ts:72` "four engineers"; only 2 of 4 titles are engineering.
- Careers roles lack location, pay, employment type; `legal.ts` has no applicant/CV section.
- Services says "how we price it" (`services/page.tsx:13,21`), shows no price.
- "Senior" wording (`site.ts:4,6`) vs founder bio (`team.ts:10`).
- Team names are initials only, no profile links.
- No social proof: no testimonials, LLC name, address or profile links (`Footer.tsx:36`).
- No Services-page link to the lab.

## Should This Be AI: phase 1-3 leftovers

- P1-T28: 5 moderated sessions + screen-reader check (no evidence).
- P2-T11: recorded traces (`app/web/src/content/lab/traces/` missing).
- P2-T12..T33: lab handler, replay loader, Lambda + Function URL, `/api/lab/*` (handlers dir has only contact/digest/feedback).
- P2-T35: `NEXT_PUBLIC_LAB_LIVE` absent from `app.env`.
- P3-T1: "Confirmed" column empty (phase-3 plan ~162-187).
- P3-T30: no eval trace committed (`content/lab/evals/` has only `.gitkeep`).
- Phone-field plan T8: `contactInput.ts:33` still accepts `phone === ''`.

## Site engineering

- CSP report-only, no report target (`static_site/main.tf:47,78`).
- No canonical, `og:url`, JSON-LD; `og:locale` is `en` (`layout.tsx:22`).
- Home `<title>` is "McCor Labs"; H1 is slogan only.
- No `/.well-known/security.txt`, no `/llms.txt`.
- `/favicon.ico`, `/apple-touch-icon.png` 404; apple icon is SVG (`layout.tsx:19`).
- 404 page title "McCor Labs"; `/index.html` serves 200; unknown paths 301 before 404.
- Media/fonts `max-age=86400` (`deploy.yml:188`); hero video 1.09 MB.
- No hard TBT/LCP-time/JS-weight budget (`budgets.spec.ts:11-15`).
- Deploy has no test gate: `deploy.yml` needs only build+terraform; `ci.yml` runs on PR only.
- DNS: DMARC `p=none`, no MTA-STS, TLS-RPT, CAA.

## Accepted risks (unchanged)

- No WAF / per-visitor rate limit (no `wafv2` in `infra/`).
- `github-terraform` has AdministratorAccess (`infra/bootstrap/iam.tf:30`).
- No SES configuration set.
- Brake doesn't deny `dynamodb:UpdateItem` (`lab_api/brake.tf`).

## Roadmap not started (from planned-enhancements)

- Spend brake extras: tag-filtered AI budget, tagged inference profiles, Cost Anomaly Detection, c11 cost-ledger page.
- Studio-facts file (rate card), AI inquiry desk + c05, call-notes drafter, hourly canary + c07, weekly inquiry report, c08 Your Request Explained, c10 drift ledger, c12 game-day drills, weekly client updates, c09 edge page weight, c02 document X-ray (re-check Haiku 4.5 EOL, passed 2026-10-16), private work memory, client email triage, site assistant, c06 MCP server. (c01 rejected.)

## Unverified (need live AWS or you, not on the list above)

SES production access (P0-T21), privacy approvals (P0-T23, P2-T31, P3-T29), live form email check (P0-T25), P2-T1 pre-flight, P2-T34 cost gate, P3-T20/T21 `terraform plan` checks, mailbox MFA claim (`legal.ts:193`), mobile Lighthouse (last 59).
