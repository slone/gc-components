import { defineConfig, devices } from '@playwright/test';

// Tests of every package: packages/<name>/test/*.spec.js.
// Run one package with `npx playwright test packages/gc-toggle-switch`.
export default defineConfig({
  testDir: './packages',
  testMatch: '*/test/**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    trace: 'retain-on-failure',
    // Optional: reuse a Chromium already installed on the machine.
    launchOptions: process.env.PW_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PW_CHROMIUM_EXECUTABLE } : {},
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
