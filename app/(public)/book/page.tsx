'use client';

import { Suspense, useId, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/language-context';
import { getLocalizedAddons, getLocalizedPackages } from '@/lib/i18n/translations';
import { WIX_SUBSCRIPTION_BOOKING_COPY } from '@/lib/i18n/wix-subscription-booking-copy';
import { isWixBrowserClientConfigured } from '@/lib/wix/member-client';
import { wixServiceIdFor } from '@/lib/wix/catalog';
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

/** `/book`: thin booking orchestrator wiring hooks, steps and pure rules (docs/MODULARITY.md). */
function BookContent() {
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const formId = useId();
  const localizedPackages = getLocalizedPackages(language);
  const localizedAddons = getLocalizedAddons(language);
  const wixSubscriptionCopy = WIX_SUBSCRIPTION_BOOKING_COPY[language] || WIX_SUBSCRIPTION_BOOKING_COPY.en;
  const [bookingViewMode, setBookingViewMode] = useState<BookingViewMode>('wizard');

  const intent = useBookingUrlIntent(searchParams);
  const selection = useBookingSelection({ searchParams, intent, localizedPackages, localizedAddons });
  const { activePackage, isNoiseFreeBooking, isWixSubscriptionRedemption, selectedAddons } = selection;
  const pilot = usePilotDetails();
  const schedule = useBookingSchedule({ selectedPackage: selection.selectedPackage, requiredMissionMinutes: selection.requiredMissionMinutes });
  const { selectedDate, selectedSlot } = schedule;
  const { currentStep, setCurrentStep } = useBookingStep(isNoiseFreeBooking);

  const manifestInput = { activePackage, selectedSlot, selectedAddons, scopedAddons: selection.scopedAddons };
  const { subtotalIls, upgradePromo } = useBookingManifest(manifestInput, 0);
  const effectivePackageId = upgradePromo?.isPromoActive ? upgradePromo.effectivePackageId : activePackage.id;
  const { canUseWixNativeCheckout, requiresUnsupportedLocalCheckout } = resolveCheckoutMode({
    isWixSubscriptionRedemption,
    wixBookingsAuthoritative: schedule.wixBookingsAuthoritative,
    wixBookingFrontendActive: isWixBrowserClientConfigured(),
    effectivePackageWixMapped: Boolean(wixServiceIdFor(effectivePackageId)),
    selectedAddonCount: selectedAddons.length,
    hasRequestedRoute: Boolean(selection.activeRequestedRoute),
  });
  const extras = useBookingExtras({
    packageId: activePackage.id,
    flightDate: selectedDate,
    subtotalIls,
    wixAuthoritative: schedule.wixBookingsAuthoritative,
    canUseWixNativeCheckout,
    isWixSubscriptionRedemption,
  });
  const { wixDraft, voucher, manifest, displayManifest, displayTotalAmount } = useBookingPricing({
    manifestInput,
    selectedDate,
    pilot,
    activeRequestedRoute: selection.activeRequestedRoute,
    initialVoucherCode: intent.initialVoucherCode,
    isWixSubscriptionRedemption,
    canUseWixNativeCheckout,
    subtotalIls,
    upgradePromo,
    birthday: extras.birthday,
    copy: t.booking,
  });
  const checkout = useBookingCheckout({
    activePackage,
    selectedDate,
    selectedSlot,
    pilot,
    experienceLevel: selection.experienceLevel,
    selectedAddons,
    addons: selection.scopedAddons,
    upgradePromo,
    activeRequestedRoute: selection.activeRequestedRoute,
    isWixSubscriptionRedemption,
    canUseWixNativeCheckout,
    requiresUnsupportedLocalCheckout,
    voucher,
    wixDraft,
    wixSubscriptionCopy,
    language,
    copy: t.booking,
    birthdayDiscountApplied: extras.birthday.discountIls > 0,
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
    packageCategory: activePackage.category,
    baseDurationMinutes: manifest.baseDurationMinutes,
    totalDurationMinutes: manifest.totalDurationMinutes,
    maxSlotMinutes: manifest.maxAvailableMinutes,
    wixBookingsAuthoritative: schedule.wixBookingsAuthoritative,
    isWixSubscriptionRedemption,
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
              activePackage={activePackage}
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
              onRemoveAddon={addonControls.toggleAddon}
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
    // Fallback reserves viewport height to avoid footer CLS.
    <Suspense fallback={<BookingLoadingFallback />}>
      <BookContent />
    </Suspense>
  );
}
