/**
 * Response contracts for every API route, expressed as strict zod schemas.
 * Strict objects reject unknown keys, so any field added to or removed from a
 * response fails the suite until the contract is updated on purpose.
 */
import { z } from 'zod';

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** HH:mm; 24:00 is the Saturday closing boundary. */
export const clockTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/);
export const isoDateTime = z.iso.datetime();
export const bookingReference = z.string().regex(/^SD-737-[A-Z2-9]{16}$/);
/** Seed bookings predate capability references and use a short numeric suffix. */
export const anyBookingReference = z.string().regex(/^SD-737-[A-Z0-9]+$/);
export const voucherCode = z.string().regex(/^SD-VOUCH-[A-Z2-9]{18}$/);
const nonNegativeInt = z.number().int().nonnegative();
const money = z.number().finite().nonnegative();

export const errorBody = z.strictObject({ error: z.string().min(1) });
export const validationErrorBody = z.strictObject({
  error: z.literal('Invalid request.'),
  fields: z.record(z.string(), z.string().min(1)),
});

export const bookingStatus = z.enum(['pending', 'confirmed', 'completed', 'cancelled']);
export const paymentStatus = z.enum(['paid', 'pending', 'refunded']);
const experienceLevel = z.enum(['beginner', 'enthusiast', 'student_pilot', 'atpl']);

/** Full booking record: admin and member views only. */
export const booking = z.strictObject({
  id: z.string().min(1),
  bookingReference: anyBookingReference,
  userId: z.string().min(1).optional(),
  packageId: z.string().min(1),
  packageTitle: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  bookingDate: isoDate,
  startTime: clockTime,
  endTime: clockTime,
  pilotName: z.string().min(1),
  pilotEmail: z.string().min(3),
  pilotPhone: z.string().min(6),
  experienceLevel,
  addons: z.array(z.string()),
  subtotalIls: money,
  discountIls: money,
  totalIls: money,
  voucherCode: z.string().optional(),
  status: bookingStatus,
  paymentStatus,
  paymentMethod: z.enum(['stripe', 'voucher', 'desk']),
  stripePaymentIntentId: z.string().optional(),
  notes: z.string().optional(),
  createdAt: isoDateTime,
});

/** Narrow capability view for the public success page: no contact data, ids or payment metadata. */
export const publicBooking = z.strictObject({
  bookingReference,
  packageId: z.string().min(1),
  packageTitle: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  bookingDate: isoDate,
  startTime: clockTime,
  endTime: clockTime,
  pilotName: z.string().min(1),
  addons: z.array(z.string()),
  totalIls: money,
  status: bookingStatus,
  paymentStatus,
});

export const flightSlot = z
  .strictObject({
    id: z.string().min(1),
    date: isoDate,
    startTime: clockTime,
    endTime: clockTime,
    reservedEndTime: clockTime,
    durationMinutes: z.number().int().positive(),
    totalReservedMinutes: z.number().int().positive(),
    available: z.boolean(),
    blockPeriod: z.enum(['morning', 'afternoon', 'evening', 'friday_closer', 'saturday_prime']),
    blockLabel: z.string().min(1),
    isPrimeTime: z.boolean(),
    dynamicPriceIls: money,
    basePriceIls: money,
    yieldPerMinIls: money,
    smartRecommendation: z
      .enum(['optimal_150_pair', 'friday_30m_closer', 'zero_waste_fit', 'daytime_promo_fit'])
      .nullable()
      .optional(),
    recommendationNote: z.string().optional(),
    disabledReason: z
      .enum(['booked', 'orphan_gap', 'daytime_only_promo', 'friday_closer_30m_only', 'exceeds_closing', 'departed'])
      .nullable()
      .optional(),
    disabledNote: z.string().optional(),
    suggestedAlternativeTime: z.string().optional(),
    maxAvailableMinutes: z.number().int().positive().optional(),
  })
  .refine(
    (slot) =>
      slot.available
        ? slot.disabledReason === null && typeof slot.maxAvailableMinutes === 'number'
        : typeof slot.disabledReason === 'string' && typeof slot.disabledNote === 'string',
    'An open slot carries maxAvailableMinutes; a closed slot carries a disabled reason and note.'
  );
export type FlightSlotContract = z.infer<typeof flightSlot>;

export const slotList = z.array(flightSlot);

