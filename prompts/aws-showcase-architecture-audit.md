# AWS showcase architecture audit

A subagent-driven research and audit run for the McCor Labs site. Paste or `@`-reference this file in Claude Code from the repo root. Written 2026-10-05. Say `refresh` with it to run the refresh mode in section 11.

## 0. Mission

The McCor Labs website is the sales pitch. A prospect who wants a website built should look at it and conclude: this person knows AI, knows AI pipelines, knows AWS backend architecture, knows how to weld the newest services together properly, and designs a serious UI. Prove it by demonstration, not by claims.

This run produces the research that makes that possible. Focus now: the architecture. Front-end and UI ideas are captured but ranked second.

Produce:

1. A complete, editable catalog of AWS services worth considering: what each does, what it costs today, what it would do for McCor Labs, the best and most creative use, what it relies on, what it connects to, and a verdict.
2. An audit of the infrastructure the repo already has: is each piece the best choice, keep or replace, and why.
3. A current-state and a proposed-state architecture, both as Mermaid diagrams, plus a service connection map. The proposed state is unique and cutting-edge but KISS.
4. Ranked showcase ideas (AI features, pipelines, architecture flourishes) with cost, complexity and "wow" scores, each tied to something the site advertises and to what competitors are and are not doing. Mini-game-style ideas belong in a parked "later" list, not in the recommendation.
5. A playbook of what was learned about running Claude Code subagents accurately on an audit like this.
6. A run log that lets the owner audit every step, agent and hand-off afterward.

There is no budget cap. The owner pays for anything that earns its cost and skips anything that does not. Give honest numbers at every traffic tier in the traffic model (section 5.0), never a recommendation shaped by a budget.

## 1. Persona

Every agent in this run, including the orchestrator, works as a principal-level expert in all of: AWS (every service family), infrastructure as code and Terraform, AWS resource auditing and cost analysis, systems and website architecture, UI/UX design, full-stack web craft, creative direction, AI systems and AI pipelines, automation and maintainability, and rigorous research. Name the persona in every agent prompt, and list in that prompt the section 4 rows the agent's task needs.

## 2. Date and accuracy mandate

- The current date is the environment date, recorded in Phase 0, never earlier than 2026-10-05 (the day the owner wrote this brief). Everything is judged as of that date.
- Pricing, service availability, GA status, regional availability, quotas and Terraform resource support come only from tool calls made during this run. Training memory is allowed only for background framing and is labeled `unverified`.
- Every number and every factual claim in a deliverable carries a source URL or tool call name and the retrieval date. Currency is USD. Region is stated on every price.
- Write "I don't know" or `unverified` rather than fill a gap.
- A tool failure is logged and surfaced. If a pricing lookup returns empty, the row says `pricing: lookup failed <tool> <date>` and goes on the open-questions list.
- Both HTML deliverables take every color from CSS custom properties copied verbatim from the `@theme` block in `app/web/src/styles/globals.css`. Replace the `dataviz` placeholder palette with those tokens. If no token fits, stop and report the gap.

The repo rules (`CLAUDE.md`, `AGENTS.md`) and the global rules (`~/.claude/CLAUDE.md`) are already loaded and win over this prompt wherever they differ.

## 3. Context the orchestrator reads first

- `infra/` (root stack: `main.tf`, `dns.tf`, `iam.tf`, `variables.tf`, `outputs.tf`, `backend.tf`, `deploy.sh`, `publish-guard.sh`), `infra/bootstrap/`, `infra/modules/{static_site,certificate,mailserver}/`, `infra/tests/`.
- `.github/workflows/ci.yml` and `deploy.yml`.
- `app/web/` (Next.js 16 static export): `package.json`, `next.config.*`, `src/lib/env.ts`, `src/content/`, anything that calls an AWS or AI service.
- `docs/plans/ci-terraform-apply.md` for the owner's standing rulings (single account, single workspace, OIDC deploy role, S3 plus CloudFront static hosting, mail server on EC2, SES, Route53 zone with `prevent_destroy`).
- `docs/content/`, `docs/findings/`, `docs/future-notes/` for prior decisions and ideas.

## 4. Tool routing

Confirm each tool exists before dispatching work that depends on it: `ToolSearch` with `select:<full name>` for MCP tools, the session skill list for skills, the agent type list for agents. A tool in this table may be disabled or broken; treat a connection failure as a broken server and report it with the fallback used. Use the closest listed tool; use web search only when a dedicated tool has none.

