'use client';

import React from 'react';
import { Radio, Plane, Wind, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/language-context';

export function LiveMetarBar() {
  const { t, isRTL } = useLanguage();

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800/80 text-[11px] font-mono text-slate-400 py-1.5 px-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Operational Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold tracking-wider uppercase">{t.metar.statusReady}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="hidden sm:flex items-center gap-1 text-slate-300">
            <Plane className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.metar.aircraft}</span>
          </div>
          <span className="hidden sm:inline text-slate-600">|</span>
          <div className="hidden md:flex items-center gap-1 text-slate-300">
            <Radio className="w-3 h-3 text-sky-400" />
            <span>{t.metar.tower}</span>
          </div>
        </div>

        {/* Center: Live METAR Telemetry (Locked to LTR for standard aviation syntax) */}
        <div className="flex items-center gap-3">
          <div dir="ltr" className="flex items-center gap-1.5 text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-900/50 font-mono text-[11px]">
            <Wind className="w-3 h-3 text-sky-400" />
            <span>LLBG 240/12KT 9999 CAVOK 26/19 Q1014</span>
          </div>
          <Link
            href="/book"
            className="hidden lg:flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
          >
            <span>{t.metar.nextSlot}</span>
            <ChevronRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>
        </div>
      </div>
    </div>
  );
}
