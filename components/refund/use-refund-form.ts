'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  REFUND_REASONS_BY_KIND,
  checkEmail,
  checkName,
  checkOrderReference,
  checkPhone,
  checkSessionDate,
  checkSessionTime,
  evaluateRefundEligibility,
  normalizeOrderReference,
  reasonFitsProduct,
  type RefundEvaluation,
  type RefundProductKind,
  type RefundReason,
} from '@/lib/refund';
import {
  EMPTY_VALUES,
  type BannerKind,
  type FormErrors,
  type RefundFormValues,
  type RefundStep,
  type SubmitPhase,
  type Verification,
  type VerifiedOrder,
} from './refund-form-types';

const JSON_HEADERS = { 'content-type': 'application/json' };
const DEFAULT_REASON: Record<RefundProductKind, RefundReason> = {
  flight: 'change_of_plans',
  voucher: 'gift_voucher',
  subscription: 'subscription',
};

/** A random UUID, with a fallback for browsers that only expose randomUUID in secure contexts. */
function newRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function validateOrderStep(values: RefundFormValues): FormErrors {
  const errors: FormErrors = {};
  const found = {
    orderReference: checkOrderReference(values.orderReference),
    email: checkEmail(values.email),
    name: checkName(values.name),
    phone: checkPhone(values.phone),
    sessionDate: checkSessionDate(values.sessionDate),
    sessionTime: checkSessionTime(values.sessionTime) ?? (values.sessionTime && !values.sessionDate ? 'invalid' : null),
  } as const;
  for (const [field, code] of Object.entries(found)) if (code) errors[field as keyof FormErrors] = code;
  return errors;
}

/**
 * All state of the refund form: the three steps, inline validation, the order check against the
 * server, the live outcome from the policy module, and the submit. The browser never decides
 * anything binding: the outcome shown here is an estimate, the server recomputes it on submit.
 */
