import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createCheckoutService, CheckoutError } from '@/lib/booking/checkout-service';
import {
  SlotReservationConflictError,
  type CardCheckoutCommand,
  type CheckoutDependencies,
} from '@/lib/booking/checkout-ports';
import { bookingCheckoutSchema } from '@/lib/validation';

const FUTURE_DATE = '2099-11-10';

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
      createHostedCheckout: async () => ({
        url: 'https://payments.example.test/session-1',
        sessionId: 'session-1',
      }),
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
      now: () => new Date('2099-01-01T00:00:00.000Z'),
    },
  };
}

test('checkout service delegates the hosted redirect through the injected card gateway', async () => {
  const dependencies = checkoutDependencies();
  let command: CardCheckoutCommand | undefined;
  dependencies.cardCheckout.createHostedCheckout = async (received) => {
    command = received;
    return { url: 'https://payments.example.test/session-1', sessionId: 'session-1' };
  };
  const service = createCheckoutService(dependencies);
  const booking = bookingCheckoutSchema.parse({
    kind: 'booking',
    packageId: 'pkg-discovery-30',
    bookingDate: FUTURE_DATE,
    startTime: '10:00',
    pilotName: 'Test Pilot',
    pilotEmail: 'pilot@example.test',
    pilotPhone: '+972501234567',
    experienceLevel: 'beginner',
    addons: [],
  });

  const result = await service.startBookingCheckout(new Request('https://simdream.example.test/api/checkout'), booking);

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

test('checkout service maps an injected repository slot conflict to the existing 409 contract', async () => {
  const dependencies = checkoutDependencies();
  dependencies.repository.assertBookableStart = async () => {
    throw new SlotReservationConflictError('The selected departure slot is no longer available.');
  };
  const service = createCheckoutService(dependencies);
  const booking = bookingCheckoutSchema.parse({
    kind: 'booking',
    packageId: 'pkg-discovery-30',
    bookingDate: FUTURE_DATE,
    startTime: '10:00',
    pilotName: 'Test Pilot',
    pilotEmail: 'pilot@example.test',
    pilotPhone: '+972501234567',
    experienceLevel: 'beginner',
    addons: [],
  });

  await expect(service.startBookingCheckout(new Request('https://simdream.example.test/api/checkout'), booking)).rejects.toMatchObject(
    {
      name: CheckoutError.name,
      message: 'The selected departure slot is no longer available.',
      status: 409,
    }
  );
});

test('checkout business rules do not import concrete persistence, payment, mail, auth, or origin implementations', () => {
  const source = readFileSync('lib/booking/checkout-service.ts', 'utf8');
  for (const implementation of [
    '@/lib/db/store',
    '@/lib/stripe',
    '@/lib/sendgrid',
    '@/lib/auth/request-auth',
    '@/lib/config/server-env',
  ]) {
    expect(source).not.toContain(implementation);
  }
});
