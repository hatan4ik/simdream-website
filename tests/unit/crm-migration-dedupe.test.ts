import { describe, expect, it } from 'vitest';
import { buildPeople } from '../../tools/crm-migration/dedupe';
import type { SourceContact, SourceOrder } from '../../tools/crm-migration/types';

/** Synthetic rows only: no real customer data belongs in a test. */
function contact(id: string, fields: Partial<SourceContact> = {}): SourceContact {
  return { id, createdDate: '2024-01-01T00:00:00.000Z', ...fields };
}

function order(id: string, contactId: string | undefined, email = ''): SourceOrder {
  return { id, number: id, buyerInfo: { contactId, email } };
}

const named = (first: string, last: string) => ({ name: { first, last } });
const withEmail = (email: string) => ({ email: { email } });
const withPhone = (phone: string) => ({ phone: { phone } });

describe('buildPeople: no duplicates', () => {
  it('keeps every contact as its own person and maps each id to itself', () => {
    const result = buildPeople(
      [contact('a', { ...named('Dana', 'Levi'), ...withEmail('dana@example.com') }), contact('b', { ...named('Noa', 'Bar'), ...withEmail('noa@example.com') })],
      [],
    );
    expect(result.people.map((person) => person.personId).sort()).toEqual(['a', 'b']);
    expect(result.contactToPerson).toEqual({ a: 'a', b: 'b' });
    expect(result.report.mergedGroups).toBe(0);
    expect(result.report.contactsIn).toBe(2);
    expect(result.report.peopleOut).toBe(2);
  });

  it('ignores a contact id repeated by overlapping export pages', () => {
    const row = contact('a', withEmail('dana@example.com'));
    const result = buildPeople([row, { ...row }], []);
    expect(result.people).toHaveLength(1);
    expect(result.report.contactsIn).toBe(1);
  });

  it('never merges contacts that carry no identifying data at all', () => {
    const result = buildPeople([contact('a'), contact('b')], []);
    expect(result.people).toHaveLength(2);
    expect(result.report.contactsWithoutIdentity).toBe(2);
  });
});

describe('buildPeople: email matches', () => {
  it('merges the same address written in different case and keeps the contact with more orders', () => {
    const result = buildPeople(
      [
        contact('a', { ...named('Dana', 'Levi'), ...withEmail('Dana@Example.com') }),
        contact('b', { ...named('Dana', 'Levi'), ...withEmail('dana@example.com') }),
      ],
      [order('o1', 'b'), order('o2', 'b'), order('o3', 'a')],
    );
    expect(result.people).toHaveLength(1);
    expect(result.people[0]!.personId).toBe('b');
    expect(result.people[0]!.sourceContactIds).toEqual(['b', 'a']);
    expect(result.contactToPerson).toEqual({ a: 'b', b: 'b' });
    expect(result.report.groups[0]!.reasons).toContain('email-exact');
  });

  it('merges when one contact holds the other contact’s main email as an additional email', () => {
    const result = buildPeople(
      [
        contact('a', { ...named('Dana', 'Levi'), ...withEmail('dana@example.com') }),
        contact('b', { ...named('Dana', ''), ...withEmail('dana.work@example.com'), additionalEmails: [{ email: 'dana@example.com' }] }),
      ],
      [],
    );
    expect(result.people).toHaveLength(1);
    const person = result.people[0]!;
    expect([person.email, ...person.additionalEmails].sort()).toEqual(['dana.work@example.com', 'dana@example.com']);
  });

  it('merges Gmail dot variants when the names agree, and says why', () => {
    const result = buildPeople(
      [
        contact('a', { ...named('Dana', 'Levi'), ...withEmail('dana.levi@gmail.com') }),
        contact('b', { ...named('Dana', 'Levi'), ...withEmail('danalevi@gmail.com') }),
      ],
      [],
    );
    expect(result.people).toHaveLength(1);
    expect(result.report.groups[0]!.reasons).toContain('email-normalized');
  });

  it('holds back a Gmail match between different names and queues it for review', () => {
    const result = buildPeople(
      [
        contact('a', { ...named('Dana', 'Levi'), ...withEmail('dana.levi@gmail.com') }),
        contact('b', { ...named('Noa', 'Bar'), ...withEmail('danalevi@gmail.com') }),
      ],
      [],
    );
    expect(result.people).toHaveLength(2);
    expect(result.report.reviewGroups).toBe(1);
    expect(result.review[0]!.why).toBe('name-conflict');
    expect([...result.review[0]!.sourceContactIds].sort()).toEqual(['a', 'b']);
  });
});

