'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { getBirthdayCheckoutCopy, getBirthdayErrorText, getBirthdayPackageEligibility } from '@/lib/discounts/birthday';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  birthdayDateBounds,
  birthdayStatusKind,
  evaluateBirthdayField,
  resolveBirthdayPathMode,
} from '@/lib/booking/client';

interface UseBookingBirthdayArgs {
  packageId: string;
  /** The flight date of the chosen slot: it, not the booking date, decides the offer. */
  flightDate: string;
  /** Registry subtotal in whole shekels, before any voucher. */
  subtotalIls: number;
  /** `/api/slots` reported a live Wix Bookings calendar: the Wix-hosted checkout cannot enforce the offer. */
  wixAuthoritative: boolean;
  /** Native pricing applies only to the supported one-service Wix checkout. */
  canUseWixNativeCheckout?: boolean;
  isWixSubscriptionRedemption: boolean;
}

/**
 * The mandatory Pilot in Command date of birth. It validates and previews the birthday offer with the same
 * engine the server decides with (`resolveBookingBirthday`); the discount shown here is a presentation
 * figure, the server recomputes it from the slot's date. The year of birth is never kept anywhere but this
 * state, and never leaves it except in the checkout request.
 */
export function useBookingBirthday(args: UseBookingBirthdayArgs) {
  const {
    packageId,
    flightDate,
    subtotalIls,
    wixAuthoritative,
    canUseWixNativeCheckout = false,
    isWixSubscriptionRedemption,
  } = args;
  const { language } = useLanguage();
  const id = `${useId()}-pilot-birthday`;
  const [value, setValue] = useState('');
  const [blurred, setBlurred] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [wixBirthdayPricingProviderEnabled, setWixBirthdayPricingProviderEnabled] = useState(false);

  // The provider is configured only on the server. Start fail-closed (the
  // existing Wix notice), then learn the public capability for this visit.
  useEffect(() => {
    let disposed = false;
    if (!wixAuthoritative || !canUseWixNativeCheckout || isWixSubscriptionRedemption) {
      setWixBirthdayPricingProviderEnabled(false);
      return () => {
        disposed = true;
      };
    }
    void fetch('/api/offers/capabilities', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return false;
        const data: unknown = await response.json();
        return Boolean(
          data &&
            typeof data === 'object' &&
            'wixBirthdayPricingProviderEnabled' in data &&
            (data as { wixBirthdayPricingProviderEnabled?: unknown }).wixBirthdayPricingProviderEnabled === true
        );
      })
      .catch(() => false)
      .then((enabled) => {
        if (!disposed) setWixBirthdayPricingProviderEnabled(enabled);
      });
    return () => {
      disposed = true;
    };
  }, [wixAuthoritative, canUseWixNativeCheckout, isWixSubscriptionRedemption]);

  const mode = resolveBirthdayPathMode({
    wixAuthoritative,
    wixBirthdayPricingProviderEnabled: canUseWixNativeCheckout && wixBirthdayPricingProviderEnabled,
    isWixSubscriptionRedemption,
  });
  const state = useMemo(
    () => evaluateBirthdayField({ value, packageId, flightDate, subtotalIls, mode }),
    [value, packageId, flightDate, subtotalIls, mode]
  );
  const bounds = useMemo(() => birthdayDateBounds(flightDate), [flightDate]);

  const copy = getBirthdayCheckoutCopy(language);
  const errorText =
    state.status === 'valid' || !state.error
      ? ''
      : state.error === 'required'
        ? copy.required
        : getBirthdayErrorText(language, state.error);
  // A wrong date is reported once the visitor leaves the field; a missing one only after a submit attempt.
  const visibleError = (state.error === 'required' ? submitted : blurred || submitted) ? errorText : '';

  /** Returns the message while the date is missing or unusable, or null. */
  const validate = (moveFocus: boolean): string | null => {
    if (state.status === 'valid') return null;
    setSubmitted(true);
    if (moveFocus) document.getElementById(id)?.focus();
    return errorText;
  };

  /**
   * Exchanges a qualifying browser-only birth date for an opaque, short-lived
   * claim. The full date is never written to Wix and the provider is still the
   * only party allowed to calculate the final amount.
   */
  const createWixBirthdayPricingClaim = async (): Promise<{ fieldId: string; token: string } | null> => {
    if (mode !== 'wix-pricing' || !state.applied) return null;
    const response = await fetch('/api/wix/birthday/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId, birthDate: value, flightDate }),
    });
    const data: unknown = await response.json().catch(() => null);
    if (
      !response.ok ||
      !data ||
      typeof data !== 'object' ||
      (data as { applied?: unknown }).applied !== true ||
      typeof (data as { fieldId?: unknown }).fieldId !== 'string' ||
      typeof (data as { token?: unknown }).token !== 'string'
    ) {
      throw new Error(copy.pricingUnavailable);
    }
    return { fieldId: (data as { fieldId: string }).fieldId, token: (data as { token: string }).token };
  };

  return {
    id,
    value,
    setValue,
    onBlur: () => setBlurred(true),
    mode,
    state,
    statusKind: birthdayStatusKind(state),
    bounds,
    /** Whole shekels taken off in the preview: 0 unless the active checkout can apply the offer. */
    discountIls: state.applied ? state.discountIls : 0,
    /** This booking could earn the discount (local checkout, package that may carry it), whatever the date. */
    discountPossible: (mode === 'local' || mode === 'wix-pricing') && getBirthdayPackageEligibility(packageId).applicable,
    errorText: visibleError,
    validate,
    createWixBirthdayPricingClaim,
  };
}

export type BookingBirthday = ReturnType<typeof useBookingBirthday>;
