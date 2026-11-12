/**
 * Can the birthday discount actually be applied on the checkout path that is live?
 *
 * Local path (Supabase + Stripe, `POST /api/checkout`): yes. The server resolves every price, so it
 * can compute the discount itself from the validated date and send the reduced amount to Stripe.
 *
 * Wix-authoritative path (`WIX_AVAILABILITY_ADAPTER_ENABLED=true`): NOT with the access this app has.
 * The browser only holds an anonymous visitor session. Wix coupons are shared codes that cannot be limited
 * to a customer or to a customer-entered date and need the COUPONS.MANAGE permission to create; discount
 * rules need ECOM.DISCOUNT_RULES_CREATE and their custom triggers receive no customer data; custom Bookings
 * pricing needs a Wix-approved app with its own server. Client credentials (a secret) would be needed for
 * admin calls from this non-Astro project. Evidence and doc links: docs/modules/birthday-offers.md
 * ("Wix feasibility"). So the UI must not advertise or collect a birthday discount there, and the server
 * must not promise one.
 *
 * Flip `WIX_PATH_CAN_ENFORCE_BIRTHDAY_DISCOUNT` only after one of the mechanisms in that document exists
 * and has been verified end to end.
 */
export const WIX_PATH_CAN_ENFORCE_BIRTHDAY_DISCOUNT = false;

export interface BirthdayCapabilityOptions {
  /** True when Wix Bookings and Wix hosted payment are the checkout authority (the availability adapter is on). */
  wixAuthoritative?: boolean;
  /** Test seam for the day the Wix path gains an enforceable mechanism. */
  wixPathCanEnforce?: boolean;
}

export function isBirthdayDiscountEnforceableOnActivePath({
  wixAuthoritative = false,
  wixPathCanEnforce = WIX_PATH_CAN_ENFORCE_BIRTHDAY_DISCOUNT,
}: BirthdayCapabilityOptions = {}): boolean {
  return wixAuthoritative ? wixPathCanEnforce : true;
}