| Need                                                                           | Tool                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What an AWS service does, limits, how-tos                                      | `mcp__plugin_aws-agents_awsknowledge__aws___search_documentation`, then `mcp__plugin_aws-agents_awsknowledge__aws___read_documentation` for the page                                                                                                                                                                                                                                                                                                          |
| Is it available in the deploy region, is it GA                                 | `mcp__plugin_aws-agents_awsknowledge__aws___get_regional_availability`, `mcp__plugin_aws-agents_awsknowledge__aws___list_regions`                                                                                                                                                                                                                                                                                                                             |
| The full list of priced AWS services (completeness denominator)                | `mcp__plugin_deploy-on-aws_awspricing__get_pricing_service_codes`                                                                                                                                                                                                                                                                                                                                                                                             |
| Current price of a service                                                     | `mcp__plugin_deploy-on-aws_awspricing__get_pricing_service_attributes`, `get_pricing_attribute_values`, then `get_pricing` with region filters, `output_options: {"pricing_terms": ["OnDemand", "FlatRate"]}` and `max_allowed_characters: 20000`; `get_price_list_urls` for bulk files                                                                                                                                                                       |
| Cost of what the repo already runs                                             | `mcp__plugin_deploy-on-aws_awspricing__analyze_terraform_project` on `infra/`, then `mcp__plugin_deploy-on-aws_awspricing__generate_cost_report`                                                                                                                                                                                                                                                                                                              |
| Bedrock or agent cost patterns                                                 | `mcp__plugin_deploy-on-aws_awspricing__get_bedrock_patterns`; skills `aws-core:amazon-bedrock`, `aws-agents:agents-pay`, `aws-agents:agents-get-started`                                                                                                                                                                                                                                                                                                      |
| Terraform resource support and provider version                                | `mcp__terraform-registry__get_provider_details`, `mcp__terraform-registry__get_provider_capabilities`, `mcp__terraform-registry__get_latest_provider_version`, `mcp__terraform-registry__search_modules`; skill `terraform:terraform-style-guide`                                                                                                                                                                                                             |
| Serverless design guidance                                                     | `mcp__plugin_aws-serverless_aws-serverless-mcp__get_lambda_guidance`, `mcp__plugin_aws-serverless_aws-serverless-mcp__get_iac_guidance`, `mcp__plugin_aws-serverless_aws-serverless-mcp__get_serverless_templates`; skills `aws-serverless:aws-lambda`, `aws-serverless:aws-lambda-durable-functions`, `aws-serverless:aws-lambda-managed-instances`, `aws-serverless:aws-lambda-microvms`, `aws-serverless:api-gateway`, `aws-serverless:aws-step-functions` |
| Service-family guidance                                                        | skills `aws-core:aws-ai-ml`, `aws-core:aws-compute`, `aws-core:aws-containers`, `aws-core:aws-database`, `aws-core:aws-storage`, `aws-core:aws-networking`, `aws-core:aws-messaging-and-streaming`, `aws-core:aws-observability`, `aws-core:aws-security`, `aws-core:aws-iam`, `aws-core:aws-serverless`, `aws-core:aws-billing-and-cost-management`                                                                                                          |
| Well-Architected check (current stack and proposed design)                     | skill `aws-core:aws-well-architected-review` (quick mode, scoped)                                                                                                                                                                                                                                                                                                                                                                                             |
| Web research (launch announcements, third-party comparisons, competitor sites) | orchestrator only: skill `exa:search` (it dispatches its own subagents). Inside subagents: `mcp__parallel-search__web_search`; `mcp__parallel-search__web_fetch` for exact wording. One tool at a time                                                                                                                                                                                                                                                        |
| Library docs (Next.js, AWS SDK, Terraform provider)                            | `mcp__claude_ai_Context7__resolve-library-id` then `mcp__claude_ai_Context7__query-docs`; skill `nextjs:nextjs`                                                                                                                                                                                                                                                                                                                                               |
| Claude Code and subagent mechanics for Phase 0 and the playbook                | agent `claude-code-guide`; skills `context-engineering:multi-agent-patterns`, `context-engineering:context-degradation`, `context-engineering:context-compression`, `superpowers:dispatching-parallel-agents`, `superpowers:verification-before-completion`                                                                                                                                                                                                   |
| UI and showcase ideation                                                       | skills `ui-ux-pro-max:ui-ux-pro-max`, `impeccable`, `frontend-design:frontend-design`                                                                                                                                                                                                                                                                                                                                                                         |
| Charts in any HTML deliverable                                                 | skill `dataviz` before the first chart line                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Review of the HTML renderers                                                   | skill `code-review`                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Agents and tiers (global orchestration policy):

