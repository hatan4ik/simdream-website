import type { Locator, Page, Response } from '@playwright/test';
import { expect } from '../../support/e2e';
import { displayDatePattern, escapeRegExp, ribbonLabel } from './format';
import { waitUntilInteractive } from './hydration';

export const PAYMENTS_UNAVAILABLE = 'Online payments are temporarily unavailable. Please contact us to book.';

export interface PilotDetails {
  name: string;
  email: string;
  phone: string;
}

/** Shared /book controls: view switcher, localized calendar, page-level alerts. */
export class BookingPage {
  readonly wizard: WizardView;
  readonly storefront: StorefrontView;

  constructor(readonly page: Page) {
    this.wizard = new WizardView(page);
    this.storefront = new StorefrontView(page);
  }

  async goto(query = ''): Promise<void> {
    await this.page.goto(`/book${query}`);
    await waitUntilInteractive(this.page.getByRole('button', { name: 'Express Shop View (1-Page)' }));
    // The page fetches the default day's slots (twice with ?package=); let them settle so the
    // journey starts from a quiet network. Out-of-order responses are covered by E2E-14's own test.
    await this.page.waitForLoadState('networkidle');
  }

  async openWizard(): Promise<WizardView> {
    await this.page.getByRole('button', { name: 'Guided Wizard (3-Step)' }).click();
    await expect(this.wizard.progressStep('DATE & SLOT')).toBeVisible();
    return this.wizard;
  }

  /** A calendar day. Dates remain unique through the October DST boundary (E2E-6). */
  dateButton(isoDate: string): Locator {
    return this.page.getByRole('button', { name: ribbonLabel(isoDate), exact: true });
  }

  /**
   * Selects a ribbon day and waits for its slots, so a journey never acts on
   * the previous day's slot buttons while the new list is loading.
   */
  async selectDate(isoDate: string, how: 'click' | 'tap' = 'click'): Promise<void> {
    // Every rendering of the long-form date reflects the selected day; re-selecting it fetches nothing.
    if ((await this.page.getByText(displayDatePattern(isoDate)).count()) > 0) return;
    await this.revealDate(isoDate);
    const loaded = this.slotsResponse({ date: isoDate });
    await (how === 'tap' ? this.dateButton(isoDate).tap() : this.dateButton(isoDate).click());
    await loaded;
  }

  /**
   * Pages the month calendar to the month that shows `isoDate`. The grid opens on the current
   * month, so a date in another month (near a month end, or after selecting a day elsewhere)
   * is only reachable through the previous/next month controls.
   */
  async revealDate(isoDate: string): Promise<void> {
    const day = this.dateButton(isoDate);
    for (let step = 0; step < 24 && !(await day.isVisible()); step += 1) {
      const shown = await this.page
        .locator('[data-calendar-date]')
        .filter({ visible: true })
        .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-calendar-date') ?? '').sort());
      const forward = shown.length === 0 || isoDate > shown[shown.length - 1];
      await this.page
        .locator(forward ? '[data-calendar-next-month]' : '[data-calendar-previous-month]')
        .filter({ visible: true })
        .first()
        .click();
    }
    await expect(day).toBeVisible();
  }

  slotsResponse(query: { date?: string; duration?: number }): Promise<Response> {
    return this.page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/slots' &&
        (query.date === undefined || url.searchParams.get('date') === query.date) &&
        (query.duration === undefined || url.searchParams.get('duration') === String(query.duration))
      );
    });
  }

  /** Booking feedback is announced as an alert (Next's empty route announcer is also an alert). */
  alert(text: string | RegExp): Locator {
    return this.page.getByRole('alert').filter({ hasText: text });
  }
}

/** Guided 3-step wizard (2 steps for noise-free packages). */
export class WizardView {
  constructor(readonly page: Page) {}

