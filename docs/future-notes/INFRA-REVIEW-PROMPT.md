# Infra review — paste-ready prompt for a fresh session

Paste everything below the line into a new Claude Code session started in
`/Users/mj/repos/mccor-labs`.

## How the expertise is attached (why the prompt is worded this way)

A subagent starts with no memory of this session. It gains expertise only from what its dispatch
prompt makes it load. Each expert therefore gets four things:

1. **An agent type** (`subagent_type`) whose built-in role fits: `fable-baton:architect` for
   deep review, `fable-baton:verifier` for evidence checks, `fable-baton:scout` for cheap reads.
2. **Skills to invoke first**, by exact name, via the Skill tool — "invoke X, then follow it".
   A skill named only as a persona is decoration; a skill invoked is a method.
3. **MCP tools to load** with `ToolSearch` `select:` before use — deferred tools are uncallable
   until loaded — plus an explicit **deny-list** of any mutating tool those servers expose.
4. **Proof of use** in the report: one quoted line from each skill it loaded and a log of every
   MCP call it made with the result. No proof means the expertise was not used, and the finding
   is re-checked.

Names change when plugins reload. The lead verifies every skill, agent type and MCP tool against
the live session list before dispatching, and substitutes the closest installed one if a name is
missing.

---

```
Persona: lead infrastructure reviewer coordinating a team of independent expert subagents. You
keep judgement and the final report; experts gather evidence. Repo: /Users/mj/repos/mccor-labs
(branch feat/website-phase-1). Bash already runs in the session's working directory — never
prefix `cd`.

GOAL: an evidence-backed review of infra/ (Terraform + infra/deploy.sh) against what the static
website in app/web actually needs, ending in a ranked findings report. REVIEW ONLY — no fixes.

STEP 0 — VERIFY THE TOOLBOX (before any dispatch):
- Confirm these exist in the live session; substitute the closest installed one if not, and say so:
  agent types: fable-baton:architect, fable-baton:verifier, fable-baton:scout
  skills: security-and-hardening, doubt-driven-development, shipping-and-launch,
    terraform:terraform-style-guide, terraform:terraform-policy, terraform:terraform-test,
    code-review-and-quality, aws-serverless:aws-serverless-deployment, 1password, antigravity
  MCP (read-only use): mcp__terraform-registry__* , mcp__plugin_aws-agents_awsknowledge__* ,
    mcp__antigravity__use_antigravity / antigravity_result
- DENY-LIST — no agent may call these under any circumstances (they mutate or touch live AWS):
  mcp__plugin_aws-serverless_aws-serverless-mcp__deploy_webapp, __sam_deploy, __sam_init,
  __sam_build, __sam_local_invoke, __configure_domain, __update_webapp_frontend, __get_metrics,
  __sam_logs, and any aws CLI command other than `aws --version`.

READ FIRST (you, the lead):
- /Users/mj/repos/mccor-labs/CLAUDE.md and ~/.claude/CLAUDE.md (rules; infra/ is protected)
- docs/website-design/HANDOFF-PHASE-2.md §3, §7, §8 (static export, deploy traps)
- .superpowers/sdd/2026-10-01-mccorlabs-website-phase-2/CONSTRAINTS.md ("Playwright config
  facts": e2e cannot prove production routing; CloudFront rewrite pending)

SAFETY — non-negotiable, copy into every dispatch:
- infra/ is READ-ONLY and holds ~334 lines of the owner's UNCOMMITTED work across 7 files plus the
  untracked infra/modules/static_site/viewer_request.js.tftpl. Never edit, format, stage, stash or
  init inside infra/.
- Never run terraform apply, plan, refresh, import, state, console, or anything that takes the
  remote state lock or needs live AWS credentials.
- Static checks only, on a COPY: `cp -R infra <scratchpad>/infra-copy`; in the copy only
  `terraform fmt -check -recursive`, `terraform init -backend=false`, `terraform validate`, and
  tflint/checkov/trivy ONLY if `command -v` finds them. Never install anything.
- *.tfvars, terraform.env and the 1Password items (mccor-labs, mccor-labs-infra) may be read for
  structure; never print a secret value.
- Never push, never commit, never touch app/ (another session is working there).
- Never poll with `pgrep -f '<pattern>'` from a shell whose own command line contains the pattern.

STEP 1 — DISPATCH THE EXPERTS, in parallel, fresh agents, independent (none sees another's work).
Each dispatch prompt contains: the GOAL, SAFETY, its MUST-COVER slice, and this preamble verbatim:

  "Your first actions, in order: (1) invoke each skill listed for you via the Skill tool and
  follow its method; (2) load each MCP tool listed for you with ToolSearch `select:<names>`
  before calling it; (3) never call a deny-listed tool. Your report must include: one quoted
  line from each skill you invoked; a log of every MCP call (tool, arguments, one-line result);
  findings with file:line, failure scenario, severity, fix, and CONFIRMED (evidence shown) or
  PLAUSIBLE. Do not ask questions."

Experts:
A. AWS edge & delivery architect — subagent_type fable-baton:architect, model opus.
   Skills: security-and-hardening, shipping-and-launch, aws-serverless:aws-serverless-deployment.
   MCP: mcp__plugin_aws-agents_awsknowledge__aws___search_documentation,
        mcp__plugin_aws-agents_awsknowledge__aws___read_documentation
        (cite the AWS doc page for every CloudFront/S3/ACM claim).
   Slice: S3 + CloudFront + CloudFront Function + response headers + caching + ACM + Route 53.
B. Terraform engineer — subagent_type fable-baton:architect, model opus.
   Skills: terraform:terraform-style-guide, terraform:terraform-policy, terraform:terraform-test.
   MCP: mcp__terraform-registry__get_provider_details, mcp__terraform-registry__search_modules,
        mcp__terraform-registry__get_latest_provider_version
        (check every resource argument against the pinned provider version's docs).
   Slice: module structure, provider/version pinning, state/backend config, variables & outputs,
   fmt/validate on the copy, drift-prone patterns, policy-as-code gaps.
C. Adversarial security reviewer — subagent_type fable-baton:architect, model opus.
   Skills: doubt-driven-development, security-and-hardening, 1password.
   MCP: none beyond reading files.
   Slice: IAM least privilege for deploy (sync + invalidation), bucket policy/OAC, public-access
   block, TLS-only, secret handling in deploy.sh / terraform.env / tfvars / op usage, mail/SES.
D. Website-contract checker — subagent_type fable-baton:scout, model sonnet.
   Skills: none required. Read app/web/next.config.ts and app/web/out/ (a built site may exist;
   do not build) and produce the factual list of what infra must serve: file paths and
   extensions, trailing-slash directories, 404.html, opengraph-image.jpg?… query strings,
   media/brand/*.mp4/.webm/.webp/.glsl/.json, fonts, inline scripts/styles that a CSP must allow.
   Hand this list to A, B and C through your synthesis (do not let them see each other's
   findings).

MUST-COVER (split across A/B/C as above):
- infra/deploy.sh ~line 340 syncs ALL of out/ to S3 with no exclude list — anything in
  app/web/public/ becomes a live URL (20 condemned images nearly shipped; they now live in
  rejected-media/). Allow-list or --exclude? --delete semantics?
- viewer_request.js.tftpl: directory-index rewrite for trailingSlash routes
  (/services/ → /services/index.html), 404.html mapping, redirect behaviour, edge cases.
- Response headers / CSP: must permit the static export's inline scripts/styles, WebGL,
  self-hosted woff2, same-origin video; plus HSTS, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy, frame-ancestors.
- Caching: immutable long-cache for /_next/static/* and hashed assets, short for HTML, sensible
  for the ~2 MB .mp4/.webm (Range requests), OG images with query strings; invalidation strategy.
- MIME types S3 assigns to .webm, .glsl, .json, .webp, .avif, .woff2.
- OAC (not OAI, not a public bucket), least-privilege bucket policy, versioning/logging,
  ACM in us-east-1 for CloudFront, Route 53 aliases.

STEP 2 — WATCHDOG: check each expert every 10 minutes (commits are not expected; look for
progress in its output and live processes). If one stalls, message it; if it cannot recover,
dispatch a fresh expert of the same type with its partial findings.

STEP 3 — INDEPENDENT VERIFICATION:
- Spot-check every HIGH finding yourself (open the cited file:line, re-run the cited command on
  the copy, open the cited doc).
- Reject any finding whose expert report lacks the skill quotes or MCP call log it claims to rely
  on; re-dispatch that slice to a fresh fable-baton:verifier.
- Then one fresh Antigravity review: mcp__antigravity__use_antigravity with sandbox: true, no
  conversation_id, no add_dirs, the merged findings pasted in, "Return VERDICT: AGREE | OBJECT per
  finding with reason. Do not ask questions. Do not edit files." Poll antigravity_result with
  wait_ms ≤ 90000.

DELIVERABLE: write /Users/mj/repos/mccor-labs/docs/plans/2026-10-04-infra-review.md —
summary; ranked findings table (severity, file:line, issue, fix, CONFIRMED/PLAUSIBLE, which
expert, skill/MCP evidence, agy verdict); "what the website needs from infra" checklist from
expert D; what could not be verified without live credentials. Then in chat: the top 5 findings
and the order you recommend applying fixes. Do not apply any fix — that is a separate,
owner-approved step.
```
