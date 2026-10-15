# McCor Labs site holes, 2026-10-09

Audit of https://mccorlabs.com as served today, compared with the repo at `main` (0e92304). Live HTML was built 2026-10-08 16:40 UTC (`last-modified` header), four minutes after the last merge to `main`. No content drift was found between live pages and the source files compared (about, services, contact, careers, privacy, terms, work).

Method: curl of every sitemap and nav URL, headers, redirects, robots, sitemap, llms.txt, 404s and the booking link; Lighthouse 13.5.0 (one run per page, mobile and desktop, from a laptop, simulated throttling) on `/`, `/services/`, `/about/`, `/contact/`; DNS lookups; read-only AWS CLI calls (`sesv2 get-account`, `sesv2 list-email-identities`, `cloudfront list-distributions`, `cloudfront get-distribution-config`, `ec2 describe-instances`, `ssm describe-parameters` names only); source reading under `app/web/src`, `infra/` and `.github/workflows/`. The contact form was not submitted and no email was sent.

## Summary

27 holes: 2 critical, 5 high, 9 medium, 11 low.

Top 5 fixes, in order:

1. Get SES out of the sandbox, or route outbound mail another way, then send a test reply to an outside address. Today every reply from a `@mccorlabs.com` mailbox to a prospect should be rejected by SES.
2. Back the Medicare and sports-franchise claims with a published case study, or remove them, and remove or fill `/work/`.
3. Finish the legal pages: clear the 7 `TODO(owner)` strings and correct the privacy statements that are not true today.
4. Pick one team size and use it everywhere (about, careers, privacy).
5. Cut main-thread work on the mobile home page (Lighthouse performance 59, Total Blocking Time 3,970 ms).

## All holes by severity

| #   | Severity | Area                 | Hole                                                                                                                                            | Effort |
| --- | -------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Critical | Email / conversion   | SES is in the sandbox and production access was denied, so replies to prospects should fail                                                     | S to M |
| 2   | Critical | Credibility          | Named client claims on home, services and about, with no case study behind them; `/work/` is empty                                              | M      |
| 3   | High     | Legal                | 7 `TODO(owner)` strings render on the live privacy and terms pages                                                                              | S      |
| 4   | High     | Legal / trust        | Privacy policy states things that are not true or not backed today                                                                              | S      |
| 5   | High     | Credibility          | Team size is five on About, "four engineers" on Careers, "four-person firm" in Privacy                                                          | S      |
| 6   | High     | Conversion           | Contact form is switched off, says "not live yet", and no backend exists in `infra/`                                                            | M      |
| 7   | High     | Performance          | Home page on mobile: performance 59, TBT 3,970 ms, LCP 3.7 s                                                                                    | M      |
| 8   | Medium   | Content / SEO        | `/work/` is live, indexable and empty; hidden from nav and sitemap but shown in the Services build excerpt                                      | S      |
| 9   | Medium   | Content              | Services page says "how we price it" but shows no pricing                                                                                       | S      |
| 10  | Medium   | Security             | CSP is report-only with no report endpoint, so it neither protects nor reports; enforcing it as written would block WASM and any off-origin API | M      |
| 11  | Medium   | Credibility          | Founder bio says four years and a corporate day job; the site sells a "senior engineering studio"                                               | S      |
| 12  | Medium   | Credibility          | One portrait out of five, surnames reduced to initials, no profile links                                                                        | S to M |
| 13  | Medium   | Credibility          | No social proof anywhere: no testimonials, client names, LinkedIn, GitHub or business address                                                   | M      |
| 14  | Medium   | Careers / legal      | Five open calls with no location, pay, or employment type; applicant CVs not covered by the privacy policy                                      | S      |
| 15  | Medium   | Maintainability      | Deploy does not wait for the e2e, accessibility and budget tests                                                                                | S      |
| 16  | Medium   | SEO / AI readability | No structured data, no canonical link, no `og:url`                                                                                              | S      |
| 17  | Low      | Email security       | DMARC `p=none`; no MTA-STS or TLS-RPT; no CAA record                                                                                            | S      |
| 18  | Low      | Security             | No `/.well-known/security.txt`                                                                                                                  | S      |
| 19  | Low      | AI readability       | No `/llms.txt`                                                                                                                                  | S      |
| 20  | Low      | SEO                  | Home `<title>` is only "McCor Labs"; the H1 is a slogan that does not say what the firm does                                                    | S      |
| 21  | Low      | Performance          | Media and fonts cached for one day; hero video is 1.07 MB                                                                                       | S      |
| 22  | Low      | Performance          | e2e budgets have no hard limit on LCP time, TBT or JavaScript weight                                                                            | S      |
| 23  | Low      | Polish               | `apple-touch-icon` points at an SVG; `/favicon.ico` returns 404                                                                                 | S      |
| 24  | Low      | SEO / polish         | Unknown paths 301 before 404; 404 page title is "McCor Labs"; `/index.html` duplicates `/`                                                      | S      |
| 25  | Low      | Performance          | `http://www.mccorlabs.com/` takes two redirects to reach the apex                                                                               | S      |
| 26  | Low      | Accessibility        | The dormant contact form has no `autocomplete` attributes (WCAG 2.2 SC 1.3.5)                                                                   | S      |
| 27  | Low      | Measurement          | No access logs and no analytics, so conversion and incidents cannot be measured                                                                 | M      |

