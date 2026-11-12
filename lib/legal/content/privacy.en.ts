import { FACILITY_INFO } from '@/lib/config/facility-info';
import type { PrivacyBody } from '../types';

/**
 * Privacy policy in English: a faithful translation of the owner's Hebrew original (sections 1 to 6)
 * plus the additions of sections 7 to 10 (see `privacy.he.ts`). NEEDS LEGAL REVIEW: the translation
 * has not been checked by counsel.
 */
const PRIVACY_EN: PrivacyBody = {
  sections: [
    {
      id: 'general',
      number: '1',
      title: 'General',
      clauses: [
        {
          text: 'Sim Dream (“the Company” or “we”) respects the privacy of the users of the website Simdream.co.il. This policy is drafted in accordance with the Protection of Privacy Law, 5741-1981, and Amendment No. 13 to that law. The purpose of the policy is to explain transparently what information is collected, how we use it, and what your rights are.',
        },
      ],
    },
    {
      id: 'information-and-consent',
      number: '2',
      title: 'Providing information and consent (duty to inform)',
      clauses: [
        {
          text: 'When you place an order or contact us on the website, you will be asked to provide personal details (such as name, telephone, e-mail).',
        },
        {
          term: 'Is it mandatory to provide the information?',
          text: 'No. Providing the information depends on your wish and consent alone. You are under no legal obligation to provide it.',
        },
        {
          term: 'Consequences of not providing information:',
          text: 'Without the required details (marked as mandatory), we will not be able to provide you with the service, arrange a simulator flight for you or contact you.',
        },
      ],
    },
    {
      id: 'purposes',
      number: '3',
      title: 'Purposes of use of the information',
      clauses: [
        {
          text: 'The information collected will be used only for the following purposes:',
          items: [
            'Managing and coordinating bookings for simulator flights.',
            'Contact and customer service.',
            'Sending invoices and receipts.',
            'Marketing mailings and updates about promotions (only if you agreed to this separately; you can opt out at any time).',
            'Compliance with any law.',
          ],
        },
      ],
    },
    {
      id: 'third-parties',
      number: '4',
      title: 'Transfer of information to third parties',
      clauses: [
        {
          text: 'We do not sell your personal information. We may transfer information to technology providers that give us services, solely for the operation of the website and the business:',
          items: [
            'Wix.com: the website management and hosting platform (servers may be located outside Israel).',
            'Payment processors: to carry out payments (the information is entered directly into the provider’s secure system).',
            'Google / Meta: statistics and advertising services (subject to the cookie policy; if enabled, only after your consent).',
          ],
        },
        {
          text: 'Other infrastructure providers that host or run our booking system and database for us (for example cloud services), under their own security terms.',
          added: true,
        },
      ],
    },
    {
      id: 'your-rights',
      number: '5',
      title: 'Your rights (right of access and correction)',
      clauses: [
        {
          text: 'Under the Protection of Privacy Law, you have the following rights:',
          items: [
            'Right of access: you are entitled to contact us and ask to see the information held about you in our database.',
            'Right of correction/deletion: if you find that the information is incorrect, incomplete or out of date, you may ask us to correct or delete it.',
          ],
        },
        { text: `To exercise these rights, you may contact us at the e-mail address: ${FACILITY_INFO.contact.email}` },
      ],
    },
    {
      id: 'security',
      number: '6',
      title: 'Information security',
      clauses: [
        {
          text: 'The website is hosted on the servers of Wix and uses accepted security measures. However, absolute immunity from intrusion into computers cannot be guaranteed.',
        },
      ],
    },
    {
      id: 'checkout-data',
      number: '7',
      title: 'Additional details collected when you order',
      added: true,
      clauses: [
        {
          term: 'Booking details:',
          text: 'In addition to the details in section 2, the booking form asks for the details needed to prepare the session, including participant details as they appear on the form.',
          added: true,
        },
        {
          term: 'Date of birth:',
          text: 'If a date of birth is provided to receive the birthday discount, we use it only to decide whether the discount applies. We do not use it for any other purpose, and we keep only the information needed for that purpose.',
          added: true,
        },
        {
          term: 'Consent record:',
          text: 'When the consents at checkout are ticked (the rules, the privacy policy and the media release), a record is kept with the order of the versions shown, the time they were ticked and the consents given (see clause 15 of the rules). The record serves as proof of consent.',
          added: true,
        },
        {
          term: 'Refund requests:',
          text: 'When a refund request is submitted through the form, the details entered in it are collected (such as the order, contact details and the reason for the request). They are used only to handle the request and to reply to it, and are kept with the order record.',
          added: true,
        },
      ],
    },
    {
      id: 'photos-and-video',
      number: '8',
      title: 'Photos and video',
      added: true,
      clauses: [
        {
          text: 'The rules (clauses 6.4, 7.8 and 14) describe filming and the use of the Materials at the Center. Photos, video and audio recordings in which a person appears are personal information, and they are used for the purposes in clause 14.2 of the rules. You can ask in writing not to be filmed (clause 6.4 of the rules) and exercise the rights in section 5 above by contacting us.',
          added: true,
        },
      ],
    },
    {
      id: 'cookies',
      number: '9',
      title: 'Cookies and local storage',
      added: true,
      clauses: [
        {
          term: 'Local storage:',
          text: 'The site keeps your language and display preferences in your browser’s local storage on your device. Ordinary public browsing does not create a language cookie. Some features keep a short-lived value in the tab’s session storage, for example a member sign-in or a purchased voucher shown on the confirmation page.',
          added: true,
        },
        {
          term: 'Cookies:',
          text: 'The site sets no analytics or advertising cookies by default. The account, booking or payment providers that are used may set essential cookies under their own policies.',
          added: true,
        },
        {
          term: 'Statistics and advertising tools:',
          text: 'If statistics or advertising tools are enabled (for example from Google or Meta, as noted in section 4), they load only after your consent. You can change your choice at any time through the “Cookie settings” link at the bottom of the site, and you can clear local storage and cookies in your browser settings.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'version',
      number: '10',
      title: 'Version of this policy',
      added: true,
      clauses: [
        {
          text: 'The version date appears at the top of the page. Whenever the policy or the rules change the date is updated, and an order keeps the version that was shown at checkout.',
          added: true,
        },
      ],
    },
  ],
};

export default PRIVACY_EN;
