import { expect } from '@playwright/test';

/**
 * The checkout dialog raised by "Enroll Now" on the cart page.
 *
 * It collects a delivery address and a phone number, echoes the cart total,
 * and on submit posts to `/api/enroll/<userId>` and empties the cart.
 */
export class EnrollModal {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.locator('.cart-modal');
    this.title = this.root.locator('.modal-title');
    this.addressInput = this.root.locator('#address');
    this.phoneInput = this.root.locator('#phone');
    this.totalPrice = this.root.locator('.modal-body h3').last();
    this.closeIcon = this.root.locator('button.btn-close');
    this.cancelButton = this.root.locator('.modal-footer').getByRole('button', { name: 'Cancel' });
    this.confirmButton = this.root
      .locator('.modal-footer')
      .getByRole('button', { name: 'Enroll Now' });
  }

  async waitUntilOpen() {
    await expect(this.root).toBeVisible();
    await expect(this.title).toHaveText('Enroll Now');
  }

  async isOpen() {
    return this.root.isVisible().catch(() => false);
  }

  /** @returns {Promise<number>} the total shown in the dialog, symbol stripped */
  async getTotal() {
    const text = await this.totalPrice.innerText();
    return Number(text.replace(/[^\d]/g, ''));
  }

  /**
   * @param {{address: string, phone: string}} details
   */
  async fillDetails({ address, phone }) {
    await this.addressInput.fill(address);
    await this.phoneInput.fill(phone);
    return this;
  }

  async confirm() {
    await this.confirmButton.click();
  }

  /** Fills the delivery details and submits in one go. */
  async completeEnrollment(details) {
    await this.fillDetails(details);
    await this.confirm();
  }

  async cancel() {
    await this.cancelButton.click();
    await expect(this.root).toBeHidden();
  }

  /**
   * Dismisses the dialog however it can.
   *
   * The app leaves the dialog mounted after a successful enrollment, and while
   * it is up its backdrop swallows clicks on the rest of the page - so any
   * test that carries on afterwards has to close it first.
   */
  async dismiss() {
    if (!(await this.isOpen())) return;

    await this.closeIcon.click({ timeout: 5_000 }).catch(async () => {
      await this.page.keyboard.press('Escape');
    });
    await expect(this.root).toBeHidden({ timeout: 15_000 });
  }
}
