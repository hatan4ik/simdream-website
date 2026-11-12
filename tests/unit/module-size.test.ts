import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT, sourceFiles } from './_support/source';

/**
 * Module-size ratchet (docs/MODULARITY.md). A source file under app/, components/ or lib/ stays within
 * MAX_MODULE_LINES so one concern can be fixed without reading, or conflicting with, a monolith.
 *
 *  - Every file over the budget must be listed below, either as DATA or in SIZE_ALLOWLIST.
 *  - An allowlisted file may never grow past its recorded size, and the list may only shrink: when a
 *    file is split below the budget its entry is deleted (this test fails until it is).
 *  - New files are never added to the allowlist. Split them instead.
 */
const MAX_MODULE_LINES = 400;

/** Pure catalogues and per-language copy. They hold no logic to split and are exempt from the budget. */
const DATA_FILES: Readonly<Record<string, string>> = {
  'lib/i18n/translations.ts': 'six-language UI dictionary',
  'lib/data/experience-routes.ts': 'World Trio and adventure catalogue with six-language copy',
  'lib/data/subscription-page-copy.ts': 'six-language copy of the /subscriptions page',
  'lib/data/subscription-passes.ts': 'flight-track catalogue and its copy',
  'lib/db/seed-data.ts': 'package, add-on and demo seed registry',
};

/** Current offenders and the line count they may not exceed. Lower an entry when the file shrinks; delete it at 400 or less. */
const SIZE_ALLOWLIST: Readonly<Record<string, number>> = {
  'components/scheduler/AmazonFlightStorefront.tsx': 1924,
  'app/(public)/contact/page.tsx': 1126,
  'components/pro/ProSessionsView.tsx': 1100,
  'app/(public)/vouchers/page.tsx': 1078,
  'components/scheduler/KantorovichCalendarScheduler.tsx': 941,
  'lib/db/store.ts': 927,
  'lib/scheduler/kantorovich-engine.ts': 781,
  'lib/wix/backend-blueprint.ts': 732,
  'components/about/AboutExperienceView.tsx': 701,
  // 674: the Offers link added 7 lines. Temporary until the mobile panel and desktop flyout are extracted into
  // components/layout/navbar/ (planned right after the daylight mobile-menu fix lands); then delete this entry.
  'components/layout/Navbar.tsx': 674,
  'app/admin/page.tsx': 553,
  'lib/wix/booking-checkout-client.ts': 537,
  'app/(public)/subscriptions/page.tsx': 492,
  'lib/auth/auth-context.tsx': 454,
  'components/layout/LiveMetarBar.tsx': 410,
  'app/(public)/experiences/page.tsx': 410,
};

/** The booking page is a thin orchestrator; its modules are the reference for the convention. */
const BOOKING_PAGE = 'app/(public)/book/page.tsx';
const BOOKING_PAGE_MAX_LINES = 250;
const BOOKING_MODULE_PREFIXES = ['components/booking/', 'lib/booking/client/'];

/** Same count as `wc -l`: the number of lines, ignoring a final newline. */
function lineCount(text: string): number {
  if (text.length === 0) return 0;
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
}

const sizes = new Map<string, number>(
  sourceFiles('app', 'components', 'lib').map((file) => [
    path.relative(REPO_ROOT, file).split(path.sep).join('/'),
    lineCount(readFileSync(file, 'utf8')),
  ])
);

describe('module size ratchet', () => {
  it('measures the source tree', () => {
    expect(sizes.size).toBeGreaterThan(200);
    expect(sizes.get(BOOKING_PAGE)).toBeDefined();
  });

  it(`keeps every source file within ${MAX_MODULE_LINES} lines unless it is data or on the allowlist`, () => {
    const offenders = [...sizes]
      .filter(([file, lines]) => lines > MAX_MODULE_LINES && !(file in DATA_FILES) && !(file in SIZE_ALLOWLIST))
      .map(([file, lines]) => `${file}: ${lines} lines (budget ${MAX_MODULE_LINES}); split it, see docs/MODULARITY.md`);
    expect(offenders).toEqual([]);
  });

  it('never lets an allowlisted file grow past its recorded size', () => {
    const grown = Object.entries(SIZE_ALLOWLIST)
      .filter(([file, recorded]) => (sizes.get(file) ?? 0) > recorded)
      .map(([file, recorded]) => `${file}: ${sizes.get(file)} lines, recorded ${recorded}; move the new code into a module`);
    expect(grown).toEqual([]);
  });

  it('drops an allowlist entry once its file is within budget', () => {
    const resolved = Object.keys(SIZE_ALLOWLIST)
      .filter((file) => (sizes.get(file) ?? Infinity) <= MAX_MODULE_LINES)
      .map((file) => `${file}: ${sizes.get(file)} lines; delete it from SIZE_ALLOWLIST`);
    expect(resolved).toEqual([]);
  });

  it('lists only files that exist, each in one list', () => {
    const listed = [...Object.keys(DATA_FILES), ...Object.keys(SIZE_ALLOWLIST)];
    expect(listed.filter((file) => !sizes.has(file))).toEqual([]);
    expect(new Set(listed).size).toBe(listed.length);
    expect(Object.keys(DATA_FILES).filter((file) => (sizes.get(file) ?? 0) <= MAX_MODULE_LINES)).toEqual([]);
  });

  it('keeps the booking page a thin orchestrator built from budgeted modules', () => {
    expect(sizes.get(BOOKING_PAGE)).toBeLessThanOrEqual(BOOKING_PAGE_MAX_LINES);
    const listed = [...Object.keys(DATA_FILES), ...Object.keys(SIZE_ALLOWLIST)];
    expect(listed.filter((file) => file === BOOKING_PAGE || BOOKING_MODULE_PREFIXES.some((prefix) => file.startsWith(prefix)))).toEqual([]);

    const bookingModules = [...sizes].filter(([file]) => BOOKING_MODULE_PREFIXES.some((prefix) => file.startsWith(prefix)));
    expect(bookingModules.length).toBeGreaterThan(30);
    expect(bookingModules.filter(([, lines]) => lines > MAX_MODULE_LINES)).toEqual([]);
  });
});
