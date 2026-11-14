import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runDedupeStage } from '../../tools/crm-migration/dedupe-stage';
import { applyFormAnswers } from '../../tools/crm-migration/form-enrichment';
import { FILES, ensureDataDir, pathIn, readNdjson, writeJson, writeNdjson } from '../../tools/crm-migration/io';
import type { FormDefinition, FormSubmission, MergedPerson, SourceContact } from '../../tools/crm-migration/types';

/** Synthetic customers only. */
const person = (personId: string, fields: Partial<MergedPerson> = {}): MergedPerson => ({
  personId,
  sourceContactIds: [personId],
  name: {},
  additionalEmails: [],
  additionalPhones: [],
  addresses: [],
  labels: [],
  memberSourceIds: [],
  wasSubscribed: false,
  orderCount: 0,
  conflicts: [],
  ...fields,
});

/** A form whose date field is mapped to the contact birthdate, with its own field names. */
const birthdayForm = (id = 'form-b', birthdayTarget = 'when_born'): FormDefinition => ({
  id,
  name: 'Birthday form',
  formFields: [
    { inputOptions: { target: 'given', contactMapping: { contactField: 'FIRST_NAME' } } },
    { inputOptions: { target: 'family', contactMapping: { contactField: 'LAST_NAME' } } },
    { inputOptions: { target: birthdayTarget, contactMapping: { contactField: 'BIRTHDATE' } } },
  ],
});

const submission = (id: string, contactId: string, given: string, family: string, born: string, createdDate: string, formId = 'form-b'): FormSubmission => ({
  id,
  formId,
  contactId,
  createdDate,
  submissions: { given, family, when_born: born },
});

describe('applyFormAnswers: the newest form answer wins for the contact itself', () => {
  it('replaces the contact birthdate with the newest answer about that person', () => {
    const { people, report } = applyFormAnswers(
      [person('c1', { name: { first: 'Dana', last: 'Levi' }, birthdate: '1988-06-27' })],
      [birthdayForm()],
      [submission('s1', 'c1', 'Dana', 'Levi', '1988-06-17', '2025-06-10T10:00:00.000Z'), submission('s2', 'c1', 'Dana', 'Levi', '1989-01-02', '2025-06-23T10:00:00.000Z')],
    );
    expect(people[0]?.birthdate).toBe('1989-01-02');
    expect(report.birthdaysChanged).toBe(1);
    expect(report.changes).toEqual([{ personId: 'c1', from: '1988-06-27', to: '1989-01-02', submittedOn: '2025-06-23T10:00:00.000Z' }]);
  });

  it('fills in a birthday the contact does not have', () => {
    const { people, report } = applyFormAnswers([person('c1', { name: { first: 'Dana' } })], [birthdayForm()], [submission('s1', 'c1', 'Dana', '', '1999-01-08', '2026-01-04T00:00:00.000Z')]);
    expect(people[0]?.birthdate).toBe('1999-01-08');
    expect(report.birthdaysFilledIn).toBe(1);
    expect(report.birthdaysChanged).toBe(0);
  });

  it('changes nothing when the newest answer already matches', () => {
    const { people, report } = applyFormAnswers([person('c1', { name: { first: 'Dana' }, birthdate: '1999-01-08' })], [birthdayForm()], [submission('s1', 'c1', 'Dana', '', '1999-01-08', '2026-01-04T00:00:00.000Z')]);
    expect(people[0]?.birthdate).toBe('1999-01-08');
    expect(report.changes).toEqual([]);
  });

  it('never lets an answer about someone else overwrite the contact birthday', () => {
    const { people } = applyFormAnswers(
      [person('parent', { name: { first: 'Rina', last: 'Cohen' }, birthdate: '1980-03-03' })],
      [birthdayForm()],
      [submission('kid', 'parent', 'Noam', 'Cohen', '2015-05-05', '2026-05-01T00:00:00.000Z')],
    );
    expect(people[0]?.birthdate).toBe('1980-03-03');
  });

  it('finds the date field from the form definition, whatever the form calls it, and ignores forms with none', () => {
    const noBirthday: FormDefinition = { id: 'form-x', name: 'Inquiry', formFields: [{ inputOptions: { target: 'given', contactMapping: { contactField: 'FIRST_NAME' } } }] };
    const { people, report } = applyFormAnswers(
      [person('c1', { name: { first: 'Dana' } })],
      [birthdayForm('form-b', 'dob'), noBirthday],
      [
        { id: 's1', formId: 'form-b', contactId: 'c1', createdDate: '2026-01-01T00:00:00.000Z', submissions: { given: 'Dana', dob: '2000-02-02' } },
        { id: 's2', formId: 'form-x', contactId: 'c1', createdDate: '2026-02-01T00:00:00.000Z', submissions: { given: 'Dana', dob: '1990-01-01' } },
      ],
    );
    expect(people[0]?.birthdate).toBe('2000-02-02');
    expect(report.submissionsRead).toBe(1);
  });

  it('counts submissions from every contact folded into a merged person', () => {
    const { people } = applyFormAnswers(
      [person('c1', { sourceContactIds: ['c1', 'c2'], name: { first: 'Dana', last: 'Levi' } })],
      [birthdayForm()],
      [submission('s1', 'c2', 'Dana', 'Levi', '1991-04-04', '2026-03-03T00:00:00.000Z')],
    );
    expect(people[0]?.birthdate).toBe('1991-04-04');
  });

  it('treats answers as the contact’s own when the contact has no name', () => {
    const { people } = applyFormAnswers([person('c1')], [birthdayForm()], [submission('s1', 'c1', 'Dana', 'Levi', '1991-04-04', '2026-03-03T00:00:00.000Z')]);
    expect(people[0]?.birthdate).toBe('1991-04-04');
  });

  it('ignores dates that are not real dates, or are in the future, and counts them', () => {
    const { people, report } = applyFormAnswers(
      [person('c1', { name: { first: 'Dana' }, birthdate: '1990-01-01' })],
      [birthdayForm()],
      [
        submission('s1', 'c1', 'Dana', '', '2000-13-45', '2026-01-01T00:00:00.000Z'),
        submission('s2', 'c1', 'Dana', '', '30/10/2000', '2026-01-02T00:00:00.000Z'),
        submission('s3', 'c1', 'Dana', '', '2999-01-01', '2026-01-03T00:00:00.000Z'),
        submission('s4', 'c1', 'Dana', '', '', '2026-01-04T00:00:00.000Z'),
      ],
    );
    expect(people[0]?.birthdate).toBe('1990-01-01');
    expect(report.invalidDates).toBe(4);
  });

  it('counts, and skips, a submission whose contact is not among the people', () => {
    const { report } = applyFormAnswers([person('c1', { name: { first: 'Dana' } })], [birthdayForm()], [submission('s1', 'ghost', 'Dana', '', '2000-01-01', '2026-01-01T00:00:00.000Z')]);
    expect(report.submissionsWithoutPerson).toBe(1);
  });

  it('does not change its input', () => {
    const original = person('c1', { name: { first: 'Dana' }, birthdate: '1990-01-01' });
    applyFormAnswers([original], [birthdayForm()], [submission('s1', 'c1', 'Dana', '', '2000-02-02', '2026-01-01T00:00:00.000Z')]);
    expect(original.birthdate).toBe('1990-01-01');
  });
});