## Detail by area

### Email and conversion

**1. SES sandbox blocks replies to prospects. Critical.**

- Evidence: `aws sesv2 get-account` today returned `"ProductionAccessEnabled": false`, `"Max24HourSend": 200.0`, and review `"Status": "DENIED"` (case 179053849800238). The only verified identities are the `mccorlabs.com` domain and one other domain.
- The mail server relays all outbound mail through SES: `infra/modules/mailserver/templates/setup.sh.tftpl:184-187` sets `RELAY_HOST=email-smtp.$REGION.amazonaws.com` and the SES SMTP user. SPF is `v=spf1 include:amazonses.com -all`.
- Mechanism: in the sandbox, SES only sends to verified addresses or domains. A prospect's address is not verified, so a reply from `marcm@` (or any team mailbox) should be rejected at the relay. Inbound mail is unaffected (MX `mail.mccorlabs.com`, all five mailbox parameters exist under `/mccorlabs/mail/`).
- Not verified: I did not send a test email. The relay may queue and then bounce rather than fail at once; `setup.sh.tftpl:333` already alerts on a growing queue with "The SES relay credential is the usual cause".
- Why it matters: a prospect who emails any address on the site gets no reply, or a reply that never arrives. The site's whole call to action ends at email or a calendar link.
- Fix: open a new SES production access request with a clear use case (person-to-person business mail, low volume, bounce handling via the mail server). Until it is granted, send replies from another provider. Then send a test to an outside mailbox and confirm delivery.
- Effort: S to M (depends on AWS review).

**6. Contact form switched off. High.**

- Evidence: live `/contact/` shows "Our contact form is not live yet — book a call or email us directly." (`app/web/src/content/ui.ts:27`). `ContactForm.tsx:22-34` renders that text when `endpoint === null`. `app.env` has no `NEXT_PUBLIC_CONTACT_ENDPOINT`. `infra/` has no Lambda, API Gateway or other form backend.
- Why it matters: "not live yet" on the contact page reads as unfinished. Prospects who will not book a call or open a mail client have no path. The budget field, the one qualifying question, is never asked.
- Fix: either build the backend (and fix hole 1 first, since it would send through SES) or drop the "not live yet" line and present email and booking as the intended routes.
- Effort: M to build; S to reword.

### Credibility and claims

**2. Named client claims with nothing behind them. Critical.**

- Evidence:
  - `app/web/src/content/proof.ts:4` "MCP servers in production for a Medicare company"
  - `app/web/src/content/proof.ts:5` "LLM analytics over large databases for a Twin Cities sports franchise"
  - `app/web/src/content/services.ts:54` "We have shipped MCP servers in production for a Medicare company and LLM-driven analytics across large databases for a major sports franchise."
  - `app/web/src/content/team.ts:10` repeats both in the founder bio.
  - Live home page shows both under the heading "Delivered". Live `/work/` shows only "Case studies are in production. Talk to us in the meantime."
