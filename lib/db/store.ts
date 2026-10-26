import 'server-only';

import {
  Booking,
  CorporateInquiry,
  DailyEfficiencyReport,
  FlightAddon,
  FlightLog,
  FlightSlot,
  GiftVoucher,
  SimulatorPackage,
  UserProfile,
} from '@/types';
import {
  DEMO_BOOKINGS,
  DEMO_CORPORATE_INQUIRIES,
  DEMO_FLIGHT_LOGS,
  DEMO_USERS,
  DEMO_VOUCHERS,
  FLIGHT_ADDONS,
  SIMULATOR_PACKAGES,
} from './seed-data';
import { isProduction } from '@/lib/config/server-env';
import { getSupabaseAdmin, requireSupabaseAdmin } from './supabase-admin';
import { generateBookingReference, generateVoucherCode } from '@/lib/utils';
import { normalizeMemberEmail, type VerifiedMemberIdentity } from '@/lib/auth/member-ownership';
import {
  closeDepartedSlots,
  evaluateDailyEfficiency,
  generateKantorovichSlots,
  getDayOperatingConfig,
  getReservedMinutesForFlight,
  minutesToTime,
  timeToMinutes,
} from '@/lib/scheduler/kantorovich-engine';

type DatabaseRow = Record<string, unknown>;

/**
 * Storage is unreachable, misconfigured or failing. Its message is for server logs
 * only; routes answer with a generic 503 so clients retry and learn nothing internal.
 */
export class PersistenceError extends Error {
  constructor(message = 'Persistent storage is unavailable.') {
    super(message);
    this.name = 'PersistenceError';
  }
}

/** A scheduling rule refused the change (slot taken, outside hours). The message is user-safe; map to 409. */
export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingConflictError';
  }
}

/** The requested record does not exist; map to 404. */
export class RecordNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecordNotFoundError';
  }
}

// Postgres exclusion_violation: the bookings overlap constraint from migration 001.
const EXCLUSION_VIOLATION = '23P01';

export type ConfirmationKind = 'booking' | 'voucher';
export type ConfirmationClaim = 'claimed' | 'sent' | 'busy';
const CONFIRMATION_TABLES: Record<ConfirmationKind, string> = { booking: 'bookings', voucher: 'gift_vouchers' };
const CONFIRMATION_CLAIM_TTL_MS = 10 * 60 * 1000;

function databaseError(error: { message?: string; code?: string } | null): never {
  if (error?.code === EXCLUSION_VIOLATION) {
    throw new BookingConflictError('The selected departure slot is no longer available.');
  }
  console.error('Persistent storage operation failed', error?.message);
  throw new PersistenceError('Persistent storage operation failed.');
}

function getValue(row: DatabaseRow, key: string): unknown {
  return row[key];
}

function requiredString(row: DatabaseRow, key: string): string {
  const result = getValue(row, key);
  if (typeof result !== 'string') throw new PersistenceError(`Database row is missing ${key}.`);
  return result;
}

function optionalString(row: DatabaseRow, key: string): string | undefined {
  const result = getValue(row, key);
  return typeof result === 'string' ? result : undefined;
}

function asNumber(input: unknown, fallback = 0): number {
  const number = typeof input === 'number' ? input : Number(input);
  return Number.isFinite(number) ? number : fallback;
}

function asStringList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is string => typeof item === 'string');
}

function toBooking(row: DatabaseRow): Booking {
  return {
    id: requiredString(row, 'id'),
    bookingReference: requiredString(row, 'booking_reference'),
    userId: typeof getValue(row, 'user_id') === 'string' ? String(getValue(row, 'user_id')) : undefined,
    packageId: requiredString(row, 'package_id'),
    packageTitle: requiredString(row, 'package_title'),
    durationMinutes: asNumber(getValue(row, 'duration_minutes')),
    bookingDate: requiredString(row, 'booking_date'),
    startTime: requiredString(row, 'start_time').slice(0, 5),
    endTime: requiredString(row, 'end_time').slice(0, 5),
    pilotName: requiredString(row, 'pilot_name'),
    pilotEmail: requiredString(row, 'pilot_email'),
    pilotPhone: requiredString(row, 'pilot_phone'),
    experienceLevel: requiredString(row, 'experience_level') as Booking['experienceLevel'],
    addons: asStringList(getValue(row, 'addons')),
    subtotalIls: asNumber(getValue(row, 'subtotal_ils')),
    discountIls: asNumber(getValue(row, 'discount_ils')),
    totalIls: asNumber(getValue(row, 'total_ils')),
    voucherCode: typeof getValue(row, 'voucher_code') === 'string' ? String(getValue(row, 'voucher_code')) : undefined,
    status: requiredString(row, 'status') as Booking['status'],
    paymentStatus: requiredString(row, 'payment_status') as Booking['paymentStatus'],
    paymentMethod: requiredString(row, 'payment_method') as Booking['paymentMethod'],
    stripePaymentIntentId:
      typeof getValue(row, 'stripe_payment_intent') === 'string'
        ? String(getValue(row, 'stripe_payment_intent'))
        : undefined,
    notes: typeof getValue(row, 'notes') === 'string' ? String(getValue(row, 'notes')) : undefined,
    createdAt: requiredString(row, 'created_at'),
    confirmationClaimedAt: optionalString(row, 'confirmation_claimed_at'),
    confirmationSentAt: optionalString(row, 'confirmation_sent_at'),
  };
}

