/**
 * Wix Headless connection settings (docs/WIX_HEADLESS_ARCHITECTURE.md §7).
 *
 * Both values are public identifiers, not secrets: the OAuth client id mints
 * anonymous *visitor* tokens only, and the metasite id names the Wix project.
 * Admin-grade credentials (client secret, API keys) never enter this module.
 */

export const WIX_TIME_ZONE = 'Asia/Jerusalem';

export function getWixClientId(): string | null {
  return process.env.NEXT_PUBLIC_WIX_CLIENT_ID?.trim() || null;
}

export function getWixSiteId(): string | null {
  return process.env.WIX_SITE_ID?.trim() || null;
}

/** True when the frontend can reach the Wix Headless backend as a visitor. */
export function isWixConfigured(): boolean {
  return Boolean(getWixClientId());
}
