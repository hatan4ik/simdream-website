'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';
import { CockpitMediaFrame } from '@/components/ui/CockpitMediaFrame';
import { buttonClassName } from '@/components/ui/Button';
import { WORLD_ROUTES, EXPERIENCE_ROUTES_COPY } from '@/lib/data/experience-routes';
import {
  EXPERIENCE_ROUTE_SCENARIOS,
  pickLocalizedMediaText,
} from '@/lib/media/cockpit-media';
import { useLanguage } from '@/lib/i18n/language-context';

/**
 * Interactive cockpit visual switcher for `/experiences#world-routes`.
 * Pairs route briefings (`VHHX • RWY 13`, `VQPR • RWY 15`, `LOWI • RWY 08`)
 * with approved SimDream cockpit context and registry-owned localized copy from `WORLD_ROUTES`.
 * The visible note keeps a generic cockpit photo from being mistaken for airport photography.
 * Text, scenario metadata, and booking CTA remain fully usable without hover, video, or JS.
 */
export function RouteVisualShowcase() {
  const { language, isRTL } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeScenario = EXPERIENCE_ROUTE_SCENARIOS[selectedIndex] ?? EXPERIENCE_ROUTE_SCENARIOS[0];
  const extremeRoute = WORLD_ROUTES.find((r) => r.id === activeScenario.routeId) ?? WORLD_ROUTES[0];
  const routeCopy = extremeRoute.copy[language] || extremeRoute.copy.en;
  const airportCopy = routeCopy.airports[activeScenario.airportIndex];
  const routesUiCopy = EXPERIENCE_ROUTES_COPY[language] || EXPERIENCE_ROUTES_COPY.en;
  const illustrativeNote = pickLocalizedMediaText(activeScenario.illustrativeNote, language);

  const bookHref = `/book?package=captains-command-60&addons=addon-extreme-airports&route=${encodeURIComponent(extremeRoute.id)}`;

  return (
    <div
      data-route-visual-showcase
      className="max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-5"
    >
      {/* Scenario Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-400 font-bold">
          <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{routeCopy.title}</span>
        </div>

        <div
          role="group"
          aria-label={routeCopy.title}
          className="flex flex-wrap items-center gap-2"
        >
          {EXPERIENCE_ROUTE_SCENARIOS.map((scenario, idx) => {
            const isActive = idx === selectedIndex;
            return (
              <button
                key={scenario.id}
                type="button"
                dir="ltr"
                aria-pressed={isActive}
                onClick={() => setSelectedIndex(idx)}
                className={`min-h-[44px] px-3.5 py-2 rounded-full font-mono text-xs tabular-nums font-bold tracking-wider transition-colors touch-manipulation cursor-pointer border focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isActive
                    ? 'bg-sky-700 text-white border-sky-700'
                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-sky-400 hover:text-white'
                }`}
              >
                {scenario.runwayTag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Framed Visual + Factual Localized Scenario Readout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-7 space-y-2">
          <CockpitMediaFrame
            media={activeScenario.media}
            alt={pickLocalizedMediaText(activeScenario.media.alt, language)}
            caption={airportCopy.name}
          />
          <p
            data-route-visual-illustrative-note
            className="text-xs leading-relaxed text-slate-400 text-start"
          >
            {illustrativeNote}
          </p>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-xs tabular-nums font-bold text-sky-400" dir="ltr">
            <span>{activeScenario.runwayTag}</span>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
              {airportCopy.name}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {airportCopy.sight}
            </p>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
            {routeCopy.tagline}
          </p>

          <div className="pt-1">
            <Link
              href={bookHref}
              data-ui-control="button"
              data-button-variant="outline"
              className={buttonClassName('outline', 'md')}
            >
              <span>{routesUiCopy.bookTrioCta}</span>
              <ArrowRight
                aria-hidden="true"
                className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`}
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