- Why it matters: these are the only proof points on the site. A buyer who looks for the work finds an empty page. The founder bio places the Medicare work within "four years building full-stack software" and mentions a corporate employer; a reader may ask whether this was firm work or employer work. I could not verify which.
- Fix: publish one case study per claim (problem, constraints, what was built, measured result, permission to name the sector), or soften to what can be shown. Remove the "Delivered" strip until it links to something.
- Effort: M.

**5. Team size contradicts itself. High.**

- Evidence: `about.ts:3` "We are five people in the Twin Cities"; `careers.ts:72` "We are four engineers who would rather build than sell"; `legal.ts:140` "This is a four-person firm". The About page lists five people, and only three have engineering titles.
- Why it matters: a careful reader sees three different team sizes. It reads as copy that was not checked, on a site that sells care.
- Fix: decide the number and wording once, then fix all three lines. A content test asserting one source of truth would stop recurrence.
- Effort: S.

**11. Founder experience versus "senior studio". Medium.**

- Evidence: `site.ts:4,6` "Senior engineers on your project", "A senior engineering studio". `team.ts:10` "Marc has spent four years building full-stack software" and "He recently moved into an AI role at his corporate employer".
- Why it matters: buyers often read "senior" as eight-plus years. A founder with a day job raises a question about availability. This is a perception risk, not a fact about the work.
- Fix: lead with the team's combined years and specific outcomes; state availability plainly (for example, response times and who staffs an engagement).
- Effort: S.

**12. Thin team presentation. Medium.**

- Evidence: `lib/portraits.ts:10-17` has a portrait only for `nateb`. The other four show a numbered panel (`TeamGrid.tsx:19-32`), so the live About page reads 01, photo, 03, 04, 05. Names are first name plus initial (`team.ts:6,14,22,30,38`). No LinkedIn or other profile links.
- Why it matters: initials and placeholder panels make it hard to confirm the people exist. The five mailboxes do exist (SSM parameter names), but a visitor cannot see that.
- Fix: real portraits for all five, or none; full names if the team agrees; one profile link each.
- Effort: S to M.

**13. No social proof. Medium.**

- Evidence: across all nine live pages there are no testimonials, client names or logos, no LinkedIn or GitHub link, and no business address. Footer reads "© 2026 McCor Labs. All rights reserved." with no LLC name or location.
- Why it matters: with an empty `/work/`, nothing on the site lets a buyer check the firm outside the site itself.
- Fix: add one or two attributed quotes, a company LinkedIn page, a public GitHub org or repo, and the legal entity and city in the footer.
- Effort: M.

**9. Pricing promised, not shown. Medium.**

- Evidence: `app/services/page.tsx:13,21` "What we build, and how we price it." Live `/services/` has no price, rate or range. Price ranges exist only in the dormant form (`site.ts:8`).
- Why it matters: the page promises an answer it does not give, and buyers screen on price.
- Fix: add starting ranges or the fixed-price proof-of-concept model from the process page, or change the description.
- Effort: S.

**8. `/work/` is an empty, indexable page. Medium.**

- Evidence: `https://mccorlabs.com/work/` returns 200 with no `noindex`. It is not in `nav.ts` or `sitemap.xml`. The Services build excerpt (live) lists `└ ○ /work`, which points readers at it.
- Why it matters: a thin page can be indexed and found, and it confirms there is no work to show.
- Fix: remove the route until there is a case study, or add `robots: { index: false }`, and drop `/work` from the build excerpt.
- Effort: S.

### Legal and privacy

**3. Placeholder text on live legal pages. High.**

- Evidence: 7 `TODO(owner)` strings in `app/web/src/content/legal.ts` at lines 6, 21, 123, 223, 230, 275, 284. All render live, for example "Last updated: TODO(owner): date of publication" and "TODO(owner): limitation of liability and warranty disclaimer wording, to be supplied by counsel."
- Why it matters: the terms page says outright it has had no attorney review. Procurement or legal reviewers at a client will notice.
- Fix: fill the date, PO box and retention period; get counsel's wording for liability and governing law. Add a test that fails the build on any `TODO(owner)` in content.
- Effort: S for the facts; legal review time is outside the code.

