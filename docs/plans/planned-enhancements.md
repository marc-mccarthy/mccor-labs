# Planned enhancements

Date: 2026-10-09.

This file ranks the work that could follow the in-flight "Should This Be AI?" phases. It merges two sources. The first is the research archive `mccor-labs-aws-services-reference` (dotfiles repo, `docs/research/`): 12 client-facing showcase concepts (c01 to c12, file `P5.H.json`), 18 target decisions (T01 to T18, file `P6.07.json`) and 9 business tools (`docs/website-ideas.md`, files `I1.json` to `I5.json`). The second is the current plans in `docs/plans/` and the site audit in `docs/findings/2026-10-09-site-holes.md`. Costs are research figures anchored 2026-10-05, us-east-1, USD, rounded to 2 decimals. Each phase gets re-priced when it is designed.

The site is the sales pitch. A prospect should conclude that the studio knows AI, AI pipelines and AWS back-end design by watching working demonstrations, not by reading claims.

## How the list is ordered

1. Rank 0: the in-flight phases 0 to 3. They are listed, not re-ranked.
2. Foundations (ranks 1 to 3): the spend brake, the studio-facts file and the privacy page update. Other items reuse them.
3. Business tools that win or protect leads (ranks 4 to 7), in the research's own order: inquiry desk, call notes drafter, hourly check, weekly inquiry report.
4. Cheap proof pages (ranks 8 to 10): c08 first because it is a hero, then c10 and c12 in the order T15 lists them. c07 and c11 sit inside merged items (ranks 6 and 1).
5. Higher-cost or higher-risk items last (ranks 11 to 17), sorted by research worst case from low to high. Two exceptions: the site assistant moves behind the others because the research rates it high risk, and c06 (MCP server) is last of all.

A merged item takes the rank of its earliest part. Its later part ships when its own tier comes up, and the item says so.

Cost columns hold two figures. For showcase concepts the first is the research idle cost. For business tools the first is the research monthly cost at 30 inquiries and 3,000 visitors a month. The second figure is the worst case at the item's hard limits.

## Ranked table