describe('buildPeople: phone matches', () => {
  it('merges one phone written two ways when the names are compatible and unions the other numbers', () => {
    const result = buildPeople(
      [
        contact('a', { ...named('Dana', 'Levi'), ...withEmail('dana@example.com'), ...withPhone('050-123-4567') }),
        contact('b', { ...named('Dana', ''), ...withEmail('dana2@example.com'), ...withPhone('+972 50 123 4567'), additionalPhones: [{ phone: '03-555-1234' }] }),
      ],
      [],
    );
    expect(result.people).toHaveLength(1);
    const person = result.people[0]!;
    expect(person.phone).toBe('050-123-4567');
    expect(person.additionalPhones.map((entry) => entry.phone)).toEqual(['03-555-1234']);
    expect(person.additionalEmails).toEqual(['dana2@example.com']);
    expect(result.report.groups[0]!.reasons).toContain('phone');
  });

  it('keeps siblings who share a family phone apart and queues them for review', () => {
    const result = buildPeople(
      [
        contact('a', { ...named('Dan', 'Cohen'), ...withEmail('dan@example.com'), ...withPhone('0501234567') }),
        contact('b', { ...named('Dan', 'Levi'), ...withEmail('danl@example.com'), ...withPhone('0501234567') }),
      ],
      [],
    );
    expect(result.people).toHaveLength(2);
    expect(result.review).toHaveLength(1);
    expect(result.review[0]!.reasons).toContain('phone');
  });

  it('refuses a chain that links two incompatible names through a nameless row', () => {
    const result = buildPeople(
      [
        contact('a', { ...named('Dan', 'Cohen'), ...withPhone('0501111111') }),
        contact('b', { ...withPhone('0501111111'), additionalPhones: [{ phone: '0502222222' }] }),
        contact('c', { ...named('Dan', 'Levi'), ...withPhone('0502222222') }),
      ],
      [],
    );
    expect(result.people).toHaveLength(3);
    expect(result.review[0]!.why).toBe('name-conflict');
    expect(result.review[0]!.sourceContactIds).toHaveLength(3);
  });

  it('refuses an oversized group unless the limit is raised', () => {
    const rows = Array.from({ length: 7 }, (_, index) => contact(`c${index}`, withPhone('0503333333')));
    const held = buildPeople(rows, []);
    expect(held.people).toHaveLength(7);
    expect(held.review[0]!.why).toBe('oversized');
    const merged = buildPeople(rows, [], { maxClusterSize: 10 });
    expect(merged.people).toHaveLength(1);
  });
});

describe('buildPeople: overrides', () => {
  it('forceMerge joins rows the rules would hold back', () => {
    const rows = [
      contact('a', { ...named('Dan', 'Cohen'), ...withPhone('0501234567') }),
      contact('b', { ...named('Dan', 'Levi'), ...withPhone('0507654321') }),
    ];
    expect(buildPeople(rows, []).people).toHaveLength(2);
    const forced = buildPeople(rows, [], { overrides: { forceMerge: [['a', 'b']] } });
    expect(forced.people).toHaveLength(1);
    expect(forced.report.groups[0]!.reasons).toContain('forced');
  });

  it('neverMerge keeps a pair apart even when every rule says they match', () => {
    const rows = [
      contact('a', { ...named('Dana', 'Levi'), ...withEmail('dana@example.com') }),
      contact('b', { ...named('Dana', 'Levi'), additionalEmails: [{ email: 'dana@example.com' }], ...withEmail('other@example.com') }),
    ];
    const result = buildPeople(rows, [], { overrides: { neverMerge: [['a', 'b']] } });
    expect(result.people).toHaveLength(2);
    expect(result.review[0]!.why).toBe('never-merge');
  });
});

