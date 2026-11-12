'use client';

import { useEffect, useState } from 'react';
import { extractErrorMessage, formatCurrency } from '@/lib/utils';
import type { translations } from '@/lib/i18n/translations';
import {
  applyCouponToDraft,
  applyGiftCardToDraft,
  formatBookingTemplate,
  removeAppliedCodeFromDraft,
  type WixCheckoutCodeKind,
} from '@/lib/booking/client';
import type { WixCheckoutDraftHandle } from './use-wix-checkout-draft';

type BookingCopy = (typeof translations)['en']['booking'];

const CACHED_VOUCHER_STORAGE_KEY = 'simdream_cached_voucher';

interface UseBookingVoucherArgs {
  initialVoucherCode: string;
  isWixSubscriptionRedemption: boolean;
  /** Codes are applied to the Wix cart (coupon or native Gift Card) instead of the local voucher API. */
  canUseWixNativeCheckout: boolean;
  /** What a local voucher balance must cover. Independent of any discount already applied. */
  subtotalIls: number;
  pilotName: string;
  pilotEmail: string;
  pilotPhone: string;
  draft: WixCheckoutDraftHandle;
  copy: BookingCopy;
}

/**
 * The voucher, coupon and gift-card redeem area: code entry, the 1-click saved-code reapply, and
 * verification. Locally funded vouchers are verified through `POST /api/vouchers`; in the Wix
 * checkout, coupons and native Gift Cards are validated inside the visitor-owned Wix cart (the
 * shared draft), never by React. The discount is a presentation figure; the server recomputes it.
 */
