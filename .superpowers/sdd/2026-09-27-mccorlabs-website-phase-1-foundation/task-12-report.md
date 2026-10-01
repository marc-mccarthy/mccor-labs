# Task 12 — Playwright e2e on Firefox: debugging report

## Root cause of the "27 failed, 1 passed" run

Not 27 broken assertions. The `webServer` was not serving the site during that run.

Evidence: with a healthy `serve` on port 4321, the same suite and the same specs give the
inverse result — **27 passed, 1 failed** (`pnpm -F web test:e2e`, 35.1s, 28 tests, 5 workers).
Nothing in the specs or the config changed between the bad run and this one; only the state of
port 4321 did. The prior run was made immediately after `pkill -f "serve out"`, with
`reuseExistingServer: !process.env.CI` set, so Playwright was pointed at a port whose server had
just been killed or was still shutting down.

## Confirmation of the `--single=false` finding

Independently verified against a live `serve` v14.2.6 with no `--single` flag:

```
/          -> 200 | <h1 ...>A small senior team building websites, applications and AI features...
/services/ -> 200 | <h1 ...>Services
/work/     -> 200 | <h1 ...>Work
/contact/  -> 200 | <h1 ...>Contact
/404.html  -> 301  (serve's default cleanUrls redirects to /404; Playwright follows it)
```

Each path resolves to its own document, so non-SPA really is the default and the flag was
load-bearing in the wrong direction. The explanatory comment in `playwright.config.ts` is
accurate as written.

## The one genuine failure

`a11y.spec.ts:34` — `every interactive element shows a visible focus indicator`

```
Test timeout of 30000ms exceeded.
Error: locator.evaluate: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Name')
```

Under investigation: whether `/contact/` in this build renders a form at all.

## Engine differences

None of the three predicted Firefox differences fired. All passed on Firefox headless:
- `a11y.spec.ts:27` skip link is first focusable element — passed (462ms)
- `motion.spec.ts:5` `document.getAnimations().length === 0` under reduced motion — passed (950ms)
- `a11y.spec.ts:34` outlineStyle — did not reach the assertion; the locator never resolved.

## The actual root cause: Playwright could not shut the web server down

The "27 failed" and the later 180s+ hang are the same bug, and it is not in the tests.

`DEBUG=pw:webserver` on a smoke run that owned the server:

```
01:23:48.073 pw:webserver Starting WebServer process pnpm exec serve out --listen 4321...
01:23:48.504 pw:webserver WebServer available          <- startup is 0.4s, never the problem
01:23:53.689 pw:webserver Terminating the WebServer
(nothing further — the run hung until my 250s `timeout` killed it: EXIT=124)
```

All 14 tests had already passed. The process then hung forever at *teardown*, printed no
summary, exited non-zero, and left `serve` listening on 4321 with PPID 1.

**Mechanism, measured.** Playwright spawns the `webServer` command detached and shuts it down by
SIGKILLing that command's process group. `pnpm exec` starts its child in a *new* process group, so
`serve` was never in the group being killed:

```
17024 pid, 17003 pgid   /bin/sh -c 'pnpm exec serve out --listen 4321'   <- Playwright's group
17053 pid, 17053 pgid   node .../serve/build/main.js out --listen 4321   <- its OWN group
```

SIGKILL cannot be forwarded, so pnpm died instantly without passing anything on. `serve` kept the
port, Playwright waited for the port to free, and the run never ended. (A plain SIGTERM to pnpm's
own pid *does* get forwarded and does stop serve — which is why this looked intermittent.)

Then `reuseExistingServer: !process.env.CI` hid it: each leaked server was silently adopted by the
next run. That is why a run made straight after `pkill -f "serve out"` behaved differently from
every run before it — it was the first run in a while with no inherited server.

**Fix** (`app/web/playwright.config.ts`, `webServer.command`): invoke the bin shim directly
instead of going through pnpm.

```
command: '../../node_modules/.bin/serve out --listen ' + String(PORT),
```

pnpm's shim `exec`s node, so `serve` keeps the spawned command's pid and process group and the
group kill reaches it. Verified:

```
01:41:06.147 pw:webserver Terminating the WebServer
01:41:06.150 pw:webserver Terminated the WebServer     <- 3ms, was an infinite hang
EXIT=0 · 14 passed (5.6s) · no listener left on 4321
```

## Site and build are not at fault

- Focus indicator exists globally: `app/web/src/styles/globals.css:49` —
  `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`
