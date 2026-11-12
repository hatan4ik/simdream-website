import type { PilotExperienceLevel } from '@/types';

/** Why the booking cannot be submitted yet. The caller maps each blocker to a localized message. */
export type BookingBlocker =
  | { kind: 'select-slot' }
  | { kind: 'fill-fields' }
  | { kind: 'wix-authority-required' }
  /** Raised by `extraValidation`: a localized message from a feature module (consent, birthday...). */
  | { kind: 'extra'; message: string };

export interface BookingBlockerInputs {
  hasAvailableSlot: boolean;
  isWixSubscriptionRedemption: boolean;
  pilotName: string;
  pilotEmail: string;
  pilotPhone: string;
  requiresUnsupportedLocalCheckout: boolean;
  /** Returns a localized error message while a feature's own requirement is unmet, else null. */
  extraValidation?: () => string | null;
}

/** The first thing that stops a booking submission, in the order the visitor must fix it. */
export function findBookingBlocker(inputs: BookingBlockerInputs): BookingBlocker | null {
  if (!inputs.hasAvailableSlot) return { kind: 'select-slot' };
  if (
    !inputs.isWixSubscriptionRedemption &&
    (!inputs.pilotName || !inputs.pilotEmail || !inputs.pilotPhone)
  ) {
    return { kind: 'fill-fields' };
  }
  const extraMessage = inputs.extraValidation?.() ?? null;
  if (extraMessage) return { kind: 'extra', message: extraMessage };
  if (inputs.requiresUnsupportedLocalCheckout) return { kind: 'wix-authority-required' };
  return null;
}

export interface LocalCheckoutInputs {
  packageId: string;
  bookingDate: string;
  startTime: string;
  pilotName: string;
  pilotEmail: string;
  pilotPhone: string;
  experienceLevel: PilotExperienceLevel;
  addons: readonly string[];
  requestedRouteId: string | undefined;
  voucherCode: string;
  voucherDiscountIls: number;
  notes: string;
}

/**
 * The `POST /api/checkout` body. The client sends IDs and typed input only; the server resolves
 * every price, duration and discount. `extraPayload` lets a feature module add its own validated
 * fields; it can never override a core field below.
 */
export function buildLocalCheckoutBody(
  inputs: LocalCheckoutInputs,
  extraPayload?: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...extraPayload,
    kind: 'booking',
    packageId: inputs.packageId,
    bookingDate: inputs.bookingDate,
    startTime: inputs.startTime,
    pilotName: inputs.pilotName,
    pilotEmail: inputs.pilotEmail,
    pilotPhone: inputs.pilotPhone,
    experienceLevel: inputs.experienceLevel,
    addons: inputs.addons,
    requestedRouteId: inputs.requestedRouteId,
    voucherCode: inputs.voucherDiscountIls > 0 ? inputs.voucherCode : undefined,
    notes: inputs.notes,
  };
}
