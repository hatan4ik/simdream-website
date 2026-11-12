import { FACILITY_INFO } from '@/lib/config/facility-info';
import {
  REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION,
  REFUND_WINDOW_DAYS,
  RESCHEDULE_FEE_ILS,
  SUBSCRIPTION_REFUND_USED_SESSION_RATE_ILS as RATES,
} from '../policy-constants';
import type { LegalBody } from '../types';

const { requirements, contact, address } = FACILITY_INFO;

/**
 * English rendering of rules clauses 1 to 12 and the privacy appendix. The Hebrew original
 * (`rules-core.he.ts`) prevails; this is a faithful translation with identical numbering, and it
 * is also what visitors in Russian, French, Arabic and Spanish read (with a notice on the page).
 * NEEDS LEGAL REVIEW: the translation has not been checked by counsel.
 */
const RULES_CORE_EN: LegalBody = {
  sections: [
    {
      id: 'definitions',
      clauses: [
        {
          number: '1.1',
          term: 'The Center –',
          text: `${FACILITY_INFO.legalNameEn}, Company Reg. No. ${FACILITY_INFO.companyRegistrationNumber}, ${address.streetEn}, Tel Aviv-Yafo.`,
        },
        {
          number: '1.2',
          term: 'Simulator –',
          text: 'A simulated cockpit or racing car (VR / panoramic display) with software that simulates real systems. The simulator is an entertainment facility and is not intended for use for professional training or drills.',
        },
        {
          number: '1.3',
          term: 'Service / session –',
          text: 'An experiential or instructional activity in the simulator, accompanied by an instructor.',
        },
        {
          number: '1.4',
          term: 'Service duration –',
          text: 'The time of use of the simulator, including a preliminary briefing.',
        },
        {
          number: '1.5',
          term: 'Gift voucher –',
          text: 'A card or PDF bearing an identification number, an expiry date, the simulator type and the session duration.',
        },
        {
          number: '1.6',
          term: 'External voucher –',
          text: 'A voucher issued by a third party; it is subject to these rules.',
        },
        {
          number: '1.7',
          term: 'Rates –',
          text: 'The prices on the website; the Center may change them at any time.',
        },
        {
          number: '1.8',
          term: 'Acceptance –',
          text: 'Payment or redemption of a voucher constitutes full consent to these rules.',
        },
        {
          number: '1.9',
          term: 'Force majeure –',
          text: 'Events beyond the control of the parties (war, epidemic, natural disaster, general strike and the like).',
        },
        { number: '1.10', term: 'The website –', text: 'simdream.co.il and simdream.aero.' },
        {
          number: '1.11',
          term: 'Customer / orderer –',
          text: 'Any legally competent person (over the age of 18) who places an order, pays or redeems a voucher in order to receive the Center’s services, and thereby accepts these rules.',
        },
        {
          number: '1.12',
          term: 'Visitor –',
          text: 'Any person present on the Center’s premises, including companions, family members or guests, who do not operate the simulator but stay in the compound.',
        },
      ],
    },
    {
      id: 'principles',
      clauses: [
        {
          number: '2.1',
          text: 'The services include: (a) experiential/instructional sessions; (b) temporary use of the Center’s spaces, equipment and systems; (c) other value-added services by written agreement.',
        },
        {
          number: '2.2',
          text: 'The customer is obliged to pay according to the rates and to comply with the provisions of these rules.',
        },
        {
          number: '2.3',
          text: 'The Center may postpone an activity (due to maintenance, a technical fault or force majeure) and offer an alternative date.',
        },
      ],
    },
    {
      id: 'booking',
      clauses: [
        {
          number: '3.1',
          text: `An order is placed on the website; an age of ${requirements.minBookingCustomerAgeYears} or over is required to place an order by credit card.`,
        },
        {
          number: '3.2',
          text: 'When ordering a session using a gift voucher or a voucher that entitles the holder to the service, the customer must enter, in the field provided for that purpose, the full and exact number of the voucher. The information entered will be checked by an automated system, and where the voucher number was not entered, was entered incorrectly, does not match the selected service, or the voucher has expired, the order will be cancelled automatically and the customer will be notified of this by e-mail.',
        },
        {
          number: '3.3',
          text: 'An order confirmation is sent automatically by e-mail; a refusal of the transaction by the credit card company cancels the order immediately.',
        },
        {
          number: '3.4',
          term: 'Start of service:',
          text: 'Counted from the moment the customer sits in the simulator cockpit and the instructor begins the briefing.',
        },
        {
          number: '3.5',
          term: 'Arrival and lateness:',
          text: `The customer must arrive at the Center ${requirements.arriveEarlyMinutes} minutes before the session start time. A delay of more than ${requirements.lateThresholdMinutes} minutes will result in a shorter session (without a refund for the lost time) or postponement of the date, subject to payment of a change fee (see clause 4).`,
        },
        {
          number: '3.6',
          term: 'Ages:',
          text: `Entry to the simulator is permitted from the age of ${requirements.minimumAgeYears}. Children aged ${requirements.adultSupervisionAgeRange.replace('–', '-')} must be accompanied by an adult.`,
        },
        {
          number: '3.7',
          text: 'The very act of placing the order, paying or redeeming the voucher constitutes a declaration that the customer has read, understood and accepts these rules in full.',
        },
      ],
    },
    {
      id: 'changes',
      clauses: [
        {
          number: '4.1',
          term: 'Rescheduling at no cost:',
          text: 'The session date may be changed free of charge, provided that the request was received at least 24 hours before the original session time.',
        },
        {
          number: '4.2',
          term: 'Rescheduling within less than 24 hours:',
          text: `A request to change the date that is received less than 24 hours before the session will involve payment of a change fee of ${RESCHEDULE_FEE_ILS} NIS, subject to calendar availability.`,
        },
        {
          number: '4.3',
          term: 'Cancellation and full refund:',
          text: `An order may be cancelled and a full refund (100%) received, provided that ${REFUND_WINDOW_DAYS} days have not yet passed since the date of the order, and provided that the cancellation is made at least ${REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION} business days before the booked session.`,
        },
        {
          number: '4.4',
          term: 'Late / partial cancellation:',
          text: 'Cancellation on the day of the session itself or a failure to arrive (No Show) – no refund will be given at all.',
        },
        {
          number: '4.5',
          term: 'Shortening of a session at the customer’s initiative:',
          text: 'Where the customer ends the session early, the refund (if any) will be calculated proportionally according to the base price of the time actually provided.',
        },
        {
          number: '4.6',
          text: 'The discount given on the purchase of a subscription is valid only where all the sessions included in the subscription are used in full. In the case of a refund for a subscription that was not used in full, the refund amount will be calculated at the full price of the sessions already used, as follows:',
          items: [`30 minutes – ${RATES[30]} NIS`, `60 minutes – ${RATES[60]} NIS`, `90 minutes – ${RATES[90]} NIS`],
        },
      ],
    },
    {
      id: 'liability',
      clauses: [
        {
          number: '5.1',
          text: 'In the event of a delay or cancellation that is the fault of the Center (for example a technical fault), the customer is entitled to a full refund or to coordination of an alternative date.',
        },
        {
          number: '5.2',
          text: 'Compensation for a delay or cancellation that is the fault of the Center will be determined according to the session duration and the circumstances of the case.',
        },
        {
          number: '5.3',
          text: `A delay by the customer of more than ${requirements.lateThresholdMinutes} minutes will lead to a shorter session or to the possibility of postponement for a fee (as stated in clause 4).`,
        },
        {
          number: '5.4',
          text: 'The customer and/or visitor will bear full financial responsibility for any damage caused to the Center’s equipment through negligence, unauthorized use or failure to follow instructions.',
        },
        {
          number: '5.5',
          text: 'The Center holds third-party insurance, but the customer declares that he or she is medically fit to take part in the activity.',
        },
      ],
    },
    {
      id: 'safety',
      clauses: [
        {
          number: '6.1',
          term: 'Absolute prohibition:',
          text: 'It is forbidden to enter the simulator or the compound under the influence of alcohol, drugs or sedating medication. The Center may refuse to provide service in such cases without a refund.',
        },
        {
          number: '6.2',
          term: 'Medical limitations:',
          text: 'The activity is not recommended for women in advanced pregnancy, or for people suffering from severe high blood pressure, heart problems or balance problems.',
        },
        {
          number: '6.3',
          term: 'Discipline:',
          text: 'The instructor’s directions must be followed at all times. Entry by customers to technical areas and offices is strictly forbidden.',
        },
        {
          number: '6.4',
          term: 'Photography:',
          text: 'The Center may film the activity for control or marketing purposes. A customer who does not wish this may request so in writing (Opt-out).',
        },
      ],
    },
    {
      id: 'disclaimer',
      clauses: [
        {
          number: '7.1',
          text: 'The Center will not be responsible for the worsening of a medical condition or for bodily injury if the customer did not declare a medical problem in advance.',
        },
        {
          number: '7.2',
          text: 'The Center is not responsible for bodily injury, property damage or financial loss caused by an act or omission of the customer or of another visitor.',
        },
        {
          number: '7.3',
          text: 'The Sim Dream Israel center uses e-mail as a means of communicating and updating its customers. The Sim Dream Israel center will not be liable for any damage, inconvenience or other consequence resulting from failure to read in time messages sent to the customer on the Center’s behalf, nor from failure to receive such messages due to spam filtering, blocks by corporate security systems, firewalls, or any other technical fault beyond the Center’s control.',
        },
        {
          number: '7.4',
          text: 'The Center is not responsible for the loss or theft of personal belongings.',
        },
        {
          number: '7.5',
          text: 'There is no liability for inconvenience arising from external (municipal) maintenance work or faults in the building that are beyond the Center’s control.',
        },
        {
          number: '7.6',
          text: 'In cases of force majeure (see clause 11), the Center will not be liable for delays or cancellations.',
        },
        {
          number: '7.7',
          term: 'Limit of liability:',
          text: 'The Center’s liability is in every case limited to the amount the customer paid for the specific service.',
        },
        {
          number: '7.8',
          text: 'The Sim Dream Israel center reserves the right to make commercial, advertising and image-promotion use, including in the Center’s publications and websites, of photographs and videos in which customers of the Sim Dream Israel center appear, provided that these materials were obtained lawfully and with the customers’ approval during their visit to the Center. The very existence of such materials constitutes confirmation that the customer gave verbal consent to the filming.',
        },
      ],
    },
    {
      id: 'promotions',
      clauses: [
        {
          number: '8.1',
          text: 'The Center may publish time-limited promotions and cancel them at its discretion. Promotions cannot be combined.',
        },
      ],
    },
    {
      id: 'website',
      clauses: [
        {
          number: '9.1',
          text: 'All content on the website is the exclusive property of the Center. Copying, duplicating or making commercial use of it without permission is forbidden.',
        },
        {
          number: '9.2',
          text: 'The website is provided “as is” (As-Is). The Center does not undertake to provide uninterrupted availability free of faults.',
        },
        {
          number: '9.3',
          term: 'Cookies:',
          text: 'The website uses “cookies” for operational and statistical purposes.',
        },
      ],
    },
    {
      id: 'accessibility',
      clauses: [
        {
          number: '10.1',
          text: `The Center acts in accordance with accessibility standard 5568 (level AA). The website supports keyboard navigation, contrast adjustment and more. For accessibility inquiries: ${contact.email}.`,
        },
      ],
    },
    {
      id: 'force-majeure',
      clauses: [
        {
          number: '11.1',
          text: 'Events such as war, epidemic, a nationwide strike or natural disaster will be regarded as force majeure. Failure to perform an obligation because of these circumstances will not be regarded as a breach of contract.',
        },
      ],
    },
    {
      id: 'disputes',
      clauses: [
        {
          number: '12.1',
          text: 'Any dispute will first be handled by a written approach to the Center (waiting 14 days for a reply). Failing a resolution, exclusive jurisdiction lies with the courts of the Tel Aviv-Yafo district.',
        },
      ],
    },
    {
      id: 'privacy-appendix',
      clauses: [
        {
          term: 'Collection of information:',
          text: 'The Center collects personal details (name, telephone, e-mail) for efficient communication, provision of service and sending marketing information (subject to consent).',
        },
        {
          term: 'Use of information:',
          text: 'The information is used to improve the service and is not transferred to a third party, except in the cases provided by law.',
        },
        {
          term: 'Removal:',
          text: 'The customer may at any time withdraw consent to receive mailings (Unsubscribe) through the link attached to the messages or by a written request.',
        },
      ],
    },
  ],
};

export default RULES_CORE_EN;
