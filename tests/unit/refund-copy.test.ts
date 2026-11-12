import { describe, expect, it } from 'vitest';
import { REFUND_COPY, describeEvaluation, evaluateRefundEligibility, fillCopy, formatInstantInIsrael, formatSessionDate } from '@/lib/refund';
import { REFUND_EMAIL_COPY } from '@/lib/refund/copy/email';
import type { Language } from '@/lib/i18n/translations';

const CODES: Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es'];
const HEBREW = /[֐-׿]/;
const ARABIC = /[؀-ۿ]/;
const PLACEHOLDER = /\{\w+\}/g;

function leaves(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((child, index) => leaves(child, `${path}[${index}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => leaves(child, path ? `${path}.${key}` : key));
  }
  return [];
}

const english = new Map([...leaves(REFUND_COPY.en), ...leaves(REFUND_EMAIL_COPY.en, 'email')]);
const copyOf = (code: Language) => [...leaves(REFUND_COPY[code]), ...leaves(REFUND_EMAIL_COPY[code], 'email')];

describe('refund copy in six languages', () => {
  it('has the six languages, each with exactly the English key tree', () => {
    expect(Object.keys(REFUND_COPY).sort()).toEqual([...CODES].sort());
    expect(Object.keys(REFUND_EMAIL_COPY).sort()).toEqual([...CODES].sort());
    for (const code of CODES) expect(copyOf(code).map(([path]) => path)).toEqual([...english.keys()]);
  });

  it.each(CODES)('has no empty string in %s', (code) => {
    expect(copyOf(code).filter(([, text]) => text.trim() === '')).toEqual([]);
  });

  it.each(CODES.filter((code) => code !== 'he'))('keeps Hebrew letters out of %s', (code) => {
    expect(copyOf(code).filter(([, text]) => HEBREW.test(text))).toEqual([]);
  });

  it.each(CODES.filter((code) => code !== 'ar'))('keeps Arabic letters out of %s', (code) => {
    expect(copyOf(code).filter(([, text]) => ARABIC.test(text))).toEqual([]);
  });

  it.each(CODES.filter((code) => code !== 'en'))('uses the same placeholders in %s as in English', (code) => {
    const mismatched = copyOf(code).filter(
      ([path, text]) => JSON.stringify((text.match(PLACEHOLDER) ?? []).sort()) !== JSON.stringify((english.get(path)?.match(PLACEHOLDER) ?? []).sort())
    );
    expect(mismatched).toEqual([]);
  });

  it.each(CODES)('never writes a policy number or a price in %s (they come from REFUND_POLICY)', (code) => {
    // 24 hours, 14 days, the 150 ILS fee and the 4.6 prices (the 690 registry price too) are placeholders.
    expect(copyOf(code).filter(([, text]) => /(?<![\w-])(24|14|150|450|650|690|850)(?![\w:-])/.test(text))).toEqual([]);
  });

  it('fills placeholders and leaves unknown ones visible', () => {
    expect(fillCopy('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });
});

describe('the what-to-expect panel', () => {
  const at = (date: string, time = '10:00') => new Date(`${date}T${time}:00+02:00`);
  const evaluate = (overrides: Parameters<typeof evaluateRefundEligibility>[0]) => evaluateRefundEligibility(overrides);
  const base = { productKind: 'flight', reason: 'change_of_plans', orderDate: '2026-12-01', sessionDateTime: '2026-12-17T10:00' } as const;

  it('quotes the fee, hours and days from the policy, not from the copy', () => {
    const fee = describeEvaluation(evaluate({ ...base, requestedAt: at('2026-12-16', '12:00') }), REFUND_COPY.en, 'en');
    expect(fee.headline).toBe('Moving your session costs ₪150');
    expect(fee.body).toContain('Closer than 24 hours');
    expect(fee.tone).toBe('caution');

    const full = describeEvaluation(evaluate({ ...base, requestedAt: at('2026-12-07') }), REFUND_COPY.en, 'en');
    expect(full.headline).toBe('A full refund looks possible');
    expect(full.body).toContain('no more than 14 days');
    expect(full.body).toContain('at least 2 business days');
    expect(full.tone).toBe('positive');
    expect(full.clauses).toBe('Rules, clause 4.3, 4.1');
  });

  it('offers the keep-your-flight nudge, with the free-until time, only while a free move is open', () => {
    const open = describeEvaluation(evaluate({ ...base, requestedAt: at('2026-12-07') }), REFUND_COPY.en, 'en');
    // ICU versions differ on the comma after the weekday, so the match allows both.
    expect(open.nudge?.body).toMatch(/^Moving your session is free until Wed,? 16 Dec,? 10:00\. Message us and we will find a new time\.$/);
    const late = describeEvaluation(evaluate({ ...base, requestedAt: at('2026-12-16', '12:00') }), REFUND_COPY.en, 'en');
    expect(late.nudge).toBeNull();
  });

  it('explains why a full refund is not available', () => {
    const view = describeEvaluation(evaluate({ ...base, requestedAt: at('2026-12-16', '09:00'), sessionDateTime: '2026-12-31T10:00' }), REFUND_COPY.en, 'en');
    expect(view.outcome).toBe('reschedule_free');
    expect(view.blockers).toEqual(['The order is more than 14 days old.']);
  });

  it('shows the subscription prices and picks the right manual-review sentence', () => {
    const track = describeEvaluation(evaluate({ productKind: 'subscription', reason: 'subscription', requestedAt: at('2026-12-07') }), REFUND_COPY.en, 'en');
    expect(track.body).toContain('30 minutes ₪450, 60 minutes ₪650, 90 minutes ₪850');
    const voucher = describeEvaluation(evaluate({ productKind: 'voucher', reason: 'gift_voucher', requestedAt: at('2026-12-07') }), REFUND_COPY.en, 'en');
    expect(voucher.body).toBe(REFUND_COPY.en.panel.manual.voucher);
    const noDate = describeEvaluation(evaluate({ productKind: 'flight', reason: 'other', requestedAt: at('2026-12-07') }), REFUND_COPY.en, 'en');
    expect(noDate.body).toBe(REFUND_COPY.en.panel.manual.noDate);
  });

  it.each(CODES)('renders every outcome in %s with no placeholder left over', (code) => {
    const requests = [
      evaluate({ ...base, requestedAt: at('2026-12-07') }),
      evaluate({ ...base, requestedAt: at('2026-12-16', '12:00') }),
      evaluate({ ...base, requestedAt: at('2026-12-17', '12:00') }),
      evaluate({ ...base, requestedAt: at('2026-12-07'), reason: 'centre_fault' }),
      evaluate({ productKind: 'subscription', reason: 'subscription', requestedAt: at('2026-12-07') }),
      evaluate({ productKind: 'voucher', reason: 'gift_voucher', requestedAt: at('2026-12-07') }),
    ];
    for (const evaluation of requests) {
      const view = describeEvaluation(evaluation, REFUND_COPY[code], code);
      const all = [view.headline, view.body, view.clauses ?? '', ...view.details, ...view.blockers, view.nudge?.body ?? ''];
      expect(all.filter((text) => /\{\w+\}/.test(text))).toEqual([]);
      if (code === 'ar') expect(all.filter((text) => HEBREW.test(text))).toEqual([]);
    }
  });
});

describe('date formatting', () => {
  it('formats a calendar date without letting the time zone shift the day', () => {
    expect(formatSessionDate('en', '2026-12-16')).toMatch(/^Wed,? 16 Dec 2026$/);
    expect(formatSessionDate('he', '2026-12-16')).toMatch(/16/);
  });

  it('formats an instant on the Israel clock, in Western digits for Arabic', () => {
    expect(formatInstantInIsrael('en', '2026-12-16T08:00:00.000Z')).toMatch(/^Wed,? 16 Dec,? 10:00$/);
    expect(formatInstantInIsrael('ar', '2026-12-16T08:00:00.000Z')).toMatch(/16/);
    expect(formatInstantInIsrael('ar', '2026-12-16T08:00:00.000Z')).toMatch(/10:00/);
    expect(formatInstantInIsrael('en', '2026-07-16T07:00:00.000Z')).toMatch(/^Thu,? 16 Jul,? 10:00$/);
  });
});
