# Repair Baseline

This document records the measured starting point of the McCor Labs website repair, captured on 2026-10-02. This baseline establishes the state before any repair work begins.

**Important note**: Production builds (`pnpm build`) require 1Password and run as `op run --env-file=...`. The unwrapped `pnpm -F web build` fails with a missing environment variable error. The baseline captures both outcomes.

## tsc

```
(no output - 0 errors)
```

## lint

```
$ eslint .

/Users/mj/repos/mccor-labs/app/web/src/app/page.tsx
  39:33  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css  no-restricted-syntax

/Users/mj/repos/mccor-labs/app/web/src/components/layout/Logo.tsx
  10:25  error  Do not use text-base. The --color-base token makes Tailwind emit text-base as a colour utility, not a font size, and tailwind-merge groups it with the font sizes so one of the two is dropped. Use text-on-accent for a dark label on an accent fill, or text-[1rem] for a 1rem font size  no-restricted-syntax
  32:41  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  33:42  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  34:43  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  37:41  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  38:43  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  41:41  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  42:43  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  61:56  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  62:50  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  63:50  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  64:59  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  65:45  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax
  70:33  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                                                                                                                                              no-restricted-syntax

/Users/mj/repos/mccor-labs/app/web/src/components/motion/HeroMotionCanvas.test.tsx
  38:29  error  This assertion is unnecessary since the receiver accepts the original type of the expression                        @typescript-eslint/no-unnecessary-type-assertion
  62:18  error  Returning a void expression from an arrow function shorthand is forbidden. Please add braces to the arrow function  @typescript-eslint/no-confusing-void-expression

/Users/mj/repos/mccor-labs/app/web/src/components/motion/HeroMotionCanvas.tsx
   50:21  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                       no-restricted-syntax
   51:18  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                       no-restricted-syntax
   52:20  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css                                       no-restricted-syntax
   74:11  error  Unnecessary conditional, value is always falsy                                                                                                                       @typescript-eslint/no-unnecessary-condition
   81:25  error  Unnecessary optional chain on a non-nullish value                                                                                                                    @typescript-eslint/no-unnecessary-condition
  114:20  error  Forbidden non-null assertion                                                                                                                                         @typescript-eslint/no-non-null-assertion
  116:22  error  Forbidden non-null assertion                                                                                                                                         @typescript-eslint/no-non-null-assertion
  123:31  error  No raw colour values in components, including inside a template literal. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css  no-restricted-syntax
  123:52  error  Invalid type "number" of template literal expression                                                                                                                 @typescript-eslint/restrict-template-expressions
  134:7   error  Expected a `for-of` loop instead of a `for` loop with this simple iteration                                                                                          @typescript-eslint/prefer-for-of
  135:19  error  Forbidden non-null assertion                                                                                                                                         @typescript-eslint/no-non-null-assertion

/Users/mj/repos/mccor-labs/app/web/src/components/motion/VideoMotionHero.tsx
  55:7   error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/Users/mj/repos/mccor-labs/app/web/src/components/motion/VideoMotionHero.tsx:55:7
  53 |     // Delay attaching video until after initial window load so LCP image paints first
  54 |     if (document.readyState === 'complete') {
> 55 |       setShouldAttachVideo(true)
     |       ^^^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  56 |     } else {
  57 |       const handleLoad = () => setShouldAttachVideo(true)
  58 |       window.addEventListener('load', handleLoad, { once: true })  react-hooks/set-state-in-effect
  57:32  error  Returning a void expression from an arrow function shorthand is forbidden. Please add braces to the arrow function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  @typescript-eslint/no-confusing-void-expression
  59:20  error  Returning a void expression from an arrow function shorthand is forbidden. Please add braces to the arrow function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  @typescript-eslint/no-confusing-void-expression
  78:39  error  Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           @typescript-eslint/prefer-nullish-coalescing
  86:28  error  Returning a void expression from an arrow function shorthand is forbidden. Please add braces to the arrow function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  @typescript-eslint/no-confusing-void-expression

✖ 33 problems (33 errors, 0 warnings)
  5 errors and 0 warnings potentially fixable with the `--fix` option.
```

## test

```
 Test Files  11 passed (11)
      Tests  75 passed (75)
   Start at  10:50:40
   Duration  1.41s (environment 63%, setup 20%, tests 9%, transform 6%, import 2%)
```

## build (unwrapped)

```
at module evaluation (src/components/layout/Footer.tsx:5:1)
    30 |   const value = optionalUrl(name, raw)
    31 |   if (value === null && process.env.NODE_ENV === 'production') {
  > 32 |     throw new Error(
       |           ^
    33 |       `${name} is required for a production build. Run the build through ` +
    34 |         '`op run --env-file=.env.template -- …` so 1Password supplies it.',
    35 |     )
}

> Build error occurred
Error: Failed to collect page data for /contact
    at ignore-listed frames {
  type: 'Error'
}
```

## build (op-wrapped)

```
✓ Generating static pages using 9 workers (13/13) in 137ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
├ ○ /careers
├ ○ /contact
├ ○ /privacy
├ ○ /process
├ ○ /robots.txt
├ ○ /services
├ ○ /sitemap.xml
├ ○ /terms
└ ○ /work

○  (Static)  prerendered as static content
```

## e2e

```
  1 failed
    [firefox] › tests/e2e/routes.spec.ts:17:5 › routes › / renders its own h1 @smoke

Expected pattern: /small senior team/i
    Received string:  "Swift by Instinct. Engineered to the Core."
    Timeout: 5000ms

  27 passed (12.2s)
```

## Error counts

TypeScript errors:

```
$ pnpm -F web exec tsc --noEmit 2>&1 | grep -c 'error TS'
0
```

Lint errors:

```
$ pnpm -F web lint 2>&1 | grep -cE '^\s+[0-9]+:[0-9]+\s+error'
33
```

33 is the baseline figure, measured before any repair landed. Re-running that command after
Task 1 returns 28, because Task 1 removed the five errors in `VideoMotionHero.tsx`. The
command no longer reproduces its own number here, and that is the point of a baseline: the
drop from 33 is the evidence the repair worked.

The 33 were never all in one file, despite what Part A of the plan and the project
`CLAUDE.md` both claim. Measured per file: `Logo.tsx` 14, `HeroMotionCanvas.tsx` 11,
`VideoMotionHero.tsx` 5, `HeroMotionCanvas.test.tsx` 2, `page.tsx` 1.

Color literals (excluding src/styles/):

```
$ grep -rnE '#[0-9a-fA-F]{3,8}|\[#' app/web/src --include='*.tsx' --include='*.ts' | grep -v 'src/styles/' | wc -l
19
```

Comment counts:

Starting comments (// and /*):

```
$ grep -rnE '^\s*(//|/\*)' app/web/src --include='*.ts' --include='*.tsx' | grep -v '\.test\.' | wc -l
47
```

All comment lines including block continuations (// and /* and *):

```
$ grep -rnE '^\s*(//|/\*|\*)' app/web/src --include='*.ts' --include='*.tsx' | grep -v '\.test\.' | wc -l
86
```

JSX comments ({/*}):

```
$ grep -rn '{/\*' app/web/src --include='*.tsx' | grep -v '\.test\.' | wc -l
14
```
