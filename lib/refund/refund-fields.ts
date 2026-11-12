import { isCalendarDate } from './israel-time';
import { REFUND_REASONS, type RefundProductKind, type RefundReason } from './refund-types';

/**
 * Field rules shared by the browser form (inline validation) and the server schema, so both
 * accept exactly the same input. Client-safe: no I/O and no server-only imports.
 * The form maps the error codes to translated messages; the server answers with the same codes.
 */
export const REFUND_FIELD_LIMITS = {
  referenceMin: 3,
  referenceMax: 64,
  nameMax: 120,
  emailMax: 254,
  phoneMin: 6,
  phoneMax: 32,
  messageMax: 1_000,
} as const;

/** Booking references (SD-737-...), voucher codes (SD-VOUCH-...) and Wix order numbers. */
export const ORDER_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _\-./#]*$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_PATTERN = /^[0-9+()\-.\s]+$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Which reasons make sense for which product, in display order. */
export const REFUND_REASONS_BY_KIND: Readonly<Record<RefundProductKind, readonly RefundReason[]>> = {
  flight: ['change_of_plans', 'illness', 'centre_fault', 'duplicate_payment', 'other'],
  voucher: ['gift_voucher', 'duplicate_payment', 'other'],
  subscription: ['subscription', 'illness', 'centre_fault', 'duplicate_payment', 'other'],
};

export function reasonFitsProduct(kind: RefundProductKind, reason: RefundReason): boolean {
  return REFUND_REASONS_BY_KIND[kind].includes(reason);
}

export type FieldErrorCode = 'required' | 'invalid';

export function normalizeOrderReference(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function checkOrderReference(value: string): FieldErrorCode | null {
  const reference = normalizeOrderReference(value);
  if (!reference) return 'required';
  const { referenceMin, referenceMax } = REFUND_FIELD_LIMITS;
  if (reference.length < referenceMin || reference.length > referenceMax || !ORDER_REFERENCE_PATTERN.test(reference)) {
    return 'invalid';
  }
  return null;
}

export function checkEmail(value: string): FieldErrorCode | null {
  const email = value.trim();
  if (!email) return 'required';
  return email.length > REFUND_FIELD_LIMITS.emailMax || !EMAIL_PATTERN.test(email) ? 'invalid' : null;
}

export function checkPhone(value: string): FieldErrorCode | null {
  const phone = value.trim();
  if (!phone) return 'required';
  const digits = phone.replace(/\D/g, '').length;
  return phone.length > REFUND_FIELD_LIMITS.phoneMax || digits < 6 || !PHONE_PATTERN.test(phone) ? 'invalid' : null;
}

export function checkName(value: string): FieldErrorCode | null {
  const name = value.trim();
  if (!name) return 'required';
  return name.length > REFUND_FIELD_LIMITS.nameMax ? 'invalid' : null;
}

/** An optional session date: empty is fine, anything else must be a real calendar date. */
export function checkSessionDate(value: string): FieldErrorCode | null {
  const date = value.trim();
  if (!date) return null;
  return isCalendarDate(date) ? null : 'invalid';
}

export function checkSessionTime(value: string): FieldErrorCode | null {
  const time = value.trim();
  if (!time) return null;
  return TIME_PATTERN.test(time) ? null : 'invalid';
}

export const isRefundReason = (value: string): value is RefundReason => (REFUND_REASONS as readonly string[]).includes(value);
