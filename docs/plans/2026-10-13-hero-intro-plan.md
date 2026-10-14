# Hero intro: stag charge clip, then hero loop

## Context

Owner wants the landing hero to open with `/Users/mj/Downloads/mccarthy-deer-charge-user.mp4` (5.04s, 1924x1076, h264+aac, 12 MB). Per `docs/stag-charge-video-prompts.md` the clip ends on the hero frame. After it ends, the hero hands off to the existing `hero-loop` video. Decisions (answered):

- After clip: existing `hero-loop.mp4/.webm` keeps looping.
- Frequency: once per tab session (`sessionStorage`).
- WebGL `StagScene` overlay: hidden while clip plays, fades in after.

## Approach

### 1. Asset (ffmpeg, local)

Transcode into `app/web/public/media/brand/`, audio stripped, scaled to 1376x768 to match `hero-loop`:

- `hero-intro.mp4`: `ffmpeg -i <src> -an -vf scale=1376:768 -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart`
- `hero-intro.webm`: `-an -vf scale=1376:768 -c:v libvpx-vp9 -crf 36 -b:v 0`
- Target ≤ ~1.5 MB each (hero-loop is 1.3 MB / 1.1 MB). Check last frame vs `mccor-stag-hero.webp` visually.

### 2. `app/web/src/components/motion/VideoMotionHero.tsx`

- New optional props: `introSrc`, `introWebmSrc`, `onIntroChange?: (playing: boolean) => void`.
- Phase state `'intro' | 'loop'`, decided inside the existing attach effect (not render, so static export hydrates clean): intro only if intro sources given and `sessionStorage['mccor-hero-intro-seen']` unset.
- Intro phase: `<video>` without `loop`, intro sources; on first `play`, set the seen flag; `onEnded` / `onError` switch to loop phase.
- Video element keyed by phase so sources swap cleanly; `videoLoaded` resets, so poster (same frame as clip end) covers the swap, then loop fades in via existing opacity transition.
- Reused unchanged: `useVideoAttach` gating (reduced motion, motion pause, saveData, IntersectionObserver, pagehide/pageshow), `VideoPauseToggle`, `rethrowUnlessAborted`.
- `sessionStorage` access: catch only `DOMException` `SecurityError` (storage blocked) and treat as seen; rethrow anything else.
- Reduced motion / paused-at-load: no video at all, as today; intro never plays, `onIntroChange(true)` never fires.

### 3. `app/web/src/components/sections/Hero.tsx`

- Pass `introSrc="/media/brand/hero-intro.mp4"`, `introWebmSrc="/media/brand/hero-intro.webm"`.
- `const [introPlaying, setIntroPlaying] = useState(false)`; pass `onIntroChange={setIntroPlaying}`.
- StagScene className gains `transition-opacity duration-(--duration-scene)` and `opacity-0` while `introPlaying`.

Ruling: intro gated by the same reduced-motion / motion-pause / saveData rules as the loop (cost if wrong: some users never see the intro).
Ruling: seen flag set on intro play start, not end (cost if wrong: user who leaves mid-clip won't see it again this session).
Ruling: intro scaled to 1376x768 to match loop, not 1920 (cost if wrong: slightly softer on large screens).

## Tests

- `VideoMotionHero.test.tsx` new cases: intro sources first and no `loop`; `ended` switches to loop sources with `loop`; seen flag set → loop directly; flag written on play; `error` falls back to loop; `onIntroChange` true then false; reduced motion → no intro.
- `Hero.test.tsx`: existing "attaches the autoplaying video" expects `hero-loop.webm` first; behavior intentionally changes. Set the seen flag in that test to keep it asserting the loop, and add a test that the first visit gets `hero-intro.webm` and StagScene has `opacity-0` until `ended`.
- e2e `landing.spec.ts` motion-pause test uses `section video` first: should still pass (pause works in both phases); run to confirm.

## Verification

- `pnpm -F web test` (vitest), `pnpm -F web lint`, typecheck, `pnpm -F web test:e2e` landing + motion specs.
- Manual: `pnpm -F web dev`, Playwright: fresh context → intro plays, StagScene hidden, then loop; reload same tab → loop directly; reduced motion → poster only.
- Done-gate: no comments, no debug output, `/code-review` subagent.

## Git

Branch `feat/hero-intro` off current `main` (carries existing uncommitted work; I stage nothing). Proposed commit: `feat(web): play stag charge intro once per session before hero loop`.
Plan copied to `docs/plans/2026-10-13-hero-intro-plan.md` on approval.

## Rulings added during execution

Ruling: the source clip has a "KlingAI 3.0" watermark in every frame; blurred with ffmpeg `delogo=x=1684:y=1000:w=236:h=48` before scaling (cost if wrong: a faint smear shows in the bottom-right corner under the scrim).
Ruling: the clip ends on a close-up, not the hero pose, so the intro fades out to the poster over its last 0.8s before the loop mounts (cost if wrong: about a 1s poster beat between the clips).
Ruling: StagScene hides only while the intro is really playing (after `play`, not faded, not paused), so a blocked autoplay keeps the scene visible (cost if wrong: the scene can show for a moment before the intro starts, then fade out).
Ruling: a `<video>` error, or an error on the last intro `<source>`, falls back to the loop, and the loop's `autoPlay` follows the pause state (cost if wrong: none known).
