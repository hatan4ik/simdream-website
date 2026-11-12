/**
 * Public entry of the `/book` page modules. Import from here, never from a sibling's internals.
 *
 *   components/booking/        UI: one component per file
 *   components/booking/hooks/  page state: one hook per concern
 *   lib/booking/client/        pure rules and I/O adapters (no React), unit-tested
 */
export { AddonCard } from './AddonCard';
export { AddonsStep } from './AddonsStep';
export { BirthdayBanner } from './BirthdayBanner';
export { BirthdayDiscountLine } from './BirthdayDiscountLine';
export { BirthdayField } from './BirthdayField';
export { BirthdayStatus } from './BirthdayStatus';
export { BookingAccountNotice } from './BookingAccountNotice';
export { BookingErrorAlert } from './BookingErrorAlert';
export { BookingLoadingFallback } from './BookingLoadingFallback';
export { BookingStepper } from './BookingStepper';
export { BookingStorefrontView } from './BookingStorefrontView';
export { BookingViewSwitcher, type BookingViewMode } from './BookingViewSwitcher';
export { CheckoutSubmit } from './CheckoutSubmit';
export { ConsentAgreement } from './ConsentAgreement';
export { ConsentBlock } from './ConsentBlock';
export { ConsentRulesLabel } from './ConsentRulesLabel';
export { DateSlotStep } from './DateSlotStep';
export { MediaReleaseDisclosure } from './MediaReleaseDisclosure';
export { OrderSummary } from './OrderSummary';
export { PilotManifestForm } from './PilotManifestForm';
export { PilotManifestStep } from './PilotManifestStep';
export { RouteIntentBanner } from './RouteIntentBanner';
export { VoucherRedeem } from './VoucherRedeem';
export { WixSubscriptionBanner } from './WixSubscriptionBanner';
export { bookingExtraSlots, type BookingExtraSlots } from './booking-extra-slots';
export * from './hooks';
