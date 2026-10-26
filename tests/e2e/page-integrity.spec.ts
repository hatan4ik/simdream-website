import { expect, test } from './fixtures';

/** Israel-time instants on either side of opening hours, with the footer headline each must show. */
const MOMENTS = [
  { instant: new Date('2026-11-01T12:00:00+02:00'), headline: 'OPEN NOW • Today 10:00 – 23:00' },
  { instant: new Date('2026-11-07T10:00:00+02:00'), headline: 'CURRENTLY CLOSED • Opens Today at 19:00' },
] as const;

test.describe('page integrity', () => {
  test('renders the shared footer without a hydration error whether the centre is open or closed (E2E-12)', async ({
    context,
  }) => {
    const errors: string[] = [];

    // The two headlines differ, so at least one differs from the build-time text. Whichever
    // differs is only on screen after React has rendered on the client, i.e. after hydration.
    // Each moment gets a fresh tab: moving the clock under an open page makes WebKit report
    // its cancelled prefetches as page errors, which would mask the defect under test.
    for (const moment of MOMENTS) {
      await context.clock.setFixedTime(moment.instant);
      const tab = await context.newPage();
      tab.on('pageerror', (error) => errors.push(error.message));
      await tab.goto('/experiences');
      await expect(tab.getByRole('contentinfo').getByText(moment.headline)).toBeVisible();
      await tab.close();
    }

    expect(errors).toEqual([]);
  });
});