**4. Privacy policy statements not true today. High.**

- Evidence:
  - `legal.ts:30` "We collect what you send us through the contact form" while the form is off (hole 6).
  - `legal.ts:87` "The site does store a small amount of information in your own browser to remember your preferences." A search of `app/web/src` for `localStorage`, `sessionStorage`, `indexedDB` and `document.cookie` returns nothing.
  - `legal.ts:139` "access requires multi-factor authentication" for email. `infra/modules/mailserver` sets up IMAP and submission with passwords; I found no MFA mechanism there. How team members reach their mail is not visible to me, so this is unverified rather than shown false.
  - `legal.ts:140` "four-person firm" (see hole 5).
- True and verified: CloudFront logging is disabled (`get-distribution-config` returns `"Enabled": false`), matching `legal.ts:90`. Fonts are self-hosted (`/fonts/geist-*.woff2`). Mail volumes are encrypted (`mailserver/main.tf:221,247`).
- Why it matters: a privacy policy must describe what actually happens. Inaccurate statements are a legal exposure and undercut the page's "you should not have to take our word for it" tone.
- Fix: rewrite the four statements to match the system as it runs, and recheck them whenever a feature ships.
- Effort: S.

**14. Careers gaps. Medium.**

- Evidence: live `/careers/` lists Software Engineer I, Software Engineer II, AI-forward engineer, Marketing specialist and Speculative. None states location, remote policy, pay, or full-time versus contract. All apply links are `mailto:marcm@mccorlabs.com?subject=Application…`. The privacy policy covers contact-form and email enquiries but says nothing about job applications or CVs.
- Why it matters: four open roles at a five-person firm with no shown work may read as inflated. Candidates also cannot self-screen.
- Fix: add location, work mode, employment type and a pay range to each role, or mark roles as future interest; add an applicant section to the privacy policy.
- Effort: S.

### Performance

**7. Home page is slow on mobile. High.**

- Evidence (Lighthouse 13.5.0, mobile preset, one run): `/` performance 59, LCP 3.7 s, TBT 3,970 ms, Time to Interactive 8.0 s, main-thread work 5.5 s. Desktop `/` scored 100. Other pages on mobile: `/services/` 92 (LCP 3.4 s), `/about/` 97, `/contact/` 96.
- Bootup time is dominated by `_next/static/chunks/2tixv03f3hn1p.js` (3.2 s scripting; it contains React DOM) and `_next/static/chunks/1fneeh8t_dw2m.js` (1.5 s; 738 KB uncompressed, contains three.js `WebGLRenderer`). Which component triggers the React work I did not trace; the 3D scenes are the likely cause but that is an inference.
- Why it matters: Services sells "Performance budget, measured rather than promised". A prospect who runs Lighthouse on a phone sees 59 on the home page.
- Fix: defer the three.js scene until idle and after first interaction or visibility, show the poster first on mobile, and add a hard TBT or JS budget (hole 22). Re-run Lighthouse three times and take the median before and after.
- Effort: M.

**21. Short cache on media and fonts. Low.**

- Evidence: `deploy.yml:199` sets `media` and `fonts` to `max-age=86400`. Lighthouse lists `hero-loop.webm` (1,096,082 bytes), `systems-lattice.webp`, `mccor-stag-hero.webp` and both fonts under "Use efficient cache lifetimes".
- Fix: content-hash media and font file names and serve them `immutable`, or raise `max-age`. Consider a smaller mobile hero video.
- Effort: S.

**22. Missing hard budgets. Low.**

- Evidence: `app/web/tests/e2e/budgets.spec.ts:11-15` asserts CLS, INP, font bytes and LCP image bytes. JavaScript weight is "soft, measured and reported only" (line 209). There is no LCP-time or TBT assertion, which is why hole 7 passed CI.
- Fix: add a hard initial-JS limit for `/` and a Lighthouse CI or trace-based TBT check on mobile.
- Effort: S.

