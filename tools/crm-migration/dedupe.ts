import { emailExactKey, emailMatchKey, nameTokens, namesCompatible, phoneKey } from './normalize';
import type {
  DedupeOptions,
  DedupeResult,
  MergeGroup,
  MergeReason,
  MergedPerson,
  ReviewGroup,
  SourceAddress,
  SourceContact,
  SourceOrder,
} from './types';

/** Wix accepts at most this many additional emails / phones per contact. */
const WIX_MAX_ADDITIONAL = 10;
const WIX_MAX_ADDRESSES = 50;
const DEFAULT_MAX_CLUSTER_SIZE = 6;

interface Facts {
  contact: SourceContact;
  exactEmails: string[];
  matchKeys: string[];
  phoneKeys: string[];
  tokens: string[];
  orderCount: number;
}

class UnionFind {
  private readonly parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }
  find(index: number): number {
    let root = index;
    while (this.parent[root] !== root) root = this.parent[root]!;
    let node = index;
    while (this.parent[node] !== root) {
      const next = this.parent[node]!;
      this.parent[node] = root;
      node = next;
    }
    return root;
  }
  union(a: number, b: number): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent[Math.max(rootA, rootB)] = Math.min(rootA, rootB);
  }
}

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

function factsOf(contact: SourceContact, orderCount: number): Facts {
  const rawEmails = [contact.email?.email, ...(contact.additionalEmails ?? []).map((entry) => entry.email)];
  const exactEmails = unique(rawEmails.map(emailExactKey).filter((key): key is string => key !== null));
  const rawPhones = [contact.phone?.phone, ...(contact.additionalPhones ?? []).map((entry) => entry.phone)];
  return {
    contact,
    exactEmails,
    matchKeys: unique(exactEmails.map((email) => emailMatchKey(email)).filter((key): key is string => key !== null)),
    phoneKeys: unique(rawPhones.map(phoneKey).filter((key): key is string => key !== null)),
    tokens: nameTokens(contact.name),
    orderCount,
  };
}

function indexBy(facts: readonly Facts[], keysOf: (facts: Facts) => readonly string[]): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  facts.forEach((entry, index) => {
    for (const key of keysOf(entry)) {
      const members = groups.get(key);
      if (members) members.push(index);
      else groups.set(key, [index]);
    }
  });
  return groups;
}

function hasNameConflict(members: readonly Facts[]): boolean {
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      if (!namesCompatible(members[i]!.tokens, members[j]!.tokens)) return true;
    }
  }
  return false;
}

/** Survivor first: most orders, then a site member, then reachable by email, then most recently active, then oldest. */
function rank(members: readonly Facts[]): Facts[] {
  return members.toSorted((a, b) => {
    if (a.orderCount !== b.orderCount) return b.orderCount - a.orderCount;
    const memberA = a.contact.memberInfo?.memberId ? 1 : 0;
    const memberB = b.contact.memberInfo?.memberId ? 1 : 0;
    if (memberA !== memberB) return memberB - memberA;
    const emailA = a.exactEmails.length > 0 ? 1 : 0;
    const emailB = b.exactEmails.length > 0 ? 1 : 0;
    if (emailA !== emailB) return emailB - emailA;
    const activityA = a.contact.lastActivity?.date ?? '';
    const activityB = b.contact.lastActivity?.date ?? '';
    if (activityA !== activityB) return activityA < activityB ? 1 : -1;
    const createdA = a.contact.createdDate ?? '9999';
    const createdB = b.contact.createdDate ?? '9999';
    if (createdA !== createdB) return createdA < createdB ? -1 : 1;
    return a.contact.id < b.contact.id ? -1 : 1;
  });
}

function addressKey(entry: SourceAddress): string {
  const address = entry.address ?? {};
  const street = address.streetAddress
    ? [address.streetAddress.name, address.streetAddress.number, address.streetAddress.apt]
    : [address.addressLine];
  return [address.country, address.city, address.postalCode, ...street, address.addressLine2]
    .map((part) => (part ?? '').trim().toLowerCase())
    .join('|');
}

function blank(value: string | undefined | null): boolean {
  return !value || value.trim() === '';
}

