'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Clock,
  CloudLightning,
  Compass,
  Globe,
  GraduationCap,
  MapPin,
  Plane,
  Quote,
  Sparkles,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { FLIGHT_ADDONS } from '@/lib/db/seed-data';
import {
  ADVENTURES,
  EXPERIENCE_ROUTES_COPY,
  ROUTE_REGIONS,
  WORLD_ROUTES,
  countRouteAirports,
  type RouteRegion,
  type WorldRoute,
} from '@/lib/data/experience-routes';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { AddonIconName } from '@/types';

const ICONS: Record<AddonIconName, LucideIcon> = {
  Zap,
  CloudLightning,
  Compass,
  Globe,
  Video,
  BookOpen,
  Users,
  GraduationCap,
};

/** Price and extra cockpit minutes always come from the authoritative add-on catalog. */
function addonFor(route: WorldRoute) {
  return route.addonId ? FLIGHT_ADDONS.find((addon) => addon.id === route.addonId) : undefined;
}

function requestHref(route: WorldRoute): string {
  const params = new URLSearchParams({
    package: 'captains-command-60',
    route: route.id,
  });
  return `/book?${params.toString()}`;
}

/** Scenario adventures remain a briefing inquiry; they do not reserve a World Trio slot. */
function adventureInquiryHref(id: string): string {
  return `/contact?subject=route&route=${encodeURIComponent(id)}`;
}

/** A bookable World Trio is an actual order line, never just a booking-page suggestion. */
function bookHref(route: WorldRoute): string {
  const addon = addonFor(route);
  if (!addon) return requestHref(route);

  const params = new URLSearchParams({
    package: 'captains-command-60',
    addons: addon.id,
    route: route.id,
  });
  return `/book?${params.toString()}`;
}

/**
 * Experience Flights ("טיסות חוויה"): the World Trio route catalog and flight adventures,
 * written in the captain's voice. Rendered on /experiences under the package grid.
 */