| Agent                                                                            | Model      | Use in this run                                                                                                                                  |
| -------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mj-baton:scout`                                                                 | Haiku      | Repo discovery, reading Terraform and workflows, enumerating services in one category, pulling one doc page, extracting what the site advertises |
| `mj-baton:executor`                                                              | Sonnet     | Writing catalog rows from gathered evidence, rendering HTML, computing cost roll-ups, formatting Mermaid                                         |
| `mj-baton:architect`                                                             | Opus       | Per-service deep dives with pricing, current-stack verdicts, architecture proposals, playbook consolidation, reviewing cheaper agents' output    |
| `mj-baton:verifier`                                                              | Sonnet     | Re-pulling prices live, checking sources on claims, checking deliverables against section 5. Verifies, never fixes                               |
| `deep-research:cs-deep-research`                                                 | as defined | A single high-stakes question needing three independent sources (for example "is service X GA and priced in the deploy region today")            |
| `claude-code-guide`                                                              | as defined | Claude Code mechanics questions in Phase 0 and Phase 7                                                                                           |
| `architect` (orchestrator team), `mj-baton:architect`, `ai-engineer:ai-engineer` | as defined | Blind, independent proposals in Phase 5                                                                                                          |
| `general-purpose` loading skill `ui-ux-pro-max:ui-ux-pro-max`                    | Sonnet     | The three independent UI/UX reviews the project rule requires when a proposal becomes a plan or spec                                             |

Spawners: the orchestrator; `mj-baton:architect` (scouts only); `deep-research:cs-deep-research` and the `exa:search` skill, both started only by the orchestrator. Depth stays at orchestrator, one agent, its scouts.

## 5. Deliverables

All files go in `docs/aws-showcase/`. Agents write only their own file under `docs/aws-showcase/work/`.

| File                       | Format                                                                                                                                                                                                                                                            | Content                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aws-service-catalog.html` | Single self-contained HTML page. Data is one inline JSON array at the top of the file so the owner edits rows by editing JSON. Table renders client-side with sort and filter by category and verdict. No external scripts; the page works offline from `file://` | One row per service, columns in section 5.1                                                                                                                                                                                                                                                                                                           |
| `architecture.md`          | Markdown with Mermaid fences                                                                                                                                                                                                                                      | `## Rulings` section; current-state diagram; current-stack audit table (section 5.2); proposed-state diagram; service connection map (one Mermaid graph of every `adopt_now` and `trial` row and its `connects_to` edges); ranked showcase ideas (section 5.3); parked "later" ideas; dissent appendix; cost roll-up per traffic tier; open questions |
| `agent-playbook.md`        | Markdown                                                                                                                                                                                                                                                          | What was learned about running Claude Code subagents on this audit (section 5.4)                                                                                                                                                                                                                                                                      |
| `run-log.html`             | Single self-contained HTML page with an inline JSON array of entries and a client-side table, same constraints as the catalog                                                                                                                                     | One entry per agent dispatch and per orchestrator decision (section 5.5)                                                                                                                                                                                                                                                                              |
| `work/`                    | Subfolders per phase, one file per agent                                                                                                                                                                                                                          | Raw agent outputs, checkpoints, `traffic-model.json`, `lessons.md`, `handoff.md`. Kept so the deliverables can be audited                                                                                                                                                                                                                             |

### 5.0 Traffic model

`work/phase0/traffic-model.json` is the only source of usage assumptions. Default tiers: `idle`, `1k_visitors`, `10k_visitors` (monthly visitors), changed only by the owner's answer to question 3. For each tier it records: page views per visitor, MB per page view, share of visitors using each AI feature, input and output tokens per AI call, form submissions, emails sent. Every `est_monthly` value and every Phase 6 figure cites it.

### 5.1 Catalog columns

Every column is required; an unknown value is `unverified` or `lookup failed <tool> <date>`.