const timelineBlock = z.strictObject({
  start: clockTime,
  end: clockTime,
  type: z.enum(['booked', 'turnaround', 'free_valid', 'orphan_gap']),
  minutes: nonNegativeInt,
  // Shape is pinned by the PII test in slots-packages.test.ts, not here.
  booking: z.unknown().optional(),
  label: z.string().min(1),
  recommendedShiftTime: clockTime.optional(),
});

const gapAlert = z.strictObject({
  id: z.string().min(1),
  gapStart: clockTime,
  gapEnd: clockTime,
  gapMinutes: z.number().int().positive(),
  lostRevenueIls: money,
  violatingBookingId: z.string().optional(),
  violatingBookingRef: z.string().optional(),
  recommendedShiftTime: clockTime,
  message: z.string().min(1),
});

export const dailyEfficiencyReport = z.strictObject({
  date: isoDate,
  dayOfWeek: z.number().int().min(0).max(6),
  operatingWindow: z.string().min(1),
  totalFundMinutes: z.number().int().positive(),
  bookedMinutes: nonNegativeInt,
  pureFlightMinutes: nonNegativeInt,
  turnaroundMinutes: nonNegativeInt,
  freeValidMinutes: nonNegativeInt,
  orphanGapMinutes: nonNegativeInt,
  efficiencyPercent: z.number().min(0).max(100),
  actualRevenueIls: money,
  projectedMaxRevenueIls: money,
  potentialLostRevenueIls: money,
  isZeroWasteCompliant: z.boolean(),
  gapAlerts: z.array(gapAlert),
  timelineBlocks: z.array(timelineBlock),
});

export const DURATION_KEYS = ['20', '30', '45', '60', '90', '120'] as const;
export const durationAvailability = z.record(
  z.enum(DURATION_KEYS),
  z.strictObject({ availableCount: nonNegativeInt, minPriceIls: money })
);

/** Public capacity projection: strict, so any identity, booking or revenue field fails the contract. */
export const publicCapacityReport = z.strictObject({
  date: isoDate,
  dayOfWeek: z.number().int().min(0).max(6),
  operatingWindow: z.string().min(1),
  totalFundMinutes: z.number().int().positive(),
  bookedMinutes: nonNegativeInt,
  pureFlightMinutes: nonNegativeInt,
  turnaroundMinutes: nonNegativeInt,
  freeValidMinutes: nonNegativeInt,
  orphanGapMinutes: nonNegativeInt,
  efficiencyPercent: z.number().min(0).max(100),
  isZeroWasteCompliant: z.boolean(),
  timelineBlocks: z.array(
    z.strictObject({
      start: clockTime,
      end: clockTime,
      type: z.enum(['booked', 'turnaround', 'free_valid', 'orphan_gap']),
      minutes: nonNegativeInt,
    })
  ),
});

export const slotsWithEfficiency = z.strictObject({
  slots: slotList,
  efficiency: publicCapacityReport,
  durationAvailability,
});

export const simulatorPackage = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  category: z.enum(['recreational', 'training', 'corporate', 'fear_of_flying']),
  durationMinutes: z.union([z.literal(20), z.literal(45), z.literal(60), z.literal(90), z.literal(120), z.literal(240)]),
  priceIls: z.number().positive(),
  primeTimePriceIls: z.number().positive().optional(),
  priceUsd: z.number().positive(),
  shortDesc: z.string().min(1),
  description: z.string().min(1),
  featured: z.boolean().optional(),
  badge: z.string().optional(),
  daytimeOnly: z.boolean().optional(),
  kantorovichVar: z.enum(['x1', 'x2', 'x3', 'x4', 'pro']).optional(),
  yieldPerMinIls: z.number().positive().optional(),
  features: z.array(z.string().min(1)).min(1),
  includesBriefing: z.boolean(),
  instructorIncluded: z.boolean(),
  guestSeats: nonNegativeInt,
});
export const packageList = z.array(simulatorPackage);

export const stripeCheckoutStarted = z.strictObject({
  kind: z.literal('stripe'),
  url: z.url(),
  sessionId: z.string().min(1),
});

export const voucherCheckoutConfirmed = z.strictObject({
  kind: z.literal('voucher'),
  bookingReference,
  successUrl: z.url(),
});

