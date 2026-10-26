import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { FlightAddon } from '@/types';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { getLocalizedPackages, type Language } from '@/lib/i18n/translations';
import { generateKantorovichSlots, minutesToTime, timeToMinutes } from '@/lib/scheduler/kantorovich-engine';
import {
  addMinutesToTime,
  calculateMissionManifest,
  canAddonFitInSlot,
  packageFromPriceIls,
  packagePriceForSlot,
  pruneAddonsExceedingSlot,
  sanitizePackageTitle,
} from '@/lib/scheduler/mission-calculator';
import { WEEKDAY_DATES } from './_support/scheduler';

const DEFAULT_MAX_SLOT_MINUTES = 180;
const LANGUAGES: Language[] = ['he', 'en', 'ru', 'fr', 'ar'];

const addonArb = (id: string) =>
  fc.record({
    id: fc.constant(id),
    name: fc.constant(`Add-on ${id}`),
    description: fc.constant(''),
    priceIls: fc.integer({ min: 0, max: 1_000 }),
    durationMinutes: fc.oneof(fc.constant(0), fc.integer({ min: 1, max: 60 })),
    icon: fc.constant<FlightAddon['icon']>('Zap'),
  });

/** A registry of add-ons with unique ids plus a selection drawn from it. */
const registryArb = fc
  .integer({ min: 0, max: 8 })
  .chain((size) => fc.tuple(...Array.from({ length: size }, (_, index) => addonArb(`addon-${index}`))))
  .chain((registry) =>
    fc.record({
      registry: fc.constant<FlightAddon[]>(registry),
      selected: fc.shuffledSubarray(registry.map((addon) => addon.id)),
    })
  );

const pkgArb = fc.record({
  title: fc.constantFrom("Captain's Command Flight (60m)", 'Daytime Special Flight (45m Promo)', 'Airline Interview Prep 90 PRO'),
  durationMinutes: fc.constantFrom(20, 45, 60, 90, 120) as fc.Arbitrary<20 | 45 | 60 | 90 | 120>,
  priceIls: fc.integer({ min: 1, max: 5_000 }),
});

const slotArb = fc.option(
  fc.record({
    startTime: fc.integer({ min: 0, max: 23 * 60 + 59 }).map(minutesToTime),
    endTime: fc.constant('00:00'),
    dynamicPriceIls: fc.integer({ min: 0, max: 5_000 }),
    maxAvailableMinutes: fc.option(fc.integer({ min: 20, max: 400 }), { nil: undefined }),
  }),
  { nil: null }
);

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const byId = (registry: readonly FlightAddon[], ids: readonly string[]) =>
  ids.map((id) => registry.find((addon) => addon.id === id)).filter((addon): addon is FlightAddon => Boolean(addon));