export function useRefundForm(language: string) {
  const [values, setValues] = useState<RefundFormValues>(EMPTY_VALUES);
  const [step, setStep] = useState<RefundStep>(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [focusTick, setFocusTick] = useState(0);
  const [verification, setVerification] = useState<Verification>({ state: 'idle' });
  const [submit, setSubmit] = useState<SubmitPhase>({ phase: 'editing' });
  const [banner, setBanner] = useState<BannerKind>(null);
  const [now, setNow] = useState<Date | null>(null);
  const requestId = useRef<string | null>(null);

  // The clock is read in the browser only (pages are prerendered); it refreshes so the 24-hour line moves.
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // A link from a confirmation email may carry the booking reference: ?ref=SD-737-...
  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('ref') ?? '';
    if (checkOrderReference(reference) !== null) return;
    setValues((current) => ({
      ...current,
      orderReference: normalizeOrderReference(reference),
      productKind: reference.toUpperCase().startsWith('SD-VOUCH-') ? 'voucher' : current.productKind,
    }));
  }, []);

  const setField = useCallback(<K extends keyof RefundFormValues>(field: K, value: RefundFormValues[K]) => {
    requestId.current = null; // an edited request is a new request
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setBanner(null);
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === 'productKind' && next.reason && !reasonFitsProduct(next.productKind, next.reason)) next.reason = '';
      return next;
    });
    if (field === 'orderReference' || field === 'email' || field === 'productKind') setVerification({ state: 'idle' });
  }, []);

  const verified: VerifiedOrder | null = verification.state === 'verified' ? verification.order : null;

  /** The policy's answer for what has been entered so far, or null while there is not enough to say. */
  const evaluation: RefundEvaluation | null = useMemo(() => {
    if (!now) return null;
    const kind = verified?.productKind ?? values.productKind;
    const reason = (values.reason || DEFAULT_REASON[kind]) as RefundReason;
    const hasDate = checkSessionDate(values.sessionDate) === null && values.sessionDate !== '';
    const needsDate = kind === 'flight' && reason !== 'centre_fault' && reason !== 'duplicate_payment';
    if (needsDate && !hasDate) return null;
    const time = checkSessionTime(values.sessionTime) === null ? values.sessionTime : '';
    return evaluateRefundEligibility({
      productKind: kind,
      reason,
      orderDate: verified?.orderDate ?? null,
      sessionDateTime: hasDate ? (time ? `${values.sessionDate}T${time}` : values.sessionDate) : null,
      requestedAt: now,
    });
  }, [now, values.productKind, values.reason, values.sessionDate, values.sessionTime, verified]);

  const lookupKey = `${values.productKind}|${normalizeOrderReference(values.orderReference).toUpperCase()}|${values.email.trim().toLowerCase()}`;
  const checkedKey = useRef<string | null>(null);

  const lookupOrder = useCallback(async () => {
    if (checkedKey.current === lookupKey && verification.state !== 'idle') return;
    setVerification({ state: 'checking' });
    try {
      const response = await fetch('/api/refund-requests/lookup', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          productKind: values.productKind,
          orderReference: normalizeOrderReference(values.orderReference),
          email: values.email.trim(),
        }),
      });
      const body = (await response.json().catch(() => null)) as ({ verified?: boolean } & Partial<VerifiedOrder>) | null;
      checkedKey.current = lookupKey;
      if (response.ok && body?.verified === true && body.orderDate && body.productKind) {
        const order: VerifiedOrder = {
          productKind: body.productKind,
          packageTitle: body.packageTitle ?? null,
          sessionDate: body.sessionDate ?? null,
          sessionTime: body.sessionTime ?? null,
          orderDate: body.orderDate,
        };
        setVerification({ state: 'verified', order });
        setValues((current) => ({
          ...current,
          productKind: order.productKind,
          sessionDate: order.sessionDate ?? current.sessionDate,
          sessionTime: order.sessionDate ? (order.sessionTime ?? '') : current.sessionTime,
          reason: reasonFitsProduct(order.productKind, current.reason as RefundReason) ? current.reason : '',
        }));
      } else {
        setVerification({ state: response.ok || response.status === 400 ? 'unverified' : 'unavailable' });
      }
    } catch {
      setVerification({ state: 'unavailable' });
    }
  }, [lookupKey, values.productKind, values.orderReference, values.email, verification.state]);

  const goBack = useCallback(() => setStep((current) => (current > 1 ? ((current - 1) as RefundStep) : current)), []);

  const goNext = useCallback(async () => {
    if (step === 1) {
      const found = validateOrderStep(values);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        setFocusTick((tick) => tick + 1);
        return;
      }
      await lookupOrder();
      setStep(2);
    } else if (step === 2) {
      if (!values.reason) {
        setErrors({ reason: 'required' });
        setFocusTick((tick) => tick + 1);
        return;
      }
      setStep(3);
    }
  }, [step, values, lookupOrder]);

  const send = useCallback(async () => {
    const missing: FormErrors = {};
    if (!values.acceptedTruth) missing.acceptedTruth = 'required';
    if (!values.acceptedRules) missing.acceptedRules = 'required';
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      setFocusTick((tick) => tick + 1);
      return;
    }
    requestId.current ??= newRequestId();
    setBanner(null);
    setSubmit({ phase: 'sending' });
    try {
      const response = await fetch('/api/refund-requests', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          clientRequestId: requestId.current,
          language,
          productKind: values.productKind,
          orderReference: normalizeOrderReference(values.orderReference),
          contactName: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          sessionDate: values.sessionDate || undefined,
          sessionTime: values.sessionDate && values.sessionTime ? values.sessionTime : undefined,
          reason: values.reason,
          message: values.message.trim() || undefined,
          acceptedTruth: true,
          acceptedRules: true,
          website: values.website,
        }),
      });
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (response.status === 201 && body && typeof body.reference === 'string') {
        const evaluationBody = (body.evaluation ?? {}) as { urgent?: boolean };
        setSubmit({
          phase: 'done',
          receipt: {
            reference: body.reference,
            receivedAt: String(body.receivedAt ?? new Date().toISOString()),
            duplicate: body.duplicate === true,
            acknowledged: body.acknowledged === true,
            urgent: evaluationBody.urgent === true,
          },
        });
        return;
      }
      if (response.status === 503) {
        setSubmit({ phase: 'unavailable' });
        return;
      }
      setSubmit({ phase: 'editing' });
      setBanner(response.status === 429 ? 'rateLimited' : response.status === 400 ? 'invalid' : 'server');
    } catch {
      setSubmit({ phase: 'editing' });
      setBanner('network');
    }
  }, [values, language]);

  const reset = useCallback(() => {
    requestId.current = null;
    checkedKey.current = null;
    setValues(EMPTY_VALUES);
    setErrors({});
    setBanner(null);
    setVerification({ state: 'idle' });
    setSubmit({ phase: 'editing' });
    setStep(1);
  }, []);

  const backToForm = useCallback(() => setSubmit({ phase: 'editing' }), []);

  return {
    values,
    setField,
    step,
    errors,
    focusTick,
    verification,
    verified,
    evaluation,
    reasons: REFUND_REASONS_BY_KIND[values.productKind],
    submit,
    banner,
    goBack,
    goNext,
    send,
    reset,
    backToForm,
  };
}

export type RefundForm = ReturnType<typeof useRefundForm>;