| Rank | Name                                                               | Type                                   | Cost per month (idle or typical to worst case)                                          | Build days            | Depends on                                                        | Status                               |
| ---- | ------------------------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| 0-P0 | Phase 0: contact backend                                           | Business tool (foundation)             | Near zero (design line 250)                                                             | —                     | SES launch gate (hole 1)                                          | In progress                          |
| 0-P1 | Phase 1: static lab                                                | Client-facing showcase (c04, part 1)   | Near zero (design line 250)                                                             | —                     | Nothing in AWS                                                    | In progress                          |
| 0-P2 | Phase 2: live lab                                                  | Client-facing showcase (c04, part 2)   | c04 research: 0.31 to 16.64. Plan worst case: 11.19, plus 1.80 per 10 million raw POSTs | —                     | 0-P0, 0-P1, rank 1, owner-approved privacy text                   | In progress, conflicts with research |
| 0-P3 | Phase 3: learning loop and evals                                   | Client-facing showcase (c03)           | c03 research: 3.99 to 9.23. Plan expected: about 1.33 for phases 2 and 3 together       | —                     | 0-P2                                                              | In progress, conflicts with research |
| 1    | Spend brake with cost ledger (tool 3 + c11)                        | Business tool + client-facing showcase | Tool: 0.00 to 3.10. c11: 0.60 to 2.88                                                   | 1.5 (tool); c11 —     | 0-P2 (first brake); T15 and Cost Explorer for the ledger page     | Partly built, rest new               |
| 2    | Studio-facts file                                                  | Business tool (foundation)             | Not in research                                                                         | —                     | Owner writes the rate card                                        | New                                  |
| 3    | Privacy page update                                                | Business tool (foundation)             | Not in research                                                                         | —                     | 0-P0, 0-P2, 0-P3 privacy tasks; holes 3 and 4                     | Partly in progress                   |
| 4    | AI inquiry desk with agent-on-a-leash proof (tool 1 + c05)         | Business tool + client-facing showcase | Tool: 0.53 to 7.50. c05: 0.38 to 3.34                                                   | 6 (+1 for test cases) | Ranks 1, 2, 3; 0-P0; durable functions pattern                    | Conflicts                            |
| 5    | Call notes to proposal and case-study drafts (tool 2)              | Business tool                          | 1.83 to 30.50                                                                           | 6                     | Ranks 1, 2, 3; durable functions pattern                          | New                                  |
| 6    | Hourly customer-view check with public proof ledger (tool 4 + c07) | Business tool + client-facing showcase | Tool: 3.79 to 11.79. c07: 3.19 to 3.32                                                  | 3 (tool); c07 —       | Site stack live; shared alerts topic (T12); hole 7                | New                                  |
| 7    | Weekly report: which pages bring inquiries (tool 7)                | Business tool                          | 0.09 to 1.71                                                                            | 4                     | Rank 3; CloudFront standard logging on a non-Free plan            | Conflicts                            |
| 8    | Your Request, Explained (c08)                                      | Client-facing showcase (hero)          | 6.20 to 6.80                                                                            | —                     | T09 web ACL; shared alerts topic (T12)                            | Conflicts                            |
| 9    | Drift ledger (c10)                                                 | Client-facing showcase                 | 0.80 to 3.08                                                                            | —                     | T15 showcase distribution                                         | New                                  |
| 10   | Game day drills (c12)                                              | Client-facing showcase                 | 0.10 to 2.38                                                                            | —                     | T15 showcase distribution                                         | New                                  |
| 11   | Weekly client updates drafted from real work (tool 6)              | Business tool                          | 0.11 to 1.70                                                                            | 7                     | Rank 1; SES production access; durable functions pattern          | New                                  |
| 12   | Edge-chosen page weight (c09)                                      | Client-facing showcase                 | 6.30 to 6.34                                                                            | —                     | Rank 8 (web ACL)                                                  | New                                  |
| 13   | Document X-ray (c02)                                               | Client-facing showcase                 | 0.99 to 9.73                                                                            | —                     | First Step Functions workflow; Claude Haiku 4.5 end-of-life check | Conflicts                            |
| 14   | Private searchable memory of past work (tool 9)                    | Business tool                          | 2.81 to 22.66                                                                           | 3 (+1 to prepare)     | Rank 1; second knowledge base kept apart from rank 16             | New                                  |
| 15   | Client email triage against the signed scope (tool 5)              | Business tool                          | 1.19 to 26.90                                                                           | 9                     | Ranks 1, 2; Route 53 zone and inbound mail record (T03)           | New                                  |
| 16   | Site assistant that answers from your own pages (tool 8)           | Business tool                          | 5.62 to 17.25                                                                           | 6                     | Ranks 1, 3, 8; second knowledge base kept apart from rank 14      | Conflicts                            |
| 17   | This site speaks MCP (c06)                                         | Client-facing showcase                 | 0.97 to 101.91                                                                          | —                     | Public paths proven first (T14)                                   | New                                  |
| —    | Glass-box retrieval (c01)                                          | Client-facing showcase                 | 0.31 to 16.44                                                                           | —                     | —                                                                 | Rejected                             |

Build days come only from the business-tool research. The showcase research gives no build days.

## Rank 0: in-flight phases

The plans are `docs/plans/2026-10-09-should-this-be-ai-design.md` and its four phase plans. The design file says it awaits owner approval of the plans (line 3). Nothing from these branches is merged to main on 2026-10-09. Branch state below was read on that date and moves as work lands.

### 0-P0 Phase 0: contact backend

**What it is.** A Lambda behind the existing CloudFront distribution at `/api/contact`. It checks the form, takes one unit from a daily DynamoDB counter and emails the owner through SES. It stores no message body (design lines 71 to 78).

**Business value.** The contact form is switched off today and says "not live yet" (holes doc, hole 6, line 65). Leads have no form path until this ships.

**Customer value.** A prospect can send a message from the site and gets a reference number. Errors keep what they typed and offer a mailto link (design lines 79 to 83).

**Needs.** CloudFront with a Lambda origin access control, Lambda, DynamoDB, SES v2. It creates the `/api/*` path, the daily-counter pattern and the build and deploy wiring that later items reuse.

**Status.** In progress. Code and infrastructure are committed on `feat/static-lab` (contact handler, `app/api` workspace, `lab_api` module, `/api` origins). Owner tasks P0-T19 to P0-T25 are open, including the SES launch gate: the form does not go live until a reply from a `@mccorlabs.com` mailbox reaches an outside address (`docs/plans/2026-10-09-should-this-be-ai-phase-0-contact-plan.md:2372`). SES production access was denied (holes doc, hole 1, line 57).

### 0-P1 Phase 1: static lab

**What it is.** The page `/lab/should-this-be-ai/`. A visitor lists up to 8 workflow steps and a rubric written in code gives each step one of six verdicts, with the rule as code. It runs in the browser with no AWS call (design lines 89 to 169).

**Business value.** It is the first working demonstration of the studio's judgment about when AI is the wrong tool. It carries the visitor's result to the contact form.

