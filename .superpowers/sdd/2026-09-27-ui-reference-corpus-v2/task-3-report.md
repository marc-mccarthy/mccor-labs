# Task 3 audit report — `scripts/lib/sites.mjs` (tier-1 scope)

Scope: audit only, per team-lead correction. `scripts/lib/sites.mjs` (958 lines) and
`scripts/verify-site-selectors.mjs` (359 lines) already exist and are already committed
(commit `4c2edd5`, reformatted by `771877d`). No file was created or rewritten for this task.
No edits were made to `sites.mjs`, `verify-site-selectors.mjs`, or any other file. No `git add`,
no commit.

Four sites in scope: `david-hckh`, `pacomepertant`, `topology-vc`, `belenjones`.

---

## 1. Record-shape audit against Task 3 (plan lines 84-168)

All four sites carry the full required shape (`slug`, `origin`, `tier`, `smoothScroll`, `routes[]`
with per-route `archetype`/`entry`/`sections`-or-`states`, `selectors`, `effects`, `quirks`):

| site | lines |
|---|---|
| david-hckh | 87-169 |
| pacomepertant | 171-269 |
| topology-vc | 271-334 |
| belenjones | 336-418 |

Required interfaces, all present: `VIEWPORTS` L40, `TIERS` L47 (`maxRoutes: 4` for tier 1 at L50),
`SITES` L85, `viewportsFor`/`routesFor`/`tierOf`/`archetypeOf`/`siteBySlug` L939-958.

**No field is genuinely missing for these four sites.** Two items looked like gaps on first read
and are not — recorded here so the next agent doesn't re-litigate them:

- **topology-vc: no "CAREERS" state.** `states` (L295-312ish, see §3) covers ABOUT / PRINCIPLES /
  TEAM / PUBLIC GOODS only — four items. Plan line 135 also names a fifth nav item, "CAREERS."
  Checked every findings file (`gate-inventory.md`, `interaction-model.md`, `hover-deltas.json`,
  `deepdive-hard-sites.md`, `visual-confirm.md`, `_recon/topology-vc.json`) and `docs/ui-references/README.md`
  — none mentions "career" in any form. The plan's own prose asserts a fact no findings file backs.
  `sites.mjs`'s silence on it is the correct call under "a number not measured in the run that wrote
  it does not go in a file" — adding a selector for it now would be exactly the invented-selector
  failure mode the plan exists to prevent. Left as-is. If CAREERS is real, it needs its own
  measurement pass before it belongs in this file.
- **david-hckh: only 3 of 5 live `/project/` routes.** The routes array (~L118) does
  `['cubewar', 'quibbo', 'sharkie'].map(...)`, omitting `particles` and `pokedex`, even though
  gate-inventory.md and the plan both list all five as real, server-routed pages. This is harmless:
  `TIERS[1].maxRoutes = 4` (L50) caps `routesFor()` to `home` + the first 3 routes regardless of how
  many are listed, so particles/pokedex would never be used by a tier-1 capture even if present.
  Not a defect against what the interfaces actually consume.

---

## 2. The three documented obstacles — all handled

