'use client';

import type { ReactNode } from 'react';
import type { PilotExperienceLevel } from '@/types';
import { useLanguage } from '@/lib/i18n/language-context';
import type { PilotDetails } from './hooks';

interface PilotManifestFormProps {
  /** Unique prefix for the fields' element ids (the page's `useId()`). */
  formId: string;
  pilot: PilotDetails;
  /** A Wix subscription redemption collects no pilot details here; Wix verifies the member. */
  isWixSubscriptionRedemption: boolean;
  experienceLevel: PilotExperienceLevel;
  onChangeExperienceLevel: (level: PilotExperienceLevel) => void;
  /**
   * SEAM for extra pilot fields (for example a birthday). Rendered inside the form after the special
   * requests field, in the same column. Fields added here are validated through
   * `extraValidation` and sent through `extraPayload` of `useBookingCheckout`.
   */
  extraFields?: ReactNode;
}

const FIELD_LABEL = 'text-xs font-mono uppercase text-slate-400 font-semibold';
const FIELD_CONTROL =
  'w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500';

/**
 * The left column of the final step: the "Pilot in Command Details" heading, the pilot's name,
 * email and phone, the experience level and special requests. Pure presentation over the
 * `usePilotDetails` state; the page owns every value.
 */
export function PilotManifestForm({
  formId,
  pilot,
  isWixSubscriptionRedemption,
  experienceLevel,
  onChangeExperienceLevel,
  extraFields,
}: PilotManifestFormProps) {
  const { t } = useLanguage();
  const { pilotName, setPilotName, pilotEmail, setPilotEmail, pilotPhone, setPilotPhone, notes, setNotes } = pilot;

  return (
    <div className="lg:col-span-7 space-y-6">
      <div className="space-y-1 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-white">{t.booking.step4Title}</h1>
        <p className="text-xs text-slate-400">
          {t.booking.step4Subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor={`${formId}-pilot-name`} className={FIELD_LABEL}>
            {t.booking.pilotName}
          </label>
          <input
            id={`${formId}-pilot-name`}
            type="text"
            required={!isWixSubscriptionRedemption}
            value={pilotName}
            onChange={(e) => setPilotName(e.target.value)}
            placeholder={t.booking.pilotNamePlaceholder}
            className={FIELD_CONTROL}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-pilot-email`} className={FIELD_LABEL}>
            {t.booking.pilotEmail}
          </label>
          <input
            id={`${formId}-pilot-email`}
            type="email"
            required={!isWixSubscriptionRedemption}
            value={pilotEmail}
            onChange={(e) => setPilotEmail(e.target.value)}
            placeholder="pilot@example.com"
            className={FIELD_CONTROL}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-pilot-phone`} className={FIELD_LABEL}>
            {t.booking.pilotPhone}
          </label>
          <input
            id={`${formId}-pilot-phone`}
            type="tel"
            required={!isWixSubscriptionRedemption}
            value={pilotPhone}
            onChange={(e) => setPilotPhone(e.target.value)}
            placeholder="+972-54-123-4567"
            dir="ltr"
            className={`${FIELD_CONTROL} text-left rtl:text-right`}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${formId}-pilot-experience`} className={FIELD_LABEL}>
          {t.booking.pilotExperience}
        </label>
        <select
          id={`${formId}-pilot-experience`}
          value={experienceLevel}
          onChange={(e) => onChangeExperienceLevel(e.target.value as PilotExperienceLevel)}
          className={FIELD_CONTROL}
        >
          <option value="beginner">{t.experienceLevels.beginner}</option>
          <option value="enthusiast">{t.experienceLevels.enthusiast}</option>
          <option value="student_pilot">{t.experienceLevels.student}</option>
          <option value="atpl">{t.experienceLevels.commercial}</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${formId}-special-requests`} className={FIELD_LABEL}>
          {t.booking.specialRequests}
        </label>
        <textarea
          id={`${formId}-special-requests`}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.booking.specialRequestsPlaceholder}
          className={FIELD_CONTROL}
        />
      </div>

      {extraFields}
    </div>
  );
}
