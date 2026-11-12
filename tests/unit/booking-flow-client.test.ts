import { describe, expect, it } from 'vitest';
import type { FlightAddon, FlightSlot, MissionManifestCalculation } from '@/types';
import {
  DEFAULT_PACKAGE_SLUG,
  STEP_ADDONS,
  STEP_DATE_SLOT,
  STEP_PILOT,
  buildLocalCheckoutBody,
  buildWixCheckoutDraftKey,
  computeRequiredMissionMinutes,
  extractSlotList,
  filterMissionCompatibleSlots,
  findBookingBlocker,
  formatBookingTemplate,
  isWixSubscriptionRequested,
  mergeRequestedAddonIds,
  normalizeStep,
  parseRequestedAddonIds,
  pickActiveWixCheckoutDraft,
  presentManifestWithDraft,
  requestedPackageSlug,
  resolveAddonToggle,
  resolveCheckoutMode,
  resolvePackageSlug,
  resolveSlotsState,
  selectDepartureAfterLoad,
  stepAfterSlot,
  stepBeforePilot,
  stepsFor,
  type WixCheckoutDraftState,
} from '@/lib/booking/client';

const slot = (overrides: Partial<FlightSlot> & { id: string }): FlightSlot => ({
  date: '2026-11-09',
  startTime: '10:00',
  endTime: '11:00',
  available: true,
  maxAvailableMinutes: 120,
  ...overrides,
}) as FlightSlot;

const addon = (id: string, durationMinutes: number): FlightAddon =>
  ({ id, name: id, description: '', priceIls: 10, durationMinutes, icon: 'Zap' }) as FlightAddon;

describe('booking URL intent', () => {
  it('resolves the documented PRO deep-link names and leaves other slugs alone', () => {
    expect(resolvePackageSlug('airline-interview-prep-60-pro')).toBe('airline-prep-60-pro');
    expect(resolvePackageSlug('airline-interview-prep-90-pro')).toBe('airline-prep-90-pro');
    expect(resolvePackageSlug('airline-interview-prep-120-pro')).toBe('airline-assessment-prep');
    expect(resolvePackageSlug('captains-command-60')).toBe('captains-command-60');
  });

  it('reads the package slug from the query, defaulting to the 60-minute Captain package', () => {
    expect(requestedPackageSlug(new URLSearchParams(''))).toBe(DEFAULT_PACKAGE_SLUG);
    expect(requestedPackageSlug(new URLSearchParams('package='))).toBe(DEFAULT_PACKAGE_SLUG);
    expect(requestedPackageSlug(new URLSearchParams('package=airline-interview-prep-90-pro'))).toBe('airline-prep-90-pro');
  });

  it('trims, de-duplicates and drops empty add-on ids', () => {
    expect(parseRequestedAddonIds(null)).toEqual([]);
    expect(parseRequestedAddonIds('')).toEqual([]);
    expect(parseRequestedAddonIds(' a, b ,,a,c ')).toEqual(['a', 'b', 'c']);
  });

  it('adds the selected route add-on once', () => {
    expect(mergeRequestedAddonIds('a,b', 'b')).toEqual(['a', 'b']);
    expect(mergeRequestedAddonIds(null, 'route-addon')).toEqual(['route-addon']);
    expect(mergeRequestedAddonIds('a', undefined)).toEqual(['a']);
  });

  it('recognises only subscription=wix as a Wix subscription redemption', () => {
    expect(isWixSubscriptionRequested(new URLSearchParams('subscription=wix'))).toBe(true);
    expect(isWixSubscriptionRequested(new URLSearchParams('subscription=stripe'))).toBe(false);
    expect(isWixSubscriptionRequested(new URLSearchParams(''))).toBe(false);
  });

  it('fills template placeholders and keeps unknown ones visible', () => {
    expect(formatBookingTemplate('{base} + {addons} min', { base: 60, addons: 20 })).toBe('60 + 20 min');
    expect(formatBookingTemplate('{base} {missing}', { base: 60 })).toBe('60 {missing}');
  });
});

