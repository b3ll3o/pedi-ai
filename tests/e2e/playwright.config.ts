/**
 * Playwright E2E Configuration
 *
 * Structure:
 * - Local dev: single 'chromium-headless' project, no video/trace/screenshot,
 *   half the CPU cores, reuseExistingServer=true for faster iteration.
 * - CI: all 5 browser/device projects, video+trace+screenshot on failure,
 *   1 worker, fresh server every run.
 */
import { defineConfig, devices } from '@playwright/test'

const isCI = process.env.CI === 'true'

export default defineConfig({
  testDir: './tests',
  fullyParallel: isCI,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : Math.max(1, require('os').cpus().length / 2),
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    video: isCI ? 'retain-on-failure' : 'off',
    trace: isCI ? 'on-first-retry' : 'off',
    screenshot: isCI ? 'only-on-failure' : 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // ─── Local fast feedback ───────────────────────────────────────────────
    {
      name: 'chromium-headless',
      use: { ...devices['Desktop Chrome'], headless: true },
      // Omit grep/grepInvert so this project runs all tests by default locally
    },

    // ─── CI-only cross-browser / cross-device matrix ───────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grep: isCI ? undefined : /(?!)/,  // skip locally (no test matches /(?!)/)
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      grep: isCI ? undefined : /(?!)/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      grep: isCI ? undefined : /(?!)/,
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      grep: isCI ? undefined : /(?!)/,
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      grep: isCI ? undefined : /(?!)/,
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  outputDir: 'test-results',
})
