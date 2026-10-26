'use client';

import React from 'react';
import { Moon, Sun, Sparkles } from 'lucide-react';
import { useUiTheme } from '@/lib/theme/ui-theme-context';
import { useLanguage } from '@/lib/i18n/language-context';

export function UiThemeSwitcher({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const { theme, toggleTheme, isBrandTheme } = useUiTheme();
  const { t } = useLanguage();
  const themeName = isBrandTheme ? (t.uiTheme?.brand || 'SimDream Day') : (t.uiTheme?.cockpit || 'Cockpit Night');
  const switchLabel = t.uiTheme?.switchLabel || 'Switch UI Interface';

  if (variant === 'full') {
    // The visible theme name and caption form the accessible name (WCAG 2.5.3 label in name).
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isBrandTheme
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-800 text-sky-400 border border-slate-700'
            }`}
          >
            {isBrandTheme ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-sky-400" />}
          </div>
          <div className="text-left rtl:text-right">
            <div className="font-bold text-slate-200">
              {isBrandTheme
                ? (t.uiTheme?.brand || 'SimDream Day')
                : (t.uiTheme?.cockpit || 'Cockpit Night')}
            </div>
            <div className="text-[10px] text-slate-400">
              {t.uiTheme?.switchLabel || 'Switch UI Interface'}
            </div>
          </div>
        </div>

        {/* Toggle Indicator Pill */}
        <div
          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
            isBrandTheme ? 'bg-sky-500' : 'bg-slate-800 border border-slate-700'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
              isBrandTheme ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono transition-all duration-200 group shadow-sm"
      title={switchLabel}
      // Starts with the visible theme name, which is hidden on phones where the button is icon-only.
      aria-label={`${themeName}, ${switchLabel}`}
    >
      <div
        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
          isBrandTheme ? 'text-sky-400' : 'text-sky-300'
        }`}
      >
        {isBrandTheme ? (
          <Sun className="w-3.5 h-3.5 text-sky-500 group-hover:rotate-45 transition-transform" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-sky-400 group-hover:-rotate-12 transition-transform" />
        )}
      </div>

      <span className="hidden sm:inline-block font-semibold text-[11px] text-slate-200">
        {isBrandTheme
          ? (t.uiTheme?.brand || 'SimDream Day')
          : (t.uiTheme?.cockpit || 'Cockpit Night')}
      </span>

      {/* Mini state pill */}
      <div
        className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-200 ${
          isBrandTheme ? 'bg-sky-500' : 'bg-slate-800 border border-slate-700'
        }`}
      >
        <div
          className={`w-2.5 h-2.5 rounded-full bg-white transition-transform duration-200 ${
            isBrandTheme ? 'translate-x-3.5 rtl:-translate-x-3.5' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  );
}

