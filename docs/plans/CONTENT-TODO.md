# Content TODO

Every `TODO(owner)` string below renders visibly on the page. Phase 4's definition of done requires this file to be empty.

## /privacy (`src/content/legal.ts`, `privacy`)

- Last updated: date of publication.
- Postal address: a real PO box for McCor Labs LLC. The source draft's Blaine, MN address is a fabricated placeholder and is deliberately not published.
- Retention period: the source draft proposes 24 months; owner to confirm.
- Attorney review of the whole policy, per `docs/content/privacy-policy.md`.

## /terms (`src/content/legal.ts`, `terms`)

- No terms source copy exists in `docs/content/`. The page is a minimal draft written to describe only what the site does; attorney review of the whole page.
- Last updated: date of publication.
- Limitation of liability and warranty disclaimer wording.
- Governing law and venue.

## Deferred features

These are not `TODO(owner)` strings and do not count toward phase 4's empty-file rule. Each one was deliberately deferred; none is implemented yet.

- **Analytics (Plausible or Umami).** The site ships with none, so there is no way to know which pages lead to booked calls. Both tools are cookieless, so no consent banner is needed. Plausible is hosted from about $9/mo and its script is under 1 KB, AGPL-3.0. Umami has a free cloud tier and a ~2 KB script, MIT. Cost: about an hour. Add the script to the root layout and skip it in development. Add events for the booking-link click and the contact-form submit. Update `/privacy` to name the processor, because `legal.ts` currently says no analytics service is used. Self-hosting means a container plus Postgres (and ClickHouse for Plausible); it is worth it only if data must stay in the AWS account.
- **Light mode and a theme toggle.** The site is dark-only, and `<html>` already carries `data-theme="dark"`. Components use semantic tokens, so the toggle is `next-themes` plus one light token block: about an afternoon. The real cost is re-authoring every signature visual for a light base: shader color ramps and blend modes, the glow gradients, pinned-scroll contrast, and second treatments of dark-shot video and imagery. QA also doubles across all four viewports. Estimate: about 1 day for UI chrome, plus 1–2 days per signature moment.
- **Blog / Insights.** This would be MDX articles, tag pages and an RSS feed. It was declined for v1 because an unmaintained blog damages credibility more than having no blog. Revisit it only once someone commits to writing. Cost: several days for the MDX pipeline, content schema, tag routes, feed and article layout. The work is additive, not structural.
- **Case-study pages (`/work/[slug]`).** `/work` is a teaser today. Detail pages covering problem, approach and result are the strongest trust signal a small firm has. They are blocked on real client projects and written permission, not on engineering. Cost: a content schema, the route and layout, and media slots per study.
- **Cloudflare Turnstile on the contact form.** The form ships with a honeypot field and API Gateway rate limiting, which stop naive bots but not a targeted spammer. Adopt Turnstile when spam starts getting past the honeypot. It is free, shows no puzzle in the normal case and sends nothing to Google. Cost: a Cloudflare account plus one verification call in the Lambda handler, under an hour.
- **Webmail.** This is v2 of the mail-server project. Mail v1 is IMAP/SMTP only, and webmail was explicitly scoped out.