**Customer value.** A business owner learns in minutes which steps need AI and sends the result to the studio in one click.

**Needs.** The static site only. No new AWS service.

**Status.** In progress. The rubric, builder, summary table, contact hand-off, page, footer link and end-to-end tests are committed on `feat/static-lab`. The owner task P1-T28 (five moderated sessions) is the phase gate (`docs/plans/2026-10-09-should-this-be-ai-phase-1-static-lab-plan.md:4312`). The Services-page link waits for hole 2 (design line 58). This delivers the first half of research concept c04.

### 0-P2 Phase 2: live lab

**What it is.** "Race this step" and "Argue the other side" call Amazon Nova 2 Lite on the server, behind a kill flag, global daily caps, a Bedrock guardrail and a Budgets spend brake. The page shows accuracy, time, tokens and cost for each run (design lines 171 to 222).

**Business value.** It shows live AI work under a hard spending limit. Plan worst case is 11.19 USD a month plus 1.80 USD per 10 million raw POSTs (`docs/plans/2026-10-09-should-this-be-ai-phase-2-live-lab-plan.md:94`).

**Customer value.** A visitor sees a model compete with a simple program on their own examples, with the cost shown, and a recorded run when live runs are used up.

**Needs.** Lambda, Function URL with CloudFront origin access control, DynamoDB, SSM Parameter Store (kill flag), Bedrock (Nova 2 Lite and Guardrails), Budgets action.

**Status.** In progress, conflicts with research concept c04 (see the list at the end). Committed on `feat/live-lab` and `feat/learning-loop`: config, validation, kill flag, guardrail wrapper, Converse wrappers, scorer, cost calculator, trace-recording script, guardrail, lab IAM role, 3-day log group and the spend brake. Not found on `feat/learning-loop`: the `lab` handler, the lab Lambda and Function URL, and the live panel components. Owner tasks open: record traces (P2-T11), approve privacy text (P2-T31), cost gate (P2-T34), go live (P2-T35).

### 0-P3 Phase 3: learning loop and evals

**What it is.** Visitors mark a verdict as wrong with one of three fixed reasons. A weekly email counts the marks. A capped GitHub Actions workflow runs the rubric tests plus 20 prompt cases against Nova 2 Lite. The page `/lab/evals/` shows committed run traces, failed runs included, with staged failures labelled (design lines 224 to 232).

**Business value.** It shows a measured AI feature that is checked after launch, at no more than 15 eval runs a month (phase 3 plan line 60).

**Customer value.** A prospect can read real run history, including a run that failed, and see that the studio keeps a failing result visible.

**Needs.** Lambda, DynamoDB, EventBridge Scheduler, SES, GitHub Actions with a narrow OIDC role, Bedrock (Nova 2 Lite and Guardrails).

**Status.** In progress, conflicts with research concept c03. Committed on `feat/learning-loop`: feedback and digest handlers and Terraform, the eval harness, `eval.yml`, the eval OIDC role, the brake extension, and the web feedback copy and client. Not found: the "Wrong?" control, the `/lab/evals/` page and any committed trace (the evals folder holds only `.gitkeep`). This delivers research concept c03 by a different mechanism (see the list at the end).

## Ranked items

### 1. Spend brake with cost ledger (tool 3 + c11)

**Merge.** Tool 3 "automatic brake on AI and AWS spend" and concept c11 "Cost ledger with a tripwire" are one item. The brake is the control. The c11 page is the public proof that the control works. The brake ships first. The ledger page ships with the cheap proof pages, after the T15 showcase-distribution decision.

**What it is.** A budget action that removes permission to call the AI models by itself when the AI budget is used up, plus same-day alerts on unusual spend. The ledger page shows the showcase's month-to-date bill per service against a stated ceiling and a recorded drill of the ceiling being crossed.

**Business value.** The owner stops checking the bill by hand, and a runaway AI feature cannot keep spending. Every later AI item calls a paid model and the research says none should go live without it ("Start here", `website-ideas.md` line 29). Owner time for c11 is 0.5 hours a month.

**Customer value.** Nothing visible for the tool. If the brake trips, AI pages fall back to saved examples. The c11 page shows a prospect real dollars per service and a ceiling that cuts access.

**Needs.** Tool: AWS Budgets with actions, Cost Anomaly Detection, Bedrock application inference profiles, IAM, SNS. c11: Cost Explorer (manual step: confirm it is enabled), Budgets, S3, CloudFront on the flat-rate Free plan, CloudFront Functions, IAM, SNS. It sets up the alerts topic, the AI budget, the tagged model routes and the one-time Bedrock model access that every AI item reuses.

