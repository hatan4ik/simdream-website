/**
 * Native Wix Bookings add-ons on the "SimDream-Staging" Headless site
 * (metasite 317b0c6d-6608-499a-bb3c-b1c37650e460).
 *
 * A duration add-on lengthens the Wix appointment itself: Time Slots V2 returns the
 * longer slot when it is asked with `customerChoices.addOnIds`, and Create Booking
 * records the choice in `bookedAddOns`. That is what blocks the simulator on the Wix
 * calendar for the whole mission, not only for the base session.
 *
 * Add-on ids are shared by the four consumer services; each service has its own
 * add-on groups. Prices and minutes stay in the SimDream registry (`FLIGHT_ADDONS`),
 * and `tests/unit/wix-native-addons.test.ts` fails if the two ever drift apart.
 * Kept free of server and browser imports: the server resolves the slot and the
 * browser creates the booking, and both read this one map.
 */

type AddOnGroupKind = 'mission' | 'trios' | 'guests';

export interface WixNativeAddOnEntry {
  /** Wix Bookings add-on id. */
  readonly id: string;
  readonly group: AddOnGroupKind;
  /** True when Wix extends the appointment by the add-on's minutes; false for a quantity add-on. */
  readonly durationBased: boolean;
}

export interface WixBookedAddOn {
  id: string;
  groupId: string;
  /** Sent only for a quantity-based add-on; Wix rejects any quantity but 1 on a duration add-on. */
  quantity?: number;
}

export const WIX_NATIVE_ADDON_ENTRIES: Readonly<Record<string, WixNativeAddOnEntry>> = {
  'addon-cold-dark': { id: '3f25e6d1-1c6b-4f6a-825e-10daf5603a02', group: 'mission', durationBased: true },
  'addon-xwind-ifr': { id: '49a2d29f-7415-414b-9ffc-25602c203708', group: 'mission', durationBased: true },
  'addon-extreme-airports': { id: '4b1da36e-49f0-4fd2-ae34-99d7d6471176', group: 'mission', durationBased: true },
  'addon-classical-eu': { id: '8791f47e-1c3d-47fa-9e11-b365a3f5ff8d', group: 'trios', durationBased: true },
  'addon-med-islands': { id: '9f508bad-d8f1-4ce0-90a9-24afa7c78330', group: 'trios', durationBased: true },
  'addon-us-megacities': { id: 'a78080c3-37ec-4823-a8ba-b3592d6fd087', group: 'trios', durationBased: true },
  'addon-night-neon': { id: 'c1715c4e-0ff5-4c4f-b18a-9c4f7454f851', group: 'trios', durationBased: true },
  'addon-alpine-mountains': { id: 'c57ac05d-6d79-46e6-a98f-e5db0776ce36', group: 'trios', durationBased: true },
  'addon-tropical-ocean': { id: 'd12d1729-061f-4f01-8f19-4a7a8828ab87', group: 'trios', durationBased: true },
  'addon-middle-east-legends': { id: 'd7121bcc-bc8b-42ee-b926-986dd5fc1c12', group: 'trios', durationBased: true },
  'addon-extra-seat': { id: 'fc135398-ed27-49e0-9505-3b7efa7f2502', group: 'guests', durationBased: false },
};

/** SimDream package id → the add-on group ids of its Wix service, by group kind. */
const GROUP_IDS_BY_PACKAGE: Readonly<Record<string, Readonly<Record<AddOnGroupKind, string>>>> = {
  'pkg-discovery-30': {
    mission: '8b1f7a06-b0bf-4bdc-992a-4bc42dacdb0c',
    trios: 'a87da7d1-7af5-43de-bb21-3662d6ebaefb',
    guests: '9670a518-bc11-494d-9d9e-b1d5ff1e2881',
  },
  'pkg-promo-45': {
    mission: '3cb22ca6-34a4-4875-8f21-ab83799245c7',
    trios: '797ca687-478f-4343-aa3f-41d98475a1d1',
    guests: 'deaa6ac1-e014-4f08-a2f4-bcd2a575d644',
  },
  'pkg-captain-60': {
    mission: 'eda87110-b97d-4381-95af-0f703a463a3f',
    trios: 'e6557b20-307b-402f-b07d-caa44f3ebbdc',
    guests: '98af09e5-e535-4f3d-b67e-9480627e43c7',
  },
  'pkg-ultimate-90': {
    mission: 'c13692ba-a2cd-41bb-8a86-03894d3d65f1',
    trios: '68fbc811-7d12-466c-aca1-8ee3f0699737',
    guests: '7f64dd49-af54-4af1-93fc-ff9099f0f67b',
  },
};

