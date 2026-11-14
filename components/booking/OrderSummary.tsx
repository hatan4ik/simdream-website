'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { FlightAddon, FlightSlot, MissionManifestCalculation } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { formatBookingTemplate } from '@/lib/booking/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

interface OrderSummaryProps {
  manifest: MissionManifestCalculation;
  selectedDate: string;
  selectedSlot: FlightSlot | null;
  selectedAddonIds: string[];
  /** The localized catalog the selected add-on ids are resolved against. */
  addons: FlightAddon[];
  /** Optional handler to remove an add-on directly from the summary. */
  onRemoveAddon?: (addonId: string) => void;
  /** The applied voucher, coupon or gift card, if any. Zero `amountIls` hides the line. */
  discount: { amountIls: number; label: string; code: string | undefined };
  /** The payable total shown to the visitor. The server (or the Wix cart) stays authoritative. */
  totalIls: number;
  /**
   * SEAM for an extra discount line (for example a birthday discount). Rendered right after the
   * voucher line and before the code-entry area, as a row styled like the voucher line
   * (`flex justify-between text-emerald-400 font-semibold`). The component that adds a discount
   * must also lower `totalIls` and the server must recompute it; this slot is display only.
   */
  extraDiscountLines?: ReactNode;
  /** The voucher / gift-card redeem area, shown between the price lines and the totals. */
  redeem: ReactNode;
  /** Card footer: the agreements block and the submit button, in that order. */
  children: ReactNode;
}

/** The order-summary card: package, date and time, itemized price, redeem area, total, then the footer. */
export function OrderSummary({
  manifest,
  selectedDate,
  selectedSlot,
  selectedAddonIds,
  addons,
  onRemoveAddon,
  discount,
  totalIls,
  extraDiscountLines,
  redeem,
  children,
}: OrderSummaryProps) {
  const { t } = useLanguage();
  const {
    cleanPackageTitle,
    baseDurationMinutes: baseDuration,
    addonsDurationMinutes: addonsDuration,
    totalDurationMinutes,
    effectiveEndTime,
    basePriceIls: basePrice,
  } = manifest;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 shadow-2xl">
      <div className="border-b border-slate-800 pb-4">
        <Badge variant="sky">{t.booking.orderSummary}</Badge>
        <h3 className="text-xl font-bold text-white mt-2">{cleanPackageTitle}</h3>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="text-xs font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30">
            {totalDurationMinutes} {t.booking.minSessions}
          </span>
          {addonsDuration > 0 && (
            <span className="text-[11px] font-mono text-slate-400">
              {formatBookingTemplate(t.booking.baseAndAddons, { base: baseDuration, addons: addonsDuration })}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 text-xs font-mono text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">{t.bookingSuccess.date}:</span>
          <span className="font-bold text-white">{formatDate(selectedDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{t.bookingSuccess.time}:</span>
          <span className="font-bold text-sky-400" dir="ltr">
            {selectedSlot?.startTime} - {effectiveEndTime || selectedSlot?.endTime} ({totalDurationMinutes}m • IST)
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{t.booking.centerLabel}:</span>
          <span className="text-white">{t.booking.centerAddress}</span>
        </div>
      </div>

      <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs">
        <div className="flex items-center justify-between gap-2 text-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate font-semibold">{t.booking.baseFlight}</span>
            <span className="text-[11px] font-mono text-sky-400 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 shrink-0">
              {baseDuration} {t.booking.minutesShort}
            </span>
          </div>
          <span className="font-mono font-bold shrink-0">{formatCurrency(basePrice)}</span>
        </div>

        {selectedAddonIds.map((addonId) => {
          const addon = addons.find((a) => a.id === addonId);
          if (!addon) return null;
          const addonMin = addon.durationMinutes || 0;
          return (
            <div key={addonId} className="flex items-start justify-between gap-2 text-slate-300">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="leading-snug">+ {addon.name}</span>
                {addonMin > 0 && (
                  <span className="text-[10px] font-mono font-bold text-sky-300 px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 shrink-0">
                    +{addonMin} {t.booking.minutesShort}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-emerald-400 font-semibold">
                  {formatCurrency(addon.priceIls)}
                </span>
                {onRemoveAddon && (
                  <button
                    type="button"
                    onClick={() => onRemoveAddon(addonId)}
                    aria-label={`Remove ${addon.name}`}
                    className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {discount.amountIls > 0 && (
          <div className="flex justify-between text-emerald-400 font-semibold">
            <span>{discount.label} ({discount.code})</span>
            <span className="font-mono">-{formatCurrency(discount.amountIls)}</span>
          </div>
        )}

        {extraDiscountLines}

        {redeem}

        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs font-mono text-slate-300">
            <span>{t.bookingSuccess.duration}:</span>
            <span className="font-bold text-sky-400">
              {totalDurationMinutes} {t.booking.minutesShort} ({selectedSlot?.startTime}–{effectiveEndTime || selectedSlot?.endTime})
            </span>
          </div>

          <div className="flex justify-between items-baseline">
            <span className="text-sm font-bold text-white">{t.booking.totalAmount}</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {formatCurrency(totalIls)}
            </span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
