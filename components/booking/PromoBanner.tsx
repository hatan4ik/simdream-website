'use client';

import { Sparkles } from 'lucide-react';
import type { MissionUpgradePromo } from '@/types';
import { getUpgradePromoCopy } from '@/lib/booking/client';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatCurrency } from '@/lib/utils';

interface PromoBannerProps {
  promo: MissionUpgradePromo;
  compact?: boolean;
}

/** Shared promotional tier bump-up callout for Order Summary and Express Shop Buy Box. */
export function PromoBanner({ promo, compact = false }: PromoBannerProps) {
  const { language } = useLanguage();
  if (!promo.isPromoActive) return null;
  const copy = getUpgradePromoCopy(language);
  const title =
    promo.effectiveDurationMinutes === 120 && promo.discountPercent >= 15
      ? copy.grandOdysseyBanner(promo.discountPercent)
      : copy.promoUpgradedTitle(promo.effectiveDurationMinutes);

  return (
    <div
      data-upgrade-promo-banner="true"
      className={`rounded-xl border border-emerald-500/35 bg-emerald-500/10 ${
        compact ? 'px-3 py-2 space-y-0.5' : 'px-3.5 py-2.5 space-y-1'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>{title}</span>
        </span>
        {promo.savingsIls > 0 && (
          <span className="text-[11px] font-mono font-bold text-emerald-300 shrink-0">
            {copy.saveAmount(formatCurrency(promo.savingsIls))}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-300 leading-snug">
        {copy.promoBundledNote(promo.missionAddonCount, promo.effectiveDurationMinutes)}
      </p>
    </div>
  );
}
