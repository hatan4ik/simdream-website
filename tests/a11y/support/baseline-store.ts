import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Plain Node module (no Playwright imports) so the merge script can use it via tsx.

export const BASELINE_PATH = fileURLToPath(new URL('../a11y-baseline.json', import.meta.url));
export const OBSERVED_DIR = fileURLToPath(new URL('../.baseline-observed/', import.meta.url));

export interface A11yBaseline {
  description: string;
  scans: Record<string, string[]>;
}

export interface ObservedScan {
  scanKey: string;
  rules: string[];
}

export function readBaseline(): A11yBaseline {
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as A11yBaseline;
}

/** File-system-safe name for a scan key, used only in baseline-update mode. */
export function observedFileName(scanKey: string): string {
  return `${scanKey.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}.json`;
}
