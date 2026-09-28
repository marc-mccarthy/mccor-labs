# Job postings — full text

Standalone, board-ready postings. These are longer than the `/careers` page
cards in `docs/content/careers.md`; the cards summarise, these are the full text
for a role detail page, LinkedIn, or a job board.

**Before publishing any of these, the owner must supply or explicitly decline:**

| Missing                            | Consequence of leaving it out                                                                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Salary range                       | Not legally required (Minnesota's pay-transparency law starts at 30 employees), but many strong candidates filter out postings without one. Costs candidate quality. |
| Benefits — health, retirement, PTO | Every posting below says "discussed at offer stage". If real benefits exist, say so; it is a competitive advantage for a small firm.                                 |
| Remote / hybrid / in-office policy | Currently stated as "Twin Cities metro, hybrid". Correct this if wrong — it is the single most-filtered field on a job board.                                        |
| EEO statement                      | Omitted rather than invented. Add the firm's real position.                                                                                                          |
| Employment type for each role      | Assumed full-time except marketing, which is flagged flexible.                                                                                                       |

Nothing below invents a benefit, a salary, a client name or a metric.

---

## Shared boilerplate

Used at the top or bottom of each posting. Keep it identical across all five so
it can be maintained in one place.

### About McCor Labs

McCor Labs LLC is a four-person development firm in the Twin Cities. We build
websites and applications for clients, integrate AI into products where it
genuinely helps, consult for other development teams, and teach. Our work has
included MCP servers in production for a Medicare company and LLM-driven
analytics over large databases for a major Twin Cities sports franchise.

We are small on purpose. There is no layer of process between an engineer and
the client, which means you will understand why you are building something, and
you will find out quickly whether you were right. It also means there is nowhere
to hide.

### How to apply

Email **marcm@mccorlabs.com** with the subject line given in the posting. Attach
a CV and write a few sentences about why this role, specifically. We read those
sentences first.

We reply to every application. If we are not going ahead, we will say so rather
than leaving you wondering.

---

## 1. Software Engineer I

**Location:** Twin Cities metro — hybrid
**Type:** Full-time
**Level:** Early career
**Apply with subject:** `Application: Software Engineer I`

### The role

This is a first or second engineering job on real client work. You will be
writing code that ships to people who paid for it, within your first couple of
weeks, with someone reviewing every line properly until you do not need that any
more.

We are not looking for someone who already knows everything. We are looking for
someone who finishes things, asks when they are stuck, and cares whether the
thing actually works for the person using it.

### What you will do

- Build features across the stack — interface, API, database — on client
  websites and applications
- Write tests for what you build, and learn what a useful test is versus a test
  that only exists to raise coverage
- Have your pull requests reviewed in detail, and start reviewing others'
- Join client calls early on, mostly listening at first
- Reproduce and fix bugs, including the ones that turn out not to be bugs
- Read a codebase you did not write and work out how it fits together

### What we need from you

- Working knowledge of JavaScript or TypeScript, plus one back-end language
- Basic comfort with git, the command line and a relational database
- Something finished you can show us — a personal project, a course capstone, an
  open-source contribution, a freelance job. Finished matters more than
  impressive
- The habit of saying "I don't know that yet" instead of guessing
- Based in or moving to the Twin Cities metro

### What would help but is not required

- A Next.js, React or similar framework project you have actually deployed
- Any exposure to cloud infrastructure — AWS especially
- Experience in a customer-facing job of any kind, technical or not. It shows
- Having used an AI coding tool seriously enough to know where it is wrong

### What we do not require

A computer science degree. A minimum number of years. A LeetCode performance.

### Compensation and benefits

Salary and benefits discussed at offer stage. Ask us early if that matters to
your decision — we would rather tell you than waste your time.

---

## 2. Software Engineer II

**Location:** Twin Cities metro — hybrid
**Type:** Full-time
**Level:** Mid-level
**Apply with subject:** `Application: Software Engineer II`

### The role

You have shipped software, broken it, and been the person who fixed it. This
role is about owning projects rather than tickets: making the architectural
calls, explaining them to someone who is paying for the outcome, and living with
the consequences.

In a firm this size that ownership is real. You will not be shielded from the
client, and you will not be handed a fully specified task list.

### What you will do

- Own delivery of a client project end to end, with support but not supervision
- Make design and architecture decisions, and explain the trade-offs to
  non-technical stakeholders in plain language
- Review the Software Engineer I's work substantively, and mentor deliberately
- Take on the awkward problems: the intermittent failure, the slow query, the
  integration whose documentation is wrong
- Inherit existing codebases and improve them without rewriting them on reflex
- Help decide which work we take and which we turn down

### What we need from you

- Three or more years building and maintaining production software
- Genuine comfort across the stack, plus honesty about where your depth actually
  is and where it is not
- Experience owning something in production — deploys, incidents, the parts that
  are not writing features
- Ability to disagree with a client's proposed approach and keep the
  relationship
- Judgement about when good enough is good enough. We ship
- Based in or moving to the Twin Cities metro

### What would help but is not required

- TypeScript, React or Next.js in production at scale
- AWS, Terraform, or infrastructure-as-code experience
- Consulting or agency background — the context-switching is a skill
- Having worked somewhere with real accessibility or compliance requirements

### Compensation and benefits

Salary and benefits discussed at offer stage.

---

## 3. AI-Forward Engineer

**Location:** Twin Cities metro — hybrid
**Type:** Full-time
**Level:** Mid to senior
**Apply with subject:** `Application: AI-Forward Engineer`

### The role

Build AI features into client products for clients who need them to be correct,
not just impressive. We have shipped MCP servers in production for a Medicare
company and LLM-driven analytics over large databases for a sports franchise, so
this is not an exploratory role — it is delivery.

The failure mode in this field is always the same: a demo that wins the room,
followed by no way to tell whether the output is right. The most valuable thing
you will do here is build the measurement alongside the feature, and tell a
client when a language model is the wrong tool and a SQL query would do.

### What you will do

- Build LLM features, MCP servers and retrieval systems into client products
- Build evaluation alongside each feature, so quality is measurable and
  regressions are visible
- Model cost and latency before we commit a client to an approach, not after the
  first invoice
- Design human-in-the-loop flows where being wrong is expensive
- Recommend against AI when it is the wrong answer, and be able to defend that
- Keep current with a field that moves faster than anyone can comfortably track,
  and separate what is real from what is announced

### What we need from you

- LLM or ML features shipped to production, with users. Prototypes alone are not
  enough
- Real understanding of evaluation: how you know an output is good, and how you
  know it stayed good after a model or prompt change
- Strong software engineering fundamentals. This is an engineering role that
  involves AI, not a prompting role
- Ability to explain a probabilistic system to a client who wants a guarantee
- Scepticism, including about AI, and especially about your own results
- Based in or moving to the Twin Cities metro

### What would help but is not required

- MCP server implementation experience specifically
- RAG systems in production, including the retrieval-quality work that
  determines whether they are any good
- Regulated-domain experience — healthcare, finance, insurance
- Data engineering depth: large databases, query performance, warehousing
- Fine-tuning experience, and a clear view of when it is not worth it

### Compensation and benefits

Salary and benefits discussed at offer stage.

---

## 4. Marketing Specialist

**Location:** Twin Cities metro — hybrid
**Type:** Full-time, part-time or contract for the right person
**Level:** Open
**Apply with subject:** `Application: Marketing Specialist`

### The role

We are four engineers who would rather build than sell, which is a pleasant
problem until it is not. This role owns how the firm is found, understood and
chosen.

You would be the only marketing person here. That means unusual latitude and no
one to hide behind. It also means you will get direct access to engineers who
will happily explain the technical substance of what we built, which is the raw
material most B2B technical marketing lacks.

### What you will do

- Own how the firm presents itself — this website, its content, its search
  presence
- Turn delivered projects into case studies that are specific and credible, not
  vague and adjective-heavy
- Generate qualified inbound enquiries, so we spend less time chasing work
- Decide what is worth measuring, then report it honestly — including when a
  channel is not working
- Write about software for people who buy software, without either dumbing it
  down or bluffing about the technical detail
- Tell us when our own positioning is unclear. It probably is

### What we need from you

- Demonstrable B2B marketing results, ideally for technical or professional
  services. Bring numbers
- Ability to write clearly about technical work. A writing sample matters more
  than a certification
- Comfort operating as the only marketing person in the organisation
- Preference for measurable over decorative
- Based in or moving to the Twin Cities metro

### What would help but is not required

- Experience marketing a development agency, consultancy or software firm
- Working technical SEO knowledge — not just keyword tooling
- Having built a case-study programme from nothing
- Familiarity with how developers evaluate a vendor, because they do not respond
  to conventional B2B marketing

### Compensation and benefits

Salary and benefits discussed at offer stage. Part-time and contract
arrangements are genuinely open, not a fallback.

---

## 5. Speculative application

**Location:** Twin Cities metro — hybrid
**Type:** Open
**Apply with subject:** `Application: Speculative`

### The role

None of the four above, but you think you should work here.

This is a real route, not a politeness. A four-person firm does not always know
what it is missing until someone describes it.

### What gets a reply

A specific proposition: what you do, and why a firm like this needs it. Two
paragraphs is plenty.

### What usually does not

A CV with no message, or a note saying you are open to opportunities. We cannot
work out what to do with that.

You can use the contact form on the site instead of email if you prefer.

### Compensation and benefits

Depends entirely on what you propose.

---

## Consistency checks before publishing

- Every posting says "Twin Cities metro — hybrid". Confirm that is accurate for
  all five, and correct it everywhere at once if not.
- Every posting defers salary to offer stage. If ranges get added, add them to
  all five, not some.
- The claims about delivered work — MCP servers for a Medicare company, LLM
  analytics for a Twin Cities sports franchise — appear in postings 1's
  boilerplate and posting 3's role description. Both are owner-supplied and
  true. Do not extend them, and do not name either client.
- Apply subjects must stay exactly `Application: <Role Title>`, matching
  `docs/content/careers.md`, or the mail filing rule breaks.