describe('calculateMissionManifest', () => {
  const manifestInput = fc.record({
    pkg: pkgArb,
    slot: slotArb,
    choice: registryArb,
    voucherDiscountIls: fc.integer({ min: -10_000, max: 20_000 }),
  });

  it('adds the selected add-on minutes to the package duration', () => {
    fc.assert(
      fc.property(manifestInput, ({ pkg, slot, choice }) => {
        const manifest = calculateMissionManifest({
          pkg,
          slot,
          selectedAddonIds: choice.selected,
          availableAddons: choice.registry,
        });
        const addonMinutes = sum(byId(choice.registry, choice.selected).map((addon) => addon.durationMinutes));
        expect(manifest.addonsDurationMinutes).toBe(addonMinutes);
        expect(manifest.totalDurationMinutes).toBe(pkg.durationMinutes + addonMinutes);
      })
    );
  });

  it('ends the mission exactly the total duration after its start', () => {
    fc.assert(
      fc.property(manifestInput, ({ pkg, slot, choice }) => {
        const manifest = calculateMissionManifest({
          pkg,
          slot,
          selectedAddonIds: choice.selected,
          availableAddons: choice.registry,
          fallbackStartTime: '10:00',
        });
        expect(manifest.startTime).toBe(slot?.startTime ?? '10:00');
        expect(timeToMinutes(manifest.effectiveEndTime) - timeToMinutes(manifest.startTime)).toBe(
          manifest.totalDurationMinutes
        );
      })
    );
  });

  // Whether a slot tariff may override the package price is exactly what UNIT-1 disputes,
  // so these properties pin the arithmetic and the no-slot fallback, not that precedence.
  it('prices the base fare plus every selected add-on', () => {
    fc.assert(
      fc.property(manifestInput, ({ pkg, slot, choice }) => {
        const manifest = calculateMissionManifest({
          pkg,
          slot,
          selectedAddonIds: choice.selected,
          availableAddons: choice.registry,
        });
        const addonPrice = sum(byId(choice.registry, choice.selected).map((addon) => addon.priceIls));
        expect(manifest.basePriceIls).toBeGreaterThan(0);
        expect(manifest.addonsPriceIls).toBe(addonPrice);
        expect(manifest.subtotalIls).toBe(manifest.basePriceIls + addonPrice);
      })
    );
  });

  it('charges the package price when no slot is selected', () => {
    fc.assert(
      fc.property(pkgArb, (pkg) => {
        expect(calculateMissionManifest({ pkg, slot: null, selectedAddonIds: [], availableAddons: [] }).basePriceIls).toBe(
          pkg.priceIls
        );
      })
    );
  });

  it('clamps the voucher discount to the subtotal and never produces a negative total', () => {
    fc.assert(
      fc.property(manifestInput, ({ pkg, slot, choice, voucherDiscountIls }) => {
        const manifest = calculateMissionManifest({
          pkg,
          slot,
          selectedAddonIds: choice.selected,
          availableAddons: choice.registry,
          voucherDiscountIls,
        });
        expect(manifest.discountIls).toBe(Math.min(Math.max(0, voucherDiscountIls), manifest.subtotalIls));
        expect(manifest.totalIls).toBe(manifest.subtotalIls - manifest.discountIls);
        expect(manifest.totalIls).toBeGreaterThanOrEqual(0);
      })
    );
  });

  it('ignores add-on ids that are not in the registry', () => {
    fc.assert(
      fc.property(manifestInput, fc.array(fc.uuid(), { minLength: 1, maxLength: 4 }), ({ pkg, slot, choice }, unknown) => {
        const input = { pkg, slot, availableAddons: choice.registry };
        const clean = calculateMissionManifest({ ...input, selectedAddonIds: choice.selected });
        const noisy = calculateMissionManifest({ ...input, selectedAddonIds: [...unknown, ...choice.selected] });
        expect(noisy).toEqual(clean);
      })
    );
  });

  it('uses the slot window when present and a 180-minute default otherwise', () => {
    fc.assert(
      fc.property(pkgArb, slotArb, (pkg, slot) => {
        const manifest = calculateMissionManifest({ pkg, slot, selectedAddonIds: [], availableAddons: [] });
        expect(manifest.maxAvailableMinutes).toBe(slot?.maxAvailableMinutes ?? DEFAULT_MAX_SLOT_MINUTES);
      })
    );
  });

  it('itemises the selected add-ons in selection order with their own price and minutes', () => {
    const manifest = calculateMissionManifest({
      pkg: { title: 'Basic Flight Session', durationMinutes: 20, priceIls: 250 },
      selectedAddonIds: ['addon-hd-video', 'addon-cold-dark'],
      availableAddons: FLIGHT_ADDONS,
    });
    expect(manifest.selectedAddonItems.map(({ addon, durationMinutes, priceIls }) => [addon.id, durationMinutes, priceIls])).toEqual([
      ['addon-hd-video', 0, 120],
      ['addon-cold-dark', 20, 200],
    ]);
    expect(manifest).toMatchObject({ startTime: '10:00', effectiveEndTime: '10:40', subtotalIls: 570, totalIls: 570 });
  });
});

describe('server-side package pricing', () => {
  // Pricing every open departure through the engine is how checkout resolves the charged amount.
  const DATES = [WEEKDAY_DATES.sunday, WEEKDAY_DATES.friday, WEEKDAY_DATES.saturday];
  // PRO 60 and PRO 90 were charged the consumer duration tariff until UNIT-1 was fixed.
  const PACKAGES = SIMULATOR_PACKAGES.filter((pkg) => pkg.category !== 'corporate');

  for (const pkg of PACKAGES) {
    it(`charges the catalog tariff for ${pkg.id} on every open departure`, () => {
      const priced = DATES.flatMap((date) =>
        generateKantorovichSlots(date, pkg.durationMinutes, [])
          .filter((slot) => slot.available)
          .map((slot) => ({
            where: `${date} ${slot.startTime}`,
            expected: slot.isPrimeTime ? pkg.primeTimePriceIls ?? pkg.priceIls : pkg.priceIls,
            charged: calculateMissionManifest({ pkg, slot, selectedAddonIds: [], availableAddons: FLIGHT_ADDONS }).totalIls,
          }))
      );
      expect(priced.length).toBeGreaterThan(0);
      expect(priced.filter(({ expected, charged }) => expected !== charged)).toEqual([]);
    });
  }
});

