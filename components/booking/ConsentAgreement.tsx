'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ConsentAgreementProps {
  /** Which agreement this is; a stable hook for tests and styling. */
  kind: 'rules' | 'media';
  /** DOM id of the checkbox (the first control to focus when it is missing). */
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The visible label: text with real links. */
  label: ReactNode;
  /** The accessible name of the checkbox. */
  ariaLabel: string;
  /** The one plain sentence under the label; also the checkbox's accessible description. */
  summary: string;
  /**
   * Inline error, tied to the checkbox with `aria-describedby`. The page's live region (the booking error
   * alert) announces the same failure once on submit, so this text is not a second alert.
   */
  error: string;
  /** Id of an extra note the checkbox is also described by (the 18+ declaration). */
  describedBy?: string;
  /** Notes and the full-text expander, below the summary. */
  children?: ReactNode;
}

/**
 * One mandatory confirmation: a large checkbox in a labelled row, one plain-language sentence under it,
 * optional extra content, and an inline error. The checkbox is unchecked by default and never `required`
 * natively: the page validates on submit, so the error is localized, announced and focused.
 */
export function ConsentAgreement({
  kind,
  id,
  checked,
  onChange,
  label,
  ariaLabel,
  summary,
  error,
  describedBy,
  children,
}: ConsentAgreementProps) {
  const summaryId = `${id}-summary`;
  const errorId = `${id}-error`;
  const described = [summaryId, describedBy, error ? errorId : undefined].filter(Boolean).join(' ');
  return (
    <div
      data-consent-agreement={kind}
      data-consent-state={checked ? 'checked' : error ? 'error' : 'idle'}
      className={cn(
        'rounded-xl border p-3.5 space-y-2.5 transition-colors',
        checked
          ? 'border-emerald-500/40 bg-emerald-500/10'
          : error
            ? 'border-red-500/60 bg-red-950/40'
            : 'border-slate-700 bg-slate-950/50'
      )}
    >
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={ariaLabel}
          aria-describedby={described}
          aria-invalid={error ? true : undefined}
          aria-required="true"
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-sky-500"
        />
        <span className="text-sm font-semibold leading-snug text-white">{label}</span>
      </label>
      <p id={summaryId} className="ps-9 text-xs leading-relaxed text-slate-300">
        {summary}
      </p>
      {children}
      {error && (
        <p id={errorId} data-consent-error className="ps-9 text-xs font-semibold leading-relaxed text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
