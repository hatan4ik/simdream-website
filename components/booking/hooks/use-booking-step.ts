'use client';

import { useEffect, useState } from 'react';
import { STEP_DATE_SLOT, STEP_PILOT, normalizeStep } from '@/lib/booking/client';

/**
 * The wizard's current step. A noise-free booking has no add-ons step, so landing on step 2 (for
 * example after switching to a PRO package) moves on to the pilot manifest.
 */
export function useBookingStep(isNoiseFreeBooking: boolean) {
  const [currentStep, setCurrentStep] = useState<number>(STEP_DATE_SLOT);

  useEffect(() => {
    const normalized = normalizeStep(currentStep, isNoiseFreeBooking);
    if (normalized !== currentStep) setCurrentStep(STEP_PILOT);
  }, [isNoiseFreeBooking, currentStep]);

  return { currentStep, setCurrentStep };
}