- `/contact/` in the build under test renders **no form at all**: grepping
  `out/contact/index.html` for `<input|<label|<textarea|<button|<form` returns nothing. Only
  `mailto:marcm@mccorlabs.com`.
- That is correct, intended behaviour. `ContactForm.tsx:23` returns the booking-link + mailto
  shape when `endpoint === null`, and `env.ts:57` documents `contactEndpoint` as optional:
  "null means no endpoint is provisioned yet; the form degrades to email."
- The endpoint really is unprovisioned: `op read op://Development/mccorlabs/contact_endpoint`
  returns empty with exit 0. The field exists and is blank — the mail server is what the current
  branch is building. So this cannot be fixed by rebuilding.

## The one remaining failure needs a ruling — STOPPED, not committed

`a11y.spec.ts:34` `every interactive element shows a visible focus indicator`, verbatim:

```
  ✘  12 [firefox] › tests/e2e/a11y.spec.ts:34:1 › every interactive element shows a visible focus indicator (30.0s)

  1) [firefox] › tests/e2e/a11y.spec.ts:34:1 › every interactive element shows a visible focus indicator

    Test timeout of 30000ms exceeded.

    Error: locator.evaluate: Test timeout of 30000ms exceeded.
    Call log:
      - waiting for getByLabel('Name')

      36 |   const outline = await page
      37 |     .getByLabel('Name')
    > 38 |     .evaluate((element) => {
         |      ^
```

This is **not** an engine difference and **not** a site defect. The test targets a form field that
the contact page deliberately does not render while no endpoint is provisioned. It contradicts its
own sibling spec: `contact.spec.ts:6-7` carries the comment "With no endpoint configured at build
time the form degrades to the booking link plus a mailto", and tolerates either shape. `a11y.spec.ts`
assumes only the form shape.

I did not touch the assertion. Three ways out, all of which are the owner's call:

1. Retarget the locator at an element that exists in both shapes — the mailto link or the booking
   CTA on `/contact/`. Faithful to the test's stated intent: I verified in Firefox that programmatic
   `.focus()` matches `:focus-visible` on input, link and button alike, so the global outline rule
   satisfies the assertion on a link exactly as it would on an input (probe output below). This is a
   change to the test, so it is not mine to make.
2. Guard it on the form being present, so it asserts the indicator on whichever shape rendered.
3. Build the e2e fixture with a contact endpoint set so the form always renders. Note this makes the
   suite's result depend on build-time env that the commit does not capture (`out/` is gitignored),
   and it would stop exercising the degraded branch entirely.

Firefox probe, programmatic `.focus()` against a `:focus-visible { outline: 2px solid red }` rule:

```
name {"outlineStyle":"solid","outlineWidth":"2px","fv":true}
lnk  {"outlineStyle":"solid","outlineWidth":"2px","fv":true}
btn  {"outlineStyle":"solid","outlineWidth":"2px","fv":true}
```

## Gate status

| Gate | Result |
| --- | --- |
| `pnpm -F web test:e2e` | 27 passed, 1 failed (35.6s), exit 1 — the failure above |
| `pnpm -F web test:e2e:smoke` | **14 passed (5.6s), exit 0** |
| `pnpm -F web lint` | exit 0 |
| `pnpm -F web exec tsc --noEmit` | exit 0 |

No commit was made: the full suite is not green and the only thing standing in the way is a test
change I was told not to make unilaterally.

## Engine differences: none

All three predicted Firefox risks passed:
- `a11y.spec.ts:27` skip link is the first focusable element — passed
- `motion.spec.ts:5` `document.getAnimations().length === 0` under reduced motion — passed
- outline computation — no difference found; see the probe above

## Housekeeping notes

- `app/web/tsconfig.json` and `app/web/next-env.d.ts` are modified in the working tree from an
  earlier `next build`. I ran no build, so I did not revert them — they were not mine to touch and a
  concurrent session may be mid-build. They are not in the planned commit. Caveat: the `tsc --noEmit`
  exit 0 above was measured against the rewritten `tsconfig.json` (`jsx: react-jsx`), not the
  committed one (`jsx: preserve`).
- Pre-commit lefthook runs `prettier --write` with `stage_fixed: true`, so the two files prettier
  currently flags (`a11y.spec.ts`, `motion.spec.ts`) get formatted and staged automatically. No
  manual format pass needed.
- No browser was installed. No branch was created or switched. `infra/` untouched.

## Follow-up: the 7.3-minute run is teardown, not startup

