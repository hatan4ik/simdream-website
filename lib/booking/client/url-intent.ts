/**
 * Query-string parsing for `/book`. Everything here is customer intent only: the checkout API
 * still validates catalog IDs, prices and eligibility on the server.
 */

/** Anything with a `get` like `URLSearchParams` (Next's `useSearchParams()` result qualifies). */
export interface SearchParamsReader {
  get(name: string): string | null;
}

/** The package a visitor gets when the URL names none (the 60-minute Captain's Command). */
export const DEFAULT_PACKAGE_SLUG = 'captains-command-60';

// Documented deep links (AGENTS.md, official service pages) use these names for the PRO tiers.
export const PACKAGE_SLUG_ALIASES: Record<string, string> = {
  'airline-interview-prep-60-pro': 'airline-prep-60-pro',
  'airline-interview-prep-90-pro': 'airline-prep-90-pro',
  'airline-interview-prep-120-pro': 'airline-assessment-prep',
};

export function resolvePackageSlug(slug: string): string {
  return PACKAGE_SLUG_ALIASES[slug] ?? slug;
}

/** `?addons=a,b,a` becomes `['a', 'b']`: trimmed, de-duplicated, empty entries dropped. */
export function parseRequestedAddonIds(value: string | null): string[] {
  return [...new Set((value ?? '').split(',').map((id) => id.trim()).filter(Boolean))];
}

/** URL add-ons plus the add-on of a deep-linked World Trio route, each listed once. */
export function mergeRequestedAddonIds(addonsParam: string | null, routeAddonId: string | undefined): string[] {
  return [...new Set([...parseRequestedAddonIds(addonsParam), ...(routeAddonId ? [routeAddonId] : [])])];
}

/** The package slug to preselect: the (aliased) `?package=` value, else the default. */
export function requestedPackageSlug(params: SearchParamsReader): string {
  return resolvePackageSlug(params.get('package') || DEFAULT_PACKAGE_SLUG);
}

/** Whether the URL asks for a Wix subscription redemption (`?subscription=wix`). */
export function isWixSubscriptionRequested(params: SearchParamsReader): boolean {
  return params.get('subscription') === 'wix';
}