**Status.** Partly built, rest new. The in-flight work covers part of the tool:

- Covered: one Terraform budget action that attaches a deny policy to the lab, feedback, digest and eval roles at 100 percent of actual spend, with an email subscriber (`infra/modules/lab_api/brake.tf` on `feat/learning-loop`, commit "spend brake also denies the feedback, digest and eval roles"). The 80 percent forecast email and 100 percent actual email already exist on a separate monthly budget (`infra/bootstrap/main.tf:18` on main).
- Not covered: a separate AI budget filtered by tag (the brake watches the whole account, default 22 USD, `docs/plans/2026-10-09-should-this-be-ai-phase-2-live-lab-plan.md:79`; the research starts the AI budget at 10 USD); tagged inference profiles (the plans use the system profile); Cost Anomaly Detection (no match in `infra/` or `app/api` on that branch); roles of future AI items (the module accepts only an `evals` extra role); and the whole c11 ledger page and recorded drill.
- Differs from the research: the deny policy also blocks `dynamodb:PutItem`, `dynamodb:Scan` and `ses:SendEmail` on those roles, where the tool blocks model and guardrail calls only (phase 3 plan line 75).

### 2. Studio-facts file

**What it is.** One private S3 file that holds the rate card, the five process stages with durations, and the scope wording. Items 4, 5 and 15 read it.

**Business value.** No AI output invents a price. Every range comes from this file (`website-ideas.md` line 34). The research says the system cannot write the rate card for the owner and asks whether a written rate card exists (`I5.json` open questions).

**Customer value.** Prospects get price ranges and process descriptions that match what the studio publishes. Hole 9 shows the same gap on the Services page today: it promises "how we price it" and shows no price (holes doc line 114).

**Needs.** S3 only. It reuses nothing. No cost is given in the research.

**Status.** New. No plan or branch contains a studio-facts file (search of `docs/plans/` found only the words "rate card" in sample lab text).

### 3. Privacy page update

**What it is.** A rewrite of the privacy policy so that it matches what the site does as each feature ships. The research asks for one rewrite in the release that ships the first affected item (`website-ideas.md` line 37).

**Business value.** It removes legal exposure. Hole 4 lists privacy statements that are not true or not backed today, and hole 3 lists 7 `TODO(owner)` strings that render live on the privacy and terms pages (holes doc lines 130 to 147).

**Customer value.** A reader can trust the policy. The research notes that the policy says no server access logs, no analytics, no chat widget and no CRM, and that tools 1, 7 and 8 each make part of that untrue.

**Needs.** The content file `legal.ts` and counsel for the liability and governing-law wording (holes doc line 134). No AWS service. No cost is given in the research.

**Status.** Partly in progress. The in-flight plans rewrite the parts they touch: the form, the owner email and the 7-day counter (design line 87, task P0-T22), the Bedrock processing and 3-day metadata logs (design line 222, task P2-T30), and phase 3 (task P3-T28). The design leaves the other holes, including team size and `TODO(owner)` strings, out of scope (design line 269). Items 4, 7 and 16 will each need more text.

### 4. AI inquiry desk with agent-on-a-leash proof (tool 1 + c05)

**Merge.** Tool 1 "AI inquiry desk with built-in follow-up" and concept c05 "An agent on a leash" are one item. Both prove the same claim: an AI step is capped in cost and a named person approves before anything leaves. The research builds c05 as a recorded Step Functions replay and tool 1 on Lambda durable functions. The research does not say which engine the merged item uses. This list keeps the desk's engine. Whether to also publish a c05 replay page is an open decision.

**What it is.** Each contact-form message arrives as one email with a fit score from 1 to 5, a summary, a price and duration range from the studio-facts file, three questions and a draft reply. The owner is reminded after 1, 4 and 11 days if no reply goes out.

**Business value.** It saves the first 10 to 15 minutes of reading and drafting per lead and supports the site's promise of a reply within one working day (`website-ideas.md` line 48). Worst case is 7.50 USD a month at 10 AI analyses a day.

**Customer value.** The visitor sees the same form and a fixed thank-you. They never see AI text and receive a human reply. The story it tells is that strangers type into the studio's form, a model reads each message under a spending limit and safety checks, and a person approves every reply. The c05 page, if built, shows a five-step recorded run that stops at a cost gate and waits for approval.