`service`, `category`, `what_it_does`, `pricing_model`, `key_rates` (unit prices with region and retrieval date), `free_tier`, `est_monthly` (object keyed by the tier names in `traffic-model.json`), `benefit_to_mccor_labs`, `best_use`, `creative_showcase_use`, `relies_on`, `connects_to`, `terraform_support` (resource names, provider version checked), `status` (GA or preview, launch date if within 18 months), `regions_checked`, `lockin_risk`, `verdict` (`adopt_now`, `trial`, `later`, `skip`) with `verdict_reason`, `sources` (array of URL plus date), `confidence` (`verified`, `partial`, `unverified`).

### 5.2 Current-stack audit columns

`resource` (Terraform address and `file:line`), `purpose`, `monthly_cost_now`, `best_choice` (yes or no), `alternative`, `alternative_cost`, `verdict` (`keep`, `replace`, `remove`, `extend`), `reason`, `cost_if_wrong`.

Record each tradeoff as a `Ruling: <decision> (cost if wrong: <cost>)` line in the `## Rulings` section of `architecture.md`.

### 5.3 Showcase idea fields

`idea`, `what_the_visitor_sees`, `what_it_proves` (AI, pipelines, architecture, UI, or several), `proves_offering` (id from `work/phase1/advertised.json`), `differentiation` (who else shows this on their site, with a sourced search result, or `none found <date>`), `services_used`, `architecture_sketch` (Mermaid or one paragraph), `monthly_cost` per traffic tier, `complexity` (1 to 5), `wow` (1 to 5), `kiss_check` (one sentence on why it stays simple), `maintenance_burden`, `rank`. Ideas that only serve the demo and not the business are marked as such.

### 5.4 Playbook content

Evidence-backed entries, each with the run-log entry id that produced the lesson:

- Chunk sizes that kept agents accurate and the sizes that degraded them, with the observed symptom.
- Prompt patterns that worked and patterns that failed.
- Hand-off pattern used and how often the next agent needed re-work.
- Tool reliability: which MCP calls returned stale, empty or wrong results, and the fallback used.
- Verification ratio applied and what the checks caught.
- Time, tool-call and token cost per phase where the harness reports it.
- How agents built expertise mid-run: which docs, skills or tool calls changed a verdict.
- Do and do-not lists, ranked by how much they changed accuracy.
- What was learned about AWS and AI along the way (consolidated from the `learned` field of the run log).
- Open hypotheses about Claude Code agent behaviour that this run could not confirm, labeled as such.

### 5.5 Run-log entry fields

`id`, `timestamp`, `phase`, `agent_type`, `model`, `task` (one sentence), `inputs` (files and checkpoint ids read), `output_file`, `started_at` (what state it picked up), `left_off_at` (what the next agent should pick up), `items_handled`, `tool_calls`, `duration_s`, `tokens` (where the harness reports them), `status` (`done`, `partial`, `failed`), `verified_by` (entry id of the verifier, or `none`), `learned` (one sentence of AWS or AI insight, or `none`), `notes`.

The orchestrator writes an entry before each dispatch and updates it on return. Orchestrator decisions (merges, rulings, rejected agent output) get their own entries.

## 6. Agent operating model

Small, short-lived, single-purpose agents. An agent lives only long enough to do one bounded task, write its result to its own file under `work/`, write a checkpoint, and return a short report. The orchestrator merges.

