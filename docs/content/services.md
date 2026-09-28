# Services — draft

Draft copy for `/services`. Phase 2 converts this into
`app/web/src/content/services.ts`, typed against the `Service` shape in
`app/web/src/content/types.ts`:

```ts
type Service = {
  slug: string
  title: string
  summary: string
  detail: string
  deliverables: readonly string[]
}
```

**Source:** owner-supplied. Websites and applications are the primary offer;
consulting, teaching and broader digital work follow. AI integration is listed
as its own service because the team has real delivered work behind it, not as a
positioning claim.

**Order is deliberate.** The array order drives display order. Primary offers
come first, because a visitor who reads only the first two things should have
seen the core business.

---

## 1. Websites — `websites`

**Summary:** Marketing sites, product sites and landing pages built to be fast,
accessible and genuinely maintainable.

**Detail:** We design and build the site, not a template with your logo on it.
That means a considered visual direction, copy that says something specific, and
a front end that scores well on the things that actually affect whether people
convert — load time, layout stability, working on a phone, working for someone
using a keyboard or a screen reader. You get the code, and it is code your own
developers can read.

**Deliverables:**

- Design direction and page designs
- Production front end with a typed content layer
- Accessibility review against WCAG 2.2 AA
- Performance budget, measured rather than promised
- Deployment pipeline and documentation
- Handover, with the repository and hosting in your name

---

## 2. Applications — `applications`

**Summary:** Web and mobile applications, from a first working version to
something with real users on it.

**Detail:** Most of what we build is a product with logins, data, permissions
and a business process behind it. We are comfortable owning the whole stack —
interface, API, database, deployment, monitoring — and equally comfortable
slotting into an existing codebase and an existing team. We start with the
smallest thing that answers the real question, then build out from what you
learn rather than from what was assumed at the start.

**Deliverables:**

- Technical design and data model
- Working application, deployed
- Authentication, authorisation and audit where the domain needs them
- Automated tests covering the paths that matter
- Infrastructure as code
- Runbook and handover

---

## 3. AI integration — `ai-integration`

**Summary:** MCP servers, LLM features and analytics over data you already
have — built to be evaluated, not just demoed.

**Detail:** We have shipped MCP servers in production for a Medicare company and
LLM-driven analytics across large databases for a major sports franchise. The
work that goes wrong here almost always goes wrong the same way: a demo that
impresses, then no way to tell whether it is right. So we build the evaluation
alongside the feature, keep a human in the loop where being wrong is expensive,
and are direct about the cases where a language model is the wrong tool and a
query would do.

**Deliverables:**

- Feasibility assessment, including where AI is the wrong answer
- MCP server or LLM feature, integrated with your systems
- Evaluation harness and a quality baseline you can re-run
- Cost and latency modelling before commitment, not after
- Documentation your team can maintain

---

## 4. Developer consulting — `consulting`

**Summary:** A second opinion for development teams — architecture review, code
review, and help getting unstuck.

**Detail:** Sometimes the useful thing is not another pair of hands but someone
who has seen the failure mode before. We review architecture before it is
expensive to change, audit code for the problems that only show up under load or
in front of an auditor, and work alongside your team on the part of the system
nobody wants to touch. We tell you what we actually think, including when the
answer is that your existing plan is fine.

**Deliverables:**

- Architecture or code review with prioritised, specific findings
- Written recommendations, ordered by what they cost and what they save
- Pairing sessions with your developers
- Follow-up review once changes land

---

## 5. Hands-on teaching — `teaching`

**Summary:** Practical training for development teams, taught on your codebase
rather than a toy example.

**Detail:** Training that uses someone else's example project tends not to
survive contact with your repository. We teach on your code, on the problems
your team actually has — testing discipline, accessibility, performance work,
getting useful results out of AI tooling. Sessions are hands-on and small, and
you keep the written material afterwards. Marc leads this work.

**Deliverables:**

- Curriculum built from your team's current gaps
- Hands-on sessions on your codebase
- Written reference material that outlasts the session
- Follow-up review to see what stuck

---

## Tagline options

`site.tagline` currently holds a placeholder. Three options, each making a
different bet:

1. **"We design and build the websites and applications other teams wish they
   had time for."** — Warm, slightly self-deprecating, positions the firm as
   capacity rather than authority.
2. **"A small senior team building websites, applications and AI features for
   companies that need them to actually work."** — Most literal. Leads with team
   size as a feature and signals substance over polish.
3. **"Websites and applications, built properly, by four people who will tell
   you what they actually think."** — Most distinctive and most opinionated.
   Strongest differentiator against agencies; slightly riskier.

**Chosen: option 2**, confirmed by the owner. It names the primary offer in the
first six words, which matters for a visitor who reads nothing else, and "small
senior team" does real work — it pre-empts the "can four people handle this?"
objection by framing size as the reason quality is possible. Option 3 is the
better _line_ but buries what the firm does behind a personality claim.

The live value is in `app/web/src/content/site.ts`. Options 1 and 3 are kept
above as a record of what was considered and rejected, not as live
alternatives.

---

## Notes for phase 2

- Five services is at the upper limit for one page before it starts reading as
  an undifferentiated list. If a sixth appears, consider grouping.
- Every service here is visibly covered by a named team member in
  `docs/content/team.md`: websites and applications by Marc, Kirsten and Ashley
  between them; AI integration and teaching by Marc; consulting by Nate. Keep it
  that way — a service nobody on the team page appears to deliver reads as
  padding.
- Every claim of delivered work in the AI integration section came from the
  owner and is true. Do not add others. In particular, do not invent client
  names, project outcomes, or metrics.
- No pricing is stated anywhere. If the owner wants price anchoring, that is a
  separate decision and needs its own copy.