describe('buildPeople: merged record', () => {
  const rows = [
    contact('a', {
      ...named('Dana', 'Levi'),
      ...withEmail('dana@example.com'),
      birthdate: '1990-05-01',
      labels: ['VIP'],
      createdDate: '2024-03-01T00:00:00.000Z',
    }),
    contact('b', {
      ...named('Dana', 'Levi'),
      birthdate: '1990-05-02',
      labels: ['Gifts', 'VIP'],
      company: { name: 'Acme', jobTitle: 'CTO' },
      memberInfo: { memberId: 'member-1' },
      createdDate: '2024-01-01T00:00:00.000Z',
      email: { email: 'DANA@example.com', subscriptionStatus: { status: 'SUBSCRIBED' } },
    }),
  ];

  it('prefers the site member as survivor when orders tie, fills gaps and unions labels', () => {
    const person = buildPeople(rows, []).people[0]!;
    expect(person.personId).toBe('b');
    expect(person.company).toEqual({ name: 'Acme', jobTitle: 'CTO' });
    expect(person.labels).toEqual(['Gifts', 'VIP']);
    expect(person.memberSourceIds).toEqual(['b']);
    expect(person.createdDate).toBe('2024-01-01T00:00:00.000Z');
  });

  it('records conflicting values instead of silently dropping one', () => {
    const person = buildPeople(rows, []).people[0]!;
    expect(person.birthdate).toBe('1990-05-02');
    expect(person.conflicts.join(' ')).toMatch(/birthdate/);
  });

  it('remembers that someone in the group had opted in to marketing, for the consent report', () => {
    const result = buildPeople(rows, []);
    expect(result.people[0]!.wasSubscribed).toBe(true);
    expect(result.report.subscribedPeople).toBe(1);
  });
});

describe('buildPeople: merged name', () => {
  const sameEmail = withEmail('dana@example.com');

  it('does not graft a last name onto a first name that already holds the full name', () => {
    // The survivor (more orders) keeps its whole name in `first`; the other row has it split correctly.
    const result = buildPeople(
      [contact('a', { name: { first: 'Dana Levi', last: '' }, ...sameEmail }), contact('b', { name: { first: 'Dana', last: 'Levi' }, ...sameEmail })],
      [order('o1', 'a'), order('o2', 'a')],
    );
    const person = result.people[0]!;
    expect(person.personId).toBe('a');
    expect(person.name).toEqual({ first: 'Dana', last: 'Levi' });
  });

  it('prefers the row that has both a first and a last name over a first-name-only survivor', () => {
    const result = buildPeople(
      [contact('a', { name: { first: 'Dana', last: '' }, ...sameEmail }), contact('b', { name: { first: 'Dana', last: 'Levi' }, ...sameEmail })],
      [order('o1', 'a')],
    );
    expect(result.people[0]!.name).toEqual({ first: 'Dana', last: 'Levi' });
  });

  it('never repeats a word in the merged name and does not report compatible spellings as conflicts', () => {
    const result = buildPeople(
      [contact('a', { name: { first: 'Dana Levi', last: '' }, ...sameEmail }), contact('b', { name: { first: 'Dana', last: 'Levi' }, ...sameEmail })],
      [],
    );
    const person = result.people[0]!;
    const words = `${person.name.first} ${person.name.last}`.split(/\s+/);
    expect(new Set(words).size).toBe(words.length);
    expect(person.conflicts.filter((entry) => entry.startsWith('name'))).toEqual([]);
  });

  it('still reports a genuine disagreement when a merge is forced across different names', () => {
    const result = buildPeople(
      [contact('a', { name: { first: 'Dan', last: 'Cohen' }, ...withPhone('0501234567') }), contact('b', { name: { first: 'Dan', last: 'Levi' }, ...withPhone('0507654321') })],
      [],
      { overrides: { forceMerge: [['a', 'b']] } },
    );
    expect(result.people[0]!.conflicts.some((entry) => entry.startsWith('name'))).toBe(true);
  });
});

describe('buildPeople: orders', () => {
  it('counts orders whose buyer is not in the contact list as orphans', () => {
    const result = buildPeople([contact('a', withEmail('a@example.com'))], [order('o1', 'a'), order('o2', 'gone', 'x@example.com'), order('o3', undefined, 'y@example.com')]);
    expect(result.report.ordersIn).toBe(3);
    expect(result.report.orphanOrders).toBe(2);
  });
});

describe('buildPeople: determinism', () => {
  it('produces the same people whatever order the rows arrive in', () => {
    const rows = [
      contact('a', { ...named('Dana', 'Levi'), ...withEmail('dana@example.com') }),
      contact('b', { ...named('Dana', ''), ...withEmail('dana@example.com') }),
      contact('c', { ...named('Noa', 'Bar'), ...withPhone('0501234567') }),
      contact('d', { ...named('Noa', 'Bar'), ...withPhone('+972501234567') }),
    ];
    const orders = [order('o1', 'b'), order('o2', 'c')];
    const forward = buildPeople(rows, orders);
    const backward = buildPeople([...rows].reverse(), orders);
    const shape = (result: ReturnType<typeof buildPeople>) =>
      result.people.map((person) => [person.personId, person.sourceContactIds.join('+')]).sort();
    expect(shape(backward)).toEqual(shape(forward));
    expect(backward.contactToPerson).toEqual(forward.contactToPerson);
  });
});
