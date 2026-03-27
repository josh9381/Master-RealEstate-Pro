import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* Start local servers if not running in CI (CI starts them separately) */
  ...(process.env.CI
    ? {}
    : {
        webServer: [
          {
            command: 'cd .. && npm run dev',
            url: 'http://localhost:3000',
            reuseExistingServer: true,
            timeout: 30_000,
          },
        ],
      }),
})