- **pacomepertant: pre-entry click cannot be pre-seeded.** `entry` block L186-196 records
  `method: 'locator'`, `settleBeforeMs: 3000`, and the substring-match note (button text doubled:
  "enter with soundenter with sound"). `quirks.noStoragePersistence: true` at L265 ("0 keys
  before/after; every fresh context must click through") and `quirks.entrySignal` at L264 record
  that no pre-seed shortcut exists and what "entered" means (gate disappearing, not content growth).
  **However, live verification now contradicts the `method: 'locator' enters reliably` claim at
  L191-192 — see §3 below, this is the most important finding in this audit.**
- **topology-vc: fake `scrollHeight`.** `docScrollHeight: 900` at L283, with the comment at
  L284-286 explaining that the five `.js-anchor-section` ids sit at absolute `y=4110..7685` inside a
  document that reports a constant non-scrolling 900px height — the swap is transform-driven, not
  real scroll. Handled architecturally: `archetype: 'B'`, `scrollDriver: null`, sections captured as
  nav states (clicking each nav link), never by scrolling the (lying) document.
- **belenjones: fake `scrollHeight`.** `docScrollHeight: 900` at L348, `scrollDriver: null` with a
  comment that the project-detail overlay scrolls internally to 3531px while the window never moves.
  `quirks.decoyTallestElement` at L406 separately documents the 45000px decorative
  `[class^="landing__BgStrip-"]` strip that a naive "tallest element" heuristic would mistake for
  the real page — this is what the original scripted recon pass did, per `deepdive-hard-sites.md`.

---

## 3. `verify-site-selectors.mjs` live results (Task 3 Step 2)

Run as `PATH=/opt/homebrew/bin:$PATH node scripts/verify-site-selectors.mjs --site <slug>`.
Pinned `@playwright/test` 1.61.0, `chromium-1228` already installed — `playwright install` never run.

### david-hckh — PASS, exit 0
All 76 selectors resolve as declared, 4 routes (`home`, `project-cubewar`, `project-quibbo`,
`project-sharkie`) x 4 tier-1 viewports (wide/desktop/tablet/mobile). No mismatches.

### pacomepertant — FAIL, exit 1 (confirmed explicitly via captured `$?`, not inferred)

Run twice (network conditions differed slightly between runs; the home-route failure did not):

**Run 1** — "4 DEFECTS across 30 checks — fix sites.mjs before any capture"
- `home @ wide`: `GATE_NOT_ENTERED`
- `home @ desktop`: `GATE_NOT_ENTERED`
- `home @ tablet`: `GATE_NOT_ENTERED`
- `home @ mobile`: ok (2 selectors)
- `about @ wide/desktop/tablet`: ok (7 selectors each)
- `about @ mobile`: `MISMATCH` — `section:image-trail = 0` for selector `.image-trail`

**Run 2** — "5 DEFECTS across 21 checks — fix sites.mjs before any capture", `PACO_EXIT=1`
- `home @ wide/desktop/tablet/mobile`: `GATE_NOT_ENTERED` (all four, this run)
- `about @ wide/desktop/tablet`: ok (7 selectors each)
- `about @ mobile`: `ERROR TimeoutError: page.goto: Timeout 90000ms exceeded.`

**Findings, kept distinct on purpose:**
1. **Real defect — the gate.** `home` route `GATE_NOT_ENTERED` on 3-4 of 4 viewports, in both runs.
   `sites.mjs:191-192` claims `method: 'locator'` "enters reliably even headless" and that this
   contradicts the plan's raw-mouse recipe. Live behavior today does not bear that out: the
   `locator.click()` on `main button.enter` is not opening the gate most of the time. This is the
   single most load-bearing claim for pacomepertant's archetype-C capture and it is currently false
   against the live site. **Not fixed here** — per instruction, finding a working entry mechanism is
   capture-harness work for a later task with its own verification, not an audit-time improvisation.
2. **Possible real selector defect — `.image-trail` at mobile.** Run 1 only; `section:image-trail`
   matched 0 elements at the `mobile` viewport on the `about` route. Candidate explanations not
   tested here: viewport-limited (the trail effect may be desktop-only and belongs in a
   `{selector, viewports:[...]}` form instead of a bare string), or genuinely stale. Needs its own
   check before editing `sites.mjs`.
3. **Not a selector defect — mobile `about` timeout in run 2.** `page.goto` timing out at 90s is
   network/load flakiness, not evidence against the `.image-trail` selector or any other. Do not
   conflate this with finding 2; they are different failure classes on the same route/viewport by
   coincidence of this run.

### topology-vc — pending, running now
### belenjones — pending, queued after topology-vc

## Live selector verification — topology-vc and belenjones

Run by the controlling session directly, in the foreground, 2026-10-01.

### topology-vc

```
$ PATH=/opt/homebrew/bin:$PATH node scripts/verify-site-selectors.mjs --site topology-vc
EXIT=0
topology-vc/home @ wide: ok (7 selectors)
topology-vc/home @ desktop: ok (7 selectors)
topology-vc/home @ tablet: ok (7 selectors)
topology-vc/home @ mobile: ok (7 selectors)

all 28 selectors resolve as declared at every tier viewport
```

No mismatches. The deliberate `docScrollHeight: 900` pin at `scripts/lib/sites.mjs:283`, which
guards against the site's fake `scrollHeight`, did not interfere with selector resolution.

### belenjones

```
$ PATH=/opt/homebrew/bin:$PATH node scripts/verify-site-selectors.mjs --site belenjones
EXIT=0
belenjones/home @ wide: ok (9 selectors, cardx9)
belenjones/home @ desktop: ok (9 selectors, cardx9)
belenjones/home @ tablet: ok (9 selectors, cardx9)
belenjones/home @ mobile: ok (8 selectors, cardx9)

all 35 selectors resolve as declared at every tier viewport
```

No mismatches. Nine cards resolve at every viewport, matching the count recorded in the site
record. Mobile reports eight selectors rather than nine because one is viewport-conditional by
declaration, not because a selector failed. The 45,000px decorative decoy element flagged at
`scripts/lib/sites.mjs:406` did not affect resolution.

## Tier-1 status after this verification

| Site | Result | Capture-ready |
|---|---|---|
| `david-hckh` | exit 0, 76/76 selectors across 4 routes x 4 viewports | yes |
| `topology-vc` | exit 0, 28/28 selectors | yes |
| `belenjones` | exit 0, 35/35 selectors, 9 cards | yes |
| `pacomepertant` | exit 1, `GATE_NOT_ENTERED` on home at all 4 viewports, reproduced twice | no |

Three of the four tier-1 sites verify clean against their committed records. The one blocker is
`pacomepertant`: the entry method recorded at `scripts/lib/sites.mjs:191-192` as
`method: 'locator'`, documented there as entering reliably, no longer opens the live gate. That
claim is now falsified by measurement and the record should be corrected when a working entry
mechanism is found. Finding a replacement is capture-harness work with its own verification, not
an edit to make inside an audit, so nothing was changed.

Separately on `pacomepertant`'s `about` route, a mobile-viewport `MISMATCH` was observed with
`section:image-trail` resolving 0 nodes for `.image-trail`, distinct from a `page.goto`
`TimeoutError` seen on a re-run, which is a network flake rather than a selector defect. Both are
recorded in the earlier section of this report.

## pacomepertant — both defects resolved, 2026-10-01

Two defects, both in the harness rather than in any selector. Each was measured in isolation before
the record was touched.

### 1. The entry gate clicked a button that was not yet live

The record waited a fixed `settleBeforeMs: 3000` and then clicked, and its comment claimed
`method: 'locator'` entered reliably. Measured timings for the live site say otherwise:

```
domcontentloaded at           2220 ms
button.enter present at       2250 ms
button.enter.show present at 11836 ms   <- the actual readiness signal
main .loader before click: 1
main .loader after click:  0   -> ENTERED, gate disappeared
```

`button.enter` exists from ~2.3s but is inert. The site adds a `show` class at ~11.8s and only then
does a click open the gate, so a click at 3s hit a present-but-unwired button: `GATE_NOT_ENTERED` at
all four viewports, reproduced twice. The delay is connection-dependent, so no fixed number is
correct. The record now waits for `main button.enter.show` via a new `readySelector` field, with
`settleBeforeMs` retained for gates such as y-n10 that publish no readiness signal.

### 2. `.image-trail` is deliberately absent on touch devices

Initially misdiagnosed as a timing race, on the strength of a probe that set only the viewport
WIDTH and no mobile emulation. That probe found the element at 390px and led to a retry loop being
added to the checker. The retry fixed nothing and was reverted. Measuring the actual variable
settled it — same width, same nine-second wait, mobile emulation the only difference:

```
mobile isMobile:true  -> .image-trail = 0   (no trail-ish class in the DOM at all)
mobile isMobile:false -> .image-trail = 1
```

So the site genuinely does not render it on a touch device, which is correct behaviour for a
cursor-following effect. Declared `viewports: ['wide', 'desktop', 'tablet']`, using the
per-selector viewport filter the checker already supported.

### Result

```
$ PATH=/opt/homebrew/bin:$PATH node scripts/verify-site-selectors.mjs --site pacomepertant
pacomepertant/home  @ wide|desktop|tablet|mobile: ok (2 selectors)
pacomepertant/about @ wide|desktop|tablet: ok (7 selectors)
pacomepertant/about @ mobile: ok (6 selectors)

all 35 selectors resolve as declared at every tier viewport
```

Mobile reports six rather than seven because `image-trail` is now scoped away from it, not because
a selector failed.

## All four tier-1 sites verified

| Site | Selectors | Result |
|---|---|---|
| `david-hckh` | 76/76 across 4 routes x 4 viewports | clean |
| `pacomepertant` | 35/35, gate enters at all four viewports | clean |
| `topology-vc` | 28/28 | clean |
| `belenjones` | 35/35, 9 cards at every viewport | clean |

The blocker on the spec's revision gate is cleared: every tier-1 site's committed record now matches
the live site. Note what both defects had in common — neither was a stale selector, and both would
have produced blank or wrong captures that looked like successes, which is the failure mode the
plan's Review Focus exists to prevent.