**Needs.** CloudFront, Lambda, Lambda durable functions, DynamoDB, Claude Sonnet 5.5 on Bedrock, Bedrock Guardrails, SES. It reuses the spend brake (rank 1), the studio-facts file (rank 2), the safe public AI path (the T10 pattern, being built by 0-P0 and 0-P2 without the WAF rate rule), the durable functions pattern and the privacy rewrite (rank 3). c05 would add Step Functions and SNS.

**Status.** Conflicts. Phase 0 stores no message body (design line 77; data table line 240). The desk stores each inquiry in DynamoDB for 12 months (`website-ideas.md` line 56). The phase 0 handler and the privacy text must change first. Durable functions are not in any current plan.

### 5. Call notes to proposal and case-study drafts (tool 2)

**What it is.** The owner drops typed notes or a call recording into a private folder. A draft proposal or case study arrives by email with scope, exclusions, assumptions, the five process stages and a price range.

**Business value.** It saves about an hour per proposal (`website-ideas.md` line 108). It also makes case studies routine. Hole 2 says the site's two proof claims have no case study behind them and `/work/` is empty (holes doc lines 74 to 84). A drafter produces drafts only. The owner must still confirm every fact.

**Customer value.** Prospects get sharper proposals that arrive sooner. Nothing about the tool is visible. Nothing is sent to a prospect automatically.

**Needs.** S3, Lambda durable functions, Amazon Transcribe, Claude Sonnet 5.5 on Bedrock, Bedrock Guardrails, SES. It reuses ranks 1, 2 and 3 and the durable functions pattern. Worst case is 30.50 USD at 40 runs a month.

**Status.** New. The research flags client information in recordings and requires ids and sizes only in logs.

### 6. Hourly customer-view check with public proof ledger (tool 4 + c07)

**Merge.** Tool 4 "hourly customer-view check and break-in alerts" and concept c07 "Hourly Proof Ledger" are one item. Both run a scheduled CloudWatch Synthetics canary against the site. One canary schedule feeds the private alerts and the public result file. The research prices them separately (tool 3.79 to 11.79, c07 3.19 to 3.32) and does not give a combined figure. The GuardDuty part of the tool (2.68 of 3.79) is not part of c07. Concept c10 also lists GuardDuty. Whether one enablement serves both is not in the research.

**What it is.** A real browser opens the home, services and contact pages every hour. It checks the status, the form fields, script errors, load time, the HSTS header, the mail server's secure ports and certificate, and the site certificate's expiry. GuardDuty watches the mail server for break-in attempts. The public page `/proof/ledger` shows load time, layout shift and accessibility violations for five key routes against budgets, stamped Recorded with the time of the last check.

**Business value.** The owner learns within the hour that the contact page broke, instead of from a lost lead. Owner time for c07 is 1.5 hours a month.

**Customer value.** A prospect sees the studio's own site measured every hour against published budgets, on WCAG 2.2 AA and timing. Hole 7 reports a mobile home-page performance score of 59 (holes doc line 29). A public ledger would show a miss until that is fixed.

**Needs.** CloudWatch Synthetics, CloudWatch Logs and alarms, GuardDuty, EventBridge rule, SNS (shared alerts topic, T12), S3 and CloudFront for the public result file. Alerts must go to an address outside the mail server being watched.

**Status.** New. It needs the main site stack live. The research assumed it was not applied (T02, T18). The holes audit of 2026-10-09 found CloudFront distribution `E1VLB40ZAFQ7FF` serving `mccorlabs.com` (holes doc line 282).

### 7. Weekly report: which pages bring inquiries (tool 7)

**What it is.** One plain-English email each Monday that names the pages and referrers behind inquiries, the broken links and the slow pages, with the real tables below.

**Business value.** The owner learns which pages win leads without any tracking script. Worst case is 1.71 USD at 10 million requests.

**Customer value.** Nothing visible. No tracking script and no cookie banner.

**Needs.** CloudFront standard logging v2 (not available on the Free flat-rate plan), Athena, EventBridge Scheduler, Lambda, Nova 2 Lite, SNS. It reuses the spend brake and the privacy rewrite. It must filter the canary's browser string from rank 6.

**Status.** Conflicts. The policy says the studio keeps no server access logs, and the design and the audit treat that as a deliberate choice (`legal.ts:30,90` as cited in holes doc line 266; design line 51). The report keeps IP addresses for 35 days. The owner has to reverse that choice and update the policy first. The research also did not confirm that the contact form ends on a thank-you page.

### 8. Your Request, Explained (c08)

**What it is.** A page at `/proof/your-request` that shows the visitor how their own request reached them: edge location, cache result, the security headers they received, and their own device's load time and layout stability against the site's budgets.