**25. Two hops from `http://www`. Low.**

- Evidence: `http://www.mccorlabs.com/` returns 301 to `https://www.mccorlabs.com/`, which returns 301 to `https://mccorlabs.com/`. Other entry points take one hop.
- Fix: acceptable as is; a CloudFront function cannot see plain HTTP before the viewer-protocol redirect. Note only.
- Effort: S.

### Security

**10. CSP is report-only and has no report target. Medium.**

- Evidence: live header `content-security-policy-report-only: default-src 'self'; script-src 'self' 'unsafe-inline'; … connect-src 'self'; … form-action 'self'; frame-ancestors 'none'`, set at `infra/modules/static_site/main.tf:47,78`. No `report-uri` or `report-to`.
- Why it matters: report-only means the browser blocks nothing, and with no report target nobody sees violations either. The policy is decoration today. The site has no user input, so current exploit risk is low, but a client reviewing headers will see it.
- Lead checked: "the CSP may block WASM". Today it blocks nothing because it is report-only. If enforced as written, it would block WebAssembly (no `'wasm-unsafe-eval'`) and any off-origin fetch such as a Lambda URL or API Gateway endpoint (`connect-src 'self'`). Live JS chunks I checked contain no `WebAssembly` calls, so nothing breaks today.
- Fix: add a reporting endpoint, watch for a week, then enforce. Remove `'unsafe-inline'` from `script-src` with hashes or nonces if feasible on a static export. Plan per-path policies for the showcase feature before it ships.
- Effort: M.

**17. Email domain hardening. Low.**

- Evidence: `_dmarc.mccorlabs.com` is `v=DMARC1; p=none; rua=mailto:marcm@mccorlabs.com`. No `_mta-sts` TXT record. No CAA record on `mccorlabs.com`.
- Fix: move DMARC to `quarantine`, then `reject`, after reviewing reports. Add MTA-STS and TLS-RPT. Add CAA for Amazon and Let's Encrypt (the mail server uses `SSL_TYPE=letsencrypt`).
- Effort: S.

**18. No security.txt. Low.**

- Evidence: `https://mccorlabs.com/.well-known/security.txt` returns 404.
- Fix: publish one with a contact and expiry.
- Effort: S.

Headers that are present and correct: HSTS one year with `includeSubDomains` (no preload), `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy`. S3 is private behind OAC (`static_site/main.tf:17-30,153-175`). TLS minimum is `TLSv1.2_2021`.

### SEO and AI-agent readability

**16. No structured data or canonical. Medium.**

- Evidence: no page has `application/ld+json`, `<link rel="canonical">` or `og:url`. `og:locale` is `en` rather than `en_US`. `metadataBase` is set (`app/layout.tsx:13`), so OG image URLs are absolute.
- Why it matters: search engines and AI agents get no machine-readable statement of who the firm is, where it is, or what it offers. `/index.html` also serves the home page (hole 24), so a canonical matters.
- Fix: add `Organization` (or `ProfessionalService`) JSON-LD in the root layout, `alternates.canonical` per page, and `openGraph.url`.
- Effort: S.

**19. No llms.txt. Low.**

- Evidence: `https://mccorlabs.com/llms.txt` returns 404.
- Fix: publish a short file listing services, process and contact, generated from the content modules.
- Effort: S.

**20. Weak home title and H1. Low.**

- Evidence: home `<title>McCor Labs</title>`; H1 "Swift by Instinct. Engineered to the Core." The descriptor "Senior Engineering & AI Studio" is only an eyebrow above it.
- Fix: title along the lines of "McCor Labs · Engineering and AI studio, Twin Cities"; keep the slogan but make the H1 or lede say what the firm does and where.
- Effort: S.

**24. 404 and duplicate URL handling. Low.**

- Evidence: `/nonexistent-xyz` returns 301 to `/nonexistent-xyz/`, which returns 404 (`viewer_request.js.tftpl:17-19` adds the slash before checking existence). The 404 page title is "McCor Labs" with H1 "That page does not exist". `/index.html` returns 200 with the home page.
- Fix: give the 404 page its own title; redirect `/index.html` to `/`. The extra 301 is minor.
- Effort: S.

