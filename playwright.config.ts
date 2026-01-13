import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

const isLocalhost = process.env.BASE_URL?.includes('localhost') ?? true

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Global teardown - runs once after all tests complete */
  globalTeardown: './tests/e2e/global.teardown.ts',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup projects - admin auth
    {
      name: 'setup-api',
      testMatch: /auth\.setup\.ts/,
      grep: /Authenticate admin for API/
    },
    {
      name: 'setup-ui',
      testMatch: /auth\.setup\.ts/,
      grep: /Authenticate admin for UI/,
      dependencies: ['setup-api']
    },
    // Setup projects - member auth (non-admin)
    {
      name: 'setup-member-api',
      testMatch: /auth\.setup\.ts/,
      grep: /Authenticate member for API/
    },
    {
      name: 'setup-member-ui',
      testMatch: /auth\.setup\.ts/,
      grep: /Authenticate member for UI/,
      dependencies: ['setup-member-api']
    },
    // API tests - parallel
    {
      name: 'chromium-api',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/e2e\/api\/parallel\/.*\.spec\.ts/,
      dependencies: ['setup-api', 'setup-member-api'],
    },
    // API serial tests (heynabo imports/deletes data, maintenance scaffolds ALL households)
    // Runs after parallel API tests to avoid interference
    {
      name: 'chromium-api-serial',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/e2e\/api\/serial\/.*\.spec\.ts/,
      fullyParallel: false,
      dependencies: ['chromium-api'],
    },
    // UI tests need full UI auth
    {
      name: 'chromium-ui',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/e2e\/ui\/.*\.spec\.ts/,
      dependencies: ['setup-ui', 'setup-member-ui'],
    },
    // Smoke tests - admin auth only (no member auth required)
    {
      name: 'chromium-smoke',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
      grep: /@smoke/,
      dependencies: ['setup-api', 'setup-ui'],
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests (only for localhost) */
  webServer: isLocalhost ? {
    command: 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  } : undefined,
});
