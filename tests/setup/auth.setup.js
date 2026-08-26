import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { LoginPage } from '../../src/pages/LoginPage.js';
import { getValidUser } from '../../src/utils/data-reader.js';
import { logger } from '../../src/utils/logger.js';

/**
 * Authentication setup project.
 *
 * Runs once before the functional projects, signs in through the real UI and
 * saves the browser storage to disk. Every other test reuses that state, so
 * the login form is exercised on purpose in the auth specs and skipped
 * everywhere else.
 */
export const STORAGE_STATE = path.join(process.cwd(), 'playwright/.auth/user.json');

setup('authenticate the shared test user', async ({ page }) => {
  const user = getValidUser();
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.loginAs(user);

  // The header only renders the cart button for a signed-in user.
  await expect(loginPage.nav.cartButton).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  // Start every downstream test from an empty cart.
  await page.evaluate(() => window.localStorage.setItem('cart', '[]'));

  await page.context().storageState({ path: STORAGE_STATE });
  logger.info('Saved authenticated storage state', { path: STORAGE_STATE, email: user.email });
});
