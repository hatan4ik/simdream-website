export interface CheckoutModeInputs {
  isWixSubscriptionRedemption: boolean;
  /** `/api/slots` reported that a live Wix Bookings calendar is the reservation writer. */
  wixBookingsAuthoritative: boolean;
  /** The browser has a configured Wix client id. */
  wixBookingFrontendActive: boolean;
  selectedAddonCount: number;
  /** A captain-confirmed custom World Trio request is part of the booking. */
  hasRequestedRoute: boolean;
}

export interface CheckoutMode {
  /** Single-service bookings are written natively through a Wix cart and hosted checkout. */
  canUseWixNativeCheckout: boolean;
  /** A live Wix calendar blocks add-on or route bookings that only the local checkout can write. */
  requiresUnsupportedLocalCheckout: boolean;
}

/**
 * Wix is the native writer for simple single-service bookings. The local checkout keeps ownership
 * of multi-item missions, locally funded vouchers and route intent until those catalog concepts
 * have matching Wix Bookings entities. A live Wix calendar has one reservation writer: falling
 * back to local checkout would let the two calendars sell the same simulator time.
 */
export function resolveCheckoutMode(inputs: CheckoutModeInputs): CheckoutMode {
  const canUseWixNativeCheckout =
    !inputs.isWixSubscriptionRedemption &&
    inputs.wixBookingsAuthoritative &&
    inputs.wixBookingFrontendActive &&
    inputs.selectedAddonCount === 0 &&
    !inputs.hasRequestedRoute;
  const requiresUnsupportedLocalCheckout =
    inputs.wixBookingsAuthoritative && !inputs.isWixSubscriptionRedemption && !canUseWixNativeCheckout;
  return { canUseWixNativeCheckout, requiresUnsupportedLocalCheckout };
}
