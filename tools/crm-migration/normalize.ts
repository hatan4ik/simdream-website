/**
 * Identity normalisation used to decide whether two CRM rows describe the same person.
 * Pure functions, no I/O: the deduplication tests pin every rule in here.
 */

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/** Trimmed, lowercased address as Wix stores it. Null when the value is not a plausible address. */
export function emailExactKey(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim().toLowerCase();
  return EMAIL_SHAPE.test(value) ? value : null;
}

/**
 * Key that treats addresses delivered to the same mailbox as equal. Gmail ignores dots
 * and `+tag` suffixes in the local part and serves googlemail.com as gmail.com; no other
 * provider is assumed to, because a dot can distinguish two mailboxes elsewhere.
 */
export function emailMatchKey(raw: string | null | undefined): string | null {
  const exact = emailExactKey(raw);
  if (!exact) return null;
  const at = exact.lastIndexOf('@');
  const local = exact.slice(0, at);
  const domain = exact.slice(at + 1);
  if (!GMAIL_DOMAINS.has(domain)) return exact;
  return `${local.split('+')[0]!.replace(/\./g, '')}@gmail.com`;
}

const MIN_PHONE_DIGITS = 7;

/**
 * Comparable phone key. Israeli numbers (the business's market) collapse to their national
 * number without the trunk 0 or the 972 prefix, so `050-123-4567`, `+972 50 123 4567` and
 * `00972501234567` match. Any other country keeps its full international digits, which
 * cannot collide with an Israeli national number.
 */
export function phoneKey(raw: string | null | undefined): string | null {
  let digits = (raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('972')) {
    digits = digits.slice(3);
    if (digits.startsWith('0')) digits = digits.slice(1);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.length >= MIN_PHONE_DIGITS ? digits : null;
}

export interface PersonName {
  first?: string | null;
  last?: string | null;
}

/** Lowercase word tokens without punctuation, Latin diacritics or Hebrew niqqud. */
export function nameTokens(name: PersonName | null | undefined): string[] {
  const text = `${name?.first ?? ''} ${name?.last ?? ''}`;
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’`"״׳.,_-]/g, (mark) => (mark === '-' || mark === '_' || mark === '.' || mark === ',' ? ' ' : ''))
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * Whether two names could belong to one person: either side unknown, or one name's words
 * are a subset of the other's ("Dana" / "Dana Levi", "Levi Dana"). Two people who only
 * share a word ("Dan Cohen" / "Dan Levi", siblings on a family phone) are not compatible.
 */
export function namesCompatible(a: readonly string[], b: readonly string[]): boolean {
  if (a.length === 0 || b.length === 0) return true;
  const setA = new Set(a);
  const setB = new Set(b);
  const aInB = a.every((token) => setB.has(token));
  const bInA = b.every((token) => setA.has(token));
  return aInB || bInA;
}
