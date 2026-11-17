'use client';

import React, { useEffect, useState } from 'react';
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
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { getLocalizedPackages } from '@/lib/i18n/translations';
import { useCustomerContactSeed } from '@/lib/customer/customer-draft';
import { VoucherSenderFields } from '@/components/vouchers/VoucherSenderFields';
import { VoucherBalanceCheckDrawer } from '@/components/vouchers/VoucherBalanceCheckDrawer';
import {
  DEFAULT_GIFT_CERTIFICATE_AMOUNT,
  giftCertificateAmount,
  orderGiftCertificatePackages,
  type GiftCertificatePackageId,
} from '@/lib/catalog/gift-voucher-packages';
import { BrandMark } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/Button';
import { GiftCardDesignPicker } from '@/components/vouchers/GiftCardDesignPicker';
import {
  DEFAULT_GIFT_CARD_DESIGN_ID,
  GIFT_CARD_DESIGNS,
  getGiftCardDesign,
  giftCardDesignForAmount,
  type GiftCardDesignId,
} from '@/lib/catalog/gift-card-designs';

type GiftFormatMode = 'certificate' | 'card';

/**
 * A Gift Card carries an open NIS balance. Keep this intentionally separate
 * from the named flight-certificate amounts below: a buyer should never see a
 * flight package selected as the monetary-card default. Each preset is the balance of one card
 * design, so the quick-select chips, the card colours and the credit shown are one choice.
 */
