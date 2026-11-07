'use client';

import React from 'react';
import { Radio, Plane, Wind, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/language-context';
import { LanguageSelector } from './LanguageSelector';
import { SOCIAL_CHANNELS } from './social-channels';
import { WhatsAppAction } from './WhatsAppAction';

export function LiveMetarBar() {
  const { t, isRTL } = useLanguage();

  return (
    <aside
      data-site-utility-bar
      aria-label={t.metar.statusReady}
      className="relative z-[60] w-full bg-slate-950 border-b border-slate-800/80 text-[10px] sm:text-[11px] font-mono text-slate-400 px-3 sm:px-4"
    >
      <div className="max-w-7xl mx-auto flex min-h-11 items-center justify-between gap-1 sm:gap-3">
        {/* Left: Operational Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Both halves shrink and truncate: on a 320px phone the status ran under the METAR pill. */}
          <div className="flex items-center gap-1.5 text-emerald-400 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold tracking-wider uppercase truncate">{t.metar.statusReady}</span>
          </div>
          <span className="hidden sm:inline text-slate-600">|</span>
          <div className="hidden sm:flex items-center gap-1 text-slate-300">
            <Plane className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.metar.aircraft}</span>
          </div>
          <span className="hidden md:inline text-slate-600">|</span>
          <div className="hidden md:flex items-center gap-1 text-slate-300">
            <Radio className="w-3 h-3 text-sky-400" />
            <span>{t.metar.tower}</span>
          </div>
        </div>

        {/* Flight telemetry stays LTR. The language and social actions live here—not in a
            collapsible menu—so they remain available at every viewport width. */}
        <div className="flex items-center gap-0.5 sm:gap-2 min-w-0 shrink-0">
          <div dir="ltr" className="hidden lg:flex items-center gap-1.5 text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-900/50 font-mono text-[10px] sm:text-[11px] min-w-0 max-w-[180px] sm:max-w-none truncate">
            <Wind className="w-3 h-3 text-sky-400 shrink-0" />
            <span className="truncate">LLBG 240/12KT 9999 CAVOK 26/19 Q1014</span>
          </div>
          <Link
            href="/book"
            className="hidden lg:flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors shrink-0"
          >
            <span>{t.metar.nextSlot}</span>
            <ChevronRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>
          <div data-top-bar-social-links className="flex shrink-0 items-center">
            {SOCIAL_CHANNELS.map(({ name, href, icon: Icon, iconClassName, hoverClassName }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-top-bar-social-link={name.toLowerCase()}
                aria-label={name}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 touch-manipulation ${iconClassName} ${hoverClassName}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </div>
          <WhatsAppAction />
          <LanguageSelector />
        </div>
      </div>
    </aside>
  );
}
