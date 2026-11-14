import type { SourceOrder } from './types';

/**
 * `full` also sends the fields the Import Order prose says Wix stores as sent but whose
 * request schema does not list them (fulfilment, balance, booked date, discounts, tax).
 * `core` sends only what the schema documents, as the last fallback when Wix rejects the others.
 *
 * Between them are versions of `full` that change only the coupons, tried in this order when Wix
 * answers 500 for an order with an item-specific coupon (seen on the real staging site):
 *  - `no-coupon-ids` drops each coupon's production id, which does not exist on the target;
 *  - `global-discount` records an item-specific discount as order-wide, with the same line amounts;
 *  - `no-discounts` drops the discount detail; the price summary still shows the discount total.
 */
export type OrderVariant = 'full' | 'no-coupon-ids' | 'global-discount' | 'no-discounts' | 'core';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value : undefined);

/** `{ amount }` only: formattedAmount is read-only, and every other price key is derived. */
function money(value: unknown): Json | undefined {
  return isObject(value) && str(value.amount) !== undefined ? { amount: value.amount } : undefined;
}

function pickMoney(source: unknown, keys: readonly string[]): Json | undefined {
  if (!isObject(source)) return undefined;
  const picked: Json = {};
  for (const key of keys) {
    const entry = money(source[key]);
    if (entry) picked[key] = entry;
  }
  return Object.keys(picked).length > 0 ? picked : undefined;
}

/** Drops undefined values and empty objects so optional fields are truly absent from the body. */
function prune<T>(value: T): T {
  if (Array.isArray(value)) return value.map(prune).filter((entry) => entry !== undefined) as T;
  if (!isObject(value)) return value;
  const cleaned: Json = {};
  for (const [key, entry] of Object.entries(value)) {
    const next = prune(entry);
    if (next === undefined) continue;
    if (isObject(next) && Object.keys(next).length === 0) continue;
    cleaned[key] = next;
  }
  return cleaned as T;
}

function address(value: unknown): Json | undefined {
  if (!isObject(value)) return undefined;
  const street = isObject(value.streetAddress) ? value.streetAddress : undefined;
  const hasStreet = street !== undefined && (str(street.name) || str(street.number));
  return prune({
    streetAddress: hasStreet ? { number: str(street.number), name: str(street.name), apt: str(street.apt) } : undefined,
    addressLine: hasStreet ? undefined : str(value.addressLine),
    addressLine2: str(value.addressLine2),
    city: str(value.city),
    postalCode: str(value.postalCode),
    country: str(value.country),
    subdivision: str(value.subdivision),
  });
}

/** billingInfo / recipientInfo. The API requires contactDetails whenever the block is sent. */
function party(value: unknown): Json | undefined {
  if (!isObject(value) || !isObject(value.contactDetails)) return undefined;
  const details = value.contactDetails;
  return prune({
    address: address(value.address),
    contactDetails: {
      firstName: str(details.firstName),
      lastName: str(details.lastName),
      phone: str(details.phone),
      company: str(details.company),
      vatId: isObject(details.vatId) ? details.vatId : undefined,
    },
  });
}

function translatable(value: unknown): Json | undefined {
  return isObject(value) ? prune({ original: str(value.original), translated: str(value.translated) }) : undefined;
}

function lineItem(line: Json, variant: OrderVariant): Json {
  const catalog = isObject(line.catalogReference) ? line.catalogReference : undefined;
  const tax = isObject(line.taxInfo) ? line.taxInfo : undefined;
  const itemType = isObject(line.itemType) ? line.itemType : undefined;
  const lines = Array.isArray(line.descriptionLines) ? line.descriptionLines.filter(isObject) : [];
  const service = isObject(line.serviceProperties) ? line.serviceProperties : undefined;
  return prune({
    id: str(line.id),
    productName: translatable(line.productName),
    catalogReference: catalog && str(catalog.appId) && str(catalog.catalogItemId) ? { appId: catalog.appId, catalogItemId: catalog.catalogItemId } : undefined,
    quantity: typeof line.quantity === 'number' ? line.quantity : undefined,
    itemType: itemType ? (str(itemType.preset) ? { preset: itemType.preset } : { custom: str(itemType.custom) }) : undefined,
    price: money(line.price),
    paymentOption: str(line.paymentOption),
    priceDescription: translatable(line.priceDescription),
    taxInfo: tax
      ? {
          ...pickMoney(tax, ['taxAmount', 'taxableAmount']),
          taxRate: str(tax.taxRate),
          taxIncludedInPrice: typeof tax.taxIncludedInPrice === 'boolean' ? tax.taxIncludedInPrice : undefined,
        }
      : undefined,
    descriptionLines: lines.map((entry) => ({
      lineType: str(entry.lineType),
      name: translatable(entry.name),
      plainText: translatable(entry.plainText),
    })),
    serviceProperties:
      variant !== 'core' && service
        ? {
            scheduledDate: str(service.scheduledDate),
            numberOfParticipants: typeof service.numberOfParticipants === 'number' ? service.numberOfParticipants : undefined,
          }
        : undefined,
  });
}

