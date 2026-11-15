import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createCheckoutService, CheckoutError } from '@/lib/booking/checkout-service';
import {
  SlotReservationConflictError,
  type CardCheckoutCommand,
  type CardCheckoutSession,
  type CheckoutDependencies,
} from '@/lib/booking/checkout-ports';
import { bookingCheckoutSchema } from '@/lib/validation';
import type { Booking } from '@/types';

const FUTURE_DATE = '2099-11-10';
const CLOCK = new Date('2099-01-01T00:00:00.000Z');
const SESSION: CardCheckoutSession = {
  url: 'https://payments.example.test/session-1',
  sessionId: 'session-1',
  expiresAt: '2099-01-01T00:30:00.000Z',
};
const HOLD_CAP = 'You already have unpaid reservations in progress. Complete or cancel one first.';

function checkoutDependencies(): CheckoutDependencies {
  return {
    repository: {
      assertBookableStart: async (date, startTime, durationMinutes) => ({
        id: 'slot-1',
        date,
        startTime,
        endTime: '10:30',
        reservedEndTime: '10:45',
        durationMinutes,
        totalReservedMinutes: durationMinutes + 15,
        available: true,
        blockPeriod: 'morning',
        blockLabel: 'Morning',
        isPrimeTime: false,
        dynamicPriceIls: 450,
        basePriceIls: 450,
        yieldPerMinIls: 15,
        maxAvailableMinutes: 30,
      }),
      getVoucherByCode: async () => undefined,
      ensureMemberProfile: async () => undefined,
      createBooking: async (draft) => ({
        ...draft,
        id: 'booking-1',
        bookingReference: 'SD-737-ABCDEFGHJKLMNPQR',
        createdAt: '2099-01-01T00:00:00.000Z',
      }),
      updateBookingStatus: async () => undefined,
      cancelPendingBooking: async () => undefined,
      listUnpaidPendingBookings: async () => [],
      attachHostedCheckout: async () => undefined,
      createPendingVoucher: async (draft) => ({
        ...draft,
        id: 'voucher-1',
        code: 'SD-VOUCH-ABCDEFGHJKLMNPQRST',
        currentBalanceIls: 0,
        isRedeemed: false,
        paymentStatus: 'pending',
        createdAt: '2099-01-01T00:00:00.000Z',
      }),
      cancelPendingVoucher: async () => undefined,
      redeemVoucher: async () => ({ success: true, newBalance: 0, message: 'Voucher redeemed.' }),
    },
    cardCheckout: {
      createHostedCheckout: async () => SESSION,
      expireHostedCheckout: async () => undefined,
    },
    identity: {
      getAuthenticatedMember: async () => null,
    },
    confirmations: {
      sendBookingConfirmation: async () => undefined,
    },
    origin: {
      resolve: () => 'https://simdream.example.test',
    },
    clock: {
      now: () => CLOCK,
    },
  };
}

function bookingInput(overrides: Record<string, unknown> = {}) {
  return bookingCheckoutSchema.parse({
    kind: 'booking',
    packageId: 'pkg-discovery-30',
    bookingDate: FUTURE_DATE,
    startTime: '10:00',
    pilotName: 'Test Pilot',
    pilotEmail: 'pilot@example.test',
    pilotPhone: '+972501234567',
    experienceLevel: 'beginner',
    addons: [],
    pilotBirthDate: '2000-06-15',
    consent: { rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: true, language: 'en' },
    ...overrides,
  });
}

const checkoutRequest = () => new Request('https://simdream.example.test/api/checkout');

/** The pending booking a first card checkout stores for `bookingInput(overrides)`, with its hosted checkout. */
async function storedHold(overrides: Record<string, unknown> = {}, session: Partial<CardCheckoutSession> = SESSION): Promise<Booking> {
  const dependencies = checkoutDependencies();
  let created: Booking | undefined;
  const createBooking = dependencies.repository.createBooking;
  dependencies.repository.createBooking = async (draft) => (created = await createBooking(draft));
  await createCheckoutService(dependencies).startBookingCheckout(checkoutRequest(), bookingInput(overrides));
  if (!created) throw new Error('No hold was stored');
  return {
    ...created,
    id: 'hold-1',
    stripeCheckoutSessionId: session.sessionId,
    stripeCheckoutUrl: session.url,
    stripeCheckoutExpiresAt: session.expiresAt,
  };
}

/** Records every port call in order, so a test can assert what happened and in which sequence. */
function recordingDependencies(holds: Booking[]) {
  const dependencies = checkoutDependencies();
  const calls: string[] = [];
  const { repository, cardCheckout } = dependencies;
  const record =
    <A extends unknown[], R>(name: string, operation: (...args: A) => Promise<R>) =>
    async (...args: A) => {
      calls.push(name + (typeof args[0] === 'string' ? `:${args[0]}` : ''));
      return operation(...args);
    };
  repository.listUnpaidPendingBookings = record('listUnpaidPendingBookings', async () => holds);
  repository.assertBookableStart = record('assertBookableStart', repository.assertBookableStart);
  repository.createBooking = record('createBooking', repository.createBooking);
  repository.cancelPendingBooking = record('cancelPendingBooking', repository.cancelPendingBooking);
  repository.attachHostedCheckout = record('attachHostedCheckout', repository.attachHostedCheckout);
  cardCheckout.createHostedCheckout = record('createHostedCheckout', async () => ({ ...SESSION, sessionId: 'session-2' }));
  cardCheckout.expireHostedCheckout = record('expireHostedCheckout', cardCheckout.expireHostedCheckout);
  return { dependencies, calls };
}

