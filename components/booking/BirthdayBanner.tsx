'use client';

import { Cake } from 'lucide-react';
import { getBirthdayBannerText, type BirthdayReason } from '@/lib/discounts/birthday';
import { useLanguage } from '@/lib/i18n/language-context';

/**
 * The congratulations shown while the birthday discount applies: the slogan and one sentence saying the
 * discount is already in the total. It never appears on a checkout path that cannot apply the discount.
 */
export function BirthdayBanner({ reason }: { reason: BirthdayReason }) {
  const { language } = useLanguage();
  const text = getBirthdayBannerText(language, reason);
  if (!text) return null;
  return (
    <div
      data-birthday-banner
      className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5"
    >
      <Cake className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-bold text-emerald-300">{text.title}</p>
        <p className="text-xs leading-relaxed text-slate-200">{text.body}</p>
      </div>
    </div>
  );
}
