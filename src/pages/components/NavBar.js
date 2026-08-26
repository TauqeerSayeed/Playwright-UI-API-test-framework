import { expect } from '@playwright/test';

/**
 * The header that appears on every screen.
 *
 * The Home / Practise / Sign out links live inside a slide-in sidebar that is
 * only usable after the burger icon is clicked, so every accessor here opens
 * the sidebar first.
 */
export class NavBar {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.locator('nav.navbar-menu-parent');
    this.logo = this.root.locator('.navbar-menu-logo img[alt="logo"]');
    this.brandTitle = this.root.locator('.navbar-menu-logo h1');
    this.burgerMenu = this.root.locator('img[alt="menu"]');
    this.sidebar = this.root.locator('.sidebar');
    this.closeSidebarIcon = this.sidebar.locator('img[alt="delete"]');
    this.cartButton = this.root.locator('button.cartBtn');
    this.homeLink = this.sidebar.locator('a.nav-menu-item[href="/"]');
    this.practiseLink = this.sidebar.locator('a.nav-menu-item[href="/practise"]');
    this.signOutButton = this.sidebar.getByRole('button', { name: 'Sign out' });
  }

  async openSidebar() {
    if (!(await this.isSidebarOpen())) {
      await this.burgerMenu.click();
      await expect(this.sidebar).toHaveClass(/active-sidebar/);
    }
  }

  async closeSidebar() {
    if (await this.isSidebarOpen()) {
      await this.closeSidebarIcon.click();
      await expect(this.sidebar).not.toHaveClass(/active-sidebar/);
    }
  }

  async isSidebarOpen() {
    return ((await this.sidebar.getAttribute('class')) || '').includes('active-sidebar');
  }

  async goToHome() {
    await this.openSidebar();
    await this.homeLink.click();
    await this.page.waitForURL(/\/$/);
  }

  async goToPractise() {
    await this.openSidebar();
    await this.practiseLink.click();
    await this.page.waitForURL(/\/practise/);
  }

  /**
   * Clicks the cart button in the header. This is a client-side route change,
   * which matters: the cart lives in the browser only, so a full page reload
   * would drop whatever the test just added.
   */
  async goToCart() {
    await this.cartButton.click();
    await this.page.waitForURL(/\/cart/);
  }

  /** Signs out through the sidebar and waits for the redirect to /login. */
  async signOut() {
    await this.openSidebar();
    await this.signOutButton.click();
    await this.page.waitForURL(/\/login/);
  }

  /**
   * The cart button renders as "Cart" when empty and "Cart\n<n>" otherwise.
   *
   * @returns {Promise<number>} number of courses currently in the cart
   */
  async cartCount() {
    if (!(await this.cartButton.isVisible())) return 0;

    const label = (await this.cartButton.innerText()).trim();
    const match = label.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  /** True when the header shows the signed-in affordances. */
  async isUserSignedIn() {
    return this.cartButton.isVisible();
  }
}
