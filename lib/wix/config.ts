/**
 * Wix Headless connection settings (docs/WIX_HEADLESS_ARCHITECTURE.md §7).
 *
 * Both values are public identifiers, not secrets: the OAuth client id mints
 * anonymous *visitor* tokens only, and the metasite id names the Wix project.
 * Admin-grade credentials (client secret, API keys) never enter this module.
 */

import wixManagedProject from '../../wix.config.json';

export const WIX_TIME_ZONE = 'Asia/Jerusalem';

function managedProjectValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * A Wix-managed production build has a public app/site pair in wix.config.json.
 * Development and tests stay opt-in through environment variables, preventing a
 * local command from silently calling the live Wix project.
 */
function productionManifestValue(value: unknown): string | null {
  if (process.env.ALLOW_IN_MEMORY_STORE === 'true' || process.env.NEXT_DIST_DIR === '.next-test') {
    return null;
  }
  return process.env.NODE_ENV === 'production' ? managedProjectValue(value) : null;
}

export function getWixClientId(): string | null {
  return process.env.NEXT_PUBLIC_WIX_CLIENT_ID?.trim() || productionManifestValue(wixManagedProject.appId);
}

export function getWixSiteId(): string | null {
  return process.env.WIX_SITE_ID?.trim() || productionManifestValue(wixManagedProject.siteId);
}

/** True when the frontend can reach the Wix Headless backend as a visitor. */
export function isWixConfigured(): boolean {
  return Boolean(getWixClientId());
}

/**
 * Shadow reads are off by default. Enabling them sends only anonymous visitor
 * reads to Wix and never selects Wix as the checkout writer.
 */
export function isWixShadowReadsEnabled(): boolean {
  return process.env.WIX_SHADOW_READS_ENABLED?.trim().toLowerCase() === 'true' && isWixConfigured();
}

/**
 * Enables Wix Bookings availability as a safe second source of truth. When the
 * local store is reachable, callers intersect both calendars; when a managed
 * Wix deployment has no local persistence connection, callers can still show
 * Wix's live bookable slots. Checkout remains independently fail-closed.
 */
export function isWixAvailabilityAdapterEnabled(): boolean {
  return process.env.WIX_AVAILABILITY_ADAPTER_ENABLED?.trim().toLowerCase() === 'true' && isWixConfigured();
}
