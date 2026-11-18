'use client';

import { Clock } from 'lucide-react';
import { getUpgradePromoCopy, type SlotAdjustment } from '@/lib/booking/client';
import { useLanguage } from '@/lib/i18n/language-context';

interface SlotAdjustmentBannerProps {
  adjustment: SlotAdjustment | null;
  onChangeTime?: () => void;
}

/**
 * Announces when switching to an upgraded duration's schedule moved the customer's departure to the
 * nearest available start, with a direct action to pick another time.
 */
export function SlotAdjustmentBanner({ adjustment, onChangeTime }: SlotAdjustmentBannerProps) {
  const { language } = useLanguage();
  if (!adjustment) return null;
  const copy = getUpgradePromoCopy(language);

  return (
    <div
      role="status"
      aria-live="polite"
      data-slot-adjustment-banner="true"
      className="rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Clock className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
        <p className="text-xs sm:text-sm text-slate-100 leading-snug">
          {copy.slotAdjustedNotice(adjustment.fromStartTime, adjustment.toStartTime, adjustment.durationMinutes)}
        </p>
      </div>
      {onChangeTime && (
        <button
          type="button"
          onClick={onChangeTime}
          className="shrink-0 text-xs font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-4 cursor-pointer"
        >
          {copy.changeTimeAction}
        </button>
      )}
    </div>
  );
}