const GIFT_CARD_PRESETS = GIFT_CARD_DESIGNS.map((design) => design.amountIls);
const DEFAULT_GIFT_CARD_AMOUNT = 100;
const POPULAR_GIFT_CARD_AMOUNT = 200;
const INITIAL_GIFT_CARD_DESIGN_ID = giftCardDesignForAmount(DEFAULT_GIFT_CARD_AMOUNT)?.id ?? DEFAULT_GIFT_CARD_DESIGN_ID;

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

  const [giftMode, setGiftMode] = useState<GiftFormatMode>('certificate');
  const [selectedCertificateAmount, setSelectedCertificateAmount] = useState<number>(
    DEFAULT_GIFT_CERTIFICATE_AMOUNT
  );
  const [hidePriceOnCertificate, setHidePriceOnCertificate] = useState<boolean>(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'direct' | 'print'>('direct');
  const [giftCardDesignId, setGiftCardDesignId] = useState<GiftCardDesignId>(INITIAL_GIFT_CARD_DESIGN_ID);

  // Real names are the buyer's to type; the preview shows a labelled sample until they do (never a pre-filled value).
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [personalMessage, setPersonalMessage] = useState(t.vouchers.defaultMessage);

  const { draft: customerDraft, updateCustomerDraft } = useCustomerContactSeed((contact) => {
    setSenderName((current) => current || contact.fullName);
    setSenderEmail((current) => current || contact.email);
    setSenderPhone((current) => current || contact.phone);
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [returnBanner, setReturnBanner] = useState<'processing' | 'cancelled' | null>(null);

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

  // A card design is sold at one balance, so the design is the Gift Card's selected amount.
  const selectedGiftCardAmount = getGiftCardDesign(giftCardDesignId).amountIls;
  // There is no custom amount: a certificate is a named package and a Gift Card is one of the preset balances.
  const activeAmount = giftMode === 'certificate' ? selectedCertificateAmount : selectedGiftCardAmount;
  const activeTierObj =
    giftMode === 'certificate' ? VOUCHER_TIERS.find((tier) => tier.amount === selectedCertificateAmount) : undefined;

  const isCardMode = giftMode === 'card';
  // The he-IL currency format embeds right-to-left marks that add a stray gap inside the button label.
  const checkoutAmount = formatCurrency(activeAmount).replace(/[\u200e\u200f]/g, '');
  // The Gift Card flow has its own step copy; the certificate flow keeps the original strings.
  const detailsTitle = isCardMode ? t.vouchers.cardDetailsTitle : t.vouchers.customizeDesignTitle;
  const detailsSubtitle = isCardMode ? t.vouchers.cardDetailsSubtitle : t.vouchers.customizeDesignSubtitle;

  const selectCertificateFormat = () => setGiftMode('certificate');

  const selectGiftCardFormat = () => setGiftMode('card');

  const handleSelectCertificateTier = (amount: number) => {
    selectCertificateFormat();
    setSelectedCertificateAmount(amount);
  };

  const handleSelectCardPreset = (amount: number) => {
    selectGiftCardFormat();
    const design = giftCardDesignForAmount(amount);
    if (design) setGiftCardDesignId(design.id);
  };

  const handleSelectGiftCardDesign = (designId: GiftCardDesignId) => setGiftCardDesignId(designId);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();

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
        senderPhone,
        ...( /^\d{4}-\d{2}-\d{2}$/.test(customerDraft.birthDate) ? { senderBirthDate: customerDraft.birthDate } : {} ),
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

  return (
    <div className="min-h-dvh bg-slate-950 pt-12 pb-24">
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
              onClick={selectCertificateFormat}
              aria-pressed={giftMode === 'certificate'}
              className={`text-start p-6 rounded-2xl border transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 relative overflow-hidden ${
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
              onClick={selectGiftCardFormat}
              aria-pressed={giftMode === 'card'}
              className={`text-start p-6 rounded-2xl border transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 relative overflow-hidden ${
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
          <form onSubmit={handlePurchase} className="grid grid-cols-1 gap-y-8 lg:col-span-12 lg:grid-cols-12 lg:items-start lg:gap-x-12 lg:gap-y-0">
            {isCardMode ? (
              /* Gift Card step 1: a quick-select credit balance. There is no flight-package value picker here. */
              <div
                data-voucher-section="balance"
                className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div data-voucher-step-badge className="w-8 h-8 shrink-0 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-sm">
                    1
                  </div>
                  <div className="min-w-0">
                    <h2 id="voucher-card-balance-heading" className="text-lg font-bold text-white">
                      {t.vouchers.cardPresetsLabel}
                    </h2>
                    <p className="text-xs text-slate-400">{t.vouchers.cardPresetsSubtitle}</p>
                  </div>
                </div>

                {/* Flexible Gift Card Quick Denominations: one chip per card design; on a phone the odd last chip spans the row. */}
                <div
                  role="group"
                  aria-labelledby="voucher-card-balance-heading"
                  data-gift-card-presets
                  className="grid grid-cols-2 sm:grid-cols-4 gap-x-2.5 gap-y-4 pt-2 mb-5"
                >
                  {GIFT_CARD_PRESETS.map((preset) => {
                    const isPresetSelected = selectedGiftCardAmount === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSelectCardPreset(preset)}
                        aria-pressed={isPresetSelected}
                        className={`relative max-sm:last:col-span-2 min-h-11 py-2.5 px-3 rounded-xl border text-center font-mono font-bold text-sm transition-[background-color,border-color,box-shadow,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                          isPresetSelected
                            ? 'bg-sky-500/15 border-sky-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                        dir="ltr"
                      >
                        {preset === POPULAR_GIFT_CARD_AMOUNT && (
                          <span
                            data-gift-card-popular
                            className="absolute -top-2.5 end-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-sans font-bold text-xs leading-none tracking-wide uppercase"
                            dir={isRTL ? 'rtl' : 'ltr'}
                          >
                            {t.vouchers.popularBadge}
                          </span>
                        )}
                        {formatCurrency(preset)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Certificate step 1: choose a named flight package or a custom value. */
              <div
                data-voucher-section="value"
                className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div data-voucher-step-badge className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-sm">
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
                    const isSelected =
                      giftMode === 'certificate' && selectedCertificateAmount === tier.amount;
                    return (
                      <button
                        type="button"
                        key={tier.amount}
                        onClick={() => handleSelectCertificateTier(tier.amount)}
                        aria-pressed={isSelected}
                        className={`p-4 rounded-xl border text-left transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 relative ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500 shadow-lg shadow-sky-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {tier.popular && (
                          <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider">
                            {t.vouchers.popularBadge}
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
            )}

              {/* Live preview: beside the form on desktop (right column, sticky), between step 1 and step 2 on phones. */}
              <div data-voucher-preview className="lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-5 lg:self-start lg:sticky lg:top-24">
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
                          {recipientName || t.vouchers.previewSampleRecipient}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {t.vouchers.giftFrom}: <span className="text-slate-200 font-medium">{senderName || t.vouchers.previewSampleSender}</span>
                        </div>
                        {(!recipientName || !senderName) && (
                          <p data-voucher-preview-sample className="mt-1.5 text-[11px] text-amber-300">
                            {t.vouchers.previewSampleLabel}
                          </p>
                        )}
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
                <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-orange-500/40 shadow-2xl shadow-orange-500/10 overflow-clip relative">
                  <GiftCardDesignPicker
                    selectedDesignId={giftCardDesignId}
                    onChange={handleSelectGiftCardDesign}
                    label={t.vouchers.cardDesignLabel}
                  />

                  <div className="p-5 sm:p-6 pt-2 space-y-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                          <BrandMark className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black tracking-wider text-orange-400 uppercase font-mono">
                            {t.vouchers.officialGiftCard}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                            SIM DREAM TEL AVIV • 737 MAX
                          </div>
                        </div>
                      </div>
                      {/* Metallic EMV Chip Aesthetic */}
                      <div className="w-11 h-8 shrink-0 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 border border-amber-200/60 shadow-inner flex items-center justify-center">
                        <div className="w-7 h-5 rounded-sm border border-slate-950/30" />
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-300">
                          {t.vouchers.creditBalanceLabel}
                        </div>
                        <div data-gift-card-credit className="text-3xl sm:text-4xl font-black text-white mt-1" dir="ltr">
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
                          {recipientName || t.vouchers.previewSampleRecipient}
                        </div>
                        {(!recipientName || !senderName) && (
                          <p data-voucher-preview-sample className="mt-1 text-[11px] text-amber-300">
                            {t.vouchers.previewSampleLabel}
                          </p>
                        )}
                      </div>
                      <div className="text-end">
                        <div className="text-[10px] font-mono uppercase text-slate-400">{t.vouchers.giftFrom}</div>
                        <div className="text-base font-bold text-slate-200 mt-0.5">{senderName || t.vouchers.previewSampleSender}</div>
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
                </div>
              )}
            </div>

            {/* Step 2: Personalize Details (Gift Cards carry their own title and subtitle) */}
            <div
              data-voucher-section="details"
              className="lg:col-span-7 lg:mt-8 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div data-voucher-step-badge className="w-8 h-8 shrink-0 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-sm">
                  2
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white">{detailsTitle}</h2>
                  <p className="text-xs text-slate-400">{detailsSubtitle}</p>
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
                      autoComplete="section-recipient name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      onBlur={syncAriaInvalid}
                      placeholder={t.vouchers.recipientNamePlaceholder}
                      className="w-full max-sm:min-h-11 pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
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
                      autoComplete="section-recipient email"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      onBlur={syncAriaInvalid}
                      placeholder={t.vouchers.recipientEmailPlaceholder}
                      className="w-full max-sm:min-h-11 pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{t.vouchers.recipientEmailHint}</p>
                </div>
              </div>

              <VoucherSenderFields
                senderName={senderName}
                onSenderNameChange={(value) => { setSenderName(value); updateCustomerDraft({ fullName: value }); }}
                senderEmail={senderEmail}
                onSenderEmailChange={(value) => { setSenderEmail(value); updateCustomerDraft({ email: value }); }}
                senderPhone={senderPhone}
                onSenderPhoneChange={(value) => { setSenderPhone(value); updateCustomerDraft({ phone: value }); }}
                onFieldBlur={syncAriaInvalid}
              />

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
                      className="max-sm:min-h-11 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-xs text-slate-300 transition-colors"
                    >
                      {t.vouchers.occasionBirthday}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersonalMessage(t.vouchers.msgAnniversary)}
                      className="max-sm:min-h-11 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-xs text-slate-300 transition-colors"
                    >
                      {t.vouchers.occasionAnniversary}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersonalMessage(t.vouchers.msgGraduation)}
                      className="max-sm:min-h-11 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-xs text-slate-300 transition-colors"
                    >
                      {t.vouchers.occasionGraduation}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersonalMessage(t.vouchers.msgVip)}
                      className="max-sm:min-h-11 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-xs text-slate-300 transition-colors"
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
                  className="w-full max-sm:min-h-11 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {checkoutError && (
              <div
                role="alert"
                className="lg:col-span-7 lg:mt-8 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300 font-medium"
              >
                {checkoutError}
              </div>
            )}

            {/* The site's primary action pill, the same component as the navbar Book button and the /book checkout. */}
            <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full lg:col-span-7 lg:mt-8">
              <CreditCard className="w-5 h-5" />
              <span>
                {isSubmitting ? (
                  t.vouchers.processing
                ) : (
                  <>
                    {t.vouchers.proceedToPayment} (<bdi dir="ltr">{checkoutAmount}</bdi>)
                  </>
                )}
              </span>
            </Button>
            <p className="lg:col-span-7 lg:mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t.vouchers.securePaymentNotice}</span>
            </p>
          </form>
        </div>

        {/* Recipient Voucher Balance Check & 1-Click Redemption Drawer */}
        <VoucherBalanceCheckDrawer />
      </div>
    </div>
  );
}
