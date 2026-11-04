import type { VerifiedMemberIdentity } from '@/lib/auth/member-ownership';
import type { Booking, FlightSlot, GiftVoucher } from '@/types';

/** A repository declined a requested departure because it is no longer bookable. */
export class SlotReservationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlotReservationConflictError';
  }
}

export type BookingDraft = Omit<Booking, 'id' | 'bookingReference' | 'createdAt'>;
export type PendingVoucherDraft = Omit<
  GiftVoucher,
  'id' | 'code' | 'createdAt' | 'isRedeemed' | 'currentBalanceIls' | 'paymentStatus'
>;

export interface VoucherRedemption {
  success: boolean;
  newBalance: number;
  message: string;
}

/**
 * Persistence operations required by checkout only. This deliberately excludes
 * admin, CRM and reporting operations from the checkout dependency surface.
 */
export interface CheckoutRepository {
  assertBookableStart(date: string, startTime: string, durationMinutes: number): Promise<FlightSlot>;
  getVoucherByCode(code: string): Promise<GiftVoucher | undefined>;
  ensureMemberProfile(member: VerifiedMemberIdentity): Promise<void>;
  createBooking(draft: BookingDraft): Promise<Booking>;
  updateBookingStatus(id: string, status: Booking['status']): Promise<Booking | undefined>;
  cancelPendingBooking(id: string): Promise<Booking | undefined>;
  createPendingVoucher(draft: PendingVoucherDraft): Promise<GiftVoucher>;
  cancelPendingVoucher(id: string): Promise<void>;
  redeemVoucher(code: string, amountIls: number): Promise<VoucherRedemption>;
}

/** Provider-neutral command for a hosted card-payment redirect. */
export interface CardCheckoutCommand {
  bookingId?: string;
  voucherId?: string;
  title: string;
  description: string;
  amountIls: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CardCheckoutSession {
  url: string;
  sessionId: string;
}

export interface CardCheckoutGateway {
  createHostedCheckout(command: CardCheckoutCommand): Promise<CardCheckoutSession>;
}

export interface CheckoutIdentityGateway {
  getAuthenticatedMember(request: Request): Promise<VerifiedMemberIdentity | null>;
}

export interface BookingConfirmationGateway {
  sendBookingConfirmation(booking: Booking): Promise<unknown>;
}

export interface CheckoutOriginResolver {
  resolve(request: Request): string;
}

export interface CheckoutClock {
  now(): Date;
}

/**
 * Infrastructure boundary for checkout. Stripe/Supabase/SendGrid/Wix adapters
 * implement these ports outside the business orchestration module.
 */
export interface CheckoutDependencies {
  repository: CheckoutRepository;
  cardCheckout: CardCheckoutGateway;
  identity: CheckoutIdentityGateway;
  confirmations: BookingConfirmationGateway;
  origin: CheckoutOriginResolver;
  clock: CheckoutClock;
}
