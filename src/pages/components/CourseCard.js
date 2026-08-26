import { expect } from '@playwright/test';

/**
 * A single `.course-card` tile. The same markup is reused on the home page and
 * inside the cart, so both pages share this component.
 */
export class CourseCard {
  /** @param {import('@playwright/test').Locator} root the `.course-card` element */
  constructor(root) {
    this.root = root;
    this.thumbnail = root.locator('.thumbnail');
    this.name = root.locator('h2.name');
    this.description = root.locator('p.description');
    this.instructor = root.locator('.instructor');
    this.dates = root.locator('.date');
    this.priceChip = root.locator('#cardChip');
    this.actionButton = root.locator('button');
  }

  /**
   * Read from `textContent`, not `innerText`.
   *
   * The home page styles course titles with `text-transform: uppercase` while
   * the cart does not, so `innerText` would return two different strings for
   * the same course and break every cross-page comparison.
   */
  async getName() {
    return (await this.name.textContent()).trim();
  }

  async getInstructor() {
    return (await this.instructor.textContent()).trim();
  }

  /** @returns {Promise<number>} the numeric price, currency symbol stripped */
  async getPrice() {
    const text = await this.priceChip.innerText();
    return Number(text.replace(/[^\d]/g, ''));
  }

  async getActionLabel() {
    return (await this.actionButton.innerText()).trim();
  }

  async isInCart() {
    return (await this.getActionLabel()).startsWith('Remove');
  }

  /** Adds the course, unless it is already in the cart. */
  async addToCart() {
    if (await this.isInCart()) return;
    await this.actionButton.click();
    await expect(this.actionButton).toHaveText(/Remove from Cart/);
  }

  /** Removes the course from the cart. */
  async removeFromCart() {
    await this.actionButton.click();
  }

  /** Snapshot of the card, handy for asserting the cart mirrors the home page. */
  async toObject() {
    return {
      name: await this.getName(),
      instructor: await this.getInstructor(),
      price: await this.getPrice(),
    };
  }
}
