import { expect } from '@playwright/test';
import { NavBar } from './components/NavBar.js';
import { logger } from '../utils/logger.js';

/**
 * Shared behaviour for every page object: navigation, waiting helpers and the
 * navigation bar component that is present on all screens.
 */
export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {string} route path relative to `baseURL`, e.g. "/login"
   */
  constructor(page, route = '/') {
    this.page = page;
    this.route = route;
    this.nav = new NavBar(page);
    this.spinnerRoot = page.locator('.container-child');
  }

  /** Opens this page's route and waits for the app shell to be rendered. */
  async open() {
    logger.info(`Navigating to ${this.route}`);
    await this.page.goto(this.route, { waitUntil: 'domcontentloaded' });
    await this.waitUntilLoaded();
    return this;
  }

  /** Overridden by subclasses to wait for their own key element. */
  async waitUntilLoaded() {
    await this.spinnerRoot.waitFor({ state: 'visible' });
  }

  async currentPath() {
    return new URL(this.page.url()).pathname;
  }

  async expectOnRoute(route = this.route) {
    await expect(this.page).toHaveURL(new RegExp(`${route.replace('/', '\/')}\/?$`));
  }

  async title() {
    return this.page.title();
  }

  /**
   * Reads a value out of `localStorage`.
   * The app keeps both the auth token (`jwt`) and the cart (`cart`) there,
   * which makes it a cheap way to assert state without extra API calls.
   */
  async localStorageItem(key) {
    return this.page.evaluate((k) => window.localStorage.getItem(k), key);
  }

  async isAuthenticated() {
    return (await this.localStorageItem('jwt')) !== null;
  }

  /** Resets the client-side cart so cart specs always start from zero. */
  async resetCart() {
    await this.page.evaluate(() => window.localStorage.setItem('cart', '[]'));
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitUntilLoaded();
  }

  /**
   * Runs `action` while a one-shot dialog handler is armed, and resolves with
   * the dialog message. The practise page uses native `alert()` popups, which
   * block the page until they are dismissed.
   *
   * @param {() => Promise<void>} action
   * @returns {Promise<string>} the alert text
   */
  async captureDialog(action) {
    const message = new Promise((resolve) => {
      this.page.once('dialog', async (dialog) => {
        const text = dialog.message();
        await dialog.dismiss();
        resolve(text);
      });
    });

    await action();
    return message;
  }

  async screenshot(name) {
    return this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }
}
