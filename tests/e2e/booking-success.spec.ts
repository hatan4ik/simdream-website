import { displayDatePattern } from './pages/format';
import { expect, test } from './fixtures';

const CONFIRMED_TITLE = 'Your Flight Is Confirmed!';
const CONFIRMED_BADGE = 'FLIGHT CLEARANCE GRANTED';
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A well-formed reference (SD-737- plus 16 characters) that no booking uses. */
function unknownReference(): string {
  let token = '';
  for (let index = 0; index < 16; index++) {
    token += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return `SD-737-${token}`;
}

const NOT_CONFIRMABLE = [
  { case: 'a malformed reference', query: '?ref=NOT-A-REAL-REF', message: 'Booking not found' },
  { case: 'an unknown well-formed reference', query: `?ref=${unknownReference()}`, message: 'Booking not found' },
  { case: 'a missing reference', query: '', message: 'A booking reference is required to view this boarding pass.' },
] as const;

test.describe('booking success page', () => {
  for (const scenario of NOT_CONFIRMABLE) {
    test(`does not claim a confirmed payment for ${scenario.case}`, async ({ page, booking }) => {
      await page.goto(`/book/success${scenario.query}`);

      await expect(booking.alert(scenario.message)).toBeVisible();
      await expect(page.getByRole('heading', { name: CONFIRMED_TITLE })).toHaveCount(0);
      await expect(page.getByText(CONFIRMED_BADGE)).toHaveCount(0);
      await expect(page.getByText(/^Paid:/)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Download Boarding Pass (PDF)' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Book another mission' })).toBeVisible();
    });
  }

  test('does not tell the visitor a payment is being confirmed for an unknown reference (E2E-8)', async ({
    page,
    booking,
  }) => {
    await page.goto(`/book/success?ref=${unknownReference()}`);
    await expect(booking.alert('Booking not found')).toBeVisible();

    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(/confirming your payment/i);
    await expect(page.getByText('PAYMENT PROCESSING')).toHaveCount(0);
  });

  test('renders the confirmed boarding pass for a paid booking reference (E2E-7)', async ({
    page,
    schedule,
  }) => {
    const paid = (await schedule.adminBookings()).filter(
      (candidate) => candidate.paymentStatus === 'paid' && candidate.status === 'confirmed'
    );
    expect(paid.length, 'the shared store holds paid, confirmed bookings').toBeGreaterThan(0);
    // New bookings are prepended, so the last entry is a stable seeded booking.
    const booking = paid[paid.length - 1];

    await page.goto(`/book/success?ref=${encodeURIComponent(booking.bookingReference)}`);

    await expect(page.getByRole('heading', { level: 1, name: CONFIRMED_TITLE })).toBeVisible();
    await expect(page.getByText(CONFIRMED_BADGE)).toBeVisible();
    await expect(page.getByText(booking.bookingReference, { exact: true })).toBeVisible();
    // The boarding pass names the package in its header and its manifest.
    await expect(page.getByText(booking.packageTitle, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(booking.pilotName, { exact: true })).toBeVisible();
    await expect(page.getByText(displayDatePattern(booking.bookingDate))).toBeVisible();
    await expect(page.getByText(`${booking.startTime}–${booking.endTime} IST`)).toBeVisible();
  });
});
