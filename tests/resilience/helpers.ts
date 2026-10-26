import type { Page, Request, Route } from '@playwright/test';
import type { FlightSlot } from '../../types';
import { evaluateDailyEfficiency, generateKantorovichSlots } from '../../lib/scheduler/kantorovich-engine';
import { blockThirdPartyRequests, expect, preferLanguage } from '../support/e2e';

export const PAYMENTS_DISABLED_MESSAGE = 'Online payments are temporarily unavailable. Please contact us to book.';
export const SOLD_OUT_HEADING = /No open runway slots/;
/** Raw browser network errors (Chromium, Firefox, WebKit) that customers should never see verbatim. */
export const RAW_NETWORK_ERROR = /Failed to fetch|NetworkError|Load failed/;

const DURATIONS = [20, 30, 45, 60, 90, 120];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const isSlotsApi = (url: URL) => url.pathname === '/api/slots';
export const isCheckoutApi = (url: URL) => url.pathname === '/api/checkout';

export function requestedDate(request: Request): string {
  return new URL(request.url()).searchParams.get('date') ?? '';
}

/**
 * A realistic /api/slots body for whatever date and duration the page asks for,
 * built by the real scheduler over an empty calendar. The shared server's
 * inventory changes as other suites run, so browser tests that need an open
 * departure use this instead of live availability.
 */
export function slotsPayload(requestUrl: string, transform: (slots: FlightSlot[]) => FlightSlot[] = (slots) => slots) {
  const url = new URL(requestUrl);
  const date = url.searchParams.get('date') ?? '';
  const duration = Number(url.searchParams.get('duration') ?? 60);
  const durationAvailability = Object.fromEntries(
    DURATIONS.map((candidate) => {
      const open = generateKantorovichSlots(date, candidate, []).filter((slot) => slot.available);
      return [
        candidate,
        { availableCount: open.length, minPriceIls: open.length ? Math.min(...open.map((slot) => slot.dynamicPriceIls)) : 0 },
      ];
    })
  );
  return {
    slots: transform(generateKantorovichSlots(date, duration, [])),
    efficiency: evaluateDailyEfficiency(date, []),
    durationAvailability,
  };
}

export function fulfillOpenSlots(route: Route): Promise<void> {
  return route.fulfill({ json: slotsPayload(route.request().url()) });
}

export function openStartTimes(requestUrl: string): string[] {
  return slotsPayload(requestUrl)
    .slots.filter((slot) => slot.available)
    .map((slot) => slot.startTime);
}

export interface Gate {
  promise: Promise<void>;
  open: () => void;
}

/** A latch for holding an intercepted request until the test releases it. */
export function gate(): Gate {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

/** English UI, no third-party traffic, and /api/slots answered by `slots`. */
export async function openBookingPage(
  page: Page,
  baseURL: string | undefined,
  slots: (route: Route) => Promise<void> = fulfillOpenSlots
): Promise<void> {
  if (!baseURL) throw new Error('baseURL is required');
  await blockThirdPartyRequests(page, baseURL);
  await preferLanguage(page, 'en');
  await page.route(isSlotsApi, slots);
  await page.goto('/book');
}

export function slotButton(page: Page, startTime: string) {
  return page.getByRole('button', { name: new RegExp(`^${startTime}\\b`) });
}

export function checkoutButton(page: Page) {
  return page.getByRole('button', { name: /Proceed to Secure Checkout/ });
}

/** Waits until the storefront has auto-selected an open departure. */
export async function expectDepartureSelected(page: Page): Promise<void> {
  await expect(page.getByText('● In Stock — Cockpit Ready')).toBeVisible();
}

export async function fillPilotDetails(page: Page): Promise<void> {
  await page.getByLabel(/Pilot Full Name/).fill('Resilience Pilot');
  await page.getByLabel(/Pilot Email/).fill('resilience.pilot@example.test');
  await page.getByLabel(/Phone Number/).fill('+972501234567');
}

/** Lets the page finish pending JS work (promise callbacks and a React commit) before a negative assertion. */
export async function settleFrames(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  );
}

export interface StripDay {
  date: string;
  weekday: number;
  /** Accessible name of the strip button, e.g. "Sat 31 Oct". */
  name: RegExp;
}

/** The 14 consecutive Israel calendar days the /book date strip should offer, starting today. */
export function israelStripDays(now = new Date()): StripDay[] {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const cursor = new Date(`${today}T12:00:00Z`);
  return Array.from({ length: 14 }, () => {
    const day: StripDay = {
      date: cursor.toISOString().slice(0, 10),
      weekday: cursor.getUTCDay(),
      name: new RegExp(`^${DAY_NAMES[cursor.getUTCDay()]}\\s*${cursor.getUTCDate()}\\s*${MONTH_NAMES[cursor.getUTCMonth()]}$`),
    };
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    return day;
  });
}

export function addDays(date: string, days: number): string {
  const cursor = new Date(`${date}T12:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return cursor.toISOString().slice(0, 10);
}
