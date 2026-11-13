/** Opaque proof passed through the configured Wix Bookings custom form field. */
export interface WixBirthdayPricingClaimField {
  fieldId: string;
  token: string;
}

/**
 * Keeps custom-provider fields out of the generic browser booking client. The
 * token is issued by our server; this helper never reads or creates a birth
 * date and adds no field for an ordinary booking.
 */
export function wixBirthdayPricingAdditionalFields(
  claim: WixBirthdayPricingClaimField | undefined
): Record<string, unknown> {
  return claim
    ? { additionalFields: [{ id: claim.fieldId, value: claim.token, valueType: 'SHORT_TEXT' }] }
    : {};
}
