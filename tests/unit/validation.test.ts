import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  adminBookingPatchSchema,
  adminScheduleOptimizationSchema,
  adminVoucherRedemptionSchema,
  adminWorkshopPatchSchema,
  bookingCheckoutSchema,
  checkoutRequestSchema,
  validationError,
  voucherCheckoutSchema,
  voucherVerificationSchema,
  workshopInquirySchema,
} from '@/lib/validation';
import { minutesToTime } from '@/lib/scheduler/kantorovich-engine';
import { bookingCheckoutBody, voucherCheckoutBody } from '../support/app';

const optimizationRequest = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  durationMinutes: 60,
  valueIls: 690,
  candidateStartTimes: ['10:00'],
  ...overrides,
});

const PRICE_FIELDS = ['priceIls', 'totalIls', 'subtotalIls', 'discountIls', 'dynamicPriceIls', 'basePriceIls'] as const;

/** Paths of every issue, as validationError reports them. */
function failedFields(schema: z.ZodType, input: unknown): string[] {
  const result = schema.safeParse(input);
  return result.success ? [] : Object.keys(validationError(result.error).fields);
}

const text = (max: number) =>
  fc
    .string({ minLength: 1, maxLength: max })
    .filter((value) => value.trim().length > 0)
    .chain((value) => fc.constantFrom(value, `  ${value} `));
const emailArb = fc.stringMatching(/^[a-z0-9]{1,16}(\.[a-z0-9]{1,8})?(\+[a-z0-9]{1,6})?@[a-z0-9]{1,12}(-[a-z0-9]{1,6})?\.[a-z]{2,6}$/);
const isoDateArb = fc
  .date({ min: new Date('2000-01-01T00:00:00Z'), max: new Date('2099-12-31T00:00:00Z'), noInvalidDate: true })
  .map((date) => date.toISOString().slice(0, 10));
const timeArb = fc.integer({ min: 0, max: 23 * 60 + 59 }).map(minutesToTime);
const digits = (min: number, max: number) =>
  fc.string({ unit: fc.constantFrom(...'0123456789'.split('')), minLength: min, maxLength: max });

const validBookingArb = fc.record(
  {
    kind: fc.constant('booking' as const),
    packageId: fc.stringMatching(/^[a-z0-9-]{1,80}$/),
    bookingDate: isoDateArb,
    startTime: timeArb,
    pilotName: text(120),
    pilotEmail: emailArb,
    pilotPhone: digits(6, 32),
    experienceLevel: fc.constantFrom('beginner', 'enthusiast', 'student_pilot', 'atpl'),
    addons: fc.array(fc.stringMatching(/^addon-[a-z-]{1,40}$/), { maxLength: 16 }),
    voucherCode: fc.stringMatching(/^[a-z0-9-]{0,64}$/),
    notes: fc.string({ maxLength: 2_000 }),
  },
  { requiredKeys: ['kind', 'packageId', 'bookingDate', 'startTime', 'pilotName', 'pilotEmail', 'pilotPhone', 'experienceLevel'] }
);

const validVoucherArb = fc.record(
  {
    kind: fc.constant('voucher' as const),
    // Agora precision: money schemas reject finer fractions (API-10).
    amountIls: fc.integer({ min: 10_000, max: 10_000_000 }).map((agorot) => agorot / 100),
    recipientName: text(120),
    recipientEmail: emailArb,
    senderName: text(120),
    senderEmail: emailArb,
    personalMessage: fc.string({ maxLength: 1_500 }),
  },
  { requiredKeys: ['kind', 'amountIls', 'recipientName', 'recipientEmail', 'senderName', 'senderEmail'] }
);

