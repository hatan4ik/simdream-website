'use client';

import { useMemo } from 'react';
import {
  WORLD_ROUTES,
  findOnRequestWorldRoute,
  type WorldRoute,
} from '@/lib/data/experience-routes';
import {
  isWixSubscriptionRequested,
  mergeRequestedAddonIds,
  requestedPackageSlug,
  type SearchParamsReader,
} from '@/lib/booking/client';

export interface BookingUrlIntent {
  /** A World Trio sold as an add-on (`?route=`), preselecting its add-on. */
  selectedRoute: WorldRoute | undefined;
  /** An on-request World Trio (`?route=`) that a captain confirms before the visit. */
  requestedRoute: WorldRoute | undefined;
  /** `?addons=` plus the selected route's add-on, each once. Customer intent only. */
  requestedAddonIds: string[];
  /** `?package=` slug (aliases resolved), or the default package. */
  defaultPackageSlug: string;
  /** `?voucher=` code to prefill. */
  initialVoucherCode: string;
  /** `?subscription=wix` asks for a Wix subscription redemption. */
  wixSubscriptionRequested: boolean;
}

/** Reads the `/book` query string. Every value is intent; the server validates IDs and prices. */
export function useBookingUrlIntent(searchParams: SearchParamsReader): BookingUrlIntent {
  const selectedRoute = useMemo(
    () => WORLD_ROUTES.find((route) => route.id === searchParams.get('route')),
    [searchParams]
  );
  const requestedRoute = useMemo(
    () => findOnRequestWorldRoute(searchParams.get('route') ?? undefined),
    [searchParams]
  );
  const requestedAddonIds = useMemo(
    () => mergeRequestedAddonIds(searchParams.get('addons'), selectedRoute?.addonId),
    [searchParams, selectedRoute]
  );

  return {
    selectedRoute,
    requestedRoute,
    requestedAddonIds,
    defaultPackageSlug: requestedPackageSlug(searchParams),
    initialVoucherCode: searchParams.get('voucher') || '',
    wixSubscriptionRequested: isWixSubscriptionRequested(searchParams),
  };
}
