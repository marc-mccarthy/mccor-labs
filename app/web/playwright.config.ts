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
  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /budgets\.spec\.ts/,
    },
    {
      name: 'budgets',
      testMatch: /budgets\.spec\.ts/,
      fullyParallel: false,
      dependencies: ['firefox'],
    },
  ],
  webServer: {
    command: '../../node_modules/.bin/serve out --listen ' + String(PORT),
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