describe('addMinutesToTime', () => {
  it('adds minutes and never moves a time backwards', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 * 60 + 59 }), fc.integer({ min: -500, max: 500 }), (start, delta) => {
        expect(timeToMinutes(addMinutesToTime(minutesToTime(start), delta))).toBe(start + Math.max(0, delta));
      })
    );
  });

  it.each(['', '1000', 'noon'])('returns the malformed start %j unchanged', (start) => {
    expect(addMinutesToTime(start, 30)).toBe(start);
  });
});

describe('canAddonFitInSlot', () => {
  it('always fits add-ons that add no flight time', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000 }), fc.integer({ min: 0, max: 400 }), (current, max) => {
        expect(canAddonFitInSlot({ durationMinutes: 0 }, current, max)).toBe(true);
      })
    );
  });

  it('fits a time-extending add-on exactly when the new total stays within the window', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 0, max: 300 }),
        fc.integer({ min: 0, max: 400 }),
        (minutes, current, max) => {
          expect(canAddonFitInSlot({ durationMinutes: minutes }, current, max)).toBe(current + minutes <= max);
        }
      )
    );
  });

  it('defaults to a 180-minute window', () => {
    expect(canAddonFitInSlot({ durationMinutes: 40 }, 140)).toBe(true);
    expect(canAddonFitInSlot({ durationMinutes: 41 }, 140)).toBe(false);
  });
});

describe('pruneAddonsExceedingSlot', () => {
  const pruneInput = registryArb.chain((choice) =>
    fc.record({
      choice: fc.constant(choice),
      base: fc.constantFrom(20, 45, 60, 90, 120),
      extra: fc.integer({ min: 0, max: 200 }),
    })
  );
  const minutesOf = (registry: readonly FlightAddon[], ids: readonly string[]) =>
    sum(byId(registry, ids).map((addon) => addon.durationMinutes));

  it('never lets the kept add-ons exceed the slot window', () => {
    fc.assert(
      fc.property(pruneInput, ({ choice, base, extra }) => {
        const max = base + extra;
        const kept = pruneAddonsExceedingSlot(choice.selected, choice.registry, base, max);
        expect(base + minutesOf(choice.registry, kept)).toBeLessThanOrEqual(max);
      })
    );
  });

  it('keeps the selection order and only removes, never adds', () => {
    fc.assert(
      fc.property(pruneInput, ({ choice, base, extra }) => {
        const kept = pruneAddonsExceedingSlot(choice.selected, choice.registry, base, base + extra);
        expect(kept).toEqual(choice.selected.filter((id) => kept.includes(id)));
      })
    );
  });

  it('keeps every add-on that adds no flight time', () => {
    fc.assert(
      fc.property(pruneInput, ({ choice, base, extra }) => {
        const kept = pruneAddonsExceedingSlot(choice.selected, choice.registry, base, base + extra);
        const zeroMinute = byId(choice.registry, choice.selected).filter((addon) => addon.durationMinutes === 0);
        expect(kept).toEqual(expect.arrayContaining(zeroMinute.map((addon) => addon.id)));
      })
    );
  });

  it('keeps the whole selection when it already fits the window', () => {
    fc.assert(
      fc.property(pruneInput, ({ choice, base, extra }) => {
        const max = base + minutesOf(choice.registry, choice.selected) + extra;
        expect(pruneAddonsExceedingSlot(choice.selected, choice.registry, base, max)).toEqual(choice.selected);
      })
    );
  });

  it('drops only add-ons that could not be added back without overflowing', () => {
    fc.assert(
      fc.property(pruneInput, ({ choice, base, extra }) => {
        const max = base + extra;
        const kept = pruneAddonsExceedingSlot(choice.selected, choice.registry, base, max);
        const keptMinutes = minutesOf(choice.registry, kept);
        const recoverable = byId(
          choice.registry,
          choice.selected.filter((id) => !kept.includes(id))
        ).filter((addon) => base + keptMinutes + addon.durationMinutes <= max);
        expect(recoverable).toEqual([]);
      })
    );
  });

  it('is idempotent', () => {
    fc.assert(
      fc.property(pruneInput, ({ choice, base, extra }) => {
        const once = pruneAddonsExceedingSlot(choice.selected, choice.registry, base, base + extra);
        expect(pruneAddonsExceedingSlot(once, choice.registry, base, base + extra)).toEqual(once);
      })
    );
  });

  it('drops the add-on that no longer fits a tighter slot', () => {
    expect(
      pruneAddonsExceedingSlot(['addon-cold-dark', 'addon-classical-eu', 'addon-hd-video'], FLIGHT_ADDONS, 60, 100)
    ).toEqual(['addon-cold-dark', 'addon-hd-video']);
  });
});