  progressStep(label: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^\\d\\. ${escapeRegExp(label)}$`) });
  }

  progressSteps(): Locator {
    return this.page.getByRole('button', { name: /^\d\. [A-Z& -]+$/ });
  }

  durationPill(minutes: number): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${minutes} min\\b`) });
  }

  /** Picks a flight duration and waits for that duration's slots. */
  async chooseDuration(minutes: number): Promise<void> {
    const loaded = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/slots' &&
        new URL(response.url()).searchParams.get('duration') === String(minutes)
    );
    await this.durationPill(minutes).click();
    await loaded;
  }

  slot(startTime: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^(Best Match )?${startTime} `) });
  }

  departureHeading(isoDate: string): Locator {
    return this.page.getByRole('heading', { level: 2, name: /Select Departure Time/ }).filter({
      hasText: displayDatePattern(isoDate),
    });
  }

  /** The sticky confirmation bar that carries the step's Continue button. */
  actionBar(): Locator {
    return this.page
      .locator('div.sticky')
      .filter({ has: this.page.getByRole('button', { name: /^Continue to / }) });
  }

  continueToAddons(): Locator {
    return this.page.getByRole('button', { name: 'Continue to Add-ons' });
  }

  continueToPilot(): Locator {
    return this.page.getByRole('button', { name: 'Continue to Pilot Details' });
  }

  /** Add-on cards are clickable panels; clicking the add-on name toggles it. */
  addonCard(name: string): Locator {
    return this.page.getByText(name, { exact: true });
  }

  // Step 3 fields are found by their visible labels, now programmatically associated (E2E-10 fixed).
  pilotName(): Locator {
    return this.page.getByRole('textbox', { name: 'Pilot Full Name *' });
  }

  pilotEmail(): Locator {
    return this.page.getByRole('textbox', { name: 'Pilot Email (Confirmation) *' });
  }

  pilotPhone(): Locator {
    return this.page.getByRole('textbox', { name: 'Phone Number *' });
  }

  experienceLevel(): Locator {
    return this.page.getByRole('combobox');
  }

  submit(): Locator {
    return this.page.getByRole('button', { name: /^Proceed to Secure Checkout/ });
  }

  async fillPilot(details: PilotDetails): Promise<void> {
    await this.pilotName().fill(details.name);
    await this.pilotEmail().fill(details.email);
    await this.pilotPhone().fill(details.phone);
  }
}

/** Default one-page "Express Shop" storefront with its sticky buy box. */
export class StorefrontView {
  constructor(readonly page: Page) {}

  packageCard(minutes: number): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${minutes} MIN\\b`) });
  }

  slot(startTime: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${startTime} (Up to|Booked)`) });
  }

  departureSlotsLabel(isoDate: string): Locator {
    return this.page.getByText(new RegExp(`Departure Slots for ${displayDatePattern(isoDate).source}:`));
  }

  addToFlight(addonName: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { level: 3, name: addonName, exact: true }) })
      .filter({ has: this.page.getByRole('button', { name: /Add(ed)? to Flight/ }) })
      .last()
      .getByRole('button', { name: /Add(ed)? to Flight/ });
  }

  removeAddon(addonName: string): Locator {
    return this.page.getByRole('button', { name: `Remove ${addonName}` });
  }

  pilotName(): Locator {
    return this.page.getByLabel(/Pilot Full Name/);
  }

  pilotEmail(): Locator {
    return this.page.getByLabel(/Pilot Email/);
  }

  pilotPhone(): Locator {
    return this.page.getByLabel(/Phone Number/);
  }

  experience(label: 'First-Timer' | 'Sim Enthusiast' | 'Student Pilot' | 'Licensed Pilot'): Locator {
    return this.page.getByRole('radio', { name: label });
  }

  submit(): Locator {
    return this.page.getByRole('button', { name: /^Proceed to Secure Checkout/ });
  }

  async fillPilot(details: PilotDetails): Promise<void> {
    await this.pilotName().fill(details.name);
    await this.pilotEmail().fill(details.email);
    await this.pilotPhone().fill(details.phone);
  }
}
