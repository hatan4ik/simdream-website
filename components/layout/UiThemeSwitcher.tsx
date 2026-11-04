'use client';

import React from 'react';
import { Moon, Sun, Sparkles } from 'lucide-react';
import { useUiTheme, type UiTheme } from '@/lib/theme/ui-theme-context';
import { useLanguage } from '@/lib/i18n/language-context';

// One control cycles the three interfaces; the knob rests at the start, middle or end of its track.
// Track and knob are sized in px, not rem: Clean Studio raises the root font to 17px and the knob
// must travel the same distance in every theme (theme-switch.spec measures it).
const COMPACT_KNOB: Record<UiTheme, string> = {
  cockpit: 'translate-x-0',
  brand: 'translate-x-[7px] rtl:-translate-x-[7px]',
  studio: 'translate-x-[14px] rtl:-translate-x-[14px]',
};
const FULL_KNOB: Record<UiTheme, string> = {
  cockpit: 'translate-x-0',
  brand: 'translate-x-[10px] rtl:-translate-x-[10px]',
  studio: 'translate-x-[20px] rtl:-translate-x-[20px]',
};

export function UiThemeSwitcher({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const { theme, toggleTheme, isBrandTheme, isStudioTheme } = useUiTheme();
  const { t } = useLanguage();
  const names: Record<UiTheme, string> = {
    cockpit: t.uiTheme?.cockpit || 'Cockpit Night',
    brand: t.uiTheme?.brand || 'SimDream Day',
    studio: t.uiTheme?.studio || 'Clean Studio',
  };
  const themeName = names[theme];
  const switchLabel = t.uiTheme?.switchLabel || 'Switch UI Interface';
  const Icon = isStudioTheme ? Sparkles : isBrandTheme ? Sun : Moon;

  if (variant === 'full') {
    // The visible theme name and caption form the accessible name (WCAG 2.5.3 label in name).
    return (
      <button
        type="button"
        data-ui-theme-switcher="full"
        onClick={toggleTheme}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono transition-all group touch-manipulation cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isBrandTheme
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-800 text-sky-400 border border-slate-700'
            }`}
          >
            <Icon className={`w-4 h-4 ${isBrandTheme ? 'text-white' : 'text-sky-400'}`} />
          </div>
          <div className="text-left rtl:text-right">
            <div className="font-bold text-slate-200">{themeName}</div>
            <div className="text-[10px] text-slate-400">{switchLabel}</div>
          </div>
        </div>

        {/* Toggle Indicator Pill */}
        <div
          className={`w-[40px] h-[20px] shrink-0 rounded-full p-[2px] transition-colors duration-200 ease-in-out ${
            isBrandTheme ? 'bg-sky-500' : 'bg-slate-800 border border-slate-700'
          }`}
        >
          <div
            className={`w-[16px] h-[16px] rounded-full bg-white transition-transform duration-200 ease-in-out ${FULL_KNOB[theme]}`}
          />
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-ui-theme-switcher="compact"
      onClick={toggleTheme}
      className="flex shrink-0 items-center gap-2 px-2.5 py-[6px] rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono transition-all duration-200 group shadow-sm touch-manipulation cursor-pointer"
      title={switchLabel}
      // Icon and state pill only: a visible name crowded the header. The full variant (drawer, footer) shows it.
      aria-label={`${themeName}, ${switchLabel}`}
    >
      <div
        className={`w-[20px] h-[20px] shrink-0 rounded flex items-center justify-center transition-colors ${
          isBrandTheme ? 'text-sky-400' : 'text-sky-300'
        }`}
      >
        <Icon
          className={`w-[14px] h-[14px] transition-transform ${
            isStudioTheme
              ? 'text-sky-500 group-hover:scale-110'
              : isBrandTheme
                ? 'text-sky-500 group-hover:rotate-45'
                : 'text-sky-400 group-hover:-rotate-12'
          }`}
        />
      </div>

      {/* Mini state pill. It must not shrink: the knob travels a fixed distance across it. */}
      <div
        className={`w-[28px] h-[14px] shrink-0 rounded-full p-[2px] transition-colors duration-200 ${
          isBrandTheme ? 'bg-sky-500' : 'bg-slate-800 border border-slate-700'
        }`}
      >
        <div className={`w-[10px] h-[10px] rounded-full bg-white transition-transform duration-200 ${COMPACT_KNOB[theme]}`} />
      </div>
    </button>
  );
}