**Business value.** It is a hero concept. It proves "websites and UI/UX" and "AWS architecture". It adds no compute, no data store and no new IAM role (T09). Owner time is 1 hour a month.

**Customer value.** The prospect sees their own visit measured against the site's speed and security promises, without being asked for anything. Nothing leaves their browser. The page will show the content security policy as it is. Hole 10 says the policy is report-only today (holes doc line 32).

**Needs.** CloudFront, a response headers policy, one WAF web ACL with a rate rule of 1,000 requests per client IP in five minutes, two CloudWatch alarms to the shared SNS topic. The web ACL is new Terraform. Later items 12 and 16 reuse it.

**Status.** Conflicts. The design excludes AWS WAF from its scope (`docs/plans/2026-10-09-should-this-be-ai-design.md:270`) and names it only as an upgrade path (line 52). The phase 0 plan says WAF is not covered (`...phase-0-contact-plan.md:2522`). No plan task builds a web ACL, so c08 stays new work that the in-flight plans do not block.

### 9. Drift ledger (c10)

**What it is.** A page at `/showcase/architecture/ledger` with a badge showing the date of the last nightly drift check, a drift count with a verdict, and a table of the showcase's AWS services with resource counts. Terraform generates all of it.

**Business value.** It shows that the studio documents what it builds and checks it nightly. Owner time is 1 hour a month.

**Customer value.** A buyer sees which resources exist, what the automation may touch and when it was last verified. This is the runbook a client would inherit.

**Needs.** S3, CloudFront on the flat-rate Free plan, CloudFront Functions (GET and HEAD only), GuardDuty, CloudWatch Logs and alarms, SNS, IAM with one read-only role. T15 puts c10, c11 and c12 on a separate showcase distribution. That decision waits until the main distribution is applied, and no research group judged the flat-rate plan.

**Status.** New.

### 10. Game day drills (c12)

**What it is.** A page at `/showcase/architecture/drills` with three failures caused on purpose, each with a Recorded date, detection and recovery times against a target, and an honest pass or fail verdict.

**Business value.** It shows how the studio handles a bad day. Drills start only from a manual workflow dispatch. Owner time is 1 hour a month.

**Customer value.** A buyer gets measured detection, failover and rebuild times to hold the studio to.

**Needs.** S3 (standby bucket), CloudFront origin group, CloudFront flat-rate Free plan and Functions, Route 53 health checks, CloudWatch alarms, SNS, IAM. Same T15 decision as rank 9.

**Status.** New.

### 11. Weekly client updates drafted from real work (tool 6)

**What it is.** Each Friday the owner gets one email per active client with a draft update built from the week's merged work and one-line notes, with Approve, Redraft and Skip links.

**Business value.** Updates go out every week. Worst case is 1.70 USD a month.

**Customer value.** A client receives a short, consistent weekly email. Nothing is public.

**Needs.** EventBridge Scheduler, Lambda durable functions, Nova 2 Lite, S3, SSM Parameter Store, SES. It reuses the spend brake and the durable functions pattern.

**Status.** New. SES production access was denied, so an approved update lands in the owner's inbox for forwarding until access is granted (`website-ideas.md` line 355; holes doc line 57).

### 12. Edge-chosen page weight (c09)

**What it is.** A page at `/proof/edge-weight`. A CloudFront Function serves a lighter page to Save-Data visitors, with no cookies, and the page shows the recorded saving.

**Business value.** It proves tested, fail-open, switchable edge work. Owner time is 1.5 hours a month.

**Customer value.** A visitor on a slow or metered connection gets a lighter page. A banner says which version they received and why, and three buttons let them force either version.

**Needs.** CloudFront Function, CloudFront, S3, WAF (the web ACL from rank 8), CloudWatch alarms, SNS.

**Status.** New. The research prices it at 6.30 idle because of the fixed WAF and alarm charges. Its cost once rank 8 owns the web ACL is not in the research.

### 13. Document X-ray (c02)

**What it is.** A page at `/lab/document`. A public-domain PDF becomes checked, cited data across six stages, and every extracted value links to its source box. It is a recorded run.

**Business value.** It proves "AI pipelines" and "AWS architecture". No public endpoint can start it. Owner time is 0.25 hours a month.

**Customer value.** A prospect sees where every number came from and that personal data is removed before any model sees it.

**Needs.** Step Functions, Lambda, Textract, Comprehend, Claude Haiku 4.5 on Bedrock, S3, CloudFront. Manual steps: pick one public-domain PDF of at most eight pages and enable model access.

