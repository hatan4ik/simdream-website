/**
 * Shapes of the Wix records this tool reads and writes. Only fields the tool relies on are
 * typed; everything else stays in the raw export files untouched.
 */

export interface SourceAddress {
  tag?: string;
  defaultAddress?: boolean;
  address?: {
    addressLine?: string;
    addressLine2?: string;
    streetAddress?: { number?: string; name?: string; apt?: string };
    city?: string;
    postalCode?: string;
    country?: string;
    subdivision?: string;
    formattedAddress?: string;
  };
}

/** A contact as Contacts v5 returns it, plus the label display names the export stage attaches. */
export interface SourceContact {
  id: string;
  createdDate?: string;
  name?: { first?: string; last?: string };
  email?: { email?: string; subscriptionStatus?: { status?: string } };
  additionalEmails?: Array<{ email?: string }>;
  phone?: { phone?: string; tag?: string };
  additionalPhones?: Array<{ phone?: string; tag?: string }>;
  addresses?: SourceAddress[];
  company?: { name?: string; jobTitle?: string };
  birthdate?: string;
  locale?: string;
  timeZone?: string;
  memberInfo?: { memberId?: string };
  lastActivity?: { date?: string };
  /** Display names of the labels, resolved by the export stage (label keys differ per site). */
  labels?: string[];
}

/** An eCommerce order as Search Orders returns it. Most fields pass through untouched. */
export interface SourceOrder {
  id: string;
  number?: string;
  purchasedDate?: string;
  createdDate?: string;
  buyerInfo?: { contactId?: string; email?: string; memberId?: string; visitorId?: string };
  [field: string]: unknown;
}

export interface MergedPerson {
  /** The survivor's source contact id; also the `externalId` written to the target contact. */
  personId: string;
  /** Every source contact folded into this person, survivor first. */
  sourceContactIds: string[];
  name: { first?: string; last?: string };
  email?: string;
  additionalEmails: string[];
  phone?: string;
  phoneTag?: string;
  additionalPhones: Array<{ phone: string; tag?: string }>;
  addresses: SourceAddress[];
  company?: { name?: string; jobTitle?: string };
  birthdate?: string;
  locale?: string;
  timeZone?: string;
  labels: string[];
  memberSourceIds: string[];
  /** Whether any folded contact had opted in to marketing email. Consent itself cannot be copied. */
  wasSubscribed: boolean;
  orderCount: number;
  createdDate?: string;
  /** Field disagreements between folded contacts, for the human reading the merge report. */
  conflicts: string[];
}

export type MergeReason = 'email-exact' | 'email-normalized' | 'phone' | 'forced';
export type ReviewReason = 'name-conflict' | 'oversized' | 'never-merge';

export interface MergeGroup {
  personId: string;
  sourceContactIds: string[];
  reasons: MergeReason[];
  conflicts: string[];
}

export interface ReviewGroup {
  sourceContactIds: string[];
  reasons: MergeReason[];
  why: ReviewReason;
}

export interface DedupeOverrides {
  /** Groups of source contact ids to merge whatever the rules say. */
  forceMerge?: string[][];
  /** Pairs of source contact ids that must never be merged. */
  neverMerge?: Array<[string, string]>;
  /**
   * Contacts whose form answers about *other* people (a parent filling a birthday form for a child, or one
   * contact many guests were entered under) become people of their own. A contact id list, or "all".
   */
  splitSubmissionContacts?: string[] | 'all';
  /**
   * Email addresses to leave out of the migration entirely, for example the owner's own test customer: every
   * contact holding one (as main or additional address) and every order those contacts bought. Nothing is deleted
   * from the export or from Wix; remove the entry and run dedupe again to bring them back.
   */
  excludeEmails?: string[];
}

/** A form as Form Schema returns it; only the part that says which field fills which contact field is used. */
export interface FormDefinition {
  id: string;
  name?: string;
  formFields?: Array<{ inputOptions?: { target?: string; contactMapping?: { contactField?: string } } }>;
}

/** A form submission as Form Submission returns it. `submissions` maps a form field's target to the answer. */
export interface FormSubmission {
  id: string;
  formId: string;
  contactId?: string;
  createdDate?: string;
  submissions?: Record<string, unknown>;
}

export interface FormEnrichmentReport {
  /** Submissions of forms that have a field mapped to the contact birthdate. */
  submissionsRead: number;
  /** A person already had a birthday and the newest form answer differs: the form answer is used. */
  birthdaysChanged: number;
  /** A person had no birthday and a form answer supplies one. */
  birthdaysFilledIn: number;
  /** Answers whose date is empty, not a real date, or in the future. */
  invalidDates: number;
  submissionsWithoutPerson: number;
  /** Answers whose name does not match the contact they were saved under. */
  submissionsAboutOthers: number;
  /** Of those, the ones left in the archive because their contact was not chosen for splitting. */
  submissionsAboutOthersKept: number;
  newPeople: number;
  changes: Array<{ personId: string; from: string | null; to: string; submittedOn: string | null }>;
}

export interface DedupeOptions {
  /** Largest group merged automatically; larger ones go to review. Default 6. */
  maxClusterSize?: number;
  overrides?: DedupeOverrides;
}

export interface DedupeReport {
  contactsIn: number;
  peopleOut: number;
  mergedGroups: number;
  contactsAbsorbed: number;
  reviewGroups: number;
  reviewContacts: number;
  contactsWithoutIdentity: number;
  subscribedPeople: number;
  ordersIn: number;
  /** Orders whose buyer contact is absent from the export (deleted contact, or guest checkout). */
  orphanOrders: number;
  groups: MergeGroup[];
  /** Present only when the related export (forms and submissions) is on disk. */
  forms?: FormEnrichmentReport;
  /** Present only when `overrides.json` excludes someone from the migration. */
  excluded?: { contacts: number; orders: number; emails: string[] };
}

export interface DedupeResult {
  people: MergedPerson[];
  /** Source contact id → personId, for every source contact. */
  contactToPerson: Record<string, string>;
  report: DedupeReport;
  review: ReviewGroup[];
}
