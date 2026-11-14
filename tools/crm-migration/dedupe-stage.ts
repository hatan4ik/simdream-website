import { existsSync } from 'node:fs';
import { buildPeople } from './dedupe';
import { findExclusions } from './exclusions';
import { applyFormAnswers } from './form-enrichment';
import { FILES, csvCell, pathIn, readJson, readNdjson, writeJson, writeNdjson, writeText } from './io';
import type { DedupeOptions, DedupeOverrides, DedupeReport, FormDefinition, FormEnrichmentReport, FormSubmission, ReviewGroup, SourceContact, SourceOrder } from './types';

const displayName = (contact: SourceContact | undefined): string => `${contact?.name?.first ?? ''} ${contact?.name?.last ?? ''}`.trim();

function reviewCsv(review: readonly ReviewGroup[], contacts: ReadonlyMap<string, SourceContact>): string {
  const header = ['group', 'why', 'matched_on', 'contact_id', 'name', 'email', 'phone', 'labels', 'created'];
  const rows = review.flatMap((group, index) =>
    group.sourceContactIds.map((id) => {
      const contact = contacts.get(id);
      return [index + 1, group.why, group.reasons.join('+'), id, displayName(contact), contact?.email?.email, contact?.phone?.phone, (contact?.labels ?? []).join('; '), contact?.createdDate];
    }),
  );
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

function birthdayCsv(changes: FormEnrichmentReport['changes']): string {
  const header = ['person_id', 'from', 'to', 'submitted_on'];
  return [header, ...changes.map((change) => [change.personId, change.from ?? '', change.to, change.submittedOn ?? ''])].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

/**
 * Offline stage: reads the exported contacts and orders, folds duplicates into people, and
 * writes the merged people, the contact-to-person map, a merge report and a review sheet.
 * Nothing leaves the machine and no Wix site is contacted.
 *
 * `overrides.json` in the data directory lets a reviewer force or forbid merges:
 *   { "forceMerge": [["idA", "idB"]], "neverMerge": [["idC", "idD"]] }
 *
 * When the related export (forms and their submissions) is on disk, the birthday forms are applied too:
 * the newest answer about a person replaces the birthday on their contact, and answers about other people
 * saved under the contacts listed in `splitSubmissionContacts` (or "all") become people of their own.
 *   { "splitSubmissionContacts": ["idE"] }
 */
export function runDedupeStage(dir: string, options: Pick<DedupeOptions, 'maxClusterSize'> = {}): DedupeReport {
  const allContacts = readNdjson<SourceContact>(pathIn(dir, FILES.contacts));
  const allOrders = readNdjson<SourceOrder>(pathIn(dir, FILES.orders));
  const overrides = readJson<DedupeOverrides>(pathIn(dir, FILES.overrides), {});

  // Left-out customers go first, so nobody is merged with them and no order of theirs is migrated. The file is
  // always rewritten, so dropping the override and running dedupe again restores them.
  const exclusions = findExclusions(allContacts, allOrders, overrides.excludeEmails ?? []);
  writeJson(pathIn(dir, FILES.excluded), exclusions);
  const leftOutContacts = new Set(exclusions.contactIds);
  const leftOutOrders = new Set(exclusions.orderIds);
  const contacts = allContacts.filter((contact) => !leftOutContacts.has(contact.id));
  const orders = allOrders.filter((order) => !leftOutOrders.has(order.id));
  const result = buildPeople(contacts, orders, { ...options, overrides });

  let people = result.people;
  let report: DedupeReport = result.report;
  const formsFile = pathIn(dir, FILES.forms);
  const submissionsFile = pathIn(dir, FILES.formSubmissions);
  if (existsSync(formsFile) && existsSync(submissionsFile)) {
    const enriched = applyFormAnswers(people, readJson<FormDefinition[]>(formsFile, []), readNdjson<FormSubmission>(submissionsFile), {
      splitContacts: overrides.splitSubmissionContacts,
    });
    people = enriched.people;
    report = { ...report, peopleOut: people.length, forms: enriched.report };
    writeText(pathIn(dir, FILES.birthdayChanges), birthdayCsv(enriched.report.changes));
  }

  if (exclusions.contactIds.length > 0 || exclusions.orderIds.length > 0) {
    report = { ...report, excluded: { contacts: exclusions.contactIds.length, orders: exclusions.orderIds.length, emails: exclusions.emails } };
  }

  writeNdjson(pathIn(dir, FILES.people), people);
  writeJson(pathIn(dir, FILES.contactMap), result.contactToPerson);
  writeJson(pathIn(dir, FILES.mergeReport), { report, review: result.review });
  writeText(pathIn(dir, FILES.reviewCsv), reviewCsv(result.review, new Map(contacts.map((contact) => [contact.id, contact] as const))));
  return report;
}
