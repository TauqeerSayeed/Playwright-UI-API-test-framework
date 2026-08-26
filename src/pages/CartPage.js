import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';
import { CourseCard } from './components/CourseCard.js';
import { EnrollModal } from './components/EnrollModal.js';

export class CartPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page, '/cart');

    this.root = page.locator('.cart');
    this.summary = this.root.locator('.top-container');
    this.totalPrice = this.summary.locator('h3');
    this.primaryAction = this.summary.locator('button');
    this.courseCards = this.root.locator('.cart-container .course-card');

    /** Checkout dialog opened by the "Enroll Now" button. */
    this.enrollModal = new EnrollModal(page);
  }

  async waitUntilLoaded() {
    await expect(this.totalPrice).toBeVisible();
  }

  /** @param {number} index zero based */
  card(index) {
    return new CourseCard(this.courseCards.nth(index));
  }

  /** @param {string} name exact course title */
  cardByName(name) {
    return new CourseCard(this.courseCards.filter({ has: this.page.locator(`h2.name:text-is("${name}")`) }));
  }

  async itemCount() {
    return this.courseCards.count();
  }

  async isEmpty() {
    return (await this.itemCount()) === 0;
  }

  /** @returns {Promise<number>} the total, currency symbol stripped */
  async getTotal() {
    const text = await this.totalPrice.innerText();
    return Number(text.replace(/[^\d]/g, ''));
  }

  /**
   * The summary button is "Shop Now" for an empty cart and "Enroll Now"
   * once at least one course has been added.
   */
  async getPrimaryActionLabel() {
    return (await this.primaryAction.innerText()).trim();
  }

  async allItems() {
    const total = await this.itemCount();
    const items = [];
    for (let i = 0; i < total; i += 1) {
      items.push(await this.card(i).toObject());
    }
    return items;
  }

  async allItemNames() {
    return (await this.courseCards.locator('h2.name').allTextContents()).map((n) => n.trim());
  }

  /** Removes one course by title and waits for the row to disappear. */
  async removeCourse(name) {
    const before = await this.itemCount();
    await this.cardByName(name).removeFromCart();
    await expect(this.courseCards).toHaveCount(before - 1);
  }

  async removeAll() {
    while ((await this.itemCount()) > 0) {
      const count = await this.itemCount();
      await this.card(0).removeFromCart();
      await expect(this.courseCards).toHaveCount(count - 1);
    }
  }

  /** Opens the checkout dialog and waits for it to be ready. */
  async enrollNow() {
    await this.primaryAction.click();
    await this.enrollModal.waitUntilOpen();
    return this.enrollModal;
  }

  /**
   * Runs checkout end to end: open the dialog, submit the delivery details and
   * wait for the backend to clear the cart.
   *
   * @param {{address: string, phone: string}} details
   */
  async enrollWithDetails(details) {
    const modal = await this.enrollNow();
    await modal.completeEnrollment(details);

    // The enrollment succeeded once the server-side cart reset reaches the UI.
    await expect(this.courseCards).toHaveCount(0, { timeout: 60_000 });
    await modal.dismiss();
  }

  /** Sum of the individual card prices - compared against the displayed total. */
  async expectedTotal() {
    const items = await this.allItems();
    return items.reduce((sum, item) => sum + item.price, 0);
  }
}
