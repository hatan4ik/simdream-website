'use client';

import type { ReactNode } from 'react';
import { Check, Plus } from 'lucide-react';
import type { FlightAddon } from '@/types';
import type { AddonUpgradePreview } from '@/lib/scheduler/mission-upgrade-promo';
import type { UpgradePromoCopy } from '@/lib/booking/client';
import { formatCurrency } from '@/lib/utils';

interface StorefrontAddonCardProps {
  addon: FlightAddon;
  icon: ReactNode;
  isWorldBundle: boolean;
  hasSelectedAddons: boolean;
  preview: AddonUpgradePreview;
  isBundledInActivePromo: boolean;
  maxAvailableMinutes: number;
  selectedStartTime?: string;
  promoCopy: UpgradePromoCopy;
  onToggle: () => void;
}

/** Express Shop add-on marketplace card with promotional tier bump-up callout and max-2 cap guard. */
export function StorefrontAddonCard({
  addon,
  icon,
  isWorldBundle,
  hasSelectedAddons,
  preview,
  isBundledInActivePromo,
  maxAvailableMinutes,
  selectedStartTime,
  promoCopy,
  onToggle,
}: StorefrontAddonCardProps) {
  const { isChecked, fitsSlot, wouldExceedCap, previewPromo } = preview;
  const addonMin = addon.durationMinutes;
  const isDisabled = !fitsSlot || wouldExceedCap;
  const showPromoCallout =
    !isChecked &&
    !isDisabled &&
    preview.isMission &&
    previewPromo.isPromoActive &&
    previewPromo.savingsIls > 0;

  return (
    <div
      data-addon-card={addon.id}
      data-addon-selected={isChecked ? 'true' : 'false'}
      data-addon-deemphasized={!isChecked && hasSelectedAddons ? 'true' : 'false'}
      className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col justify-between ${
        isDisabled
          ? 'border-slate-800/50 bg-slate-950/40'
          : isChecked
          ? 'border-amber-400 bg-amber-500/10 shadow-lg ring-1 ring-amber-400/40'
          : hasSelectedAddons
          ? 'border-slate-800/70 bg-slate-950/55 opacity-45 hover:opacity-80 hover:border-slate-700'
          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
      }`}
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              {isWorldBundle
                ? '3-AIRPORT WORLD TOUR'
                : addonMin > 0
                ? 'COCKPIT MISSION MODULE'
                : 'GUEST EXPERIENCE'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {addonMin > 0 && (
              <span className="text-xs font-mono font-bold text-sky-300 px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30">
                +{addonMin} min
              </span>
            )}
            {isChecked && isBundledInActivePromo ? (
              <span className="text-xs font-mono font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                {promoCopy.includedInPromo}
              </span>
            ) : (
              <span className="text-sm font-mono font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                +{formatCurrency(addon.priceIls)}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{addon.name}</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{addon.description}</p>

        {showPromoCallout && (
          <div
            data-addon-promo-callout={addon.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-mono"
          >
            <span className="font-bold text-emerald-400">
              {previewPromo.discountPercent >= 15
                ? promoCopy.percentOffTierBadge(
                    previewPromo.discountPercent,
                    previewPromo.effectiveDurationMinutes
                  )
                : promoCopy.promoUpgradeBadge(previewPromo.effectiveDurationMinutes)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="line-through text-slate-400">
                {formatCurrency(previewPromo.strikeOutAnchorSubtotalIls)}
              </span>
              <span className="font-black text-emerald-400">
                {formatCurrency(previewPromo.promoSubtotalIls)}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
        {wouldExceedCap ? (
          <span className="text-[11px] font-mono text-amber-300 leading-snug">
            {promoCopy.maxUpgradesReached}
          </span>
        ) : !fitsSlot ? (
          <span className="text-[11px] font-mono text-amber-400">
            Exceeds {maxAvailableMinutes}m slot window at {selectedStartTime}
          </span>
        ) : (
          <span className="text-[11px] font-mono text-slate-400">
            {addonMin > 0 ? `Extends flight by +${addonMin}m` : 'Included during session'}
          </span>
        )}

        <button
          type="button"
          disabled={isDisabled}
          onClick={onToggle}
          aria-pressed={isChecked}
          className={`min-h-11 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            isDisabled
              ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
              : isChecked
              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              : 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-sm'
          }`}
        >
          {isChecked ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Added to Flight</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Flight</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
