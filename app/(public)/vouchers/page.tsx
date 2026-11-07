'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Gift,
  Sparkles,
  Check,
  Plane,
  ShieldCheck,
  Mail,
  User,
  Calendar,
  CreditCard,
  Award,
  EyeOff,
  Eye,
  Printer,
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { getLocalizedPackages } from '@/lib/i18n/translations';
import {
  DEFAULT_GIFT_CERTIFICATE_AMOUNT,
  giftCertificateAmount,
  orderGiftCertificatePackages,
  type GiftCertificatePackageId,
} from '@/lib/catalog/gift-voucher-packages';
import { BrandMark } from '@/components/brand/BrandLogo';
import { GiftCardDesignPicker } from '@/components/vouchers/GiftCardDesignPicker';
import {
  DEFAULT_GIFT_CARD_DESIGN_ID,
  type GiftCardDesignId,
} from '@/lib/catalog/gift-card-designs';

type GiftFormatMode = 'certificate' | 'card';

interface VerifiedVoucherInfo {
  code: string;
  initialValueIls: number;
  currentBalanceIls: number;
  expiryDate: string;
  isRedeemed: boolean;
}

export default function GiftVouchersPage() {
  const { t, isRTL, language } = useLanguage();

  const VOUCHER_TIERS = React.useMemo(() => {
    const labels: Record<GiftCertificatePackageId, string> = {
      'pkg-discovery-30': t.vouchers.tier1Label,
      'pkg-captain-60': t.vouchers.tier2Label,
      'pkg-ultimate-90': t.vouchers.tier3Label,
      'pkg-assessment-prep-120': t.vouchers.tier4Label,
    };

    return orderGiftCertificatePackages(getLocalizedPackages(language)).map((pkg) => ({
      amount: giftCertificateAmount(pkg),
      label: labels[pkg.id as GiftCertificatePackageId],
      popular: pkg.id === 'pkg-captain-60',
      packageId: pkg.id,
    }));
  }, [language, t.vouchers.tier1Label, t.vouchers.tier2Label, t.vouchers.tier3Label, t.vouchers.tier4Label]);

  const CARD_PRESETS = [250, 500, 750, 1000];

  const [giftMode, setGiftMode] = useState<GiftFormatMode>('certificate');
  const [selectedTier, setSelectedTier] = useState<number>(DEFAULT_GIFT_CERTIFICATE_AMOUNT);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [hidePriceOnCertificate, setHidePriceOnCertificate] = useState<boolean>(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'direct' | 'print'>('direct');
  const [giftCardDesignId, setGiftCardDesignId] = useState<GiftCardDesignId>(DEFAULT_GIFT_CARD_DESIGN_ID);

  const [recipientName, setRecipientName] = useState('Aviad Stern');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('Danielle Cohen');
  const [senderEmail, setSenderEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState(t.vouchers.defaultMessage);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [returnBanner, setReturnBanner] = useState<'processing' | 'cancelled' | null>(null);

  // Recipient balance check drawer state
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [verifiedVoucher, setVerifiedVoucher] = useState<VerifiedVoucherInfo | null>(null);

  useEffect(() => {
    setPersonalMessage(t.vouchers.defaultMessage);
  }, [t.vouchers.defaultMessage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') === 'processing') {
      setReturnBanner('processing');
    } else if (params.get('cancelled') === 'true') {
      setReturnBanner('cancelled');
    }
    if (params.get('check') === '1') {
      setIsBalanceOpen(true);
    }
  }, []);

  const syncAriaInvalid = (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement> | React.FormEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const field = event.currentTarget;
    if (field.validity.valid) {
      field.removeAttribute('aria-invalid');
    } else if (event.type === 'blur' && field.value.trim() !== '') {
      field.setAttribute('aria-invalid', 'true');
    }
  };

  const activeAmount = customAmount ? parseInt(customAmount, 10) || 0 : selectedTier;
  const activeTierObj = !customAmount ? VOUCHER_TIERS.find((tier) => tier.amount === selectedTier) : undefined;

  const handleSelectCertificateTier = (amount: number) => {
    setGiftMode('certificate');
    setSelectedTier(amount);
    setCustomAmount('');
  };

  const handleSelectCardPreset = (amount: number) => {
    setGiftMode('card');
    setSelectedTier(amount);
    setCustomAmount('');
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAmount < 100) {
      alert('Please select or enter a valid voucher amount (min ₪100).');
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      const payload: Record<string, unknown> = {
        kind: 'voucher',
        amountIls: activeAmount,
        recipientName,
        recipientEmail: deliveryMethod === 'print' ? '' : recipientEmail,
        senderName,
        senderEmail,
        personalMessage,
      };

      if (giftMode === 'certificate' && activeTierObj) {
        payload.packageId = activeTierObj.packageId;
      }
      if (giftMode === 'card') {
        payload.giftCardDesignId = giftCardDesignId;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setCheckoutError(data.error || 'Unable to start gift voucher checkout. Please try again.');
        return;
      }
      window.location.assign(data.url);
    } catch (error: unknown) {
      // Browser fetch rejects with TypeError on a dropped connection. Give customers
      // an actionable, translated explanation instead of a browser-shaped error.
      const offline =
        error instanceof TypeError || (typeof navigator !== 'undefined' && !navigator.onLine);
      setCheckoutError(
        offline
          ? t.booking.offlineError
          : 'Unable to start gift voucher checkout. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookupCode.trim().toUpperCase();
    if (!trimmed) return;
    setIsCheckingBalance(true);
    setLookupError(null);
    setVerifiedVoucher(null);
    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLookupError(data.error || 'Invalid voucher code.');
        return;
      }
      setVerifiedVoucher(data as VerifiedVoucherInfo);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('simdream_cached_voucher', data.code);
      }
    } catch {
      setLookupError('Unable to check voucher balance right now.');
    } finally {
      setIsCheckingBalance(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-12 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono uppercase tracking-widest mb-4">
            <Gift className="w-3.5 h-3.5" />
            <span>{t.vouchers.giftTeaserBadge}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            {t.vouchers.giftTeaserTitle}
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            {t.vouchers.giftTeaserDesc}
          </p>
        </div>

        {/* Post-Checkout Return Status Banner */}
        {returnBanner === 'processing' && (
          <div
            role="status"
            aria-live="polite"
            className="mb-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 p-5 flex items-start gap-4 text-emerald-200"
          >
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-white">{t.vouchers.purchaseSuccessTitle}</h2>
              <p className="text-sm text-emerald-200/90 mt-1">{t.vouchers.purchaseSuccessDesc}</p>
            </div>
          </div>
        )}

        {returnBanner === 'cancelled' && (
          <div
            role="status"
            aria-live="polite"
            className="mb-8 rounded-2xl bg-amber-500/10 border border-amber-500/40 p-5 flex items-start gap-4 text-amber-200"
          >
            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-white">{t.vouchers.purchaseCancelledTitle}</h2>
              <p className="text-sm text-amber-200/90 mt-1">{t.vouchers.purchaseCancelledDesc}</p>
            </div>
          </div>
        )}

        {/* SMM Gift Format Switcher: Flight Gift Certificate vs Flexible Monetary Gift Card */}
        <div className="mb-10">
          <div className="text-center mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-white">{t.vouchers.formatSectionTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.vouchers.formatSectionSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Option 1: Flight Experience Gift Certificate */}
            <button
              type="button"
              onClick={() => {
                setGiftMode('certificate');
                if (!VOUCHER_TIERS.some((tier) => tier.amount === selectedTier)) {
                  setSelectedTier(DEFAULT_GIFT_CERTIFICATE_AMOUNT);
                }
                setCustomAmount('');
              }}
              aria-pressed={giftMode === 'certificate'}
              className={`text-start p-6 rounded-2xl border transition-all relative overflow-hidden ${
                giftMode === 'certificate'
                  ? 'bg-sky-500/15 border-sky-500 shadow-lg shadow-sky-500/10'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Award className="w-3.5 h-3.5" />
                  {t.vouchers.certOptionBadge}
                </span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    giftMode === 'certificate'
                      ? 'bg-sky-500 border-sky-400 text-slate-950'
                      : 'border-slate-700 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-lg font-extrabold text-white mb-1.5 flex items-center gap-2">
                <Plane className="w-5 h-5 text-sky-400 shrink-0" />
                <span>{t.vouchers.certOptionTitle}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                {t.vouchers.certOptionDesc}
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{t.vouchers.certOptionPerk1}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{t.vouchers.certOptionPerk2}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{t.vouchers.certOptionPerk3}</span>
                </li>
              </ul>
            </button>

            {/* Option 2: Flexible Monetary Gift Card */}
            <button
              type="button"
              onClick={() => {
                setGiftMode('card');
              }}
              aria-pressed={giftMode === 'card'}
              className={`text-start p-6 rounded-2xl border transition-all relative overflow-hidden ${
                giftMode === 'card'
                  ? 'bg-sky-500/15 border-sky-500 shadow-lg shadow-sky-500/10'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  <CreditCard className="w-3.5 h-3.5" />
                  {t.vouchers.cardOptionBadge}
                </span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    giftMode === 'card'
                      ? 'bg-sky-500 border-sky-400 text-slate-950'
                      : 'border-slate-700 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-lg font-extrabold text-white mb-1.5 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-400 shrink-0" />
                <span>{t.vouchers.cardOptionTitle}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                {t.vouchers.cardOptionDesc}
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{t.vouchers.cardOptionPerk1}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{t.vouchers.cardOptionPerk2}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{t.vouchers.cardOptionPerk3}</span>
                </li>
              </ul>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Customization Form */}
          <form onSubmit={handlePurchase} className="lg:col-span-7 space-y-8">
            {/* Step 1: Select Value / Package */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t.vouchers.selectTierTitle}</h2>
                  <p className="text-xs text-slate-400">{t.vouchers.selectTierSubtitle}</p>
                </div>
              </div>

              {/* Certificate Mission Tiers (Always accessible so buyers can pick a package or switch) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {VOUCHER_TIERS.map((tier) => {
                  const isSelected = !customAmount && selectedTier === tier.amount;
                  return (
                    <button
                      type="button"
                      key={tier.amount}
                      onClick={() => handleSelectCertificateTier(tier.amount)}
                      className={`p-4 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-500 shadow-lg shadow-sky-500/10'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {tier.popular && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider">
                          Popular
                        </span>
                      )}
                      <div className="text-xl font-extrabold text-white mb-1" dir="ltr">
                        {formatCurrency(tier.amount)}
                      </div>
                      <div className="text-xs text-slate-300 font-medium">{tier.label}</div>
                    </button>
                  );
                })}
              </div>

              {/* Flexible Gift Card Quick Denominations */}
              {giftMode === 'card' && (
                <div className="mb-5 pt-4 border-t border-slate-800/80">
                  <p className="text-xs font-medium text-slate-300 mb-2.5">{t.vouchers.cardPresetsLabel}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {CARD_PRESETS.map((preset) => {
                      const isPresetSelected = !customAmount && selectedTier === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSelectCardPreset(preset)}
                          className={`py-2.5 px-3 rounded-xl border text-center font-mono font-bold text-sm transition-all ${
                            isPresetSelected
                              ? 'bg-sky-500/15 border-sky-500 text-white'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                          dir="ltr"
                        >
                          {formatCurrency(preset)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Amount Input */}
              <div className="pt-4 border-t border-slate-800">
                <label htmlFor="voucher-custom-amount" className="block text-xs font-medium text-slate-400 mb-2">
                  {t.vouchers.customAmountLabel}
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₪</span>
                  <input
                    id="voucher-custom-amount"
                    name="customAmount"
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    onBlur={syncAriaInvalid}
                    placeholder={t.vouchers.customAmountPlaceholder}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Certificate Price Privacy Toggle (SMM Gift Etiquette Feature) */}
              {giftMode === 'certificate' && (
                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setHidePriceOnCertificate((prev) => !prev)}
                    aria-pressed={hidePriceOnCertificate}
                    className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border text-start transition-all ${
                      hidePriceOnCertificate
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {hidePriceOnCertificate ? (
                        <EyeOff className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Eye className="w-4 h-4 text-sky-400 shrink-0" />
                      )}
                      <span className="text-xs font-medium">{t.vouchers.hidePriceLabel}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                        hidePriceOnCertificate
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-700 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Personalize Details */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t.vouchers.customizeDesignTitle}</h2>
                  <p className="text-xs text-slate-400">{t.vouchers.customizeDesignSubtitle}</p>
                </div>
              </div>

              {/* Delivery Method Cards */}
              <div>
                <p className="text-xs font-medium text-slate-300 mb-2">{t.vouchers.deliveryModeLabel}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('direct')}
                    aria-pressed={deliveryMethod === 'direct'}
                    className={`p-3.5 rounded-xl border text-start transition-all ${
                      deliveryMethod === 'direct'
                        ? 'bg-sky-500/15 border-sky-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs mb-1">
                      <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{t.vouchers.deliveryDirectTitle}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{t.vouchers.deliveryDirectDesc}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('print')}
                    aria-pressed={deliveryMethod === 'print'}
                    className={`p-3.5 rounded-xl border text-start transition-all ${
                      deliveryMethod === 'print'
                        ? 'bg-sky-500/15 border-sky-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs mb-1">
                      <Printer className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span>{t.vouchers.deliveryPrintTitle}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{t.vouchers.deliveryPrintDesc}</p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="voucher-recipient-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.vouchers.recipientNameLabel}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      id="voucher-recipient-name"
                      name="recipientName"
                      type="text"
                      required
                      autoComplete="off"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      onBlur={syncAriaInvalid}
                      placeholder={t.vouchers.recipientNamePlaceholder}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="voucher-recipient-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.vouchers.recipientEmailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      id="voucher-recipient-email"
                      name="recipientEmail"
                      type="email"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      onBlur={syncAriaInvalid}
                      placeholder={t.vouchers.recipientEmailPlaceholder}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{t.vouchers.recipientEmailHint}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="voucher-sender-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.vouchers.senderNameLabel}
                  </label>
                  <input
                    id="voucher-sender-name"
                    name="senderName"
                    type="text"
                    required
                    autoComplete="name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    onBlur={syncAriaInvalid}
                    placeholder={t.vouchers.senderNamePlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label htmlFor="voucher-sender-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.vouchers.senderEmailLabel}
                  </label>
                  <input
                    id="voucher-sender-email"
                    name="senderEmail"
                    type="email"
                    required
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    onBlur={syncAriaInvalid}
                    placeholder={t.vouchers.senderEmailPlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Occasion Quick-Templates + Personal Message */}
              <div>
                <div className="mb-2.5">
                  <span className="block text-xs font-medium text-slate-400 mb-2">
                    {t.vouchers.occasionLabel}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPersonalMessage(t.vouchers.msgBirthday)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-xs text-slate-300 transition-colors"
                    >
                      {t.vouchers.occasionBirthday}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersonalMessage(t.vouchers.msgAnniversary)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-xs text-slate-300 transition-colors"
                    >
                      {t.vouchers.occasionAnniversary}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersonalMessage(t.vouchers.msgGraduation)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-xs text-slate-300 transition-colors"
                    >
                      {t.vouchers.occasionGraduation}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersonalMessage(t.vouchers.msgVip)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-xs text-slate-300 transition-colors"
                    >
                      {t.vouchers.occasionVip}
                    </button>
                  </div>
                </div>

                <label htmlFor="voucher-greeting" className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.vouchers.greetingLabel}
                </label>
                <textarea
                  id="voucher-greeting"
                  name="personalMessage"
                  rows={3}
                  maxLength={200}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {checkoutError && (
              <div
                role="alert"
                className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300 font-medium"
              >
                {checkoutError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-300 text-slate-950 font-bold text-base shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-5 h-5" />
              <span>
                {isSubmitting
                  ? t.vouchers.processing
                  : `${t.vouchers.proceedToPayment} (${formatCurrency(activeAmount)})`}
              </span>
            </button>
            <p className="text-center text-xs text-slate-400 flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t.vouchers.securePaymentNotice}</span>
            </p>
          </form>

          {/* Right Column: Live Boarding Pass Certificate / Gift Card Preview */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>
                {giftMode === 'certificate' ? t.vouchers.livePreviewTitle : t.vouchers.cardPreviewTitle}
              </span>
            </div>

            {giftMode === 'certificate' ? (
              /* Official Boarding Pass Gift Certificate Preview */
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 border-2 border-sky-500/40 shadow-2xl shadow-sky-500/10 overflow-hidden relative">
                {/* Top Header */}
                <div className="bg-gradient-to-r from-sky-600 to-sky-500 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-950/90 flex items-center justify-center">
                      <BrandMark className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black tracking-wider text-slate-950 uppercase">
                        {t.vouchers.officialVoucher}
                      </div>
                      <div className="text-[10px] font-mono text-slate-900 font-semibold" dir="ltr">
                        BOEING 737-8 MAX • GERSHON SHATZ 36 TLV
                      </div>
                    </div>
                  </div>
                  <div className="text-right" dir="ltr">
                    <div className="text-[10px] font-mono uppercase text-slate-900 font-semibold">BOARDING PASS</div>
                    <div className="text-xs font-mono font-bold text-slate-950">SD-VOUCH-PREVIEW</div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                  {/* Mission Package Banner */}
                  <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-sky-400 tracking-wider">
                        {t.vouchers.missionPackageLabel}
                      </div>
                      <div className="text-sm font-extrabold text-white mt-0.5">
                        {activeTierObj ? activeTierObj.label : t.vouchers.tier2Label}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-[10px] font-mono text-slate-300 shrink-0">
                      <Users className="w-3 h-3 text-sky-400" />
                      {t.vouchers.observersIncluded}
                    </span>
                  </div>

                  <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-slate-400">{t.vouchers.passenger}</div>
                      <div className="text-xl font-extrabold text-white mt-0.5">
                        {recipientName || 'Passenger Name'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {t.vouchers.giftFrom}: <span className="text-slate-200 font-medium">{senderName || 'Sender'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono uppercase text-slate-400">{t.vouchers.voucherValue}</div>
                      {hidePriceOnCertificate ? (
                        <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold">
                          <EyeOff className="w-3 h-3" />
                          <span>{t.vouchers.prepaidMissionBadge}</span>
                        </div>
                      ) : (
                        <div className="text-2xl font-black text-sky-400 mt-0.5" dir="ltr">
                          {formatCurrency(activeAmount)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personal Greeting */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 italic text-slate-300 text-xs leading-relaxed">
                    &ldquo;{personalMessage || t.vouchers.defaultMessage}&rdquo;
                  </div>

                  {/* Flight Specs Footer */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">{t.vouchers.aircraftModel}</div>
                      <div className="text-xs font-bold text-white mt-0.5" dir="ltr">
                        B737-8 MAX
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">SEAT</div>
                      <div className="text-xs font-bold text-sky-400 mt-0.5" dir="ltr">
                        1A (CAPTAIN)
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">{t.vouchers.validity}</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">{t.vouchers.validityPeriod}</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Tear Strip */}
                <div className="px-6 py-3 bg-slate-950 border-t border-dashed border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{t.vouchers.validFlightCenter}</span>
                  <span className="text-sky-400" dir="ltr">
                    www.simdream.co.il
                  </span>
                </div>
              </div>
            ) : (
              /* Flexible Monetary Gift Card Preview */
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-orange-500/40 shadow-2xl shadow-orange-500/10 overflow-hidden relative p-6 sm:p-7 space-y-6">
                <GiftCardDesignPicker
                  selectedDesignId={giftCardDesignId}
                  onChange={setGiftCardDesignId}
                  label={t.vouchers.cardDesignLabel}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                      <BrandMark className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-black tracking-wider text-orange-400 uppercase font-mono">
                        {t.vouchers.officialGiftCard}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                        SIM DREAM TEL AVIV • 737 MAX
                      </div>
                    </div>
                  </div>
                  {/* Metallic EMV Chip Aesthetic */}
                  <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 border border-amber-200/60 shadow-inner flex items-center justify-center">
                    <div className="w-7 h-5 rounded-sm border border-slate-950/30" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-slate-300">
                      {t.vouchers.creditBalanceLabel}
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-white mt-1" dir="ltr">
                      {formatCurrency(activeAmount)}
                    </div>
                  </div>
                  <div className="text-right" dir="ltr">
                    <div className="text-[10px] font-mono uppercase text-sky-400">MULTI-USE CREDIT</div>
                    <div className="text-xs font-mono font-bold text-slate-300 mt-1">SD-VOUCH-CARD</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">{t.vouchers.passenger}</div>
                    <div className="text-base font-bold text-white mt-0.5">
                      {recipientName || 'Passenger Name'}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="text-[10px] font-mono uppercase text-slate-400">{t.vouchers.giftFrom}</div>
                    <div className="text-base font-bold text-slate-200 mt-0.5">{senderName || 'Sender'}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 italic text-slate-300 text-xs leading-relaxed">
                  &ldquo;{personalMessage || t.vouchers.defaultMessage}&rdquo;
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>{t.vouchers.cardRedeemableNote}</span>
                  <span className="text-emerald-400 font-mono font-semibold shrink-0 ms-2">
                    {t.vouchers.validityPeriod}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recipient Voucher Balance Check & 1-Click Redemption Drawer */}
        <div className="mt-16 max-w-4xl mx-auto">
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
                    className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-mono font-bold text-emerald-300" dir="ltr">
                        {verifiedVoucher.code}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                        <span>
                          {t.vouchers.balanceAvailable}:{' '}
                          <strong className="text-white font-mono" dir="ltr">
                            {formatCurrency(verifiedVoucher.currentBalanceIls)}
                          </strong>
                        </span>
                        <span>
                          {t.vouchers.balanceInitial}:{' '}
                          <strong className="text-slate-200 font-mono" dir="ltr">
                            {formatCurrency(verifiedVoucher.initialValueIls)}
                          </strong>
                        </span>
                        <span>
                          {t.vouchers.balanceExpires}:{' '}
                          <strong className="text-slate-200 font-mono" dir="ltr">
                            {new Date(verifiedVoucher.expiryDate).toLocaleDateString('en-CA')}
                          </strong>
                        </span>
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
      </div>
    </div>
  );
}
