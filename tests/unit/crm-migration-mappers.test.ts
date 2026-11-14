import { describe, expect, it } from 'vitest';
import { toContactCreateItem } from '../../tools/crm-migration/contact-mapper';
import { toOrderImportBody } from '../../tools/crm-migration/order-mapper';
import type { MergedPerson, SourceOrder } from '../../tools/crm-migration/types';

function person(overrides: Partial<MergedPerson> = {}): MergedPerson {
  return {
    personId: 'src-1',
    sourceContactIds: ['src-1'],
    name: { first: 'Dana', last: 'Levi' },
    email: 'dana@example.com',
    additionalEmails: ['dana.work@example.com'],
    phone: '050-123-4567',
    phoneTag: 'MOBILE',
    additionalPhones: [{ phone: '03-555-1234', tag: 'WORK' }],
    addresses: [],
    labels: [],
    memberSourceIds: [],
    wasSubscribed: false,
    orderCount: 0,
    conflicts: [],
    ...overrides,
  };
}

describe('toContactCreateItem', () => {
  it('writes email and phone as single objects, never as lists, and the survivor id as externalId', () => {
    const item = toContactCreateItem(person());
    expect(item).toMatchObject({
      externalId: 'src-1',
      name: { first: 'Dana', last: 'Levi' },
      email: { email: 'dana@example.com' },
      additionalEmails: [{ email: 'dana.work@example.com' }],
      phone: { phone: '050-123-4567', tag: 'MOBILE' },
      additionalPhones: [{ phone: '03-555-1234', tag: 'WORK' }],
    });
    expect(item).not.toHaveProperty('emails');
    expect(item).not.toHaveProperty('phones');
  });

  it('never carries consent, member, label or provenance fields that Wix owns', () => {
    const item = toContactCreateItem(person({ wasSubscribed: true, memberSourceIds: ['m'], labels: ['VIP'] }));
    for (const key of ['memberInfo', 'tags', 'source', 'subscriptionStatus', 'labelKeys', 'id', 'revision']) {
      expect(item).not.toHaveProperty(key);
    }
    expect(JSON.stringify(item)).not.toContain('SUBSCRIBED');
  });

  it('keeps only well-formed optional fields', () => {
    const item = toContactCreateItem(
      person({
        birthdate: '1990-05-01',
        locale: 'he-IL',
        company: { name: 'Acme', jobTitle: 'CTO' },
        phoneTag: 'CARRIER-PIGEON',
      }),
    );
    expect(item).toMatchObject({ birthdate: '1990-05-01', locale: 'he-IL', company: { name: 'Acme', jobTitle: 'CTO' } });
    expect(item.phone).toEqual({ phone: '050-123-4567' });

    const dirty = toContactCreateItem(person({ birthdate: '01/05/1990', locale: 'Hebrew (Israel)' }));
    expect(dirty).not.toHaveProperty('birthdate');
    expect(dirty).not.toHaveProperty('locale');
  });

  it('maps addresses without source ids and drops malformed country and subdivision codes', () => {
    const item = toContactCreateItem(
      person({
        addresses: [
          {
            tag: 'HOME',
            defaultAddress: true,
            address: { streetAddress: { name: 'Gershon Shatz', number: '36' }, city: 'Tel Aviv-Yafo', country: 'IL', subdivision: 'IL-TA', postalCode: '6789' },
          },
          { tag: 'NOT-A-TAG', address: { addressLine: '1 Main St', country: 'Israel', subdivision: 'TA' } },
        ],
      }),
    );
    expect(item.addresses).toEqual([
      {
        tag: 'HOME',
        defaultAddress: true,
        address: { streetAddress: { name: 'Gershon Shatz', number: '36' }, city: 'Tel Aviv-Yafo', country: 'IL', subdivision: 'IL-TA', postalCode: '6789' },
      },
      { address: { addressLine: '1 Main St' } },
    ]);
  });

  it('the minimal level keeps only identity so a rejected optional field cannot block the contact', () => {
    const item = toContactCreateItem(person({ birthdate: '1990-05-01', locale: 'he-IL', company: { name: 'Acme' } }), 'minimal');
    expect(item).toEqual({
      externalId: 'src-1',
      name: { first: 'Dana', last: 'Levi' },
      email: { email: 'dana@example.com' },
      additionalEmails: [{ email: 'dana.work@example.com' }],
      phone: { phone: '050-123-4567', tag: 'MOBILE' },
      additionalPhones: [{ phone: '03-555-1234', tag: 'WORK' }],
    });
  });
});

function money(amount: string) {
  return { amount, formattedAmount: `₪${amount}` };
}

