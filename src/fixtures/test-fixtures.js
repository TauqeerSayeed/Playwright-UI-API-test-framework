import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { SignupPage } from '../pages/SignupPage.js';
import { HomePage } from '../pages/HomePage.js';
import { CartPage } from '../pages/CartPage.js';
import { PractisePage } from '../pages/PractisePage.js';
import { AuthApi } from '../api/AuthApi.js';
import { testData, getValidUser } from '../utils/data-reader.js';
import { buildUser } from '../utils/data-generator.js';

/**
 * Custom fixtures.
 *
 * Every page object and every data set is injected, so a spec never has to
 * construct a page object or read a file - it just declares what it needs.
 */
export const test = base.extend({
  // --- Page objects ---------------------------------------------------------

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },

  practisePage: async ({ page }, use) => {
    await use(new PractisePage(page));
  },

  // --- Data -----------------------------------------------------------------

  /** All JSON test data, lazily read from /test-data. */
  data: async ({}, use) => {
    await use(testData);
  },

  /** The shared account used by tests that only need "a signed-in user". */
  validUser: async ({}, use) => {
    await use(getValidUser());
  },

  /** A freshly generated, never-registered user - unique per test. */
  newUser: async ({}, use) => {
    await use(buildUser());
  },

  // --- API ------------------------------------------------------------------

  /** API client bound to the backend, for fast test setup. */
  authApi: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: process.env.API_BASE_URL || 'https://learn-automation.onrender.com',
      timeout: 90_000,
    });
    await use(new AuthApi(context));
    await context.dispose();
  },

  // --- Composite ------------------------------------------------------------

  /**
   * A home page that is already signed in with an empty cart.
   *
   * The storage state from the `setup` project restores the session, and the
   * cart is reset here because it lives in `localStorage` and would otherwise
   * leak between tests.
   */
  authenticatedHome: async ({ homePage }, use) => {
    await homePage.open();
    await homePage.resetCart();
    await use(homePage);
  },
});

export { expect };