- **Single writer.** Only the orchestrator writes `run-log.html`, the catalog JSON, `architecture.md` and `agent-playbook.md`. The catalog JSON is rebuilt from `work/phase3/*.json` in one pass.
- **Chunk size.** Enumeration: one service category per scout. Deep dive: at most two services per architect. Repo discovery: one directory or one file family per scout. Verification: at most ten rows per verifier. An agent stops at 25 tool calls, writes a checkpoint, and returns; the orchestrator dispatches a continuation. These are starting values; Phase 0 step 6 adjusts them.
- **Hand-off.** Each agent's checkpoint file (`work/<phase>/<id>.checkpoint.json`) holds `run_log_id`, `chunk`, `started_at`, `done`, `left_off_at`, `open_items`, `sources_used`. A continuation agent receives only that checkpoint, its own chunk, and the section of this prompt it needs.
- **Context limit.** An agent prompt carries the persona, the accuracy mandate, the exact tools for its task, the chunk, and the output schema. Give an agent a file path to read rather than pasted file contents whenever the file is longer than about fifty lines.
- **Team sizing.** Phase 1: 9 scouts, 1 architect. Phase 2: one scout per category plus the launch scout and the completeness scout, in waves of 6. Phase 3: ceil(shortlist / 2) architects in waves of 6, plus ceil(rows / 10) verifiers. Phase 4: 1 architect, 1 verifier. Phase 5: 3 proposers. Phase 6: 1 executor, 1 verifier. Phase 7: 1 architect. Phase 8: 3. Scale up only when a chunk comes back `partial`; scale down when a phase finishes early.
- **Parallel and sequential.** Independent chunks run in parallel in one dispatch. Dependent chunks run in sequence through checkpoints.
- **Evidence.** Every agent report ends with the evidence section: tool calls made, sources with dates, `file:line` quotes. A report without it is rejected and the chunk re-dispatched.
- **Verification.** Every `key_rates` and `status` value is re-pulled live by a verifier (100%). Prose fields are sampled at twenty percent, chosen at random, with every `adopt_now` row and every `replace` or `remove` verdict included. A failed check sends the chunk to a fresh agent, never back to the same one.
- **Disagreement.** When two agents disagree on a fact, a third agent resolves it with new tool calls. The orchestrator records the resolution as a run-log decision.
- **Lessons.** From Phase 0, append one line with the run-log id to `work/lessons.md` whenever an agent fails, runs long, contradicts another, or returns a surprisingly good result.
- **Watchdog.** On a `[subagent-watchdog]` reminder, dispatch a fresh agent of the same type with the stalled agent's checkpoint or partial `work/` file. Mark the stalled run-log entry `partial` and notify the owner in one line.
- **Resume.** A fresh session reads the run-log JSON and the checkpoints, finds the last `done` entry per phase, and continues from there. At about 75% context the orchestrator writes `work/handoff.md` (goal, done, next, open questions) and tells the owner to `/clear` and re-run this prompt.

## 7. Phases

Run the phases in order. Each phase ends when its completion criterion holds, its verifier pass is logged, and its run-log entries are written.

### Phase 0. Setup

1. Ask the owner the batch questions in section 8, all at once, before any other work. Proceed on the stated defaults if the owner has pre-answered or said to proceed.
2. Create the branch or worktree from question 7. Create `docs/aws-showcase/work/`. Write `run-log.html` and `aws-service-catalog.html` as shells with their JSON arrays and renderers. Write `architecture.md` and `agent-playbook.md` with headings only.
3. Confirm every tool in section 4 exists. Call one cheap probe on each MCP server and log the result. A broken server is reported to the owner now, with the fallback that will be used.
4. Record the current date, the deploy region, and the AWS provider version pinned in `infra/main.tf` in the run log.
5. Write `work/phase0/traffic-model.json` from the question 3 answer and the defaults in section 5.0.
6. One `claude-code-guide` agent reports current subagent mechanics: nesting limits, which agent types have the Agent tool, background agents, context size per model. Output goes to `work/phase0/agent-mechanics.md`. Adjust the section 6 chunk sizes and team sizes to it and log the change as a decision.

Done when: the folder exists on the chosen branch, the four shell files open in a browser or render as Markdown, every tool probe is logged, the traffic model and mechanics files exist.

### Phase 1. Current state

Scouts, one per target: root `infra/`, each of the three modules, `infra/bootstrap/`, the two workflows, `app/web` AWS and AI usage, the plan file rulings, and what the site advertises (every offering and claim in `app/web/src/content/` and `docs/content/`, with `file:line`, written to `work/phase1/advertised.json`). Each returns a fact list with `file:line`.

Architect runs `analyze_terraform_project` on `infra/` and `generate_cost_report`, then writes the current-state Mermaid diagram and a first draft of the current-stack audit table (section 5.2) without verdicts yet.

Done when: every Terraform resource and module in `infra/` appears in the diagram and the table, the cost report and `advertised.json` are in `work/phase1/`, and a verifier has checked the diagram against the Terraform addresses.

### Phase 2. Service universe

Completeness first: one scout pulls `get_pricing_service_codes`. Every code is either mapped to a category below or listed in `work/phase2/excluded.json` with a reason. One dedicated scout owns the last-18-months launch sweep with `mcp__parallel-search__web_search`; the orchestrator runs one `exa:search` pass for the same window and merges.

Then one scout per category using `aws___search_documentation`. Each scout returns, per service: name, one-line purpose, GA status, launch date if within 18 months, and the facts a relevance score needs (fit to the mission, fit to a static Next.js site, AI relevance). The orchestrator scores relevance 1 to 5.

