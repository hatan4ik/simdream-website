export interface OffersStep {
  title: string;
  body: string;
}

/**
 * Every string on /offers for one language. Numbers are placeholders filled from the registries and the
 * birthday constants ({percent}, {days}, {lookback}, {minAge}, {flight}, {regular}, {total}, {saving},
 * {minutes}, {price}, {min}, {max}, {start}, {end}); no price or percentage is typed in a sentence.
 */
export interface OffersCopy {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  jumpBirthday: string;
  jumpMore: string;
  jumpTerms: string;

  birthdayEyebrow: string;
  birthdayTitle: string;
  birthdayLead: string;
  /** Shown instead of a promise while the live checkout path cannot apply the discount. */
  birthdayUnavailable: string;
  stepsTitle: string;
  steps: [OffersStep, OffersStep, OffersStep];
  exampleTitle: string;
  exampleBody: string;
  whenTitle: string;
  whenBody: string;

  calcTitle: string;
  calcIntro: string;
  birthLabel: string;
  flightLabel: string;
  calcPrivacy: string;
  calcPrompt: string;
  resultSameMonth: string;
  resultGraceBefore: string;
  resultGraceAfter: string;
  resultNone: string;
  resultWindow: string;
  tableCaption: string;
  colRegular: string;
  colWithBirthday: string;

  moreTitle: string;
  moreLead: string;
  daytimeBody: string;
  daytimeCta: string;
  tracksTitle: string;
  tracksBody: string;
  tracksCta: string;
  proTracksTitle: string;
  proTracksBody: string;
  proTracksCta: string;
  vouchersTitle: string;
  vouchersBody: string;
  vouchersCta: string;

  termsTitle: string;
  terms: [string, string, string, string, string, string];
  termsLink: string;
  ctaTitle: string;
  ctaBody: string;
  ctaButton: string;
}