**Status.** Conflicts with the research order. T14 assumes concept c03 proves Step Functions and the CI identity first. Phase 3 built c03 on GitHub Actions instead, so c02 would be the first Step Functions workflow in the account. The research also records that Claude Haiku 4.5 has an end-of-life no sooner than 2026-10-16 (`website-ideas.md` line 560). Check the model before building.

### 14. Private searchable memory of past work (tool 9)

**What it is.** The team asks "have we done something like this" from Claude Code or Claude Desktop and gets answers from past proposals, estimates and post-mortems, through a local tool that queries a private knowledge base.

**Business value.** Quotes become more consistent and new team members find things without interrupting anyone. Worst case is 22.66 USD at the tightened search limit. The cap is a script limit, not an AWS limit.

**Customer value.** None visible. The research notes that it earns no proof for visitors unless the studio writes it up.

**Needs.** Bedrock Managed Knowledge Base, S3, IAM with IAM Identity Center sign-in. Keep it separate from the public-site knowledge base in rank 16. Never merge them. Load only de-identified material.

**Status.** New. The in-flight spend brake does not cover it. The brake denies named Lambda roles and the module accepts only an `evals` extra role. The research relies on the same Budgets action as its backstop.

### 15. Client email triage against the signed scope (tool 5)

**What it is.** Clients write to one project address. The owner gets a card per message: what is asked, whether it is inside or outside the scope with the exact clause quoted, an hours range and a draft reply. The AI never emails the client.

**Business value.** Scope creep is logged the day it is asked, not at invoice time. Worst case is 26.90 USD a month. A flood of mail has no hard cap. The guards are a Budgets alert and a switch that disables the receipt rule set.

**Customer value.** Clients email `requests@projects.mccorlabs.com` and the owner replies personally. Nothing is public.

**Needs.** SES inbound mail, S3 (30-day expiry), Lambda, DynamoDB, Claude Sonnet 5.5 on Bedrock, Bedrock Guardrails. It needs the Route 53 zone (T03) and the studio-facts file. SES receiving Region support was not read in the research.

**Status.** New. It is the longest tool to build at 9 days.

### 16. Site assistant that answers from your own pages (tool 8)

**What it is.** An "Ask about our services" box. Answers are short, name their source page, and say "I can't answer that, please use the contact form" when the pages do not cover it. A weekly email lists the questions it could not answer.

**Business value.** Fewer repeat emails and a list of the pages the studio should write next. The research rates it the highest risk of the nine: a public AI box that strangers can type into.

**Customer value.** A visitor gets an answer that points to its source page, or an honest refusal. It never quotes prices or promises dates.

**Needs.** Bedrock Managed Knowledge Base (public site text only), Nova 2 Lite, Bedrock Guardrails, Lambda, DynamoDB, EventBridge Scheduler, SNS, and a WAF rate rule. The rule needs the web ACL from rank 8, or a stand-alone one adds 5.00 USD a month (`website-ideas.md` line 455). It reuses the safe public AI path.

**Status.** Conflicts. It needs the WAF that the design excludes (design line 270). It also makes the policy's "no chat widget" and "no stored logs" statements untrue, so it needs rank 3 in the same release. Concept c01 is rejected for lacking a guardrail. This tool has Guardrails, but the research does not propose merging them.

### 17. This site speaks MCP (c06)

**What it is.** A read-only Streamable HTTP MCP server at `mccorlabs.com/mcp` with four tools, a page `/lab/mcp` that shows the endpoint, and a recorded transcript of a real Claude session with a tool-selection score.

**Business value.** It proves "AI" and "AWS architecture" to a technical evaluator. Owner time is 1.5 hours a month. Visitors never trigger model calls, so model cost stays fixed.

**Customer value.** A prospect can point their own AI client at the studio's site and see exactly how it behaves.

**Needs.** Lambda behind CloudFront, Claude on Bedrock for the recorded run, CloudWatch Logs and alarms, SNS.

**Status.** New. It is last because of its worst case of 101.91 USD a month. Lambda reserved concurrency of 2 allows about 32.4 million requests and about 531 GB of CloudFront egress in a 30-day month (research c06 hard limit). The research credits no WAF. Whether rank 8's web ACL would lower that figure is not in the research.

### Rejected: Glass-box retrieval (c01)

**What it is.** A live page where a question runs through six checked pipeline stages with milliseconds, tokens and cents per stage.

**Business value.** It would score 27 of 35 and prove "AI pipelines", "AI" and "websites and UI/UX".

**Customer value.** A visitor would watch the stages and follow each citation to its source passage.