export const giftVoucher = z.strictObject({
  id: z.string().min(1),
  code: z.string().regex(/^SD-VOUCH-[A-Z0-9]+$/),
  initialValueIls: z.number().positive(),
  currentBalanceIls: money,
  recipientName: z.string().min(1),
  recipientEmail: z.string().min(3),
  senderName: z.string().min(1),
  senderEmail: z.string().min(3),
  personalMessage: z.string(),
  packageId: z.string().optional(),
  packageTitle: z.string().optional(),
  expiryDate: isoDateTime,
  isRedeemed: z.boolean(),
  paymentStatus,
  stripeCheckoutSessionId: z.string().optional(),
  activatedAt: isoDateTime.optional(),
  createdAt: isoDateTime,
});

/** A voucher code is a bearer credential: verification reveals only balance and expiry. */
export const publicVoucher = z.strictObject({
  code: z.string().regex(/^SD-VOUCH-[A-Z0-9]+$/),
  currentBalanceIls: z.number().positive(),
  expiryDate: isoDateTime,
});
export const voucherExpired = z.strictObject({ error: z.string().min(1), expired: z.literal(true) });
export const voucherRedeemed = z.strictObject({ error: z.string().min(1), redeemed: z.literal(true) });

export const voucherRedemption = z.strictObject({
  success: z.literal(true),
  newBalance: money,
  message: z.literal('Voucher redeemed.'),
});

export const workshopCreated = z.strictObject({ id: z.uuid(), status: z.literal('new') });

export const corporateInquiry = z.strictObject({
  id: z.string().min(1),
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().min(3),
  phone: z.string().min(6),
  teamSize: z.number().int().positive(),
  targetDate: isoDate.optional(),
  primaryGoal: z.enum(['leadership', 'team_communication', 'high_stress_decision_making', 'vip_incentive']),
  message: z.string().optional(),
  status: z.enum(['new', 'contacted', 'quoted', 'confirmed']),
  createdAt: isoDateTime,
});

export const membershipBootstrap = z.strictObject({
  memberActive: z.literal(true),
  linkedGuestBookings: nonNegativeInt,
  hasPurchaseHistory: z.boolean(),
});

export const paymentReceipt = z.strictObject({ receiptUrl: z.url() });

const capacityRecommendation = z.strictObject({
  requestId: z.string().min(1),
  startTime: clockTime,
  endTime: clockTime,
  reservedEndTime: clockTime,
  durationMinutes: z.union([z.literal(20), z.literal(45), z.literal(60), z.literal(90), z.literal(120), z.literal(240)]),
  valueIls: z.number().positive(),
});

export const scheduleOptimizationPreview = z.strictObject({
  mode: z.literal('exact_dry_run'),
  date: isoDate,
  existingBookingCount: nonNegativeInt,
  eligibleCandidateCount: nonNegativeInt,
  exploredSchedules: z.number().int().positive(),
  baselineOrphanMinutes: nonNegativeInt,
  recommendedOrphanMinutes: nonNegativeInt,
  projectedValueIls: money,
  recommendations: z.array(capacityRecommendation),
  unallocatedRequestIds: z.array(z.string().min(1)),
  rationale: z.string().min(1),
});

const googleReview = z.strictObject({
  id: z.string().min(1),
  author: z.string().min(1),
  rating: z.number().min(0).max(5),
  quote: z.string().min(1),
  role: z.string(),
  relativeTime: z.string(),
  language: z.enum(['he', 'en', 'ru', 'fr', 'ar']),
  characterCount: z.number().int().positive(),
  highlightPill: z.string().optional(),
});

export const reviewsSnapshot = z.strictObject({
  lastUpdated: isoDateTime,
  source: z.string().min(1),
  overallRating: z.number().min(0).max(5),
  totalReviewsCount: nonNegativeInt,
  directReviewsUrl: z.url(),
  reviews: z.array(googleReview).min(1),
});

export const reviewsSync = z.strictObject({
  success: z.literal(true),
  syncedAt: isoDateTime,
  totalReviews: nonNegativeInt,
  rating: z.number().min(0).max(5),
  reviews: z.array(googleReview).min(1),
});

export const webhookAck = z.strictObject({ received: z.literal(true) });

/** Parses a response body against its contract; a mismatch fails with zod's issue list. */
export function expectContract<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  return schema.parse(value);
}
