import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';

describe('safeRedirectPath (post-sign-in redirect target)', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/book?package=pro-60#slots', '/book?package=pro-60#slots'],
    ['/admin/../dashboard', '/dashboard'],
  ])('keeps the same-origin path %s', (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    ['protocol-relative', '//evil.example/phish'],
    ['backslash', '/\\evil.example'],
    ['double backslash', '\\\\evil.example'],
    ['tab inside the slashes', '/\t/evil.example'],
    ['newline inside the slashes', '/\n/evil.example'],
    ['absolute URL', 'https://evil.example'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['data URL', 'data:text/html,<script>alert(1)</script>'],
    ['relative path', 'dashboard'],
    ['empty', ''],
  ])('falls back to the dashboard for a %s target (GAP-1)', (_kind, input) => {
    expect(safeRedirectPath(input)).toBe('/dashboard');
  });

  it('falls back when no target is given', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath(undefined, '/login')).toBe('/login');
  });

  it('never returns a target a browser would resolve to another origin', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (suffix) => {
        const target = safeRedirectPath(`/${suffix}`);
        expect(new URL(target, 'https://www.simdream.co.il').origin).toBe('https://www.simdream.co.il');
        expect(target.startsWith('/')).toBe(true);
        expect(target.startsWith('//')).toBe(false);
      }),
      { numRuns: 500 }
    );
  });
});
