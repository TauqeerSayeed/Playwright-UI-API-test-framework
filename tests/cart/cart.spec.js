import { test, expect } from '../../src/fixtures/test-fixtures.js';
import { annotate, report } from '../../src/utils/allure-helper.js';

/**
 * Cart management coverage.
 *
 * Worth knowing about this app: the cart lives entirely in the browser
 * (`localStorage.cart`) and is never sent to the backend. That is why every
 * test reaches the cart through the header button - a client-side route
 * change - rather than assuming the server remembers anything.
 *
 * The `authenticatedHome` fixture resets the cart before each test, so the
 * specs below can run in any order.
 */
test.describe('Cart - management', () => {
  test('TC-CART-01 - a course can be added to the cart @smoke @regression', async ({
    authenticatedHome,
    cartPage,
  }) => {
    await annotate({
      feature: 'Cart',
      story: 'Add to cart',
      severity: 'blocker',
      testId: 'TC-CART-01',
      tags: ['smoke'],
    });

    const course = await authenticatedHome.card(0).toObject();
    await report.attachJson('course under test', course);

    await test.step('add the first course', async () => {
      await authenticatedHome.card(0).addToCart();
    });

    await test.step('the card and the badge both reflect it', async () => {
      expect(await authenticatedHome.card(0).getActionLabel()).toBe('Remove from Cart');
      expect(await authenticatedHome.nav.cartCount()).toBe(1);
    });

    await test.step('the cart page lists the same course', async () => {
      await authenticatedHome.nav.goToCart();

      expect(await cartPage.itemCount()).toBe(1);
      expect(await cartPage.allItemNames()).toEqual([course.name]);
      expect(await cartPage.getTotal()).toBe(course.price);
      expect(await cartPage.getPrimaryActionLabel()).toBe('Enroll Now');
    });
  });

  test('TC-CART-02 - the total is the sum of every course in the cart @smoke @regression', async ({
    authenticatedHome,
    cartPage,
    data,
  }) => {
    await annotate({
      feature: 'Cart',
      story: 'Pricing',
      severity: 'critical',
      testId: 'TC-CART-02',
      tags: ['smoke'],
    });

    const { coursesToAdd } = data.courses.cart;
    const added = await authenticatedHome.addCoursesToCart(coursesToAdd);
    const expectedTotal = added.reduce((sum, course) => sum + course.price, 0);

    await report.attachJson('courses added', added);

    expect(await authenticatedHome.nav.cartCount()).toBe(coursesToAdd);

    await authenticatedHome.nav.goToCart();

    expect(await cartPage.itemCount()).toBe(coursesToAdd);
    expect(await cartPage.allItemNames()).toEqual(added.map((c) => c.name));
    expect(await cartPage.getTotal()).toBe(expectedTotal);
    // Cross-check the header figure against the prices the rows themselves show.
    expect(await cartPage.getTotal()).toBe(await cartPage.expectedTotal());
  });

  test('TC-CART-03 - a course can be removed from the cart page @regression', async ({
    authenticatedHome,
    cartPage,
  }) => {
    await annotate({
      feature: 'Cart',
      story: 'Remove from cart',
      severity: 'critical',
      testId: 'TC-CART-03',
    });

    const added = await authenticatedHome.addCoursesToCart(2);
    await authenticatedHome.nav.goToCart();

    const [removed, kept] = added;
    const totalBefore = await cartPage.getTotal();

    await test.step('remove the first course', async () => {
      await cartPage.removeCourse(removed.name);
    });

    await test.step('only the remaining course is left and the total drops', async () => {
      expect(await cartPage.itemCount()).toBe(1);
      expect(await cartPage.allItemNames()).toEqual([kept.name]);
      expect(await cartPage.getTotal()).toBe(totalBefore - removed.price);
      expect(await cartPage.nav.cartCount()).toBe(1);
    });
  });

  test('TC-CART-04 - the add button toggles back after removing @regression', async ({
    authenticatedHome,
  }) => {
    await annotate({
      feature: 'Cart',
      story: 'Remove from cart',
      severity: 'normal',
      testId: 'TC-CART-04',
    });

    const card = authenticatedHome.card(0);

    await card.addToCart();
    expect(await card.isInCart()).toBe(true);

    await card.removeFromCart();

    await expect(card.actionButton).toHaveText(/Add to Cart/);
    expect(await authenticatedHome.nav.cartCount()).toBe(0);
  });

  test('TC-CART-05 - emptying the cart shows the shop-now state @regression', async ({
    authenticatedHome,
    cartPage,
  }) => {
    await annotate({ feature: 'Cart', story: 'Empty cart', severity: 'normal', testId: 'TC-CART-05' });

    await authenticatedHome.addCoursesToCart(2);
    await authenticatedHome.nav.goToCart();

    await cartPage.removeAll();

    expect(await cartPage.isEmpty()).toBe(true);
    expect(await cartPage.getTotal()).toBe(0);
    expect(await cartPage.getPrimaryActionLabel()).toBe('Shop Now');
    expect(await cartPage.nav.cartCount()).toBe(0);
  });

  test('TC-CART-06 - re-adding a removed course leaves a single entry @regression', async ({
    authenticatedHome,
    cartPage,
  }) => {
    await annotate({ feature: 'Cart', story: 'Add to cart', severity: 'normal', testId: 'TC-CART-06' });

    const card = authenticatedHome.card(0);

    // The button is a toggle, so add - remove - add must not duplicate the row.
    await card.addToCart();
    await card.removeFromCart();
    await expect(card.actionButton).toHaveText(/Add to Cart/);
    await card.addToCart();

    await authenticatedHome.nav.goToCart();

    expect(await cartPage.itemCount()).toBe(1);
  });

  test('TC-CART-07 - the cart survives client-side navigation @regression', async ({
    authenticatedHome,
    cartPage,
  }) => {
    await annotate({ feature: 'Cart', story: 'Persistence', severity: 'critical', testId: 'TC-CART-07' });

    const added = await authenticatedHome.addCoursesToCart(2);

    await test.step('navigate away to practise and back home', async () => {
      await authenticatedHome.nav.goToPractise();
      await authenticatedHome.nav.goToHome();
    });

    expect(await authenticatedHome.nav.cartCount()).toBe(2);

    await authenticatedHome.nav.goToCart();
    expect(await cartPage.allItemNames()).toEqual(added.map((c) => c.name));
  });

  test('TC-CART-08 - the cart is written to browser storage @regression', async ({
    authenticatedHome,
    cartPage,
  }) => {
    await annotate({ feature: 'Cart', story: 'Persistence', severity: 'normal', testId: 'TC-CART-08' });

    const added = await authenticatedHome.addCoursesToCart(1);

    const stored = JSON.parse((await authenticatedHome.localStorageItem('cart')) || '[]');
    await report.attachJson('localStorage.cart', stored);

    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe(added[0].name);
    expect(stored[0].price).toBe(added[0].price);

    // A full page reload must not lose it, since it is read back from storage.
    await cartPage.open();
    expect(await cartPage.itemCount()).toBe(1);
  });

  test('TC-CART-09 - the enroll dialog opens with the cart total @regression', async ({
    authenticatedHome,
    cartPage,
  }) => {
    await annotate({ feature: 'Cart', story: 'Checkout', severity: 'critical', testId: 'TC-CART-09' });

    const added = await authenticatedHome.addCoursesToCart(2);
    await authenticatedHome.nav.goToCart();

    expect(await cartPage.getPrimaryActionLabel()).toBe('Enroll Now');

    const modal = await cartPage.enrollNow();

    await expect(modal.addressInput).toBeVisible();
    await expect(modal.phoneInput).toBeVisible();
    // The dialog must quote the same figure as the cart behind it.
    expect(await modal.getTotal()).toBe(added.reduce((sum, c) => sum + c.price, 0));
  });

  test('TC-CART-10 - cancelling checkout leaves the cart untouched @regression', async ({
    authenticatedHome,
    cartPage,
  }) => {
    await annotate({ feature: 'Cart', story: 'Checkout', severity: 'normal', testId: 'TC-CART-10' });

    const added = await authenticatedHome.addCoursesToCart(1);
    await authenticatedHome.nav.goToCart();

    const modal = await cartPage.enrollNow();
    await modal.cancel();

    expect(await modal.isOpen()).toBe(false);
    expect(await cartPage.itemCount()).toBe(1);
    expect(await cartPage.allItemNames()).toEqual([added[0].name]);
  });

  test('TC-CART-11 - checkout without address or phone is not accepted @regression', async ({
    authenticatedHome,
    cartPage,
    data,
  }) => {
    await annotate({
      feature: 'Cart',
      story: 'Checkout validation',
      severity: 'normal',
      testId: 'TC-CART-11',
      tags: ['negative'],
    });

    await authenticatedHome.addCoursesToCart(1);
    await authenticatedHome.nav.goToCart();

    const modal = await cartPage.enrollNow();
    await modal.completeEnrollment(data.checkout.incompleteDetails);

    // The dialog stays up and the cart is still intact - nothing was enrolled.
    await expect(modal.root).toBeVisible();
    expect(await cartPage.itemCount()).toBe(1);
  });

  test('TC-CART-12 - a complete checkout enrolls and empties the cart @smoke @regression', async ({
    authenticatedHome,
    cartPage,
    data,
  }) => {
    await annotate({
      feature: 'Cart',
      story: 'Checkout',
      severity: 'blocker',
      testId: 'TC-CART-12',
      tags: ['smoke'],
    });

    await authenticatedHome.addCoursesToCart(1);
    await authenticatedHome.nav.goToCart();

    await report.attachJson('delivery details', data.checkout.validDetails);

    await test.step('submit the enrollment', async () => {
      await cartPage.enrollWithDetails(data.checkout.validDetails);
    });

    await test.step('the cart is emptied and reset to the shop-now state', async () => {
      expect(await cartPage.isEmpty()).toBe(true);
      expect(await cartPage.getTotal()).toBe(0);
      expect(await cartPage.getPrimaryActionLabel()).toBe('Shop Now');
      expect(await cartPage.nav.cartCount()).toBe(0);
    });
  });
});
