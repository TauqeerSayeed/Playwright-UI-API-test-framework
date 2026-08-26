import { test, expect } from '../../src/fixtures/test-fixtures.js';
import { annotate } from '../../src/utils/allure-helper.js';

/**
 * Sign-out coverage - the closing half of the login-to-logout journey.
 */
test.describe('Authentication - Logout', () => {
  test('TC-LOGOUT-01 - a signed-in user can sign out @smoke @regression', async ({
    loginPage,
    homePage,
    validUser,
  }) => {
    await annotate({
      feature: 'Authentication',
      story: 'Logout',
      severity: 'blocker',
      testId: 'TC-LOGOUT-01',
      tags: ['smoke'],
    });

    await test.step('sign in', async () => {
      await loginPage.open();
      await loginPage.loginAs(validUser);
      await expect(homePage.welcomeMessage).toBeVisible();
    });

    await test.step('sign out from the sidebar', async () => {
      await homePage.nav.signOut();
    });

    await test.step('the session is gone', async () => {
      await expect(loginPage.heading).toHaveText('Sign In');
      expect(await loginPage.isAuthenticated()).toBe(false);
      await expect(loginPage.nav.cartButton).toBeHidden();
    });
  });

  test('TC-LOGOUT-02 - signing out empties the cart @regression', async ({
    loginPage,
    homePage,
    validUser,
  }) => {
    await annotate({ feature: 'Authentication', story: 'Logout', severity: 'critical', testId: 'TC-LOGOUT-02' });

    await loginPage.open();
    await loginPage.loginAs(validUser);
    await homePage.waitUntilLoaded();
    await homePage.resetCart();

    await test.step('add a course so the cart is not already empty', async () => {
      await homePage.card(0).addToCart();
      expect(await homePage.nav.cartCount()).toBe(1);
    });

    await test.step('sign out', async () => {
      await homePage.nav.signOut();
    });

    await test.step('the stored cart is cleared', async () => {
      expect(JSON.parse((await loginPage.localStorageItem('cart')) || '[]')).toHaveLength(0);
    });
  });

  test('TC-LOGOUT-03 - the cart route of a signed-out visitor is empty @regression', async ({
    loginPage,
    cartPage,
  }) => {
    await annotate({ feature: 'Authentication', story: 'Access control', severity: 'normal', testId: 'TC-LOGOUT-03' });

    await loginPage.open();
    await cartPage.open();

    // Without a session there is nothing to show and no way back to checkout.
    expect(await cartPage.isEmpty()).toBe(true);
    expect(await cartPage.getTotal()).toBe(0);
    expect(await cartPage.getPrimaryActionLabel()).toBe('Shop Now');
  });
});
