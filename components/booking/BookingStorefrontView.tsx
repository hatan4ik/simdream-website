'use client';

import type { MissionManifestCalculation } from '@/types';
import { AmazonFlightStorefront } from '@/components/scheduler/AmazonFlightStorefront';
import { BookingAccountNotice } from './BookingAccountNotice';
import type { BookingExtraSlots } from './booking-extra-slots';
import type {
  AddonControls,
  BookingCheckout,
  BookingSchedule,
  BookingSelection,
  BookingVoucher,
  PilotDetails,
} from './hooks';

interface BookingStorefrontViewProps {
  selection: BookingSelection;
  schedule: BookingSchedule;
  pilot: PilotDetails;
  voucher: BookingVoucher;
  checkout: BookingCheckout;
  addonControls: AddonControls;
  /** The manifest with the Wix cart's calculated total, when a Wix draft is active. */
  displayManifest: MissionManifestCalculation;
  /** The shared checkout extras (birthday field, confirmations, discount row), built for the Express Shop. */
  extraSlots?: BookingExtraSlots;
  /** Present while redeeming a Wix subscription: replaces the payment call to action. */
  subscriptionCheckout?: { notice: string; cta: string };
}

/**
 * The optional desktop one-page Express Shop. A thin adapter: it maps the page's booking state onto
 * the storefront's props and adds nothing of its own, so both views share one source of truth.
 *
 * NOTE: the storefront renders its own pilot form and buy box. The mandatory extras (birthday field,
 * consent block, discount row) come from `bookingExtraSlots()`, the same nodes `PilotManifestStep` gets, so
 * both views stay in step; a new shared field goes into those slots, not into either view.
 */
export function BookingStorefrontView({
  selection,
  schedule,
  pilot,
  voucher,
  checkout,
  addonControls,
  displayManifest,
  extraSlots,
  subscriptionCheckout,
}: BookingStorefrontViewProps) {
  return (
    <AmazonFlightStorefront
      accountNotice={<BookingAccountNotice />}
      selectedDate={schedule.selectedDate}
      calendarTodayYmd={schedule.calendarTodayYmd}
      onSelectDate={schedule.setSelectedDate}
      selectedPackage={selection.activePackage}
      packages={selection.scopedPackages}
      onSelectPackage={selection.handleSelectPackage}
      slots={schedule.missionCompatibleSlots}
      selectedSlot={schedule.selectedSlot}
      onSelectSlot={schedule.setSelectedSlot}
      durationAvailability={schedule.durationAvailability}
      loadingSlots={schedule.loadingSlots}
      slotsLoadFailed={schedule.slotsLoadFailed}
      onRetrySlots={schedule.reloadSlots}
      addons={selection.scopedAddons}
      selectedAddons={selection.selectedAddons}
      onToggleAddon={addonControls.toggleAddon}
      onSetAddons={addonControls.setAddons}
      manifest={displayManifest}
      pilotName={pilot.pilotName}
      onChangePilotName={pilot.setPilotName}
      pilotEmail={pilot.pilotEmail}
      onChangePilotEmail={pilot.setPilotEmail}
      pilotPhone={pilot.pilotPhone}
      onChangePilotPhone={pilot.setPilotPhone}
      experienceLevel={selection.experienceLevel}
      onChangeExperienceLevel={selection.handleChangeExperienceLevel}
      notes={pilot.notes}
      onChangeNotes={pilot.setNotes}
      voucherCode={voucher.voucherCode}
      onChangeVoucherCode={voucher.setVoucherCode}
      voucherDiscount={voucher.voucherDiscount}
      voucherError={voucher.voucherError}
      voucherSuccess={voucher.voucherSuccess}
      isVerifyingVoucher={voucher.isVerifyingVoucher}
      onVerifyVoucher={() => voucher.verifyVoucher()}
      onRemoveVoucher={voucher.removeVoucher}
      cachedVoucherCode={voucher.cachedVoucherCode}
      onReapplyCachedVoucher={(code) => voucher.verifyVoucher(code)}
      isSubmitting={checkout.isSubmitting}
      checkoutError={checkout.bookingError}
      onSubmitBooking={checkout.handleCompleteBooking}
      subscriptionCheckout={subscriptionCheckout}
      {...extraSlots}
    />
  );
}
