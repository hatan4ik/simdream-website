'use client';

import type { FlightAddon } from '@/types';
import { EXPERIENCE_ROUTES_COPY, type WorldRoute } from '@/lib/data/experience-routes';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

interface RouteIntentBannerProps {
  /** A World Trio sold as an add-on, deep-linked with `?route=`. */
  selectedRoute: WorldRoute | undefined;
  /** An on-request World Trio that a captain confirms before the visit. */
  requestedRoute: WorldRoute | undefined;
  /** The add-on of `selectedRoute`, when the catalog offers it for this booking. */
  selectedRouteAddon: FlightAddon | undefined;
  /** The add-on is currently part of the booking. */
  hasSelectedRouteAddon: boolean;
  /** Noise-free flows (PRO, Fear of Flying) never show route intent. */
  isNoiseFreeBooking: boolean;
}

/**
 * Tells the visitor which World Trio they arrived for: either the add-on that was preselected, or
 * the custom route request a captain confirms. Renders nothing when there is no route intent.
 */
export function RouteIntentBanner({
  selectedRoute,
  requestedRoute,
  selectedRouteAddon,
  hasSelectedRouteAddon,
  isNoiseFreeBooking,
}: RouteIntentBannerProps) {
  const { language } = useLanguage();
  const routeCopy = EXPERIENCE_ROUTES_COPY[language] || EXPERIENCE_ROUTES_COPY.en;
  const selectedRouteText = selectedRoute?.copy[language] || selectedRoute?.copy.en;

  if (!(((hasSelectedRouteAddon && selectedRouteAddon) || requestedRoute) && selectedRouteText && !isNoiseFreeBooking)) {
    return null;
  }

  return (
    <section
      data-route-booking-intent={requestedRoute ? undefined : true}
      data-route-request-intent={requestedRoute ? true : undefined}
      aria-live="polite"
      className="rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-300">
          {requestedRoute ? routeCopy.routeRequestEyebrow : routeCopy.bookingIntentEyebrow}
        </p>
        <h2 className="mt-1 text-base sm:text-lg font-bold text-white">{selectedRouteText.title}</h2>
        <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-300">
          {requestedRoute ? routeCopy.routeRequestDescription : routeCopy.bookingIntentDescription}
        </p>
      </div>
      <div className="shrink-0 rounded-xl border border-sky-400/30 bg-slate-950/60 px-3 py-2 text-right rtl:text-left" dir="ltr">
        {requestedRoute ? (
          <>
            <p className="text-[10px] font-mono uppercase text-slate-400">{routeCopy.routeRequestSaved}</p>
            <p className="text-sm font-mono font-bold text-sky-300">{routeCopy.routeRequestConfirmation}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{routeCopy.routeRequestPriceNote}</p>
          </>
        ) : (
          <>
            <p className="text-[10px] font-mono uppercase text-slate-400">{routeCopy.bookingIntentAddOn}</p>
            <p className="text-sm font-mono font-bold text-sky-300">
              +{selectedRouteAddon!.durationMinutes} min · +{formatCurrency(selectedRouteAddon!.priceIls)}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