export function WorldRoutesSection() {
  const { language, isRTL } = useLanguage();
  const copy = EXPERIENCE_ROUTES_COPY[language] || EXPERIENCE_ROUTES_COPY.en;
  const [region, setRegion] = useState<RouteRegion | 'all'>('all');

  const visibleRoutes = useMemo(
    () => (region === 'all' ? WORLD_ROUTES : WORLD_ROUTES.filter((route) => route.region === region)),
    [region]
  );
  const airportCount = countRouteAirports();
  const arrowFlip = isRTL ? 'rotate-180' : '';

  return (
    <section id="world-routes" aria-labelledby="world-routes-title" className="space-y-10 scroll-mt-24">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="sky">{copy.badge}</Badge>
        <h2 id="world-routes-title" className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {copy.title}
        </h2>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{copy.subtitle}</p>
      </div>

      {/* Captain's introduction */}
      <figure className="mx-auto max-w-3xl rounded-2xl border border-orange-500/30 bg-slate-900/60 p-5 sm:p-6 flex gap-4 items-start">
        <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-500">
          <Plane className="h-5 w-5" aria-hidden="true" />
        </div>
        <blockquote className="text-slate-200 text-sm sm:text-base leading-relaxed italic">{copy.captainIntro}</blockquote>
      </figure>

      {/* Stats */}
      <dl className="grid grid-cols-3 gap-3 max-w-3xl mx-auto text-center">
        {[
          { value: String(WORLD_ROUTES.length), label: copy.statsRoutes },
          { value: String(airportCount), label: copy.statsAirports },
          { value: '24,000+', label: copy.statsWorldwide },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900/60 px-2 py-3 sm:py-4">
            <dt className="order-2 text-[11px] sm:text-xs uppercase tracking-wider text-slate-400 leading-tight">{stat.label}</dt>
            <dd className="text-xl sm:text-3xl font-black text-sky-400 font-mono" dir="ltr">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Region filter */}
      <div role="group" aria-label={copy.filterAll} className="flex flex-wrap items-center justify-center gap-2">
        {(['all', ...ROUTE_REGIONS] as const).map((value) => {
          const active = region === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setRegion(value)}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all min-h-[44px] touch-manipulation cursor-pointer ${
                active
                  ? 'bg-sky-700 text-white shadow-glow'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {value === 'all' ? copy.filterAll : copy.regions[value]}
            </button>
          );
        })}
      </div>

      {/* Visual Explainer: Included Routes vs. Extended Missions */}
      <div className="max-w-4xl mx-auto rounded-2xl border border-sky-500/20 bg-gradient-to-b from-sky-950/20 via-slate-900/60 to-slate-950/80 p-5 sm:p-6 space-y-4">
        <div className="text-center space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center justify-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>{copy.howItWorksTitle}</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            {copy.howItWorksSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold">
                ✓
              </span>
              <h4 className="text-sm font-bold text-white">{copy.includedPillarTitle}</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {copy.includedPillarDesc}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                +
              </span>
              <h4 className="text-sm font-bold text-white">{copy.extendedPillarTitle}</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {copy.extendedPillarDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Trio cards */}
      <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 list-none p-0 m-0" data-world-routes>
        {visibleRoutes.map((route) => {
          const text = route.copy[language] || route.copy.en;
          const addon = addonFor(route);
          const Icon = ICONS[route.icon];
          const difficultyText = copy.difficultyLevels[route.difficulty];
          return (
            <li key={route.id} className="min-w-0">
              <Card
                borderAccent={addon ? 'sky' : 'none'}
                // No backdrop blur: with 22 cards on a 7,000px section, WebKit without a GPU
                // (the CI runner) rasterises each blur per repaint, stalls, and crashes.
                className="h-full flex flex-col gap-5 backdrop-blur-none"
                data-world-route={route.id}
                data-route-status={addon ? 'bookable' : 'on_request'}
              >
                {/* Region + status */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-sky-400 uppercase tracking-wider min-w-0">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="leading-tight">{copy.regions[route.region]}</span>
                  </div>
                  {addon ? (
                    <Badge variant="emerald" className="shrink-0">
                      {copy.bookableBadge} • <span dir="ltr">{formatCurrency(addon.priceIls)}</span>
                    </Badge>
                  ) : (
                    <Badge variant="slate" className="shrink-0">{copy.onRequestBadge}</Badge>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">{text.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{text.tagline}</p>
                </div>

                {/* Airports */}
                <ol className="space-y-2.5 list-none p-0 m-0">
                  {route.airports.map((airport, index) => {
                    const airportText = text.airports[index];
                    return (
                      <li key={airport.icao} className="flex gap-3 items-start">
                        <span
                          dir="ltr"
                          className="shrink-0 mt-0.5 inline-flex items-center rounded-md border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-300 tracking-wider"
                        >
                          {airport.icao}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-100 leading-snug">
                            {airportText.name}{' '}
                            <span className="font-mono text-[11px] text-slate-400" dir="ltr">
                              {airport.iata}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{airportText.sight}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {/* Difficulty */}
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span
                    role="img"
                    aria-label={`${copy.difficultyLabel}: ${route.difficulty}/5, ${difficultyText}`}
                    className="inline-flex items-center gap-1"
                    dir="ltr"
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <span
                        key={level}
                        aria-hidden="true"
                        className={`h-2.5 w-2.5 rounded-full ${level <= route.difficulty ? 'bg-orange-500' : 'bg-slate-700'}`}
                      />
                    ))}
                  </span>
                  <span>{difficultyText}</span>
                </div>

                {/* Captain's note */}
                <figure className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                  <figcaption className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-orange-500">
                    <Quote className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{copy.pilotNoteLabel}</span>
                  </figcaption>
                  <blockquote className="text-sm text-slate-300 leading-relaxed italic">{text.pilotNote}</blockquote>
                </figure>

                {/* Best for */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400">{copy.bestForLabel}:</span>
                  {text.bestFor.map((tag) => (
                    <span key={tag} className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-2 flex flex-col gap-3">
                  {addon && (
                    <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span dir="ltr">{copy.extraMinutes(addon.durationMinutes)}</span>
                    </div>
                  )}
                  {addon ? (
                    <Link href={bookHref(route)} className="block">
                      <Button className="w-full min-h-[44px]">
                        <span>{copy.bookTrioCta}</span>
                        <ArrowRight className={`w-4 h-4 ${arrowFlip}`} aria-hidden="true" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href={requestHref(route)} className="block">
                      <Button variant="outline" className="w-full min-h-[44px]">
                        <span>{copy.requestRouteCta}</span>
                        <ArrowRight className={`w-4 h-4 ${arrowFlip}`} aria-hidden="true" />
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
        {copy.bookableHint} {copy.onRequestHint}
      </p>

      {/* Adventures */}
      <div className="space-y-6 pt-4">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="amber">{copy.adventuresBadge}</Badge>
          <h3 className="text-2xl sm:text-4xl font-black text-white">{copy.adventuresTitle}</h3>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{copy.adventuresSubtitle}</p>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 list-none p-0 m-0" data-adventures>
          {ADVENTURES.map((adventure) => {
            const text = adventure.copy[language] || adventure.copy.en;
            const Icon = ICONS[adventure.icon];
            return (
              <li key={adventure.id} className="min-w-0">
                <Card borderAccent="amber" className="h-full flex flex-col gap-4 backdrop-blur-none" data-adventure={adventure.id}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{text.where}</span>
                    </div>
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-white leading-tight">{text.title}</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{text.description}</p>
                  <div className="mt-auto pt-2 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{copy.fromSession(adventure.minimumSessionMinutes)}</span>
                    </div>
                    <Link href={adventureInquiryHref(adventure.id)} className="block">
                      <Button variant="secondary" className="w-full min-h-[44px]">
                        <span>{copy.askCaptainCta}</span>
                        <ArrowRight className={`w-4 h-4 ${arrowFlip}`} aria-hidden="true" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
