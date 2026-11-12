import type { RefundBlocker, RefundOutcome, RefundProductKind, RefundReason } from '../refund-types';

/**
 * Every customer-visible string of the refund form. One object per language
 * (`copy/en.ts` ... `copy/es.ts`), resolved with `REFUND_COPY[language] || REFUND_COPY.en`.
 * Placeholders in `{braces}` are filled by `fillCopy()`; every language uses the same ones.
 * The legal substance (clauses 4.1 to 4.6, 5.1, 12.1) is the owner's rules text; these strings only
 * explain it. Numbers (24 hours, 14 days, 2 business days, 150 ILS, the 4.6 prices) are never
 * written here: they arrive as placeholders from REFUND_POLICY.
 */
export interface RefundCopy {
  header: { eyebrow: string; title: string; intro: string };
  stepper: { label: string; stepOf: string; steps: [string, string, string] };
  actions: { back: string; continue: string; send: string; sending: string; checking: string };
  labels: { required: string; optional: string };
  order: {
    title: string;
    intro: string;
    kindLegend: string;
    kinds: Record<RefundProductKind, { title: string; hint: string }>;
    referenceLabel: string;
    referenceHints: Record<RefundProductKind, string>;
    emailLabel: string;
    emailHint: string;
    nameLabel: string;
    phoneLabel: string;
    phoneHint: string;
    sessionDateLabel: string;
    sessionTimeLabel: string;
    sessionHint: string;
  };
  verification: {
    verifiedTitle: string;
    verifiedBody: string;
    voucherFallback: string;
    unverifiedTitle: string;
    unverifiedBody: string;
    unavailableBody: string;
  };
  reason: {
    title: string;
    intro: string;
    legend: string;
    options: Record<RefundReason, { title: string; hint: string }>;
    messageLabel: string;
    messageHint: string;
    messageCount: string;
  };
  panel: {
    title: string;
    badge: string;
    pending: string;
    outcomes: Record<RefundOutcome, { headline: string; body: string }>;
    blockers: Record<RefundBlocker, string>;
    manual: { voucher: string; duplicate: string; noDate: string; sessionOver: string };
    facts: { session: string; assumedTime: string; orderAge: string; freeUntil: string; fullRefundUntil: string; clauses: string };
    nudge: { title: string; body: string; whatsapp: string; contact: string };
    disclaimer: string;
  };
  review: {
    title: string;
    intro: string;
    summary: {
      order: string;
      contact: string;
      session: string;
      reason: string;
      check: string;
      checkVerified: string;
      checkUnverified: string;
      sessionUnknown: string;
    };
    truth: string;
    rules: string;
    rulesLink: string;
    privacyLink: string;
    honeypotLabel: string;
  };
  success: {
    title: string;
    body: string;
    referenceLabel: string;
    copy: string;
    copied: string;
    print: string;
    receivedAt: string;
    emailed: string;
    notEmailed: string;
    timelineTitle: string;
    timeline: [string, string, string];
    urgent: string;
    contactTitle: string;
    another: string;
  };
  unavailable: { title: string; body: string; contactTitle: string };
  contact: { whatsapp: string; call: string; email: string };
  errors: {
    required: string;
    email: string;
    phone: string;
    reference: string;
    date: string;
    time: string;
    reason: string;
    declaration: string;
    network: string;
    server: string;
    rateLimited: string;
    invalid: string;
    fixFields: string;
  };
}

/** Subject and body of the acknowledgement email, in the customer's language. */
export interface RefundEmailCopy {
  subject: string;
  greeting: string;
  received: string;
  referenceLabel: string;
  next: string;
  rulesLabel: string;
  footer: string;
}
