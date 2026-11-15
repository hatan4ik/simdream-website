import { describe, expect, it, vi } from 'vitest';
import { applyCustomerDraftPatch, mergeUserContactIntoDraft } from '@/lib/customer/customer-draft';
import {
  WIX_DEFAULT_COUNTRY_CODE,
  patchWixCartCustomerInfo,
  patchWixCheckoutShippingContact,
} from '@/lib/wix/checkout-prefill';

describe('customer draft state & checkout prefill', () => {
  it('merges authenticated profile fields only where visitor draft fields are empty', () => {
    const seeded = mergeUserContactIntoDraft(
      { fullName: '', email: 'custom@example.com', phone: '', birthDate: '1990-05-15' },
      { fullName: 'Avi Cohen', email: 'profile@example.com', phone: '+972547654321' }
    );
    expect(seeded).toEqual({
      fullName: 'Avi Cohen',
      email: 'custom@example.com',
      phone: '+972547654321',
      birthDate: '1990-05-15',
    });
  });

  it('applies partial customer draft patches without mutating unrelated fields', () => {
    const initial = { fullName: 'Avi Cohen', email: 'avi@example.com', phone: '', birthDate: '' };
    const next = applyCustomerDraftPatch(initial, { phone: '054-765-4321', birthDate: '1990-05-15' });
    expect(next).toEqual({
      fullName: 'Avi Cohen',
      email: 'avi@example.com',
      phone: '054-765-4321',
      birthDate: '1990-05-15',
    });
  });

  it('always sets IL country with empty subdivision/postalCode on Cart V2 and Checkout V1 patches', async () => {
    expect(WIX_DEFAULT_COUNTRY_CODE).toBe('IL');
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchWithAuth = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return new Response('{}', { status: 200 });
    });

    await patchWixCartCustomerInfo(fetchWithAuth, 'cart-1', {
      firstName: 'Avi',
      lastName: 'Cohen',
      email: 'avi@example.com',
      phone: '+972547654321',
      birthDate: '1990-05-15',
    });
    await patchWixCheckoutShippingContact(fetchWithAuth, 'cart-1', {
      firstName: 'Avi',
      lastName: 'Cohen',
      phone: '+972547654321',
    });

    expect(calls[0]?.body).toMatchObject({
      cart: {
        deliveryInfo: { address: { country: 'IL', subdivision: '', postalCode: '' } },
        paymentInfo: { billingAddress: { country: 'IL', subdivision: '', postalCode: '' } },
        extendedFields: { namespaces: { _user_fields: { form_field: '1990-05-15' } } },
      },
    });
    expect(calls[1]?.body).toEqual({
      checkout: {
        billingInfo: {
          address: { country: 'IL', subdivision: '', postalCode: '' },
          contactDetails: { firstName: 'Avi', lastName: 'Cohen', phone: '+972547654321' },
        },
        shippingInfo: {
          shippingDestination: {
            address: { country: 'IL', subdivision: '', postalCode: '' },
            contactDetails: { firstName: 'Avi', lastName: 'Cohen', phone: '+972547654321' },
          },
        },
      },
    });
  });
});
