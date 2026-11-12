'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import { CheckCircle2, CircleSlash, AlertCircle } from 'lucide-react';
import {
  BIRTHDAY_DISCOUNT_PERCENT,
  BIRTHDAY_LOOKBACK_DAYS,
  applyBirthdayDiscount,
  evaluateBirthdayDiscount,
  getBirthdayEligiblePackages,
  getBirthdayErrorText,
  type BirthdayEvaluation,
} from '@/lib/discounts/birthday';
import { getLocalizedPackages, type SupportedLanguage } from '@/lib/i18n/translations';
import { formatCalendarDate, formatIls } from '@/lib/offers/format';
import { fillOffersTemplate, type OffersCopy } from '@/lib/offers/offers-copy';
import { maxBookableDate } from '@/lib/scheduler/booking-horizon';
import { israelToday } from '@/lib/scheduler/israel-clock';

const inputClass =
  'w-full min-h-11 rounded-lg bg-slate-950 border border-slate-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400';

/** Reason-specific sentence for an eligible evaluation. */
function eligibleSentence(copy: OffersCopy, result: BirthdayEvaluation): string {
  const template =
    result.reason === 'grace_before'
      ? copy.resultGraceBefore
      : result.reason === 'grace_after'
        ? copy.resultGraceAfter
        : copy.resultSameMonth;
  return fillOffersTemplate(template, { percent: BIRTHDAY_DISCOUNT_PERCENT, lookback: BIRTHDAY_LOOKBACK_DAYS });
}

interface BirthdayCalculatorProps {
  copy: OffersCopy;
  language: SupportedLanguage;
}

/**
 * "Check my birthday": the pure engine in the browser. Nothing typed here is stored, sent or logged.
 * The flight date defaults to today (Israel date) once the page has mounted.
 */
export function BirthdayCalculator({ copy, language }: BirthdayCalculatorProps) {
  const ids = useId();
  const [birthDate, setBirthDate] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [today, setToday] = useState('');

  useEffect(() => {
    // Read after mount: a render-time clock read would freeze the build date into the prerendered page.
    const current = israelToday();
    setToday(current);
    setFlightDate((existing) => existing || current);
  }, []);

  const result = useMemo<BirthdayEvaluation | null>(
    () => (birthDate && flightDate ? evaluateBirthdayDiscount({ birthDate, flightDate }) : null),
    [birthDate, flightDate]
  );

  const rows = useMemo(() => {
    const localized = getLocalizedPackages(language);
    return getBirthdayEligiblePackages().map((entry) => ({
      id: entry.id,
      title: localized.find((pkg) => pkg.id === entry.id)?.title ?? entry.id,
      price: applyBirthdayDiscount(entry.priceIls),
    }));
  }, [language]);

  const windowText =
    result?.valid && result.windowStart && result.windowEnd
      ? {
          start: formatCalendarDate(result.windowStart, language),
          end: formatCalendarDate(result.windowEnd, language),
        }
      : null;

  return (
    <div
      className="rounded-3xl border border-sky-500/30 bg-slate-900/60 p-6 sm:p-8 space-y-6"
      data-birthday-calculator
    >
      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-bold text-white">{copy.calcTitle}</h3>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{copy.calcIntro}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={`${ids}-birth`} className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
            {copy.birthLabel}
          </label>
          <input
            id={`${ids}-birth`}
            type="date"
            value={birthDate}
            min="1900-01-01"
            max={today || undefined}
            onChange={(event) => setBirthDate(event.target.value)}
            className={inputClass}
            data-birthday-input="birth"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor={`${ids}-flight`} className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
            {copy.flightLabel}
          </label>
          <input
            id={`${ids}-flight`}
            type="date"
            value={flightDate}
            min={today || undefined}
            max={today ? maxBookableDate(today) || undefined : undefined}
            onChange={(event) => setFlightDate(event.target.value)}
            className={inputClass}
            data-birthday-input="flight"
          />
        </div>
      </div>

      <div role="status" aria-live="polite" data-birthday-result className="space-y-4">
        {!result && <p className="text-sm text-slate-400">{copy.calcPrompt}</p>}

        {result && !result.valid && result.error && (
          <p className="flex items-start gap-2 text-sm text-amber-300" data-birthday-verdict="invalid">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{getBirthdayErrorText(language, result.error)}</span>
          </p>
        )}

        {result?.valid && result.eligible && (
          <div className="space-y-4">
            <p className="flex items-start gap-2 text-base font-semibold text-emerald-300" data-birthday-verdict="eligible">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{eligibleSentence(copy, result)}</span>
            </p>
            {windowText && (
              <p className="text-sm text-slate-300">{fillOffersTemplate(copy.resultWindow, windowText)}</p>
            )}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{copy.tableCaption}</p>
              <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40" data-birthday-prices>
                {rows.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                    <span className="text-sm text-slate-200">{row.title}</span>
                    <span className="flex items-baseline gap-3 tabular-nums">
                      <s className="text-sm text-slate-400">
                        <span className="sr-only">{copy.colRegular}: </span>
                        {formatIls(row.price.subtotalIls)}
                      </s>
                      <strong className="text-base font-bold text-white">
                        <span className="sr-only">{copy.colWithBirthday}: </span>
                        {formatIls(row.price.totalIls)}
                      </strong>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {result?.valid && !result.eligible && (
          <div className="space-y-2" data-birthday-verdict="not-eligible">
            <p className="flex items-start gap-2 text-base font-semibold text-slate-200">
              <CircleSlash className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <span>{windowText ? fillOffersTemplate(copy.resultNone, windowText) : ''}</span>
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">{copy.calcPrivacy}</p>
    </div>
  );
}