describe('applyFormAnswers: answers about other people on a shared contact become new people', () => {
  const shared = person('shared', { name: { first: 'Yossi', last: 'Bar' }, email: 'shared@example.com', phone: '+972500000000', birthdate: '2000-05-16' });
  const answers: FormSubmission[] = [
    submission('own1', 'shared', 'Yossi', 'Bar', '2000-05-16', '2026-05-18T00:00:00.000Z'),
    submission('a1', 'shared', 'Noa', 'Katz', '2010-10-30', '2026-10-28T09:00:00.000Z'),
    submission('a2', 'shared', 'NOA ', ' katz', '2010-11-01', '2026-10-28T11:00:00.000Z'),
    submission('b1', 'shared', 'Omer', 'Peled', '2008-01-01', '2026-10-28T10:00:00.000Z'),
  ];

  it('makes one new person per distinct name, with the newest answer’s name and birthday', () => {
    const { people, report } = applyFormAnswers([shared], [birthdayForm()], answers, { splitContacts: ['shared'] });
    const fresh = people.filter((entry) => entry.personId !== 'shared');
    expect(fresh).toHaveLength(2);
    const noa = fresh.find((entry) => entry.name.first?.trim().toLowerCase() === 'noa');
    expect(noa?.birthdate).toBe('2010-11-01');
    expect(noa?.name).toEqual({ first: 'NOA', last: 'katz' });
    expect(report.newPeople).toBe(2);
  });

  it('gives the new people no email or phone, so Wix does not match them to the shared contact', () => {
    const { people } = applyFormAnswers([shared], [birthdayForm()], answers, { splitContacts: ['shared'] });
    for (const entry of people.filter((candidate) => candidate.personId !== 'shared')) {
      expect(entry.email).toBeUndefined();
      expect(entry.phone).toBeUndefined();
      expect(entry.additionalEmails).toEqual([]);
      expect(entry.additionalPhones).toEqual([]);
      expect(entry.sourceContactIds).toEqual([]);
      expect(entry.orderCount).toBe(0);
    }
  });

  it('gives them stable ids that are safe to use as an externalId', () => {
    const first = applyFormAnswers([shared], [birthdayForm()], answers, { splitContacts: ['shared'] }).people.map((entry) => entry.personId);
    const again = applyFormAnswers([shared], [birthdayForm()], [...answers].reverse(), { splitContacts: ['shared'] }).people.map((entry) => entry.personId).sort();
    expect([...first].sort()).toEqual(again);
    for (const id of first.filter((value) => value !== 'shared')) {
      expect(id.startsWith('birthday-form:')).toBe(true);
      expect(id.length).toBeLessThanOrEqual(100);
    }
  });

  it('keeps the shared contact’s own birthday from its own answers, not from the others', () => {
    const { people } = applyFormAnswers([shared], [birthdayForm()], answers, { splitContacts: ['shared'] });
    expect(people.find((entry) => entry.personId === 'shared')?.birthdate).toBe('2000-05-16');
  });

  it('does nothing for contacts that were not chosen, but counts what it left alone', () => {
    const { people, report } = applyFormAnswers([shared], [birthdayForm()], answers);
    expect(people).toHaveLength(1);
    expect(report.newPeople).toBe(0);
    expect(report.submissionsAboutOthers).toBe(3);
    expect(report.submissionsAboutOthersKept).toBe(3);
  });

  it('splits every contact when asked to', () => {
    const parent = person('parent', { name: { first: 'Rina', last: 'Cohen' } });
    const { report } = applyFormAnswers([shared, parent], [birthdayForm()], [...answers, submission('k1', 'parent', 'Noam', 'Cohen', '2015-05-05', '2026-05-01T00:00:00.000Z')], { splitContacts: 'all' });
    expect(report.newPeople).toBe(3);
    expect(report.submissionsAboutOthersKept).toBe(0);
  });
});

