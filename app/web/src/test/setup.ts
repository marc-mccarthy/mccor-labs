// next/link reads the trailing-slash behaviour from this flag, which next.config.ts's real
// webpack build injects via DefinePlugin from the `trailingSlash` option. Vitest never runs that
// build step, so without setting it here `next/link` silently strips the trailing slash that
// `trailingSlash: true` adds in the actual static export — component tests would then pass on
// hrefs the production site never serves. Set to match next.config.ts.
process.env.__NEXT_TRAILING_SLASH = 'true'

import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// vitest.config.ts sets `globals: false`, so @testing-library/react's own auto-cleanup (which
// only registers when it finds a global `afterEach`) never fires. Without this, one test's
// rendered DOM leaks into the next test in the same file, which breaks any query that expects a
// single match.
afterEach(() => {
  cleanup()
})
