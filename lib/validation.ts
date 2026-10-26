import { z } from 'zod';

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
  voucherCode: z.string().trim().toUpperCase().max(64).optional(),
  notes: z.string().trim().max(2_000).optional(),
});

export const voucherCheckoutSchema = z.object({
  kind: z.literal('voucher'),
  amountIls: money.min(100),
  recipientName: safeText(120),
  // Optional: left blank, the voucher is emailed to the buyer to print and present.
  recipientEmail: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.union([z.literal(''), z.email().max(254)]).optional()
  ),
  senderName: safeText(120),
  senderEmail: z.string().trim().email().max(254),
  personalMessage: z.string().trim().max(1_500).default(''),
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

export const adminWorkshopPatchSchema = z.object({
  id: z.string().trim().min(1).max(128),
  status: z.enum(['new', 'contacted', 'quoted', 'confirmed']),
});

const optimizableDuration = z.union([
  z.literal(20),
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
