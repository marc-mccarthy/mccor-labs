# McCor Labs — AI & Software Engineering Asset Manifest

Created by Antigravity for consumption by Claude Code and the McCor Labs Next.js web application.

---

## 1. Imagery Assets (`app/web/public/media/brand/`)

All imagery is exported in dual formats: high-efficiency WebP and full-fidelity JPG.

| Semantic Name                  | WebP Path                               | JPG Path                   | Dimensions  | Category & Usage                                           |
| :----------------------------- | :-------------------------------------- | :------------------------- | :---------- | :--------------------------------------------------------- |
| **AI Neural Mesh**             | `media/brand/mccor-ai-neural.webp`      | `mccor-ai-neural.jpg`      | 1376 × 768  | Multi-agent swarms, LLM routing, AI services               |
| **Cloud Systems Architecture** | `media/brand/mccor-systems-arch.webp`   | `mccor-systems-arch.jpg`   | 1376 × 768  | Distributed systems, event highways, microservices         |
| **Autonomous Code Synthesis**  | `media/brand/mccor-code-synthesis.webp` | `mccor-code-synthesis.jpg` | 1376 × 768  | Compiler pipelines, formal verification, engineering craft |
| **Vector Space & Embeddings**  | `media/brand/mccor-vector-space.webp`   | `mccor-vector-space.jpg`   | 1376 × 768  | High-dimensional manifolds, RAG, knowledge graphs          |
| **Edge Telemetry Control Hub** | `media/brand/mccor-edge-telemetry.webp` | `mccor-edge-telemetry.jpg` | 1376 × 768  | Real-time telemetry, cyber-physical edge monitoring        |
| **Zero-Trust Hardware Vault**  | `media/brand/mccor-secure-enclave.webp` | `mccor-secure-enclave.jpg` | 1376 × 768  | Cryptographic hardware enclaves, security engineering      |
| **Flagship Stag Hero**         | `media/brand/mccor-stag-hero.webp`      | `mccor-stag-hero.jpg`      | 1376 × 768  | Main landing page hero poster, right-aligned red stag      |
| **Systems Stag Visual**        | `media/brand/mccor-stag-systems.webp`   | `mccor-stag-systems.jpg`   | 1376 × 768  | Crystalline distributed systems hero poster                |
| **Shield Head Emblem**         | `media/brand/mccor-stag-head.webp`      | `mccor-stag-head.jpg`      | 1024 × 1024 | Brand mark, avatar, header favicon source                  |
| **Full Trotting Stag**         | `media/brand/mccor-stag-logo.webp`      | `mccor-stag-logo.jpg`      | 1024 × 1024 | Brand deck, footer emblem, about page                      |
| **OpenGraph Social Preview**   | `media/brand/mccor-stag-og.webp`        | `mccor-stag-og.jpg`        | 1200 × 630  | Social cards, Twitter/LinkedIn embeds                      |

---

## 2. Looping Video Assets (`app/web/public/media/brand/`)

All video loops are 6.0 seconds (180 frames @ 30fps) with mathematical continuity ($f_0 = f_{180}$) for seamless looping without stutter or jump cuts. Encoded with `libx264` (`+faststart`) and `libvpx-vp9`.

| Loop Name                 | MP4 Path (H.264)            | WebM Path (VP9)              | Size (MP4/WebM) | Companion Poster            | Motion Behavior                                         |
| :------------------------ | :-------------------------- | :--------------------------- | :-------------- | :-------------------------- | :------------------------------------------------------ |
| **AI Neural Loop**        | `ai-neural-loop.mp4`        | `ai-neural-loop.webm`        | 2.9 MB / 2.1 MB | `mccor-ai-neural.webp`      | Synaptic pulse waves, floating data embers, camera push |
| **Systems Pipeline Loop** | `systems-pipeline-loop.mp4` | `systems-pipeline-loop.webm` | 3.6 MB / 3.6 MB | `mccor-systems-arch.webp`   | High-throughput data bus pulses, traveling scan beam    |
| **Code Synthesis Loop**   | `code-synthesis-loop.mp4`   | `code-synthesis-loop.webm`   | 1.8 MB / 1.4 MB | `mccor-code-synthesis.webp` | AST syntax tree laser sweep, glowing token flares       |
| **Hero Stag Loop**        | `hero-loop.mp4`             | `hero-loop.webm`             | 1.3 MB / 1.1 MB | `mccor-stag-hero.webp`      | Right-anchored red stag, conduit glow, rising embers    |
| **Systems Stag Loop**     | `systems-loop.mp4`          | `systems-loop.webm`          | 2.7 MB / 2.2 MB | `mccor-stag-systems.webp`   | Crystalline stag network, pulsing data streams          |

---

## 3. Brand Color Palette & Integration Notes

- **Obsidian Black**: `#08080a` (token: `var(--color-base)`)
- **Crimson Red**: `#ff3b30` (token: `var(--color-brand)`)
- **Solar Flame Orange**: `#ff7a00` (token: `var(--color-accent)`)
- **Accent Hover Orange**: `#ff8f24` (token: `var(--color-accent-hover)`)

When using with `next/image`:

```tsx
<Image
  src="/media/brand/mccor-ai-neural.webp"
  alt="AI Neural Architecture"
  width={1376}
  height={768}
  className="object-cover"
/>
```

When using with `VideoMotionHero`:

```tsx
<VideoMotionHero
  videoSrc="/media/brand/ai-neural-loop.mp4"
  webmSrc="/media/brand/ai-neural-loop.webm"
  posterSrc="/media/brand/mccor-ai-neural.webp"
  alt="AI Neural Architecture motion background"
/>
```