describe('bookingCheckoutSchema', () => {
  it('accepts every well-formed booking command and normalises its text', () => {
    fc.assert(
      fc.property(validBookingArb, (command) => {
        const result = checkoutRequestSchema.safeParse(command);
        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          kind: 'booking',
          pilotName: command.pilotName.trim(),
          addons: command.addons ?? [],
          ...(command.voucherCode === undefined ? {} : { voucherCode: command.voucherCode.toUpperCase() }),
        });
      }),
      { numRuns: 300 }
    );
  });

  it.each([
    ['kind', 'reservation'],
    ['packageId', ''],
    ['packageId', '    '],
    ['packageId', 'p'.repeat(81)],
    ['bookingDate', '2026-1-05'],
    ['bookingDate', '05/11/2026'],
    ['bookingDate', '2026-11-05T10:00'],
    ['startTime', '24:00'],
    ['startTime', '9:00'],
    ['startTime', '10:60'],
    ['startTime', '10:00:00'],
    ['pilotName', ''],
    ['pilotName', '   '],
    ['pilotName', 'n'.repeat(121)],
    ['pilotName', 42],
    ['pilotEmail', 'not-an-email'],
    ['pilotEmail', 'pilot@'],
    ['pilotEmail', `${'a'.repeat(64)}@${'b'.repeat(186)}.com`],
    ['pilotPhone', '12345'],
    ['pilotPhone', '   123   '],
    ['pilotPhone', '1'.repeat(33)],
    ['experienceLevel', 'expert'],
    ['addons', 'addon-logbook'],
    ['addons', Array.from({ length: 17 }, () => 'addon-logbook')],
    ['addons', ['']],
    ['addons', ['a'.repeat(81)]],
    ['voucherCode', 'V'.repeat(65)],
    ['notes', 'n'.repeat(2_001)],
  ])('rejects %s = %j and names that field', (field, value) => {
    const fields = failedFields(checkoutRequestSchema, bookingCheckoutBody({ [field]: value }));
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.every((path) => path === field || path.startsWith(`${field}.`))).toBe(true);
  });

  it.each([
    ['packageId', 'p'.repeat(80)],
    ['pilotName', 'n'.repeat(120)],
    ['pilotName', `   ${'n'.repeat(120)}   `],
    ['pilotEmail', `${'a'.repeat(64)}@${'b'.repeat(185)}.com`],
    ['pilotPhone', '123456'],
    ['pilotPhone', '1'.repeat(32)],
    ['startTime', '00:00'],
    ['startTime', '23:59'],
    ['addons', Array.from({ length: 16 }, () => 'addon-logbook')],
    ['voucherCode', 'V'.repeat(64)],
    ['notes', 'n'.repeat(2_000)],
  ])('accepts the boundary value %s = %j', (field, value) => {
    expect(failedFields(checkoutRequestSchema, bookingCheckoutBody({ [field]: value }))).toEqual([]);
  });

  it('defaults a missing add-on list to empty and upper-cases the voucher code', () => {
    const { addons: _addons, ...withoutAddons } = bookingCheckoutBody({ voucherCode: '  sd-vouch-abc  ' });
    expect(bookingCheckoutSchema.parse(withoutAddons)).toMatchObject({ addons: [], voucherCode: 'SD-VOUCH-ABC' });
  });

  it('rejects calendar dates that do not exist (UNIT-4)', () => {
    const impossible = ['2027-02-30', '2027-02-29', '2026-11-31', '2026-13-01', '2026-00-10', '2026-11-00'];
    const accepted = impossible.filter((bookingDate) => bookingCheckoutSchema.safeParse(bookingCheckoutBody({ bookingDate })).success);
    expect(accepted).toEqual([]);
  });
});

describe('voucherCheckoutSchema', () => {
  it('accepts every well-formed voucher command and defaults the message', () => {
    fc.assert(
      fc.property(validVoucherArb, (command) => {
        const result = checkoutRequestSchema.safeParse(command);
        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          kind: 'voucher',
          amountIls: command.amountIls,
          personalMessage: (command.personalMessage ?? '').trim(),
        });
      }),
      { numRuns: 300 }
    );
  });

  it.each([
    ['amountIls', 99.99],
    ['amountIls', 100_000.01],
    ['amountIls', -500],
    ['amountIls', Number.POSITIVE_INFINITY],
    ['amountIls', Number.NaN],
    ['amountIls', '500'],
    ['recipientName', ''],
    ['recipientName', 'r'.repeat(121)],
    ['recipientEmail', 'recipient'],
    ['senderName', '  '],
    ['senderEmail', 'sender@@example.test'],
    ['personalMessage', 'm'.repeat(1_501)],
  ])('rejects %s = %j and names that field', (field, value) => {
    const fields = failedFields(checkoutRequestSchema, voucherCheckoutBody({ [field]: value }));
    expect(fields).toEqual([field]);
  });

  it.each([
    ['amountIls', 100],
    ['amountIls', 100_000],
    ['personalMessage', 'm'.repeat(1_500)],
  ])('accepts the boundary value %s = %j', (field, value) => {
    expect(failedFields(voucherCheckoutSchema, voucherCheckoutBody({ [field]: value }))).toEqual([]);
  });
});

