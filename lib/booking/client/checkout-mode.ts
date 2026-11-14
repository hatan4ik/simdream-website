export interface CheckoutModeInputs {
  isWixSubscriptionRedemption: boolean;
  /** `/api/slots` reported that a live Wix Bookings calendar is the reservation writer. */
  wixBookingsAuthoritative: boolean;
  /** The browser has a configured Wix client id. */
  wixBookingFrontendActive: boolean;
  selectedAddonCount?: number;
  /** A captain-confirmed custom World Trio request is part of the booking. */
  hasRequestedRoute?: boolean;
}

export interface CheckoutMode {
  /** Bookings (including add-ons and route requests) are written natively through a Wix cart and hosted checkout. */
  canUseWixNativeCheckout: boolean;
  /** A live Wix calendar blocks falling back to local checkout when the Wix frontend client is inactive. */
  requiresUnsupportedLocalCheckout: boolean;
}

/**
 * Wix is the native writer for bookings on a live Wix calendar, including Wix Stores add-ons
 * and captain-confirmed route requests. A live Wix calendar has one reservation writer: falling
 * back to local checkout when the Wix frontend client is inactive would let two calendars sell
 * the same simulator time.
 */
export function resolveCheckoutMode(inputs: CheckoutModeInputs): CheckoutMode {
  const canUseWixNativeCheckout =
    !inputs.isWixSubscriptionRedemption &&
    inputs.wixBookingsAuthoritative &&
    inputs.wixBookingFrontendActive;
  const requiresUnsupportedLocalCheckout =
    inputs.wixBookingsAuthoritative && !inputs.isWixSubscriptionRedemption && !canUseWixNativeCheckout;
  return { canUseWixNativeCheckout, requiresUnsupportedLocalCheckout };
}
