'use client';

import { BirthdayOfferLink } from '@/components/offers/BirthdayOfferLink';
import { getBirthdayCheckoutCopy } from '@/lib/discounts/birthday';
import { getCheckoutExtrasCopy } from '@/lib/booking/client';
import { useLanguage } from '@/lib/i18n/language-context';
import { BirthdayStatus } from './BirthdayStatus';
import { FIELD_CONTROL, FIELD_LABEL, STOREFRONT_FIELD_CONTROL, STOREFRONT_FIELD_LABEL } from './pilot-field-styles';
import type { BookingBirthday } from './hooks';

interface BirthdayFieldProps {
  birthday: BookingBirthday;
  /** `storefront` is the compact Express Shop buy box; `wizard` is the guided step. Same field, same rules. */
  variant?: 'wizard' | 'storefront';
}

/**
 * The mandatory Pilot in Command date of birth, with the link to the Offers page. A native date control:
 * one field with the platform's own picker and keyboard entry, `autocomplete="bday"`, the engine's age
 * bounds as `min`/`max`, a left-to-right value inside right-to-left pages. It is never natively `required`:
 * the page validates on submit so the error is localized, announced and focused (`useBookingBirthday`).
 */
export function BirthdayField({ birthday, variant = 'wizard' }: BirthdayFieldProps) {
  const { language } = useLanguage();
  const copy = getBirthdayCheckoutCopy(language);
  const { id, value, setValue, onBlur, bounds, errorText, mode } = birthday;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const statusId = `${id}-status`;
  const storefront = variant === 'storefront';
  const hint = mode === 'subscription' ? getCheckoutExtrasCopy(language).birthdayNotStored : copy.fieldHint;

  return (
    <div className={storefront ? 'space-y-1.5 pt-1' : 'space-y-1.5'} data-birthday-field data-birthday-mode={mode}>
      <label htmlFor={id} className={storefront ? STOREFRONT_FIELD_LABEL : FIELD_LABEL}>
        {copy.fieldLabel}
        {storefront && ' *'}
      </label>
      <input
        id={id}
        name="pilotBirthDate"
        type="date"
        value={value}
        min={bounds?.min}
        max={bounds?.max}
        autoComplete="bday"
        dir="ltr"
        onChange={(event) => setValue(event.target.value)}
        onBlur={onBlur}
        aria-required="true"
        aria-invalid={errorText ? true : undefined}
        aria-describedby={[hintId, errorText ? errorId : undefined, statusId].filter(Boolean).join(' ')}
        className={`${storefront ? STOREFRONT_FIELD_CONTROL : FIELD_CONTROL} text-start`}
      />
      <p id={hintId} className="text-xs leading-relaxed text-slate-400">
        {hint}
      </p>
      {/* A polite live region that is always present: a date rejected on blur is announced when its text appears.
          On submit the page's booking error alert announces the same failure. */}
      <div aria-live="polite" data-birthday-error-region>
        {errorText && (
          <p id={errorId} className="text-xs font-semibold leading-relaxed text-red-300">
            {errorText}
          </p>
        )}
      </div>
      <BirthdayStatus id={statusId} birthday={birthday} />
      <BirthdayOfferLink />
    </div>
  );
}