test('checkout service delegates the hosted redirect through the injected card gateway', async () => {
  const dependencies = checkoutDependencies();
  let command: CardCheckoutCommand | undefined;
  dependencies.cardCheckout.createHostedCheckout = async (received) => {
    command = received;
    return SESSION;
  };
  const service = createCheckoutService(dependencies);

  const result = await service.startBookingCheckout(checkoutRequest(), bookingInput());

  // The expiry is stored with the hold, never returned to the browser.
  expect(result).toEqual({
    kind: 'stripe',
    url: 'https://payments.example.test/session-1',
    sessionId: 'session-1',
  });
  expect(command).toMatchObject({
    bookingId: 'booking-1',
    amountIls: 450,
    customerEmail: 'pilot@example.test',
    successUrl: expect.stringContaining('ref=SD-737-ABCDEFGHJKLMNPQR'),
    cancelUrl: 'https://simdream.example.test/book?cancelled=true',
  });
});

test('checkout service stores the created hosted checkout on the pending booking', async () => {
  const dependencies = checkoutDependencies();
  const attached: Array<[string, CardCheckoutSession]> = [];
  dependencies.repository.attachHostedCheckout = async (bookingId, session) => {
    attached.push([bookingId, session]);
  };

  await createCheckoutService(dependencies).startBookingCheckout(checkoutRequest(), bookingInput());

  expect(attached).toEqual([['booking-1', SESSION]]);
});

test('checkout service expires the new hosted checkout and releases the hold when it cannot be stored', async () => {
  const { dependencies, calls } = recordingDependencies([]);
  dependencies.repository.attachHostedCheckout = async () => {
    throw new Error('storage unavailable');
  };

  await expect(createCheckoutService(dependencies).startBookingCheckout(checkoutRequest(), bookingInput())).rejects.toThrow(
    'storage unavailable'
  );

  expect(calls.slice(-2)).toEqual(['expireHostedCheckout:session-2', 'cancelPendingBooking:booking-1']);
});

test('checkout service still releases the hold and reports the original failure when the new checkout cannot be expired', async () => {
  const { dependencies, calls } = recordingDependencies([]);
  dependencies.repository.attachHostedCheckout = async () => {
    throw new Error('storage unavailable');
  };
  dependencies.cardCheckout.expireHostedCheckout = async () => {
    throw new Error('provider unavailable');
  };

  await expect(createCheckoutService(dependencies).startBookingCheckout(checkoutRequest(), bookingInput())).rejects.toThrow(
    'storage unavailable'
  );

  expect(calls.at(-1)).toBe('cancelPendingBooking:booking-1');
});

test('checkout service releases the hold without contacting the provider again when no hosted checkout was created', async () => {
  const { dependencies, calls } = recordingDependencies([]);
  dependencies.cardCheckout.createHostedCheckout = async () => {
    throw new Error('provider unavailable');
  };

  await expect(createCheckoutService(dependencies).startBookingCheckout(checkoutRequest(), bookingInput())).rejects.toThrow(
    'provider unavailable'
  );

  expect(calls).not.toContain('expireHostedCheckout:session-2');
  expect(calls.at(-1)).toBe('cancelPendingBooking:booking-1');
});

test("checkout service resumes the open hosted checkout of the pilot's own hold without reading the slot", async () => {
  const hold = await storedHold();
  const { dependencies, calls } = recordingDependencies([hold]);

  const result = await createCheckoutService(dependencies).startBookingCheckout(
    checkoutRequest(),
    bookingInput({ pilotEmail: ' Pilot@Example.test ' })
  );

  expect(result).toEqual({ kind: 'stripe', url: SESSION.url, sessionId: SESSION.sessionId });
  // Nothing else: no slot read, no new record, no new or expired hosted checkout.
  expect(calls).toEqual(['listUnpaidPendingBookings:pilot@example.test']);
});

test('checkout service replaces a hold that differs: it expires the stored checkout before cancelling the hold', async () => {
  const hold = await storedHold();
  const { dependencies, calls } = recordingDependencies([hold]);

  const result = await createCheckoutService(dependencies).startBookingCheckout(
    checkoutRequest(),
    bookingInput({ addons: ['addon-extra-seat'] })
  );

  expect(result).toMatchObject({ kind: 'stripe', sessionId: 'session-2' });
  expect(calls).toEqual([
    'listUnpaidPendingBookings:pilot@example.test',
    'expireHostedCheckout:session-1',
    'cancelPendingBooking:hold-1',
    'assertBookableStart:2099-11-10',
    'createBooking',
    'createHostedCheckout',
    'attachHostedCheckout:booking-1',
  ]);
});

