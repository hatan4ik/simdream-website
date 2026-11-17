'use client';

import { Check, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatCurrency } from '@/lib/utils';
import type { BookingVoucher } from './hooks';

interface StorefrontVoucherBoxProps {
  voucher?: BookingVoucher;
  voucherCode: string;
  onChangeVoucherCode: (value: string) => void;
  voucherDiscount: number;
  voucherError: string;
  voucherSuccess: string;
  isVerifyingVoucher: boolean;
  onVerifyVoucher: () => void;
  onRemoveVoucher?: () => void;
  cachedVoucherCode?: string;
  onReapplyCachedVoucher?: (code: string) => void;
}

const CODE_KIND_BASE =
  'min-h-10 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
const CODE_KIND_ACTIVE = 'border-sky-400 bg-sky-500 text-slate-950 hover:bg-sky-400';
const CODE_KIND_IDLE = 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white';

/**
 * The optional promo and gift-voucher box of the Express Shop buy box: code entry with Apply, the saved
 * code, and the applied state with Remove. Moved verbatim out of `AmazonFlightStorefront` (markup, ids and
 * classes unchanged) so that file can take the shared consent and birthday modules without growing.
 */
export function StorefrontVoucherBox({
  voucher,
  voucherCode,
  onChangeVoucherCode,
  voucherDiscount,
  voucherError,
  voucherSuccess,
  isVerifyingVoucher,
  onVerifyVoucher,
  onRemoveVoucher,
  cachedVoucherCode,
  onReapplyCachedVoucher,
}: StorefrontVoucherBoxProps) {
  const { t } = useLanguage();
  const canUseWix = Boolean(voucher?.canUseWixNativeCheckout);
  const wixCodeKind = voucher?.wixCheckoutCodeKind ?? 'coupon';
  const isCouponApplied = Boolean(voucher?.isCouponApplied);
  const isNativeGiftCardApplied = Boolean(voucher?.isNativeGiftCardApplied);
  const canAddAnotherCode = voucher ? voucher.canAddAnotherCode : voucherDiscount <= 0;
  const couponTabDisabled = Boolean(voucher?.birthdayCouponBlocked) || isCouponApplied;
  const isGiftCardEntry = canUseWix && wixCodeKind === 'gift-card';

  return (
    <>
    {/* Optional Promo / Gift Voucher */}
    <div className="pt-2 space-y-2">
      <label
        htmlFor="storefront-voucher-code"
        className="text-[11px] font-mono uppercase text-slate-300 font-semibold flex items-center justify-between"
      >
        <span className="flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-sky-400" />
          <span>{t.booking.voucherPromoTitle}</span>
        </span>
        {voucherDiscount > 0 && onRemoveVoucher && (
          <button
            type="button"
            onClick={() => onRemoveVoucher()}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-red-400 hover:text-red-300 underline font-bold"
          >
            <X className="w-3 h-3" />
            <span>{t.booking.removeVoucher}</span>
          </button>
        )}
      </label>

      {canUseWix && voucher ? (
        <>
          {isCouponApplied && (
            <div
              data-applied-code-kind="coupon"
              className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{voucher.appliedCouponCode}</span>
                </p>
                <p className="text-[11px] font-mono text-emerald-300">
                  -{formatCurrency(voucher.appliedCouponDiscountIls)} ({t.booking.discountApplied})
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => voucher.removeVoucher('coupon')}
                className="text-xs text-slate-400 hover:text-red-300 px-2 py-1 h-auto"
              >
                {t.booking.resetVoucher}
              </Button>
            </div>
          )}
          {isNativeGiftCardApplied && (
            <div
              data-applied-code-kind="gift-card"
              className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{voucher.appliedGiftCardCode}</span>
                </p>
                <p className="text-[11px] font-mono text-emerald-300">
                  -{formatCurrency(voucher.appliedGiftCardCreditIls)} ({t.booking.wixGiftCardCredit})
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => voucher.removeVoucher('gift-card')}
                className="text-xs text-slate-400 hover:text-red-300 px-2 py-1 h-auto"
              >
                {t.booking.resetVoucher}
              </Button>
            </div>
          )}
        </>
      ) : (
        voucherDiscount > 0 && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{voucher?.appliedCodeDisplay || voucherCode}</span>
              </p>
              <p className="text-[11px] font-mono text-emerald-300">
                -{formatCurrency(voucherDiscount)} ({t.booking.discountApplied})
              </p>
            </div>
            {onRemoveVoucher && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveVoucher()}
                className="text-xs text-slate-400 hover:text-red-300 px-2 py-1 h-auto"
              >
                {t.booking.resetVoucher}
              </Button>
            )}
          </div>
        )
      )}

      {canAddAnotherCode && (
        <div className="space-y-2">
          {canUseWix && voucher && (
            <fieldset
              data-booking-code-type-selector
              className="grid grid-cols-2 rounded-xl border border-slate-700 bg-slate-950 p-1"
              aria-label={t.booking.wixCodeTypeLabel}
            >
              <button
                type="button"
                aria-pressed={wixCodeKind === 'coupon'}
                aria-disabled={couponTabDisabled || undefined}
                disabled={isCouponApplied}
                onClick={() => voucher.selectCodeKind('coupon')}
                className={`${CODE_KIND_BASE} ${couponTabDisabled ? 'cursor-not-allowed opacity-50' : wixCodeKind === 'coupon' ? CODE_KIND_ACTIVE : CODE_KIND_IDLE}`}
              >
                {isCouponApplied ? `✓ ${t.booking.wixCouponCodeType}` : t.booking.wixCouponCodeType}
              </button>
              <button
                type="button"
                aria-pressed={wixCodeKind === 'gift-card'}
                aria-disabled={isNativeGiftCardApplied || undefined}
                disabled={isNativeGiftCardApplied}
                onClick={() => voucher.selectCodeKind('gift-card')}
                className={`${CODE_KIND_BASE} ${isNativeGiftCardApplied ? 'cursor-not-allowed opacity-50' : wixCodeKind === 'gift-card' ? CODE_KIND_ACTIVE : CODE_KIND_IDLE}`}
              >
                {isNativeGiftCardApplied ? `✓ ${t.booking.wixGiftCardCodeType}` : t.booking.wixGiftCardCodeType}
              </button>
            </fieldset>
          )}
          <div className="flex gap-1.5">
            <input
              id="storefront-voucher-code"
              name="voucherCode"
              type="text"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={isGiftCardEntry ? t.booking.wixGiftCardPlaceholder : t.booking.voucherPlaceholder}
              aria-invalid={voucherError ? true : undefined}
              aria-describedby={voucherError ? 'storefront-voucher-error' : undefined}
              value={voucherCode}
              onChange={(e) => onChangeVoucherCode(e.target.value)}
              dir="ltr"
              className="max-lg:scroll-mb-24 flex-1 min-w-0 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-base sm:text-sm text-white uppercase font-mono focus:outline-none focus:border-amber-400"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isVerifyingVoucher}
              onClick={onVerifyVoucher}
            >
              {isVerifyingVoucher ? '...' : t.booking.applyCode}
            </Button>
          </div>

          {cachedVoucherCode && onReapplyCachedVoucher && (!canUseWix || (wixCodeKind === 'coupon' && !isCouponApplied)) && (
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span>{t.booking.savedVoucher} <strong className="text-sky-300">{cachedVoucherCode}</strong></span>
              <button
                type="button"
                onClick={() => onReapplyCachedVoucher(cachedVoucherCode)}
                className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors"
              >
                {t.booking.reapplyVoucher}
              </button>
            </div>
          )}
        </div>
      )}

      {voucherSuccess && <p className="text-[11px] text-emerald-400 font-mono">{voucherSuccess}</p>}
      {voucherError && (
        <p id="storefront-voucher-error" role="alert" className="text-[11px] text-red-400 font-mono">
          {voucherError}
        </p>
      )}
    </div>

    </>
  );
}
