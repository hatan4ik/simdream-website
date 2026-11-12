import { CONSENT_CATEGORIES, type ConsentCategory } from './types';

/**
 * Single localStorage key. The consent record is deliberately NOT a cookie: the site sets no
 * cookie of its own (app/layout.tsx), the server never needs to read the choice (nothing is
 * rendered conditionally on it), and a cookie would be the first identifier this site writes.
 * Storing the choice itself is the exempt "user preference" storage (docs/modules/cookie-consent.md).
 */
export const CONSENT_STORAGE_KEY = 'simdream_consent';

/**
 * Bump when the categories in use change or the wording of what is stored changes materially:
 * every earlier decision then counts as undecided and the banner asks again.
 */
export const CONSENT_VERSION = 1;

/** A decision older than this many months is asked again (12 months is the common practice). */
export const CONSENT_RENEWAL_MONTHS = 12;

/**
 * Reads a comma-separated list of optional categories ("analytics,marketing") into the full list of
 * categories in use. `necessary` is always in; unknown names are ignored.
 */
export function parseCategoriesInUse(raw: string | undefined): readonly ConsentCategory[] {
  const requested = (raw ?? '').split(',').map((name) => name.trim());
  return CONSENT_CATEGORIES.filter((category) => category === 'necessary' || requested.includes(category));
}

/**
 * The categories the site ACTUALLY uses today. Today nothing optional is in use: no analytics,
 * no advertising, no tracker (docs/modules/cookie-consent.md, Findings). While this holds only
 * `necessary`, the banner is an informational notice with a single "Got it" and shows no toggles,
 * because a toggle that gates nothing would be a lie.
 *
 * The day a tracker is added, set `NEXT_PUBLIC_CONSENT_CATEGORIES_IN_USE=analytics` (or
 * `analytics,marketing`) in the same change that wires the tracker through `whenConsented()` /
 * `loadScriptWhenConsented()`, and bump `CONSENT_VERSION`: the banner becomes a real choice
 * (Accept all / Reject non-essential / Customize) and everyone is asked again. The variable is also
 * how a preview build shows the choice banner; it is inlined at build time.
 */
export const CONSENT_CATEGORIES_IN_USE: readonly ConsentCategory[] = parseCategoriesInUse(
  process.env.NEXT_PUBLIC_CONSENT_CATEGORIES_IN_USE
);

/** Dispatched on `window` to ask the mounted manager to open the settings dialog. */
export const CONSENT_OPEN_EVENT = 'simdream:consent-open';

/**
 * Feature flag for the Wix consent-policy adapter (lib/consent/wix-sync.ts). Off: this app does not
 * load Wix's site script, so there is no `window.consentPolicyManager` to inform. Inlined at build.
 */
export const CONSENT_WIX_SYNC_ENABLED = process.env.NEXT_PUBLIC_CONSENT_WIX_SYNC === 'true';