/** First non-blank value in rank order; records a conflict when other members hold a different one. */
function pick(
  label: string,
  ranked: readonly Facts[],
  read: (contact: SourceContact) => string | undefined,
  conflicts: string[],
): string | undefined {
  const values = ranked.map((entry) => read(entry.contact)?.trim()).filter((value): value is string => !blank(value));
  const chosen = values[0];
  const others = unique(values.filter((value) => value.toLowerCase() !== chosen?.toLowerCase()));
  if (chosen !== undefined && others.length > 0) {
    conflicts.push(`${label}: kept "${chosen}", other value(s): ${others.map((value) => `"${value}"`).join(', ')}`);
  }
  return chosen;
}

/**
 * The merged name, taken whole from one contact so a last name is never grafted onto a first
 * name that already holds the full name ("Dana Levi" + "Levi"). A row with both a first and a
 * last name wins over a survivor that has only one; otherwise the most complete row does.
 * Compatible spellings are not conflicts; only names that cannot be one person are reported.
 */
function chooseName(ranked: readonly Facts[], conflicts: string[]): { first?: string; last?: string } {
  const candidates = ranked
    .map((entry) => ({ first: entry.contact.name?.first?.trim() || undefined, last: entry.contact.name?.last?.trim() || undefined, tokens: entry.tokens }))
    .filter((candidate) => candidate.tokens.length > 0);
  if (candidates.length === 0) return {};
  const chosen =
    candidates.find((candidate) => candidate.first && candidate.last) ??
    candidates.reduce((best, candidate) => (candidate.tokens.length > best.tokens.length ? candidate : best));
  const clashing = candidates.filter((candidate) => !namesCompatible(candidate.tokens, chosen.tokens));
  if (clashing.length > 0) {
    const label = (candidate: { first?: string; last?: string }) => `"${[candidate.first, candidate.last].filter(Boolean).join(' ')}"`;
    conflicts.push(`name: kept ${label(chosen)}, other value(s): ${clashing.map(label).join(', ')}`);
  }
  return { first: chosen.first, last: chosen.last };
}

function mergeMembers(members: readonly Facts[]): MergedPerson {
  const ranked = rank(members);
  const survivor = ranked[0]!;
  const conflicts: string[] = [];

  const { first, last } = chooseName(ranked, conflicts);
  const companyName = pick('company.name', ranked, (contact) => contact.company?.name, conflicts);
  const jobTitle = pick('company.jobTitle', ranked, (contact) => contact.company?.jobTitle, conflicts);
  const birthdate = pick('birthdate', ranked, (contact) => contact.birthdate, conflicts);
  const locale = pick('locale', ranked, (contact) => contact.locale, conflicts);
  const timeZone = pick('timeZone', ranked, (contact) => contact.timeZone, conflicts);

  const allEmails = unique(ranked.flatMap((entry) => entry.exactEmails));
  const mainEmail = allEmails[0];
  const extraEmails = allEmails.slice(1);

  const phoneEntries = ranked.flatMap((entry) => [
    { phone: entry.contact.phone?.phone, tag: entry.contact.phone?.tag },
    ...(entry.contact.additionalPhones ?? []).map((extra) => ({ phone: extra.phone, tag: extra.tag })),
  ]);
  const seenPhones = new Set<string>();
  const phones: Array<{ phone: string; tag?: string }> = [];
  for (const entry of phoneEntries) {
    const raw = entry.phone?.trim();
    if (!raw) continue;
    const key = phoneKey(raw) ?? `raw:${raw}`;
    if (seenPhones.has(key)) continue;
    seenPhones.add(key);
    phones.push({ phone: raw, tag: entry.tag });
  }
  const mainPhone = phones[0];
  const extraPhones = phones.slice(1);

  const seenAddresses = new Set<string>();
  const addresses: SourceAddress[] = [];
  for (const entry of ranked.flatMap((facts) => facts.contact.addresses ?? [])) {
    const key = addressKey(entry);
    if (key.replace(/\|/g, '') === '' || seenAddresses.has(key)) continue;
    seenAddresses.add(key);
    addresses.push(entry);
  }

  if (extraEmails.length > WIX_MAX_ADDITIONAL) {
    conflicts.push(`additionalEmails: ${extraEmails.length - WIX_MAX_ADDITIONAL} dropped over Wix's limit of ${WIX_MAX_ADDITIONAL}`);
  }
  if (extraPhones.length > WIX_MAX_ADDITIONAL) {
    conflicts.push(`additionalPhones: ${extraPhones.length - WIX_MAX_ADDITIONAL} dropped over Wix's limit of ${WIX_MAX_ADDITIONAL}`);
  }
  if (addresses.length > WIX_MAX_ADDRESSES) {
    conflicts.push(`addresses: ${addresses.length - WIX_MAX_ADDRESSES} dropped over Wix's limit of ${WIX_MAX_ADDRESSES}`);
  }

  const memberSourceIds = ranked.filter((entry) => entry.contact.memberInfo?.memberId).map((entry) => entry.contact.id);
  if (memberSourceIds.length > 1) conflicts.push(`site members: ${memberSourceIds.length} member accounts in one person`);

  const created = members
    .map((entry) => entry.contact.createdDate)
    .filter((value): value is string => !blank(value))
    .sort()[0];

  return {
    personId: survivor.contact.id,
    sourceContactIds: ranked.map((entry) => entry.contact.id),
    name: { first, last },
    email: mainEmail,
    additionalEmails: extraEmails.slice(0, WIX_MAX_ADDITIONAL),
    phone: mainPhone?.phone,
    phoneTag: mainPhone?.tag,
    additionalPhones: extraPhones.slice(0, WIX_MAX_ADDITIONAL),
    addresses: addresses.slice(0, WIX_MAX_ADDRESSES),
    company: companyName !== undefined || jobTitle !== undefined ? { name: companyName, jobTitle } : undefined,
    birthdate,
    locale,
    timeZone,
    labels: unique(members.flatMap((entry) => entry.contact.labels ?? [])).sort(),
    memberSourceIds,
    wasSubscribed: members.some((entry) => entry.contact.email?.subscriptionStatus?.status === 'SUBSCRIBED'),
    orderCount: members.reduce((total, entry) => total + entry.orderCount, 0),
    createdDate: created,
    conflicts,
  };
}