Startup was measured by hand from `app/web`, timing how long until
`curl -o /dev/null -w '%{http_code}' http://localhost:4321/` first returns 200:

```
pnpm-exec   localhost-200 after 0.551s
  127.0.0.1: 200 in 0.016640s
  localhost: 200 in 0.013704s
  bind: node 34871 mj 14u IPv6 0xcad5013993cfacb 0t0 TCP *:4321 (LISTEN)
direct-bin  localhost-200 after 0.348s
  127.0.0.1: 200 in 0.019437s
  localhost: 200 in 0.015201s
  bind: node 34909 mj 14u IPv6 0x5187b1b499e5990d 0t0 TCP *:4321 (LISTEN)
```

So, against the three hypotheses:

1. **No `localhost` versus `127.0.0.1` stall.** 13.7ms versus 16.6ms. `serve` binds dual-stack
   (`IPv6 *:4321`, which accepts IPv4 too), and both names resolve instantly. No change to
   `baseURL` or `webServer.url` is warranted.
2. **`pnpm exec` resolution is not the cost either.** 0.551s versus 0.348s — pnpm adds ~200ms, not
   minutes.
3. **Startup never took minutes at all.** Playwright's own instrumentation agrees: on the
   `pnpm exec` run traced above, `Starting WebServer process` at 01:23:48.073 and `WebServer
   available` at 01:23:48.504 — 431ms, well inside the 120s `webServer.timeout`, which is why the
   timeout never fired.

The minutes are spent *after* the tests finish. `Terminating the WebServer` is the last line
emitted, and the run then hangs with `serve` still holding the port. Playwright reports that wait
inside its total duration, which is why a 678ms test reports `1 passed (7.3m)`. Teardown time is
also variable — one of my runs was still hanging when a 250s `timeout` killed it (EXIT=124), while
the 7.3m run eventually resolved and exited 0.

The fix is still the right one and needs no timeout increase: invoking the bin shim directly puts
`serve` in the process group Playwright actually kills, and teardown drops from minutes to 3ms
(`Terminating` 01:41:06.147 → `Terminated` 01:41:06.150), with the full suite at 35.6s and smoke at
5.6s. Nothing in any test or in `baseURL` had to change.

## Major correction: the earlier chromium "route content wrong" failures were a config bug, not a site defect

Before acting on the Firefox ruling, I re-examined the first full chromium run's 12 failures (all
`routes.spec.ts` heading mismatches plus both `contact.spec.ts` tests). Every failing route returned
the **home page's** h1/title instead of its own. I proved — in full isolation, with the port
confirmed empty beforehand, a single `serve` process directly launched (not through `pnpm exec`, to
rule out PID-tracking confusion), and its own request log showing only my own curl calls — that this
is caused by the brief's literal webServer command:

```
command: 'pnpm exec serve out --listen ' + String(PORT) + ' --single=false',
```

`serve@14.2.6`'s `--single`/`-s` flag is a **presence-based boolean** (confirmed via `serve --help`:
"`-s, --single Rewrite all not-found requests to index.html`" — no `=value` form documented). Passing
`--single=false` does not disable it; `serve` treats the flag as present and turns SPA fallback **on**,
rewriting every HTML-ish request to `out/index.html` regardless of path. Proof, in isolation (port
confirmed empty first, single directly-launched `node .../serve/build/main.js` process, request log
shown):

```
--- requesting /services/ FIRST this time ---
<title>McCor Labs       <- should be "Services · McCor Labs"
--- then / ---
<title>McCor Labs
--- then /work/ ---
<title>McCor Labs        <- should be "Work · McCor Labs"
```

Dropping `--single` entirely (serve's default is already "do not rewrite to index.html" — i.e.
exactly the brief's intended `false`) fixes it immediately, same isolated method:

```
--- bare serve, NO --single flag at all ---
<title>McCor Labs</title>               (for /)
<title>Services · McCor Labs</title>    (for /services/)
<title>Work · McCor Labs</title>        (for /work/)
```

This fully explains the first chromium run's 12 failures (route headings, 404 page, both contact
tests) — none of them are real defects in the site, and none of them would have differed between
Chromium and Firefox. They were an artifact of a broken `webServer.command` in `playwright.config.ts`
Step 2, one layer beneath the test assertions. I note this so the earlier chromium numbers are not
read as a site finding.

