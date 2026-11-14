import { createHash } from 'node:crypto';
import { nameTokens, namesCompatible } from './normalize';
import type { FormDefinition, FormEnrichmentReport, FormSubmission, MergedPerson } from './types';

export interface EnrichmentOptions {
  /** Contacts whose answers about other people become people of their own: a list of contact ids, or "all". */
  splitContacts?: readonly string[] | 'all';
  /** Today as YYYY-MM-DD; a birthday after it is not a birthday. Injected for tests. */
  today?: string;
}

interface FormFields {
  birthdate: string;
  first?: string;
  last?: string;
}

/** Which of a form's fields fill the contact's birthdate and name, read from its definition. */
function fieldsOf(form: FormDefinition): FormFields | null {
  const target = (contactField: string) =>
    form.formFields?.map((field) => field.inputOptions).find((options) => options?.contactMapping?.contactField === contactField)?.target;
  const birthdate = target('BIRTHDATE');
  return birthdate ? { birthdate, first: target('FIRST_NAME'), last: target('LAST_NAME') } : null;
}

function validDate(value: unknown, today: string): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  return value >= '1900-01-01' && value <= today ? value : null;
}

const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

interface Answer {
  submission: FormSubmission;
  date: string;
  first?: string;
  last?: string;
  tokens: string[];
}

/** Newest first: by submission time, then id, so the choice never depends on the order of the input. */
const newestFirst = (a: Answer, b: Answer): number => (b.submission.createdDate ?? '').localeCompare(a.submission.createdDate ?? '') || b.submission.id.localeCompare(a.submission.id);

/**
 * Applies what the birthday forms say to the merged people (product decision):
 *  - the newest form answer about a person replaces the birthday their contact holds;
 *  - an answer whose name does not match the contact it was saved under is about someone else (a parent
 *    entering a child, one contact many guests were entered under) and never touches that contact's
 *    birthday. For contacts chosen in `splitContacts`, each such person becomes a new person with the
 *    newest answer's name and birthday and no email or phone, because those belong to the contact and
 *    Wix would match the new person to it.
 * Pure: the people passed in are not changed.
 */
export function applyFormAnswers(
  people: readonly MergedPerson[],
  forms: readonly FormDefinition[],
  submissions: readonly FormSubmission[],
  options: EnrichmentOptions = {},
): { people: MergedPerson[]; report: FormEnrichmentReport } {
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const fields = new Map<string, FormFields>();
  for (const form of forms) {
    const mapped = fieldsOf(form);
    if (mapped) fields.set(form.id, mapped);
  }
  const personOfContact = new Map<string, MergedPerson>();
  for (const person of people) for (const id of person.sourceContactIds) personOfContact.set(id, person);
  const splits = (contactId: string): boolean => options.splitContacts === 'all' || (Array.isArray(options.splitContacts) && options.splitContacts.includes(contactId));

  const report: FormEnrichmentReport = {
    submissionsRead: 0,
    birthdaysChanged: 0,
    birthdaysFilledIn: 0,
    invalidDates: 0,
    submissionsWithoutPerson: 0,
    submissionsAboutOthers: 0,
    submissionsAboutOthersKept: 0,
    newPeople: 0,
    changes: [],
  };

  const ownByPerson = new Map<string, Answer[]>();
  const othersByContact = new Map<string, Answer[]>();
  for (const submission of submissions) {
    const mapped = fields.get(submission.formId);
    if (!mapped) continue;
    report.submissionsRead += 1;
    const date = validDate(submission.submissions?.[mapped.birthdate], today);
    if (!date) {
      report.invalidDates += 1;
      continue;
    }
    const person = submission.contactId ? personOfContact.get(submission.contactId) : undefined;
    if (!person || !submission.contactId) {
      report.submissionsWithoutPerson += 1;
      continue;
    }
    const first = mapped.first ? text(submission.submissions?.[mapped.first]) : undefined;
    const last = mapped.last ? text(submission.submissions?.[mapped.last]) : undefined;
    const answer: Answer = { submission, date, first, last, tokens: nameTokens({ first, last }) };
    if (namesCompatible(answer.tokens, nameTokens(person.name))) {
      (ownByPerson.get(person.personId) ?? ownByPerson.set(person.personId, []).get(person.personId)!).push(answer);
    } else {
      report.submissionsAboutOthers += 1;
      if (splits(submission.contactId)) (othersByContact.get(submission.contactId) ?? othersByContact.set(submission.contactId, []).get(submission.contactId)!).push(answer);
      else report.submissionsAboutOthersKept += 1;
    }
  }

  const updated = people.map((person) => {
    const newest = ownByPerson.get(person.personId)?.sort(newestFirst)[0];
    if (!newest || newest.date === person.birthdate) return person;
    if (person.birthdate) report.birthdaysChanged += 1;
    else report.birthdaysFilledIn += 1;
    report.changes.push({ personId: person.personId, from: person.birthdate ?? null, to: newest.date, submittedOn: newest.submission.createdDate ?? null });
    return { ...person, birthdate: newest.date };
  });

  const fresh: MergedPerson[] = [];
  for (const [contactId, answers] of [...othersByContact.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const byName = new Map<string, Answer[]>();
    for (const answer of answers) {
      const key = [...answer.tokens].sort().join(' ');
      (byName.get(key) ?? byName.set(key, []).get(key)!).push(answer);
    }
    for (const [key, group] of [...byName.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const newest = group.sort(newestFirst)[0]!;
      fresh.push({
        personId: `birthday-form:${createHash('sha256').update(`${contactId}|${key}`).digest('hex').slice(0, 16)}`,
        sourceContactIds: [],
        name: { first: newest.first, last: newest.last },
        additionalEmails: [],
        additionalPhones: [],
        addresses: [],
        birthdate: newest.date,
        labels: [],
        memberSourceIds: [],
        wasSubscribed: false,
        orderCount: 0,
        createdDate: newest.submission.createdDate,
        conflicts: [`from ${group.length} birthday-form answer(s) saved under contact ${contactId}; no email or phone, which belong to that contact`],
      });
    }
  }
  report.newPeople = fresh.length;
  return { people: [...updated, ...fresh], report };
}
