import { LEGAL_PATHS } from '../anchors';
import {
  FREE_RESCHEDULE_NOTICE_HOURS,
  REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION,
  REFUND_WINDOW_DAYS,
  RESCHEDULE_FEE_ILS,
} from '../policy-constants';
import type { LegalBody } from '../types';

/**
 * Rules clauses 13 to 15 in German. NEEDS LEGAL REVIEW: the translation has not been checked by counsel.
 */
const RULES_EXTRA_DE: LegalBody = {
  sections: [
    {
      id: 'refunds',
      clauses: [
        {
          number: '13.1',
          text: 'Eine Erstattung wird ausschließlich über das Online-Erstattungsformular auf dieser Website beantragt.',
          action: { href: LEGAL_PATHS.refundForm, label: 'Erstattungsformular öffnen' },
          added: true,
        },
        {
          number: '13.2',
          text: `Die Voraussetzungen für eine Erstattung, die Umbuchungsgebühr und die Fälle ohne Erstattungsanspruch richten sich nach den Ziffern 4.1 bis 4.6, die durch diese Ziffer nicht geändert werden. Insbesondere: Eine vollständige Erstattung setzt voraus, dass seit der Bestellung noch keine ${REFUND_WINDOW_DAYS} Tage vergangen sind und die Stornierung mindestens ${REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION} Werktage vor der Session erfolgt (Ziffer 4.3); eine Terminänderung weniger als ${FREE_RESCHEDULE_NOTICE_HOURS} Stunden vor der Session unterliegt einer Umbuchungsgebühr von ${RESCHEDULE_FEE_ILS} NIS (Ziffer 4.2); eine Stornierung am Tag der Session selbst oder ein Nichterscheinen begründet keinen Erstattungsanspruch (Ziffer 4.4); die Erstattung für ein nicht vollständig genutztes Abonnement wird nach Ziffer 4.6 berechnet.`,
          added: true,
        },
        {
          number: '13.3',
          text: 'Die Entscheidung über einen Antrag erfolgt anhand der im Formular gemachten Angaben und nach den vorstehenden Bedingungen.',
          added: true,
        },
        {
          number: '13.4',
          text: 'Eine genehmigte Erstattung erfolgt auf das Zahlungsmittel, mit dem die Bestellung bezahlt wurde.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'media-release',
      intro:
        'In dieser Ziffer bezeichnet „das Unternehmen“ das Zentrum gemäß Ziffer 1.1 und „die gefilmte Person“ jede Person, die in den Aufnahmen erscheint. Da die gefilmte Person an einem Drehtag und/oder einer Aktivität im Trainings- und Erlebniszentrum des Unternehmens (einem Boeing 737 MAX Flugsimulator) teilgenommen hat oder teilnehmen wird, und da das Unternehmen das aufgenommene Material für seine geschäftlichen und Marketingzwecke nutzen möchte, erklärt und vereinbart die gefilmte Person Folgendes:',
      clauses: [
        {
          number: '14.1',
          term: 'Rechteeinräumung:',
          text: 'Ich gewähre dem Unternehmen, einschließlich seiner Vertreter, Geschäftsführer, Mitarbeiter und aller in seinem Namen handelnden Personen, hiermit eine vollständige und unwiderrufliche, zeitlich und räumlich unbegrenzte Erlaubnis zur Nutzung der Fotografien, Standbilder, Videomaterialien und Audioaufnahmen, auf denen ich erscheine und die unter meiner direkten Mitwirkung während meines Aufenthalts in den Räumlichkeiten des Zentrums erstellt wurden (die „Materialien“).',
        },
        {
          number: '14.2',
          term: 'Nutzungszwecke:',
          text: 'Mir ist bekannt und ich stimme zu, dass das Unternehmen die Materialien unter anderem für folgende Zwecke nutzt:',
          items: [
            'Werbung und Marketing auf den Websites des Unternehmens.',
            'Verwendung in kommerziellen und werblichen Publikationen (einschließlich Anzeigen und gesponserter Kampagnen).',
            'Veröffentlichung, Bewerbung und Teilen in sozialen Netzwerken (einschließlich Facebook, Instagram, TikTok, YouTube) sowie auf jeder anderen digitalen oder gedruckten Plattform.',
          ],
        },
        {
          number: '14.3',
          term: 'Geistiges Eigentum und Bearbeitung:',
          text: 'Ich bestätige, dass sämtliche Urheber- und Schutzrechte an den Materialien, einschließlich der Rohaufnahmen und der bearbeiteten Fassungen, ausschließlich und vollständig dem Unternehmen zustehen. Das Unternehmen hat das Recht, die Materialien nach eigenem Ermessen zu bearbeiten, zu schneiden, zu verändern, anzupassen und mit anderem Material zu kombinieren. Ich verzichte hiermit im Voraus auf jedes „Urheberpersönlichkeitsrecht“ im Zusammenhang mit den Materialien sowie auf jeden Anspruch hinsichtlich der Art der Bearbeitung.',
        },
        {
          number: '14.4',
          term: 'Keine Ansprüche und keine Vergütung:',
          text: 'Mir ist bekannt, dass ich – vorbehaltlich einer ausdrücklich schriftlich in einer gesonderten Vereinbarung vereinbarten Vergütung (sofern eine solche getroffen wurde) – keinen Anspruch auf Geldzahlungen, Tantiemen oder sonstige Vergütungen für die Nutzung der Materialien habe. Ich verzichte hiermit unbedingt, endgültig und unwiderruflich auf jegliche Ansprüche, Forderungen oder Klagen gegen das Unternehmen wegen der Nutzung der Materialien, einschließlich insbesondere Ansprüchen nach dem Datenschutzgesetz 5741-1981 oder dem Gesetz gegen Verleumdung 5725-1965.',
        },
        {
          number: '14.5',
          term: 'Geschäftsfähigkeit:',
          text: 'Ich erkläre, dass ich über 18 Jahre alt und geschäftsfähig bin, den vorstehenden Bestimmungen aus freiem Willen zuzustimmen. Ist die gefilmte Person unter 18 Jahre alt, ist die Einwilligung eines Elternteils oder Erziehungsberechtigten erforderlich.',
        },
        {
          number: '14.6',
          term: 'Zustimmung eines Elternteils oder Erziehungsberechtigten (nur für gefilmte Personen unter 18 Jahren):',
          text: 'Ich, als Elternteil oder Erziehungsberechtigter einer gefilmten Person unter 18 Jahren, habe das Vorstehende gelesen, seinen Inhalt verstanden und genehmige die Teilnahme des Minderjährigen sowie alles in dieser Ziffer Festgelegte im Namen des Minderjährigen.',
        },
        {
          number: '14.7',
          term: 'Recht auf Widerspruch gegen Filmaufnahmen:',
          text: 'Diese Ziffer schränkt das Recht eines Kunden nicht ein, gemäß Ziffer 6.4 schriftlich darum zu bitten, nicht gefilmt zu werden.',
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
          text: 'Beim Checkout auf der Website wird der Kunde gebeten, zwei getrennte Einwilligungen anzukreuzen: (a) Annahme der Regeln, einschließlich der Regel, dass eine Erstattung über das in Ziffer 13 beschriebene Formular beantragt wird, sowie der Datenschutzerklärung; (b) Zustimmung zu Filmaufnahmen, zur Nutzung der Materialien und zum Anspruchsverzicht gemäß Ziffer 14.',
          added: true,
        },
        {
          number: '15.2',
          text: 'Wenn die Einwilligungen angekreuzt werden, wird bei der Bestellung ein Nachweis gespeichert: die angezeigte Version der Regeln und der Datenschutzerklärung (das Versionsdatum steht oben auf der Seite), die Version des Einwilligungstextes, der Zeitpunkt des Ankreuzens und welche Einwilligungen erteilt wurden.',
          added: true,
          needsLegalReview: true,
        },
        {
          number: '15.3',
          text: 'Der Besteller erklärt, dass er über 18 Jahre alt ist, wie in Ziffer 1.11 angegeben. Ein Elternteil oder Erziehungsberechtigter eines Minderjährigen, der an der Aktivität teilnimmt, stimmt Ziffer 14 im Namen des Minderjährigen zu.',
          added: true,
          needsLegalReview: true,
        },
        {
          number: '15.4',
          text: 'Das Ankreuzen der Einwilligung beim Checkout stellt die Zustimmung zu Ziffer 14 dar und ersetzt die Unterschrift auf einem separaten Einwilligungsformular.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
  ],
};

export default RULES_EXTRA_DE;