export function useBookingVoucher(args: UseBookingVoucherArgs) {
  const {
    initialVoucherCode,
    isWixSubscriptionRedemption,
    canUseWixNativeCheckout,
    subtotalIls,
    pilotName,
    pilotEmail,
    pilotPhone,
    draft: { activeDraft, draft, setDraft, ensureDraft },
    copy,
  } = args;

  // Voucher Code & Session Cache
  const [voucherCode, setVoucherCode] = useState<string>(initialVoucherCode);
  const [cachedVoucherCode, setCachedVoucherCode] = useState<string>('');
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [voucherError, setVoucherError] = useState<string>('');
  const [voucherSuccess, setVoucherSuccess] = useState<string>('');
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState<boolean>(false);
  const [wixCheckoutCodeKind, setWixCheckoutCodeKind] = useState<WixCheckoutCodeKind>('coupon');

  useEffect(() => {
    if (!isWixSubscriptionRedemption) return;
    setVoucherCode('');
    setVoucherDiscount(0);
    setVoucherError('');
    setVoucherSuccess('');
    setDraft(null);
    setWixCheckoutCodeKind('coupon');
  }, [isWixSubscriptionRedemption]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CACHED_VOUCHER_STORAGE_KEY);
      if (saved) {
        setCachedVoucherCode(saved);
        if (!voucherCode) setVoucherCode(saved);
      }
    } catch {}
  }, []);

  // A changed flight, departure or pilot detail invalidates the Wix cart, and any code applied to it.
  useEffect(() => {
    if (!draft || activeDraft) return;
    setDraft(null);
    setVoucherDiscount(0);
    setVoucherError('');
    setVoucherSuccess('');
  }, [activeDraft, draft]);

  const applyCouponToCurrentCheckout = async (code: string): Promise<void> => {
    const current = await ensureDraft();
    const application = await applyCouponToDraft(current, code);
    if (application.kind === 'not-eligible') {
      setDraft(application.draft);
      setVoucherDiscount(0);
      setVoucherError(copy.wixCouponNotEligible);
      return;
    }

    setDraft(application.draft);
    setVoucherCode(code);
    setVoucherDiscount(application.discountIls);
    setVoucherSuccess(
      formatBookingTemplate(copy.wixCouponApplied, {
        amount: formatCurrency(application.discountIls),
        total: formatCurrency(application.totalIls),
      })
    );
  };

  const applyGiftCardToCurrentCheckout = async (code: string): Promise<void> => {
    const current = await ensureDraft();
    const application = await applyGiftCardToDraft(current, code);
    setDraft(application.draft);
    // A native Gift Card is a bearer credential. It must not remain in state,
    // browser storage, a URL, or any rendered booking summary after Wix applies it.
    setVoucherCode('');
    setVoucherDiscount(application.appliedCreditIls);
    setVoucherSuccess(
      formatBookingTemplate(copy.wixGiftCardApplied, {
        amount: formatCurrency(application.appliedCreditIls),
        total: formatCurrency(application.totalIls),
      })
    );
  };

  // Voucher verification handler with 1-click reapply and session storage persistence.
  // Wix coupons are validated inside the visitor-owned cart, rather than by React.
  const handleVerifyVoucher = async (codeOverride?: string) => {
    const enteredCode = (codeOverride ?? voucherCode).trim();
    if (!enteredCode) return;
    const code = canUseWixNativeCheckout ? enteredCode : enteredCode.toUpperCase();

    setIsVerifyingVoucher(true);
    setVoucherError('');
    setVoucherSuccess('');

    try {
      if (canUseWixNativeCheckout) {
        if (!pilotName.trim() || !pilotEmail.trim() || !pilotPhone.trim()) {
          setVoucherError(
            wixCheckoutCodeKind === 'gift-card'
              ? copy.wixGiftCardNeedsPilotDetails
              : copy.wixCouponNeedsPilotDetails
          );
          return;
        }
        if (wixCheckoutCodeKind === 'gift-card') {
          await applyGiftCardToCurrentCheckout(code);
        } else {
          await applyCouponToCurrentCheckout(code);
        }
        return;
      }

      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || copy.voucherInvalid);
      }

      if (data.currentBalanceIls < subtotalIls) {
        throw new Error(copy.voucherInsufficientBalance);
      }
      const applicableDiscount = subtotalIls;
      setVoucherCode(code);
      setVoucherDiscount(applicableDiscount);
      setVoucherSuccess(
        formatBookingTemplate(copy.voucherApplied, { amount: formatCurrency(applicableDiscount) })
      );
      setCachedVoucherCode(code);
      try {
        sessionStorage.setItem(CACHED_VOUCHER_STORAGE_KEY, code);
      } catch {}
    } catch (err: unknown) {
      setVoucherError(
        canUseWixNativeCheckout
          ? wixCheckoutCodeKind === 'gift-card'
            ? copy.wixGiftCardVerifyFailed
            : copy.wixCouponVerifyFailed
          : extractErrorMessage(err, copy.voucherVerifyFailed)
      );
      setVoucherDiscount(0);
    } finally {
      setIsVerifyingVoucher(false);
    }
  };

  const handleRemoveVoucher = async () => {
    if (activeDraft?.couponId || activeDraft?.giftCardId) {
      setIsVerifyingVoucher(true);
      setVoucherError('');
      try {
        setDraft(await removeAppliedCodeFromDraft(activeDraft));
        setVoucherCode('');
      } catch {
        setVoucherError(activeDraft.giftCardId ? copy.wixGiftCardVerifyFailed : copy.wixCouponVerifyFailed);
        return;
      } finally {
        setIsVerifyingVoucher(false);
      }
    }
    setVoucherDiscount(0);
    setVoucherSuccess('');
    setVoucherError('');
  };

  /** Switches between a Wix coupon and a native Gift Card, clearing the entry and its messages. */
  const selectCodeKind = (kind: WixCheckoutCodeKind) => {
    setWixCheckoutCodeKind(kind);
    setVoucherCode('');
    setVoucherError('');
    setVoucherSuccess('');
  };

  const isNativeGiftCardApplied = Boolean(activeDraft?.giftCardId);

  return {
    voucherCode,
    setVoucherCode,
    cachedVoucherCode,
    voucherDiscount,
    voucherError,
    setVoucherError,
    voucherSuccess,
    isVerifyingVoucher,
    wixCheckoutCodeKind,
    selectCodeKind,
    verifyVoucher: handleVerifyVoucher,
    removeVoucher: handleRemoveVoucher,
    isNativeGiftCardApplied,
    /** The code shown next to the applied discount; Wix masks a Gift Card's bearer code. */
    appliedCodeDisplay: isNativeGiftCardApplied ? activeDraft?.giftCardObfuscatedCode : voucherCode,
    appliedCodeLabel: isNativeGiftCardApplied ? copy.wixGiftCardCredit : copy.voucherDiscount,
  };
}

export type BookingVoucher = ReturnType<typeof useBookingVoucher>;
