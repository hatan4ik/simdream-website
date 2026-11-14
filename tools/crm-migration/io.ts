import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Local data directory for the migration. It holds real customer data, so it is created
 * private (0700), its files are 0600, and it is git-ignored (`/.crm-migration/`).
 */
export const DEFAULT_DATA_DIR = '.crm-migration';

export const FILES = {
  labels: 'labels.json',
  contacts: 'contacts.ndjson',
  orders: 'orders.ndjson',
  planOrders: 'plan-orders.ndjson',
  exportManifest: 'export-manifest.json',
  bookings: 'bookings.ndjson',
  forms: 'forms.json',
  formSubmissions: 'form-submissions.ndjson',
  members: 'members.ndjson',
  orderTransactions: 'order-transactions.ndjson',
  coupons: 'coupons.ndjson',
  relatedManifest: 'related-manifest.json',
  overrides: 'overrides.json',
  people: 'people.ndjson',
  contactMap: 'contact-map.json',
  mergeReport: 'merge-report.json',
  reviewCsv: 'review.csv',
  birthdayChanges: 'birthday-changes.csv',
  excluded: 'excluded.json',
  pausedAutomations: 'automations-paused.json',
  serviceMap: 'service-map.json',
  bookingState: 'booking-state.json',
  staffEmails: 'staff-emails-original.json',
  loadState: 'load-state.json',
} as const;

export function resolveDataDir(dir: string | undefined): string {
  return resolve(process.cwd(), dir && dir.trim() ? dir : DEFAULT_DATA_DIR);
}

export function ensureDataDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
}

export function pathIn(dir: string, name: string): string {
  return join(dir, name);
}

/** Write-then-rename so a crash never leaves a half-written file that looks complete. */
function writeAtomic(file: string, text: string): void {
  const temp = `${file}.tmp`;
  writeFileSync(temp, text, { mode: 0o600 });
  renameSync(temp, file);
}

export function writeJson(file: string, value: unknown): void {
  writeAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson<T>(file: string, fallback?: T): T {
  if (!existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing ${file}. Run the earlier stage first.`);
  }
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

export function writeNdjson(file: string, rows: readonly unknown[]): void {
  writeAtomic(file, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length > 0 ? '\n' : ''));
}

export function readNdjson<T>(file: string): T[] {
  if (!existsSync(file)) throw new Error(`Missing ${file}. Run the earlier stage first.`);
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as T);
}

export function writeText(file: string, text: string): void {
  writeAtomic(file, text);
}

export function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
