'use client';

import { ListOrdered, ShoppingCart } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';

/** The calendar-first guided wizard, or the optional desktop one-page Express Shop storefront. */
export type BookingViewMode = 'storefront' | 'wizard';

interface BookingViewSwitcherProps {
  mode: BookingViewMode;
  onChange: (mode: BookingViewMode) => void;
}

/** Top View-Mode Switcher: Amazon-Style 1-Page Express Storefront vs Guided 3-Step Wizard. */
export function BookingViewSwitcher({ mode, onChange }: BookingViewSwitcherProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-slate-800/80">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
          {t.booking.storefrontTitle}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 sm:hidden">
          {t.booking.storefrontSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 w-full sm:w-auto sm:inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 shrink-0 gap-1 sm:gap-0">
        <button
          type="button"
          data-booking-view="storefront"
          onClick={() => onChange('storefront')}
          className={`hidden sm:flex min-h-[40px] px-2.5 sm:px-3.5 py-2 rounded-lg text-[11px] sm:text-xs font-mono font-bold transition-all items-center justify-center gap-1.5 touch-manipulation cursor-pointer ${
            mode === 'storefront'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
          {/* Phones wrap the label onto two lines; wider screens keep one line and clip. */}
          <span className="text-center leading-tight sm:truncate">{t.booking.storefrontView}</span>
        </button>
        <button
          type="button"
          data-booking-view="wizard"
          onClick={() => onChange('wizard')}
          className={`min-h-[44px] px-3 sm:px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer whitespace-nowrap ${
            mode === 'wizard'
              ? 'bg-sky-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5 shrink-0" />
          <span className="text-center leading-tight sm:truncate">{t.booking.wizardView}</span>
        </button>
      </div>
    </div>
  );
}
