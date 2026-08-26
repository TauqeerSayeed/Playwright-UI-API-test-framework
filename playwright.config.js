// @ts-check
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Local overrides (credentials, base URLs, log level) live in .env - see .env.example.
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const BASE_URL = process.env.BASE_URL || 'https://freelance-learn-automation.vercel.app';

/** Storage state produced by tests/setup/auth.setup.js and reused by every project. */
const STORAGE_STATE = path.join(process.cwd(), 'playwright/.auth/user.json');

/** @see https://playwright.dev/docs/test-configuration */
export default defineConfig({
  testDir: './tests',

  /* Files inside one spec run in order; different files run in parallel. */
  fullyParallel: true,

  /* A stray test.only must never make it into main. */
  forbidOnly: !!process.env.CI,

  /* The backend is a free-tier host, so a cold start is retried rather than failed. */
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,

  /* Generous budgets: the API can take ~30s to wake up from sleep. */
  timeout: 120_000,
  expect: { timeout: 20_000 },

  /* HTML for a quick local look, Allure for the rich shareable report,
     JUnit + list so CI has machine- and human-readable output too. */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: false,
        environmentInfo: {
          Application: BASE_URL,
          API: process.env.API_BASE_URL || 'https://learn-automation.onrender.com',
          Framework: 'Playwright Test',
          Node: process.version,
          OS: process.platform,
        },
      },
    ],
    ['junit', { outputFile: 'test-results/junit-results.xml' }],
  ],

  /* Shared settings for all projects. @see https://playwright.dev/docs/api/class-testoptions */
  use: {
    baseURL: BASE_URL,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,

    /* Debug artefacts are kept only for failures, so a green run stays small. */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: "on",

    testIdAttribute: 'data-testid',
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    /* Signs in once through the UI and stores the session for everyone else. */
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },

    /* The auth specs drive the login/signup forms themselves, so they must
       start from a clean, signed-out browser. */
    {
      name: 'auth-chromium',
      testMatch: /tests[\/]auth[\/].*\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } },
    },

    /* Everything else reuses the saved session. */
    {
      name: 'chromium',
      testIgnore: /tests[\/]auth[\/].*\.spec\.js/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },

    /* Cross-browser coverage, opt in with `npm run test:cross-browser`. */
    {
      name: 'firefox',
      testIgnore: /tests[\/]auth[\/].*\.spec\.js/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
    },
    {
      name: 'webkit',
      testIgnore: /tests[\/]auth[\/].*\.spec\.js/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
    },

    /* Mobile viewport smoke coverage. */
    {
      name: 'mobile-chrome',
      testIgnore: /tests[\/]auth[\/].*\.spec\.js/,
      dependencies: ['setup'],
      use: { ...devices['Pixel 5'], storageState: STORAGE_STATE },
    },
  ],

  outputDir: 'test-results',
});
