import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FlightAddon, FlightSlot, MissionManifestCalculation } from '@/types';
import { getCheckoutExtrasCopy } from '@/lib/booking/client/extras-copy';
import {
  DEFAULT_PACKAGE_SLUG,
  STEP_ADDONS,
  STEP_DATE_SLOT,
  STEP_PILOT,
  WixDraftPrepareError,
  appendWixMissionSummaryToNote,
  buildLocalCheckoutBody,
  buildWixCheckoutDraftKey,
  buildWixMissionNotes,
  computeRequiredMissionMinutes,
  extractSlotList,
  filterMissionCompatibleSlots,
  findBookingBlocker,
  findNearestCompatibleSlot,
  formatBookingTemplate,
  isWixSubscriptionRequested,
  mergeRequestedAddonIds,
  normalizeStep,
  parseRequestedAddonIds,
  pickActiveWixCheckoutDraft,
  prepareWixCheckoutDraft,
  presentManifestWithDraft,
  requestedPackageSlug,
  resolveAddonToggle,
  resolveCheckoutMode,
  resolvePackageSlug,
  resolveScheduleDurationMinutes,
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

  it('switches the schedule duration to the upgraded tier for recreational promo upgrades only', () => {
    expect(resolveScheduleDurationMinutes(60, 60, 'recreational')).toBe(60);
    expect(resolveScheduleDurationMinutes(60, 90, 'recreational')).toBe(90);
    expect(resolveScheduleDurationMinutes(60, 120, 'recreational')).toBe(120);
    expect(resolveScheduleDurationMinutes(30, 60, 'recreational')).toBe(60);
    expect(resolveScheduleDurationMinutes(45, 90, 'recreational')).toBe(90);
    expect(resolveScheduleDurationMinutes(60, 90, 'training')).toBe(60);
  });

  it('matches exact startTime across grid switches and snaps to nearest compatible start when off-grid', () => {
    const grid90 = [
      slot({ id: '90-0900', startTime: '09:00', maxAvailableMinutes: 180 }),
      slot({ id: '90-1045', startTime: '10:45', maxAvailableMinutes: 180 }),
      slot({ id: '90-1230', startTime: '12:30', maxAvailableMinutes: 180 }),
    ];
    // Exact wall-clock match (09:00 is on both 60m and 90m grids) keeps 09:00 even though slot.id changed.
    expect(
      selectDepartureAfterLoad(grid90, {
        selectedDate: '2026-11-09',
        previous: slot({ id: '60-0900', startTime: '09:00' }),
        requiredMissionMinutes: 90,
        preferNearestOnSameDate: true,
      })?.id
    ).toBe('90-0900');
    // 10:15 (60m grid) snaps to nearest 90m start 10:45 (+30m vs -75m to 09:00).
    expect(
      selectDepartureAfterLoad(grid90, {
        selectedDate: '2026-11-09',
        previous: slot({ id: '60-1015', startTime: '10:15' }),
        requiredMissionMinutes: 90,
        preferNearestOnSameDate: true,
      })?.startTime
    ).toBe('10:45');
    // Equidistant tie breaks later, and empty compatible list returns null.
    expect(findNearestCompatibleSlot([], '10:00')).toBeNull();
    expect(
      findNearestCompatibleSlot(
        [
          slot({ id: 'early', startTime: '09:00' }),
          slot({ id: 'late', startTime: '11:00' }),
        ],
        '10:00'
      )?.id
    ).toBe('late');
    // Explicit preferredStartTime matches exact first, then nearest when off-grid.
    expect(
      selectDepartureAfterLoad(grid90, {
        selectedDate: '2026-11-09',
        previous: slot({ id: '90-1045', startTime: '10:45' }),
        requiredMissionMinutes: 90,
        preferredStartTime: '12:30',
      })?.id
    ).toBe('90-1230');
    expect(
      selectDepartureAfterLoad(grid90, {
        selectedDate: '2026-11-09',
        previous: slot({ id: '90-1045', startTime: '10:45' }),
        requiredMissionMinutes: 90,
        preferredStartTime: '10:15',
      })?.id
    ).toBe('90-1045');
  });

  it('uses day-level durationAvailability for recreational upgrades when supplied', () => {
    const addons = [addon('cold-dark', 30)];
    // Even if current 60m slot is near closing (maxSlotMinutes=60), upgrade is allowed when 90m slots exist on that day.
    expect(
      resolveAddonToggle({
        addonId: 'cold-dark',
        selectedAddonIds: [],
        addons,
        packageCategory: 'recreational',
        baseDurationMinutes: 60,
        totalDurationMinutes: 60,
        maxSlotMinutes: 60,
        durationAvailability: { 60: { availableCount: 3 }, 90: { availableCount: 2 } },
      })
    ).toEqual({ kind: 'set', ids: ['cold-dark'] });
    // If no 90m slots exist on that day, upgrade is refused.
    expect(
      resolveAddonToggle({
        addonId: 'cold-dark',
        selectedAddonIds: [],
        addons,
        packageCategory: 'recreational',
        baseDurationMinutes: 60,
        totalDurationMinutes: 60,
        maxSlotMinutes: 180,
        durationAvailability: { 60: { availableCount: 1 }, 90: { availableCount: 0 } },
      })
    ).toEqual({ kind: 'no-fit' });
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

  it('allows toggling add-ons on a live Wix calendar whenever they fit in the slot', () => {
    expect(resolveAddonToggle({ ...inputs, addonId: 'trio', wixBookingsAuthoritative: true })).toEqual({
      kind: 'set',
      ids: ['trio'],
    });
    expect(
      resolveAddonToggle({ ...inputs, addonId: 'trio', wixBookingsAuthoritative: true, totalDurationMinutes: 100 })
    ).toEqual({ kind: 'no-fit' });
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

  it('uses the Wix native checkout on a live Wix calendar including add-ons and route requests', () => {
    expect(resolveCheckoutMode(base)).toEqual({ canUseWixNativeCheckout: true, requiresUnsupportedLocalCheckout: false });
    expect(resolveCheckoutMode({ ...base, selectedAddonCount: 1 })).toEqual({
      canUseWixNativeCheckout: true,
      requiresUnsupportedLocalCheckout: false,
    });
    expect(resolveCheckoutMode({ ...base, hasRequestedRoute: true })).toEqual({
      canUseWixNativeCheckout: true,
      requiresUnsupportedLocalCheckout: false,
    });
    expect(resolveCheckoutMode({ ...base, selectedAddonCount: 2, hasRequestedRoute: true })).toEqual({
      canUseWixNativeCheckout: true,
      requiresUnsupportedLocalCheckout: false,
    });
  });

  it('still blocks local checkout when Wix is authoritative and the Wix frontend client is inactive', () => {
    expect(resolveCheckoutMode({ ...base, wixBookingFrontendActive: false })).toEqual({
      canUseWixNativeCheckout: false,
      requiresUnsupportedLocalCheckout: true,
    });
    expect(
      resolveCheckoutMode({ ...base, wixBookingFrontendActive: false, selectedAddonCount: 1, hasRequestedRoute: true })
    ).toEqual({
      canUseWixNativeCheckout: false,
      requiresUnsupportedLocalCheckout: true,
    });
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
    birthdayValue: '1990-11-25',
  };
  const draft: WixCheckoutDraftState = { inputKey: buildWixCheckoutDraftKey(inputs), cartId: 'cart', totalIls: 500 };

  it('keys a draft by the trimmed flight, departure and pilot data', () => {
    expect(buildWixCheckoutDraftKey(inputs)).toBe(buildWixCheckoutDraftKey({ ...inputs, pilotName: 'Ada', notes: '' }));
    expect(buildWixCheckoutDraftKey(inputs)).not.toBe(buildWixCheckoutDraftKey({ ...inputs, slotId: 'slot-2' }));
    expect(buildWixCheckoutDraftKey(inputs)).not.toBe(buildWixCheckoutDraftKey({ ...inputs, pilotPhone: '+972500000000' }));
    expect(buildWixCheckoutDraftKey(inputs)).not.toBe(buildWixCheckoutDraftKey({ ...inputs, birthdayValue: '1990-11-26' }));
    expect(buildWixCheckoutDraftKey(inputs)).not.toBe(buildWixCheckoutDraftKey({ ...inputs, addonIds: ['addon-cold-dark'] }));
    expect(buildWixCheckoutDraftKey({ ...inputs, addonIds: ['a', 'b'] })).toBe(
      buildWixCheckoutDraftKey({ ...inputs, addonIds: ['b', 'a'] })
    );
    expect(buildWixCheckoutDraftKey(inputs)).not.toBe(
      buildWixCheckoutDraftKey({ ...inputs, requestedRouteId: 'route-alpine' })
    );
    expect(buildWixCheckoutDraftKey({ ...inputs, slotId: undefined })).toContain('\u001f\u001f');
  });

  it('formats mission notes and cart notes with selected add-ons and requested route', () => {
    const route = { id: 'route-test', airports: [{ icao: 'LLBG' }, { icao: 'LOWI' }, { icao: 'LSZH' }] };
    expect(buildWixMissionNotes('  Window seat ', ['addon-cold-dark'], route)).toBe(
      'Window seat | Requested route: route-test (LLBG-LOWI-LSZH) | Add-ons: addon-cold-dark'
    );
    expect(
      buildWixMissionNotes(
        '',
        ['addon-cold-dark'],
        { id: 'route-bare' },
        [{ id: 'addon-cold-dark', name: 'Cold & Dark' }],
        90
      )
    ).toBe('Requested route: route-bare | Promo Upgrade (90m) Add-ons: Cold & Dark');
    expect(appendWixMissionSummaryToNote('Consent ok', ['addon-extra-seat'], route)).toBe(
      'Consent ok | Requested route: route-test (LLBG-LOWI-LSZH) | Add-ons: addon-extra-seat'
    );
    expect(appendWixMissionSummaryToNote(null, [], undefined)).toBeNull();
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

  it('returns localized checkout extras copy and falls back to English for unknown codes', () => {
    expect(getCheckoutExtrasCopy('he').opensInNewTab).toBeTruthy();
    expect(getCheckoutExtrasCopy('zz')).toEqual(getCheckoutExtrasCopy('en'));
  });
});

describe('Wix draft prepare typed errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces server 409 departure errors as WixDraftPrepareError', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'That departure is no longer available. Please choose another time.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const err = await prepareWixCheckoutDraft({
      inputKey: 'k1',
      packageId: 'pkg-ultimate-90',
      bookingDate: '2026-12-22',
      startTime: '12:30',
      pilotName: 'Ada',
      pilotEmail: 'ada@example.com',
      pilotPhone: '+972501234567',
      notes: '',
      paymentStartFailed: 'Fallback error',
    }).catch((caught: unknown) => caught);

    expect(err).toBeInstanceOf(WixDraftPrepareError);
    expect((err as WixDraftPrepareError).status).toBe(409);
    expect((err as WixDraftPrepareError).message).toBe(
      'That departure is no longer available. Please choose another time.'
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wix/bookings/checkout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          packageId: 'pkg-ultimate-90',
          bookingDate: '2026-12-22',
          startTime: '12:30',
        }),
      })
    );
  });
});
