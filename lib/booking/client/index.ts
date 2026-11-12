/**
 * Public entry of the booking page's browser-side logic: pure rules plus the small I/O adapters the
 * `/book` flow calls (checkout requests, Wix cart operations). No React lives here; the React hooks
 * are in `components/booking/hooks`.
 */
export { formatBookingTemplate } from './booking-format';
export {
  DEFAULT_PACKAGE_SLUG,
  PACKAGE_SLUG_ALIASES,
  isWixSubscriptionRequested,
  mergeRequestedAddonIds,
  parseRequestedAddonIds,
  requestedPackageSlug,
  resolvePackageSlug,
  type SearchParamsReader,
} from './url-intent';
export {
  buildWixCheckoutDraftKey,
  pickActiveWixCheckoutDraft,
  presentManifestWithDraft,
  type WixCheckoutCodeKind,
  type WixCheckoutDraftInputs,
  type WixCheckoutDraftState,
} from './wix-checkout-draft';
export { resolveCheckoutMode, type CheckoutMode, type CheckoutModeInputs } from './checkout-mode';
export {
  computeRequiredMissionMinutes,
  extractSlotList,
  filterMissionCompatibleSlots,
  resolveSlotsState,
  selectDepartureAfterLoad,
  type SlotsApiPayload,
  type SlotsState,
} from './slot-selection';
export { resolveAddonToggle, type AddonToggleInputs, type AddonToggleResult } from './addon-selection';
export {
  STEP_ADDONS,
  STEP_DATE_SLOT,
  STEP_PILOT,
  normalizeStep,
  stepAfterSlot,
  stepBeforePilot,
  stepsFor,
  type BookingStepDescriptor,
  type BookingStepLabelKey,
} from './booking-steps';
export {
  buildLocalCheckoutBody,
  findBookingBlocker,
  type BookingBlocker,
  type BookingBlockerInputs,
  type LocalCheckoutInputs,
} from './checkout-request';
export { startLocalCheckout, type LocalCheckoutMessages } from './submit-local-checkout';
export {
  startWixSubscriptionCheckout,
  type WixSubscriptionBookingCopy,
  type WixSubscriptionCheckoutInput,
} from './submit-wix-subscription';
export {
  applyCouponToDraft,
  applyGiftCardToDraft,
  getWixCheckoutUrl,
  prepareWixCheckoutDraft,
  recordNoteOnWixDraft,
  removeAppliedCodeFromDraft,
  type CouponApplication,
  type GiftCardApplication,
  type PrepareWixDraftInput,
} from './wix-checkout-cart';
export {
  birthdayDateBounds,
  birthdayStatusKind,
  evaluateBirthdayField,
  resolveBirthdayPathMode,
  type BirthdayFieldErrorKey,
  type BirthdayFieldInputs,
  type BirthdayFieldState,
  type BirthdayPathMode,
  type BirthdayStatusKind,
} from './birthday-field';
export {
  buildCheckoutExtraPayload,
  buildConsentPayload,
  firstMissingConsent,
  type ConsentChoices,
  type ConsentField,
  type ConsentPayload,
} from './consent-state';
export { buildWixConsentNote, WIX_CART_NOTE_MAX_LENGTH, type WixConsentNoteInput } from './wix-consent-note';
export { CHECKOUT_EXTRAS_COPY, getCheckoutExtrasCopy, type CheckoutExtrasCopy } from './extras-copy';
