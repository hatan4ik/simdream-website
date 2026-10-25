'use client';

import React, { useState } from 'react';
import {
  Gift,
  Plane,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

export default function VouchersPage() {
  const { t, isRTL } = useLanguage();
  const [selectedTier, setSelectedTier] = useState<number>(890);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('Aviad Stern');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('Danielle Cohen');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [message, setMessage] = useState<string>(
    'Happy Birthday Aviad! Hope you enjoy commanding the Boeing 737 MAX cockpit in Tel Aviv!'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string>('');

  const predefinedAmounts = [
    { amount: 490, label: t.vouchers.tier1Label },
    { amount: 890, label: t.vouchers.tier2Label },
    { amount: 1290, label: t.vouchers.tier3Label },
    { amount: 1690, label: t.vouchers.tier4Label },
  ];

  const currentAmount = customAmount ? parseInt(customAmount, 10) || 0 : selectedTier;

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAmount || currentAmount < 100) {
      alert('Please select or enter a valid voucher amount (min ₪100).');
      return;
    }

    setIsProcessing(true);
    try {
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'voucher',
          amountIls: currentAmount,
          recipientName,
          recipientEmail,
          senderName,
          senderEmail,
          personalMessage: message,
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutData.url) {
        throw new Error(checkoutData.error || 'Payment could not be started. Your card was not charged.');
      }
      // The voucher code is revealed only after verified payment, never before checkout.
      window.location.href = checkoutData.url;
    } catch (err: unknown) {
      setPurchaseMessage(err instanceof Error ? err.message : 'Payment initialization failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="sky">{t.experiences.giftTeaserBadge}</Badge>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
          {t.experiences.giftTeaserTitle}
        </h1>
        <p className="text-slate-300 text-lg leading-relaxed">
          {t.experiences.giftTeaserDesc}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {purchaseMessage && (
          <p className="lg:col-span-12 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">
            {purchaseMessage}
          </p>
        )}
          {/* Left Column: Voucher Customization Form */}
          <form onSubmit={handlePurchase} className="lg:col-span-7 space-y-8">
            {/* Step 1: Select Amount */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs flex items-center justify-center font-mono">
                    1
                  </span>
                  <span>{t.vouchers.selectTierTitle}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">{t.vouchers.selectTierSubtitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {predefinedAmounts.map((tier) => (
                  <button
                    type="button"
                    key={tier.amount}
                    onClick={() => {
                      setSelectedTier(tier.amount);
                      setCustomAmount('');
                    }}
                    className={`p-4 rounded-xl border text-left rtl:text-right transition-all ${
                      selectedTier === tier.amount && !customAmount
                        ? 'bg-sky-500/10 border-sky-400 shadow-glow'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-2xl font-black text-white font-mono">{formatCurrency(tier.amount)}</p>
                    <p className="text-xs text-slate-400 mt-1">{tier.label}</p>
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="relative pt-2">
                <label className="text-xs font-mono text-slate-400 block mb-1.5">{t.vouchers.customAmountLabel}</label>
                <input
                  type="number"
                  placeholder={t.vouchers.customAmountPlaceholder}
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedTier(0);
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            {/* Step 2: Passenger & Greeting Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs flex items-center justify-center font-mono">
                    2
                  </span>
                  <span>{t.vouchers.customizeDesignTitle}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">{t.vouchers.customizeDesignSubtitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400 uppercase">{t.vouchers.recipientNameLabel}</label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder={t.vouchers.recipientNamePlaceholder}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400 uppercase">{t.vouchers.recipientEmailLabel}</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder={t.vouchers.recipientEmailPlaceholder}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-slate-500">{t.vouchers.recipientEmailHint}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400 uppercase">{t.vouchers.senderNameLabel}</label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder={t.vouchers.senderNamePlaceholder}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400 uppercase">{t.vouchers.senderEmailLabel}</label>
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder={t.vouchers.senderEmailPlaceholder}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase">{t.vouchers.greetingLabel}</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your personal message that will appear on the certificate..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Purchase CTA */}
            <div className="space-y-3">
              <Button
                type="submit"
                size="lg"
                isLoading={isProcessing}
                className="w-full font-bold text-base py-4 shadow-glow"
              >
                <CreditCard className="w-5 h-5" />
                <span>{isProcessing ? t.vouchers.processing : `${t.vouchers.proceedToPayment} (${formatCurrency(currentAmount)})`}</span>
              </Button>
              <p className="text-[11px] text-slate-400 text-center font-mono leading-relaxed">
                {t.vouchers.securePaymentNotice}
              </p>
            </div>
          </form>

          {/* Right Column: Live Certificate Preview */}
          <div className="lg:col-span-5 space-y-4 sticky top-28">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{t.vouchers.livePreviewTitle}</span>
              <Badge variant="sky">{t.vouchers.officialVoucher}</Badge>
            </div>

            {/* Aviation Gift Ticket Card */}
            <div className="rounded-2xl border-2 border-sky-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950/80 p-6 shadow-2xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
                    <Plane className="w-4 h-4 text-white -rotate-45" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm tracking-tight">SIM DREAM LTD</p>
                    <p className="text-[9px] font-mono text-sky-400 uppercase">BOEING 737 MAX TEL AVIV</p>
                  </div>
                </div>
                <div className="text-right rtl:text-left">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">{t.vouchers.voucherValue}</p>
                  <p className="text-xl font-black text-white font-mono">{formatCurrency(currentAmount)}</p>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-4 text-xs">
                <div>
                  <p className="text-[10px] font-mono text-slate-400 uppercase">{t.vouchers.passenger}</p>
                  <p className="text-lg font-bold text-sky-400 tracking-wide">{recipientName || 'PASSENGER NAME'}</p>
                </div>

                <div>
                  <p className="text-[10px] font-mono text-slate-400 uppercase">{t.vouchers.giftFrom}</p>
                  <p className="text-sm font-semibold text-white">{senderName || 'YOUR NAME'}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 italic text-slate-300 text-xs">
                  &ldquo;{message || 'Wishing you smooth skies and full thrust!'}&rdquo;
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
                  <div>
                    <span>{t.vouchers.aircraftModel}: </span>
                    <span className="text-white">B737 MAX 8</span>
                  </div>
                  <div className="text-right rtl:text-left">
                    <span>{t.vouchers.validity}: </span>
                    <span className="text-emerald-400 font-bold">{t.vouchers.validityPeriod}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-mono text-center pt-1 border-t border-slate-800/50">
                  {t.vouchers.validFlightCenter}
                </p>
              </div>

              {/* Barcode Mock */}
              <div className="border-t border-dashed border-slate-800 pt-4 flex items-center justify-between" dir="ltr">
                <div className="font-mono text-[9px] tracking-widest text-slate-500">
                  ||| | | |||| ||| | ||| |||| | | |||
                </div>
                <span className="text-[10px] font-mono text-slate-400">SD-VOUCH-PREVIEW</span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