**Needs.** S3 Vectors, Lambda, DynamoDB, Bedrock (Claude Haiku 4.5, Nova embeddings), CloudFront, CloudWatch, SNS.

**Status.** Rejected on 2026-10-06. The failure and embarrassment gate fails because the concept lists no guardrail and does not say what a jailbroken or off-brand answer shows. The research says it could return if an ApplyGuardrail stage or that statement is added (`P5.H.json`, c01 `parked_reason`).

## Conflicts between sources

1. **WAF.** Research T09 puts a web ACL under c08, and c09 and tool 8 reuse it. The design excludes AWS WAF (`docs/plans/2026-10-09-should-this-be-ai-design.md:270`).
2. **c03 mechanism.** Research T11 runs c03 as a Step Functions workflow, with Bedrock Claude and Nova embeddings, a retrieval-recall baseline and an SNS alert. Phase 3 runs a GitHub Actions workflow with Nova 2 Lite as judge, at most 15 runs a month, and no pre-merge model gate (`docs/plans/2026-10-09-should-this-be-ai-phase-3-learning-loop-plan.md:58`, `:91`). It has no SNS alert. The public claim "a failed run stays visible" is met. The Step Functions and alert parts are not.
3. **c04 differences.** Research: route `/lab/should-this-be-a-model`, a model gives the verdict, 300 live calls a day, three CloudWatch alarms to SNS, worst case 16.64 USD. Built: route `/lab/should-this-be-ai/`, the rubric in code gives the verdict (design line 48), 50 race and 100 argue calls a day (design line 193), no CloudWatch alarms in the plans, worst case 11.19 USD plus 1.80 USD. Research T13 also fixes c04 at 0.31 USD idle and 1.28 USD typical.
4. **Inquiry desk storage.** Research tool 1 stores inquiries for 12 months. Phase 0 stores no message body (design lines 77 and 240).
5. **Weekly report logging.** Research tool 7 needs CloudFront access logs. The policy and the audit treat "no access logs" as deliberate (holes doc lines 264 to 269).
6. **Site stack status.** Research T02 and T18 say the main stack is not applied. The 2026-10-09 audit found it live (holes doc line 282). Re-check before any item depends on T18.
7. **Spend brake scope.** See rank 1: account-wide budget, no tags, no anomaly detection, deny policy wider than the tool describes.
8. **Step Functions precedent.** T14 assumes c03 proves Step Functions first. It did not (ranks 13 and 4).
9. **Model end-of-life.** c02 and c03 list Claude Haiku 4.5. The research records an end-of-life no sooner than 2026-10-16.
10. **SES production access.** Hole 1 and design line 260 gate phase 0. Research T08 asks for the same request. Tool 6 depends on it. Tool 1 does not, because only the owner receives its mail.

## Coverage

Showcase concepts:

- c01 Glass-box retrieval: rejected, final table row.
- c02 Document X-ray: rank 13.
- c03 Eval gate with a red run: rank 0-P3 (delivered by a different mechanism).
- c04 Should this be a model at all: ranks 0-P1 and 0-P2.
- c05 An agent on a leash: merged into rank 4.
- c06 This site speaks MCP: rank 17.
- c07 Hourly Proof Ledger: merged into rank 6.
- c08 Your Request, Explained: rank 8.
- c09 Edge-chosen page weight: rank 12.
- c10 Drift ledger: rank 9.
- c11 Cost ledger with a tripwire: merged into rank 1.
- c12 Game day drills: rank 10.

Business tools:

- Tool 1 AI inquiry desk: rank 4 (merged with c05).
- Tool 2 Call notes to proposal and case-study drafts: rank 5.
- Tool 3 Automatic brake on AI and AWS spend: rank 1 (merged with c11).
- Tool 4 Hourly customer-view check and break-in alerts: rank 6 (merged with c07).
- Tool 5 Client email triage against the signed scope: rank 15.
- Tool 6 Weekly client updates drafted from real work: rank 11.
- Tool 7 Weekly report: which pages bring inquiries: rank 7.
- Tool 8 Site assistant: rank 16.
- Tool 9 Private searchable memory: rank 14.

Shared foundations:

- Spend brake: rank 1.
- Studio-facts file: rank 2.
- Privacy page rewrite: rank 3.
- Safe public AI path (T10): being built by 0-P0 and 0-P2, except the WAF rate rule (see rank 8).
- Durable functions workflow pattern: first used by rank 4. No plan covers it.
- Two separate knowledge bases: a rule on ranks 14 and 16.
- CloudFront logs and canary filter: ranks 6 and 7.
