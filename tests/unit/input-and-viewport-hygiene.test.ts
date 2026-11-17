import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const read = (file: string) => readFileSync(path.join(REPO_ROOT, file), 'utf8');

function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(REPO_ROOT, dir)).flatMap((entry) => {
    const relative = path.join(dir, entry);
    if (statSync(path.join(REPO_ROOT, relative)).isDirectory()) return sourceFiles(relative);
    return relative.endsWith('.tsx') ? [relative] : [];
  });
}

/** The opening tag of the first `<input` that carries `marker`. */
function inputTag(source: string, marker: string): string {
  const at = source.indexOf(marker);
  expect(at, `an input carrying ${marker}`).toBeGreaterThan(-1);
  const start = source.lastIndexOf('<input', at);
  return source.slice(start, source.indexOf('/>', at));
}

describe('inputs name themselves and tell the browser what they hold', () => {
  it('the blog search has an accessible name beyond its placeholder, a mobile search key and no autofill', () => {
    const tag = inputTag(read('components/blog/BlogIndexView.tsx'), 'type="search"');
    expect(tag).toContain('aria-label={copy.searchPlaceholder}');
    expect(tag).toContain('enterKeyHint="search"');
    expect(tag).toContain('autoComplete="off"');
    expect(tag).toContain('name="q"');
  });

  it("the offers calculator's birth date is announced as a birthday, its flight date is not", () => {
    const source = read('components/offers/BirthdayCalculator.tsx');
    expect(inputTag(source, 'data-birthday-input="birth"')).toContain('autoComplete="bday"');
    expect(inputTag(source, 'data-birthday-input="flight"')).not.toContain('autoComplete');
  });
});

describe('the refund form announces its contact fields by name as well as by autocomplete token', () => {
  it.each([
    ['email', 'email'],
    ['name', 'name'],
    ['tel', 'phone'],
  ])('the %s field is named %s', (autoComplete, name) => {
    const source = read('components/refund/OrderStep.tsx');
    const at = source.indexOf(`autoComplete="${autoComplete}"`);
    expect(at, `a ${autoComplete} field`).toBeGreaterThan(-1);
    const tag = source.slice(source.lastIndexOf('<input', at), source.indexOf('/>', at));
    expect(tag).toContain(`name="${name}"`);
  });
});

describe("the gift voucher's recipient is a different person from the sender", () => {
  // Chrome ignores autocomplete="off" when it fills a saved profile, and with two name/email pairs on one
  // form it filled the profile email into the recipient and left the sender's email and phone empty. A
  // separate autofill section keeps the visitor's own details on the sender fields.
  it.each([
    ['recipientName', 'section-recipient name'],
    ['recipientEmail', 'section-recipient email'],
  ])('%s sits in its own autofill section', (name, token) => {
    const tag = inputTag(read('app/(public)/vouchers/page.tsx'), `name="${name}"`);
    expect(tag).toContain(`autoComplete="${token}"`);
  });

  it('the sender fields stay on the plain tokens so the visitor details land there', () => {
    const source = read('components/vouchers/VoucherSenderFields.tsx');
    for (const token of ['name', 'email', 'tel']) expect(source).toContain(`autoComplete="${token}"`);
  });
});

describe('page height follows the visible viewport', () => {
  it('no page uses min-h-screen, which is the large viewport and scrolls short pages under a phone toolbar', () => {
    const offenders = [...sourceFiles('app'), ...sourceFiles('components')].filter((file) => /\bmin-h-screen\b/.test(read(file)));
    expect(offenders).toEqual([]);
  });
});
