import type { Locator, Page } from '@playwright/test';
import { expect } from '../../support/e2e';
import { waitUntilInteractive } from './hydration';

/**
 * The gift-voucher and workshop forms render visual labels that are not tied
 * to their inputs, so fields are found by placeholder (their accessible name).
 */

export interface VoucherOrder {
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
}

export class GiftVoucherPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/vouchers');
    await expect(this.page.getByRole('heading', { level: 1, name: 'Give the Ultimate Flight Experience' })).toBeVisible();
    await waitUntilInteractive(this.submit());
  }

  tier(label: RegExp): Locator {
    return this.page.getByRole('button', { name: label });
  }

  customAmount(): Locator {
    return this.page.getByPlaceholder('Min ₪100');
  }

  recipientName(): Locator {
    return this.page.getByPlaceholder('e.g. Aviad Stern');
  }

  recipientEmail(): Locator {
    return this.page.getByPlaceholder('aviad@example.com');
  }

  senderName(): Locator {
    return this.page.getByPlaceholder('e.g. Danielle Cohen');
  }

  senderEmail(): Locator {
    return this.page.getByPlaceholder('danielle@example.com');
  }

  submit(): Locator {
    return this.page.getByRole('button', { name: /^Proceed to Secure Checkout/ });
  }

  async fill(order: VoucherOrder): Promise<void> {
    await this.recipientName().fill(order.recipientName);
    await this.recipientEmail().fill(order.recipientEmail);
    await this.senderName().fill(order.senderName);
    await this.senderEmail().fill(order.senderEmail);
  }
}

export interface WorkshopLead {
  company: string;
  contact: string;
  email: string;
  phone: string;
}

export class WorkshopsPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/workshops');
    await expect(this.page.getByRole('heading', { level: 2, name: 'Book a Corporate Workshop Inquiry' })).toBeVisible();
    await waitUntilInteractive(this.submit());
  }

  company(): Locator {
    return this.page.getByPlaceholder('e.g. Acme Cyber Technologies');
  }

  contact(): Locator {
    return this.page.getByPlaceholder('e.g. Sarah Levi, VP HR');
  }

  email(): Locator {
    return this.page.getByPlaceholder('sharon@company.com');
  }

  phone(): Locator {
    return this.page.getByPlaceholder('+972-54-000-0000');
  }

  submit(): Locator {
    return this.page.getByRole('button', { name: /Submit Workshop Inquiry|Submitting Inquiry/ });
  }

  async fill(lead: WorkshopLead): Promise<void> {
    await this.company().fill(lead.company);
    await this.contact().fill(lead.contact);
    await this.email().fill(lead.email);
    await this.phone().fill(lead.phone);
  }
}

/** Native constraint-validation state of a form control. */
export async function validityOf(control: Locator): Promise<{ valueMissing: boolean; typeMismatch: boolean; valid: boolean }> {
  return control.evaluate((element) => {
    const { validity } = element as HTMLInputElement;
    return { valueMissing: validity.valueMissing, typeMismatch: validity.typeMismatch, valid: validity.valid };
  });
}