export const WIX_NATIVE_ADDON_PACKAGE_IDS: readonly string[] = Object.keys(GROUP_IDS_BY_PACKAGE);

interface ResolvedNativeAddOn {
  readonly simdreamId: string;
  readonly entry: WixNativeAddOnEntry;
  readonly groupId: string;
}

function resolveNativeAddOns(packageId: string, addonIds: readonly string[] | undefined): ResolvedNativeAddOn[] {
  const groups = GROUP_IDS_BY_PACKAGE[packageId];
  if (!groups) return [];
  const resolved: ResolvedNativeAddOn[] = [];
  for (const simdreamId of new Set(addonIds ?? [])) {
    const entry = WIX_NATIVE_ADDON_ENTRIES[simdreamId];
    if (entry) resolved.push({ simdreamId, entry, groupId: groups[entry.group] });
  }
  return resolved;
}

/** The `bookedAddOns` of a Create Booking call for the add-ons Wix books natively on this service. */
export function wixBookedAddOnsFor(packageId: string, addonIds: readonly string[] | undefined): WixBookedAddOn[] {
  return resolveNativeAddOns(packageId, addonIds).map(({ entry, groupId }) => ({
    id: entry.id,
    groupId,
    ...(entry.durationBased ? {} : { quantity: 1 }),
  }));
}

/** The `customerChoices.addOnIds` of a Time Slots V2 call: only the add-ons that add minutes. */
export function wixAvailabilityAddOnIds(packageId: string, addonIds: readonly string[] | undefined): string[] {
  return resolveNativeAddOns(packageId, addonIds)
    .filter(({ entry }) => entry.durationBased)
    .map(({ entry }) => entry.id);
}

/** SimDream add-on ids that Wix books natively; the Wix cart must not add their Stores product again. */
export function wixNativeAddonIdsFor(packageId: string, addonIds: readonly string[] | undefined): string[] {
  return resolveNativeAddOns(packageId, addonIds).map(({ simdreamId }) => simdreamId);
}

/** What the server resolved about native add-ons, carried by the checkout candidate to the browser. */
export interface WixNativeAddOnFields {
  /** Sent as `bookedAddOns` on Create Booking, so Wix records the add-ons on the booking itself. */
  bookedAddOns?: readonly WixBookedAddOn[];
  /** Duration add-on ids for `customerChoices` when revalidating the (extended) slot. */
  availabilityAddOnIds?: readonly string[];
  /** SimDream add-on ids booked natively: the cart skips their Stores product so each is charged once. */
  nativeAddonIds?: readonly string[];
}

/** The `customerChoices` request field for Time Slots V2, or nothing when no duration add-on was chosen. */
export function wixCustomerChoicesField(fields: WixNativeAddOnFields): { customerChoices?: { addOnIds: readonly string[] } } {
  return fields.availabilityAddOnIds?.length ? { customerChoices: { addOnIds: fields.availabilityAddOnIds } } : {};
}

/** The `bookedAddOns` field of a Create Booking body, or nothing when Wix books no add-on natively. */
export function wixBookedAddOnsField(fields: WixNativeAddOnFields): { bookedAddOns?: readonly WixBookedAddOn[] } {
  return fields.bookedAddOns?.length ? { bookedAddOns: fields.bookedAddOns } : {};
}

/** The add-ons that still travel as Wix Stores products: Wix prices the native ones with the booking. */
export function wixCartAddonIds(addonIds: readonly string[] | undefined, fields: WixNativeAddOnFields): string[] {
  const native = new Set(fields.nativeAddonIds ?? []);
  return (addonIds ?? []).filter((addonId) => !native.has(addonId));
}
