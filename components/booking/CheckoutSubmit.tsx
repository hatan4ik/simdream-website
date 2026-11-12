'use client';

import { CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

interface CheckoutSubmitProps {
  isSubmitting: boolean;
  /** The payable total shown on the button. */
  totalIls: number;
  /** Payment completes on the Wix-hosted checkout instead of Stripe. */
  canUseWixNativeCheckout: boolean;
  /** Present while redeeming a Wix subscription: its call to action replaces the payment label. */
  subscriptionCheckout?: { cta: string };
}

/** The submit button of the booking form (it submits the surrounding `<form>`) and the secure-payment notice. */
export function CheckoutSubmit({ isSubmitting, totalIls, canUseWixNativeCheckout, subscriptionCheckout }: CheckoutSubmitProps) {
  const { t } = useLanguage();
  return (
    <>
      <Button
        type="submit"
        size="lg"
        isLoading={isSubmitting}
        className="w-full"
      >
        <CreditCard className="w-5 h-5" />
        <span>
          {isSubmitting
            ? t.booking.processing
            : subscriptionCheckout
              ? subscriptionCheckout.cta
              : `${t.booking.proceedToPayment} (${formatCurrency(totalIls)})`}
        </span>
      </Button>

      <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="text-center">
          {canUseWixNativeCheckout ? t.booking.wixCheckoutNotice : t.booking.secureNotice}
        </span>
      </div>
    </>
  );
}
