/**
 * The decoy property of a public form. The form renders an input a person never sees or reaches
 * (components/ui/HoneypotField.tsx) under this name and posts its value; only a script that fills
 * every field it finds sends anything but an empty string.
 *
 * The name is also the input's name attribute, so it must not hold a word that browser address
 * autofill or a password manager classifies fields by (company, name, email, phone, tel, address,
 * url, site, org, user, pass): either would fill the trap for a real customer and the server would
 * drop their lead. tests/unit/honeypot.test.ts pins that. Pure and client-safe.
 */
export const HONEYPOT_FIELD = 'follow_up_note';

/** True when the decoy holds a value. A person leaves it missing, null or an empty string; every other value means a script. */
export function isHoneypotFilled(body: unknown, field: string = HONEYPOT_FIELD): boolean {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false;
  const value = (body as Record<string, unknown>)[field];
  return value !== undefined && value !== null && value !== '';
}
