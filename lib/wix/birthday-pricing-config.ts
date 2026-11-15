import { z } from 'zod';

/**
 * Configuration of the Wix Bookings Pricing provider (docs/WIX_BIRTHDAY_PRICING_PROVIDER.md).
 *
 * This module deliberately has no `server-only` import so `npm run wix:readiness` (plain Node via
 * tsx) can report whether the provider is configured. It only reads server environment variables;
 * none is `NEXT_PUBLIC_`, so a browser bundle would see every value as missing and get `null`.
 * Callers never print or return the secret values.
 */
export const WIX_BIRTHDAY_CLAIM_FIELD_ID_ENV = 'WIX_BIRTHDAY_CLAIM_FIELD_ID';

export interface WixBirthdayPricingProviderConfig {
  claimFieldId: string;
  claimSecret: string;
  providerAppId: string;
  providerPublicKey: string;
}

const guidSchema = z.string().uuid();

function nonEmptyEnvironment(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

/**
 * The route stays fail-closed until *all* pricing-provider secrets and the
 * Bookings custom-field id exist. A deployment containing only source code
 * therefore cannot accidentally advertise or grant the reduction.
 */
export function getWixBirthdayPricingProviderConfig(): WixBirthdayPricingProviderConfig | null {
  if (process.env.WIX_BIRTHDAY_PRICING_PROVIDER_ENABLED?.trim().toLowerCase() !== 'true') return null;
  const claimFieldId = nonEmptyEnvironment(WIX_BIRTHDAY_CLAIM_FIELD_ID_ENV);
  const claimSecret = nonEmptyEnvironment('WIX_BIRTHDAY_CLAIM_SECRET');
  const providerAppId = nonEmptyEnvironment('WIX_BIRTHDAY_PRICING_PROVIDER_APP_ID');
  const providerPublicKey = nonEmptyEnvironment('WIX_BIRTHDAY_PRICING_PROVIDER_PUBLIC_KEY');
  if (!claimFieldId || !claimSecret || !providerAppId || !providerPublicKey) return null;
  if (!guidSchema.safeParse(claimFieldId).success || !guidSchema.safeParse(providerAppId).success) return null;
  if (new TextEncoder().encode(claimSecret).byteLength < 32 || !providerPublicKey.includes('BEGIN PUBLIC KEY')) return null;
  return { claimFieldId, claimSecret, providerAppId, providerPublicKey };
}

export function isWixBirthdayPricingProviderEnabled(): boolean {
  return getWixBirthdayPricingProviderConfig() !== null;
}
