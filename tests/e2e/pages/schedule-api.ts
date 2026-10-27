import type { APIRequestContext } from '@playwright/test';
import type { Booking, FlightSlot, GiftVoucher } from '@/types';
import { expect } from '../../support/e2e';
import { adminHeaders } from '../../support/http';
import { israelDate, weekdayOf } from './format';

export type DurationAvailability = Record<string, { availableCount: number; minPriceIls: number }>;

export interface DaySchedule {
  slots: FlightSlot[];
  durationAvailability: DurationAvailability;
}

export interface OpenSlot {
  date: string;
  slot: FlightSlot;
}

/**
 * The calendar exposes upcoming dates in its month grid. Journeys stay near the current month so a date chosen
 * just before midnight is still on the ribbon when the browser renders it.
 */
const LAST_RIBBON_OFFSET = 12;

/**
 * Reads live availability from the running server. The browser-test server is
 * shared and its clock is real, so journeys discover dates and slots here
 * instead of hardcoding them.
 */
export class ScheduleApi {
  constructor(private readonly request: APIRequestContext) {}

  async day(date: string, duration: number): Promise<DaySchedule> {
    const response = await this.request.get(
      `/api/slots?date=${date}&duration=${duration}&includeEfficiency=true`
    );
    expect(response.status(), `GET /api/slots for ${date} (${duration}m)`).toBe(200);
    return (await response.json()) as DaySchedule;
  }

  /**
   * First ribbon date with an open slot whose window fits `minWindowMinutes`.
   * Starts the day after tomorrow by default: tomorrow is /book's preselected
   * day, and re-selecting it would not exercise the date picker.
   */
  async findOpenSlot(options: {
    duration: number;
    minWindowMinutes?: number;
    weekdays?: readonly number[];
    fromOffset?: number;
  }): Promise<OpenSlot> {
    const { duration, minWindowMinutes = duration, weekdays, fromOffset = 2 } = options;
    for (let offset = fromOffset; offset <= LAST_RIBBON_OFFSET; offset++) {
      const date = israelDate(offset);
      if (weekdays && !weekdays.includes(weekdayOf(date))) continue;
      const { slots } = await this.day(date, duration);
      const slot = slots.find(
        (candidate) => candidate.available && (candidate.maxAvailableMinutes ?? duration) >= minWindowMinutes
      );
      if (slot) return { date, slot };
    }
    throw new Error(`No open ${duration}m slot with a ${minWindowMinutes}m window inside the date ribbon.`);
  }

  async adminBookings(): Promise<Booking[]> {
    const response = await this.request.get('/api/bookings', { headers: adminHeaders() });
    expect(response.status(), 'GET /api/bookings as admin').toBe(200);
    return (await response.json()) as Booking[];
  }

  async adminVouchers(): Promise<GiftVoucher[]> {
    const response = await this.request.get('/api/vouchers', { headers: adminHeaders() });
    expect(response.status(), 'GET /api/vouchers as admin').toBe(200);
    return (await response.json()) as GiftVoucher[];
  }
}
