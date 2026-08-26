import { test, expect } from '../../src/fixtures/test-fixtures.js';
import { annotate, report } from '../../src/utils/allure-helper.js';

/**
 * Course catalogue coverage.
 *
 * These specs run under the `chromium` project, which restores the session
 * saved by tests/setup/auth.setup.js - no login step is repeated here.
 */
test.describe('Courses - Home page', () => {
  test('TC-HOME-01 - the catalogue renders for a signed-in user @smoke @regression', async ({
    authenticatedHome,
  }) => {
    await annotate({
      feature: 'Courses',
      story: 'Catalogue',
      severity: 'blocker',
      testId: 'TC-HOME-01',
      tags: ['smoke'],
    });

    await expect(authenticatedHome.page).toHaveTitle(/Learn Automation Courses/);
    expect(await authenticatedHome.courseCount()).toBeGreaterThan(0);

    // The header only offers a cart to an authenticated session.
    await expect(authenticatedHome.nav.cartButton).toBeVisible();
    expect(await authenticatedHome.isAuthenticated()).toBe(true);
  });

  test('TC-HOME-02 - every course card shows its full detail set @regression', async ({
    authenticatedHome,
    data,
  }) => {
    await annotate({ feature: 'Courses', story: 'Catalogue', severity: 'critical', testId: 'TC-HOME-02' });

    const total = await authenticatedHome.courseCount();

    for (let i = 0; i < total; i += 1) {
      const card = authenticatedHome.card(i);

      await expect(card.name).toBeVisible();
      await expect(card.description).toBeVisible();
      await expect(card.instructor).toBeVisible();
      await expect(card.thumbnail).toBeVisible();
      await expect(card.priceChip).toContainText(data.courses.cart.currencySymbol);
      // Start and finish dates.
      await expect(card.dates).toHaveCount(2);
      await expect(card.actionButton).toHaveText(/Add to Cart|Remove from Cart/);

      // A price of zero would mean the chip failed to render its value.
      expect(await card.getPrice()).toBeGreaterThan(0);
    }

    await report.attachJson('catalogue snapshot', await authenticatedHome.allCourses());
  });

  test('TC-HOME-03 - the seeded courses from the data file are listed @regression', async ({
    authenticatedHome,
    data,
  }) => {
    await annotate({ feature: 'Courses', story: 'Catalogue', severity: 'normal', testId: 'TC-HOME-03', tags: ['data-driven'] });

    const names = await authenticatedHome.allCourseNames();
    await report.attachJson('rendered course names', names);

    for (const expected of data.courses.knownCourses) {
      const card = authenticatedHome.cardByName(expected.name);

      await expect(card.root).toBeVisible();
      await expect(card.instructor).toContainText(expected.instructor);
      expect(await card.getPrice()).toBe(expected.price);
    }
  });

  test('TC-HOME-04 - the sidebar links move between the app sections @regression', async ({
    authenticatedHome,
    practisePage,
  }) => {
    await annotate({ feature: 'Navigation', story: 'Sidebar', severity: 'normal', testId: 'TC-HOME-04' });

    await test.step('open and close the burger menu', async () => {
      await authenticatedHome.nav.openSidebar();
      expect(await authenticatedHome.nav.isSidebarOpen()).toBe(true);

      await authenticatedHome.nav.closeSidebar();
      expect(await authenticatedHome.nav.isSidebarOpen()).toBe(false);
    });

    await test.step('go to the practise playground', async () => {
      await authenticatedHome.nav.goToPractise();
      await expect(practisePage.sections.first()).toBeVisible();
    });

    await test.step('return home', async () => {
      await authenticatedHome.nav.goToHome();
      await expect(authenticatedHome.courseCards.first()).toBeVisible();
    });
  });

  test('TC-HOME-05 - the catalogue is usable on a mobile viewport @regression', async ({
    authenticatedHome,
  }) => {
    await annotate({ feature: 'Courses', story: 'Responsive', severity: 'minor', testId: 'TC-HOME-05' });

    await authenticatedHome.page.setViewportSize({ width: 390, height: 844 });

    await expect(authenticatedHome.courseCards.first()).toBeVisible();
    await expect(authenticatedHome.card(0).name).toBeVisible();
    await expect(authenticatedHome.card(0).actionButton).toBeVisible();
    await expect(authenticatedHome.nav.cartButton).toBeVisible();
  });
});
