# Careers — draft

Draft copy for `/careers`. Phase 2 converts this into
`app/web/src/content/careers.ts` and adds a `Role` type to
`app/web/src/content/types.ts`:

```ts
export type Role = {
  slug: string
  title: string
  level: string
  summary: string
  youWillDo: readonly string[]
  weAreLookingFor: readonly string[]
  /** Prefilled mail subject so applications arrive sorted. */
  applySubject: string
}
```

**Source:** owner-supplied. The firm is actively hiring five things: Software
Engineer I, Software Engineer II, an AI-forward engineer, a marketing
specialist, and speculative applications.

---

## How applying works — a decision, not a placeholder

Applications go to `mailto:marcm@mccorlabs.com` with a prefilled subject line
per role, **not** through the contact form.

Rationale: an application needs a CV attached. Getting a file through API Gateway
into a Lambda means base64-encoding it against a payload limit, deciding what to
do about scanning it, and storing it somewhere with a retention policy — real
work and real liability, for a firm that will receive a handful of applications.
A `mailto:` link hands attachment handling to the candidate's own mail client,
needs no backend at all, and means no change to the contact form contract.

The contact form stays for general and project enquiries. The careers page links
to it for anyone who wants to start a conversation without applying to a
specific role.

Each role's apply link:

```
mailto:marcm@mccorlabs.com?subject=Application%3A%20<role title>
```

The prefilled subject is the whole filing system. Keep the `Application: `
prefix exact so a mail rule can catch it.

---

## Page introduction

We are four people, so a hire changes what the firm is. That cuts both ways:
the bar is high, and the job is real from the first week. You will talk to
clients, own things end to end, and see the consequences of your decisions
quickly. There is no layer of process between you and the work, which is either
exactly what you want or exactly what you don't.

Everyone here is in the Twin Cities metro.

---

## 1. Software Engineer I — `software-engineer-i`

**Level:** Early career

**Summary:** Your first or second engineering job, on real client work, with
people who will actually review your code.

**You will:**

- Build features across the stack on client websites and applications
- Have every pull request reviewed properly, and review others'
- Write the tests for what you build
- Sit in on client calls from early on, listening before talking
- Ask the question nobody else asked

**We are looking for:**

- Working knowledge of JavaScript or TypeScript and one back-end language
- Evidence you can finish something — a project, a course, a contribution,
  anything you took to done
- Willingness to say "I don't know that yet"
- Care about the person who uses what you build

We do not require a computer science degree and we do not filter on years of
experience for this role.

---

## 2. Software Engineer II — `software-engineer-ii`

**Level:** Mid-level

**Summary:** You have shipped things, broken things, and fixed them. Now own
projects rather than tickets.

**You will:**

- Own the delivery of a client project end to end, with support
- Make architectural calls and explain them to people who are paying
- Review the Software Engineer I's work, and mean it
- Take the on-call-shaped problems: the intermittent bug, the slow query, the
  thing that only fails in production
- Help decide what we say yes and no to

**We are looking for:**

- Three or more years building and maintaining production software
- Comfort across the stack, and honesty about where your depth actually is
- Experience inheriting someone else's codebase without rewriting it on reflex
- The judgement to know when good enough is good enough

---

## 3. AI-forward engineer — `ai-engineer`

**Level:** Mid to senior

**Summary:** Build AI features that can be evaluated, for clients who need them
to be right rather than impressive.

**You will:**

- Build LLM features, MCP servers and retrieval systems into client products
- Build the evaluation alongside the feature, so quality is measurable
- Model cost and latency before we commit a client to an approach
- Tell a client when a language model is the wrong tool — this is most of the
  value
- Keep up with a field that moves faster than anyone can comfortably track

**We are looking for:**

- Shipped LLM work in production, not only prototypes
- Understanding of evaluation: how you know an output is good, and how you know
  it stayed good
- Solid software engineering underneath the AI work — this is an engineering
  role, not a prompt role
- Scepticism. Including about AI.

---

## 4. Marketing specialist — `marketing-specialist`

**Level:** Open

**Summary:** We are four engineers who would rather build than sell. Own how
this firm is found and understood.

**You will:**

- Own how the firm presents itself — this site, its content, its search
  presence
- Turn delivered projects into case studies that are specific rather than vague
- Generate qualified inbound so we spend less time chasing work
- Decide what to measure and report it honestly, including when it is not
  working
- Work directly with engineers who will happily explain the technical substance

**We are looking for:**

- Demonstrable B2B marketing results, ideally in technical services
- Ability to write about software without either dumbing it down or bluffing
- Comfort with being the only marketing person in the room
- Preference for measurable over decorative

This role can be part-time or contract for the right person.

---

## 5. Speculative — `general`

**Level:** Open

**Summary:** None of the above, but you think you should work here.

**You will:** tell us what you would do and why we need it.

**We are looking for:** a specific proposition rather than a general
availability. "I do X, and here is why that matters to a firm like yours" gets a
reply. A CV with no message usually does not.

Use the contact form or email directly.

---

## Notes for phase 2

- **No salary ranges are stated.** Minnesota's pay-transparency law applies to
  employers with 30 or more employees, so a four-person firm is not required to
  post them. Worth knowing that omitting them does cost candidate quality and
  wastes time on both sides — many strong candidates filter out postings without
  a range. Adding them is the owner's call and needs real numbers, not a guess.
- **No equal-opportunity or benefits statements are included**, because they
  would be invented. If the firm has an EEO position, a benefits package or a
  remote-work policy, those belong here and should come from the owner.
- The introduction is deliberately blunt about firm size being a trade-off. A
  four-person firm competing with agencies on polish loses; competing on
  directness wins the candidates who would actually thrive here.
- `/careers` stays tier 3 in the spec's signature-moment tiering — typographic
  treatment only, no heavy effect. Real content does not change that; a job
  seeker wants to read, not be impressed.
- Update the spec's open question 7 ("Careers — actively hiring, or placeholder
  posture?") to resolved: actively hiring, five roles.
