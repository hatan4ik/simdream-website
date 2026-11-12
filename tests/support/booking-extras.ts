import type { Page } from '@playwright/test';

/**
 * The mandatory extras of the booking checkout (consent boxes and the pilot's birth date) for browser
 * journeys that only need a complete form. Hooks are `data-*` attributes, so the helpers work in every
 * page language and in both views (guided steps and Express Shop).
 */

const BIRTH_DATE_CONTROL = '[data-birthday-field] input[type="date"]';
const CONSENT_CHECKBOXES = '[data-consent-agreement] input[type="checkbox"]';

/** Israel's current month, 1 to 12. */
function israelMonth(now: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', month: 'numeric' }).format(now));
}

/**
 * A birth date that earns no birthday discount on the flights journeys book: its month is six months
 * away from the current month, so it is neither in the flight's month nor within 14 days before it.
 */
export function noDiscountBirthDate(now = new Date()): string {
  const month = ((israelMonth(now) + 5) % 12) + 1;
  return `1990-${String(month).padStart(2, '0')}-15`;
}

/** A birth date in the same month as `flightDate` (YYYY-MM-DD): earns the 15 percent on an eligible package. */
export function sameMonthBirthDate(flightDate: string): string {
  return `1990-${flightDate.slice(5, 7)}-05`;
}

export interface CompleteExtrasOptions {
  birthDate?: string;
  /** Tick both confirmations (default true). */
  consent?: boolean;
}

/** Fills the birth date and ticks both confirmations of the visible checkout. */
export async function completeBookingExtras(page: Page, options: CompleteExtrasOptions = {}): Promise<void> {
  await page.locator(BIRTH_DATE_CONTROL).filter({ visible: true }).fill(options.birthDate ?? noDiscountBirthDate());
  if (options.consent === false) return;
  const boxes = page.locator(CONSENT_CHECKBOXES).filter({ visible: true });
  const count = await boxes.count();
  for (let index = 0; index < count; index += 1) await boxes.nth(index).check();
}
