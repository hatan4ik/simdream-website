'use client';

import React, { useRef, useState } from 'react';
import { CheckCircle2, Copy, Printer } from 'lucide-react';
import { REFUND_POLICY, fillCopy, formatInstantInIsrael, type RefundCopy } from '@/lib/refund';
import type { Language } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/Button';
import { ContactLinks } from './ContactLinks';
import type { RefundFormValues, RefundReceiptView } from './refund-form-types';

// Print only the receipt. The theme paints text light on dark, so print colours are forced to black on white.
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #refund-receipt, #refund-receipt * { visibility: visible !important; color: #000 !important; background: #fff !important; border-color: #999 !important; box-shadow: none !important; }
  #refund-receipt { position: absolute; inset-inline: 0; top: 0; padding: 24px; }
  [data-print-hide] { display: none !important; }
}`;

interface RefundSuccessProps {
  receipt: RefundReceiptView;
  values: RefundFormValues;
  copy: RefundCopy;
  language: Language;
  onAnother: () => void;
}

/** The confirmation: the reference to quote, what happens next (only what the rules promise), and a printable copy. */
export function RefundSuccess({ receipt, values, copy, language, onAnother }: RefundSuccessProps) {
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  React.useEffect(() => headingRef.current?.focus(), []);

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(receipt.reference);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; the reference is on screen and in the print copy.
    }
  }

  const receivedAt = new Date(receipt.receivedAt);
  const timeline = copy.success.timeline.map((step) =>
    fillCopy(step, { clause: REFUND_POLICY.response.clause, days: REFUND_POLICY.response.days })
  );

  return (
    <section id="refund-receipt" data-refund-success className="space-y-8 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-6 sm:p-8">
      <style>{PRINT_CSS}</style>
      <div className="flex items-start gap-4">
        <CheckCircle2 aria-hidden="true" className="mt-1 h-8 w-8 shrink-0 text-emerald-400" />
        <div className="space-y-2">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-white focus:outline-none">
            {copy.success.title}
          </h2>
          <p className="text-slate-300">{copy.success.body}</p>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
        <p className="text-sm font-semibold text-slate-400">{copy.success.referenceLabel}</p>
        <p dir="ltr" data-refund-reference className="font-mono text-3xl font-bold tracking-widest text-white sm:text-4xl">
          {receipt.reference}
        </p>
        <p className="text-sm text-slate-400">
          {copy.success.receivedAt}:{' '}
          <span>{Number.isNaN(receivedAt.getTime()) ? '' : formatInstantInIsrael(language, receivedAt.toISOString())}</span>
        </p>
        <p dir="ltr" className="text-sm text-slate-400">
          {values.orderReference}
        </p>
      </div>

      <p role="status" className="text-sm font-medium text-slate-200">
        {receipt.acknowledged ? fillCopy(copy.success.emailed, { email: values.email.trim() }) : copy.success.notEmailed}
      </p>

      <div data-print-hide className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={copyReference}>
          <Copy aria-hidden="true" className="h-4 w-4" />
          {copied ? copy.success.copied : copy.success.copy}
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          <Printer aria-hidden="true" className="h-4 w-4" />
          {copy.success.print}
        </Button>
      </div>
      <p role="status" className="sr-only">
        {copied ? copy.success.copied : ''}
      </p>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white">{copy.success.timelineTitle}</h3>
        <ol className="space-y-2 text-sm leading-relaxed text-slate-300">
          {timeline.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-500/40 text-xs font-bold text-sky-300">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {receipt.urgent && (
        <p role="note" className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm font-medium text-amber-300">
          {copy.success.urgent}
        </p>
      )}

      <div data-print-hide className="space-y-3">
        <h3 className="text-lg font-bold text-white">{copy.success.contactTitle}</h3>
        <ContactLinks copy={copy} />
        <div>
          <Button type="button" variant="ghost" onClick={onAnother}>
            {copy.success.another}
          </Button>
        </div>
      </div>
    </section>
  );
}
