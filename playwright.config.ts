import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  // The suite books real dates against one database, so it must not run in parallel.
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      // Drives the installed Chrome rather than downloading a browser.
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  // No webServer block on purpose: `astro dev` daemonises itself when stdout is not a TTY,
  // so Playwright sees the command exit immediately and reports "exited early". The
  // test:e2e script starts the background server instead.
});
