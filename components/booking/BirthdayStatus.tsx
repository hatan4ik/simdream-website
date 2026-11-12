'use client';

import { Info } from 'lucide-react';
import { getBirthdayCheckoutCopy } from '@/lib/discounts/birthday';
import { getCheckoutExtrasCopy, type BirthdayStatusKind } from '@/lib/booking/client';
import { useLanguage } from '@/lib/i18n/language-context';
import { BirthdayBanner } from './BirthdayBanner';
import type { BookingBirthday } from './hooks';

/**
 * What the entered date means for this booking, directly under the date control. The region is a polite
 * live region that is always in the DOM, so a message that appears is announced. A neutral note explains
 * a date that earns nothing; the Wix-hosted checkout always carries its honest non-promise.
 */
export function BirthdayStatus({ id, birthday }: { id: string; birthday: BookingBirthday }) {
  const { language } = useLanguage();
  const copy = getBirthdayCheckoutCopy(language);
  const extras = getCheckoutExtrasCopy(language);
  const kind: BirthdayStatusKind = birthday.statusKind;

  const note =
    kind === 'not_eligible' ? copy.notEligible : kind === 'not_applicable' ? extras.birthdayNotApplicable : kind === 'wix_notice' ? extras.birthdayWixNotice : '';

  return (
    <div id={id} aria-live="polite" data-birthday-status-region={kind}>
      {kind === 'banner' && birthday.state.reason && <BirthdayBanner reason={birthday.state.reason} />}
      {note && (
        <p className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
          <span>{note}</span>
        </p>
      )}
    </div>
  );
}
