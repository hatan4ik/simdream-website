import { describe, expect, it } from 'vitest';
import { restoreUtf8Literals } from '../../scripts/wix-worker-charset.mjs';

describe('restoreUtf8Literals (Wix worker UTF-8 output)', () => {
  it('turns \\uXXXX escapes of Hebrew, Arabic and Cyrillic text back into the characters', () => {
    const escaped = String.raw`const t={he:"שלום",ar:"مرحبا",ru:"привет"};`;
    expect(restoreUtf8Literals(escaped)).toBe('const t={he:"שלום",ar:"مرحبا",ru:"привет"};');
  });

  it('is a no-op for ASCII-only source', () => {
    const source = 'export default { fetch(request) { return new Response("ok"); } };';
    expect(restoreUtf8Literals(source)).toBe(source);
  });

  it('leaves an escaped backslash followed by u alone, because that is literal text', () => {
    const source = String.raw`const literal="\\u05d0"; const pattern=/\\u05d0/;`;
    expect(restoreUtf8Literals(source)).toBe(source);
  });

  it('restores an escape after an even run of backslashes plus one real escape', () => {
    // `\\א` is a literal backslash followed by the character alef.
    expect(restoreUtf8Literals(String.raw`"\\א"`)).toBe(String.raw`"\\א"`);
  });

  it('keeps surrogate pairs, control characters and line separators escaped', () => {
    const source = String.raw`"🚀 \u0000 \u001b     ﻿ \u007f \u0085"`;
    expect(restoreUtf8Literals(source)).toBe(source);
  });

  it('keeps regular expressions equivalent', () => {
    const restored = restoreUtf8Literals(String.raw`/[֐-׿]+/u`);
    expect(restored).toBe(`/[${String.fromCharCode(0x0590)}-${String.fromCharCode(0x05ff)}]+/u`);
    // eslint-disable-next-line no-new-func
    const pattern = new Function(`return ${restored};`)() as RegExp;
    expect(pattern.test('שלום')).toBe(true);
    expect(pattern.test('hello')).toBe(false);
  });

  it('shrinks escaped multilingual source by roughly two thirds', () => {
    const text = 'מערכות סימולציה (ישראל) — טיסת חוויה בבואינג 737';
    const escaped = JSON.stringify(text).replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
    const restored = restoreUtf8Literals(escaped);
    expect(JSON.parse(restored)).toBe(text);
    expect(Buffer.byteLength(restored)).toBeLessThan(Buffer.byteLength(escaped) * 0.6);
  });
});
