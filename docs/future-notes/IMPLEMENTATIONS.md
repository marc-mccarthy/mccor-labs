# Future Notes

Deliberately deferred decisions for mccorlabs.com. Each entry records what was
considered, why it was deferred, and what adopting it would actually cost — so a
future decision starts from the reasoning rather than from scratch.

Last updated: 2026-09-27

---

## Analytics — Plausible or Umami

**Status:** deferred. The site ships with no analytics at all.

**What these are.** Both are privacy-first web analytics tools that replace Google
Analytics. They record pageviews, referrers, entry/exit pages, device and country,
and (if configured) custom events such as form submissions or booking-link clicks.
Neither one sets cookies or tracks individuals across sites.

|               | Plausible                    | Umami                    |
| ------------- | ---------------------------- | ------------------------ |
| Hosted price  | from ~$9/mo                  | free tier on Umami Cloud |
| Self-host     | yes, official Docker Compose | yes, official Docker     |
| Script weight | < 1 KB                       | ~2 KB                    |
| Cookies       | none                         | none                     |
| Licence       | AGPL-3.0                     | MIT                      |
| Data location | EU (hosted)                  | wherever you host it     |

**Why this matters for a marketing site.** Without it there is no way to know which
pages lead to booked calls, whether anyone reaches the Work page, or where traffic
comes from. That is the difference between improving the site and guessing at it.

**Why cookieless specifically.** No cookies and no cross-site identifiers means no
consent banner is required under GDPR/ePrivacy or the UK equivalent. Google
Analytics 4 does require a consent banner, a longer privacy policy, and ships a
much heavier script — all of which undercut a pitch built on fast, respectful
sites.

**Cost to adopt later.** Small and self-contained:

1. Add the script tag to the root layout (one file).
2. Optionally wrap it so it is skipped in development.
3. Add custom events for the two conversions worth measuring — booking-link click
   and contact-form submit.
4. Update the privacy policy to name the processor and state that no cookies are
   set and no personal data is collected.

Roughly an hour of work. Nothing in the current architecture blocks it, and no
decision being made now needs to account for it.

**Self-hosting note.** Self-hosting either tool means running a container and a
Postgres (Plausible also wants ClickHouse), which is a real operational burden
next to a ~$9/mo hosted plan. Worth it only if the data must stay in the AWS
account.

---

## Light mode / theme toggle

**Status:** deferred. The site ships dark-only (`#070a12` base).

**Kept cheap by design.** The build is required to use semantic design tokens
(`var(--surface)`, never a raw hex value in a component) and to reserve an unused
`data-theme` attribute on `<html>` from day one. Adding the toggle itself is then
`next-themes` plus one new token block — an afternoon.

**The real cost is not the toggle.** Every signature visual moment has to be
re-authored, because effects tuned for a near-black base do not survive on white:

- WebGL shader backgrounds need different color ramps and often a different
  blend mode.
- The violet→cyan glow gradients read as bruising on a light background.
- Pinned-scroll scenes lose their contrast relationships.
- Any dark-shot video or imagery needs a second treatment or a second asset.
- QA doubles across all four viewports.

**Estimate.** ~1 day for all UI chrome, plus ~1–2 days per signature moment.

---

## Blog / Insights section

**Status:** deferred, and deliberately so.

MDX articles with tag pages and an RSS feed would help SEO and credibility. It was
declined for v1 because an unmaintained blog actively damages credibility — a
newest post dated eighteen months ago reads worse than no blog at all. Revisit
only when someone has actually committed to writing.

**Cost to adopt later:** MDX pipeline, a content schema, tag routes, feed
generation, and article layout/typography. Several days, and it is additive rather
than structural.

---

## Individual case-study pages

**Status:** deferred. `/work` ships as a countdown/teaser page instead.

Per-project detail pages (`/work/[slug]`) covering problem, approach and result are
the single strongest trust signal a small firm can have. Blocked on real client
projects plus written permission to show them, not on engineering.

**Cost to adopt later:** a content schema, the detail-page route and layout, plus
media slots per case study. The `/work` route already existing means the teaser
page is replaced rather than retrofitted.

---

## Cloudflare Turnstile on the contact form

**Status:** deferred. Ships with honeypot field plus API Gateway rate limiting.

The current approach costs nothing, adds no dependency and no UX friction, and
stops naive bots. It will not stop a determined or targeted spammer.

**Adopt when** the contact inbox starts receiving spam that the honeypot misses.
Turnstile is free, shows no puzzle in the normal case, and unlike reCAPTCHA sends
nothing to Google. Requires a Cloudflare account and one verification call added
to the Lambda handler — under an hour.

---

## Webmail

**Status:** deferred from the mail-server project (v2 there), noted here so it is
not lost.

See `docs/superpowers/specs/2026-09-26-mail-server-design.md`. Mail v1 is
IMAP/SMTP only; a webmail interface was explicitly scoped out.
