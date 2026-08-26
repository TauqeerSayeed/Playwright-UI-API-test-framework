import { test, expect } from '../../src/fixtures/test-fixtures.js';
import { annotate, report } from '../../src/utils/allure-helper.js';

/**
 * Registration coverage.
 *
 * `newUser` is a fixture that generates a unique email per test, so these can
 * be re-run as often as needed without colliding with an existing account.
 */
test.describe('Authentication - Signup', () => {
  test.beforeEach(async ({ signupPage }) => {
    await signupPage.open();
  });

  test('TC-SIGNUP-01 - a new user can register with the full form @smoke @regression', async ({
    signupPage,
    loginPage,
    newUser,
  }) => {
    await annotate({
      feature: 'Authentication',
      story: 'Signup',
      severity: 'blocker',
      testId: 'TC-SIGNUP-01',
      tags: ['smoke'],
    });
    await report.attachJson('generated user', { ...newUser, password: '***' });

    await test.step('fill every field and submit', async () => {
      await signupPage.register(newUser);
    });

    await test.step('the app returns to the login screen', async () => {
      await expect(loginPage.heading).toHaveText('Sign In');
    });

    await test.step('the brand new account can sign in', async () => {
      await loginPage.loginAs(newUser);
      await expect(loginPage.nav.cartButton).toBeVisible();
    });
  });

  test('TC-SIGNUP-02 - the submit button stays disabled until the form is valid @regression', async ({
    signupPage,
    newUser,
  }) => {
    await annotate({ feature: 'Authentication', story: 'Signup validation', severity: 'normal', testId: 'TC-SIGNUP-02' });

    // The button unlocks only once *every* mandatory field is answered, so it
    // is still disabled part-way through a plausible-looking form.
    await expect(signupPage.signUpButton).toBeDisabled();

    await signupPage.nameInput.fill(newUser.name);
    await signupPage.emailInput.fill(newUser.email);
    await signupPage.passwordInput.fill(newUser.password);
    await expect(signupPage.signUpButton).toBeDisabled();

    await signupPage.selectInterest(newUser.interest);
    await signupPage.selectGender(newUser.gender);
    await signupPage.selectState(newUser.state);
    await expect(signupPage.signUpButton).toBeDisabled();

    // Hobbies is the last required answer - the form is only valid after it.
    await signupPage.selectHobbies(newUser.hobbies);
    await expect(signupPage.signUpButton).toBeEnabled();
  });

  test('TC-SIGNUP-03 - registering an email that already exists is rejected @regression', async ({
    signupPage,
    validUser,
    newUser,
  }) => {
    await annotate({
      feature: 'Authentication',
      story: 'Signup validation',
      severity: 'critical',
      testId: 'TC-SIGNUP-03',
      tags: ['negative'],
    });

    // Everything except the email is valid, so the only reason to fail is the
    // address already being taken.
    const error = await signupPage.registerExpectingFailure({
      ...newUser,
      name: validUser.name,
      email: validUser.email,
      password: validUser.password,
    });

    await report.attachText('server error', error);
    expect(error.toLowerCase()).toContain('already registered');
    await expect(signupPage.page).toHaveURL(/\/signup/);
  });

  test('TC-SIGNUP-04 - the form offers the expected interests, states and hobbies @regression', async ({
    signupPage,
    data,
  }) => {
    await annotate({ feature: 'Authentication', story: 'Signup form', severity: 'minor', testId: 'TC-SIGNUP-04' });

    const interests = await signupPage.interestLabels.allTextContents();
    const states = await signupPage.availableStates();
    const hobbies = await signupPage.availableHobbies();

    await report.attachJson('form options', { interests, states: states.length, hobbies });

    // The catalogue is user-managed, so assert on shape rather than on a
    // hard-coded list that would break the moment an admin adds a category.
    expect(interests.length).toBeGreaterThan(0);
    expect(interests).toContain(data.users.newUserTemplate.interest);
    expect(states).toContain(data.users.newUserTemplate.state);
    expect(hobbies).toEqual(expect.arrayContaining(data.users.newUserTemplate.hobbies));
  });

  test('TC-SIGNUP-05 - multi-select hobbies and radio gender behave correctly @regression', async ({
    signupPage,
    newUser,
  }) => {
    await annotate({ feature: 'Authentication', story: 'Signup form', severity: 'normal', testId: 'TC-SIGNUP-05' });

    await signupPage.selectHobbies(newUser.hobbies);
    await expect(signupPage.hobbiesSelect).toHaveValues(newUser.hobbies);

    await signupPage.selectGender('Female');
    await expect(signupPage.femaleRadio).toBeChecked();
    await expect(signupPage.maleRadio).not.toBeChecked();
  });

  test('TC-SIGNUP-06 - the login link returns to the sign in form @regression', async ({
    signupPage,
    loginPage,
  }) => {
    await annotate({ feature: 'Authentication', story: 'Navigation', severity: 'minor', testId: 'TC-SIGNUP-06' });

    await signupPage.goToLogin();

    await expect(loginPage.heading).toHaveText('Sign In');
  });
});
