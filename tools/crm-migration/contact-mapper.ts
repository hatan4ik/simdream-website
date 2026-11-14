import type { MergedPerson, SourceAddress } from './types';

export type ContactLevel = 'full' | 'minimal';

type Json = Record<string, unknown>;
export type ContactCreateItem = Json;

const PHONE_TAGS = new Set(['OTHER', 'MAIN', 'HOME', 'MOBILE', 'WORK', 'FAX']);
const ADDRESS_TAGS = new Set(['OTHER', 'HOME', 'WORK', 'BILLING', 'SHIPPING']);
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LANGUAGE_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const COUNTRY = /^[A-Z]{2}$/;
const SUBDIVISION = /^[A-Z]{2}-[A-Z0-9]{1,3}$/;

const text = (value: string | undefined | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

function mapAddress(entry: SourceAddress, allowDefault: boolean): Json | null {
  const source = entry.address ?? {};
  const street = source.streetAddress;
  const streetAddress =
    street && (text(street.name) || text(street.number))
      ? { name: text(street.name), number: text(street.number), apt: text(street.apt) }
      : undefined;
  const address: Json = {
    streetAddress: streetAddress ? Object.fromEntries(Object.entries(streetAddress).filter(([, value]) => value !== undefined)) : undefined,
    addressLine: streetAddress ? undefined : text(source.addressLine),
    addressLine2: text(source.addressLine2),
    city: text(source.city),
    postalCode: text(source.postalCode),
    country: source.country && COUNTRY.test(source.country) ? source.country : undefined,
    subdivision: source.subdivision && SUBDIVISION.test(source.subdivision) ? source.subdivision : undefined,
  };
  const kept = Object.fromEntries(Object.entries(address).filter(([, value]) => value !== undefined));
  if (Object.keys(kept).length === 0) return null;
  const mapped: Json = { address: kept };
  if (entry.tag && ADDRESS_TAGS.has(entry.tag)) mapped.tag = entry.tag;
  if (allowDefault && entry.defaultAddress === true) mapped.defaultAddress = true;
  return mapped;
}

/**
 * One merged person as a Contacts v5 Bulk Create item. `email` and `phone` are single
 * objects (a list is silently discarded by Wix); consent, member, label and creation
 * fields are never sent because Wix owns them. `minimal` keeps identity only, as the
 * fallback when Wix rejects an optional field.
 */
export function toContactCreateItem(person: MergedPerson, level: ContactLevel = 'full'): ContactCreateItem {
  const first = text(person.name.first);
  const last = text(person.name.last);
  const phoneTag = person.phoneTag && PHONE_TAGS.has(person.phoneTag) ? person.phoneTag : undefined;

  const item: ContactCreateItem = { externalId: person.personId };
  if (first || last) item.name = { ...(first ? { first } : {}), ...(last ? { last } : {}) };
  if (person.email) {
    item.email = { email: person.email };
    if (person.additionalEmails.length > 0) item.additionalEmails = person.additionalEmails.map((email) => ({ email }));
  }
  if (person.phone) {
    item.phone = { phone: person.phone, ...(phoneTag ? { tag: phoneTag } : {}) };
    if (person.additionalPhones.length > 0) {
      item.additionalPhones = person.additionalPhones.map((extra) => ({
        phone: extra.phone,
        ...(extra.tag && PHONE_TAGS.has(extra.tag) ? { tag: extra.tag } : {}),
      }));
    }
  }
  if (level === 'minimal') return item;

  let defaultTaken = false;
  const addresses = person.addresses
    .map((entry) => {
      const mapped = mapAddress(entry, !defaultTaken);
      if (mapped?.defaultAddress) defaultTaken = true;
      return mapped;
    })
    .filter((entry): entry is Json => entry !== null);
  if (addresses.length > 0) item.addresses = addresses;

  const companyName = text(person.company?.name);
  const jobTitle = text(person.company?.jobTitle);
  if (companyName || jobTitle) item.company = { ...(companyName ? { name: companyName } : {}), ...(jobTitle ? { jobTitle } : {}) };
  if (person.birthdate && LOCAL_DATE.test(person.birthdate)) item.birthdate = person.birthdate;
  if (person.locale && LANGUAGE_TAG.test(person.locale)) item.locale = person.locale;
  const timeZone = text(person.timeZone);
  if (timeZone) item.timeZone = timeZone;
  return item;
}

/** Wix needs at least one of name, email or phone to create a contact. */
export function isCreatable(item: ContactCreateItem): boolean {
  return 'name' in item || 'email' in item || 'phone' in item;
}
