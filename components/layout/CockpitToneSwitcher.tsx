'use client';

import React from 'react';
import {
  COCKPIT_TONE_COLORS,
  COCKPIT_TONE_ORDER,
  useUiTheme,
  type CockpitTone,
} from '@/lib/theme/ui-theme-context';
import { useLanguage } from '@/lib/i18n/language-context';

interface CockpitToneSwitcherProps {
  variant?: 'compact' | 'full';
}

function getToneLabel(tone: CockpitTone, uiTheme: {
  toneClassic: string;
  toneCobalt: string;
  toneSquadron: string;
}): string {
  switch (tone) {
    case 'cobalt':
      return uiTheme.toneCobalt;
    case 'squadron':
      return uiTheme.toneSquadron;
    default:
      return uiTheme.toneClassic;
  }
}

/**
 * Compact 3-tone palette selector for Cockpit Night: Classic (#070b14),
 * Warmer Cobalt-Navy (#0C1A33), and Squadron Mid-Navy (#102547).
 */
export function CockpitToneSwitcher({ variant = 'compact' }: CockpitToneSwitcherProps) {
  const { theme, cockpitTone, setCockpitTone, cycleCockpitTone } = useUiTheme();
  const { t } = useLanguage();
  const isCockpitActive = theme === 'cockpit';
  const activeLabel = getToneLabel(cockpitTone, t.uiTheme);

  if (variant === 'full') {
    return (
      <div
        data-cockpit-tone-switcher="full"
        role="group"
        aria-label={t.uiTheme.switchToneLabel}
        className="space-y-1.5"
      >
        <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {t.uiTheme.toneLabel}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {COCKPIT_TONE_ORDER.map((tone) => {
            const selected = isCockpitActive && cockpitTone === tone;
            const palette = COCKPIT_TONE_COLORS[tone];
            const label = getToneLabel(tone, t.uiTheme);
            return (
              <button
                key={tone}
                type="button"
                onClick={() => setCockpitTone(tone)}
                aria-pressed={selected}
                data-cockpit-tone-option={tone}
                className={`min-h-11 flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-medium transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  selected
                    ? 'border-sky-400 bg-sky-500/20 text-white'
                    : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-3.5 w-3.5 shrink-0 rounded-full overflow-hidden border border-white/30"
                  style={{
                    background: `linear-gradient(135deg, ${palette.canvas} 50%, ${palette.card} 50%)`,
                  }}
                />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const nextTone: CockpitTone = isCockpitActive
    ? COCKPIT_TONE_ORDER[(COCKPIT_TONE_ORDER.indexOf(cockpitTone) + 1) % COCKPIT_TONE_ORDER.length]
    : cockpitTone === 'classic'
      ? 'cobalt'
      : cockpitTone;
  const nextLabel = getToneLabel(nextTone, t.uiTheme);
  const compactAriaLabel = isCockpitActive
    ? `${t.uiTheme.switchToneLabel}: ${activeLabel}`
    : `${t.uiTheme.switchToneLabel} (${nextLabel})`;

  return (
    <button
      type="button"
      onClick={cycleCockpitTone}
      aria-label={compactAriaLabel}
      aria-pressed={isCockpitActive}
      title={`${t.uiTheme.toneLabel}: ${activeLabel}`}
      data-cockpit-tone-switcher="compact"
      data-active-cockpit-tone={cockpitTone}
      data-cockpit-active={isCockpitActive ? 'true' : 'false'}
      className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-2 transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
        isCockpitActive
          ? 'border-sky-400/70 bg-slate-900/80 hover:border-sky-400 hover:bg-slate-800'
          : 'border-slate-700 bg-slate-900/80 hover:border-slate-500 hover:bg-slate-800'
      }`}
    >
      {COCKPIT_TONE_ORDER.map((tone) => {
        const isSelected = cockpitTone === tone;
        const palette = COCKPIT_TONE_COLORS[tone];
        return (
          <span
            key={tone}
            aria-hidden="true"
            className={`inline-block rounded-full transition-transform ${
              isSelected
                ? isCockpitActive
                  ? 'h-3 w-3 ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-950 scale-105'
                  : 'h-2.5 w-2.5 ring-1 ring-sky-500/80'
                : 'h-2.5 w-2.5 opacity-80'
            }`}
            style={{
              backgroundColor: palette.canvas,
              border: '1px solid rgba(148, 163, 184, 0.55)',
            }}
          />
        );
      })}
    </button>
  );
}
