import { z } from 'zod';
import { GIFT_CARD_DESIGNS, MIN_GIFT_VOUCHER_AMOUNT_ILS, type GiftCardDesignId } from '@/lib/catalog/gift-card-designs';
import type { SupportedLanguage } from '@/lib/i18n/translations';

/** The only balances a flexible Gift Card is sold at: one per card design. There is no custom amount. */
const GIFT_CARD_AMOUNTS_ILS = new Set<number>(GIFT_CARD_DESIGNS.map((design) => design.amountIls));

/** True only for dates that exist on the calendar (rejects 2027-02-30, 2026-13-01, ...). */
export function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
  .refine(isCalendarDate, 'Use a real calendar date (YYYY-MM-DD).');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm.');
// Shekel amounts with agora (0.01) precision; finer amounts would leave unspendable dust.
const money = z.number().finite().nonnegative().max(100_000).multipleOf(0.01, 'Use at most two decimal places.');
const safeText = (max: number) => z.string().trim().min(1).max(max);
const giftCardDesignIds = GIFT_CARD_DESIGNS.map((design) => design.id) as unknown as [
  GiftCardDesignId,
  ...GiftCardDesignId[],
];

/** The six page languages a consent can be given in (`tests/unit/validation.test.ts` pins this to `LANGUAGES`). */
export const CHECKOUT_CONSENT_LANGUAGES = ['he', 'en', 'ru', 'fr', 'ar', 'es'] as const satisfies readonly SupportedLanguage[];

/**
 * The two separate confirmations of the checkout (rules clause 15). The browser sends only the two
 * booleans and the page language it displayed; the server stamps the time and the versions itself
 * (`buildConsentRecord`), so any version or timestamp a client adds is ignored.
 */
const consentSchema = z.object({
  rulesRefundsAndPrivacy: z.literal(true, 'Accept the rules, the refund rule and the privacy policy to continue.'),
  mediaReleaseAndWaiver: z.literal(true, 'Agree to the media release and waiver of claims to continue.'),
  language: z.enum(CHECKOUT_CONSENT_LANGUAGES),
});

export const bookingCheckoutSchema = z.object({
  kind: z.literal('booking'),
  packageId: z.string().trim().min(1).max(80),
  bookingDate: isoDate,
  startTime: time,
  pilotName: safeText(120),
  pilotEmail: z.string().trim().email().max(254),
  pilotPhone: z.string().trim().min(6).max(32),
  experienceLevel: z.enum(['beginner', 'enthusiast', 'student_pilot', 'atpl']),
  addons: z.array(z.string().trim().min(1).max(80)).max(16).default([]),
  requestedRouteId: z.string().trim().regex(/^route-[a-z0-9-]{1,80}$/).optional(),
  voucherCode: z.string().trim().toUpperCase().max(64).optional(),
  notes: z.string().trim().max(2_000).optional(),
  /** The Pilot in Command's date of birth (mandatory). Validated against the flight date and the age bounds by the service; only month and day are ever stored. */
  pilotBirthDate: isoDate,
  consent: consentSchema,
});

export const voucherCheckoutSchema = z.object({
  kind: z.literal('voucher'),
  amountIls: money.min(MIN_GIFT_VOUCHER_AMOUNT_ILS),
  recipientName: safeText(120),
  // Optional: left blank, the voucher is emailed to the buyer to print and present.
  recipientEmail: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.union([z.literal(''), z.email().max(254)]).optional()
  ),
  senderName: safeText(120),
  senderEmail: z.string().trim().email().max(254),
  personalMessage: z.string().trim().max(1_500).default(''),
  packageId: z.string().trim().max(80).optional(),
  packageTitle: z.string().trim().max(160).optional(),
  // A card design is a closed registry value, never customer-controlled markup or a media URL.
  giftCardDesignId: z.enum(giftCardDesignIds).optional(),
}).refine((command) => Boolean(command.packageId) || GIFT_CARD_AMOUNTS_ILS.has(command.amountIls), {
  // A named certificate takes its price from the catalogue; a Gift Card must be one of the preset balances.
  path: ['amountIls'],
  message: 'Choose one of the Gift Card balances.',
});

export const checkoutRequestSchema = z.discriminatedUnion('kind', [
  bookingCheckoutSchema,
  voucherCheckoutSchema,
]);

export const adminBookingPatchSchema = z.object({
  id: z.string().trim().min(1).max(128),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  startTime: time.optional(),
}).refine((value) => value.status || value.startTime, 'Provide a status or start time.');

export const adminVoucherRedemptionSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(64),
  amount: money.positive(),
});

export const voucherVerificationSchema = z.object({
  action: z.literal('verify'),
  code: z.string().trim().toUpperCase().min(16).max(64),
});

export const workshopInquirySchema = z.object({
  companyName: safeText(160),
  contactName: safeText(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(6).max(32),
  teamSize: z.number().int().min(1).max(500),
  targetDate: isoDate.optional(),
  primaryGoal: z.enum(['leadership', 'team_communication', 'high_stress_decision_making', 'vip_incentive']),
  message: z.string().trim().max(2_000).optional(),
});

/** Public Dispatch inquiry. Keep this independent from B2B workshop lead fields. */
export const contactInquirySchema = z.object({
  name: safeText(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(32).optional().default(''),
  subject: safeText(160),
  message: safeText(2_000),
});

export const adminWorkshopPatchSchema = z.object({
  id: z.string().trim().min(1).max(128),
  status: z.enum(['new', 'contacted', 'quoted', 'confirmed']),
});

/** Public course-detail request. This intentionally has no price, payment or cohort-capacity field. */
export const groundSchoolInquirySchema = z.object({
  fullName: safeText(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(6).max(32),
  pathway: z.enum(['faa', 'easa', 'exploring']),
  modality: z.enum(['online', 'in_person', 'hybrid']),
  focusTopics: z.string().trim().max(2_000).optional(),
  consent: z.literal(true),
});

export const adminGroundSchoolInquiryPatchSchema = z.object({
  id: z.string().trim().min(1).max(128),
  status: z.enum(['new', 'contacted', 'enrolled', 'closed']),
});

const optimizableDuration = z.union([
  z.literal(30),
  z.literal(45),
  z.literal(60),
  z.literal(90),
  z.literal(120),
  z.literal(240),
]);

const quarterHourTime = time.refine(
  (value) => Number(value.slice(3)) % 15 === 0,
  'Start times must align to 15-minute boundaries.'
);

export const adminScheduleOptimizationSchema = z.object({
  date: isoDate,
  requests: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        durationMinutes: optimizableDuration,
        valueIls: money.positive(),
        candidateStartTimes: z.array(quarterHourTime).min(1).max(4),
      })
    )
    .min(1)
    .max(8)
    .refine(
      (requests) => new Set(requests.map((request) => request.id)).size === requests.length,
      'Request IDs must be unique.'
    ),
});

export function validationError(error: z.ZodError): { error: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'request';
    fields[path] = issue.message;
  }
  return { error: 'Invalid request.', fields };
}