describe('sanitizePackageTitle', () => {
  it.each([
    ["Captain's Command Flight (60m)", "Captain's Command Flight"],
    ['Daytime Special Flight (45m Promo)', 'Daytime Special Flight'],
    ['Odyssey (90M PROMO)', 'Odyssey'],
    ['Basic Flight (20m) Session', 'Basic Flight Session'],
    ['Airline Interview Prep 60 PRO', 'Airline Interview Prep 60 PRO'],
    ['Fear of Flying (Private)', 'Fear of Flying (Private)'],
  ])('turns %j into %j', (raw, expected) => {
    expect(sanitizePackageTitle(raw)).toBe(expected);
  });

  const word = fc.string({ unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz ABCXYZ0123456789-&\'.'.split('')), maxLength: 12 });
  const suffix = fc.tuple(fc.integer({ min: 1, max: 240 }), fc.boolean(), fc.constantFrom('', ' ', '  ')).map(
    ([minutes, promo, gap]) => `${gap}(${minutes}m${promo ? ' Promo' : ''})`
  );
  const titleArb = fc.array(fc.oneof(word, suffix), { maxLength: 6 }).map((parts) => parts.join(''));

  it('is idempotent for any title built from words and duration suffixes', () => {
    fc.assert(
      fc.property(titleArb, (title) => {
        const once = sanitizePackageTitle(title);
        expect(sanitizePackageTitle(once)).toBe(once);
      }),
      { numRuns: 500 }
    );
  });

  it('removes every duration suffix and surrounding whitespace', () => {
    fc.assert(
      fc.property(titleArb, (title) => {
        const clean = sanitizePackageTitle(title);
        expect(clean).not.toMatch(/\(\d+m(\s+Promo)?\)/i);
        expect(clean).toBe(clean.trim());
      }),
      { numRuns: 500 }
    );
  });

  it('is idempotent for every catalog title in every language', () => {
    const titles = LANGUAGES.flatMap((language) => getLocalizedPackages(language).map((pkg) => pkg.title));
    expect(titles).toHaveLength(LANGUAGES.length * SIMULATOR_PACKAGES.length);
    expect(titles.filter((title) => sanitizePackageTitle(sanitizePackageTitle(title)) !== sanitizePackageTitle(title))).toEqual([]);
  });
});

describe('package price helpers', () => {
  const pro60 = { durationMinutes: 60, priceIls: 890 } as const;
  const ultimate90 = { durationMinutes: 90, priceIls: 850, primeTimePriceIls: 950 } as const;

  it('applies a prime-time tariff only to packages that define one', () => {
    expect(packagePriceForSlot(pro60, true)).toBe(890);
    expect(packagePriceForSlot(ultimate90, false)).toBe(850);
    expect(packagePriceForSlot(ultimate90, true)).toBe(950);
  });

  it('quotes the package price, never the duration tariff, as the card "from" price', () => {
    // 690 is the consumer 60-minute tariff; a PRO 60 card must still show 890.
    expect(packageFromPriceIls(pro60, 690)).toBe(890);
    expect(packageFromPriceIls(pro60, undefined)).toBe(890);
  });

  it('quotes the prime-time price when only prime-time departures remain', () => {
    expect(packageFromPriceIls(ultimate90, 850)).toBe(850);
    expect(packageFromPriceIls(ultimate90, 950)).toBe(950);
  });
});
