import { z } from 'zod';
import { isSupportedLanguage } from '@/lib/i18n/language-preference';
import {
  REFUND_FIELD_LIMITS as L,
  checkEmail,
  checkOrderReference,
  checkPhone,
  normalizeOrderReference,
  reasonFitsProduct,
} from './refund-fields';
import { isCalendarDate } from './israel-time';
import { REFUND_PRODUCT_KINDS, REFUND_REASONS } from './refund-types';

/**
 * Request bodies of `POST /api/refund-requests/lookup` and `POST /api/refund-requests`.
 * Same field rules as the browser form (`refund-fields.ts`). The server never trusts the
 * browser's idea of verification, price or outcome: it receives only what the customer typed.
 */
const orderReference = z
  .string()
  .transform(normalizeOrderReference)
  .refine((value) => checkOrderReference(value) === null, 'Enter the booking reference, voucher code or order number.');

const email = z
  .string()
  .trim()
  .max(L.emailMax)
  .refine((value) => checkEmail(value) === null, 'Enter a valid email address.');

const phone = z.string().trim().refine((value) => checkPhone(value) === null, 'Enter a valid phone number.');

const productKind = z.enum(REFUND_PRODUCT_KINDS);

/** An optional field the browser leaves empty arrives as '' or not at all; both mean "not given". */
const blankToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

export const refundLookupSchema = z.object({
  productKind,
  orderReference,
  email,
});

export const refundSubmissionSchema = z
  .object({
    /** Generated once per form in the browser; a double click or retry returns the same reference. */
    clientRequestId: z.uuid(),
    language: z.string().refine(isSupportedLanguage, 'Unsupported language.'),
    productKind,
    orderReference,
    contactName: z.string().trim().min(1).max(L.nameMax),
    email,
    phone,
    sessionDate: z.preprocess(
      blankToUndefined,
      z.string().trim().refine(isCalendarDate, 'Use a real calendar date (YYYY-MM-DD).').optional()
    ),
    sessionTime: z.preprocess(
      blankToUndefined,
      z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm.').optional()
    ),
    reason: z.enum(REFUND_REASONS),
    message: z.preprocess(blankToUndefined, z.string().trim().max(L.messageMax).optional()),
    acceptedTruth: z.literal(true, 'Confirm that the information is true.'),
    acceptedRules: z.literal(true, 'Confirm that you accept the refund rules.'),
    /** Honeypot: a person never sees this field, so any value means a script filled the form. */
    website: z.string().max(0, 'Invalid value.').optional(),
  })
  .superRefine((value, context) => {
    if (!reasonFitsProduct(value.productKind, value.reason)) {
      context.addIssue({ code: 'custom', path: ['reason'], message: 'This reason does not apply to that product.' });
    }
    if (value.sessionTime && !value.sessionDate) {
      context.addIssue({ code: 'custom', path: ['sessionDate'], message: 'Add the session date as well.' });
    }
  });

export type RefundLookupRequest = z.infer<typeof refundLookupSchema>;
export type RefundSubmission = z.infer<typeof refundSubmissionSchema>;
