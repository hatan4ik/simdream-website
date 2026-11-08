import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clampToBookingHorizon, maxBookableDate } from '@/lib/scheduler/booking-horizon';
import { addDaysToYmd } from '@/lib/utils';
import {
  calendarNavigationLabels,
  formatCalendarDate,
} from '@/lib/i18n/calendar-presentation';
import type { Language } from '@/lib/i18n/translations';

interface BookingWeekPagerProps {
  selectedDate: string;
  calendarTodayYmd: string;
  weekStartDate: string;
  weekEndDate: string;
  language: Language;
  isRTL: boolean;
  onSelectDate: (date: string) => void;
}

/**
 * Shared week paging for both booking interfaces. The selected date remains the
 * single source of truth, so changing views cannot create a second calendar state.
 * Paging runs from today to the one-year booking horizon; "Today" appears once the
 * visible week no longer contains it.
 */
export function BookingWeekPager({
  selectedDate,
  calendarTodayYmd,
  weekStartDate,
  weekEndDate,
  language,
  isRTL,
  onSelectDate,
}: BookingWeekPagerProps) {
  const previousWeekDate = addDaysToYmd(selectedDate, -7);
  const canNavigateToPreviousWeek = previousWeekDate >= calendarTodayYmd;
  const maxDate = maxBookableDate(calendarTodayYmd);
  const canNavigateToNextWeek = maxDate === '' || weekEndDate < maxDate;
  const todayOutsideWeek =
    calendarTodayYmd !== '' && (calendarTodayYmd < weekStartDate || calendarTodayYmd > weekEndDate);
  const copy = calendarNavigationLabels(language);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          data-calendar-previous-week
          aria-label={copy.previousWeek}
          disabled={!canNavigateToPreviousWeek}
          onClick={() => onSelectDate(previousWeekDate)}
          className="min-w-[48px] min-h-[48px] p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 flex items-center justify-center touch-manipulation cursor-pointer active:scale-95 transition-all"
        >
          <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
        <span className="text-xs sm:text-sm font-bold text-white text-center">
          {formatCalendarDate(weekStartDate, language)} – {formatCalendarDate(weekEndDate, language)}
        </span>
        <button
          type="button"
          data-calendar-next-week
          aria-label={copy.nextWeek}
          disabled={!canNavigateToNextWeek}
          onClick={() => onSelectDate(clampToBookingHorizon(addDaysToYmd(selectedDate, 7), calendarTodayYmd))}
          className="min-w-[48px] min-h-[48px] p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 flex items-center justify-center touch-manipulation cursor-pointer active:scale-95 transition-all"
        >
          <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {todayOutsideWeek && (
        <div className="flex justify-center">
          <Button type="button" variant="secondary" data-calendar-today onClick={() => onSelectDate(calendarTodayYmd)}>
            {copy.today}
          </Button>
        </div>
      )}
      {!canNavigateToNextWeek && (
        <p data-calendar-horizon-note className="text-center text-xs text-slate-400">
          {copy.horizonNote}
        </p>
      )}
    </div>
  );
}
