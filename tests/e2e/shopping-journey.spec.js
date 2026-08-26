import { test, expect } from '../../src/fixtures/test-fixtures.js';
import { annotate, report } from '../../src/utils/allure-helper.js';
import { buildUser } from '../../src/utils/data-generator.js';

/**
 * The end-to-end journey the whole suite exists to protect:
 *
 *   register -> sign in -> browse -> add to cart -> remove -> check the total
 *   -> enroll -> sign out
 *
 * This spec deliberately starts from a signed-out browser and does everything
 * through the UI, so it is the slowest but most representative test in the
 * project. The account is created over the API first, which keeps the run
 * repeatable without hand-maintaining a fixture user.
 */
test.describe('End to end - full shopping journey', () => {
  // Own its own session: no storage state, no shared cart.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-E2E-01 - a new user can register, buy and sign out @e2e @smoke', async ({
    authApi,
    loginPage,
    homePage,
    cartPage,
    data,
  }) => {
    await annotate({
      feature: 'End to end',
      story: 'Shopping journey',
      severity: 'blocker',
      testId: 'TC-E2E-01',
      tags: ['e2e', 'smoke'],
    });

    const user = buildUser();
    await report.attachJson('journey user', { ...user, password: '***' });

    await test.step('1. create the account over the API', async () => {
      const { status, body } = await authApi.signup(user);

      expect(status, JSON.stringify(body)).toBe(200);
      expect(body.user.email).toBe(user.email);
    });

    await test.step('2. sign in through the UI', async () => {
      await loginPage.open();
      await loginPage.loginAs(user);

      await expect(homePage.welcomeMessage).toContainText(user.name);
      expect(await homePage.isAuthenticated()).toBe(true);
    });

    let catalogue;
    await test.step('3. browse the catalogue', async () => {
      await homePage.waitUntilLoaded();
      catalogue = await homePage.allCourses();

      expect(catalogue.length).toBeGreaterThanOrEqual(2);
      await report.attachJson('catalogue', catalogue);
    });

    let added;
    await test.step('4. add two courses to the cart', async () => {
      added = await homePage.addCoursesToCart(2);

      expect(await homePage.nav.cartCount()).toBe(2);
    });

    await test.step('5. open the cart and verify its contents', async () => {
      await homePage.nav.goToCart();

      expect(await cartPage.allItemNames()).toEqual(added.map((c) => c.name));
      expect(await cartPage.getTotal()).toBe(added.reduce((sum, c) => sum + c.price, 0));
    });

    await test.step('6. remove one course and re-check the total', async () => {
      const [dropped, kept] = added;

      await cartPage.removeCourse(dropped.name);

      expect(await cartPage.itemCount()).toBe(1);
      expect(await cartPage.getTotal()).toBe(kept.price);
      expect(await cartPage.nav.cartCount()).toBe(1);
    });

    await test.step('7. enroll in the remaining course', async () => {
      expect(await cartPage.getPrimaryActionLabel()).toBe('Enroll Now');

      await cartPage.enrollWithDetails(data.checkout.validDetails);

      // A successful enrollment clears the cart on the server's response.
      expect(await cartPage.isEmpty()).toBe(true);
      expect(await cartPage.getTotal()).toBe(0);
      expect(await cartPage.nav.cartCount()).toBe(0);
    });

    await test.step('8. sign out and confirm the session is cleared', async () => {
      await cartPage.nav.signOut();

      await expect(loginPage.heading).toHaveText('Sign In');
      expect(await loginPage.isAuthenticated()).toBe(false);
      await expect(loginPage.nav.cartButton).toBeHidden();
    });
  });
});
