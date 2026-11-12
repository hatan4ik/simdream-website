import { describe, expect, it, vi } from 'vitest';

const wix = vi.hoisted(() => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/lib/wix/member-client', () => ({
  getWixMemberClient: () => ({ fetchWithAuth: wix.fetchWithAuth }),
  wixMemberOAuthStorageKey: () => 'oauth-key',
}));

import { recordNoteOnWixDraft } from '@/lib/booking/client';
import { setWixCartNote } from '@/lib/wix/cart-note';

/**
 * Wix-hosted checkout: the consent stamp and the birthday day and month travel in the visitor-owned cart's
 * `note` (Cart V2 Update Cart: PATCH /ecom/v2/carts/{cart.id}, `note` at most 1000 characters). No server of ours
 * sees that booking, so this call is the only durable record, and a failure must stop the checkout.
 */
const CART_ID = '3f9b2c71-6d4e-4a8b-9e52-7c1d0a8f4b63';
const draft = { inputKey: 'k', cartId: CART_ID, totalIls: 690 };

describe('setWixCartNote', () => {
  it('PATCHes only the note of the cart, with the cart id in the URL and in the body', async () => {
    const fetchWithAuth = vi.fn(async () => new Response('{}', { status: 200 }));

    await setWixCartNote({ fetchWithAuth }, CART_ID, 'consent stamp', 'failed');

    expect(fetchWithAuth).toHaveBeenCalledTimes(1);
    const [url, init] = fetchWithAuth.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://www.wixapis.com/ecom/v2/carts/${CART_ID}`);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ cart: { id: CART_ID, note: 'consent stamp' } });
  });

  it('throws the caller-supplied localized message when Wix refuses, so nothing proceeds to payment', async () => {
    const fetchWithAuth = vi.fn(async () => new Response('{}', { status: 403 }));
    await expect(setWixCartNote({ fetchWithAuth }, CART_ID, 'x', 'Payment could not start.')).rejects.toThrow('Payment could not start.');
  });
});

describe('recordNoteOnWixDraft', () => {
  it('writes the note to the draft cart through the visitor session', async () => {
    wix.fetchWithAuth.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await recordNoteOnWixDraft(draft, 'stamp', 'failed');
    const [url, init] = wix.fetchWithAuth.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(CART_ID);
    expect(JSON.parse(String(init.body)).cart.note).toBe('stamp');
  });

  it('propagates the failure', async () => {
    wix.fetchWithAuth.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    await expect(recordNoteOnWixDraft(draft, 'stamp', 'Could not start.')).rejects.toThrow('Could not start.');
  });
});
