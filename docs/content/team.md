# Team bios — draft

Draft copy for `/about`. Phase 2 converts this into
`app/web/src/content/team.ts` typed against the `TeamMember` shape in
`app/web/src/content/types.ts`.

**Status of each bio:**

| Person        | Source                                                                            | Needs                               |
| ------------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| Marc McCarthy | Owner-supplied facts, rewritten                                                   | Review of wording only              |
| Nate B.       | Role owner-supplied (consultation specialist, not a developer); rest **invented** | Surname, real details, his sign-off |
| Ashley        | **Invented**                                                                      | Surname, real bio, her sign-off     |
| Marie         | **Invented**                                                                      | Surname, real bio, her sign-off     |

**Portraits supplied:** Marc, Nate, Ashley and Marie, as `marcm`, `nateb`, `ashleyt` and `mariem`. Filenames are the authoritative roster.

Everyone is based in the Twin Cities metro, which is accurate for the whole
team and is the one detail carried across all four.

---

## Marc M.

**Role:** Founder · Full-stack and AI Engineer

**Email:** marcm@mccorlabs.com

Marc has spent four years building full-stack software across a wide range of
projects — client websites through to MCP servers running in production for a
Medicare company. He owns the parts a client never sees as readily as the parts
they do: APIs, data models, deployment, and the monitoring that catches a
problem before a customer reports it. He recently moved into an AI role at his
corporate employer, and the work outside it runs in the same direction: AI
integration for an energy company on a volunteer basis, and LLM-driven analytics
over large databases for a major Twin Cities sports franchise. He also runs the
firm's teaching work, pairing with client teams on testing discipline,
accessibility and getting genuinely useful results out of AI tooling.

Away from the keyboard he is an active dad first, and after that you will find
him fishing, at a bonfire with friends, under a barbell, or watching more or
less any sport that happens to be on. Lately he has been deliberate about
meeting new people and building connections across the local business
community.

---

## Nate B.

**Role:** Consultation Specialist

**Email:** nateb@mccorlabs.com

<!-- TODO(owner): invented apart from the role. Nate to correct or replace. -->

Nate is the first person most clients talk to, and the reason the work that
follows tends to be the right work. Eight years in client-facing roles across
professional services, where he learned that the brief a client arrives with
is rarely the problem they actually have. He runs discovery, turns a vague
ambition into a scope the engineers can price, and stays involved through
delivery so nothing quietly drifts from what was agreed. He does not write the
code, and he is careful never to promise on the engineers' behalf.

Outside work he is restoring a mid-eighties pickup a great deal more slowly
than he planned, plays in a recreational hockey league he calls competitive and
his teammates call social, and spends as much of the summer as he can on the
water up north.

---

## Ashley T.

**Role:** Designer and Frontend Engineer

**Email:** ashleyt@mccorlabs.com

<!-- TODO(owner): bio invented. Ashley to correct or replace. Email confirmed. -->

Ashley designs and then builds, which means the handoff problem simply does
not exist on her projects. Six years in, split between an in-house brand team
and agency work, she has a particular interest in interfaces that stay legible
and usable under real conditions — slow connections, older devices, and
people who are not paying full attention. She runs the accessibility review on
every project the firm ships.

She is a printmaker outside of work, which she credits for her patience with
getting a detail exactly right, and she is usually training for a race she has
described as her last one.

---

## Marie M.

**Role:** Project Lead and Quality Engineer

**Email:** mariem@mccorlabs.com

<!-- TODO(owner): bio invented. Marie to correct or replace. Email confirmed. -->

Marie makes sure the thing that ships is the thing that was agreed, and that
it works. Eight years across delivery and QA, including a spell in regulated
healthcare software where a missed requirement was a compliance finding rather
than a bug report. She writes the test plan, runs the client conversations
where scope actually gets decided, and is the reason projects here tend to
finish on the date given at the start.

She coaches a youth soccer team, cooks far more than four people can eat, and
has an ongoing and unresolved argument with her garden's rabbits.

---

## Notes for phase 2

- **The owner is supplying real photographs of all four people.** So
  `TeamMember.mediaSlot` gets a real slot id per person rather than `null`, and
  `media-planner` must include four portrait slots in `MEDIA-PLAN.md` with a
  consistent crop and aspect ratio. Never substitute a stock photo for a missing
  portrait — presenting a stranger as a team member is a misrepresentation, and
  the sourcing catalog carries no model releases. If a photo is late, ship that
  person with the non-photographic treatment instead.
- **Coverage gaps closed, and worth re-checking.** `docs/content/services.md`
  advertises five services. Marc's bio now explicitly covers backend and
  infrastructure ("APIs, data models, deployment") and the teaching service;
  Ashley covers design and frontend; Marie covers delivery and quality; Nate
  covers the consulting conversation. If a sixth service appears, check it against
  the four bios before publishing — a service nobody visibly covers reads as
  padding, and a prospective client reads both pages.
- Bios are 80–110 words each, which is the length that reads as substantial
  without becoming a CV. Keep new ones in that band.
- Each `TeamMember` gains an `email` field in `types.ts`. The four addresses are
  the real mailboxes from `infra/settings.auto.tfvars`, so they are safe to
  publish — but publishing them plainly invites scraping. Render them as a
  `mailto:` link built at runtime from parts, or accept the spam as the cost of
  being reachable. Do not obfuscate with JavaScript that breaks without it.
- A published address gets scraped within days. If any of the four would
  rather not be individually contactable, use the shared mailbox for them
  instead and say so — this is each person's own call, not a site-wide one.