function bookingInsertRow(booking: Booking): DatabaseRow {
  return {
    booking_reference: booking.bookingReference,
    user_id: booking.userId || null,
    package_id: booking.packageId,
    package_title: booking.packageTitle,
    duration_minutes: booking.durationMinutes,
    booking_date: booking.bookingDate,
    start_time: booking.startTime,
    end_time: booking.endTime,
    pilot_name: booking.pilotName,
    pilot_email: booking.pilotEmail,
    pilot_phone: booking.pilotPhone,
    experience_level: booking.experienceLevel,
    addons: booking.addons,
    subtotal_ils: booking.subtotalIls,
    discount_ils: booking.discountIls,
    total_ils: booking.totalIls,
    voucher_code: booking.voucherCode || null,
    status: booking.status,
    payment_status: booking.paymentStatus,
    payment_method: booking.paymentMethod,
    stripe_payment_intent: booking.stripePaymentIntentId || null,
    notes: booking.notes || null,
  };
}

function toVoucher(row: DatabaseRow): GiftVoucher {
  return {
    id: requiredString(row, 'id'),
    code: requiredString(row, 'code'),
    initialValueIls: asNumber(getValue(row, 'initial_value_ils')),
    currentBalanceIls: asNumber(getValue(row, 'current_balance_ils')),
    recipientName: requiredString(row, 'recipient_name'),
    recipientEmail: requiredString(row, 'recipient_email'),
    senderName: requiredString(row, 'sender_name'),
    senderEmail: requiredString(row, 'sender_email'),
    personalMessage: typeof getValue(row, 'personal_message') === 'string' ? String(getValue(row, 'personal_message')) : '',
    packageId: typeof getValue(row, 'package_id') === 'string' ? String(getValue(row, 'package_id')) : undefined,
    packageTitle: typeof getValue(row, 'package_title') === 'string' ? String(getValue(row, 'package_title')) : undefined,
    expiryDate: requiredString(row, 'expiry_date'),
    isRedeemed: Boolean(getValue(row, 'is_redeemed')),
    paymentStatus: (typeof getValue(row, 'payment_status') === 'string'
      ? getValue(row, 'payment_status')
      : 'paid') as GiftVoucher['paymentStatus'],
    stripeCheckoutSessionId:
      typeof getValue(row, 'stripe_checkout_session_id') === 'string'
        ? String(getValue(row, 'stripe_checkout_session_id'))
        : undefined,
    activatedAt: typeof getValue(row, 'activated_at') === 'string' ? String(getValue(row, 'activated_at')) : undefined,
    createdAt: requiredString(row, 'created_at'),
    confirmationClaimedAt: optionalString(row, 'confirmation_claimed_at'),
    confirmationSentAt: optionalString(row, 'confirmation_sent_at'),
  };
}

function voucherInsertRow(voucher: GiftVoucher): DatabaseRow {
  return {
    code: voucher.code,
    initial_value_ils: voucher.initialValueIls,
    current_balance_ils: voucher.currentBalanceIls,
    recipient_name: voucher.recipientName,
    recipient_email: voucher.recipientEmail,
    sender_name: voucher.senderName,
    sender_email: voucher.senderEmail,
    personal_message: voucher.personalMessage || null,
    package_id: voucher.packageId || null,
    package_title: voucher.packageTitle || null,
    expiry_date: voucher.expiryDate,
    is_redeemed: voucher.isRedeemed,
    payment_status: voucher.paymentStatus,
    stripe_checkout_session_id: voucher.stripeCheckoutSessionId || null,
    activated_at: voucher.activatedAt || null,
  };
}

