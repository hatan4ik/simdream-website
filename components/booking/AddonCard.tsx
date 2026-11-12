'use client';

import type { FlightAddon } from '@/types';
import { formatBookingTemplate } from '@/lib/booking/client';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

interface AddonCardProps {
  /** Unique prefix for the card's element ids (the page's `useId()`). */
  formId: string;
  addon: FlightAddon;
  isChecked: boolean;
  /** Adding it would overflow the selected departure's continuous window. */
  exceedsSlotWindow: boolean;
  maxSlotMinutes: number;
  /** Start time of the selected departure, for the "does not fit" message. */
  startTime: string;
  onToggle: () => void;
}

/** One cockpit upgrade: its name, price and minutes, and a checkbox that is the real control. */
export function AddonCard({ formId, addon, isChecked, exceedsSlotWindow, maxSlotMinutes, startTime, onToggle }: AddonCardProps) {
  const { t } = useLanguage();
  const addonMin = addon.durationMinutes || 0;
  const isMissionModule = addonMin > 0;

  return (
    <div
      onClick={() => !exceedsSlotWindow && onToggle()}
      className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
        exceedsSlotWindow
          ? 'border-slate-800/50 bg-slate-950/40 cursor-not-allowed'
          : isChecked
          ? 'border-sky-400 bg-sky-500/10 shadow-glow cursor-pointer'
          : isMissionModule
          ? 'border-sky-500/30 bg-slate-900/80 hover:border-sky-400/60 cursor-pointer'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 cursor-pointer'
      }`}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <span id={`${formId}-addon-${addon.id}-name`} className="text-base font-bold text-white leading-snug">
            {addon.name}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {addonMin > 0 && (
              <span className="text-xs font-mono font-bold text-sky-300 px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30">
                +{addonMin} {t.booking.minutesShort}
              </span>
            )}
            <span className="text-sm font-mono font-black text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              +{formatCurrency(addon.priceIls)}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{addon.description}</p>
      </div>

      <div className="pt-4 mt-2 border-t border-slate-800/70 flex items-center justify-between text-xs font-mono">
        {exceedsSlotWindow ? (
          <span className="text-amber-400 text-[11px]">
            {formatBookingTemplate(t.booking.addonDoesNotFit, {
              minutes: addonMin,
              maxMinutes: maxSlotMinutes,
              startTime,
            })}
          </span>
        ) : (
          <span className={isChecked ? 'text-sky-400 font-bold' : 'text-slate-400'}>
            {isChecked
              ? `${t.booking.addedToFlight}${addonMin > 0 ? ` (+${addonMin} ${t.booking.minutesShort})` : ''}`
              : t.booking.clickToAdd}
          </span>
        )}
        <input
          id={`${formId}-addon-${addon.id}`}
          type="checkbox"
          aria-labelledby={`${formId}-addon-${addon.id}-name`}
          checked={isChecked}
          disabled={exceedsSlotWindow}
          // The checkbox is the real control (keyboard, switch access, screen readers). The
          // card's onClick remains for pointer users; stopping propagation here keeps one toggle.
          // Deliberately not a <label htmlFor>: a forwarded label click plus the card click would toggle twice.
          onChange={() => !exceedsSlotWindow && onToggle()}
          onClick={(event) => event.stopPropagation()}
          className="rounded border-slate-700 text-sky-500 focus:ring-sky-400 disabled:opacity-40"
        />
      </div>
    </div>
  );
}