Lighthouse SEO, best-practices and accessibility scored 100 on all four pages tested. `robots.txt` allows all and points at the sitemap. The sitemap lists 8 URLs; `lastmod` is the build time for every URL, which search engines may learn to ignore.

### Accessibility

**26. Dormant form lacks autocomplete. Low.**

- Evidence: `components/contact/ContactForm.tsx:92-98` (name) and `112-119` (email) have no `autocomplete` attribute. WCAG 2.2 SC 1.3.5 (Identify Input Purpose, AA) asks for it on fields that collect user data.
- Fix: add `autocomplete="name"`, `"email"` and `"organization"` before the form goes live.
- Effort: S.

Lighthouse accessibility scored 100 on `/`, `/services/`, `/about/` and `/contact/`, mobile and desktop. The repo runs axe in e2e (`tests/e2e/a11y.spec.ts`). Automated checks cover a fraction of WCAG 2.2; a manual keyboard and screen-reader pass was not done in this audit.

### Polish

**23. Icons. Low.**

- Evidence: `<link rel="apple-touch-icon" href="/icon.svg"/>`. iOS does not use SVG for touch icons. `/favicon.ico` and `/apple-touch-icon.png` return 404.
- Fix: add a 180 by 180 PNG touch icon and a `favicon.ico`.
- Effort: S.

### Maintainability and delivery

**15. Deploy is not gated on e2e tests. Medium.**

- Evidence: `deploy.yml:24-49` runs lint, `tsc` and unit tests, then builds and deploys. The e2e, axe and budget suites run only in `ci.yml:35-51`, which runs in parallel on push to `main` and is not a dependency of deploy.
- Why it matters: an accessibility or budget regression merged without a PR check can go live.
- Fix: require the CI e2e job as a branch protection check, or add it to the deploy workflow's `needs`.
- Effort: S.

**27. No measurement. Low.**

- Evidence: CloudFront logging off; no analytics (by design, per `legal.ts:30,90`).
- Why it matters: there is no way to know whether a fix improves conversion, or to investigate abuse. This is a deliberate privacy choice, so it is low.
- Fix: if wanted, a cookieless, aggregate-only counter, with the privacy policy updated first.
- Effort: M.

## Leads re-verified

| Lead                                                | Result                                                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `proof.ts:4-5` claims with empty `/work/`           | Confirmed (hole 2)                                                                            |
| `services.ts:54` similar claim                      | Confirmed (hole 2)                                                                            |
| 7 `TODO(owner)` in `legal.ts`                       | Confirmed, all render live (hole 3)                                                           |
| Contact form backend may not work                   | Confirmed: the form is off and no backend exists (hole 6)                                     |
| CSP may block WASM                                  | Partly: report-only today, so nothing is blocked; it would block WASM once enforced (hole 10) |
| Team size four versus five                          | Confirmed, in three places (hole 5)                                                           |
| SES still in sandbox                                | Confirmed, and the last production request was denied (hole 1)                                |
| 2026-10-06 note that the site stack was not applied | Out of date: CloudFront distribution `E1VLB40ZAFQ7FF` serves `mccorlabs.com` and `www`        |

## Could not verify

- Whether outbound mail actually bounces. No test email was sent; the conclusion rests on the SES sandbox rule and the relay config.
- Whether the Medicare and sports-franchise work was done by McCor Labs or by the founder at an employer, and whether the clients allow the sector to be named.
- Whether team members use MFA to reach their mailboxes.
- Whether the five people on the About page all work for the firm. Only their mailboxes were confirmed.
- What exactly drives the 3.2 s of React DOM scripting on mobile `/`. Lighthouse figures are one lab run each with simulated throttling, not field data; no CrUX data was checked.
- `/process/`, `/careers/`, `/privacy/`, `/terms/` and `/work/` were not run through Lighthouse.
- Screen-reader and keyboard behaviour beyond automated checks.
- How OG images render on each social platform.
- The Google Calendar booking page beyond its 302 response.