function toCorporateInquiry(row: DatabaseRow): CorporateInquiry {
  return {
    id: requiredString(row, 'id'),
    companyName: requiredString(row, 'company_name'),
    contactName: requiredString(row, 'contact_name'),
    email: requiredString(row, 'email'),
    phone: requiredString(row, 'phone'),
    teamSize: asNumber(getValue(row, 'team_size')),
    targetDate: typeof getValue(row, 'target_date') === 'string' ? String(getValue(row, 'target_date')) : undefined,
    primaryGoal: requiredString(row, 'primary_goal') as CorporateInquiry['primaryGoal'],
    message: typeof getValue(row, 'message') === 'string' ? String(getValue(row, 'message')) : undefined,
    status: requiredString(row, 'status') as CorporateInquiry['status'],
    createdAt: requiredString(row, 'created_at'),
  };
}

function toPackage(row: DatabaseRow): SimulatorPackage {
  return {
    id: requiredString(row, 'id'),
    slug: requiredString(row, 'slug'),
    title: requiredString(row, 'title'),
    category: requiredString(row, 'category') as SimulatorPackage['category'],
    durationMinutes: asNumber(getValue(row, 'duration_minutes')) as SimulatorPackage['durationMinutes'],
    priceIls: asNumber(getValue(row, 'price_ils')),
    primeTimePriceIls: asNumber(getValue(row, 'prime_time_price_ils')) || undefined,
    priceUsd: asNumber(getValue(row, 'price_usd')),
    shortDesc: requiredString(row, 'short_desc'),
    description: requiredString(row, 'description'),
    featured: Boolean(getValue(row, 'featured')),
    badge: typeof getValue(row, 'badge') === 'string' ? String(getValue(row, 'badge')) : undefined,
    daytimeOnly: Boolean(getValue(row, 'daytime_only')),
    kantorovichVar: typeof getValue(row, 'kantorovich_var') === 'string'
      ? getValue(row, 'kantorovich_var') as SimulatorPackage['kantorovichVar']
      : undefined,
    yieldPerMinIls: asNumber(getValue(row, 'yield_per_min_ils')) || undefined,
    features: asStringList(getValue(row, 'features')),
    includesBriefing: Boolean(getValue(row, 'includes_briefing')),
    instructorIncluded: Boolean(getValue(row, 'instructor_included')),
    guestSeats: asNumber(getValue(row, 'guest_seats')),
  };
}

function assertPersistentWrite(error: { message?: string; code?: string } | null): void {
  if (error) databaseError(error);
}

/**
 * Server-only repository. Development and tests use the in-memory seed store.
 * Production requires Supabase and fails closed without it, so a misconfigured
 * deployment cannot take orders it would lose. ALLOW_IN_MEMORY_STORE=true is an
 * explicit opt-in for demo and test servers only; never set it in a real deployment.
 */
class SimDreamStore {
  private packages: SimulatorPackage[] = [...SIMULATOR_PACKAGES];
  private addons: FlightAddon[] = [...FLIGHT_ADDONS];
  private bookings: Booking[] = [...DEMO_BOOKINGS];
  private vouchers: GiftVoucher[] = [...DEMO_VOUCHERS];
  private inquiries: CorporateInquiry[] = [...DEMO_CORPORATE_INQUIRIES];
  private flightLogs: FlightLog[] = [...DEMO_FLIGHT_LOGS];
  private users: UserProfile[] = [...DEMO_USERS];

  /** True when reads and writes go to Supabase; throws when production has no storage. */
  private get production(): boolean {
    if (!isProduction) return false;
    if (getSupabaseAdmin()) return true;
    if (process.env.ALLOW_IN_MEMORY_STORE === 'true') return false;
    throw new PersistenceError('Persistent storage is not configured.');
  }

  async getPackages(): Promise<SimulatorPackage[]> {
    if (!this.production) return this.packages;
    const { data, error } = await requireSupabaseAdmin()
      .from('packages')
      .select('*')
      .eq('is_active', true);
    assertPersistentWrite(error);
    return (data as DatabaseRow[]).map(toPackage);
  }

  async getPackageBySlug(slug: string): Promise<SimulatorPackage | undefined> {
    const packages = await this.getPackages();
    return packages.find((pkg) => pkg.slug === slug);
  }

  async getPackageById(id: string): Promise<SimulatorPackage | undefined> {
    const packages = await this.getPackages();
    return packages.find((pkg) => pkg.id === id);
  }

  getAddons(): FlightAddon[] {
    return this.addons;
  }

  async getAvailableSlots(dateString: string, durationMinutes = 60): Promise<FlightSlot[]> {
    return closeDepartedSlots(
      generateKantorovichSlots(dateString, durationMinutes, await this.getBookings()),
      new Date()
    );
  }

