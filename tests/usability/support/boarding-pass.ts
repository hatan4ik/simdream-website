import type { Page } from '@playwright/test';
import { expect } from '../../support/e2e';

/**
 * A confirmed, paid booking as GET /api/bookings?ref= projects it. Only a signed Stripe
 * webhook can produce one on the server, and the browser-test server has payments
 * disabled, so client-side boarding-pass behaviour is exercised against this fixture.
 */
export const PAID_BOOKING = {
  bookingReference: 'SD-737-QAUXBOARDING2345',
  packageId: 'pkg-captain-60',
  packageTitle: "Captain's Command Flight (60m)",
  durationMinutes: 60,
  bookingDate: '2026-11-03',
  startTime: '11:15',
  endTime: '12:15',
  pilotName: 'Dana Fixture',
  addons: [],
  totalIls: 690,
  status: 'confirmed',
  paymentStatus: 'paid',
} as const;

/** Opens /book/success for the paid fixture booking and waits until the boarding pass renders. */
export async function showPaidBoardingPass(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname === '/api/bookings' && url.searchParams.get('ref') === PAID_BOOKING.bookingReference,
    (route) => route.fulfill({ json: PAID_BOOKING })
  );
  await page.goto(`/book/success?ref=${PAID_BOOKING.bookingReference}`);
  await expect(page.getByText(PAID_BOOKING.bookingReference)).toBeVisible();
}
