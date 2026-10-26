const PLACEHOLDER_ORIGIN = 'https://simdream.invalid';

/**
 * Returns a same-origin path to redirect to after sign-in, or `fallback`.
 *
 * Prefix checks are not enough: browsers normalize "\" to "/" and drop tabs and
 * newlines, so "/\evil.com" or "/\t/evil.com" become the protocol-relative
 * "//evil.com". The value is therefore resolved exactly as a browser would and
 * accepted only if it stays on our origin; the normalized path is returned.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/')) return fallback;
  try {
    const resolved = new URL(value, PLACEHOLDER_ORIGIN);
    if (resolved.origin !== PLACEHOLDER_ORIGIN) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