Seed category list (names are a seed, status unverified; a retired or renamed service goes to `excluded.json`): edge and delivery (CloudFront, CloudFront Functions, Lambda@Edge, KeyValueStore, Global Accelerator); compute (Lambda and its newer execution modes, App Runner, Fargate, EC2 variants); AI and ML (Bedrock models, Bedrock agents and knowledge bases, AgentCore, Nova, Q, Kendra, Transcribe, Polly, Rekognition, Comprehend, Translate, Personalize, SageMaker options), split into two scouts (foundation models and agents; perception and language services); data (DynamoDB, Aurora Serverless, OpenSearch Serverless, S3 Vectors, S3 Tables, Neptune, Timestream); storage (S3 classes, EFS, Backup); networking and DNS (Route53 features, VPC Lattice, PrivateLink, Global Accelerator); messaging and orchestration (EventBridge, SQS, SNS, Step Functions, Lambda durable functions); observability (CloudWatch, RUM, Synthetics, X-Ray, Application Signals); security and identity (WAF, Shield, Cognito, Verified Permissions, KMS, Secrets Manager, Security Hub); management (Systems Manager, CloudFormation, DLM, Config); developer tooling and CI (Amplify, CodeBuild, CodeArtifact, Q Developer); communications (SES, End User Messaging, Connect, Chime SDK); media and real time (IVS, MediaConvert, Elemental, Kinesis Video); analytics (Athena, Glue, QuickSight, Kinesis, Firehose, Clean Rooms); location and IoT; gaming (GameLift) for the parked list; cost and governance (Budgets, Cost Explorer, CUR, Organizations, Control Tower).

The orchestrator merges, dedupes, and selects the shortlist: every service with relevance 3 or more, plus every service the current stack already uses.

Done when: every service code from the pricing catalog is in the shortlist, the category output or `excluded.json`; the shortlist is in `work/phase2/shortlist.json` with a one-line reason per inclusion; a verifier has sampled twenty percent of the exclusions.

### Phase 3. Deep dives

One architect per batch of at most two shortlisted services. Each fills every catalog column in section 5.1 for its batch using the pricing tool for rates, the knowledge tool for behaviour, the Terraform registry for resource support, and regional availability for the deploy region. Each batch is written to `work/phase3/<batch>.json`. The orchestrator rebuilds the catalog JSON from those files.

Verifiers re-pull every `key_rates` and `status` live and check every `sources` entry resolves.

Done when: every shortlisted service has a row with every column filled or explicitly marked, and the verifier pass is logged with zero unresolved mismatches.

### Phase 4. Current-stack audit

Architect compares each current resource to the catalog alternatives and fills the verdict columns in section 5.2. Run the Well-Architected quick review scoped to the root stack and fold its findings into `reason` and `cost_if_wrong`. Every `replace` verdict names the replacement row in the catalog and the cost delta.

Done when: every row in the audit table has a verdict, a reason and a ruling line, and the verifier has checked every `replace` and `remove` verdict against the evidence.

### Phase 5. Showcase architecture

Three independent proposals, blind to each other: dispatch `architect` (orchestrator team), `mj-baton:architect`, and `ai-engineer:ai-engineer` in parallel with the same brief: the catalog, the audit, `advertised.json`, the mission in section 0, the KISS constraint, and the traffic model. Each returns a proposed-state Mermaid diagram, a list of showcase ideas in the section 5.3 shape, and the ruling lines for its tradeoffs. For `differentiation`, each proposer runs `mcp__parallel-search__web_search` per idea.

The orchestrator synthesizes one proposed architecture and one ranked idea list, keeps the dissenting options in the dissent appendix with the reason they lost, parks demo-only or game-style ideas in the "later" list, and runs the Well-Architected quick review on the proposed design, folding findings into the ruling lines. If the proposal becomes a plan or spec, it goes to the three independent `ui-ux-pro-max` reviews first (section 4 agent table).

Done when: `architecture.md` holds the proposed diagram, the connection map, the ranked list, the parked list, the dissent appendix and the rulings; every idea has all section 5.3 fields; a verifier has checked that every service in the proposed diagram has an `adopt_now` or `trial` catalog row.

### Phase 6. Cost roll-up

