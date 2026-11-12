import React from 'react';
import Link from 'next/link';
import { REFUND_POLICY, formatSessionDate, type RefundCopy } from '@/lib/refund';
import type { Language } from '@/lib/i18n/translations';
import type { RefundForm } from './use-refund-form';

interface ReviewStepProps {
  form: RefundForm;
  copy: RefundCopy;
  language: Language;
  idBase: string;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-semibold text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-white">{children}</dd>
    </div>
  );
}

/** Step 3: a summary to check, the two declarations, and the honeypot only a script fills. */
export function ReviewStep({ form, copy, language, idBase }: ReviewStepProps) {
  const { values, setField, errors, verification, verified } = form;
  const ok = verification.state === 'verified';

  const declaration = (field: 'acceptedTruth' | 'acceptedRules', label: React.ReactNode) => (
    <div className="space-y-1">
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
        <input
          type="checkbox"
          checked={values[field]}
          aria-required="true"
          aria-invalid={Boolean(errors[field])}
          aria-describedby={errors[field] ? `${idBase}-${field}-error` : undefined}
          onChange={(event) => setField(field, event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-sky-500"
        />
        <span className="text-sm leading-relaxed text-slate-200">{label}</span>
      </label>
      {errors[field] && (
        <p id={`${idBase}-${field}-error`} className="ps-8 text-sm font-medium text-red-300">
          {copy.errors.declaration}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <dl className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40 px-4">
        <Row label={copy.review.summary.order}>
          <span dir="ltr" className="inline-block font-mono">
            {values.orderReference}
          </span>
          {verified?.packageTitle && <span className="block text-slate-300">{verified.packageTitle}</span>}
        </Row>
        <Row label={copy.review.summary.contact}>
          <span className="block">{values.name}</span>
          <span dir="ltr" className="block rtl:text-right">
            {values.email}
          </span>
          <span dir="ltr" className="block rtl:text-right">
            {values.phone}
          </span>
        </Row>
        <Row label={copy.review.summary.session}>
          {values.sessionDate ? (
            <>
              <span>{formatSessionDate(language, values.sessionDate)}</span>
              {values.sessionTime && (
                <>
                  {' '}
                  <span dir="ltr">{values.sessionTime}</span>
                </>
              )}
            </>
          ) : (
            copy.review.summary.sessionUnknown
          )}
        </Row>
        <Row label={copy.review.summary.reason}>{values.reason ? copy.reason.options[values.reason].title : ''}</Row>
        <Row label={copy.review.summary.check}>{ok ? copy.review.summary.checkVerified : copy.review.summary.checkUnverified}</Row>
        {values.message && <Row label={copy.reason.messageLabel}>{values.message}</Row>}
      </dl>

      <div className="space-y-1">
        {declaration('acceptedTruth', copy.review.truth)}
        {declaration(
          'acceptedRules',
          <>
            {copy.review.rules}{' '}
            <Link href={REFUND_POLICY.rulesPath} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-400 underline underline-offset-2">
              {copy.review.rulesLink}
              <span className="sr-only"> {copy.labels.newTab}</span>
            </Link>
            {' · '}
            <Link href={REFUND_POLICY.privacyPath} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-400 underline underline-offset-2">
              {copy.review.privacyLink}
              <span className="sr-only"> {copy.labels.newTab}</span>
            </Link>
          </>
        )}
      </div>

      {/* Honeypot: off-screen, out of the tab order and hidden from assistive technology. */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label>
          {copy.review.honeypotLabel}
          <input
            type="text"
            name="refund_company_site"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(event) => setField('website', event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
