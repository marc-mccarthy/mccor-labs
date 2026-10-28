# Unused brand media

Created: 2026-10-18 · Updated: 2026-10-26

Files under `app/web/public/` that no page, stylesheet, script or test references. They are kept for
the owner's review. The build hashes and ships them like every other asset; the unreferenced check in
`app/web/scripts/hash-assets.ts` (`KEPT_UNREFERENCED`) lists the same paths, so delete the entry there
when a file goes.

The font licence stays: `fonts/OFL.txt` must ship beside the Geist font files.

## Video loops

| File                                                                                   | Size   |
| -------------------------------------------------------------------------------------- | ------ |
| [ai-neural-loop.mp4](../app/web/public/media/brand/ai-neural-loop.mp4)                 | 2.9 MB |
| [ai-neural-loop.webm](../app/web/public/media/brand/ai-neural-loop.webm)               | 2.1 MB |
| [code-synthesis-loop.mp4](../app/web/public/media/brand/code-synthesis-loop.mp4)       | 1.8 MB |
| [code-synthesis-loop.webm](../app/web/public/media/brand/code-synthesis-loop.webm)     | 1.4 MB |
| [systems-loop.mp4](../app/web/public/media/brand/systems-loop.mp4)                     | 2.7 MB |
| [systems-loop.webm](../app/web/public/media/brand/systems-loop.webm)                   | 2.2 MB |
| [systems-pipeline-loop.mp4](../app/web/public/media/brand/systems-pipeline-loop.mp4)   | 3.6 MB |
| [systems-pipeline-loop.webm](../app/web/public/media/brand/systems-pipeline-loop.webm) | 3.6 MB |

## Hero intro alternates

`app/web/src/content/hero-media.ts` lists the intro clips the hero picks from at random. To add one
to the pool, list it there and remove it from this table and `KEPT_UNREFERENCED`.

| File                                                                                         | Size   |
| -------------------------------------------------------------------------------------------- | ------ |
| [stag-logo-run-reassemble.mp4](../app/web/public/media/brand/stag-logo-run-reassemble.mp4)   | 621 KB |
| [stag-logo-run-reassemble.webm](../app/web/public/media/brand/stag-logo-run-reassemble.webm) | 345 KB |
| [stag-corridor-charge.mp4](../app/web/public/media/brand/stag-corridor-charge.mp4)           | 2.0 MB |
| [stag-corridor-charge.webm](../app/web/public/media/brand/stag-corridor-charge.webm)         | 1.7 MB |
| [stag-gallop-banner.mp4](../app/web/public/media/brand/stag-gallop-banner.mp4)               | 176 KB |
| [stag-gallop-banner.webm](../app/web/public/media/brand/stag-gallop-banner.webm)             | 135 KB |

## Stills

| File                                                                                       | Size   |
| ------------------------------------------------------------------------------------------ | ------ |
| [antler-circuit-sigil-512.png](../app/web/public/media/brand/antler-circuit-sigil-512.png) | 28 KB  |
| [antler-circuit-sigil.svg](../app/web/public/media/brand/antler-circuit-sigil.svg)         | 3 KB   |
| [mccor-ai-neural.jpg](../app/web/public/media/brand/mccor-ai-neural.jpg)                   | 916 KB |
| [mccor-ai-neural.webp](../app/web/public/media/brand/mccor-ai-neural.webp)                 | 200 KB |
| [mccor-code-synthesis.webp](../app/web/public/media/brand/mccor-code-synthesis.webp)       | 116 KB |
| [mccor-edge-telemetry.webp](../app/web/public/media/brand/mccor-edge-telemetry.webp)       | 168 KB |
| [mccor-stag-head.jpg](../app/web/public/media/brand/mccor-stag-head.jpg)                   | 368 KB |
| [mccor-stag-head.webp](../app/web/public/media/brand/mccor-stag-head.webp)                 | 40 KB  |
| [mccor-stag-hero.jpg](../app/web/public/media/brand/mccor-stag-hero.jpg)                   | 600 KB |
| [mccor-stag-impact.jpg](../app/web/public/media/brand/mccor-stag-impact.jpg)               | 1.2 MB |
| [mccor-stag-logo-1.webp](../app/web/public/media/brand/mccor-stag-logo-1.webp)             | 30 KB  |
| [mccor-stag-logo.jpg](../app/web/public/media/brand/mccor-stag-logo.jpg)                   | 272 KB |
| [mccor-stag-logo.webp](../app/web/public/media/brand/mccor-stag-logo.webp)                 | 32 KB  |
| [mccor-stag-og.webp](../app/web/public/media/brand/mccor-stag-og.webp)                     | 60 KB  |
| [mccor-stag-systems.jpg](../app/web/public/media/brand/mccor-stag-systems.jpg)             | 896 KB |
| [mccor-stag-systems.webp](../app/web/public/media/brand/mccor-stag-systems.webp)           | 188 KB |
| [mccor-systems-arch.webp](../app/web/public/media/brand/mccor-systems-arch.webp)           | 248 KB |
| [mccor-vector-space.jpg](../app/web/public/media/brand/mccor-vector-space.jpg)             | 856 KB |
| [mccor-vector-space.webp](../app/web/public/media/brand/mccor-vector-space.webp)           | 168 KB |

## Textures

| File                                                                                | Size  |
| ----------------------------------------------------------------------------------- | ----- |
| [obsidian-matcap.webp](../app/web/public/media/brand/textures/obsidian-matcap.webp) | 8 KB  |
| [worley-noise.webp](../app/web/public/media/brand/textures/worley-noise.webp)       | 12 KB |

## Licence

| File                                       | Size |
| ------------------------------------------ | ---- |
| [OFL.txt](../app/web/public/fonts/OFL.txt) | 8 KB |
