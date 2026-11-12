/**
 * The guided wizard's steps. Step numbers are stable identifiers, not positions: the noise-free
 * flows (PRO training, Fear of Flying) skip step 2, so they show two steps, 1 and 3.
 *
 *   1  date, duration and departure slot
 *   2  cockpit add-ons (recreational flights only)
 *   3  pilot manifest and checkout ("Pilot in Command Details")
 */
export const STEP_DATE_SLOT = 1;
export const STEP_ADDONS = 2;
export const STEP_PILOT = 3;

/** Keys of the step labels in the `t.booking` dictionary. */
export type BookingStepLabelKey = 'step2' | 'step3' | 'step4';

export interface BookingStepDescriptor {
  step: number;
  labelKey: BookingStepLabelKey;
}

export function stepsFor(isNoiseFreeBooking: boolean): BookingStepDescriptor[] {
  return isNoiseFreeBooking
    ? [
        { step: STEP_DATE_SLOT, labelKey: 'step2' },
        { step: STEP_PILOT, labelKey: 'step4' },
      ]
    : [
        { step: STEP_DATE_SLOT, labelKey: 'step2' },
        { step: STEP_ADDONS, labelKey: 'step3' },
        { step: STEP_PILOT, labelKey: 'step4' },
      ];
}

/** The step after choosing a slot: noise-free flows go straight to the pilot manifest. */
export function stepAfterSlot(isNoiseFreeBooking: boolean): number {
  return isNoiseFreeBooking ? STEP_PILOT : STEP_ADDONS;
}

/** The step "Back" returns to from the pilot manifest. */
export function stepBeforePilot(isNoiseFreeBooking: boolean): number {
  return isNoiseFreeBooking ? STEP_DATE_SLOT : STEP_ADDONS;
}

/** Step 2 does not exist in a noise-free flow, so it resolves to the pilot manifest. */
export function normalizeStep(step: number, isNoiseFreeBooking: boolean): number {
  return isNoiseFreeBooking && step === STEP_ADDONS ? STEP_PILOT : step;
}
