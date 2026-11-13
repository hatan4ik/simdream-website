import { FACILITY_INFO } from '@/lib/config/facility-info';
import type { PrivacyBody } from '../types';

/**
 * Privacy policy in German. NEEDS LEGAL REVIEW: the translation has not been checked by counsel.
 */
const PRIVACY_DE: PrivacyBody = {
  sections: [
    {
      id: 'general',
      number: '1',
      title: 'Allgemeines',
      clauses: [
        {
          text: 'Sim Dream („das Unternehmen“ oder „wir“) achtet die Privatsphäre der Nutzer der Website Simdream.co.il. Diese Richtlinie wurde im Einklang mit dem israelischen Datenschutzgesetz 5741-1981 und dessen Ergänzung Nr. 13 verfasst. Zweck dieser Richtlinie ist es, transparent zu erläutern, welche Daten erhoben werden, wie wir sie verwenden und welche Rechte Sie haben.',
        },
      ],
    },
    {
      id: 'information-and-consent',
      number: '2',
      title: 'Bereitstellung von Daten und Einwilligung (Informationspflicht)',
      clauses: [
        {
          text: 'Wenn Sie eine Bestellung aufgeben oder uns über die Website kontaktieren, werden Sie gebeten, personenbezogene Daten anzugeben (z. B. Name, Telefonnummer, E-Mail).',
        },
        {
          term: 'Ist die Angabe der Daten verpflichtend?',
          text: 'Nein. Die Bereitstellung der Daten beruht allein auf Ihrem Wunsch und Ihrer Einwilligung. Sie unterliegen keiner gesetzlichen Pflicht zur Angabe.',
        },
        {
          term: 'Folgen der Nichtbereitstellung:',
          text: 'Ohne die erforderlichen Angaben (als Pflichtfelder gekennzeichnet) können wir Ihnen den Dienst nicht bereitstellen, keinen Simulatorflug für Sie vereinbaren und Sie nicht kontaktieren.',
        },
      ],
    },
    {
      id: 'purposes',
      number: '3',
      title: 'Zwecke der Datenverwendung',
      clauses: [
        {
          text: 'Die erhobenen Daten werden ausschließlich für folgende Zwecke verwendet:',
          items: [
            'Verwaltung und Koordinierung von Buchungen für Simulatorflüge.',
            'Kontaktaufnahme und Kundenservice.',
            'Versand von Rechnungen und Zahlungsbelegen.',
            'Marketing-Mitteilungen und Informationen zu Aktionen (nur nach gesonderter Einwilligung; Abmeldung jederzeit möglich).',
            'Einhaltung gesetzlicher Vorschriften.',
          ],
        },
      ],
    },
    {
      id: 'third-parties',
      number: '4',
      title: 'Weitergabe von Daten an Dritte',
      clauses: [
        {
          text: 'Wir verkaufen Ihre personenbezogenen Daten nicht. Wir können Daten ausschließlich für den Betrieb der Website und des Unternehmens an Technologie-Dienstleister übermitteln:',
          items: [
            'Wix.com: Plattform für Website-Verwaltung und Hosting (Server können sich außerhalb Israels befinden).',
            'Zahlungsabwickler: zur Durchführung von Zahlungen (die Daten werden direkt im gesicherten System des Anbieters eingegeben).',
            'Google / Meta: Statistik- und Werbedienste (vorbehaltlich der Cookie-Richtlinie; sofern aktiviert, nur nach Ihrer Einwilligung).',
          ],
        },
        {
          text: 'Weitere Infrastruktur-Dienstleister, die unser Buchungssystem und unsere Datenbank für uns hosten oder betreiben (z. B. Cloud-Dienste), gemäß deren eigenen Sicherheitsbedingungen.',
          added: true,
        },
      ],
    },
    {
      id: 'your-rights',
      number: '5',
      title: 'Ihre Rechte (Auskunfts- und Berichtigungsrecht)',
      clauses: [
        {
          text: 'Nach dem Datenschutzgesetz stehen Ihnen folgende Rechte zu:',
          items: [
            'Auskunftsrecht: Sie können uns kontaktieren und Einsicht in die über Sie in unserer Datenbank gespeicherten Daten verlangen.',
            'Recht auf Berichtigung/Löschung: Wenn Sie feststellen, dass Daten unrichtig, unvollständig oder veraltet sind, können Sie deren Berichtigung oder Löschung verlangen.',
          ],
        },
        { text: `Zur Ausübung dieser Rechte kontaktieren Sie uns unter der E-Mail-Adresse: ${FACILITY_INFO.contact.email}` },
      ],
    },
    {
      id: 'security',
      number: '6',
      title: 'Informationssicherheit',
      clauses: [
        {
          text: 'Die Website wird auf den Servern von Wix gehostet und nutzt anerkannte Sicherheitsmaßnahmen. Ein absoluter Schutz vor unbefugtem Zugriff auf Computersysteme kann jedoch nicht garantiert werden.',
        },
      ],
    },
    {
      id: 'checkout-data',
      number: '7',
      title: 'Zusätzliche Angaben bei Ihrer Bestellung',
      added: true,
      clauses: [
        {
          term: 'Buchungsdaten:',
          text: 'Zusätzlich zu den Angaben in Abschnitt 2 erfragt das Buchungsformular die für die Vorbereitung der Session erforderlichen Daten, einschließlich der Teilnehmerdaten gemäß Formular.',
          added: true,
        },
        {
          term: 'Geburtsdatum:',
          text: 'Wird ein Geburtsdatum für den Geburtstagsrabatt angegeben, verwenden wir es ausschließlich zur Prüfung, ob der Rabatt gilt. Wir nutzen es für keinen anderen Zweck und speichern nur die dafür erforderlichen Angaben.',
          added: true,
        },
        {
          term: 'Einwilligungsnachweis:',
          text: 'Beim Ankreuzen der Einwilligungen im Checkout (Regeln, Datenschutzerklärung und Medienfreigabe) wird bei der Bestellung gespeichert, welche Versionen angezeigt wurden, wann sie angekreuzt wurden und welche Einwilligungen erteilt wurden (siehe Ziffer 15 der Regeln).',
          added: true,
        },
        {
          term: 'Erstattungsanträge:',
          text: 'Wird ein Erstattungsantrag über das Formular eingereicht, werden die eingegebenen Daten (wie Bestellung, Kontaktdaten und Antragsgrund) erhoben. Sie dienen ausschließlich der Bearbeitung und Beantwortung des Antrags und werden beim Bestellvorgang aufbewahrt.',
          added: true,
        },
        {
          term: 'Anfragen zum Theoriekurs (Ground School):',
          text: 'Wenn Sie Informationen zur Anmeldung für die Ground School anfordern, erfassen wir zudem den gewählten Theoriepfad, das Lernformat und gewünschte Themen. Dies dient nur zur Beantwortung Ihrer Anfrage; eine Anfrage ist weder eine Anmeldung noch eine Zahlung.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'photos-and-video',
      number: '8',
      title: 'Fotos und Videos',
      added: true,
      clauses: [
        {
          text: 'Die Regeln (Ziffern 6.4, 7.8 und 14) beschreiben Filmaufnahmen und die Nutzung der Materialien im Zentrum. Fotos, Videos und Audioaufnahmen, auf denen eine Person erscheint, sind personenbezogene Daten und werden für die Zwecke gemäß Ziffer 14.2 der Regeln genutzt. Sie können gemäß Ziffer 6.4 schriftlich darum bitten, nicht gefilmt zu werden, und die Rechte aus Abschnitt 5 oben ausüben.',
          added: true,
        },
      ],
    },
    {
      id: 'cookies',
      number: '9',
      title: 'Cookies und lokaler Speicher',
      added: true,
      clauses: [
        {
          term: 'Lokaler Speicher:',
          text: 'Die Website speichert Ihre Sprach- und Darstellungspräferenzen im lokalen Speicher Ihres Browsers auf Ihrem Gerät. Normales öffentliches Surfen setzt kein Sprach-Cookie. Einige Funktionen speichern kurzlebige Werte im Session Storage des Tabs, z. B. für eine Mitgliederanmeldung oder einen auf der Bestätigungsseite angezeigten Gutschein.',
          added: true,
        },
        {
          term: 'Cookies:',
          text: 'Die Website setzt standardmäßig keine Analyse- oder Werbe-Cookies. Die genutzten Konto-, Buchungs- oder Zahlungsanbieter können gemäß ihren eigenen Richtlinien notwendige Cookies setzen.',
          added: true,
        },
        {
          term: 'Statistik- und Werbetools:',
          text: 'Sofern Statistik- oder Werbetools aktiviert sind (z. B. von Google oder Meta, wie in Abschnitt 4 erwähnt), werden sie erst nach Ihrer Einwilligung geladen. Sie können Ihre Auswahl jederzeit über den Link „Cookie-Einstellungen“ am Seitenende ändern sowie den lokalen Speicher und Cookies in Ihren Browsereinstellungen löschen.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'version',
      number: '10',
      title: 'Version dieser Richtlinie',
      added: true,
      clauses: [
        {
          text: 'Das Versionsdatum steht oben auf der Seite. Bei jeder Änderung der Richtlinie oder der Regeln wird das Datum aktualisiert, und eine Bestellung behält die beim Checkout angezeigte Version.',
          added: true,
        },
      ],
    },
  ],
};

export default PRIVACY_DE;
