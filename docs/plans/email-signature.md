# Email signature

Created: 2026-10-25. Last update: 2026-10-26.

One shared HTML signature for every McCor Labs mailbox. Only name, title, phone, email, photo,
LinkedIn and Facebook change per person; the card, art and animation are identical.

## Design

Card 600 wide on an opaque `base` background with a 2 px `border` outline, so light and dark mail
clients render it the same. Top: animated stag scene GIF (596x310). Below, centred as one row: photo 98x122
JPEG with baked rounded corners, then name as a script-font PNG in `amber`, then title,
phone, email, site, "Book a call" and the slogan as live text in a system font stack, LinkedIn and
Facebook as 20x20 PNG icons.

Scene GIF: cut from the owner's generated video `scripts/signature/scene-source.mp4` (muted), cropped to the stag and pines, cut to the first 2.4 s (one glow sweep, compressed to 1.5 s) spliced to the final 0.7 s (every tree lit, stag rimmed white, brightness peaked at the centre and faded evenly to both edges, with a left-to-right ramp underneath because the source ends dimmer on the right), so it sweeps once in 1.5 s and holds fully lit, 10 fps, 96 colours, lightly denoised, background pushed to black, under 500 KB. It plays once (no NETSCAPE loop block) so the glow pass happens a single time; the last frame then stays.

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
- Ruling: the scene comes from the owner's generated video, not procedural SVG or agy; the build
  only crops, denoises and quantises it (cost if wrong: regenerate the video).

## Tasks

- T1 Tokens and this plan.
- T2 `build-scene.ts` converts `scene-source.mp4` to `scene.gif` with ffmpeg and a `magick`
  optimize pass (`pnpm -F web signature:scene`).
- T3 `people.json`, `template.html`, `signature.ts`, `build-signature.ts`, tests, `pnpm -F web signature`.
- T4 Light and dark Playwright screenshots of `signatures/marcm.html`, sent to the owner.
- T5 Owner supplies the licensed Darcey Oliver file and real phone numbers, then ship.

## Verification

- `pnpm -F web signature` regenerates all four mocks.
- `pnpm -F web exec vitest related scripts/signature/build-signature.ts --run` passes.
- `magick identify app/web/public/sig/scene.gif | wc -l` prints 28; file under 500 KB.
- Paste `signatures/marcm.html` into Gmail, send to Outlook and iPhone, animation plays on iPhone.
