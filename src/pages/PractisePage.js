import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * The /practise playground. Each widget sits in its own `.test` block, so the
 * blocks are addressed by their heading rather than by a brittle index.
 */
export class PractisePage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page, '/practise');

    this.root = page.locator('.container');
    this.sections = this.root.locator('.test');
    this.dragSource = page.locator('#drag1');
    this.dropTarget = page.locator('#div1');
  }

  async waitUntilLoaded() {
    await expect(this.sections.first()).toBeVisible();
  }

  /** @param {string} heading the `h3` text of the widget */
  section(heading) {
    return this.sections.filter({ has: this.page.locator(`h3:text-is("${heading}")`) });
  }

  // --- Enable field after 5 seconds -----------------------------------------

  enableFieldInput(heading) {
    return this.section(heading).locator('input');
  }

  async clickEnableField(heading, buttonLabel) {
    await this.section(heading).getByRole('button', { name: buttonLabel }).click();
  }

  /** Waits for the delayed enable, then types into the field. */
  async waitForFieldEnabled(heading, timeout) {
    await expect(this.enableFieldInput(heading)).toBeEnabled({ timeout });
  }

  // --- Hide / Show ----------------------------------------------------------

  hideShowInput(heading) {
    return this.section(heading).locator('input');
  }

  async hideField(heading) {
    await this.section(heading).getByRole('button', { name: 'Hide' }).click();
  }

  async showField(heading) {
    await this.section(heading).getByRole('button', { name: 'Show' }).click();
  }

  // --- Mouse actions --------------------------------------------------------

  /** Double clicks the widget and returns the text of the alert it raises. */
  async doubleClickAndReadAlert(heading) {
    return this.captureDialog(() => this.section(heading).locator('button').dblclick());
  }

  /** Right clicks the widget and returns the text of the alert it raises. */
  async rightClickAndReadAlert(heading) {
    return this.captureDialog(() =>
      this.section(heading).locator('button').click({ button: 'right' }),
    );
  }

  // --- Drag and drop --------------------------------------------------------

  /**
   * The drop zone is a native HTML5 target, which Chromium will not activate
   * from synthesised mouse movement alone. Dispatching the drag events with a
   * shared `DataTransfer` is the reliable way to drive it.
   */
  async dragToTarget() {
    await this.dragSource.waitFor();
    await this.page.evaluate(
      ([sourceId, targetId]) => {
        const source = document.getElementById(sourceId);
        const target = document.getElementById(targetId);
        const dataTransfer = new DataTransfer();
        const fire = (el, type) =>
          el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }));

        fire(source, 'dragstart');
        fire(target, 'dragover');
        fire(target, 'drop');
        fire(source, 'dragend');
      },
      ['drag1', 'div1'],
    );
  }

  /** @returns {Promise<boolean>} true once the square lives inside the drop zone */
  async isDropped() {
    return this.page.evaluate(
      () => document.getElementById('drag1')?.parentElement?.id === 'div1',
    );
  }
}
