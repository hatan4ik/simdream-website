import { z } from 'zod';

export type PromotionKind = 'birthday' | 'loyalty' | 'prepaid';
export type PromotionDiscountPercent = 0 | 5 | 7 | 10 | 15;

/**
 * Opaque, short-lived proof that this browser completed promotion checks.
 *
 * Wix Bookings needs a custom booking-form field to hand contextual data to a
 * pricing provider. We deliberately never place a full birth date in that
 * field. Instead the Next.js server validates it once, drops the year, and
 * signs this narrow claim. The provider can then bind it to the Wix service,
 * selected flight date, and optional customer identity keys before returning a price.
 */
export interface WixBirthdayPricingClaimPayload {
  v: 1;
  p: string;
  s: string;
  f: string;
  b?: string;
  e: number;
  k?: PromotionKind;
  d?: PromotionDiscountPercent;
  i?: readonly string[];
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
  identityKeys?: readonly string[];
}

export interface IssuePromotionClaimInput {
  packageId: string;
  serviceId: string;
  flightDate: string;
  promoKind?: PromotionKind;
  discountPercent?: PromotionDiscountPercent;
  birthdayMonth?: number;
  birthdayDay?: number;
  identityKeys?: readonly string[];
  secret: string;
  now?: Date;
  /** Ten minutes is enough to create the visitor cart, without leaving a reusable promotion token around. */
  ttlSeconds?: number;
}

export interface VerifiedPromotionClaim {
  v: 1;
  packageId: string;
  serviceId: string;
  flightDate: string;
  expiresAt: number;
  promoKind: PromotionKind;
  discountPercent: PromotionDiscountPercent;
  birthdayMonthDay?: string;
  identityKeys?: readonly string[];
}

const DEFAULT_CLAIM_TTL_SECONDS = 10 * 60;
const MINIMUM_SECRET_BYTES = 32;

const promoKindSchema = z.enum(['birthday', 'loyalty', 'prepaid']);
const discountPercentSchema = z.union([
  z.literal(0),
  z.literal(5),
  z.literal(7),
  z.literal(10),
  z.literal(15),
]);

function isValidPromoDiscount(kind: PromotionKind, discount: PromotionDiscountPercent): boolean {
  if (kind === 'birthday') return discount === 15;
  if (kind === 'prepaid') return discount === 0;
  return discount === 5 || discount === 7 || discount === 10;
}

const payloadSchema = z
  .object({
    v: z.literal(1),
    p: z.string().min(1).max(128),
    s: z.string().uuid(),
    f: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    b: z.string().regex(/^\d{2}-\d{2}$/).optional(),
    e: z.number().int().positive(),
    k: promoKindSchema.optional(),
    d: discountPercentSchema.optional(),
    i: z.array(z.string().min(1).max(128)).min(1).max(10).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const kind: PromotionKind = data.k ?? 'birthday';
    const discount: PromotionDiscountPercent =
      data.d ?? (kind === 'birthday' ? 15 : kind === 'prepaid' ? 0 : 5);
    if (kind === 'birthday' && !data.b) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Birthday claim requires month-day.' });
    }
    if (!isValidPromoDiscount(kind, discount) || (kind === 'loyalty' && data.d === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid discount percent for promotion kind.' });
    }
  });

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

function resolveDefaultDiscount(kind: PromotionKind, provided?: PromotionDiscountPercent): PromotionDiscountPercent {
  if (provided !== undefined) {
    if (!isValidPromoDiscount(kind, provided)) {
      throw new RangeError(`Discount ${provided}% is not valid for promotion kind "${kind}".`);
    }
    return provided;
  }
  if (kind === 'birthday') return 15;
  if (kind === 'prepaid') return 0;
  throw new RangeError('Loyalty promotion claim requires an explicit discountPercent (5, 7, or 10).');
}

/** Creates a compact `payload.signature` HMAC token suitable for a Wix short-text booking-form field. */
export async function issuePromotionClaim(input: IssuePromotionClaimInput): Promise<string> {
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_CLAIM_TTL_SECONDS;
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 3_600) {
    throw new RangeError('Wix promotion claim TTL must be from 1 to 3600 seconds.');
  }
  const promoKind: PromotionKind = input.promoKind ?? 'birthday';
  const discountPercent = resolveDefaultDiscount(promoKind, input.discountPercent);
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1_000);

  let b: string | undefined;
  if (promoKind === 'birthday') {
    if (input.birthdayMonth === undefined || input.birthdayDay === undefined) {
      throw new RangeError('Birthday promotion claim requires birthdayMonth and birthdayDay.');
    }
    b = monthDay(input.birthdayMonth, input.birthdayDay);
  }

  const normalizedIdentityKeys = input.identityKeys?.filter((key) => key.length > 0);
  const payload: WixBirthdayPricingClaimPayload = {
    v: 1,
    p: input.packageId,
    s: input.serviceId,
    f: input.flightDate,
    ...(b ? { b } : {}),
    e: nowSeconds + ttlSeconds,
    ...(promoKind !== 'birthday' ? { k: promoKind, d: discountPercent } : {}),
    ...(normalizedIdentityKeys && normalizedIdentityKeys.length > 0 ? { i: normalizedIdentityKeys } : {}),
  };

  const parsed = payloadSchema.parse(payload);
  const encoded = encodeBase64Url(new TextEncoder().encode(JSON.stringify(parsed)));
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await hmacKey(input.secret), copyToArrayBuffer(new TextEncoder().encode(encoded)))
  );
  return `${encoded}.${encodeBase64Url(signature)}`;
}

/** Returns null for a malformed, expired or tampered claim without leaking why to a caller. */
async function verifyRawClaim(
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

/** Verifies any promotion claim (`birthday`, `loyalty`, or `prepaid`) and normalizes its fields. */
export async function verifyPromotionClaim(
  token: string,
  secret: string,
  now: Date = new Date()
): Promise<VerifiedPromotionClaim | null> {
  const payload = await verifyRawClaim(token, secret, now);
  if (!payload) return null;
  const promoKind: PromotionKind = payload.k ?? 'birthday';
  const discountPercent: PromotionDiscountPercent =
    payload.d ?? (promoKind === 'birthday' ? 15 : 0);
  return {
    v: 1,
    packageId: payload.p,
    serviceId: payload.s,
    flightDate: payload.f,
    expiresAt: payload.e,
    promoKind,
    discountPercent,
    ...(payload.b ? { birthdayMonthDay: payload.b } : {}),
    ...(payload.i ? { identityKeys: payload.i } : {}),
  };
}

/** Backwards-compatible birthday claim issuer. */
export async function createWixBirthdayPricingClaim(input: CreateWixBirthdayPricingClaimInput): Promise<string> {
  return issuePromotionClaim({
    ...input,
    promoKind: 'birthday',
    discountPercent: 15,
  });
}

/** Backwards-compatible birthday claim verifier. */
export async function verifyWixBirthdayPricingClaim(
  token: string,
  secret: string,
  now: Date = new Date()
): Promise<WixBirthdayPricingClaimPayload | null> {
  return verifyRawClaim(token, secret, now);
}

export const issueBirthdayClaim = createWixBirthdayPricingClaim;
export const verifyBirthdayClaim = verifyWixBirthdayPricingClaim;
