import type { Page } from '@playwright/test';

/** Patterns that only appear in visible text when interpolation or a translation lookup broke. */
export const BROKEN_TEXT_PATTERNS: ReadonlyArray<{ problem: string; pattern: RegExp }> = [
  // A dotted lookup path with a camelCase or numbered segment, e.g. "booking.step2Title".
  { problem: 'raw translation key', pattern: /\b[a-z][a-zA-Z]*\.[a-z][a-zA-Z0-9]*[A-Z0-9][a-zA-Z0-9]*\b/g },
  { problem: '"undefined"', pattern: /\bundefined\b/g },
  { problem: '"NaN"', pattern: /\bNaN\b/g },
  { problem: '"[object Object]"', pattern: /\[object Object\]/g },
  { problem: 'template braces', pattern: /\{\{|\}\}|\$\{/g },
];

export const HEBREW_LETTERS = /[֐-׿]/;
export const ARABIC_LETTERS = /[؀-ۿ]/;

/** Telemetry that must read left-to-right even on RTL pages (AGENTS.md section 5.3). */
export const TELEMETRY_PATTERNS: ReadonlyArray<{ kind: string; pattern: RegExp }> = [
  { kind: 'slot time range', pattern: /\b\d{1,2}:\d{2}\s*[–—-]\s*\d{1,2}:\d{2}\b/ },
  { kind: 'booking reference', pattern: /\bSD-737-[A-Z0-9]{4,}\b/ },
  { kind: 'METAR', pattern: /\b[A-Z]{4} \d{3}\/\d{2,3}KT\b/ },
];

export interface TelemetryReport {
  /** Standalone telemetry strings found on the page. */
  found: string[];
  /** Those whose rendered direction is not LTR. */
  notIsolated: string[];
}

/**
 * Finds standalone telemetry (an element whose own text matches a telemetry pattern and
 * holds no Hebrew/Arabic prose) and checks its computed direction is LTR, which is what
 * a dir="ltr" container, <bdi dir="ltr"> or equivalent CSS isolation produces.
 */
export async function inspectTelemetryDirection(page: Page): Promise<TelemetryReport> {
  const patterns = TELEMETRY_PATTERNS.map(({ pattern }) => pattern.source);
  return page.evaluate((sources) => {
    const telemetry = sources.map((source) => new RegExp(source));
    const rtlProse = /[֐-׿؀-ۿ]/;
    const found: string[] = [];
    const notIsolated: string[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      const ownText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      if (!ownText || rtlProse.test(ownText) || !telemetry.some((pattern) => pattern.test(ownText))) continue;
      if (!element.checkVisibility()) continue;
      found.push(ownText);
      if (getComputedStyle(element).direction !== 'ltr') notIsolated.push(ownText);
    }
    return { found, notIsolated };
  }, patterns);
}
