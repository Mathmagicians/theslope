import { defineConfig, devices } from '@playwright/test'
import { defineBddProject, cucumberReporter } from 'playwright-bdd'

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

// Cloudflare bypass token for smoke tests on deployed environments
const extraHTTPHeaders = process.env.CLOUDFLARE_BYPASS_TOKEN
  ? { 'x-bypass-token': process.env.CLOUDFLARE_BYPASS_TOKEN }
  : {}

// A BDD suite's npm script sets BDD_SUITE and passes no --reporter, so this list writes its Cucumber reports beside
// the Playwright ones; a spec suite's script passes --reporter, which replaces the list
const bddSuite = process.env.BDD_SUITE
// The published smoke report runs on live data and keeps no attachment (stdout, stderr, screenshots); a trace
// attaches as application/zip and carries the session cookies and the bypass header
const bddSkipAttachments = bddSuite === 'smoke' ? true : ['application/zip']

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
  /* One worker on CI; a fixed few locally, the local D1 proxy drops requests under a wider fan-out */
  workers: process.env.CI ? 1 : 3,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: bddSuite
    ? [
        ['html'],
        ['line'],
        ['json'],
        cucumberReporter('json', { outputFile: `.output/bdd/reports/e2e-${bddSuite}-bdd.json` }),
        cucumberReporter('html', { outputFile: `.output/bdd/reports/e2e-${bddSuite}-bdd/index.html`, skipAttachments: bddSkipAttachments }),
      ]
    : 'html',
  /* Global teardown - runs once after all tests complete */
  globalTeardown: './tests/e2e/global.teardown.ts',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Cloudflare bypass for smoke tests on deployed environments */
    extraHTTPHeaders,
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
    // Setup project - the singleton active season, once per run (needs the admin login)
    {
      name: 'setup-season',
      testMatch: /season\.setup\.ts/,
      dependencies: ['setup-api']
    },
    // API tests - parallel
    {
      name: 'chromium-api',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/e2e\/api\/parallel\/.*\.spec\.ts/,
      dependencies: ['setup-api', 'setup-member-api', 'setup-season'],
    },
    // API serial tests (heynabo imports/deletes data, maintenance scaffolds ALL households)
    // Runs after parallel API tests to avoid interference
    {
      name: 'chromium-api-serial',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/e2e\/api\/serial\/.*\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      dependencies: ['chromium-api'],
    },
    // UI tests need full UI auth (excludes serial tests)
    {
      name: 'chromium-ui',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/e2e\/ui\/(?!serial\/).*\.spec\.ts/,
      dependencies: ['setup-ui', 'setup-member-ui', 'setup-season'],
    },
    // UI serial tests (create their own season, must run after parallel UI tests)
    {
      name: 'chromium-ui-serial',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/e2e\/ui\/serial\/.*\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      dependencies: ['chromium-ui'],
    },
    // Smoke tests - the @smoke scenarios of tests/e2e/features, run serially (shared active season state)
    {
      ...defineBddProject({
        name: 'chromium-smoke',
        features: 'tests/e2e/features/**/*.feature',
        steps: ['tests/e2e/fixtures.ts', 'tests/e2e/steps/**/*.ts'],
        tags: '@smoke',
        outputDir: '.output/bdd/smoke',
      }),
      use: { ...devices['Desktop Chrome'] },
      fullyParallel: false,
      workers: 1,
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
