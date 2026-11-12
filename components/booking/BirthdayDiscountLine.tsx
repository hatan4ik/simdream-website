'use client';

import { getBirthdayCheckoutCopy } from '@/lib/discounts/birthday';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatCurrency } from '@/lib/utils';

/**
 * The order-summary row for the birthday discount, styled like the voucher row beside it. Renders nothing
 * unless the discount applies, so the Wix-hosted checkout never shows a price reduction it cannot enforce.
 */
export function BirthdayDiscountLine({ discountIls }: { discountIls: number }) {
  const { language } = useLanguage();
  if (discountIls <= 0) return null;
  return (
    <div data-birthday-discount-line className="flex justify-between gap-2 text-emerald-400 font-semibold">
      <span>{getBirthdayCheckoutCopy(language).discountLine}</span>
      <span className="font-mono shrink-0" dir="ltr">
        -{formatCurrency(discountIls)}
      </span>
    </div>
  );
}
