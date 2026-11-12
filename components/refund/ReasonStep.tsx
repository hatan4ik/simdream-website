import React from 'react';
import { REFUND_FIELD_LIMITS, fillCopy, type RefundCopy } from '@/lib/refund';
import { ChoiceCard } from './ChoiceCard';
import { FormField, inputClassName } from './FormField';
import type { RefundForm } from './use-refund-form';

/** Step 2: why the customer asks, in a category and in their own words. */
export function ReasonStep({ form, copy, idBase }: { form: RefundForm; copy: RefundCopy; idBase: string }) {
  const { values, setField, errors, reasons } = form;
  const reasonError = errors.reason ? copy.errors.reason : undefined;

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3" aria-describedby={reasonError ? `${idBase}-reason-error` : undefined}>
        <legend className="text-sm font-semibold text-slate-200">{copy.reason.legend}</legend>
        <div className="grid gap-3">
          {reasons.map((reason, index) => (
            <ChoiceCard
              key={reason}
              name={`${idBase}-reason`}
              value={reason}
              checked={values.reason === reason}
              onSelect={() => setField('reason', reason)}
              title={copy.reason.options[reason].title}
              hint={copy.reason.options[reason].hint}
              invalid={Boolean(reasonError) && index === 0}
            />
          ))}
        </div>
        {reasonError && (
          <p id={`${idBase}-reason-error`} className="text-sm font-medium text-red-300">
            {reasonError}
          </p>
        )}
      </fieldset>

      <FormField id={`${idBase}-message`} label={copy.reason.messageLabel} optional={copy.labels.optional} hint={copy.reason.messageHint}>
        {({ id, describedBy }) => (
          <>
            <textarea
              id={id}
              rows={5}
              maxLength={REFUND_FIELD_LIMITS.messageMax}
              aria-describedby={describedBy}
              value={values.message}
              onChange={(event) => setField('message', event.target.value)}
              className={inputClassName}
            />
            <p className="text-xs text-slate-400">
              {fillCopy(copy.reason.messageCount, { count: values.message.length, max: REFUND_FIELD_LIMITS.messageMax })}
            </p>
          </>
        )}
      </FormField>
    </div>
  );
}