  async getDurationAvailability(
    dateString: string
  ): Promise<Record<number, { availableCount: number; minPriceIls: number }>> {
    const bookings = await this.getBookings();
    const now = new Date();
    const durations = [20, 30, 45, 60, 90, 120];
    return Object.fromEntries(
      durations.map((duration) => {
        const available = closeDepartedSlots(generateKantorovichSlots(dateString, duration, bookings), now).filter(
          (slot) => slot.available
        );
        return [
          duration,
          {
            availableCount: available.length,
            minPriceIls: available.length
              ? Math.min(...available.map((slot) => slot.dynamicPriceIls || slot.basePriceIls))
              : 0,
          },
        ];
      })
    );
  }

  async getDailyEfficiencyReport(dateString: string): Promise<DailyEfficiencyReport> {
    return evaluateDailyEfficiency(dateString, await this.getBookings());
  }

  async getBookings(): Promise<Booking[]> {
    if (!this.production) return this.bookings;
    const { data, error } = await requireSupabaseAdmin()
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    assertPersistentWrite(error);
    return (data as DatabaseRow[]).map(toBooking);
  }

  async getBookingsByEmail(email: string): Promise<Booking[]> {
    const normalized = normalizeMemberEmail(email);
    if (!this.production) {
      return this.bookings.filter((booking) => normalizeMemberEmail(booking.pilotEmail) === normalized);
    }
    // Exact match on the normalized column: ILIKE would treat "_" and "%" in an email as wildcards.
    const { data, error } = await requireSupabaseAdmin()
      .from('bookings')
      .select('*')
      .eq('pilot_email', normalized)
      .order('created_at', { ascending: false });
    assertPersistentWrite(error);
    return (data as DatabaseRow[]).map(toBooking);
  }

