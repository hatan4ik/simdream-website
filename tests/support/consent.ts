import { CONSENT_STORAGE_KEY } from '../../lib/consent/config';
import { createConsentRecord, serializeConsentRecord } from '../../lib/consent/record';

/**
 * Cookie-consent pre-seed for every browser test.
 *
 * The consent banner appears on a first visit, so without this every Playwright page (and every
 * visual baseline) would start with a banner on screen. The Playwright config applies this storage
 * state to all projects: each browser context starts with a current "necessary only" decision in
 * localStorage, exactly what a visitor who already answered the banner has. It is built from the
 * real record functions, so a CONSENT_VERSION bump or the 12-month renewal can never silently
 * bring the banner back (the decision is stamped when the config is loaded).
 *
 * Only localStorage is seeded; no cookie is added (tests/security-web asserts the app sets none).
 * tests/usability/cookie-consent.spec.ts opts out with `test.use({ storageState: NO_SEEDED_CONSENT })`
 * to exercise the first-visit experience.
 */
export function seededConsentStorageState(baseURL: string) {
  const record = createConsentRecord({}, new Date());
  return {
    cookies: [],
    origins: [
      {
        origin: new URL(baseURL).origin,
        localStorage: [{ name: CONSENT_STORAGE_KEY, value: serializeConsentRecord(record) }],
      },
    ],
  };
}

/** A blank browser profile: no cookies, no storage. */
export const NO_SEEDED_CONSENT = { cookies: [], origins: [] };
