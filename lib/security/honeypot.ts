/**
 * The decoy property of a public form. The form renders an input a person never sees or reaches
 * (components/ui/HoneypotField.tsx) and posts its value as `website`; only a script that fills
 * every field it finds sends anything but an empty string. Pure and client-safe.
 */
export const HONEYPOT_FIELD = 'website';

/** True when the decoy holds a value. A person leaves it missing, null or an empty string; every other value means a script. */
export function isHoneypotFilled(body: unknown, field: string = HONEYPOT_FIELD): boolean {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false;
  const value = (body as Record<string, unknown>)[field];
  return value !== undefined && value !== null && value !== '';
}
