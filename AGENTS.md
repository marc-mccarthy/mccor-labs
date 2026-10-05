# Rules for every agent

Applies to Claude Code and Antigravity. Claude-only detail is in CLAUDE.md.

## Color

- Color values come only from the `@theme` block in `app/web/src/styles/globals.css`. Read it. Never type a hex, rgb(), hsl() or oklch() value from memory.
- Shaders take color through uniforms fed from those tokens.
- If no token fits, stop and report the gap. Do not invent a color or pick the nearest.

## Files you write

- Add no comments to any file: no `//`, `/* */`, `#`, `<!-- -->` or JSDoc. Exempt: tool directives such as shebang lines, `@vitest-environment`, `eslint-disable` and `use client`.
- No text baked into images or SVG. No invented logos, clients or certifications.

## Antigravity (Gemini)

- Never edit `.git`. Never run git.
- Never call ask_question or wait for input. Decide, then end the reply with `Ruling: <decision> (cost if wrong: <cost>)`.