describe('runDedupeStage with the form files', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'crm-forms-'));
    ensureDataDir(dir);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const contacts: SourceContact[] = [
    { id: 'c1', createdDate: '2024-01-01T00:00:00.000Z', name: { first: 'Dana', last: 'Levi' }, email: { email: 'dana@example.com' }, birthdate: '1988-06-27' },
    { id: 'c2', createdDate: '2024-01-02T00:00:00.000Z', name: { first: 'Yossi', last: 'Bar' }, email: { email: 'yossi@example.com' }, birthdate: '2000-05-16' },
  ];
  const seed = (overrides?: unknown) => {
    writeNdjson(pathIn(dir, FILES.contacts), contacts);
    writeNdjson(pathIn(dir, FILES.orders), []);
    writeJson(pathIn(dir, FILES.forms), [birthdayForm()]);
    writeNdjson(pathIn(dir, FILES.formSubmissions), [
      submission('s1', 'c1', 'Dana', 'Levi', '1989-01-02', '2025-06-23T10:00:00.000Z'),
      submission('s2', 'c2', 'Noa', 'Katz', '2010-10-30', '2026-10-28T09:00:00.000Z'),
    ]);
    if (overrides) writeJson(pathIn(dir, FILES.overrides), overrides);
  };

  it('applies the newest answer, splits the chosen contact, and lists every change', () => {
    seed({ splitSubmissionContacts: ['c2'] });
    const report = runDedupeStage(dir);
    const people = readNdjson<MergedPerson>(pathIn(dir, FILES.people));
    expect(people.find((entry) => entry.personId === 'c1')?.birthdate).toBe('1989-01-02');
    expect(people).toHaveLength(3);
    expect(report.peopleOut).toBe(3);
    expect(report.forms).toMatchObject({ birthdaysChanged: 1, newPeople: 1 });
    expect(readFileSync(pathIn(dir, FILES.birthdayChanges), 'utf8')).toMatch(/c1,1988-06-27,1989-01-02/);
  });

  it('leaves everything as before when the form files are absent', () => {
    writeNdjson(pathIn(dir, FILES.contacts), contacts);
    writeNdjson(pathIn(dir, FILES.orders), []);
    const report = runDedupeStage(dir);
    expect(report.peopleOut).toBe(2);
    expect(report.forms).toBeUndefined();
  });

  it('does not split anyone unless the overrides say so', () => {
    seed();
    const report = runDedupeStage(dir);
    expect(report.peopleOut).toBe(2);
    expect(report.forms?.submissionsAboutOthersKept).toBe(1);
  });
});
