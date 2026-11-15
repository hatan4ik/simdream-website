import { describe, expect, it } from 'vitest';
import { isCancelledLocalRscPrefetch } from '../support/e2e';

describe('isCancelledLocalRscPrefetch', () => {
  it('allows only WebKit’s harmless loopback RSC cancellation, wherever _rsc appears in the query', () => {
    expect(isCancelledLocalRscPrefetch('/127.0.0.1:3815/book?_rsc=flight due to access control checks.')).toBe(true);
    expect(
      isCancelledLocalRscPrefetch('/127.0.0.1:3815/book?package=airline-prep-90-pro&_rsc=flight due to access control checks.')
    ).toBe(true);
  });

  it('does not hide unrelated page errors or non-RSC loopback requests', () => {
    expect(isCancelledLocalRscPrefetch('/127.0.0.1:3815/book?package=airline-prep-90-pro due to access control checks.')).toBe(false);
    expect(isCancelledLocalRscPrefetch('/example.com/book?_rsc=flight due to access control checks.')).toBe(false);
    expect(isCancelledLocalRscPrefetch('TypeError: unexpected client error')).toBe(false);
  });
});
