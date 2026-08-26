import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';
import { logger } from '../utils/logger.js';

export class SignupPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page, '/signup');

    this.form = page.locator('form.signup-form');
    this.heading = this.form.locator('h2.header');
    this.nameInput = page.locator('#name');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.interestLabels = this.form.locator('label.interest');
    this.maleRadio = page.locator('#gender1');
    this.femaleRadio = page.locator('#gender2');
    this.stateSelect = page.locator('#state');
    this.hobbiesSelect = page.locator('#hobbies');
    this.signUpButton = this.form.locator('button.submit-btn');
    this.loginLink = this.form.locator('a.subLink');
    this.errorMessage = this.form.locator('h2.errorMessage');
  }

  async waitUntilLoaded() {
    await expect(this.heading).toHaveText('Sign Up');
  }

  /**
   * The interest checkboxes carry ids that start with a digit, which is not a
   * valid CSS selector - so they are always reached through their label text.
   */
  async selectInterest(interest) {
    await this.interestLabels.filter({ hasText: interest }).first().click();
  }

  async selectGender(gender) {
    await (gender === 'Female' ? this.femaleRadio : this.maleRadio).check();
  }

  async selectState(state) {
    await this.stateSelect.selectOption(state);
  }

  /** @param {string[]} hobbies one or more options from the multi-select */
  async selectHobbies(hobbies) {
    await this.hobbiesSelect.selectOption(hobbies);
  }

  async availableStates() {
    return this.stateSelect.locator('option:not([hidden])').allTextContents();
  }

  async availableHobbies() {
    return this.hobbiesSelect.locator('option').allTextContents();
  }

  /** Fills every field but stops short of submitting. */
  async fillForm(user) {
    logger.info('Filling signup form', { email: user.email });
    await this.nameInput.fill(user.name);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    if (user.interest) await this.selectInterest(user.interest);
    if (user.gender) await this.selectGender(user.gender);
    if (user.state) await this.selectState(user.state);
    if (user.hobbies?.length) await this.selectHobbies(user.hobbies);
    return this;
  }

  async submit() {
    await this.signUpButton.click();
  }

  /**
   * Registers a user and waits for the app to bounce back to the login screen.
   *
   * @param {object} user built by `buildUser()`
   */
  async register(user) {
    await this.fillForm(user);
    await this.submit();
    await this.page.waitForURL(/\/login/, { timeout: 60_000 });
    return user;
  }

  /** Submits a registration expected to be rejected and returns the error. */
  async registerExpectingFailure(user) {
    await this.fillForm(user);
    await this.submit();
    await expect(this.errorMessage).toBeVisible({ timeout: 60_000 });
    return (await this.errorMessage.innerText()).trim();
  }

  async goToLogin() {
    await this.loginLink.click();
    await this.page.waitForURL(/\/login/);
  }
}
