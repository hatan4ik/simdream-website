import { z } from 'zod';

/**
 * Opaque, short-lived proof that this browser completed the birthday checks.
 *
 * Wix Bookings needs a custom booking-form field to hand contextual data to a
 * pricing provider. We deliberately never place a full birth date in that
 * field. Instead the Next.js server validates it once, drops the year, and
 * signs this narrow claim. The provider can then bind it to the Wix service
 * and selected flight date before it returns a price.
 */
export interface WixBirthdayPricingClaimPayload {
  v: 1;
  p: string;
  s: string;
  f: string;
  b: string;
  e: number;
}

export interface CreateWixBirthdayPricingClaimInput {
  packageId: string;
  serviceId: string;
  flightDate: string;
  birthdayMonth: number;
  birthdayDay: number;
  secret: string;
  now?: Date;
  /** Ten minutes is enough to create the visitor cart, without leaving a reusable promotion token around. */
  ttlSeconds?: number;
}

const DEFAULT_CLAIM_TTL_SECONDS = 10 * 60;
const MINIMUM_SECRET_BYTES = 32;

const payloadSchema = z
  .object({
    v: z.literal(1),
    p: z.string().min(1).max(128),
    s: z.string().uuid(),
    f: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    b: z.string().regex(/^\d{2}-\d{2}$/),
    e: z.number().int().positive(),
  })
  .strict();

function requireSecret(secret: string): Uint8Array {
  const bytes = new TextEncoder().encode(secret);
  if (bytes.byteLength < MINIMUM_SECRET_BYTES) {
    throw new Error('Wix birthday claim signing is not configured securely.');
  }
  return bytes;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', copyToArrayBuffer(requireSecret(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** DOM crypto typings require a concrete ArrayBuffer, not a possibly shared backing store. */
function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const result = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(result).set(bytes);
  return result;
}

function monthDay(month: number, day: number): string {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Creates a compact `payload.signature` HMAC token suitable for a Wix short-text booking-form field. */
export async function createWixBirthdayPricingClaim(input: CreateWixBirthdayPricingClaimInput): Promise<string> {
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_CLAIM_TTL_SECONDS;
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 3_600) {
    throw new RangeError('Wix birthday claim TTL must be from 1 to 3600 seconds.');
  }
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1_000);
  const payload: WixBirthdayPricingClaimPayload = {
    v: 1,
    p: input.packageId,
    s: input.serviceId,
    f: input.flightDate,
    b: monthDay(input.birthdayMonth, input.birthdayDay),
    e: nowSeconds + ttlSeconds,
  };
  const parsed = payloadSchema.parse(payload);
  const encoded = encodeBase64Url(new TextEncoder().encode(JSON.stringify(parsed)));
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await hmacKey(input.secret), copyToArrayBuffer(new TextEncoder().encode(encoded)))
  );
  return `${encoded}.${encodeBase64Url(signature)}`;
}

/** Returns null for a malformed, expired or tampered claim without leaking why to a caller. */
export async function verifyWixBirthdayPricingClaim(
  token: string,
  secret: string,
  now: Date = new Date()
): Promise<WixBirthdayPricingClaimPayload | null> {
  const [encodedPayload, encodedSignature, ...rest] = token.split('.');
  if (!encodedPayload || !encodedSignature || rest.length > 0) return null;
  const payloadBytes = decodeBase64Url(encodedPayload);
  const signature = decodeBase64Url(encodedSignature);
  if (!payloadBytes || !signature) return null;

  let payload: WixBirthdayPricingClaimPayload;
  try {
    payload = payloadSchema.parse(JSON.parse(new TextDecoder().decode(payloadBytes)));
  } catch {
    return null;
  }

  const verified = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    copyToArrayBuffer(signature),
    copyToArrayBuffer(new TextEncoder().encode(encodedPayload))
  );
  if (!verified || payload.e <= Math.floor(now.getTime() / 1_000)) return null;
  return payload;
}
