/**
 * Reference a customer quotes when asking about a refund request: `RF-` and six characters from
 * an alphabet without 0/O and 1/I, so it can be read out over the phone. 32^6 is about a billion
 * values; the store enforces uniqueness and the service retries on the rare clash.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 6;

export const REFUND_REFERENCE_PATTERN = /^RF-[A-HJ-NP-Z2-9]{6}$/;

export function generateRefundReference(): string {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random number generation is unavailable.');
  const values = new Uint32Array(LENGTH);
  globalThis.crypto.getRandomValues(values);
  // 2^32 is a multiple of the 32-character alphabet, so the modulo adds no bias.
  return `RF-${Array.from(values, (value) => ALPHABET[value % ALPHABET.length]).join('')}`;
}
