import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';

export class LoginPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page, '/login');

    this.form = page.locator('form.login-form');
    this.heading = this.form.locator('h2.header');
    this.emailInput = page.locator('#email1');
    this.passwordInput = page.locator('#password1');
    this.signInButton = this.form.locator('button.submit-btn');
    this.errorMessage = this.form.locator('h2.errorMessage');
    this.signUpLink = this.form.locator('a.subLink');
    this.socialLinks = page.locator('#login_container .social-btns a');
  }

  async waitUntilLoaded() {
    await expect(this.heading).toHaveText('Sign In');
  }

  /** Fills the form without submitting - used by validation tests. */
  async fillCredentials(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.signInButton.click();
  }

  /**
   * Signs in and waits for the redirect to the home page.
   *
   * @param {{email: string, password: string}} user
   */
  async loginAs({ email, password }) {
    logger.info('Signing in', { email });
    await this.fillCredentials(email, password);
    await this.submit();
    await this.page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 60_000 });
  }

  /** Submits credentials that are expected to fail and returns the error text. */
  async loginExpectingFailure({ email, password }) {
    await this.fillCredentials(email, password);
    await this.submit();
    await expect(this.errorMessage).toBeVisible({ timeout: 60_000 });
    return (await this.errorMessage.innerText()).trim();
  }

  async goToSignUp() {
    await this.signUpLink.click();
    await this.page.waitForURL(/\/signup/);
  }

  /** The browser refuses to submit an empty required/typed field. */
  async isEmailValid() {
    return this.emailInput.evaluate((el) => el.checkValidity());
  }

  async validationMessage(field = 'email') {
    const input = field === 'email' ? this.emailInput : this.passwordInput;
    return input.evaluate((el) => el.validationMessage);
  }
}
