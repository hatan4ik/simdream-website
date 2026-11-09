/**
 * Compares two strings in time that does not depend on where they differ, so a caller
 * cannot learn a secret character by character from response timing. Unequal lengths
 * still walk the longer string and fail; the length difference itself is folded in.
 * Runtime-neutral (no node:crypto), so the same check runs in the proxy and in routes.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}
