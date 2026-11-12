'use client';

import { Suspense, useId, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/language-context';
import { getLocalizedAddons, getLocalizedPackages } from '@/lib/i18n/translations';
import { WIX_SUBSCRIPTION_BOOKING_COPY } from '@/lib/i18n/wix-subscription-booking-copy';
import { isWixBrowserClientConfigured } from '@/lib/wix/member-client';
import {
  STEP_ADDONS,
  STEP_DATE_SLOT,
  STEP_PILOT,
  resolveCheckoutMode,
  stepAfterSlot,
  stepBeforePilot,
} from '@/lib/booking/client';
import {
  AddonsStep,
  BookingAccountNotice,
  BookingErrorAlert,
  BookingLoadingFallback,
  BookingStepper,
  BookingStorefrontView,
  BookingViewSwitcher,
  DateSlotStep,
  PilotManifestStep,
  RouteIntentBanner,
  WixSubscriptionBanner,
  useAddonControls,
  bookingExtraSlots,
  useBookingCheckout,
  useBookingExtras,
  useBookingManifest,
  useBookingPricing,
  useBookingSchedule,
  useBookingSelection,
  useBookingStep,
  useBookingUrlIntent,
  usePilotDetails,
  type BookingViewMode,
} from '@/components/booking';

/**
 * `/book`: the booking orchestrator. It holds no rules and no markup of its own, only the wiring
 * between the booking modules (docs/MODULARITY.md, docs/modules/modular-booking.md): hooks in
 * `components/booking/hooks` (called in dependency order), steps in `components/booking`, and
 * pure rules in `lib/booking/client`. Flows: recreational (3 steps), PRO training and Fear of
 * Flying (2 steps, no add-ons).
 */
function BookContent() {
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const formId = useId();
  const localizedPackages = getLocalizedPackages(language);
  const localizedAddons = getLocalizedAddons(language);
  const wixSubscriptionCopy = WIX_SUBSCRIPTION_BOOKING_COPY[language] || WIX_SUBSCRIPTION_BOOKING_COPY.en;

  // Calendar-first guidance is the default booking experience. The optional desktop storefront
  // remains available for guests who prefer a one-page checkout, but is intentionally absent on phones.
  const [bookingViewMode, setBookingViewMode] = useState<BookingViewMode>('wizard');

  // What is booked, when, and by whom (hooks are called in dependency order).
  const intent = useBookingUrlIntent(searchParams);
  const selection = useBookingSelection({ searchParams, intent, localizedPackages, localizedAddons });
  const { activePackage, isNoiseFreeBooking, isWixSubscriptionRedemption, selectedAddons } = selection;
  const pilot = usePilotDetails();
  const { selectedPackage, requiredMissionMinutes } = selection;
  const schedule = useBookingSchedule({ selectedPackage, requiredMissionMinutes });
  const { selectedDate, selectedSlot } = schedule;
  const { currentStep, setCurrentStep } = useBookingStep(isNoiseFreeBooking);

  // Which checkout writes the reservation: Wix natively for simple single-service bookings,
  // otherwise the local checkout (and never both, while a live Wix calendar is authoritative).
  const { canUseWixNativeCheckout, requiresUnsupportedLocalCheckout } = resolveCheckoutMode({
    isWixSubscriptionRedemption,
    wixBookingsAuthoritative: schedule.wixBookingsAuthoritative,
    wixBookingFrontendActive: isWixBrowserClientConfigured(),
    selectedAddonCount: selectedAddons.length,
    hasRequestedRoute: Boolean(selection.activeRequestedRoute),
  });

  // Price, vouchers, the Wix cart and the mandatory extras (consent, birthday). A voucher is verified against
  // the subtotal less the birthday discount; the manifest carries both reductions.
  const manifestInput = { activePackage, selectedSlot, selectedAddons, scopedAddons: selection.scopedAddons };
  const subtotalIls = useBookingManifest(manifestInput, 0).subtotalIls;
  const extras = useBookingExtras({
    packageId: activePackage.id,
    flightDate: selectedDate,
    subtotalIls,
    wixAuthoritative: schedule.wixBookingsAuthoritative,
    isWixSubscriptionRedemption,
  });
  const { wixDraft, voucher, manifest, displayManifest, displayTotalAmount } = useBookingPricing({
    manifestInput,
    selectedDate,
    pilot,
    initialVoucherCode: intent.initialVoucherCode,
    isWixSubscriptionRedemption,
    canUseWixNativeCheckout,
    subtotalIls,
    birthdayDiscountIls: extras.birthday.discountIls,
    copy: t.booking,
  });

  const checkout = useBookingCheckout({
    activePackage,
    selectedDate,
    selectedSlot,
    pilot,
    experienceLevel: selection.experienceLevel,
    selectedAddons,
    activeRequestedRoute: selection.activeRequestedRoute,
    isWixSubscriptionRedemption,
    canUseWixNativeCheckout,
    requiresUnsupportedLocalCheckout,
    voucher,
    wixDraft,
    wixSubscriptionCopy,
    copy: t.booking,
    onSlotMissing: () => setCurrentStep(STEP_DATE_SLOT),
    extraValidation: extras.validate,
    extraPayload: extras.payload,
    wixCartNote: extras.wixCartNote,
  });
  const addonControls = useAddonControls({
    selectedAddons,
    setSelectedAddons: selection.setSelectedAddons,
    localizedAddons,
    scopedAddons: selection.scopedAddons,
    selectedSlot,
    baseDurationMinutes: manifest.baseDurationMinutes,
    totalDurationMinutes: manifest.totalDurationMinutes,
    maxSlotMinutes: manifest.maxAvailableMinutes,
    wixBookingsAuthoritative: schedule.wixBookingsAuthoritative,
    isWixSubscriptionRedemption,
    onWixAuthorityRequired: () => checkout.setBookingError(t.booking.wixBookingAuthorityRequired),
  });
  const subscriptionCheckout = isWixSubscriptionRedemption
    ? { notice: wixSubscriptionCopy.description, cta: wixSubscriptionCopy.checkoutLabel }
    : undefined;

  return (
    // w-full min-w-0: with mx-auto inside the flex-column main, the page otherwise
    // shrink-wraps to calendar controls and becomes too wide on phones.
    // Desktop keeps the stack above the calendar short (slim kicker row, no banners), so the
    // departure grid and the buy box sit inside the first screen on a 900px laptop.
    <div
      className="flex-1 w-full min-w-0 py-5 sm:py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4 sm:space-y-5"
      data-slots-state={schedule.slotsState}
    >
      <BookingViewSwitcher mode={bookingViewMode} onChange={setBookingViewMode} />

      <RouteIntentBanner
        selectedRoute={intent.selectedRoute}
        requestedRoute={intent.requestedRoute}
        selectedRouteAddon={selection.selectedRouteAddon}
        hasSelectedRouteAddon={selection.hasSelectedRouteAddon}
        isNoiseFreeBooking={isNoiseFreeBooking}
      />

      {/* The storefront announces checkout errors in its buy box; one alert per failure. */}
      {checkout.bookingError && bookingViewMode === 'wizard' && <BookingErrorAlert message={checkout.bookingError} />}

      {/* The storefront shows the account notice inside its buy box, next to checkout where it
          matters; the wizard keeps it here above the step bar. */}
      {bookingViewMode === 'wizard' && <BookingAccountNotice framed />}

      {isWixSubscriptionRedemption && <WixSubscriptionBanner copy={wixSubscriptionCopy} />}

      {!schedule.browserIsraelToday ? (
        <BookingLoadingFallback />
      ) : bookingViewMode === 'storefront' ? (
        <BookingStorefrontView
          selection={selection}
          schedule={schedule}
          pilot={pilot}
          voucher={voucher}
          checkout={checkout}
          addonControls={addonControls}
          displayManifest={displayManifest}
          extraSlots={bookingExtraSlots(extras, 'storefront')}
          subscriptionCheckout={subscriptionCheckout}
        />
      ) : (
        <>
          <BookingStepper isNoiseFreeBooking={isNoiseFreeBooking} currentStep={currentStep} onSelectStep={setCurrentStep} />

          {currentStep === STEP_DATE_SLOT && (
            <DateSlotStep
              schedule={schedule}
              selectedPackage={activePackage}
              packages={selection.scopedPackages}
              onSelectPackage={selection.handleSelectPackage}
              manifest={manifest}
              isNoiseFreeBooking={isNoiseFreeBooking}
              onContinue={() => setCurrentStep(stepAfterSlot(isNoiseFreeBooking))}
            />
          )}

          {!isNoiseFreeBooking && currentStep === STEP_ADDONS && (
            <AddonsStep
              formId={formId}
              addons={selection.scopedAddons}
              selectedAddonIds={selectedAddons}
              selectedSlot={selectedSlot}
              manifest={manifest}
              onToggleAddon={addonControls.toggleAddon}
              onBack={() => setCurrentStep(STEP_DATE_SLOT)}
              onContinue={() => setCurrentStep(STEP_PILOT)}
            />
          )}

          {currentStep === STEP_PILOT && (
            <PilotManifestStep
              formId={formId}
              onSubmit={checkout.handleCompleteBooking}
              pilot={pilot}
              isWixSubscriptionRedemption={isWixSubscriptionRedemption}
              experienceLevel={selection.experienceLevel}
              onChangeExperienceLevel={selection.handleChangeExperienceLevel}
              manifest={manifest}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              selectedAddonIds={selectedAddons}
              addons={localizedAddons}
              voucher={voucher}
              canUseWixNativeCheckout={canUseWixNativeCheckout}
              displayTotalAmount={displayTotalAmount}
              isSubmitting={checkout.isSubmitting}
              subscriptionCheckout={subscriptionCheckout}
              {...bookingExtraSlots(extras, 'wizard')}
              onBack={() => setCurrentStep(stepBeforePilot(isNoiseFreeBooking))}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function BookPage() {
  return (
    // The fallback reserves a viewport of height so the storefront replacing it does not
    // shove the footer up the screen (cumulative layout shift).
    <Suspense fallback={<BookingLoadingFallback />}>
      <BookContent />
    </Suspense>
  );
}
