/**
 * TEST-ONLY. Signs a birthday pricing claim the way the issuer did before identity binding: no
 * `i` (identity keys). The production issuer refuses to mint such a claim; the provider still
 * accepts one until it expires, and tests use this to pin that legacy branch.
 */
function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function signLegacyUnboundBirthdayClaimForTests(input: {
  packageId: string;
  serviceId: string;
  flightDate: string;
  /** MM-DD */
  birthdayMonthDay: string;
  secret: string;
  now: Date;
  ttlSeconds?: number;
}): Promise<string> {
  const payload = {
    v: 1,
    p: input.packageId,
    s: input.serviceId,
    f: input.flightDate,
    b: input.birthdayMonthDay,
    e: Math.floor(input.now.getTime() / 1_000) + (input.ttlSeconds ?? 600),
  };
  const encoded = base64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(input.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded)));
  return `${encoded}.${base64Url(signature)}`;
}
