'use client';

import type { FlightAddon } from '@/types';
import type { AddonUpgradePreview } from '@/lib/scheduler/mission-upgrade-promo';
import { formatBookingTemplate, getUpgradePromoCopy } from '@/lib/booking/client';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

interface AddonCardProps {
  /** Unique prefix for the card's element ids (the page's `useId()`). */
  formId: string;
  addon: FlightAddon;
  isChecked: boolean;
  /** Adding it would overflow the selected departure's continuous window. */
  exceedsSlotWindow: boolean;
  /** True when 2 mission add-ons are already selected and this is an unselected 3rd mission add-on. */
  maxUpgradesReached?: boolean;
  /** Promotional tier upgrade preview computed by `previewAddonUpgrade`. */
  upgradePreview?: AddonUpgradePreview;
  /** True when an active promotional tier bump-up bundles this checked mission add-on. */
  isBundledInActivePromo?: boolean;
  maxSlotMinutes: number;
  /** Start time of the selected departure, for the "does not fit" message. */
  startTime: string;
  onToggle: () => void;
}

/** One cockpit upgrade: its name, price and minutes, promotional upgrade callout, and checkbox. */
export function AddonCard({
  formId,
  addon,
  isChecked,
  exceedsSlotWindow,
  maxUpgradesReached = false,
  upgradePreview,
  isBundledInActivePromo = false,
  maxSlotMinutes,
  startTime,
  onToggle,
}: AddonCardProps) {
  const { t, language } = useLanguage();
  const promoCopy = getUpgradePromoCopy(language);
  const addonMin = addon.durationMinutes || 0;
  const isMissionModule = addonMin > 0;
  const isDisabled = exceedsSlotWindow || maxUpgradesReached;
  const showPromoCallout =
    !isChecked &&
    !isDisabled &&
    isMissionModule &&
    Boolean(upgradePreview?.previewPromo.isPromoActive && upgradePreview.previewPromo.savingsIls > 0);
  const promo = upgradePreview?.previewPromo;

  return (
    <div
      onClick={() => !isDisabled && onToggle()}
      className={`scroll-mb-56 p-5 rounded-xl border transition-all flex flex-col justify-between ${
        isDisabled
          ? 'border-slate-800/50 bg-slate-950/40 cursor-not-allowed'
          : isChecked
          ? 'border-sky-400 bg-sky-500/10 shadow-glow cursor-pointer'
          : isMissionModule
          ? 'border-sky-500/30 bg-slate-900/80 hover:border-sky-400/60 cursor-pointer'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 cursor-pointer'
      }`}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <span id={`${formId}-addon-${addon.id}-name`} className="text-base font-bold text-white leading-snug">
            {addon.name}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {addonMin > 0 && (
              <span className="text-xs font-mono font-bold text-sky-300 px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30">
                +{addonMin} {t.booking.minutesShort}
              </span>
            )}
            {isChecked && isBundledInActivePromo ? (
              <span className="text-xs font-mono font-black text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                {promoCopy.includedInPromo}
              </span>
            ) : (
              <span className="text-sm font-mono font-black text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                +{formatCurrency(addon.priceIls)}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{addon.description}</p>
        {showPromoCallout && promo && (
          <div
            data-addon-promo-callout={addon.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-mono"
          >
            <span className="font-bold text-emerald-400">
              {promo.discountPercent >= 15
                ? promoCopy.percentOffTierBadge(promo.discountPercent, promo.effectiveDurationMinutes)
                : promoCopy.promoUpgradeBadge(promo.effectiveDurationMinutes)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="line-through text-slate-400">
                {formatCurrency(promo.strikeOutAnchorSubtotalIls)}
              </span>
              <span className="font-black text-emerald-400">
                {formatCurrency(promo.promoSubtotalIls)}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="pt-4 mt-2 border-t border-slate-800/70 flex items-center justify-between gap-2 text-xs font-mono">
        {maxUpgradesReached ? (
          <span className="text-amber-300 text-[11px] leading-snug">
            {promoCopy.maxUpgradesReached}
          </span>
        ) : exceedsSlotWindow ? (
          <span className="text-amber-400 text-[11px]">
            {formatBookingTemplate(t.booking.addonDoesNotFit, {
              minutes: addonMin,
              maxMinutes: maxSlotMinutes,
              startTime,
            })}
          </span>
        ) : (
          <span className={isChecked ? 'text-sky-400 font-bold' : 'text-slate-400'}>
            {isChecked
              ? `${t.booking.addedToFlight}${addonMin > 0 ? ` (+${addonMin} ${t.booking.minutesShort})` : ''}`
              : t.booking.clickToAdd}
          </span>
        )}
        <input
          id={`${formId}-addon-${addon.id}`}
          type="checkbox"
          aria-labelledby={`${formId}-addon-${addon.id}-name`}
          checked={isChecked}
          disabled={isDisabled}
          onChange={() => !isDisabled && onToggle()}
          onClick={(event) => event.stopPropagation()}
          className="scroll-mb-56 relative z-10 size-5 shrink-0 cursor-pointer accent-sky-500 rounded border-slate-700 text-sky-500 focus:ring-sky-400 disabled:opacity-40"
        />
      </div>
    </div>
  );
}