function sourceOrder(overrides: Record<string, unknown> = {}): SourceOrder {
  return {
    id: 'order-src-1',
    number: '10005',
    createdDate: '2025-01-02T10:00:00.000Z',
    updatedDate: '2025-01-02T10:00:00.000Z',
    purchasedDate: '2025-01-02T09:59:00.000Z',
    status: 'APPROVED',
    paymentStatus: 'PAID',
    fulfillmentStatus: 'FULFILLED',
    currency: 'ILS',
    weightUnit: 'KG',
    taxIncludedInPrices: true,
    buyerLanguage: 'he',
    channelInfo: { type: 'WEB' },
    buyerInfo: { contactId: 'src-1', email: 'dana@example.com', visitorId: 'v-1', memberId: 'm-1' },
    priceSummary: {
      subtotal: money('300'),
      shipping: money('0'),
      tax: money('0'),
      discount: money('0'),
      total: money('300'),
      totalPrice: money('300'),
      totalWithGiftCard: money('300'),
      totalAdditionalFees: money('0'),
    },
    balanceSummary: { paid: money('300'), balance: money('0') },
    activities: [{ id: 'act', type: 'ORDER_PLACED' }],
    billingInfo: {
      address: { country: 'IL', city: 'Tel Aviv-Yafo', countryFullname: 'Israel', postalCode: '6789' },
      contactDetails: { firstName: 'Dana', lastName: 'Levi', phone: '0501234567' },
    },
    lineItems: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        productName: { original: 'Captain 60', translated: 'Captain 60' },
        catalogReference: { appId: '13d21c63-b5ec-5912-8397-c3a5ddb27a97', catalogItemId: 'svc-1' },
        quantity: 1,
        itemType: { preset: 'SERVICE' },
        price: money('300'),
        totalPriceAfterTax: money('300'),
        paymentOption: 'FULL_PAYMENT_ONLINE',
        taxInfo: { taxAmount: money('0'), taxableAmount: money('300'), taxRate: '0', taxIncludedInPrice: true },
        descriptionLines: [{ lineType: 'PLAIN_TEXT', name: { original: 'Date' }, plainText: { original: 'Sun' }, plainTextValue: { original: 'Sun' } }],
        serviceProperties: { scheduledDate: '2025-01-05T10:00:00.000Z', numberOfParticipants: 1 },
        image: { id: 'img', url: 'https://example.com/i.png' },
        restockLocations: [],
        modifierGroups: [],
      },
    ],
    ...overrides,
  } as SourceOrder;
}

describe('toOrderImportBody', () => {
  it('re-points the buyer at the new contact and drops production-only buyer ids', () => {
    const { order } = toOrderImportBody(sourceOrder(), 'target-9');
    expect(order.buyerInfo).toEqual({ contactId: 'target-9', email: 'dana@example.com' });
  });

  it('falls back to the email alone when the buyer has no copied contact', () => {
    const { order } = toOrderImportBody(sourceOrder(), undefined);
    expect(order.buyerInfo).toEqual({ email: 'dana@example.com' });
  });

  it('preserves the history that is the point of importing', () => {
    const { order } = toOrderImportBody(sourceOrder(), 'target-9');
    expect(order).toMatchObject({
      number: '10005',
      purchasedDate: '2025-01-02T09:59:00.000Z',
      status: 'APPROVED',
      paymentStatus: 'PAID',
      currency: 'ILS',
      channelInfo: { type: 'WEB', externalOrderId: 'order-src-1' },
    });
  });

  it('sends amounts only: formattedAmount is read-only and extra price keys are not part of the import', () => {
    const { order } = toOrderImportBody(sourceOrder(), 'target-9');
    expect(JSON.stringify(order)).not.toContain('formattedAmount');
    expect(order.priceSummary).toEqual({
      subtotal: { amount: '300' },
      shipping: { amount: '0' },
      tax: { amount: '0' },
      discount: { amount: '0' },
      total: { amount: '300' },
      totalAdditionalFees: { amount: '0' },
    });
  });

  it('never sends server-owned fields', () => {
    const { order } = toOrderImportBody(sourceOrder(), 'target-9');
    for (const key of ['id', 'createdDate', 'updatedDate', 'activities', 'imported', 'checkoutId', 'cartId']) {
      expect(order).not.toHaveProperty(key);
    }
    expect(order.billingInfo).toEqual({
      address: { country: 'IL', city: 'Tel Aviv-Yafo', postalCode: '6789' },
      contactDetails: { firstName: 'Dana', lastName: 'Levi', phone: '0501234567' },
    });
  });

  it('maps line items to the documented import shape and keeps the booked date in the full variant', () => {
    const { order } = toOrderImportBody(sourceOrder(), 'target-9');
    const [line] = order.lineItems as Array<Record<string, unknown>>;
    expect(line).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      productName: { original: 'Captain 60', translated: 'Captain 60' },
      catalogReference: { appId: '13d21c63-b5ec-5912-8397-c3a5ddb27a97', catalogItemId: 'svc-1' },
      quantity: 1,
      itemType: { preset: 'SERVICE' },
      price: { amount: '300' },
      paymentOption: 'FULL_PAYMENT_ONLINE',
      serviceProperties: { scheduledDate: '2025-01-05T10:00:00.000Z', numberOfParticipants: 1 },
    });
    expect(line).not.toHaveProperty('totalPriceAfterTax');
    expect(line).not.toHaveProperty('restockLocations');
    expect(JSON.stringify(line!.descriptionLines)).not.toContain('plainTextValue');
  });

  it('the core variant drops every field the Import Order documentation does not list', () => {
    const { order } = toOrderImportBody(sourceOrder(), 'target-9', 'core');
    const [line] = order.lineItems as Array<Record<string, unknown>>;
    expect(order).not.toHaveProperty('fulfillmentStatus');
    expect(order).not.toHaveProperty('balanceSummary');
    expect(line).not.toHaveProperty('serviceProperties');
    expect(order).toMatchObject({ number: '10005', purchasedDate: '2025-01-02T09:59:00.000Z', status: 'APPROVED', paymentStatus: 'PAID' });
  });

  it('the full variant also carries the stored fulfilment and balance, which the prose says Wix keeps as sent', () => {
    const { order } = toOrderImportBody(sourceOrder(), 'target-9');
    expect(order.fulfillmentStatus).toBe('FULFILLED');
    expect(order.balanceSummary).toMatchObject({ paid: { amount: '300' }, balance: { amount: '0' } });
  });

  it('drops billing details that have no contact details, which the API requires with billingInfo', () => {
    const { order } = toOrderImportBody(sourceOrder({ billingInfo: { address: { country: 'IL' } } }), 'target-9');
    expect(order).not.toHaveProperty('billingInfo');
  });
});