Executor computes monthly cost for the current stack, the proposed architecture, and each ranked idea at every tier in the traffic model, using the catalog rates. Every figure traces to a catalog row and the traffic model. Verifier recomputes a random five.

Done when: the roll-up table is in `architecture.md` and the recomputation matches within rounding.

### Phase 7. Playbook

An architect consolidates `work/lessons.md` and the `learned` fields of the run log into `agent-playbook.md` per section 5.4, consulting `claude-code-guide` and the context-engineering skills for the mechanisms behind what was observed. Observed facts are separated from the skills' claims.

Done when: every lesson in `work/lessons.md` is either in the playbook with its run-log id or explicitly dropped with a reason, and a verifier has checked the ids resolve.

### Phase 8. Final verification

Three agents in parallel: a verifier checks every deliverable against section 5 (every file, every column, every field); a second verifier re-samples prose fields and sources across the whole catalog; an `mj-baton:architect` reads this prompt and `work/` and reports anything the mission asked for that is missing.

Then: run `pnpm exec prettier --write docs/aws-showcase` and show `pnpm format:check` passing (CI runs it at `.github/workflows/ci.yml`). A reviewer subagent runs the `code-review` skill on both HTML renderers. The inline JSON in both HTML files parses with `node`.

Done when: all three reports are in `work/phase8/`, every gap is either fixed by a fresh agent or listed under open questions with the reason, format check passes, and the review findings are resolved.

### Phase 9. Report

A short message to the owner: what exists and where, the top five ideas with cost and wow, the current-stack verdicts that recommend change, the tool failures, the open questions, the owner action to add `docs/aws-showcase/work/` to `.prettierignore` if `work/` will be committed, and the proposed next step. Proposed commit message in conventional form, never a commit.

Done when: the message is sent and the final run-log entry is `done`.

## 8. Batch questions for the owner

Ask all at once in Phase 0. Defaults apply if the owner says to proceed.

1. Deploy region for pricing. Default: the region in the `infra/main.tf` provider block, with `us-east-1` for global services.
2. May agents run read-only `aws` CLI calls (`describe`, `list`, `get`) against the live account to confirm what exists? Default: no, Terraform files are the source of truth.
3. Traffic tiers for cost estimates. Default: idle, 1k, 10k monthly visitors.
4. Any service families to exclude up front. Default: none.
5. Target audience for the showcase ideas: small business clients, technical founders, agencies, or all. Default: all, with a tag per idea.
6. Any idea the owner already knows they want or already rejected. Default: none.
7. Where the deliverables land. Default: a new branch `docs/aws-showcase` from `main` in a worktree at `../mccor-labs-aws-showcase`, so the files stay out of the current feature branch.

## 9. Run-specific limits

Repo and global rules apply; this section adds only what is specific to this run.

- Read-only against AWS. No `terraform apply`, no deploys, no `sam deploy`, no resource creation.
- Writes stay inside `docs/aws-showcase/`. Existing docs, `README.md`, `CLAUDE.md`, `AGENTS.md` and `.prettierignore` are owner edits, proposed in Phase 9.
- A needed tool that is missing is named, with the branch it blocks, and that branch stops.
- Secrets stay out of agent context: `.env`, `*.tfvars` and 1Password items are off limits for this run.
- Deliverables are written in full, clear sentences.

## 10. Completion criteria for the whole run

- Every file in section 5 exists, opens, and has no field without a value or an explicit `lookup failed` or `unverified` marker.
- Every price carries region and date. Every claim carries a source. Every `key_rates` and `status` was re-pulled live; prose samples passed or their failures are listed.
- The proposed architecture is one diagram a client could follow in a minute, and every service in it has an `adopt_now` or `trial` row in the catalog.
- Every ranked idea maps to an advertised offering and has a sourced differentiation note.
- The run log explains every agent dispatch and every orchestrator decision.
- The owner's Phase 9 message fits on one screen.

## 11. Refresh run

When the owner re-runs this prompt with `refresh`: skip Phases 1 and 2; re-run Phase 3 only on rows whose `confidence` is not `verified` or whose newest source is more than 90 days old, plus any service the owner names; then run Phases 6, 8 and 9. New run-log entries carry a `refresh` tag.

## Provenance

Drafted 2026-10-05 from the owner's brief. Gap-checked 2026-10-06 by an independent Opus subagent against the brief: 66 requirements extracted, 45 covered, 20 partial, 1 missing in the first draft; all 24 proposed edits applied in this version.
