import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookLayout from '@/app/(public)/book/layout';
import { ServerIsraelTodayProvider, useServerIsraelToday } from '@/components/booking/ServerIsraelToday';
import { useBookingSchedule, type BookingSchedule } from '@/components/booking/hooks/use-booking-schedule';
import { KantorovichCalendarScheduler } from '@/components/scheduler/KantorovichCalendarScheduler';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { getLocalizedPackages } from '@/lib/i18n/translations';
import { useClientValue } from '@/lib/ui/use-client-value';
import type { SimulatorPackage } from '@/types';

// `/book` used to serve only a placeholder: the calendar waited for the browser's clock, so nothing
// of the booking frame painted before every script had loaded. The server now supplies Israel's date
// for the first HTML, and the browser re-reads its own clock after hydration.

const connection = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('next/server', () => ({ connection }));

const PACKAGES = getLocalizedPackages('he');
const CAPTAIN_60 = PACKAGES.find((pkg) => pkg.id === 'pkg-captain-60') as SimulatorPackage;

function serverRenderedSchedule(serverToday: string | null): BookingSchedule {
  let captured: BookingSchedule | undefined;
  function Probe() {
    captured = useBookingSchedule({ selectedPackage: CAPTAIN_60, requiredMissionMinutes: CAPTAIN_60.durationMinutes });
    return null;
  }
  const probe = React.createElement(Probe);
  renderToStaticMarkup(
    serverToday === null ? probe : React.createElement(ServerIsraelTodayProvider, { value: serverToday, children: probe })
  );
  if (!captured) throw new Error('the schedule hook did not render');
  return captured;
}

afterEach(() => {
  vi.useRealTimers();
  connection.mockClear();
});

describe('useClientValue on the server', () => {
  function serverRendered(serverValue?: string): string {
    function Probe() {
      const value = serverValue === undefined ? useClientValue(() => 'browser') : useClientValue(() => 'browser', serverValue);
      return React.createElement('i', null, String(value));
    }
    return renderToStaticMarkup(React.createElement(Probe));
  }

  it('renders the value the server supplied', () => {
    expect(serverRendered('2026-11-27')).toBe('<i>2026-11-27</i>');
  });

  it('still renders nothing when the server supplied no value', () => {
    expect(serverRendered()).toBe('<i>null</i>');
  });
});

describe('the booking schedule in the first HTML', () => {
  it('opens on the day after the Israel date the server supplied', () => {
    const schedule = serverRenderedSchedule('2026-11-27');
    expect(schedule.browserIsraelToday).toBe('2026-11-27');
    expect(schedule.calendarTodayYmd).toBe('2026-11-27');
    expect(schedule.selectedDate).toBe('2026-11-28');
  });

  it('crosses a year end', () => {
    expect(serverRenderedSchedule('2026-12-31').selectedDate).toBe('2027-01-01');
  });

  it('reports departures as loading until the first answer, and never as an empty day', () => {
    const schedule = serverRenderedSchedule('2026-11-27');
    expect(schedule.loadingSlots).toBe(true);
    // The page-level state keeps its own vocabulary: nothing has been requested yet.
    expect(schedule.slotsState).toBe('idle');
  });

  it('keeps the placeholder path when no server date is available', () => {
    const schedule = serverRenderedSchedule(null);
    expect(schedule.browserIsraelToday).toBeNull();
    expect(schedule.selectedDate).toBe('');
  });
});

describe('the calendar while departures load', () => {
  function calendarHtml(loading: boolean): string {
    return renderToStaticMarkup(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'he', children: null },
        React.createElement(KantorovichCalendarScheduler, {
          selectedDate: '2026-11-28',
          calendarTodayYmd: '2026-11-27',
          onSelectDate: () => undefined,
          selectedPackage: CAPTAIN_60,
          packages: PACKAGES,
          onSelectPackage: () => undefined,
          slots: [],
          selectedSlot: null,
          onSelectSlot: () => undefined,
          efficiencyReport: null,
          durationAvailability: {},
          loading,
        })
      )
    );
  }

  it('shows the calendar, the durations and a loading grid, with no claim about availability', () => {
    const html = calendarHtml(true);
    expect(html).toContain('data-calendar-date="2026-11-28"');
    expect(html).toContain('data-booking-duration="60"');
    expect(html).toContain('animate-pulse');
    expect(html).not.toContain('אין שעות פנויות למשך טיסה זה בתאריך שנבחר.');
    expect(html).not.toContain('0 שעות פנויות');
    expect(html).not.toContain('0 מקומות היום');
  });

  it('still says so when a loaded day has no departures', () => {
    const html = calendarHtml(false);
    expect(html).toContain('אין שעות פנויות למשך טיסה זה בתאריך שנבחר.');
    expect(html).toContain('0 שעות פנויות');
  });
});

describe('the /book layout', () => {
  function Probe() {
    return React.createElement('i', null, String(useServerIsraelToday()));
  }

  it('reads Israel\'s date for each request, never once at build time', async () => {
    vi.useFakeTimers();
    // 23:59 on 27 November in Israel (UTC+2 in winter).
    vi.setSystemTime(new Date('2026-11-27T21:59:00Z'));
    const beforeMidnight = renderToStaticMarkup(await BookLayout({ children: React.createElement(Probe) }));
    // 00:01 on 28 November in Israel.
    vi.setSystemTime(new Date('2026-11-27T22:01:00Z'));
    const afterMidnight = renderToStaticMarkup(await BookLayout({ children: React.createElement(Probe) }));

    expect(beforeMidnight).toBe('<i>2026-11-27</i>');
    expect(afterMidnight).toBe('<i>2026-11-28</i>');
    expect(connection).toHaveBeenCalledTimes(2);
  });
});
