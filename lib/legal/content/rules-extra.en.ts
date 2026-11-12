import { LEGAL_PATHS } from '../anchors';
import {
  FREE_RESCHEDULE_NOTICE_HOURS,
  REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION,
  REFUND_WINDOW_DAYS,
  RESCHEDULE_FEE_ILS,
} from '../policy-constants';
import type { LegalBody } from '../types';

/**
 * Rules clauses 13 to 15 in English. Clause 14 is a faithful translation of the owner's Hebrew
 * "consent, release and waiver of rights" form for photo and video use (first person, as in the
 * original). NEEDS LEGAL REVIEW: the translation has not been checked by counsel.
 */
const RULES_EXTRA_EN: LegalBody = {
  sections: [
    {
      id: 'refunds',
      clauses: [
        {
          number: '13.1',
          text: 'A refund is requested only through the online refund request form on this website.',
          action: { href: LEGAL_PATHS.refundForm, label: 'Open the refund request form' },
          added: true,
        },
        {
          number: '13.2',
          text: `The conditions for a refund, the change fee and the cases in which no refund is given are those of clauses 4.1 to 4.6, which this clause does not change. In particular: a full refund requires that ${REFUND_WINDOW_DAYS} days have not yet passed since the order and that the cancellation is made at least ${REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION} business days before the session (clause 4.3); a request to change the date less than ${FREE_RESCHEDULE_NOTICE_HOURS} hours before the session carries a change fee of ${RESCHEDULE_FEE_ILS} NIS (clause 4.2); cancellation on the day of the session itself, or a failure to arrive, gives no right to a refund (clause 4.4); a refund for a subscription that was not used in full is calculated under clause 4.6.`,
          added: true,
        },
        {
          number: '13.3',
          text: 'The decision on a request is made on the details given in the form and under the conditions above.',
          added: true,
        },
        {
          number: '13.4',
          text: 'An approved refund is made to the payment method used to pay for the order.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'media-release',
      intro:
        'In this clause, “the Company” is the Center as defined in clause 1.1, and “the person filmed” is anyone who appears in the footage. Whereas the person filmed has taken part or will take part in a filming day and/or in an activity at the Company’s training and experience center (a Boeing 737 MAX flight simulator); and whereas the Company wishes to use the filmed material for its business and marketing purposes; therefore the person filmed declares and agrees as follows:',
      clauses: [
        {
          number: '14.1',
          term: 'Grant of rights:',
          text: 'I hereby grant the Company, including its representatives, directors, employees and anyone acting on its behalf, a full and irrevocable permission, unlimited in time or place, to use the photographs, still images, video material and audio recordings in which I appear, which were produced with my direct participation during my stay on the Center’s premises (the “Materials”).',
        },
        {
          number: '14.2',
          term: 'Purposes of use:',
          text: 'I know and agree that the Company will use the Materials, among other things, for the following purposes:',
          items: [
            'Advertising and marketing on the Company’s websites.',
            'Use in commercial and promotional publications (including advertisements and sponsored campaigns).',
            'Publication, promotion and sharing on social networks (including Facebook, Instagram, TikTok, YouTube) and on any other digital or printed platform.',
          ],
        },
        {
          number: '14.3',
          term: 'Intellectual property and editing:',
          text: 'I confirm that all copyright and intellectual property in the Materials, including the raw footage and the edited versions, belong exclusively and fully to the Company. The Company has the right to edit, cut, change, adapt and combine the Materials with other material at its sole discretion. I hereby waive in advance any “moral right” in connection with the Materials and any claim about the manner of editing.',
        },
        {
          number: '14.4',
          term: 'No claims and no payment:',
          text: 'I know that, except for payment expressly agreed in writing in a separate agreement (if one was agreed), I will not be entitled to any monetary payment, royalties or further compensation for the use of the Materials. I hereby waive, absolutely, finally and irrevocably, any claim, demand or action against the Company for the use of the Materials, including but not limited to claims under the Protection of Privacy Law, 5741-1981, or the Prohibition of Defamation Law, 5725-1965.',
        },
        {
          number: '14.5',
          term: 'Legal capacity:',
          text: 'I declare that I am over the age of 18 and legally competent to agree to the above of my own free will. If the person filmed is under the age of 18, the consent of a parent or guardian is required.',
        },
        {
          number: '14.6',
          term: 'Parent or guardian approval (for persons filmed under 18 only):',
          text: 'I, the parent or guardian of a person filmed who is under the age of 18, have read the above, understood its content, and approve the minor’s participation and everything stated in this clause on the minor’s behalf.',
        },
        {
          number: '14.7',
          term: 'Right to object to filming:',
          text: 'This clause does not limit the right of a customer to ask in writing not to be filmed, as stated in clause 6.4.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'consent',
      clauses: [
        {
          number: '15.1',
          text: 'At checkout on the website the customer is asked to tick two separate consents: (a) acceptance of the rules, including the rule that a refund is requested through the form described in clause 13, and of the privacy policy; (b) agreement to filming and to the use of the Materials and the waiver of claims under clause 14.',
          added: true,
        },
        {
          number: '15.2',
          text: 'When the consents are ticked, a record is kept with the order: the version of the rules and privacy policy that were shown (the version date appears at the top of the page), the version of the consent wording, the time the boxes were ticked and which consents were given.',
          added: true,
          needsLegalReview: true,
        },
        {
          number: '15.3',
          text: 'The orderer declares that he or she is over the age of 18, as stated in clause 1.11. A parent or guardian of a minor who takes part in the activity agrees to clause 14 on the minor’s behalf.',
          added: true,
          needsLegalReview: true,
        },
        {
          number: '15.4',
          text: 'Ticking the consent at checkout constitutes agreement to clause 14 and takes the place of a signature on a separate consent form.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
  ],
};

export default RULES_EXTRA_EN;
