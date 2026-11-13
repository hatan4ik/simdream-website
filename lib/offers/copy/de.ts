import type { OffersCopy } from './types';

export const OFFERS_COPY_DE: OffersCopy = {
  heroEyebrow: 'Angebote & Vorteile',
  heroTitle: 'Angebote & Vorteile',
  heroLead: 'Jedes Angebot auf einen Blick: was Sie erhalten, wann es gilt und womit es nicht kombinierbar ist.',
  jumpBirthday: 'Geburtstagsangebot',
  jumpMore: 'Weitere Angebote',
  jumpTerms: 'Bedingungen',

  birthdayEyebrow: 'Geburtstagsangebot',
  birthdayTitle: 'Im Geburtstagsmonat fliegen und {percent}% sparen',
  birthdayLead:
    'Ein Geburtstag ist der beste Anlass für den Kapitänssitz. Auf jeden Flug in Ihrem Geburtstagsmonat erhalten Sie {percent}% Rabatt – ebenso auf einen Flug bis {days} Tage nach Ihrem Geburtstag.',
  birthdayUnavailable:
    'Der Geburtstagsrabatt wird beim Checkout noch nicht automatisch abgezogen. Unten können Sie bereits prüfen, ob Ihr Termin qualifiziert ist.',
  stepsTitle: 'So funktioniert es',
  steps: [
    {
      title: 'Geburtsdatum eingeben',
      body: 'Geben Sie im Checkout unter „Daten des Pilot in Command“ das Geburtsdatum der Person ein, die fliegen wird.',
    },
    {
      title: 'Flugdatum wählen',
      body: 'Jeder Flug in Ihrem Geburtstagsmonat qualifiziert sich – ebenso jeder Flug bis {days} Tage nach Ihrem Geburtstag.',
    },
    {
      title: 'Vor der Zahlung sehen',
      body: 'Die {percent}% werden vom gesamten Flugbetrag inklusive Extras abgezogen und als eigene Zeile in der Übersicht angezeigt.',
    },
  ],
  exampleTitle: 'Ein Rechenbeispiel',
  exampleBody: 'Der {flight} kostet regulär {regular}. In Ihrem Geburtstagsmonat zahlen Sie {total}: {saving} weniger.',
  whenTitle: 'Welche Flüge qualifizieren sich?',
  whenBody:
    'Entscheidend ist das Datum Ihres Fluges, nicht der Buchungstag. Jeder Flug im Geburtstagsmonat sowie bis zu {days} Tage nach Ihrem Geburtstag qualifiziert sich, sodass ein Geburtstag am Monatsende nie verloren geht.',

  calcTitle: 'Meinen Geburtstag prüfen',
  calcIntro: 'Geben Sie Geburtsdatum und Flugdatum ein, um zu sehen, ob das Angebot gilt und wie viel Sie sparen.',
  birthLabel: 'Geburtsdatum',
  flightLabel: 'Flugdatum',
  calcPrivacy: 'Diese Prüfung läuft direkt in Ihrem Browser. Ihre Eingaben werden weder gespeichert noch gesendet.',
  calcPrompt: 'Geben Sie beide Daten ein, um das Ergebnis zu sehen.',
  resultSameMonth: 'Ja. Ihr Geburtstag liegt im Monat dieses Fluges, daher gelten {percent}% Rabatt.',
  resultGraceBefore:
    'Ja. Ihr Geburtstag war kurz vor diesem Flug innerhalb der {lookback}-Tage-Frist, daher gelten {percent}% Rabatt.',
  resultGraceAfter: 'Ja. Ihr Geburtstag liegt kurz nach diesem Flug, daher gelten {percent}% Rabatt.',
  resultNone: 'Nicht für dieses Datum. Für diesen Geburtstag qualifizieren sich Flüge vom {start} bis {end}.',
  resultWindow: 'Qualifizierte Flugdaten: {start} bis {end}.',
  tableCaption: 'Ihr Preis mit dem Geburtstagsrabatt',
  colRegular: 'Regulärer Preis',
  colWithBirthday: 'Mit Geburtstagsrabatt',

  moreTitle: 'Weitere Angebote',
  moreLead: 'Jedes Angebot gilt für sich allein. Angebote sind nicht miteinander kombinierbar.',
  daytimeBody: 'Ein {minutes}-Minuten-Flug zum Sonderpreis von {price}.',
  daytimeCta: 'Diesen Flug buchen',
  tracksTitle: 'Flugprogramme',
  tracksBody: 'Zahlen Sie einmalig für ein Programm aus kapitänsgeführten Flügen und sparen Sie bis zu {percent}% gegenüber Einzelflügen.',
  tracksCta: 'Flugprogramme ansehen',
  proTracksTitle: 'Profi-Programme',
  proTracksBody: 'Mehrteilige Airline-Interview-Vorbereitungsprogramme sparen {min}% bis {max}% gegenüber Einzelsessions.',
  proTracksCta: 'Profi-Programme ansehen',
  vouchersTitle: 'Geschenkgutscheine & Geschenkkarten',
  vouchersBody: 'Verschenken Sie einen Flug als digitalen Gutschein oder eine Geschenkkarte von {min} bis {max}.',
  vouchersCta: 'Geschenkoptionen ansehen',

  termsTitle: 'Das Kleingedruckte',
  terms: [
    'Immer nur ein Angebot: Angebote sind nicht kombinierbar. Der Geburtstagsrabatt gilt nicht für den vergünstigten Aktionsflug, für Flüge aus einem Flugprogramm oder für den Kauf eines Geschenkgutscheins.',
    'Die Zahlung mit einem Geschenkgutschein oder einer Geschenkkarte ist ein Zahlungsmittel, kein Angebot. Zuerst wird der Geburtstagsrabatt abgezogen, den Rest deckt der Gutschein.',
    'Maßgeblich ist das Geburtsdatum des Pilot in Command, also der Person, die fliegt. Zutritt zum Simulator ab {minAge} Jahren – dieses Alter muss am Flugtag erreicht sein.',
    'Das Angebot richtet sich nach dem Flugdatum, nicht nach dem Buchungsdatum. Nur Flüge innerhalb Ihres Geburtstagsfensters qualifizieren sich.',
    'Der Rabatt gilt auf die Buchungssumme aus Flug und Extras. Ein Angebot reserviert keinen Termin: Buchen Sie frühzeitig Ihr Wunschfenster.',
    'Sim Dream kann ein Angebot nach eigenem Ermessen gemäß den Nutzungsbedingungen ändern oder beenden. Der Rechner auf dieser Seite läuft lokal in Ihrem Browser.',
  ],
  termsLink: 'Nutzungsbedingungen lesen',
  ctaTitle: 'Bereit für den Kapitänssitz?',
  ctaBody: 'Wählen Sie Ihren Flug und Ihren Wunschtermin im Buchungskalender.',
  ctaButton: 'Flug buchen',
};
