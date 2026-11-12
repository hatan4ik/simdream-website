import React from 'react';
import { cn } from '@/lib/utils';

/** Shared look of every text input, select and textarea of the refund form (all three themes recolour it). */
export const inputClassName =
  'w-full min-h-11 rounded-lg bg-slate-950 border border-slate-800 px-4 py-2.5 text-base text-white focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400/50 read-only:opacity-80 aria-[invalid=true]:border-red-500';

interface FieldRenderProps {
  id: string;
  /** Space-separated ids of the hint and error, for aria-describedby. */
  describedBy: string | undefined;
  invalid: boolean;
}

interface FormFieldProps {
  id: string;
  label: string;
  /** Marks the field as optional with this word (for example "optional"); required fields carry no mark. */
  optional?: string;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: (field: FieldRenderProps) => React.ReactNode;
}

/** A label, optional hint, the control and its inline error, wired together for assistive technology. */
export function FormField({ id, label, optional, hint, error, className, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-200">
        {label}
        {optional && <span className="ms-2 font-normal text-slate-400">({optional})</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="text-xs leading-relaxed text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Wraps booking-reference prefixes such as SD-737- in a left-to-right isolate, so their trailing
 * hyphen stays put inside Hebrew and Arabic sentences.
 */
export function withLtrTokens(text: string): React.ReactNode {
  return text.split(/(SD-[A-Z0-9]+-)/).map((part, index) =>
    /^SD-[A-Z0-9]+-$/.test(part) ? (
      <bdi key={index} dir="ltr">
        {part}
      </bdi>
    ) : (
      part
    )
  );
}
