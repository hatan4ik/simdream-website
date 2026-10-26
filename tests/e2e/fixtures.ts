import type { Page, Request } from '@playwright/test';
import { blockThirdPartyRequests, expect, test as base } from '../support/e2e';
import { BookingPage } from './pages/booking-page';
import { GiftVoucherPage, WorkshopsPage } from './pages/forms';
import { quarantineKnownMobileLayoutDefects } from './pages/layout-quarantine';
import { ScheduleApi } from './pages/schedule-api';
import { SiteChrome } from './pages/site-chrome';

interface JourneyOptions {
  /** Set to false to exercise the real phone layout (see pages/layout-quarantine.ts). */
  quarantineMobileLayoutDefects: boolean;
}

interface JourneyFixtures {
  sharedRunnerBudget: void;
  isolateThirdParties: void;
  mobileLayoutQuarantine: void;
  chrome: SiteChrome;
  booking: BookingPage;
  vouchers: GiftVoucherPage;
  workshops: WorkshopsPage;
  schedule: ScheduleApi;
}

/**
 * Customer-journey test: the harness page-error guard plus page objects, with
 * third-party hosts (maps embed, review links) blocked for deterministic runs.
 */
export const test = base.extend<JourneyFixtures & JourneyOptions>({
  quarantineMobileLayoutDefects: [true, { option: true }],
  // Journeys load a production page per step on five engines while other suites share the
  // machine; the 45s config budget was exceeded at load averages near 1000. Tripling it only
  // changes how long a genuine hang takes to report (see harnessRequests).
  sharedRunnerBudget: [
    async ({}, use, testInfo) => {
      testInfo.slow();
      await use();
    },
    { auto: true },
  ],
  isolateThirdParties: [
    async ({ page, baseURL }, use) => {
      if (!baseURL) throw new Error('playwright.config.ts must define use.baseURL');
      await blockThirdPartyRequests(page, baseURL);
      await use();
    },
    { auto: true },
  ],
  mobileLayoutQuarantine: [
    async ({ page, isMobile, quarantineMobileLayoutDefects }, use) => {
      if (isMobile && quarantineMobileLayoutDefects) await quarantineKnownMobileLayoutDefects(page);
      await use();
    },
    { auto: true },
  ],
  chrome: async ({ page }, use) => use(new SiteChrome(page)),
  booking: async ({ page }, use) => use(new BookingPage(page)),
  vouchers: async ({ page }, use) => use(new GiftVoucherPage(page)),
  workshops: async ({ page }, use) => use(new WorkshopsPage(page)),
  schedule: async ({ request }, use) => use(new ScheduleApi(request)),
});

export { expect };

/** Collects every request the page sends to `pathname`, to prove a form did or did not submit. */
export function recordRequests(page: Page, pathname: string): Request[] {
  const seen: Request[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === pathname) seen.push(request);
  });
  return seen;
}

/** Unique, recognisable test data so shared-server mutations never collide. */
export function uniqueTag(projectName: string): string {
  return `${projectName}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
