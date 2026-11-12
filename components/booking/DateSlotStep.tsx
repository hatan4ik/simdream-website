'use client';

import { ChevronRight } from 'lucide-react';
import type { MissionManifestCalculation, SimulatorPackage } from '@/types';
import { Button } from '@/components/ui/Button';
import { KantorovichCalendarScheduler } from '@/components/scheduler/KantorovichCalendarScheduler';
import { formatBookingTemplate } from '@/lib/booking/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import type { BookingSchedule } from './hooks';

interface DateSlotStepProps {
  schedule: BookingSchedule;
  selectedPackage: SimulatorPackage;
  /** The packages offered for this kind of booking (PRO tiers, Fear of Flying, or recreational). */
  packages: SimulatorPackage[];
  onSelectPackage: (pkg: SimulatorPackage) => void;
  manifest: MissionManifestCalculation;
  isNoiseFreeBooking: boolean;
  onContinue: () => void;
}

/** STEP 1: Kantorovich calendar, duration and smart departure-slot scheduler, with the sticky action bar. */
export function DateSlotStep({
  schedule,
  selectedPackage,
  packages,
  onSelectPackage,
  manifest,
  isNoiseFreeBooking,
  onContinue,
}: DateSlotStepProps) {
  const { t, isRTL } = useLanguage();
  const { selectedSlot, selectedDate } = schedule;
  const {
    baseDurationMinutes: baseDuration,
    addonsDurationMinutes: addonsDuration,
    totalDurationMinutes,
    effectiveEndTime,
    subtotalIls: subtotal,
  } = manifest;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-white">{t.booking.step2Title}</h1>
        <p className="text-slate-400 text-sm">
          {t.booking.step2Subtitle}
        </p>
      </div>

      <KantorovichCalendarScheduler
        selectedDate={selectedDate}
        calendarTodayYmd={schedule.calendarTodayYmd}
        onSelectDate={schedule.setSelectedDate}
        selectedPackage={selectedPackage}
        packages={packages}
        onSelectPackage={onSelectPackage}
        slots={schedule.missionCompatibleSlots}
        selectedSlot={selectedSlot}
        onSelectSlot={schedule.setSelectedSlot}
        efficiencyReport={schedule.efficiencyReport}
        durationAvailability={schedule.durationAvailability}
        loading={schedule.loadingSlots}
        slotsLoadFailed={schedule.slotsLoadFailed}
        onRetrySlots={schedule.reloadSlots}
      />

      {/* Sticky Mobile-First Action Bar */}
      <div className="sticky bottom-safe-area-3 z-30 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          {selectedSlot && selectedSlot.available ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-white truncate">
                {totalDurationMinutes} {t.booking.minutesShort}
                {addonsDuration > 0
                  ? ` (${formatBookingTemplate(t.booking.baseAndAddons, { base: baseDuration, addons: addonsDuration })})`
                  : ''}{' '}
                • {formatDate(selectedDate)}
              </span>
              <span className="text-xs sm:text-sm font-mono font-black text-sky-400" dir="ltr">
                {selectedSlot.startTime}–{effectiveEndTime || selectedSlot.endTime}
              </span>
              <span className="text-xs sm:text-sm font-mono font-black text-emerald-400">
                ({formatCurrency(subtotal)})
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">{t.booking.errorSelectSlot}</span>
          )}
        </div>

        <Button
          size="lg"
          disabled={!selectedSlot || !selectedSlot.available}
          onClick={onContinue}
          className="w-full sm:w-auto sm:shrink-0"
        >
          <span>{isNoiseFreeBooking ? t.booking.continueToPilot : t.booking.continueToAddons}</span>
          <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
