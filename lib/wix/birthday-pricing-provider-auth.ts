import 'server-only';

import { importSPKI, jwtVerify, type JWTPayload } from 'jose';
import type { WixBirthdayPricingProviderConfig, WixPricingProviderBooking } from './birthday-pricing-server';

/**
 * Verifies the signed service-plugin envelope before the pricing code sees a
 * booking. Wix sends the compact JWT as the complete text/plain request body.
 *
 * The issuer, audience, `iat`, and `exp` checks mirror Wix's external service
 * plugin requirements. Do not accept a decoded JSON body here: that would turn
 * a public route into a price-changing endpoint.
 */
export async function verifiedWixBirthdayPricingBooking(
  compactJwt: string,
  config: WixBirthdayPricingProviderConfig,
  now: Date = new Date()
): Promise<WixPricingProviderBooking | null> {
  try {
    const publicKey = await importSPKI(config.providerPublicKey, 'RS256');
    const { payload } = await jwtVerify(compactJwt, publicKey, {
      algorithms: ['RS256'],
      audience: config.providerAppId,
      issuer: 'wix.com',
      currentDate: now,
    });
    if (!isCurrentWixEnvelope(payload, now)) return null;
    const booking = wixPluginBooking(payload);
    return booking ?? null;
  } catch {
    return null;
  }
}

function isCurrentWixEnvelope(payload: JWTPayload, now: Date): boolean {
  const nowSeconds = Math.floor(now.getTime() / 1_000);
  return (
    typeof payload.iat === 'number' &&
    Number.isFinite(payload.iat) &&
    payload.iat <= nowSeconds &&
    typeof payload.exp === 'number' &&
    Number.isFinite(payload.exp) &&
    payload.exp > nowSeconds
  );
}

function wixPluginBooking(payload: JWTPayload): WixPricingProviderBooking | null {
  if (!isRecord(payload.data) || !isRecord(payload.data.request) || !isRecord(payload.data.request.booking)) {
    return null;
  }
  // The price calculator validates the service, date and claim again. This
  // narrow shape merely avoids trusting an arbitrary decoded JWT object.
  return payload.data.request.booking as WixPricingProviderBooking;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
