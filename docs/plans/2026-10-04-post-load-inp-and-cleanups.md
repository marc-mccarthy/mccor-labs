# Post-load INP attribution + small cleanups

Branch `feat/website-phase-1`. Baseline at HEAD `8497662` (2026-10-04): tsc 0, lint 0 errors / 3
deliberate `no-img-element` warnings, unit 297 / 57 files.

Owner approved: per-task commits (stage only the task's paths), Mode B agy review per slice,
brand media stays untracked, no prompts to the owner.

## Task 1 — ResizeObserver disconnected after a build() throw

`app/web/src/components/effects/SceneRuntime.tsx`: `fitToCanvas` returns a disconnect function;
after `build()` throws, `teardown()` does not call it, so the ResizeObserver stays attached until
unmount (ledger line 1802). Make `teardown()` disconnect it.

- Extend `SceneRuntime.test.tsx` (build-throw case, ~line 167) to assert the ResizeObserver is
  disconnected on the throw path. It must fail before the fix.
- Commit: `fix(web): disconnect the resize observer when a scene build throws`

## Task 2 — remove Badge's unused `accent` variant

`app/web/src/components/ui/badge.tsx`: delete the `accent` variant. Only usage is `Hero.tsx:39`
(default variant). Existing tests must pass unchanged.

- Commit: `chore(web): drop the unused badge accent variant`

## Task 3 — attribute INP right after load (HANDOFF-PHASE-2 §6.4)

Recorded: 192 ms at 1x, 232 ms at 6x CPU throttle on a click right after load; long task never
attributed. Read-only investigation, no source changes.

- Build once (`pnpm --dir /Users/mj/repos/mccor-labs build`, single `op run`), serve `out/`.
- System Chrome via Playwright + CDP, `Emulation.setCPUThrottlingRate` 4 and 6, click the hero CTA
  ~200 ms after `load`, ≥5 runs each, only when 1-min load average < 5.
- Record event duration (PerformanceObserver `event`, `interactionId > 0`) and trace long tasks;
  name the dominant script / function.
- Gate: p75 < 200 ms at 4x → log and close. Otherwise write the attributed cause and a fix design
  into the ledger; the controller decides the fix.

## Done-gate

Build, `test:e2e`, Lighthouse, INP on a quiet machine, `/code-review` reviewer subagent.

Dropped: Shiki string color (cosmetic, not owner-requested). Early-window INP e2e gate (would
flake under machine contention; add only if Task 3 finds a regression).
