'use client';

import { stepsFor } from '@/lib/booking/client';
import { useLanguage } from '@/lib/i18n/language-context';

interface BookingStepperProps {
  isNoiseFreeBooking: boolean;
  currentStep: number;
  /** Called with an earlier step the visitor clicked; later steps are not reachable by clicking. */
  onSelectStep: (step: number) => void;
}

/** Calendar-First Wizard Progress Bar: three steps, or two in a noise-free flow (no add-ons step). */
export function BookingStepper({ isNoiseFreeBooking, currentStep, onSelectStep }: BookingStepperProps) {
  const { t } = useLanguage();
  return (
    <div className="max-w-3xl mx-auto">
      <div
        className={`grid ${
          isNoiseFreeBooking ? 'grid-cols-2' : 'grid-cols-3'
        } gap-2 text-center text-xs font-mono font-semibold`}
      >
        {stepsFor(isNoiseFreeBooking).map((item) => (
          <button
            key={item.step}
            type="button"
            onClick={() => item.step < currentStep && onSelectStep(item.step)}
            className={`py-2 border-b-2 transition-all ${
              currentStep === item.step
                ? 'border-sky-400 text-sky-400 font-bold'
                : currentStep > item.step
                ? 'border-emerald-500 text-emerald-400'
                : 'border-slate-800 text-slate-400'
            }`}
          >
            {t.booking[item.labelKey]}
          </button>
        ))}
      </div>
    </div>
  );
}