Separately: `app/web/playwright.config.ts` on disk now already contains both the Firefox project
switch and a `webServer.command` fix — invoking `../../node_modules/.bin/serve` directly (no
`--single` flag) instead of `pnpm exec serve`, with a comment explaining that `pnpm exec` puts the
child in a new process group, so Playwright's SIGKILL-the-process-group teardown never reached
`serve`, which is why orphaned `serve`/port-4321 processes kept surviving across runs during this
task (I hit this repeatedly while diagnosing: killing `pnpm exec serve`'s tracked PID left the real
`serve` node process alive and squatting the port for a subsequent run). I did not write this edit
myself — I found the file already in this state when I opened it to apply the Firefox ruling. I
verified it rather than trusting it: confirmed `node_modules/.bin/serve`'s shim uses `exec node
.../main.js "$@"` (replaces the shell process image, same pid, same process group — so a group kill
now reaches it), and independently reproduced that dropping `--single` fixes route content (above).
Both checks pass, so I'm proceeding on this file as-is.

## Teardown measured end to end

A clean reproduction of the owner's single-test run, using the old `pnpm exec` command via a scratch
config so the repo file kept the fix:

```
01:57:29.855  Starting WebServer process pnpm exec serve out --listen 4321...
01:57:30.277  WebServer available                          <- 422ms
  ✓  1 routes.spec.ts:48:3 › the 404 page is exported and distinct (718ms)
01:57:32.072  Terminating the WebServer
01:58:20.847  Terminated the WebServer                     <- 48.8s of teardown
  1 passed (51.3s)
```

and it leaked an orphaned `serve` on 4321 again. The hang's *duration* is variable — 48.8s here,
still hanging past 250s in one run, 7.3 minutes in the owner's — but its *location* is always the
same: everything after `Terminating the WebServer`. Startup was 0.4s in every run measured.

## Resolution of a11y.spec.ts:34 — ruled, applied

The owner ruled: retarget the locator, keep the assertion. Applied.

The test now focuses the first link in the header's Primary nav rather than the contact form's Name
input, and is renamed `an interactive element shows a visible focus indicator`. A header nav link is
present in both contact-page shapes, so it will not break when the endpoint lands. The assertion is
unchanged — computed `outlineStyle` is not `none`.

### Deviation from the brief, recorded with its reason

**The brief named the contact form's Name input; this test targets a header nav link instead.** It
therefore covers the global `:focus-visible` rule in `globals.css`, **not form fields**.
**Form-field focus coverage is deferred to phase 2**, when `NEXT_PUBLIC_CONTACT_ENDPOINT` exists and
the form actually renders. That gap is real and is named here rather than buried.

Reason, per the owner's ruling: the input is absent for a legitimate, documented, *shipping* reason,
so the original locator asserted against a fiction. Two alternatives were rejected on the record:
guarding on the form's presence would make the test silently no-op in exactly the configuration that
ships, and a conditional assertion that never runs is indistinguishable from a passing one; building
the fixture with an endpoint would make the suite depend on build-time env the commit cannot capture
(`out/` is gitignored) and would mean inventing a contact endpoint value.

## Final state — committed

`08b2387174ef730e0f421dff8c4ff77523bf533a`
`test(web): Playwright route, accessibility, contact and motion suites`
8 files changed, 691 insertions. Staged exactly `app/web/playwright.config.ts`,
`app/web/tests/e2e/*`, `.gitignore`, `package.json`, `pnpm-lock.yaml`. `infra/` untouched; its three
modified files remain unstaged and belong to another session.

All gates re-run **after** the commit, because lefthook's `prettier --write` reformatted
`motion.spec.ts` and re-staged it, so the committed tree differed slightly from what was tested:

| Gate | Result |
| --- | --- |
| `pnpm -F web test:e2e` | **28 passed (9.0s), exit 0** |
| `pnpm -F web test:e2e:smoke` | **14 passed (5.0s), exit 0** |
| `pnpm -F web lint` | exit 0 |
| `pnpm -F web exec tsc --noEmit` | exit 0 |
| `pnpm format:check` | exit 0 — "All matched files use Prettier code style!" |

No leaked listener on 4321 after any run.

### Caveats worth keeping

- `app/web/tsconfig.json` and `app/web/next-env.d.ts` were modified in the working tree earlier in
  this session from someone's `next build`; by commit time they matched HEAD again and neither was
  staged, which `git status --short` confirmed. The earlier `tsc --noEmit` exit 0 in this report was
  measured against the rewritten form (`jsx: react-jsx`); the final one above was measured against
  the committed `jsx: preserve`.
- No browser was installed, `@playwright/test` stayed pinned at 1.61.0, Playwright was not added to
  `app/web`, and no branch was created or switched.
