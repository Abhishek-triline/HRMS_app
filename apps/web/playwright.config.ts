import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration — Nexora HRMS E2E.
 *
 * Targets the dev stack already running on:
 *   • Web:  http://localhost:3000 (Next.js dev server)
 *   • API:  http://localhost:3001 (Express, proxied through Next rewrites)
 *
 * Pre-flight: start the dev stack manually with `pnpm dev` from the repo
 * root, OR uncomment the `webServer` block below to have Playwright start
 * it. Manual mode is the default during initial setup so DB / Prisma /
 * seed state is fully under the developer's control.
 *
 * See docs/HRMS_Playwright_Test_Plan.md for the full plan.
 */

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // stateful flows (leave create → approve) can collide
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['junit', { outputFile: 'playwright-results.xml' }]]
    : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    // The login card lives inside .animate-float — Playwright's stability
    // check times out clicking a moving button. The app's CSS gates every
    // animation behind @media (prefers-reduced-motion: reduce), so opting
    // in here freezes the UI for all specs without per-test overrides.
    reducedMotion: 'reduce',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Opt-in via PLAYWRIGHT_BROWSERS=firefox,webkit
    // { name: 'firefox',  use: { ...devices['Desktop Firefox']  } },
    // { name: 'webkit',   use: { ...devices['Desktop Safari']   } },
  ],

  // Uncomment to have Playwright manage the dev stack lifecycle:
  // webServer: {
  //   command: 'pnpm -w dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
