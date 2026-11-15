import { getWixBirthdayPricingProviderConfig } from './birthday-pricing-config';

/**
 * Who binds Wix-created bookings to the local zero-waste grid.
 *
 * - `provider`: the Wix Bookings Pricing provider is fully configured, and it refuses to price a
 *   booking whose start is off the grid (`off-grid-departure`, lib/wix/booking-grid-policy.ts).
 * - `none`: nothing in this repository does. With `WIX_AVAILABILITY_ADAPTER_ENABLED=true` the
 *   browser creates the Wix booking itself and can pick any start Wix offers.
 *
 * Computed from this process's environment only; it never calls Wix. Not part of the public
 * `GET /api/offers/capabilities` answer.
 */
export type WixGridEnforcement = 'provider' | 'none';

export function wixGridEnforcement(): WixGridEnforcement {
  return getWixBirthdayPricingProviderConfig() !== null ? 'provider' : 'none';
}

export interface WixGridEnforcementReport {
  line: string;
  warning: string | null;
}

/** The `npm run wix:readiness` lines. Informational: they never change the command's exit code. */
export function wixGridEnforcementReport(input: {
  enforcement: WixGridEnforcement;
  availabilityAdapterEnabled: boolean;
}): WixGridEnforcementReport {
  return {
    line: `Scheduling grid enforcement: ${input.enforcement}`,
    warning:
      input.availabilityAdapterEnabled && input.enforcement === 'none'
        ? 'WARN: off-grid Wix bookings are possible until the pricing provider is active or Wix service scheduling is configured to the same grid.'
        : null,
  };
}
