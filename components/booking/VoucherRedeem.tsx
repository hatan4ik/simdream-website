'use client';

import { Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import type { BookingVoucher } from './hooks';

interface VoucherRedeemProps {
  /** Unique prefix for element ids (the page's `useId()`). */
  formId: string;
  voucher: BookingVoucher;
  /** Codes go to the Wix cart: the coupon / gift-card selector is offered. */
  canUseWixNativeCheckout: boolean;
}

const CODE_KIND_BASE =
  'min-h-11 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
const CODE_KIND_ACTIVE = 'border-sky-400 bg-sky-500 text-slate-950 hover:bg-sky-400';
const CODE_KIND_IDLE = 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white';

/**
 * The voucher, coupon and gift-card redeem box: code entry with Apply, the saved-code reapply, the
 * applied state with Remove, and the verification messages. All state lives in `useBookingVoucher`.
 */
export function VoucherRedeem({ formId, voucher, canUseWixNativeCheckout }: VoucherRedeemProps) {
  const { t } = useLanguage();
  const {
    voucherCode,
    setVoucherCode,
    cachedVoucherCode,
    voucherDiscount,
    voucherError,
    voucherSuccess,
    isVerifyingVoucher,
    wixCheckoutCodeKind,
    birthdayCouponBlocked,
    selectCodeKind,
    verifyVoucher,
    removeVoucher,
    isNativeGiftCardApplied,
    appliedCodeDisplay,
  } = voucher;
  const isGiftCardEntry = canUseWixNativeCheckout && wixCheckoutCodeKind === 'gift-card';

  return (
    <div className="p-4 rounded-xl border border-sky-500/30 bg-slate-950/60 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-mono uppercase text-slate-300 font-bold flex items-center gap-1.5 min-w-0">
          <Tag className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{t.booking.voucherPromoTitle}</span>
        </label>
        {voucherDiscount > 0 && (
          <button
            type="button"
            onClick={removeVoucher}
            className="text-xs font-mono text-red-400 hover:text-red-300 underline font-bold shrink-0"
          >
            {t.booking.removeVoucher}
          </button>
        )}
      </div>

      {voucherDiscount > 0 ? (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono font-bold text-emerald-400">
              ✓ {appliedCodeDisplay}
            </p>
            <p className="text-[11px] font-mono text-emerald-300">
              -{formatCurrency(voucherDiscount)} ({isNativeGiftCardApplied ? t.booking.wixGiftCardCredit : t.booking.discountApplied})
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeVoucher}
            className="text-xs text-slate-400 hover:text-red-300 h-auto py-1 px-2"
          >
            {t.booking.resetVoucher}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {canUseWixNativeCheckout && (
            <fieldset
              data-booking-code-type-selector
              className="grid grid-cols-2 rounded-xl border border-slate-700 bg-slate-950 p-1"
              aria-label={t.booking.wixCodeTypeLabel}
            >
              <button
                type="button"
                aria-pressed={wixCheckoutCodeKind === 'coupon'}
                aria-disabled={birthdayCouponBlocked || undefined}
                onClick={() => selectCodeKind('coupon')}
                className={`${CODE_KIND_BASE} ${birthdayCouponBlocked ? 'cursor-not-allowed opacity-50' : wixCheckoutCodeKind === 'coupon' ? CODE_KIND_ACTIVE : CODE_KIND_IDLE}`}
              >
                {t.booking.wixCouponCodeType}
              </button>
              <button
                type="button"
                aria-pressed={wixCheckoutCodeKind === 'gift-card'}
                onClick={() => selectCodeKind('gift-card')}
                className={`${CODE_KIND_BASE} ${wixCheckoutCodeKind === 'gift-card' ? CODE_KIND_ACTIVE : CODE_KIND_IDLE}`}
              >
                {t.booking.wixGiftCardCodeType}
              </button>
            </fieldset>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              aria-label={isGiftCardEntry ? t.booking.wixGiftCardCodeType : t.booking.voucherPromoTitle}
              aria-invalid={voucherError ? true : undefined}
              aria-describedby={voucherError ? `${formId}-voucher-error` : undefined}
              placeholder={isGiftCardEntry ? t.booking.wixGiftCardPlaceholder : t.booking.voucherPlaceholder}
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              dir="ltr"
              className="flex-1 min-w-0 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-base sm:text-sm text-white uppercase font-mono focus:outline-none focus:border-sky-500"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isVerifyingVoucher}
              onClick={() => verifyVoucher()}
            >
              {isVerifyingVoucher ? t.booking.verifyingVoucher : t.booking.applyCode}
            </Button>
          </div>

          {cachedVoucherCode && (!canUseWixNativeCheckout || wixCheckoutCodeKind === 'coupon') && (
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span>{t.booking.savedVoucher} <strong className="text-sky-300">{cachedVoucherCode}</strong></span>
              <button
                type="button"
                onClick={() => verifyVoucher(cachedVoucherCode)}
                className="text-amber-400 hover:text-amber-300 font-bold underline"
              >
                {t.booking.reapplyVoucher}
              </button>
            </div>
          )}
        </div>
      )}

      {voucherSuccess && <p className="text-xs text-emerald-400 font-mono">{voucherSuccess}</p>}
      {voucherError && (
        <p id={`${formId}-voucher-error`} role="alert" className="text-xs text-red-400 font-mono">
          {voucherError}
        </p>
      )}
    </div>
  );
}
