'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { FlightAddon, FlightSlot, MissionManifestCalculation, SimulatorPackage } from '@/types';
import { Button } from '@/components/ui/Button';
import { formatBookingTemplate, getUpgradePromoCopy, type SlotAdjustment } from '@/lib/booking/client';
import { previewAddonUpgrade, type DurationAvailabilitySummary } from '@/lib/scheduler/mission-upgrade-promo';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { AddonCard } from './AddonCard';
import { SlotAdjustmentBanner } from './SlotAdjustmentBanner';

interface AddonsStepProps {
  /** Unique prefix for element ids (the page's `useId()`). */
  formId: string;
  activePackage: SimulatorPackage;
  addons: FlightAddon[];
  selectedAddonIds: string[];
  selectedSlot: FlightSlot | null;
  slotAdjustment?: SlotAdjustment | null;
  durationAvailability?: DurationAvailabilitySummary;
  manifest: MissionManifestCalculation;
  onToggleAddon: (addonId: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

/** STEP 2: flight add-ons. Skipped in noise-free PRO and Fear of Flying sessions. */
export function AddonsStep({
  formId,
  activePackage,
  addons,
  selectedAddonIds,
  selectedSlot,
  slotAdjustment = null,
  durationAvailability,
  manifest,
  onToggleAddon,
  onBack,
  onContinue,
}: AddonsStepProps) {
  const { t, language, isRTL } = useLanguage();
  const promoCopy = getUpgradePromoCopy(language);
  const {
    baseDurationMinutes: baseDuration,
    addonsDurationMinutes: addonsDuration,
    totalDurationMinutes,
    effectiveEndTime,
    maxAvailableMinutes: maxSlotMinutes,
    subtotalIls: subtotal,
    upgradePromo,
  } = manifest;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-white">{t.booking.step3Title}</h1>
        <p className="text-slate-400 text-sm">
          {t.booking.step3Subtitle}
        </p>
      </div>

      <SlotAdjustmentBanner adjustment={slotAdjustment} onChangeTime={onBack} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {addons.map((addon) => {
          const preview = previewAddonUpgrade({
            pkg: activePackage,
            isPrimeTime: selectedSlot?.isPrimeTime,
            selectedAddonIds,
            candidateAddon: addon,
            availableAddons: addons,
            maxSlotMinutes,
            durationAvailability,
          });
          const isChecked = preview.isChecked;
          const exceedsSlotWindow = !isChecked && !preview.fitsSlot;
          const isBundledInActivePromo = Boolean(
            upgradePromo?.isPromoActive && upgradePromo.bundledMissionAddonIds.includes(addon.id)
          );

          return (
            <AddonCard
              key={addon.id}
              formId={formId}
              addon={addon}
              isChecked={isChecked}
              exceedsSlotWindow={exceedsSlotWindow}
              maxUpgradesReached={preview.wouldExceedCap}
              upgradePreview={preview}
              isBundledInActivePromo={isBundledInActivePromo}
              maxSlotMinutes={maxSlotMinutes}
              startTime={selectedSlot?.startTime ?? ''}
              onToggle={() => onToggleAddon(addon.id)}
            />
          );
        })}
      </div>

      <div className="sticky bottom-safe-area-3 z-30 p-3.5 sm:p-4 rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-2xl flex flex-wrap justify-between items-center gap-3">
        <Button variant="secondary" onClick={onBack}>
          <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t.booking.back}</span>
        </Button>

        <div className="flex items-center gap-4">
          <div className="text-right rtl:text-left">
            <div className="text-[11px] font-mono text-slate-300 flex flex-wrap items-center justify-end gap-1.5">
              <span className="text-sky-400 font-bold">
                {totalDurationMinutes} {t.booking.minutesShort}
              </span>
              {upgradePromo?.isPromoActive ? (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  {promoCopy.promoFooterBadge(upgradePromo.effectiveDurationMinutes, upgradePromo.discountPercent)}
                </span>
              ) : addonsDuration > 0 ? (
                <span className="text-slate-400">
                  ({formatBookingTemplate(t.booking.baseAndAddons, { base: baseDuration, addons: addonsDuration })})
                </span>
              ) : null}
              {selectedSlot && (
                <span className="text-slate-400" dir="ltr">
                  {' '}• {selectedSlot.startTime}–{effectiveEndTime}
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-end gap-2 font-mono">
              {upgradePromo?.isPromoActive && upgradePromo.savingsIls > 0 && (
                <span className="text-xs line-through text-slate-400">
                  {formatCurrency(upgradePromo.strikeOutAnchorSubtotalIls)}
                </span>
              )}
              <span className="text-sm sm:text-base font-black text-emerald-400">
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>

          <Button size="lg" onClick={onContinue} className="font-bold">
            <span>{t.booking.continueToPilot}</span>
            <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
