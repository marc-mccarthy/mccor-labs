import { defineConfig, devices } from '@playwright/test'

const PORT = 4321

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /budgets\.spec\.ts/,
    },
    {
      name: 'budgets',
      testMatch: /budgets\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      dependencies: ['chromium'],
    },
  ],
  webServer: {
    command: '../../node_modules/.bin/serve out --listen ' + String(PORT),
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