describe('wizard steps', () => {
  it('shows two steps in a noise-free flow and three otherwise', () => {
    expect(stepsFor(true).map((s) => [s.step, s.labelKey])).toEqual([
      [STEP_DATE_SLOT, 'step2'],
      [STEP_PILOT, 'step4'],
    ]);
    expect(stepsFor(false).map((s) => [s.step, s.labelKey])).toEqual([
      [STEP_DATE_SLOT, 'step2'],
      [STEP_ADDONS, 'step3'],
      [STEP_PILOT, 'step4'],
    ]);
  });

  it('routes around the add-ons step in a noise-free flow', () => {
    expect(stepAfterSlot(true)).toBe(STEP_PILOT);
    expect(stepAfterSlot(false)).toBe(STEP_ADDONS);
    expect(stepBeforePilot(true)).toBe(STEP_DATE_SLOT);
    expect(stepBeforePilot(false)).toBe(STEP_ADDONS);
    expect(normalizeStep(STEP_ADDONS, true)).toBe(STEP_PILOT);
    expect(normalizeStep(STEP_ADDONS, false)).toBe(STEP_ADDONS);
    expect(normalizeStep(STEP_DATE_SLOT, true)).toBe(STEP_DATE_SLOT);
  });
});

describe('departure selection', () => {
  it('reads both slot payload shapes', () => {
    const a = slot({ id: 'a' });
    expect(extractSlotList([a])).toEqual([a]);
    expect(extractSlotList({ slots: [a] })).toEqual([a]);
    expect(extractSlotList({})).toEqual([]);
    expect(extractSlotList(null)).toEqual([]);
  });

  it('adds the minutes of every known selected add-on to the base flight', () => {
    const catalog = [addon('x', 20), addon('y', 0)];
    expect(computeRequiredMissionMinutes(60, [], catalog)).toBe(60);
    expect(computeRequiredMissionMinutes(60, ['x', 'y', 'unknown'], catalog)).toBe(80);
  });

  it('keeps only open departures that can hold the whole mission', () => {
    const slots = [
      slot({ id: 'short', maxAvailableMinutes: 60 }),
      slot({ id: 'long', maxAvailableMinutes: 100 }),
      slot({ id: 'closed', maxAvailableMinutes: 200, available: false }),
      slot({ id: 'unbounded', maxAvailableMinutes: undefined }),
    ];
    expect(filterMissionCompatibleSlots(slots, 80).map((s) => s.id)).toEqual(['long']);
    expect(filterMissionCompatibleSlots(slots, 0).map((s) => s.id)).toEqual(['short', 'long', 'unbounded']);
  });

  it('prefers the smart pairing, then the first compatible departure', () => {
    const slots = [
      slot({ id: 'first' }),
      slot({ id: 'pair', smartRecommendation: 'optimal_150_pair' }),
    ];
    const base = { selectedDate: '2026-11-09', previous: null, requiredMissionMinutes: 60 };
    expect(selectDepartureAfterLoad(slots, base)?.id).toBe('pair');
    expect(selectDepartureAfterLoad(slots.slice(0, 1), base)?.id).toBe('first');
    expect(selectDepartureAfterLoad([], base)).toBeNull();
  });

  it('keeps the visitor\'s departure while it is still compatible on the same date', () => {
    const refreshed = slot({ id: 'mine', maxAvailableMinutes: 150 });
    const slots = [slot({ id: 'other' }), refreshed];
    const previous = slot({ id: 'mine', maxAvailableMinutes: 90 });
    const kept = selectDepartureAfterLoad(slots, { selectedDate: '2026-11-09', previous, requiredMissionMinutes: 60 });
    expect(kept).toBe(refreshed);
  });

  it('drops the previous departure on another date or once it no longer fits', () => {
    const slots = [slot({ id: 'a', maxAvailableMinutes: 120 }), slot({ id: 'mine', maxAvailableMinutes: 60 })];
    const previous = slot({ id: 'mine' });
    expect(selectDepartureAfterLoad(slots, { selectedDate: '2026-11-10', previous, requiredMissionMinutes: 30 })?.id).toBe('a');
    expect(selectDepartureAfterLoad(slots, { selectedDate: '2026-11-09', previous, requiredMissionMinutes: 90 })?.id).toBe('a');
  });

  it('reports the availability request phase', () => {
    expect(resolveSlotsState({ loadingSlots: false, slotsLoadFailed: false, slotsRequested: false })).toBe('idle');
    expect(resolveSlotsState({ loadingSlots: true, slotsLoadFailed: false, slotsRequested: true })).toBe('loading');
    expect(resolveSlotsState({ loadingSlots: false, slotsLoadFailed: true, slotsRequested: true })).toBe('failed');
    expect(resolveSlotsState({ loadingSlots: false, slotsLoadFailed: false, slotsRequested: true })).toBe('ready');
    // Loading wins over a stale failure, exactly as the retry flow expects.
    expect(resolveSlotsState({ loadingSlots: true, slotsLoadFailed: true, slotsRequested: true })).toBe('loading');
  });
});

