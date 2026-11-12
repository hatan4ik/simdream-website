import React from 'react';
import { REFUND_PRODUCT_KINDS, type RefundCopy, type FieldErrorCode } from '@/lib/refund';
import { ChoiceCard } from './ChoiceCard';
import { FormField, inputClassName, withLtrTokens } from './FormField';
import type { RefundForm } from './use-refund-form';

interface StepProps {
  form: RefundForm;
  copy: RefundCopy;
  idBase: string;
}

type ErrorField = 'orderReference' | 'email' | 'name' | 'phone' | 'sessionDate' | 'sessionTime';

function errorText(copy: RefundCopy, field: ErrorField, code: FieldErrorCode | undefined): string | undefined {
  if (!code) return undefined;
  if (code === 'required') return copy.errors.required;
  const byField: Record<ErrorField, string> = {
    orderReference: copy.errors.reference,
    email: copy.errors.email,
    name: copy.errors.required,
    phone: copy.errors.phone,
    sessionDate: copy.errors.date,
    sessionTime: copy.errors.time,
  };
  return byField[field];
}

/** Step 1: what was bought, which order, and how to reach the customer. */
export function OrderStep({ form, copy, idBase }: StepProps) {
  const { values, setField, errors, verified } = form;
  const e = (field: ErrorField) => errorText(copy, field, errors[field]);
  const locked = verified !== null && verified.sessionDate !== null;

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-200">{copy.order.kindLegend}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {REFUND_PRODUCT_KINDS.map((kind) => (
            <ChoiceCard
              key={kind}
              name={`${idBase}-kind`}
              value={kind}
              checked={values.productKind === kind}
              onSelect={() => setField('productKind', kind)}
              title={copy.order.kinds[kind].title}
              hint={copy.order.kinds[kind].hint}
            />
          ))}
        </div>
      </fieldset>

      <FormField id={`${idBase}-reference`} label={copy.order.referenceLabel} hint={withLtrTokens(copy.order.referenceHints[values.productKind])} error={e('orderReference')}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            type="text"
            dir="ltr"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={64}
            aria-required="true"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            value={values.orderReference}
            onChange={(event) => setField('orderReference', event.target.value)}
            className={inputClassName}
          />
        )}
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id={`${idBase}-email`} label={copy.order.emailLabel} hint={copy.order.emailHint} error={e('email')}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="email"
              dir="ltr"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              aria-required="true"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              value={values.email}
              onChange={(event) => setField('email', event.target.value)}
              className={inputClassName}
            />
          )}
        </FormField>
        <FormField id={`${idBase}-name`} label={copy.order.nameLabel} error={e('name')}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              autoComplete="name"
              maxLength={120}
              aria-required="true"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              value={values.name}
              onChange={(event) => setField('name', event.target.value)}
              className={inputClassName}
            />
          )}
        </FormField>
        <FormField id={`${idBase}-phone`} label={copy.order.phoneLabel} hint={copy.order.phoneHint} error={e('phone')}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="tel"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              maxLength={32}
              aria-required="true"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              value={values.phone}
              onChange={(event) => setField('phone', event.target.value)}
              className={inputClassName}
            />
          )}
        </FormField>
      </div>

      {values.productKind === 'flight' && (
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            id={`${idBase}-session-date`}
            label={copy.order.sessionDateLabel}
            optional={copy.labels.optional}
            hint={copy.order.sessionHint}
            error={e('sessionDate')}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="date"
                dir="ltr"
                readOnly={locked}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                value={values.sessionDate}
                onChange={(event) => setField('sessionDate', event.target.value)}
                className={inputClassName}
              />
            )}
          </FormField>
          <FormField id={`${idBase}-session-time`} label={copy.order.sessionTimeLabel} optional={copy.labels.optional} error={e('sessionTime')}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="time"
                dir="ltr"
                readOnly={locked}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                value={values.sessionTime}
                onChange={(event) => setField('sessionTime', event.target.value)}
                className={inputClassName}
              />
            )}
          </FormField>
        </div>
      )}
    </div>
  );
}
