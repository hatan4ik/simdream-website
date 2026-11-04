import 'server-only';

import { createRuntimeCheckoutDependencies } from './checkout-composition';
import { createCheckoutService } from './checkout-service';

/** The currently active Supabase/Stripe/SendGrid checkout composition. */
const checkoutService = createCheckoutService(createRuntimeCheckoutDependencies());

export const startBookingCheckout = checkoutService.startBookingCheckout;
export const startVoucherCheckout = checkoutService.startVoucherCheckout;