describe('checkoutRequestSchema', () => {
  it.each([[{}], [{ kind: 'gift' }], [{ ...voucherCheckoutBody(), kind: 'subscription' }]])(
    'rejects an unknown or missing kind %j',
    (input) => {
      expect(failedFields(checkoutRequestSchema, input)).toEqual(['kind']);
    }
  );

  it('never lets client-supplied price fields survive parsing', () => {
    const priceOverrides = fc.record(
      Object.fromEntries(PRICE_FIELDS.map((field) => [field, fc.oneof(fc.integer(), fc.double(), fc.string(), fc.constant(0))])),
      { requiredKeys: [] }
    );
    fc.assert(
      fc.property(fc.oneof(validBookingArb, validVoucherArb), priceOverrides, (command, overrides) => {
        const result = checkoutRequestSchema.safeParse({ ...command, ...overrides });
        expect(result.success).toBe(true);
        expect(PRICE_FIELDS.filter((field) => result.data !== undefined && field in result.data)).toEqual([]);
      }),
      { numRuns: 300 }
    );
  });

  it('rejects voucher amounts finer than one agora', () => {
    expect(failedFields(checkoutRequestSchema, voucherCheckoutBody({ amountIls: 500.005 }))).toEqual(['amountIls']);
    expect(failedFields(checkoutRequestSchema, voucherCheckoutBody({ amountIls: 500.05 }))).toEqual([]);
  });

  it('ignores a client-chosen amount on a booking command', () => {
    const parsed = checkoutRequestSchema.parse(bookingCheckoutBody({ amountIls: 1, totalIls: 1 }));
    expect(parsed).not.toHaveProperty('amountIls');
    expect(parsed).not.toHaveProperty('totalIls');
  });
});

describe('voucherVerificationSchema', () => {
  it.each([
    ['a 15-character code', { action: 'verify', code: 'SD-VOUCH-ABCDE' + 'F' }],
    ['a code that is too short once trimmed', { action: 'verify', code: '   SD-VOUCH-ABCDEF    ' }],
    ['a 65-character code', { action: 'verify', code: 'S'.repeat(65) }],
    ['another action', { action: 'redeem', code: 'SD-VOUCH-DF7QK3MN8R2V6X9LPA' }],
    ['a missing code', { action: 'verify' }],
  ])('rejects %s', (_label, input) => {
    expect(voucherVerificationSchema.safeParse(input).success).toBe(false);
  });

  it('accepts codes of 16 to 64 characters and normalises case and whitespace', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z0-9-]{16,64}$/), (code) => {
        expect(voucherVerificationSchema.parse({ action: 'verify', code: ` ${code} ` })).toEqual({
          action: 'verify',
          code: code.toUpperCase(),
        });
      })
    );
  });
});

describe('admin and inquiry schemas', () => {
  it('requires a status or a start time when patching a booking, reported against the request', () => {
    expect(failedFields(adminBookingPatchSchema, { id: 'booking-1' })).toEqual(['request']);
    expect(adminBookingPatchSchema.safeParse({ id: 'booking-1', status: 'cancelled' }).success).toBe(true);
    expect(adminBookingPatchSchema.safeParse({ id: 'booking-1', startTime: '11:15' }).success).toBe(true);
  });

  it.each([
    [{ id: '', status: 'confirmed' }, 'id'],
    [{ id: 'booking-1', status: 'refunded' }, 'status'],
    [{ id: 'booking-1', startTime: '25:00' }, 'startTime'],
  ])('rejects the booking patch %j at %s', (input, field) => {
    expect(failedFields(adminBookingPatchSchema, input)).toContain(field);
  });

  it.each([
    [{ code: 'SD-VOUCH-X', amount: 0 }, 'amount'],
    [{ code: 'SD-VOUCH-X', amount: -50 }, 'amount'],
    [{ code: 'SD-VOUCH-X', amount: 100_001 }, 'amount'],
    [{ code: '   ', amount: 50 }, 'code'],
  ])('rejects the voucher redemption %j at %s', (input, field) => {
    expect(failedFields(adminVoucherRedemptionSchema, input)).toEqual([field]);
  });

  it('upper-cases a redeemed voucher code', () => {
    expect(adminVoucherRedemptionSchema.parse({ code: ' sd-vouch-x ', amount: 1 })).toEqual({ code: 'SD-VOUCH-X', amount: 1 });
  });

  const workshop = {
    companyName: 'Acme Aviation',
    contactName: 'Dana',
    email: 'dana@example.test',
    phone: '+972501234567',
    teamSize: 12,
    primaryGoal: 'leadership',
  };

  it.each([
    ['teamSize', 0],
    ['teamSize', 501],
    ['teamSize', 2.5],
    ['teamSize', '12'],
    ['primaryGoal', 'fun'],
    ['targetDate', 'next week'],
    ['companyName', 'c'.repeat(161)],
    ['email', 'dana'],
    ['message', 'm'.repeat(2_001)],
  ])('rejects a workshop inquiry with %s = %j', (field, value) => {
    expect(failedFields(workshopInquirySchema, { ...workshop, [field]: value })).toEqual([field]);
  });

  it.each([1, 500])('accepts a workshop team of %i', (teamSize) => {
    expect(workshopInquirySchema.safeParse({ ...workshop, teamSize }).success).toBe(true);
  });

  it('accepts only the four workshop pipeline statuses', () => {
    for (const status of ['new', 'contacted', 'quoted', 'confirmed']) {
      expect(adminWorkshopPatchSchema.safeParse({ id: 'corp-01', status }).success).toBe(true);
    }
    expect(failedFields(adminWorkshopPatchSchema, { id: 'corp-01', status: 'won' })).toEqual(['status']);
  });
});