  async getBookingsForMember(memberId: string): Promise<Booking[]> {
    if (!this.production) {
      return this.bookings.filter((booking) => booking.userId === memberId);
    }
    const { data, error } = await requireSupabaseAdmin()
      .from('bookings')
      .select('*')
      .eq('user_id', memberId)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false });
    assertPersistentWrite(error);
    return (data as DatabaseRow[]).map(toBooking);
  }

  async ensureMemberProfile(member: VerifiedMemberIdentity): Promise<void> {
    const email = normalizeMemberEmail(member.email);
    const fallbackName = email.split('@')[0] || 'Sim Dream Member';
    const fullName = member.fullName?.trim().slice(0, 120) || fallbackName;

    if (!this.production) {
      const existing = this.users.find((user) => user.id === member.id);
      if (!existing) {
        this.users.push({
          id: member.id,
          email,
          fullName,
          role: 'user',
          totalHours: 0,
          totalFlights: 0,
          createdAt: new Date().toISOString(),
        });
      }
      return;
    }

    const { error } = await requireSupabaseAdmin()
      .from('profiles')
      .upsert(
        { id: member.id, email, full_name: fullName },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    assertPersistentWrite(error);
  }

  async linkGuestBookingsToMember(member: VerifiedMemberIdentity): Promise<number> {
    const email = normalizeMemberEmail(member.email);
    if (!this.production) {
      let linked = 0;
      for (const booking of this.bookings) {
        if (
          !booking.userId &&
          booking.paymentStatus === 'paid' &&
          normalizeMemberEmail(booking.pilotEmail) === email
        ) {
          booking.userId = member.id;
          linked += 1;
        }
      }
      return linked;
    }

    const { data, error } = await requireSupabaseAdmin()
      .from('bookings')
      .update({ user_id: member.id })
      .is('user_id', null)
      .eq('payment_status', 'paid')
      .eq('pilot_email', email)
      .select('id');
    assertPersistentWrite(error);
    return Array.isArray(data) ? data.length : 0;
  }

  async getBookingByRef(ref: string): Promise<Booking | undefined> {
    if (!this.production) {
      return this.bookings.find((booking) => booking.bookingReference.toLowerCase() === ref.toLowerCase());
    }
    const { data, error } = await requireSupabaseAdmin()
      .from('bookings')
      .select('*')
      .eq('booking_reference', ref.trim().toUpperCase())
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toBooking(data as DatabaseRow) : undefined;
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    if (!this.production) return this.bookings.find((booking) => booking.id === id);
    const { data, error } = await requireSupabaseAdmin()
      .from('bookings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toBooking(data as DatabaseRow) : undefined;
  }

  async createBooking(data: Omit<Booking, 'id' | 'bookingReference' | 'createdAt'>): Promise<Booking> {
    const booking: Booking = {
      ...data,
      // Stored normalized so member linking can match it exactly (see migration 003).
      pilotEmail: normalizeMemberEmail(data.pilotEmail),
      id: crypto.randomUUID(),
      bookingReference: generateBookingReference(),
      createdAt: new Date().toISOString(),
    };
    if (!this.production) {
      // Mirrors the production exclusion constraint. Synchronous check-and-insert, so
      // concurrent checkouts cannot interleave between the overlap check and the insert.
      if (booking.status !== 'cancelled' && this.overlapsActiveBooking(booking)) {
        throw new BookingConflictError('The selected departure slot is no longer available.');
      }
      this.bookings.unshift(booking);
      return booking;
    }
    const { data: inserted, error } = await requireSupabaseAdmin()
      .from('bookings')
      .insert(bookingInsertRow(booking))
      .select('*')
      .single();
    assertPersistentWrite(error);
    return toBooking(inserted as DatabaseRow);
  }

  async updateBookingStatus(id: string, status: Booking['status']): Promise<Booking | undefined> {
    if (!this.production) {
      const booking = this.bookings.find((item) => item.id === id);
      if (booking) booking.status = status;
      return booking;
    }
    const { data, error } = await requireSupabaseAdmin()
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toBooking(data as DatabaseRow) : undefined;
  }

  async cancelPendingBooking(id: string): Promise<Booking | undefined> {
    if (!this.production) {
      const booking = this.bookings.find((item) => item.id === id);
      if (!booking || booking.status !== 'pending' || booking.paymentStatus !== 'pending') return undefined;
      booking.status = 'cancelled';
      return booking;
    }
    const { data, error } = await requireSupabaseAdmin()
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'pending')
      .eq('payment_status', 'pending')
      .select('*')
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toBooking(data as DatabaseRow) : undefined;
  }

  async updateBookingTime(id: string, startTime: string): Promise<Booking | undefined> {
    const booking = await this.getBookingById(id);
    if (!booking) return undefined;
    const endTime = minutesToTime(timeToMinutes(startTime) + booking.durationMinutes);
    if (!this.production) {
      booking.startTime = startTime;
      booking.endTime = endTime;
      return booking;
    }
    const { data, error } = await requireSupabaseAdmin()
      .from('bookings')
      .update({ start_time: startTime, end_time: endTime })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toBooking(data as DatabaseRow) : undefined;
  }

  /**
   * Confirms a booking whose payment completed, only while it is still pending. A booking
   * the desk cancelled (its departure possibly re-sold) is never revived; see
   * recordPaymentForCancelledBooking.
   */
  async markBookingPaidIfPending(id: string, paymentIntentId: string): Promise<Booking | undefined> {
    if (!this.production) {
      const booking = this.bookings.find((item) => item.id === id);
      if (!booking || booking.paymentStatus !== 'pending' || booking.status !== 'pending') return undefined;
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      booking.stripePaymentIntentId = paymentIntentId;
      return booking;
    }
    const { data, error } = await requireSupabaseAdmin()
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        stripe_payment_intent: paymentIntentId,
      })
      .eq('id', id)
      .eq('payment_status', 'pending')
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toBooking(data as DatabaseRow) : undefined;
  }

  /**
   * Records a payment that completed after its booking was cancelled. The booking stays
   * cancelled; "cancelled + paid" tells the desk a refund is owed.
   */
  async recordPaymentForCancelledBooking(id: string, paymentIntentId: string): Promise<Booking | undefined> {
    if (!this.production) {
      const booking = this.bookings.find((item) => item.id === id);
      if (!booking || booking.status !== 'cancelled' || booking.paymentStatus !== 'pending') return undefined;
      booking.paymentStatus = 'paid';
      booking.stripePaymentIntentId = paymentIntentId;
      return booking;
    }
    const { data, error } = await requireSupabaseAdmin()
      .from('bookings')
      .update({ payment_status: 'paid', stripe_payment_intent: paymentIntentId })
      .eq('id', id)
      .eq('status', 'cancelled')
      .eq('payment_status', 'pending')
      .select('*')
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toBooking(data as DatabaseRow) : undefined;
  }

  /**
   * Records a gift-voucher payment that completed after its checkout was voided. The voucher
   * stays void (unspendable); the recorded session tells the desk a refund is owed.
   */
  async recordPaymentForVoidedVoucher(id: string, checkoutSessionId: string): Promise<GiftVoucher | undefined> {
    if (!this.production) {
      const voucher = this.vouchers.find((item) => item.id === id);
      if (!voucher || voucher.paymentStatus !== 'refunded' || voucher.stripeCheckoutSessionId) return undefined;
      voucher.stripeCheckoutSessionId = checkoutSessionId;
      return voucher;
    }
    const { data, error } = await requireSupabaseAdmin()
      .from('gift_vouchers')
      .update({ stripe_checkout_session_id: checkoutSessionId })
      .eq('id', id)
      .eq('payment_status', 'refunded')
      .is('stripe_checkout_session_id', null)
      .select('*')
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toVoucher(data as DatabaseRow) : undefined;
  }

  /**
   * Claims the right to send a confirmation email, so retried and concurrent webhook
   * deliveries send it exactly once:
   * - 'claimed': the caller must send, then complete or release the claim;
   * - 'sent': nothing left to do;
   * - 'busy': another delivery holds a fresh claim. The caller must not acknowledge
   *   success, or the email is lost if that delivery crashed; a claim older than
   *   CONFIRMATION_CLAIM_TTL_MS counts as abandoned and is taken over.
   */
  async claimConfirmation(kind: ConfirmationKind, id: string): Promise<ConfirmationClaim> {
    const now = Date.now();
    if (!this.production) {
      const record = this.confirmationRecord(kind, id);
      if (!record || record.confirmationSentAt) return 'sent';
      if (record.confirmationClaimedAt && now - Date.parse(record.confirmationClaimedAt) < CONFIRMATION_CLAIM_TTL_MS) {
        return 'busy';
      }
      record.confirmationClaimedAt = new Date(now).toISOString();
      return 'claimed';
    }
    const table = CONFIRMATION_TABLES[kind];
    const staleBefore = new Date(now - CONFIRMATION_CLAIM_TTL_MS).toISOString();
    const { data, error } = await requireSupabaseAdmin()
      .from(table)
      .update({ confirmation_claimed_at: new Date(now).toISOString() })
      .eq('id', id)
      .is('confirmation_sent_at', null)
      .or(`confirmation_claimed_at.is.null,confirmation_claimed_at.lt.${staleBefore}`)
      .select('id');
    assertPersistentWrite(error);
    if (Array.isArray(data) && data.length > 0) return 'claimed';

    const { data: current, error: readError } = await requireSupabaseAdmin()
      .from(table)
      .select('confirmation_sent_at')
      .eq('id', id)
      .maybeSingle();
    assertPersistentWrite(readError);
    return !current || (current as DatabaseRow).confirmation_sent_at ? 'sent' : 'busy';
  }

  async completeConfirmation(kind: ConfirmationKind, id: string): Promise<void> {
    const sentAt = new Date().toISOString();
    if (!this.production) {
      const record = this.confirmationRecord(kind, id);
      if (record) {
        record.confirmationSentAt = sentAt;
        record.confirmationClaimedAt = undefined;
      }
      return;
    }
    const { error } = await requireSupabaseAdmin()
      .from(CONFIRMATION_TABLES[kind])
      .update({ confirmation_sent_at: sentAt, confirmation_claimed_at: null })
      .eq('id', id);
    assertPersistentWrite(error);
  }

  /** Gives up a claim after a failed send so the next webhook delivery can retry. */
  async releaseConfirmation(kind: ConfirmationKind, id: string): Promise<void> {
    if (!this.production) {
      const record = this.confirmationRecord(kind, id);
      if (record && !record.confirmationSentAt) record.confirmationClaimedAt = undefined;
      return;
    }
    const { error } = await requireSupabaseAdmin()
      .from(CONFIRMATION_TABLES[kind])
      .update({ confirmation_claimed_at: null })
      .eq('id', id)
      .is('confirmation_sent_at', null);
    assertPersistentWrite(error);
  }

  private overlapsActiveBooking(candidate: Booking): boolean {
    const start = timeToMinutes(candidate.startTime);
    const end = start + getReservedMinutesForFlight(candidate.durationMinutes);
    return this.bookings.some((existing) => {
      if (existing.bookingDate !== candidate.bookingDate || existing.status === 'cancelled') return false;
      const existingStart = timeToMinutes(existing.startTime);
      const existingEnd = existingStart + getReservedMinutesForFlight(existing.durationMinutes);
      return start < existingEnd && end > existingStart;
    });
  }

  private confirmationRecord(kind: ConfirmationKind, id: string): Booking | GiftVoucher | undefined {
    return kind === 'booking'
      ? this.bookings.find((booking) => booking.id === id)
      : this.vouchers.find((voucher) => voucher.id === id);
  }

  async getVouchers(): Promise<GiftVoucher[]> {
    if (!this.production) return this.vouchers;
    const { data, error } = await requireSupabaseAdmin()
      .from('gift_vouchers')
      .select('*')
      .order('created_at', { ascending: false });
    assertPersistentWrite(error);
    return (data as DatabaseRow[]).map(toVoucher);
  }

  async getVoucherByCode(code: string): Promise<GiftVoucher | undefined> {
    const normalized = code.trim().toUpperCase();
    if (!this.production) return this.vouchers.find((voucher) => voucher.code === normalized);
    const { data, error } = await requireSupabaseAdmin()
      .from('gift_vouchers')
      .select('*')
      .eq('code', normalized)
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toVoucher(data as DatabaseRow) : undefined;
  }

  async getVoucherById(id: string): Promise<GiftVoucher | undefined> {
    if (!this.production) return this.vouchers.find((voucher) => voucher.id === id);
    const { data, error } = await requireSupabaseAdmin()
      .from('gift_vouchers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toVoucher(data as DatabaseRow) : undefined;
  }

  async createPendingVoucher(data: Omit<GiftVoucher, 'id' | 'code' | 'createdAt' | 'isRedeemed' | 'currentBalanceIls' | 'paymentStatus'>): Promise<GiftVoucher> {
    const voucher: GiftVoucher = {
      ...data,
      id: crypto.randomUUID(),
      code: generateVoucherCode(),
      currentBalanceIls: 0,
      isRedeemed: false,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    if (!this.production) {
      this.vouchers.unshift(voucher);
      return voucher;
    }
    const { data: inserted, error } = await requireSupabaseAdmin()
      .from('gift_vouchers')
      .insert(voucherInsertRow(voucher))
      .select('*')
      .single();
    assertPersistentWrite(error);
    return toVoucher(inserted as DatabaseRow);
  }

  async activateVoucherIfPending(id: string, checkoutSessionId: string): Promise<GiftVoucher | undefined> {
    const voucher = await this.getVoucherById(id);
    if (!voucher || voucher.paymentStatus !== 'pending') return undefined;
    if (!this.production) {
      voucher.paymentStatus = 'paid';
      voucher.currentBalanceIls = voucher.initialValueIls;
      voucher.stripeCheckoutSessionId = checkoutSessionId;
      voucher.activatedAt = new Date().toISOString();
      return voucher;
    }
    const { data, error } = await requireSupabaseAdmin()
      .from('gift_vouchers')
      .update({
        payment_status: 'paid',
        current_balance_ils: voucher.initialValueIls,
        stripe_checkout_session_id: checkoutSessionId,
        activated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('payment_status', 'pending')
      .select('*')
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toVoucher(data as DatabaseRow) : undefined;
  }

  async cancelPendingVoucher(id: string): Promise<void> {
    if (!this.production) {
      const voucher = this.vouchers.find((item) => item.id === id);
      if (voucher?.paymentStatus === 'pending') voucher.paymentStatus = 'refunded';
      return;
    }
    const { error } = await requireSupabaseAdmin()
      .from('gift_vouchers')
      .update({ payment_status: 'refunded' })
      .eq('id', id)
      .eq('payment_status', 'pending');
    assertPersistentWrite(error);
  }

  async redeemVoucher(code: string, amountToDeduct: number): Promise<{ success: boolean; newBalance: number; message: string }> {
    if (!Number.isFinite(amountToDeduct) || amountToDeduct <= 0) {
      return { success: false, newBalance: 0, message: 'Voucher deduction must be a positive amount.' };
    }
    if (!this.production) {
      const voucher = await this.getVoucherByCode(code);
      // Integer agorot: floating-point shekels would leave residual dust (399.9 + 0.1 !== 400).
      const balanceAgorot = voucher ? Math.round(voucher.currentBalanceIls * 100) : 0;
      const deductionAgorot = Math.round(amountToDeduct * 100);
      if (!voucher || voucher.paymentStatus !== 'paid' || voucher.isRedeemed || balanceAgorot < deductionAgorot) {
        return { success: false, newBalance: 0, message: 'Voucher cannot cover this purchase.' };
      }
      voucher.currentBalanceIls = (balanceAgorot - deductionAgorot) / 100;
      voucher.isRedeemed = balanceAgorot === deductionAgorot;
      return { success: true, newBalance: voucher.currentBalanceIls, message: 'Voucher redeemed.' };
    }

    const { data, error } = await requireSupabaseAdmin().rpc('redeem_gift_voucher', {
      p_code: code.trim().toUpperCase(),
      p_amount: amountToDeduct,
    });
    assertPersistentWrite(error);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { success: false, newBalance: 0, message: 'Voucher cannot cover this purchase.' };
    const voucher = toVoucher(row as DatabaseRow);
    return { success: true, newBalance: voucher.currentBalanceIls, message: 'Voucher redeemed.' };
  }

  async getCorporateInquiries(): Promise<CorporateInquiry[]> {
    if (!this.production) return this.inquiries;
    const { data, error } = await requireSupabaseAdmin()
      .from('corporate_inquiries')
      .select('*')
      .order('created_at', { ascending: false });
    assertPersistentWrite(error);
    return (data as DatabaseRow[]).map(toCorporateInquiry);
  }

  async createCorporateInquiry(data: Omit<CorporateInquiry, 'id' | 'createdAt' | 'status'>): Promise<CorporateInquiry> {
    const inquiry: CorporateInquiry = {
      ...data,
      id: crypto.randomUUID(),
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    if (!this.production) {
      this.inquiries.unshift(inquiry);
      return inquiry;
    }
    const { data: inserted, error } = await requireSupabaseAdmin()
      .from('corporate_inquiries')
      .insert({
        company_name: inquiry.companyName,
        contact_name: inquiry.contactName,
        email: inquiry.email,
        phone: inquiry.phone,
        team_size: inquiry.teamSize,
        target_date: inquiry.targetDate || null,
        primary_goal: inquiry.primaryGoal,
        message: inquiry.message || null,
      })
      .select('*')
      .single();
    assertPersistentWrite(error);
    return toCorporateInquiry(inserted as DatabaseRow);
  }

  async updateInquiryStatus(id: string, status: CorporateInquiry['status']): Promise<CorporateInquiry | undefined> {
    if (!this.production) {
      const inquiry = this.inquiries.find((item) => item.id === id);
      if (inquiry) inquiry.status = status;
      return inquiry;
    }
    const { data, error } = await requireSupabaseAdmin()
      .from('corporate_inquiries')
      .update({ status })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    assertPersistentWrite(error);
    return data ? toCorporateInquiry(data as DatabaseRow) : undefined;
  }

  async getFlightLogs(pilotEmail?: string): Promise<FlightLog[]> {
    return pilotEmail
      ? this.flightLogs.filter((log) => log.pilotEmail.toLowerCase() === pilotEmail.toLowerCase())
      : this.flightLogs;
  }

  async addFlightLog(log: Omit<FlightLog, 'id'>): Promise<FlightLog> {
    const newLog = { ...log, id: crypto.randomUUID() };
    this.flightLogs.unshift(newLog);
    return newLog;
  }

  async getUser(email: string): Promise<UserProfile | undefined> {
    return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return this.users;
  }

  async assertBookableStart(date: string, startTime: string, duration: number): Promise<FlightSlot> {
    const config = getDayOperatingConfig(date);
    const startMinutes = timeToMinutes(startTime);
    if (!Number.isFinite(startMinutes) || startMinutes < config.openMinutes) {
      throw new BookingConflictError('The selected departure time is outside operating hours.');
    }
    const slots = await this.getAvailableSlots(date, duration);
    const slot = slots.find((item) => item.startTime === startTime && item.available);
    if (!slot) throw new BookingConflictError('The selected departure slot is no longer available.');
    return slot;
  }

  async assertRescheduleAllowed(id: string, startTime: string): Promise<void> {
    const booking = await this.getBookingById(id);
    if (!booking) throw new RecordNotFoundError('Booking not found.');
    const config = getDayOperatingConfig(booking.bookingDate);
    const start = timeToMinutes(startTime);
    const reservedEnd = start + getReservedMinutesForFlight(booking.durationMinutes);
    if (!Number.isFinite(start) || start < config.openMinutes || reservedEnd > config.closeMinutes) {
      throw new BookingConflictError('The proposed time is outside operating hours.');
    }
    const conflicts = (await this.getBookings()).some((item) => {
      if (item.id === id || item.bookingDate !== booking.bookingDate || item.status === 'cancelled') return false;
      const itemStart = timeToMinutes(item.startTime);
      const itemEnd = itemStart + getReservedMinutesForFlight(item.durationMinutes);
      return start < itemEnd && reservedEnd > itemStart;
    });
    if (conflicts) throw new BookingConflictError('The proposed time conflicts with another booking.');
  }
}

const globalStore = globalThis as typeof globalThis & { __simDreamStoreV10?: SimDreamStore };
export const store = globalStore.__simDreamStoreV10 || new SimDreamStore();
globalStore.__simDreamStoreV10 = store;
