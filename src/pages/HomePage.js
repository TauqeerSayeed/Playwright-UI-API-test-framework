import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';
import { CourseCard } from './components/CourseCard.js';

export class HomePage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page, '/');

    this.root = page.locator('.home');
    this.welcomeMessage = this.root.locator('h4.welcomeMessage');
    this.courseContainer = this.root.locator('.home-container');
    this.courseCards = this.courseContainer.locator('.course-card');
  }

  /**
   * The catalogue is the reliable readiness signal.
   *
   * The welcome banner is deliberately not awaited here: the app renders it
   * from the in-memory state of a fresh sign-in, so it is absent when a
   * session is restored from saved storage state.
   */
  async waitUntilLoaded() {
    await expect(this.root).toBeVisible();
    await this.courseCards.first().waitFor();
  }

  /** Asserts the personalised banner - only valid straight after a UI login. */
  async expectWelcomeFor(name) {
    await expect(this.welcomeMessage).toBeVisible();
    await expect(this.welcomeMessage).toContainText(name);
  }

  async getWelcomeText() {
    return (await this.welcomeMessage.innerText()).trim();
  }

  async courseCount() {
    return this.courseCards.count();
  }

  /** @param {number} index zero based */
  card(index) {
    return new CourseCard(this.courseCards.nth(index));
  }

  /** @param {string} name exact course title as rendered on the card */
  cardByName(name) {
    return new CourseCard(this.courseCards.filter({ has: this.page.locator(`h2.name:text-is("${name}")`) }));
  }

  async allCourseNames() {
    return (await this.courseCards.locator('h2.name').allTextContents()).map((n) => n.trim());
  }

  /** Reads every visible card into plain objects for cross-page comparisons. */
  async allCourses() {
    const total = await this.courseCount();
    const courses = [];
    for (let i = 0; i < total; i += 1) {
      courses.push(await this.card(i).toObject());
    }
    return courses;
  }

  /**
   * Adds the first `count` courses to the cart and returns what was added.
   *
   * @param {number} count
   */
  async addCoursesToCart(count) {
    const added = [];
    for (let i = 0; i < count; i += 1) {
      const card = this.card(i);
      added.push(await card.toObject());
      await card.addToCart();
    }
    return added;
  }
}
