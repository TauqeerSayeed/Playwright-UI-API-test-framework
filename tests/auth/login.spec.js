import { test, expect } from '../../src/fixtures/test-fixtures.js';
import { annotate, report } from '../../src/utils/allure-helper.js';
import { testData } from '../../src/utils/data-reader.js';

// Loaded at module scope so the scenarios can be turned into real, individually
// reported tests rather than a single loop inside one test body.
const { negative, requiredFieldValidation } = testData.loginScenarios;

/**
 * Login coverage.
 *
 * This project runs without the saved storage state, so each test starts from
 * a genuinely signed-out browser and drives the real form.
 */
test.describe('Authentication - Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('TC-LOGIN-01 - a registered user can sign in @smoke @regression', async ({
    loginPage,
    homePage,
    validUser,
  }) => {
    await annotate({
      feature: 'Authentication',
      story: 'Login',
      severity: 'blocker',
      testId: 'TC-LOGIN-01',
      tags: ['smoke'],
    });
    await report.attachJson('credentials used', { email: validUser.email });

    await test.step('submit valid credentials', async () => {
      await loginPage.loginAs(validUser);
    });

    await test.step('the app lands on the course listing', async () => {
      await homePage.expectWelcomeFor(validUser.name);
      await expect(homePage.courseCards.first()).toBeVisible();
    });

    await test.step('a session token is persisted', async () => {
      expect(await homePage.isAuthenticated()).toBe(true);
      await expect(homePage.nav.cartButton).toBeVisible();
    });
  });

  /**
   * Data-driven negative cases. The scenarios - and the message each one is
   * expected to produce - come straight from test-data/login-scenarios.json,
   * so a new case needs no code change.
   */
  for (const scenario of negative) {
    test(`${scenario.id} - ${scenario.title} @regression`, async ({ loginPage }) => {
      await annotate({
        feature: 'Authentication',
        story: 'Login',
        severity: 'critical',
        testId: scenario.id,
        tags: ['negative', 'data-driven'],
      });
      await report.attachJson('scenario', scenario);

      const error = await loginPage.loginExpectingFailure(scenario);

      expect(error).toContain(scenario.expectedError);
      await expect(loginPage.page).toHaveURL(/\/login/);
      expect(await loginPage.isAuthenticated()).toBe(false);
    });
  }

  for (const scenario of requiredFieldValidation) {
    test(`${scenario.id} - ${scenario.title} is reported to the user @regression`, async ({
      loginPage,
    }) => {
      await annotate({
        feature: 'Authentication',
        story: 'Login validation',
        severity: 'normal',
        testId: scenario.id,
        tags: ['negative', 'data-driven'],
      });
      await report.attachJson('scenario', scenario);

      const error = await loginPage.loginExpectingFailure(scenario);

      // The app validates before authenticating, so a missing field produces
      // its own message rather than a credential error.
      expect(error).toContain(scenario.expectedError);
      await expect(loginPage.page).toHaveURL(/\/login/);
      expect(await loginPage.isAuthenticated()).toBe(false);
    });
  }

  test('TC-LOGIN-07 - the password field masks what is typed @regression', async ({
    loginPage,
    validUser,
  }) => {
    await annotate({ feature: 'Authentication', story: 'Login', severity: 'minor', testId: 'TC-LOGIN-07' });

    await loginPage.passwordInput.fill(validUser.password);

    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    await expect(loginPage.passwordInput).toHaveValue(validUser.password);
  });

  test('TC-LOGIN-08 - the signup link opens the registration form @regression', async ({
    loginPage,
    signupPage,
  }) => {
    await annotate({ feature: 'Authentication', story: 'Navigation', severity: 'normal', testId: 'TC-LOGIN-08' });

    await loginPage.goToSignUp();

    await expect(signupPage.heading).toHaveText('Sign Up');
  });

  test('TC-LOGIN-09 - a signed-out visitor sees no cart control @regression', async ({
    loginPage,
  }) => {
    await annotate({ feature: 'Authentication', story: 'Access control', severity: 'normal', testId: 'TC-LOGIN-09' });

    await expect(loginPage.nav.cartButton).toBeHidden();
    expect(await loginPage.nav.isUserSignedIn()).toBe(false);
  });
});
