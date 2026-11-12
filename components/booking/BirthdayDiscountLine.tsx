'use client';

import { getBirthdayCheckoutCopy } from '@/lib/discounts/birthday';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatCurrency } from '@/lib/utils';

/**
 * The order-summary row for the birthday discount, styled like the voucher row beside it. Renders nothing
 * unless the discount applies (or space is reserved for it), so the Wix-hosted checkout never shows a price
 * reduction it cannot enforce.
 */
export function BirthdayDiscountLine({ discountIls, reserveSpace = false }: { discountIls: number; reserveSpace?: boolean }) {
  const { language } = useLanguage();
  // `reserveSpace`: the Express Shop lists this row above the pilot fields, so an empty row of the same height
  // is kept while the discount is still possible, and the field the visitor types in never jumps.
  if (discountIls <= 0) return reserveSpace ? <div aria-hidden="true" data-birthday-discount-reserve className="h-4" /> : null;
  return (
    <div data-birthday-discount-line className="flex justify-between gap-2 text-emerald-400 font-semibold">
      <span>{getBirthdayCheckoutCopy(language).discountLine}</span>
      <span className="font-mono shrink-0" dir="ltr">
        -{formatCurrency(discountIls)}
      </span>
    </div>
  );
}
