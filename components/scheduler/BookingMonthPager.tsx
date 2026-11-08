import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { calendarNavigationLabels, formatCalendarMonth } from '@/lib/i18n/calendar-presentation';
import { maxBookableDate } from '@/lib/scheduler/booking-horizon';
import type { Language } from '@/lib/i18n/translations';

interface BookingMonthPagerProps {
  viewMonthDate: Date;
  selectedDate: string;
  calendarTodayYmd: string;
  language: Language;
  isRTL: boolean;
  previousLabel: string;
  nextLabel: string;
  onChangeMonth: (month: Date) => void;
  onToday: () => void;
}

const monthNumber = (year: number, monthIndex: number) => year * 12 + monthIndex;
const monthNumberOfYmd = (ymd: string) => monthNumber(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1);

/**
 * Shared month paging for both booking interfaces. It runs from the current month to the month of
 * the one-year booking horizon, and "Today" brings the visitor back to today's date from anywhere
 * else on the calendar.
 */
export function BookingMonthPager({
  viewMonthDate,
  selectedDate,
  calendarTodayYmd,
  language,
  isRTL,
  previousLabel,
  nextLabel,
  onChangeMonth,
  onToday,
}: BookingMonthPagerProps) {
  const year = viewMonthDate.getFullYear();
  const month = viewMonthDate.getMonth();
  const viewMonthNumber = monthNumber(year, month);
  const maxDate = maxBookableDate(calendarTodayYmd);
  const todayKnown = calendarTodayYmd !== '';
  const canNavigateToPreviousMonth = !todayKnown || viewMonthNumber > monthNumberOfYmd(calendarTodayYmd);
  const canNavigateToNextMonth = maxDate === '' || viewMonthNumber < monthNumberOfYmd(maxDate);
  const awayFromToday =
    todayKnown && (selectedDate !== calendarTodayYmd || viewMonthNumber !== monthNumberOfYmd(calendarTodayYmd));
  const copy = calendarNavigationLabels(language);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          data-calendar-previous-month
          aria-label={previousLabel}
          disabled={!canNavigateToPreviousMonth}
          onClick={() => onChangeMonth(new Date(year, month - 1, 1))}
          className="min-w-[48px] min-h-[48px] p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 flex items-center justify-center touch-manipulation cursor-pointer active:scale-95 transition-all"
        >
          <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
        <span className="text-sm sm:text-base font-bold text-white text-center">
          {formatCalendarMonth(viewMonthDate, language)}
        </span>
        <button
          type="button"
          data-calendar-next-month
          aria-label={nextLabel}
          disabled={!canNavigateToNextMonth}
          onClick={() => onChangeMonth(new Date(year, month + 1, 1))}
          className="min-w-[48px] min-h-[48px] p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 flex items-center justify-center touch-manipulation cursor-pointer active:scale-95 transition-all"
        >
          <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {awayFromToday && (
        <div className="flex justify-center">
          <Button type="button" variant="secondary" data-calendar-today onClick={onToday}>
            {copy.today}
          </Button>
        </div>
      )}
      {!canNavigateToNextMonth && (
        <p data-calendar-horizon-note className="text-center text-xs text-slate-400">
          {copy.horizonNote}
        </p>
      )}
    </div>
  );
}
