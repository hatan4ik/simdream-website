'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { verifyVoucherOrWixCode, type VerifiedVoucherOrCodeResult } from '@/lib/wix/verify-voucher-or-code';

export function VoucherBalanceCheckDrawer() {
  const { t, isRTL } = useLanguage();
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [verifiedVoucher, setVerifiedVoucher] = useState<VerifiedVoucherOrCodeResult | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('check') === '1') {
      setIsBalanceOpen(true);
    }
  }, []);

  const handleCheckBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookupCode.trim();
    if (!trimmed) return;
    setIsCheckingBalance(true);
    setLookupError(null);
    setVerifiedVoucher(null);
    try {
      const result = await verifyVoucherOrWixCode(trimmed);
      setVerifiedVoucher(result);
      if (typeof window !== 'undefined' && result.kind !== 'wix-gift-card') {
        window.sessionStorage.setItem('simdream_cached_voucher', result.code);
      }
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : 'Unable to check voucher balance right now.');
    } finally {
      setIsCheckingBalance(false);
    }
  };

  return (
    <div className="mt-16 max-w-4xl mx-auto" data-voucher-balance-drawer>
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsBalanceOpen((prev) => !prev)}
          aria-expanded={isBalanceOpen}
          className="w-full p-6 flex items-center justify-between gap-4 text-start hover:bg-slate-900 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-orange-400 font-bold block">
                {t.vouchers.balanceCheckBadge}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">{t.vouchers.balanceCheckTitle}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t.vouchers.balanceCheckDesc}</p>
            </div>
          </div>
          <div className="text-slate-400 shrink-0">
            {isBalanceOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {isBalanceOpen && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 space-y-4">
            <form onSubmit={handleCheckBalance} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1">
                <label htmlFor="voucher-balance-code" className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.vouchers.balanceInputLabel}
                </label>
                <input
                  id="voucher-balance-code"
                  name="voucherBalanceCode"
                  type="text"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder={t.vouchers.balanceInputPlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-sky-500"
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                disabled={isCheckingBalance}
                className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-colors shrink-0"
              >
                {isCheckingBalance ? t.vouchers.balanceChecking : t.vouchers.balanceCheckBtn}
              </button>
            </form>

            {lookupError && (
              <div
                role="alert"
                className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300 font-medium"
              >
                {lookupError}
              </div>
            )}

            {verifiedVoucher && (
              <div
                role="status"
                aria-live="polite"
                data-verified-voucher-kind={verifiedVoucher.kind}
                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-emerald-300" dir="ltr">
                    <span>✓ {verifiedVoucher.code}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] uppercase tracking-wider text-emerald-200">
                      ACTIVE
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                    {verifiedVoucher.currentBalanceIls !== undefined && (
                      <span>
                        {t.vouchers.balanceAvailable}:{' '}
                        <strong className="text-white font-mono" dir="ltr">
                          {formatCurrency(verifiedVoucher.currentBalanceIls)}
                        </strong>
                      </span>
                    )}
                    {verifiedVoucher.initialValueIls !== undefined && (
                      <span>
                        {t.vouchers.balanceInitial}:{' '}
                        <strong className="text-slate-200 font-mono" dir="ltr">
                          {formatCurrency(verifiedVoucher.initialValueIls)}
                        </strong>
                      </span>
                    )}
                    {verifiedVoucher.expiryDate && (
                      <span>
                        {t.vouchers.balanceExpires}:{' '}
                        <strong className="text-slate-200 font-mono" dir="ltr">
                          {new Date(verifiedVoucher.expiryDate).toLocaleDateString('en-CA')}
                        </strong>
                      </span>
                    )}
                    {verifiedVoucher.kind === 'wix-coupon' && (
                      <span>
                        {t.booking.wixCouponCodeType}:{' '}
                        <strong className="text-white font-mono" dir="ltr">
                          {verifiedVoucher.percentageOff
                            ? `${verifiedVoucher.percentageOff}% OFF${verifiedVoucher.discountIls && verifiedVoucher.discountIls > 0 ? ` (-${formatCurrency(verifiedVoucher.discountIls)})` : ''}`
                            : verifiedVoucher.discountIls && verifiedVoucher.discountIls > 0
                              ? `-${formatCurrency(verifiedVoucher.discountIls)}`
                              : t.booking.discountApplied}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
                >
                  <span>{t.vouchers.balanceBookNow}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
