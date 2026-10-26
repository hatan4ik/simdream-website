import { addDays, displayDatePattern, israelDate, nextWeekdayAfter, ribbonLabel, zonedDate } from './pages/format';
import { expect, test } from './fixtures';

const SATURDAY = 6;
const PROMO_45 = '?package=daytime-promo-45';
/** Saturday is prime time only, so the 45m daytime promo never has a slot then. */
const nextSaturday = () => nextWeekdayAfter(israelDate(), SATURDAY);
const RECREATIONAL_TITLES: Record<number, string> = {
  60: "Captain's Command Flight",
  90: "Captains' Challenge & Multi-Trio Odyssey",
};

const tryButton = (minutes: number) => new RegExp(`^Try ${minutes}m \\(`);

test.describe('zero-slot recovery (AGENTS.md section 4), storefront', () => {
  test('keeps the 45m promo selected on a Saturday and explains that no runway slots are open', async ({
    page,
    booking,
  }) => {
    const saturday = nextSaturday();
    const store = booking.storefront;
    await booking.goto(PROMO_45);
    await booking.selectDate(saturday);

    await expect(store.departureSlotsLabel(saturday)).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: new RegExp(`^No open runway slots for Daytime Special Flight on ${displayDatePattern(saturday).source}$`),
      })
    ).toBeVisible();
    await expect(store.packageCard(45)).toContainText('0 slots today');
    await expect(store.packageCard(45)).toContainText('✓ Selected');
  });

  test('offers the longer durations that still have open slots that Saturday', async ({ page, booking, schedule }) => {
    const saturday = nextSaturday();
    const { durationAvailability } = await schedule.day(saturday, 45);
    // 60m and 90m exist in every package scope, so this check does not depend on the scope ?package= picks.
    const longer = [60, 90];
    const open = longer.filter((minutes) => durationAvailability[minutes].availableCount > 0);
    const soldOut = longer.filter((minutes) => durationAvailability[minutes].availableCount === 0);
    expect(open.length, `Saturday ${saturday} needs at least one bookable longer flight`).toBeGreaterThan(0);

    await booking.goto(PROMO_45);
    await booking.selectDate(saturday);
    await expect(booking.storefront.departureSlotsLabel(saturday)).toBeVisible();

    for (const minutes of open) {
      await expect(page.getByRole('button', { name: tryButton(minutes) })).toBeVisible();
    }
    for (const minutes of soldOut) {
      await expect(page.getByRole('button', { name: tryButton(minutes) })).toHaveCount(0);
    }
  });

  test('switches to the recreational flight of the offered duration (E2E-13)', async ({
    page,
    booking,
    schedule,
  }) => {
    const saturday = nextSaturday();
    const { durationAvailability } = await schedule.day(saturday, 45);
    const [minutes] = [60, 90].filter((candidate) => durationAvailability[candidate].availableCount > 0);
    expect(minutes, `Saturday ${saturday} needs at least one bookable longer flight`).toBeDefined();
    await booking.goto(PROMO_45);
    await booking.selectDate(saturday);

    await page.getByRole('button', { name: tryButton(minutes) }).click();

    await expect(page.getByRole('heading', { level: 1, name: RECREATIONAL_TITLES[minutes] })).toBeVisible();
    await expect(booking.storefront.departureSlotsLabel(saturday)).toBeVisible();
  });

  test('advances to the next day with "Check Next Day" and keeps the package', async ({ page, booking }) => {
    const saturday = nextSaturday();
    await booking.goto(PROMO_45);
    await booking.selectDate(saturday);

    await page.getByRole('button', { name: 'Check Next Day →' }).click();

    await expect(booking.storefront.departureSlotsLabel(addDays(saturday, 1))).toBeVisible();
    await expect(booking.storefront.packageCard(45)).toContainText('✓ Selected');
  });

  test.describe('for a visitor browsing from New York', () => {
    test.use({ timezoneId: 'America/New_York' });

    test('still advances to the next day with "Check Next Day" (E2E-5)', async ({ page, booking }) => {
      // The ribbon follows the browser's own calendar.
      const saturday = nextWeekdayAfter(zonedDate('America/New_York'), SATURDAY);
      await booking.goto(PROMO_45);
      await booking.selectDate(saturday);
      await expect(booking.storefront.departureSlotsLabel(saturday)).toBeVisible();

      await page.getByRole('button', { name: 'Check Next Day →' }).click();

      await expect(booking.storefront.departureSlotsLabel(addDays(saturday, 1))).toBeVisible();
    });
  });
});

test.describe('zero-slot recovery (AGENTS.md section 4), guided wizard', () => {
  test('shows a 0-slot status, keeps the promo package and advances with "Check Next Day"', async ({
    page,
    booking,
  }) => {
    const saturday = nextSaturday();
    await booking.goto(PROMO_45);
    const wizard = await booking.openWizard();
    await booking.selectDate(saturday);

    await expect(wizard.departureHeading(saturday)).toBeVisible();
    await expect(page.getByText('0 slots available', { exact: true })).toBeVisible();
    await expect(page.getByText('No open times for this duration on the selected date.')).toBeVisible();
    // The selected package's description stays on screen; the selection is not overwritten.
    await expect(page.getByText('🌤️ Daytime Flight • 2 Landings (until 18:00)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch to 60 Min Flight' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch to 20 Min Flight' })).toBeVisible();

    await page.getByRole('button', { name: 'Check Next Day →' }).click();
    await expect(wizard.departureHeading(addDays(saturday, 1))).toBeVisible();
  });

  test('switches to the recreational 60-minute flight from the recovery panel (E2E-13)', async ({
    page,
    booking,
  }) => {
    const saturday = nextSaturday();
    await booking.goto(PROMO_45);
    const wizard = await booking.openWizard();
    await booking.selectDate(saturday);

    await page.getByRole('button', { name: 'Switch to 60 Min Flight' }).click();

    await expect(page.getByText('⭐ Takeoff/Landing + 1 World Trio (3 Airports Included)')).toBeVisible();
    await expect(wizard.departureHeading(saturday)).toBeVisible();
  });

  test('keeps the sold-out 45m duration visible with a 0-slot badge (E2E-4)', async ({ booking }) => {
    const saturday = nextSaturday();
    await booking.goto(PROMO_45);
    const wizard = await booking.openWizard();
    await booking.selectDate(saturday);
    await expect(wizard.departureHeading(saturday)).toBeVisible();

    await expect(wizard.durationPill(45)).toBeVisible();
    await expect(wizard.durationPill(45)).toContainText('0 slots today');
  });
});

test.describe('14-day date ribbon', () => {
  // Israel leaves daylight saving time on Sunday 25 October 2026, inside this window. A
  // 2026 weekday at noon keeps the prerendered footer (year, "OPEN NOW") identical to the
  // client render, so a footer hydration regression (E2E-12) cannot fail this test for an unrelated reason.
  const TUESDAY_BEFORE_DST_END = new Date('2026-10-20T12:00:00+03:00');

  test('lists 14 consecutive days when the window crosses the autumn clock change (E2E-6)', async ({
    page,
    booking,
  }) => {
    await page.clock.setFixedTime(TUESDAY_BEFORE_DST_END);
    await booking.goto();

    const expected = Array.from({ length: 14 }, (_, offset) => ribbonLabel(addDays('2026-10-20', offset)));
    const ribbon = page.getByRole('button', { name: /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d{1,2} [A-Z][a-z]{2}$/ });
    await expect(ribbon).toHaveText(expected.map((label) => new RegExp(`^${label.replace(/ /g, '\\s*')}$`)));
  });
});
