import { defineConfig, devices } from '@playwright/test'

const PORT = 4321

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: 'on-first-retry',
  },
  // Firefox headless, at the owner's preference. Headless is the default, so
  // no flag is needed. Only this engine is installed, so adding a second
  // project means installing its browser revision first.
  projects: [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }],
  webServer: {
    // Serves the real exported build, not the dev server.
    //
    // CAVEAT: `serve` resolves directory indexes and clean URLs, which
    // CloudFront with a plain S3 origin does NOT do until the rewrite
    // function lands (spec: CloudFront handoff). These tests therefore prove
    // the export is correct; they cannot prove production routing works.
    //
    // No --single flag: serve's default already serves each file at its own
    // path. Passing `--single=false` does NOT disable SPA mode — serve treats
    // the string as truthy and rewrites every path to index.html, which made
    // every route appear to render the home page's h1.
    //
    // DO NOT rewrite this back to `pnpm exec serve`. The bin shim is invoked by
    // path on purpose. pnpm starts its child in a NEW process group, and
    // Playwright shuts the web server down by SIGKILLing the process group of
    // the command it spawned, so the signal never reached `serve`: it kept the
    // port, Playwright waited for the port to free, and the run hung after
    // "Terminating the WebServer" — 49s to 7min, leaking an orphaned server
    // that reuseExistingServer then silently adopted on the next run. Startup
    // was never the problem (~0.4s either way). The shim `exec`s node, so serve
    // keeps this command's pid and process group and the group kill reaches it,
    // which took teardown to 3ms and the suite from 4.1min to 35s.
    command: '../../node_modules/.bin/serve out --listen ' + String(PORT),
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