/**
 * Folds duplicate CRM contacts into single people and re-points orders at them.
 *
 * Two contacts are candidates when they share an email (exactly, or after Gmail
 * normalisation) or a phone number. A candidate group is merged automatically only when it
 * is small and every pair of named members could be one person; anything else is left
 * unmerged and listed for human review, because merging two different people (a family
 * sharing one phone) cannot be undone downstream. `overrides` lets a reviewer force or
 * forbid a merge.
 */
export function buildPeople(contactsIn: readonly SourceContact[], ordersIn: readonly SourceOrder[], options: DedupeOptions = {}): DedupeResult {
  const maxClusterSize = options.maxClusterSize ?? DEFAULT_MAX_CLUSTER_SIZE;
  const overrides = options.overrides ?? {};

  const byId = new Map<string, SourceContact>();
  for (const contact of contactsIn) if (!byId.has(contact.id)) byId.set(contact.id, contact);
  const contacts = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : 1));

  const ordersByContact = new Map<string, number>();
  let orphanOrders = 0;
  for (const order of ordersIn) {
    const buyer = order.buyerInfo?.contactId;
    if (buyer && byId.has(buyer)) ordersByContact.set(buyer, (ordersByContact.get(buyer) ?? 0) + 1);
    else orphanOrders += 1;
  }

  const facts = contacts.map((contact) => factsOf(contact, ordersByContact.get(contact.id) ?? 0));
  const indexOfId = new Map(contacts.map((contact, index) => [contact.id, index] as const));
  const forest = new UnionFind(facts.length);

  const exactGroups = indexBy(facts, (entry) => entry.exactEmails);
  const matchGroups = indexBy(facts, (entry) => entry.matchKeys);
  const phoneGroups = indexBy(facts, (entry) => entry.phoneKeys);
  const linkGroups = (groups: Map<string, number[]>) => {
    for (const members of groups.values()) for (let i = 1; i < members.length; i += 1) forest.union(members[0]!, members[i]!);
  };
  linkGroups(exactGroups);
  linkGroups(matchGroups);
  linkGroups(phoneGroups);

  const forcedRoots = new Set<number>();
  for (const group of overrides.forceMerge ?? []) {
    const indexes = group.map((id) => indexOfId.get(id)).filter((index): index is number => index !== undefined);
    for (let i = 1; i < indexes.length; i += 1) forest.union(indexes[0]!, indexes[i]!);
    if (indexes.length > 0) forcedRoots.add(indexes[0]!);
  }
  const forcedComponents = new Set([...forcedRoots].map((index) => forest.find(index)));

  const reasonsByRoot = new Map<number, Set<MergeReason>>();
  const addReason = (index: number, reason: MergeReason) => {
    const root = forest.find(index);
    const bag = reasonsByRoot.get(root) ?? new Set<MergeReason>();
    bag.add(reason);
    reasonsByRoot.set(root, bag);
  };
  for (const members of exactGroups.values()) if (members.length > 1) addReason(members[0]!, 'email-exact');
  for (const [key, members] of matchGroups) {
    if (members.length < 2) continue;
    const spellings = new Set(members.flatMap((index) => facts[index]!.exactEmails.filter((email) => emailMatchKey(email) === key)));
    if (spellings.size > 1) addReason(members[0]!, 'email-normalized');
  }
  for (const members of phoneGroups.values()) if (members.length > 1) addReason(members[0]!, 'phone');
  for (const root of forcedComponents) addReason(root, 'forced');

  const components = new Map<number, number[]>();
  facts.forEach((_, index) => {
    const root = forest.find(index);
    const bag = components.get(root);
    if (bag) bag.push(index);
    else components.set(root, [index]);
  });

  const neverMerge = (overrides.neverMerge ?? []).map(([a, b]) => [a, b] as const);
  const people: MergedPerson[] = [];
  const groups: MergeGroup[] = [];
  const review: ReviewGroup[] = [];

  for (const [root, indexes] of components) {
    const members = indexes.map((index) => facts[index]!);
    if (members.length === 1) {
      people.push(mergeMembers(members));
      continue;
    }
    const reasons = [...(reasonsByRoot.get(root) ?? [])].sort() as MergeReason[];
    const ids = new Set(members.map((entry) => entry.contact.id));
    let hold: ReviewGroup['why'] | null = null;
    if (!forcedComponents.has(root)) {
      if (members.length > maxClusterSize) hold = 'oversized';
      else if (neverMerge.some(([a, b]) => ids.has(a) && ids.has(b))) hold = 'never-merge';
      else if (hasNameConflict(members)) hold = 'name-conflict';
    }
    if (hold) {
      review.push({ sourceContactIds: [...ids].sort(), reasons, why: hold });
      for (const member of members) people.push(mergeMembers([member]));
      continue;
    }
    const merged = mergeMembers(members);
    people.push(merged);
    groups.push({ personId: merged.personId, sourceContactIds: merged.sourceContactIds, reasons, conflicts: merged.conflicts });
  }

  people.sort((a, b) => (a.personId < b.personId ? -1 : 1));
  groups.sort((a, b) => (a.personId < b.personId ? -1 : 1));
  review.sort((a, b) => (a.sourceContactIds[0]! < b.sourceContactIds[0]! ? -1 : 1));

  const contactToPerson: Record<string, string> = {};
  for (const person of people) for (const id of person.sourceContactIds) contactToPerson[id] = person.personId;

  return {
    people,
    contactToPerson,
    review,
    report: {
      contactsIn: contacts.length,
      peopleOut: people.length,
      mergedGroups: groups.length,
      contactsAbsorbed: groups.reduce((total, group) => total + group.sourceContactIds.length - 1, 0),
      reviewGroups: review.length,
      reviewContacts: review.reduce((total, group) => total + group.sourceContactIds.length, 0),
      contactsWithoutIdentity: facts.filter(
        (entry) => entry.exactEmails.length === 0 && entry.phoneKeys.length === 0 && entry.tokens.length === 0 && blank(entry.contact.phone?.phone),
      ).length,
      subscribedPeople: people.filter((person) => person.wasSubscribed).length,
      ordersIn: ordersIn.length,
      orphanOrders,
      groups,
    },
  };
}