describe('adminScheduleOptimizationSchema', () => {
  it('accepts up to eight requests with up to four candidate starts each', () => {
    const requests = Array.from({ length: 8 }, (_, index) =>
      optimizationRequest(`r${index}`, { candidateStartTimes: ['10:00', '11:15', '12:30', '13:45'] })
    );
    expect(adminScheduleOptimizationSchema.safeParse({ date: '2026-11-01', requests }).success).toBe(true);
  });

  it.each([
    ['no requests', [], 'requests'],
    ['nine requests', Array.from({ length: 9 }, (_, index) => optimizationRequest(`r${index}`)), 'requests'],
    ['five candidate starts', [optimizationRequest('a', { candidateStartTimes: ['10:00', '10:15', '10:30', '10:45', '11:00'] })], 'requests.0.candidateStartTimes'],
    ['no candidate starts', [optimizationRequest('a', { candidateStartTimes: [] })], 'requests.0.candidateStartTimes'],
    ['an unsupported duration', [optimizationRequest('a', { durationMinutes: 30 })], 'requests.0.durationMinutes'],
    ['a zero value', [optimizationRequest('a', { valueIls: 0 })], 'requests.0.valueIls'],
  ])('rejects %s', (_label, requests, field) => {
    expect(failedFields(adminScheduleOptimizationSchema, { date: '2026-11-01', requests })).toEqual([field]);
  });

  it('accepts every quarter-hour start and rejects every other minute', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 * 60 + 59 }), (minute) => {
        const result = adminScheduleOptimizationSchema.safeParse({
          date: '2026-11-01',
          requests: [optimizationRequest('a', { candidateStartTimes: [minutesToTime(minute)] })],
        });
        expect(result.success).toBe(minute % 15 === 0);
      }),
      { numRuns: 300 }
    );
  });
});

describe('validationError', () => {
  it('maps every issue to a dotted field path with a generic headline', () => {
    const result = adminScheduleOptimizationSchema.safeParse({
      date: '2026-11-01',
      requests: [
        optimizationRequest('a', { candidateStartTimes: ['10:00', '10:10'] }),
        optimizationRequest('a'),
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error && validationError(result.error)).toEqual({
      error: 'Invalid request.',
      fields: {
        'requests.0.candidateStartTimes.1': 'Start times must align to 15-minute boundaries.',
        requests: 'Request IDs must be unique.',
      },
    });
  });

  it('reports root-level failures under "request"', () => {
    const result = adminBookingPatchSchema.safeParse({ id: 'booking-1' });
    expect(result.error && validationError(result.error)).toEqual({
      error: 'Invalid request.',
      fields: { request: 'Provide a status or start time.' },
    });
  });

  it('returns one non-empty message per failing field of a checkout command', () => {
    const result = checkoutRequestSchema.safeParse(bookingCheckoutBody({ pilotEmail: 'nope', startTime: '7am', pilotName: '' }));
    expect(result.error && validationError(result.error).fields).toEqual({
      pilotEmail: expect.any(String),
      startTime: 'Use HH:mm.',
      pilotName: expect.any(String),
    });
  });
});
