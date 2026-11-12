'use client';

import React, { useEffect, useId, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { fillCopy, refundCopyFor, formatSessionDate } from '@/lib/refund';
import { Button } from '@/components/ui/Button';
import { ExpectationPanel } from './ExpectationPanel';
import { OrderStep } from './OrderStep';
import { ReasonStep } from './ReasonStep';
import { RefundStepper } from './RefundStepper';
import { RefundSuccess } from './RefundSuccess';
import { RefundUnavailable } from './RefundUnavailable';
import { ReviewStep } from './ReviewStep';
import { useRefundForm } from './use-refund-form';

/**
 * The refund request page body: three steps (your order, what happened, review and send), a live
 * "what to expect" panel from the policy module, and an honest success or unavailable ending.
 * The page is unlisted: nothing in the navigation or the sitemap points here.
 */
export function RefundRequestView() {
  const { language } = useLanguage();
  const copy = refundCopyFor(language);
  const form = useRefundForm(language);
  const idBase = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const { step, errors, banner, verification, submit } = form;
  const hasErrors = Object.values(errors).some(Boolean);

  // A new step starts at its heading, so keyboard and screen-reader users land at the top of it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // A failed Continue or Send moves focus to the first field that needs attention.
  useEffect(() => {
    if (form.focusTick === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus();
  }, [form.focusTick]);

  if (submit.phase === 'done') {
    return <RefundSuccess receipt={submit.receipt} values={form.values} copy={copy} language={language} onAnother={form.reset} />;
  }
  if (submit.phase === 'unavailable') return <RefundUnavailable copy={copy} onBack={form.backToForm} />;

  const titles = [copy.order.title, copy.reason.title, copy.review.title];
  const intros = [copy.order.intro, copy.reason.intro, copy.review.intro];
  const sending = submit.phase === 'sending';
  const checking = verification.state === 'checking';
  const bannerText = banner ? copy.errors[banner] : null;

  return (
    <form
      ref={formRef}
      noValidate
      data-refund-form
      onSubmit={(event) => {
        event.preventDefault();
        if (step === 3) void form.send();
        else void form.goNext();
      }}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
    >
      <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <RefundStepper step={step} copy={copy} />

        <div className="space-y-2">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-white focus:outline-none">
            {titles[step - 1]}
          </h2>
          <p className="text-slate-300">{intros[step - 1]}</p>
        </div>

        {(hasErrors || bannerText) && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm font-medium text-red-300">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{bannerText ?? copy.errors.fixFields}</span>
          </p>
        )}

        {step > 1 && verification.state !== 'idle' && verification.state !== 'checking' && (
          <div role="status" data-refund-verification={verification.state} className={verification.state === 'verified' ? 'flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4' : 'flex items-start gap-3 rounded-xl border border-sky-500/40 bg-sky-950/20 p-4'}>
            {verification.state === 'verified' ? (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
            )}
            <div className="space-y-1 text-sm">
              {verification.state === 'verified' ? (
                <>
                  <p className="font-semibold text-white">{copy.verification.verifiedTitle}</p>
                  <p className="text-slate-300">
                    {fillCopy(copy.verification.verifiedBody, {
                      details: [
                        verification.order.packageTitle ?? (verification.order.productKind === 'voucher' ? copy.verification.voucherFallback : ''),
                        verification.order.sessionDate ? formatSessionDate(language, verification.order.sessionDate) : '',
                        verification.order.sessionTime ?? '',
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    })}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-white">{copy.verification.unverifiedTitle}</p>
                  <p className="text-slate-300">
                    {verification.state === 'unavailable' ? copy.verification.unavailableBody : copy.verification.unverifiedBody}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {step === 1 && <OrderStep form={form} copy={copy} idBase={idBase} />}
        {step === 2 && <ReasonStep form={form} copy={copy} idBase={idBase} />}
        {step === 3 && <ReviewStep form={form} copy={copy} language={language} idBase={idBase} />}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6">
          {step > 1 ? (
            <Button type="button" variant="secondary" onClick={form.goBack} disabled={sending || checking}>
              {copy.actions.back}
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" variant="primary" size="lg" isLoading={sending || checking}>
            {sending ? copy.actions.sending : checking ? copy.actions.checking : step === 3 ? copy.actions.send : copy.actions.continue}
          </Button>
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-28">
        <ExpectationPanel evaluation={form.evaluation} copy={copy} language={language} idBase={idBase} />
      </div>
    </form>
  );
}
