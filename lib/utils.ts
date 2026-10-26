import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: 'ILS' | 'USD' = 'ILS'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(amount).replace('ILS', '₪');
}

function cryptographicallyRandomToken(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random number generation is unavailable.');
  }
  const values = new Uint32Array(length);
  globalThis.crypto.getRandomValues(values);
  return Array.from(values, (value) => chars[value % chars.length]).join('');
}

/** Capability-style booking reference; do not make this short or guessable. */
export function generateBookingReference(): string {
  return `SD-737-${cryptographicallyRandomToken(16)}`;
}

export function generateVoucherCode(): string {
  return `SD-VOUCH-${cryptographicallyRandomToken(18)}`;
}

export function formatLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds calendar days to a YYYY-MM-DD date. Pure calendar arithmetic: parsing the string
 * as an instant and adding 24h steps breaks west of UTC and across DST changes.
 */
export function addDaysToYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function formatDate(dateString: string): string {
  try {
    // Parse YYYY-MM-DD in local time rather than UTC midnight to prevent timezone day-shift bugs
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-').map(Number);
      const localDate = new Date(y, (m || 1) - 1, d || 1);
      return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(localDate);
    }

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === 'string' && err.trim().length > 0) {
    return err;
  }
  return fallback;
}