describe('add-on toggling', () => {
  const addons = [addon('trio', 40), addon('plain', 0)];
  const inputs = {
    selectedAddonIds: [] as string[],
    addons,
    wixBookingsAuthoritative: false,
    isWixSubscriptionRedemption: false,
    totalDurationMinutes: 60,
    maxSlotMinutes: 120,
  };

  it('adds an add-on that fits and removes a selected one', () => {
    expect(resolveAddonToggle({ ...inputs, addonId: 'trio' })).toEqual({ kind: 'set', ids: ['trio'] });
    expect(resolveAddonToggle({ ...inputs, addonId: 'trio', selectedAddonIds: ['plain', 'trio'] })).toEqual({
      kind: 'set',
      ids: ['plain'],
    });
  });

  it('refuses an add-on that overflows the departure window', () => {
    expect(resolveAddonToggle({ ...inputs, addonId: 'trio', totalDurationMinutes: 100 })).toEqual({ kind: 'no-fit' });
    // A zero-minute add-on always fits; an unknown id is added like the original did.
    expect(resolveAddonToggle({ ...inputs, addonId: 'plain', totalDurationMinutes: 120 }).kind).toBe('set');
    expect(resolveAddonToggle({ ...inputs, addonId: 'ghost' })).toEqual({ kind: 'set', ids: ['ghost'] });
  });

  it('cannot sell a new add-on while a live Wix calendar owns reservations, but may remove one', () => {
    expect(resolveAddonToggle({ ...inputs, addonId: 'trio', wixBookingsAuthoritative: true })).toEqual({
      kind: 'wix-authority-required',
    });
    expect(
      resolveAddonToggle({ ...inputs, addonId: 'trio', wixBookingsAuthoritative: true, selectedAddonIds: ['trio'] })
    ).toEqual({ kind: 'set', ids: [] });
    expect(
      resolveAddonToggle({ ...inputs, addonId: 'trio', wixBookingsAuthoritative: true, isWixSubscriptionRedemption: true }).kind
    ).toBe('set');
  });
});

describe('checkout mode', () => {
  const base = {
    isWixSubscriptionRedemption: false,
    wixBookingsAuthoritative: true,
    wixBookingFrontendActive: true,
    selectedAddonCount: 0,
    hasRequestedRoute: false,
  };

  it('uses the Wix native checkout for a plain single-service booking on a live Wix calendar', () => {
    expect(resolveCheckoutMode(base)).toEqual({ canUseWixNativeCheckout: true, requiresUnsupportedLocalCheckout: false });
  });

  it('blocks add-ons and route requests while Wix is the reservation writer', () => {
    expect(resolveCheckoutMode({ ...base, selectedAddonCount: 1 })).toEqual({
      canUseWixNativeCheckout: false,
      requiresUnsupportedLocalCheckout: true,
    });
    expect(resolveCheckoutMode({ ...base, hasRequestedRoute: true }).requiresUnsupportedLocalCheckout).toBe(true);
    expect(resolveCheckoutMode({ ...base, wixBookingFrontendActive: false }).requiresUnsupportedLocalCheckout).toBe(true);
  });

  it('leaves the local checkout alone when Wix is not authoritative', () => {
    expect(resolveCheckoutMode({ ...base, wixBookingsAuthoritative: false })).toEqual({
      canUseWixNativeCheckout: false,
      requiresUnsupportedLocalCheckout: false,
    });
  });

  it('never treats a Wix subscription redemption as native or unsupported checkout', () => {
    expect(resolveCheckoutMode({ ...base, isWixSubscriptionRedemption: true })).toEqual({
      canUseWixNativeCheckout: false,
      requiresUnsupportedLocalCheckout: false,
    });
  });
});

describe('Wix checkout draft', () => {
  const inputs = {
    packageId: 'pkg-captain-60',
    selectedDate: '2026-11-09',
    slotId: 'slot-1',
    pilotName: ' Ada ',
    pilotEmail: 'ada@example.com ',
    pilotPhone: '+972501234567',
    notes: ' ',
  };
  const draft: WixCheckoutDraftState = { inputKey: buildWixCheckoutDraftKey(inputs), cartId: 'cart', totalIls: 500 };

  it('keys a draft by the trimmed flight, departure and pilot data', () => {
    expect(buildWixCheckoutDraftKey(inputs)).toBe(buildWixCheckoutDraftKey({ ...inputs, pilotName: 'Ada', notes: '' }));
    expect(buildWixCheckoutDraftKey(inputs)).not.toBe(buildWixCheckoutDraftKey({ ...inputs, slotId: 'slot-2' }));
    expect(buildWixCheckoutDraftKey(inputs)).not.toBe(buildWixCheckoutDraftKey({ ...inputs, pilotPhone: '+972500000000' }));
    expect(buildWixCheckoutDraftKey({ ...inputs, slotId: undefined })).toContain('\u001f\u001f');
  });

  it('treats a draft as active only while its inputs are unchanged', () => {
    expect(pickActiveWixCheckoutDraft(draft, draft.inputKey)).toBe(draft);
    expect(pickActiveWixCheckoutDraft(draft, buildWixCheckoutDraftKey({ ...inputs, notes: 'x' }))).toBeNull();
    expect(pickActiveWixCheckoutDraft(null, draft.inputKey)).toBeNull();
  });

  it('presents the Wix cart total over the local manifest total only while a draft is active', () => {
    const manifest = { totalIls: 700, subtotalIls: 700 } as MissionManifestCalculation;
    expect(presentManifestWithDraft(manifest, null)).toEqual({ displayManifest: manifest, displayTotalAmount: 700 });
    const shown = presentManifestWithDraft(manifest, draft);
    expect(shown.displayTotalAmount).toBe(500);
    expect(shown.displayManifest).toEqual({ ...manifest, totalIls: 500 });
    expect(manifest.totalIls).toBe(700);
  });
});