const PRICE_SUMMARY_KEYS = ['subtotal', 'shipping', 'tax', 'discount', 'total', 'totalAdditionalFees'] as const;
const BALANCE_KEYS = ['balance', 'paid', 'refunded', 'authorized', 'pendingRefund', 'pending', 'chargeback', 'chargebackReversal'] as const;

function appliedDiscounts(value: unknown, variant: OrderVariant): Json[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const mapped = value.filter(isObject).map((discount) =>
    prune({
      id: str(discount.id),
      discountType: variant === 'global-discount' && str(discount.discountType) === 'SPECIFIC_ITEMS' ? 'GLOBAL' : str(discount.discountType),
      coupon: isObject(discount.coupon)
        ? {
            id: variant === 'no-coupon-ids' ? undefined : str(discount.coupon.id),
            code: str(discount.coupon.code),
            name: str(discount.coupon.name),
            amount: money(discount.coupon.amount),
            discountValueType: str(discount.coupon.discountValueType),
          }
        : undefined,
      lineItemDiscounts: Array.isArray(discount.lineItemDiscounts)
        ? discount.lineItemDiscounts.filter(isObject).map((entry) => ({ id: str(entry.id), totalDiscount: money(entry.totalDiscount) }))
        : undefined,
    }),
  );
  return mapped.length > 0 ? mapped : undefined; // an empty list says nothing, and would make coupon-less orders look different to the loader's ladder
}

/**
 * One production order as an Import Order request. Import stores what it is given without
 * recalculating, sends no email, adjusts no stock and creates no invoice, so the order is a
 * faithful historical record. The buyer is re-pointed at the copied contact; production
 * contact, member and visitor ids do not exist on the target and are never sent.
 */
export function toOrderImportBody(source: SourceOrder, targetContactId: string | undefined, variant: OrderVariant = 'full'): { order: Json } {
  const channel = isObject(source.channelInfo) ? str(source.channelInfo.type) : undefined;
  const email = str(source.buyerInfo?.email);
  const order: Json = {
    number: str(source.number),
    purchasedDate: str(source.purchasedDate) ?? str(source.createdDate),
    status: str(source.status),
    paymentStatus: str(source.paymentStatus),
    currency: str(source.currency),
    weightUnit: str(source.weightUnit),
    taxIncludedInPrices: typeof source.taxIncludedInPrices === 'boolean' ? source.taxIncludedInPrices : undefined,
    buyerLanguage: str(source.buyerLanguage),
    buyerNote: str(source.buyerNote),
    archived: typeof source.archived === 'boolean' ? source.archived : undefined,
    channelInfo: { type: channel && channel !== 'UNSPECIFIED' ? channel : 'OTHER_PLATFORM', externalOrderId: source.id },
    buyerInfo: { contactId: targetContactId, email },
    billingInfo: party(source.billingInfo),
    recipientInfo: party(source.recipientInfo),
    priceSummary: pickMoney(source.priceSummary, PRICE_SUMMARY_KEYS),
    lineItems: (Array.isArray(source.lineItems) ? source.lineItems.filter(isObject) : []).map((line) => lineItem(line, variant)),
  };
  if (variant !== 'core') {
    order.fulfillmentStatus = str(source.fulfillmentStatus);
    order.balanceSummary = pickMoney(source.balanceSummary, BALANCE_KEYS);
    order.appliedDiscounts = variant === 'no-discounts' ? undefined : appliedDiscounts(source.appliedDiscounts, variant);
    order.taxInfo = isObject(source.taxInfo) ? pickMoney(source.taxInfo, ['totalTax']) : undefined;
  }
  return { order: prune(order) };
}
