'use client';

import type { FormEvent, ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { FlightAddon, FlightSlot, MissionManifestCalculation, PilotExperienceLevel } from '@/types';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/language-context';
import { CheckoutSubmit } from './CheckoutSubmit';
import { OrderSummary } from './OrderSummary';
import { PilotManifestForm } from './PilotManifestForm';
import { VoucherRedeem } from './VoucherRedeem';
import type { BookingVoucher, PilotDetails } from './hooks';

interface PilotManifestStepProps {
  /** Unique prefix for element ids (the page's `useId()`). */
  formId: string;
  onSubmit: (event: FormEvent) => void;
  pilot: PilotDetails;
  isWixSubscriptionRedemption: boolean;
  experienceLevel: PilotExperienceLevel;
  onChangeExperienceLevel: (level: PilotExperienceLevel) => void;
  manifest: MissionManifestCalculation;
  selectedDate: string;
  selectedSlot: FlightSlot | null;
  selectedAddonIds: string[];
  /** The localized catalog the selected add-on ids are resolved against. */
  addons: FlightAddon[];
  voucher: BookingVoucher;
  canUseWixNativeCheckout: boolean;
  /** The payable total shown in the summary and on the button. */
  displayTotalAmount: number;
  isSubmitting: boolean;
  /** Present while redeeming a Wix subscription. */
  subscriptionCheckout?: { cta: string };
  onBack: () => void;

  // ---- SEAMS for feature modules (all optional; nothing renders when omitted) ----
  /** Extra pilot fields, rendered after "special requests" in the pilot form column. */
  extraFields?: ReactNode;
  /** Mandatory agreements (for example consent), rendered inside the summary card directly above the submit button. */
  agreements?: ReactNode;
  /** Extra discount rows (for example a birthday discount), rendered under the voucher line in the order summary. */
  extraDiscountLines?: ReactNode;
}

/**
 * STEP 3 ("Pilot in Command Details"): the pilot manifest form on one side, the order summary with
 * the redeem area, agreements and submit button on the other. This is the `<form>` that submits the
 * booking.
 */
export function PilotManifestStep({
  formId,
  onSubmit,
  pilot,
  isWixSubscriptionRedemption,
  experienceLevel,
  onChangeExperienceLevel,
  manifest,
  selectedDate,
  selectedSlot,
  selectedAddonIds,
  addons,
  voucher,
  canUseWixNativeCheckout,
  displayTotalAmount,
  isSubmitting,
  subscriptionCheckout,
  onBack,
  extraFields,
  agreements,
  extraDiscountLines,
}: PilotManifestStepProps) {
  const { t, isRTL } = useLanguage();

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start max-w-6xl mx-auto">
      <PilotManifestForm
        formId={formId}
        pilot={pilot}
        isWixSubscriptionRedemption={isWixSubscriptionRedemption}
        experienceLevel={experienceLevel}
        onChangeExperienceLevel={onChangeExperienceLevel}
        extraFields={extraFields}
      />

      <div className="lg:col-span-5 space-y-6 sticky top-28">
        <OrderSummary
          manifest={manifest}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          selectedAddonIds={selectedAddonIds}
          addons={addons}
          discount={{
            amountIls: voucher.voucherDiscount,
            label: voucher.appliedCodeLabel,
            code: voucher.appliedCodeDisplay,
          }}
          totalIls={displayTotalAmount}
          extraDiscountLines={extraDiscountLines}
          redeem={
            <VoucherRedeem formId={formId} voucher={voucher} canUseWixNativeCheckout={canUseWixNativeCheckout} />
          }
        >
          {agreements}
          <CheckoutSubmit
            isSubmitting={isSubmitting}
            totalIls={displayTotalAmount}
            canUseWixNativeCheckout={canUseWixNativeCheckout}
            subscriptionCheckout={subscriptionCheckout}
          />
        </OrderSummary>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs"
        >
          <ChevronLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t.booking.back}</span>
        </Button>
      </div>
    </form>
  );
}