test('checkout service replaces a hold whose payable total differs, even with the same add-ons', async () => {
  const hold = { ...(await storedHold()), totalIls: 449 };
  const { dependencies, calls } = recordingDependencies([hold]);

  await createCheckoutService(dependencies).startBookingCheckout(checkoutRequest(), bookingInput());

  expect(calls.slice(1, 3)).toEqual(['expireHostedCheckout:session-1', 'cancelPendingBooking:hold-1']);
});

test.each([
  ['expired', { ...SESSION, expiresAt: CLOCK.toISOString() }],
  ['missing its URL', { ...SESSION, url: undefined }],
  ['missing its expiry', { ...SESSION, expiresAt: undefined }],
])('checkout service replaces a hold whose stored checkout is %s', async (_label, session) => {
  const hold = await storedHold({}, session);
  const { dependencies, calls } = recordingDependencies([hold]);

  await createCheckoutService(dependencies).startBookingCheckout(checkoutRequest(), bookingInput());

  expect(calls.slice(1, 3)).toEqual(['expireHostedCheckout:session-1', 'cancelPendingBooking:hold-1']);
});

test('checkout service keeps the hold when a retry of its departure is refused by the pricing rules', async () => {
  const hold = await storedHold();
  const { dependencies, calls } = recordingDependencies([hold]);

  // Changed add-ons would replace the hold, but a pilot younger than the minimum age is refused first.
  await expect(
    createCheckoutService(dependencies).startBookingCheckout(
      checkoutRequest(),
      bookingInput({ addons: ['addon-extra-seat'], pilotBirthDate: '2095-01-01' })
    )
  ).rejects.toMatchObject({ name: CheckoutError.name, status: 400 });
  expect(calls).toEqual(['listUnpaidPendingBookings:pilot@example.test']);
});

test('checkout service cancels a hold that never stored a hosted checkout without calling the provider', async () => {
  const hold = await storedHold({}, {});
  const { dependencies, calls } = recordingDependencies([hold]);

  await createCheckoutService(dependencies).startBookingCheckout(checkoutRequest(), bookingInput());

  expect(calls.slice(1, 2)).toEqual(['cancelPendingBooking:hold-1']);
  expect(calls.filter((call) => call.startsWith('expireHostedCheckout'))).toEqual([]);
});

test('checkout service refuses a third unpaid hold for one email with a 429 before reading the slot', async () => {
  const holds = [
    await storedHold({ startTime: '12:00' }),
    await storedHold({ startTime: '14:00' }),
  ];
  const { dependencies, calls } = recordingDependencies(holds);

  await expect(createCheckoutService(dependencies).startBookingCheckout(checkoutRequest(), bookingInput())).rejects.toMatchObject({
    name: CheckoutError.name,
    message: HOLD_CAP,
    status: 429,
  });
  expect(calls).toEqual(['listUnpaidPendingBookings:pilot@example.test']);
});

test('checkout service resumes a held departure even when the email already holds the maximum', async () => {
  const holds = [await storedHold({ startTime: '12:00' }), await storedHold()];
  const { dependencies } = recordingDependencies(holds);

  const result = await createCheckoutService(dependencies).startBookingCheckout(checkoutRequest(), bookingInput());

  expect(result).toEqual({ kind: 'stripe', url: SESSION.url, sessionId: SESSION.sessionId });
});

test('checkout service applies no hold rules to a voucher-funded booking', async () => {
  const { dependencies, calls } = recordingDependencies([await storedHold(), await storedHold()]);

  await expect(
    createCheckoutService(dependencies).startBookingCheckout(checkoutRequest(), bookingInput({ voucherCode: 'SD-VOUCH-ABCDEFGHJKLMNPQRST' }))
  ).rejects.toMatchObject({ message: 'This voucher is not active.', status: 409 });
  expect(calls.filter((call) => call.startsWith('listUnpaidPendingBookings'))).toEqual([]);
});

test('checkout service maps an injected repository slot conflict to the existing 409 contract', async () => {
  const dependencies = checkoutDependencies();
  dependencies.repository.assertBookableStart = async () => {
    throw new SlotReservationConflictError('The selected departure slot is no longer available.');
  };
  const service = createCheckoutService(dependencies);

  await expect(service.startBookingCheckout(checkoutRequest(), bookingInput())).rejects.toMatchObject({
    name: CheckoutError.name,
    message: 'The selected departure slot is no longer available.',
    status: 409,
  });
});

test('checkout business rules do not import concrete persistence, payment, mail, auth, or origin implementations', () => {
  for (const module of ['lib/booking/checkout-service.ts', 'lib/booking/checkout-hold-policy.ts']) {
    const source = readFileSync(module, 'utf8');
    for (const implementation of [
      '@/lib/db/store',
      '@/lib/stripe',
      '@/lib/sendgrid',
      '@/lib/auth/request-auth',
      '@/lib/config/server-env',
    ]) {
      expect(source).not.toContain(implementation);
    }
  }
});