describe('submit blockers and request body', () => {
  const ready = {
    hasAvailableSlot: true,
    isWixSubscriptionRedemption: false,
    pilotName: 'Ada',
    pilotEmail: 'ada@example.com',
    pilotPhone: '+972501234567',
    requiresUnsupportedLocalCheckout: false,
  };

  it('lets a complete booking through', () => {
    expect(findBookingBlocker(ready)).toBeNull();
  });

  it('reports the first blocker in the order the visitor must fix it', () => {
    expect(findBookingBlocker({ ...ready, hasAvailableSlot: false, pilotName: '' })).toEqual({ kind: 'select-slot' });
    expect(findBookingBlocker({ ...ready, pilotEmail: '' })).toEqual({ kind: 'fill-fields' });
    expect(findBookingBlocker({ ...ready, requiresUnsupportedLocalCheckout: true })).toEqual({
      kind: 'wix-authority-required',
    });
    expect(findBookingBlocker({ ...ready, pilotName: '', requiresUnsupportedLocalCheckout: true })).toEqual({
      kind: 'fill-fields',
    });
  });

  it('does not require pilot fields for a Wix subscription redemption', () => {
    expect(findBookingBlocker({ ...ready, isWixSubscriptionRedemption: true, pilotName: '', pilotEmail: '', pilotPhone: '' })).toBeNull();
  });

  it('lets a feature module block the booking with its own message, after the pilot fields', () => {
    expect(findBookingBlocker({ ...ready, extraValidation: () => 'Consent is required' })).toEqual({
      kind: 'extra',
      message: 'Consent is required',
    });
    expect(findBookingBlocker({ ...ready, extraValidation: () => null })).toBeNull();
    expect(findBookingBlocker({ ...ready, pilotName: '', extraValidation: () => 'Consent is required' })).toEqual({
      kind: 'fill-fields',
    });
  });

  const body = {
    packageId: 'pkg-captain-60',
    bookingDate: '2026-11-09',
    startTime: '10:00',
    pilotName: 'Ada',
    pilotEmail: 'ada@example.com',
    pilotPhone: '+972501234567',
    experienceLevel: 'beginner' as const,
    addons: ['addon-cold-dark'],
    requestedRouteId: undefined,
    voucherCode: 'GIFT-1',
    voucherDiscountIls: 0,
    notes: '',
  };

  it('sends IDs and typed input only, and a voucher code only while a discount is applied', () => {
    const noVoucher = buildLocalCheckoutBody(body);
    expect(noVoucher).toMatchObject({ kind: 'booking', packageId: 'pkg-captain-60', addons: ['addon-cold-dark'] });
    expect(noVoucher.voucherCode).toBeUndefined();
    expect(buildLocalCheckoutBody({ ...body, voucherDiscountIls: 100 }).voucherCode).toBe('GIFT-1');
    expect(Object.keys(noVoucher).sort()).toEqual(
      [
        'addons', 'bookingDate', 'experienceLevel', 'kind', 'notes', 'packageId', 'pilotEmail', 'pilotName',
        'pilotPhone', 'requestedRouteId', 'startTime', 'voucherCode',
      ].sort()
    );
  });

  it('merges extra payload fields without letting them override a core field', () => {
    const merged = buildLocalCheckoutBody(body, { birthday: '1990-04-02', packageId: 'pkg-evil', kind: 'voucher' });
    expect(merged.birthday).toBe('1990-04-02');
    expect(merged.packageId).toBe('pkg-captain-60');
    expect(merged.kind).toBe('booking');
  });
});
