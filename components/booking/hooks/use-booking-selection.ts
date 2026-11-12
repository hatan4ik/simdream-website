'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlightAddon, PilotExperienceLevel, SimulatorPackage } from '@/types';
import { MINIMUM_ROUTE_REQUEST_MINUTES } from '@/lib/data/experience-routes';
import { packageAllowsAddons } from '@/lib/scheduler/mission-calculator';
import { isWixSubscriptionBookingPackageId } from '@/lib/wix/subscription-redemption';
import {
  computeRequiredMissionMinutes,
  resolvePackageSlug,
  type SearchParamsReader,
} from '@/lib/booking/client';
import type { BookingUrlIntent } from './use-booking-url-intent';

interface UseBookingSelectionArgs {
  searchParams: SearchParamsReader;
  intent: BookingUrlIntent;
  localizedPackages: SimulatorPackage[];
  localizedAddons: FlightAddon[];
}

/**
 * What is being booked: the package, its category flags (PRO, Fear of Flying, noise-free), the
 * add-ons, and the pilot experience level that is coupled to the package (an ATPL level moves the
 * booking to the PRO 60 tier and back). It owns every rule that keeps those choices consistent.
 */
export function useBookingSelection({ searchParams, intent, localizedPackages, localizedAddons }: UseBookingSelectionArgs) {
  const { defaultPackageSlug, requestedRoute, requestedAddonIds, selectedRoute, wixSubscriptionRequested } = intent;
  const preselectedAddonIds = useMemo(
    () => requestedAddonIds.filter((id) => localizedAddons.some((addon) => addon.id === id)),
    [localizedAddons, requestedAddonIds]
  );

  // Selected package (synced with ?package= query param when coming from Homepage or /experiences)
  const initialPackage =
    localizedPackages.find((p) => p.slug === defaultPackageSlug) || localizedPackages[2] || localizedPackages[0];
  const [selectedPackage, setSelectedPackage] = useState<SimulatorPackage>(initialPackage);
  const previousNonProPackageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const requestedSlug = searchParams.get('package');
    if (requestedSlug) {
      const pkgSlug = resolvePackageSlug(requestedSlug);
      const matched = localizedPackages.find((p) => p.slug === pkgSlug);
      if (matched) {
        previousNonProPackageIdRef.current = null;
        setSelectedPackage(matched);
      }
    }
  }, [searchParams]);

  const activePackage =
    localizedPackages.find((p) => p.id === selectedPackage.id) || selectedPackage;
  const isWixSubscriptionRedemption = wixSubscriptionRequested && isWixSubscriptionBookingPackageId(activePackage.id);

  // The package category is authoritative (id/slug heuristics misclassified 'pkg-promo-45'
  // as PRO). The server enforces the same noise-free rule through packageAllowsAddons.
  const isProBooking = activePackage.category === 'training';
  const isFearOfFlyingBooking = activePackage.category === 'fear_of_flying';
  const isNoiseFreeBooking = !packageAllowsAddons(activePackage) || isWixSubscriptionRedemption;

  // Scoped packages:
  // - PRO: strictly show the 3 PRO training tiers (60, 90, 120 PRO)
  // - Fear of Flying: strictly show the Fear of Flying course
  // - Recreational: show recreational consumer packages (30m, 45m, 60m, 90m)
  const scopedPackages = useMemo(() => {
    if (isWixSubscriptionRedemption) return [activePackage];
    if (isProBooking) return localizedPackages.filter((p) => p.category === 'training');
    if (isFearOfFlyingBooking) return localizedPackages.filter((p) => p.category === 'fear_of_flying');
    return localizedPackages.filter(
      (p) =>
        p.category === 'recreational' &&
        (!requestedRoute || p.durationMinutes >= MINIMUM_ROUTE_REQUEST_MINUTES)
    );
  }, [activePackage, localizedPackages, isWixSubscriptionRedemption, isProBooking, isFearOfFlyingBooking, requestedRoute]);

  // An old or hand-edited URL must not leave a custom World Trio paired with a short flight.
  // The route request starts at 60 minutes, while customers may still choose a longer session.
  useEffect(() => {
    if (!requestedRoute || activePackage.durationMinutes >= MINIMUM_ROUTE_REQUEST_MINUTES) return;
    const eligiblePackage = localizedPackages.find(
      (pkg) => pkg.category === 'recreational' && pkg.durationMinutes >= MINIMUM_ROUTE_REQUEST_MINUTES
    );
    if (eligiblePackage) setSelectedPackage(eligiblePackage);
  }, [activePackage.durationMinutes, localizedPackages, requestedRoute]);

  // Scoped add-ons:
  // - PRO or Fear of Flying: strictly [] (empty array, zero add-on noise!)
  // - Recreational: all localized add-ons
  const scopedAddons = useMemo(() => {
    if (isNoiseFreeBooking) return [];
    return localizedAddons;
  }, [localizedAddons, isNoiseFreeBooking]);

  // Add-ons (strictly empty for noise-free specialized bookings)
  const [selectedAddons, setSelectedAddons] = useState<string[]>(preselectedAddonIds);
  const appliedAddonIntentRef = useRef<string | null>(null);

  // A deep-linked World Trio is an explicit customer choice, not a suggestion
  // that may disappear while the calendar hydrates. Use the whole manifest to
  // select and render only departures that can accommodate the base flight plus
  // every chosen add-on. The server remains the final pricing/capacity authority.
  const requiredMissionMinutes = useMemo(
    () => computeRequiredMissionMinutes(activePackage.durationMinutes, selectedAddons, scopedAddons),
    [activePackage.durationMinutes, scopedAddons, selectedAddons]
  );

  // Keep a deep link shareable across in-app navigation, but apply a given URL intent only once
  // so a customer may freely remove or alter an add-on afterwards.
  const addonIntentKey = requestedAddonIds.join(',');
  useEffect(() => {
    if (appliedAddonIntentRef.current === addonIntentKey) return;
    appliedAddonIntentRef.current = addonIntentKey;
    setSelectedAddons(preselectedAddonIds);
  }, [addonIntentKey, preselectedAddonIds]);

  const selectedRouteAddon = selectedRoute?.addonId
    ? scopedAddons.find((addon) => addon.id === selectedRoute.addonId)
    : undefined;
  const hasSelectedRouteAddon = Boolean(selectedRouteAddon && selectedAddons.includes(selectedRouteAddon.id));

  useEffect(() => {
    if (isNoiseFreeBooking && selectedAddons.length > 0) {
      setSelectedAddons([]);
    }
  }, [isNoiseFreeBooking, selectedAddons.length]);

  const [experienceLevel, setExperienceLevel] = useState<PilotExperienceLevel>(
    isProBooking ? 'atpl' : 'beginner'
  );

  useEffect(() => {
    if (isProBooking) {
      setExperienceLevel('atpl');
    }
  }, [isProBooking]);

  const handleSelectPackage = useCallback((nextPackage: SimulatorPackage) => {
    previousNonProPackageIdRef.current = null;
    setSelectedPackage(nextPackage);
    if (nextPackage.category === 'training') {
      setExperienceLevel('atpl');
    } else {
      setExperienceLevel((current) => (current === 'atpl' ? 'beginner' : current));
    }
  }, []);

  const handleChangeExperienceLevel = useCallback(
    (nextLevel: PilotExperienceLevel) => {
      setExperienceLevel(nextLevel);
      if (isWixSubscriptionRedemption) return;

      if (nextLevel === 'atpl') {
        if (activePackage.category !== 'training') {
          previousNonProPackageIdRef.current = activePackage.id;
          const pro60Package = localizedPackages.find(
            (pkg) => pkg.id === 'pkg-pro-60' || pkg.slug === 'airline-prep-60-pro'
          );
          if (pro60Package) {
            setSelectedPackage(pro60Package);
            setSelectedAddons([]);
          }
        }
        return;
      }

      if (previousNonProPackageIdRef.current) {
        const previousPackage = localizedPackages.find(
          (pkg) => pkg.id === previousNonProPackageIdRef.current
        );
        previousNonProPackageIdRef.current = null;
        if (previousPackage) {
          setSelectedPackage(previousPackage);
        }
      }
    },
    [activePackage.category, activePackage.id, isWixSubscriptionRedemption, localizedPackages]
  );

  return {
    /** The raw selected package; availability is requested for this one. */
    selectedPackage,
    /** The selected package resolved against the current language's catalog. */
    activePackage,
    scopedPackages,
    scopedAddons,
    isProBooking,
    isFearOfFlyingBooking,
    isNoiseFreeBooking,
    isWixSubscriptionRedemption,
    /** The on-request route, absent in noise-free flows. */
    activeRequestedRoute: isNoiseFreeBooking ? undefined : requestedRoute,
    selectedAddons,
    setSelectedAddons,
    /** Base flight plus every selected add-on, in minutes. */
    requiredMissionMinutes,
    selectedRouteAddon,
    hasSelectedRouteAddon,
    experienceLevel,
    handleSelectPackage,
    handleChangeExperienceLevel,
  };
}

export type BookingSelection = ReturnType<typeof useBookingSelection>;
