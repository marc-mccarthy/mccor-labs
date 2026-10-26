# Email signature

Created: 2026-10-25. Last update: 2026-10-26.

One shared HTML signature for every McCor Labs mailbox. Only name, title, phone, email, photo,
LinkedIn and Facebook change per person; the card, art and animation are identical.

## Design

Card 600x160 on an opaque `base` background with a 2 px `border` outline, so light and dark mail
clients render it the same. Left: animated stag scene GIF (220x160, retina source 440x320). Middle:
photo 72x90 JPEG with baked rounded corners. Right: name as a script-font PNG in `amber`, then title,
phone, email, site, "Book a call" and the slogan as live text in a system font stack, LinkedIn and
Facebook as 20x20 PNG icons. Bottom: a 6 px McCarthy tartan band PNG in `crimson-deep`, `brand`,
`pine` and `base`.

Scene GIF: 14 frames, 3.5 s loop, 96 colours, under 500 KB. Antler glow breathes 60% to 100% and a
soft brightness shimmer travels slowly across the pines and the stag once per loop; the black
background stays black because the shimmer scales pixel brightness instead of adding light. Frame 1 is the complete static scene because
classic Outlook shows only the first frame.

Email rules followed: tables, inline CSS, hosted PNG/JPG over HTTPS, `width`/`height` on every
`img`, alt text, no SVG, WebP, CSS backgrounds, web fonts or CSS animation.

## Rulings

- Ruling: hybrid build, one GIF for the scene and live text for contact lines (cost if wrong:
  rebuild as a full-card GIF, about a day).
- Ruling: green tokens `--color-pine: #31cc3c` and `--color-grass: #275e34`, sampled from the
  reference video the owner supplied (cost if wrong: redraw the scene layers once).
- Ruling: work stays on `feat/site-fixes` because peer sessions share the checkout (cost if wrong:
  one mixed PR).
- Ruling: name rendered to PNG on the `base` background, never transparent (cost if wrong: invisible
  name in light mode).
- Ruling: per-person HTML lands in `app/web/signatures/`, not under `public/`, so phone numbers are
  not published (cost if wrong: staff copy from a file instead of a URL).
- Ruling: the owner chose Darcey Oliver (Eldertype Studio), which is personal-use only without a
  paid licence, so it is not bundled. `build-signature.ts` uses it when a licensed
  `fonts/DarceyOliver.ttf` exists and falls back to Allison (SIL OFL) otherwise (cost if wrong: a
  licence breach in every outgoing mail).
- Ruling: hosted assets live under `app/web/public/sig/`, not `public/media/`, because
  `scripts/hash-assets.ts` renames everything under `media/` on build and pasted signatures need
  stable URLs (cost if wrong: broken images in every sent mail).
- Ruling: the pine and grass background is drawn procedurally as SVG in `build-scene.ts`, not by
  agy. The agy asset run had no image tool and its sandbox could not write into the repo, so it was
  stopped after 95 steps (cost if wrong: less organic art than a painted layer).

## Tasks

- T1 Tokens and this plan.
- T2 `build-scene.ts` draws the pine and grass background as SVG, composes 12 frames with
  `sharp` and assembles `scene.gif` with `magick` (`pnpm -F web signature:scene`).
- T3 `people.json`, `template.html`, `signature.ts`, `build-signature.ts`, tests, `pnpm -F web signature`.
- T4 Light and dark Playwright screenshots of `signatures/marcm.html`, sent to the owner.
- T5 Owner supplies the licensed Darcey Oliver file and real phone numbers, then ship.

## Verification

- `pnpm -F web signature` regenerates all four mocks.
- `pnpm -F web exec vitest related scripts/signature/build-signature.ts --run` passes.
- `magick identify app/web/public/sig/scene.gif | wc -l` prints 14; file under 500 KB.
- Paste `signatures/marcm.html` into Gmail, send to Outlook and iPhone, animation plays on iPhone.
