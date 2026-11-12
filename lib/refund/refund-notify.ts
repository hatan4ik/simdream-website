import 'server-only';

import sgMail from '@sendgrid/mail';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { hasUsableValue } from '@/lib/config/server-env';
import { languageDirection, resolveLanguagePreference } from '@/lib/i18n/language-preference';
import { isSendgridConfigured } from '@/lib/sendgrid';
import { REFUND_EMAIL_COPY } from './copy/email';
import { fillCopy } from './copy/fill-copy';
import { REFUND_POLICY } from './refund-policy';
import type { StoredRefundRequest } from './refund-repository';

/**
 * Emails for a refund request, over the transport the booking confirmations already use
 * (`lib/sendgrid.ts`, SendGrid, configured by SENDGRID_API_KEY). Two messages:
 *  - to the business inbox, so the team sees the request at once (REFUND_NOTIFY_EMAIL, else the
 *    desk address from the facility config), with Reply-To set to the customer;
 *  - an acknowledgement to the customer, in their language.
 * Neither function throws: a failed send is reported as `false`, and only the error name is logged.
 */
const SENDER = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'info@simdream.co.il';

export const isRefundMailConfigured = (): boolean => isSendgridConfigured;

/** The inbox that receives new refund requests. */
export function refundInbox(): string {
  const configured = process.env.REFUND_NOTIFY_EMAIL?.trim();
  return hasUsableValue(configured) && configured.includes('@') ? configured : FACILITY_INFO.contact.email;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 12px;color:#475569;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 12px;color:#0f172a">${value}</td></tr>`;

function staffNoticeHtml(request: StoredRefundRequest): string {
  const { evaluation } = request;
  const session = request.sessionDate
    ? `${request.sessionDate}${request.sessionTime ? ` ${request.sessionTime}` : ''}${evaluation.facts.sessionTimeAssumed ? ' (time assumed)' : ''}`
    : 'not given';
  const rows = [
    row('Reference', `<strong>${escapeHtml(request.reference)}</strong>`),
    row('Priority', escapeHtml(request.priority.toUpperCase())),
    row('Likely outcome', `${escapeHtml(evaluation.outcome)} (rules ${escapeHtml(evaluation.clauses.join(', ') || 'none')}; ${escapeHtml(evaluation.coverage)} coverage)`),
    row('Order check', request.verification === 'verified' ? `Verified: ${escapeHtml(request.packageTitle ?? request.productKind)}` : 'NOT verified, check the order by hand'),
    row('Product', escapeHtml(request.productKind)),
    row('Order reference', escapeHtml(request.orderReference)),
    row('Order date', escapeHtml(request.orderDate ?? 'unknown')),
    row('Session', escapeHtml(session)),
    row('Reason', escapeHtml(request.reason)),
    row('Name', escapeHtml(request.contactName)),
    row('Email', escapeHtml(request.email)),
    row('Phone', escapeHtml(request.phone)),
    row('Language', escapeHtml(request.language)),
    row('Flags', escapeHtml(evaluation.staff.flags.join(', ') || 'none')),
    row('Message', request.message ? escapeHtml(request.message).replace(/\n/g, '<br>') : '-'),
  ].join('');
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a">
  <h2 style="margin:0 0 12px">Refund request ${escapeHtml(request.reference)}</h2>
  <p style="color:#475569">Nothing has been refunded or changed. The outcome below is the rules' likely result, for triage only.</p>
  <table style="border-collapse:collapse;width:100%;background:#f8fafc">${rows}</table>
  <p style="color:#475569;font-size:13px">Rules: ${escapeHtml(FACILITY_INFO.primaryDomain + REFUND_POLICY.rulesPath)}</p>
</div>`;
}

export async function sendRefundStaffNotice(request: StoredRefundRequest): Promise<boolean> {
  if (!isSendgridConfigured) return false;
  try {
    await sgMail.send({
      to: refundInbox(),
      from: SENDER,
      replyTo: request.email,
      subject: `[Refund request ${request.reference}] ${request.priority.toUpperCase()}: ${request.evaluation.outcome}`,
      html: staffNoticeHtml(request),
    });
    return true;
  } catch (error) {
    console.error('Refund staff notification failed', error instanceof Error ? error.name : 'unknown');
    return false;
  }
}

function acknowledgementHtml(request: StoredRefundRequest): string {
  const language = resolveLanguagePreference(request.language);
  const copy = REFUND_EMAIL_COPY[language] || REFUND_EMAIL_COPY.en;
  const values = { reference: request.reference, name: request.contactName, days: REFUND_POLICY.response.days };
  const rulesUrl = `${FACILITY_INFO.primaryDomain}${REFUND_POLICY.rulesPath}`;
  return `<div dir="${languageDirection(language)}" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#0f172a">
  <p>${escapeHtml(fillCopy(copy.greeting, values))}</p>
  <p>${escapeHtml(copy.received)}</p>
  <p>${escapeHtml(copy.referenceLabel)}: <strong dir="ltr" style="font-size:20px;letter-spacing:1px">${escapeHtml(request.reference)}</strong></p>
  <p>${escapeHtml(fillCopy(copy.next, values))}</p>
  <p><a href="${escapeHtml(rulesUrl)}">${escapeHtml(copy.rulesLabel)}</a></p>
  <p style="color:#64748b;font-size:13px">${escapeHtml(copy.footer)} &middot; ${escapeHtml(FACILITY_INFO.contact.email)} &middot; <span dir="ltr">${escapeHtml(FACILITY_INFO.contact.phoneInternational)}</span></p>
</div>`;
}

export async function sendRefundAcknowledgement(request: StoredRefundRequest): Promise<boolean> {
  if (!isSendgridConfigured) return false;
  const language = resolveLanguagePreference(request.language);
  const copy = REFUND_EMAIL_COPY[language] || REFUND_EMAIL_COPY.en;
  try {
    await sgMail.send({
      to: request.email,
      from: SENDER,
      subject: fillCopy(copy.subject, { reference: request.reference }),
      html: acknowledgementHtml(request),
    });
    return true;
  } catch (error) {
    console.error('Refund acknowledgement failed', error instanceof Error ? error.name : 'unknown');
    return false;
  }
}
