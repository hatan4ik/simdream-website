import type { SupportedLanguage } from '@/lib/i18n/translations';
import { BIRTHDAY_DISCOUNT_PERCENT, BIRTHDAY_MIN_PILOT_AGE_YEARS } from './constants';
import type { BirthdayDateError, BirthdayReason } from './evaluate';

/**
 * Copy the checkout (and anything else that talks about the birthday discount) reuses, in all six
 * languages. Numbers are placeholders filled from the constants, never typed in a sentence.
 * Strings are resolved with `copy[language] || copy.en`, never by text direction.
 */

export interface BirthdayCheckoutCopy {
  /** Link label that points to /offers#birthday. */
  linkLabel: string;
  /** Congratulations banner shown at checkout while the discount applies. */
  bannerTitle: string;
  bannerSameMonth: string;
  bannerGraceBefore: string;
  bannerGraceAfter: string;
  /** Price-summary line for the amount taken off. */
  discountLine: string;
  /** The "Pilot in Command Details" date-of-birth field. */
  fieldLabel: string;
  fieldHint: string;
  required: string;
  invalid: string;
  future: string;
  tooYoung: string;
  tooOld: string;
  /** The signed Wix proof could not be issued, so checkout must stop safely. */
  pricingUnavailable: string;
  /** A valid date that earns nothing on this flight date. */
  notEligible: string;
}

export const BIRTHDAY_CHECKOUT_COPY: Record<SupportedLanguage, BirthdayCheckoutCopy> = {
  en: {
    linkLabel: 'How does the birthday discount work?',
    bannerTitle: 'Happy birthday, Captain.',
    bannerSameMonth: 'Your birthday month takes {percent}% off this flight. It is already applied below.',
    bannerGraceBefore: 'Your birthday was only days ago, so your {percent}% still applies. It is already applied below.',
    bannerGraceAfter: 'Your birthday is just around the corner, so your {percent}% applies to this flight. It is already applied below.',
    discountLine: 'Birthday discount ({percent}%)',
    fieldLabel: 'Pilot in Command date of birth',
    fieldHint: 'The person who will fly. We use it to check the birthday offer and keep only the day and month.',
    required: 'Please enter the date of birth of the Pilot in Command.',
    invalid: 'Please enter a valid date of birth.',
    future: 'The date of birth cannot be in the future.',
    tooYoung: 'The Pilot in Command must be at least {minAge} years old on the flight date.',
    tooOld: 'Please check the year: this date of birth does not look right.',
    pricingUnavailable: 'Birthday pricing could not be verified. Please try again.',
    notEligible: 'No birthday discount applies to this flight date.',
  },
  he: {
    linkLabel: 'איך עובדת הנחת יום ההולדת?',
    bannerTitle: 'יום הולדת שמח, קברניט.',
    bannerSameMonth: 'חודש יום ההולדת שלך מזכה ב-{percent}% הנחה על הטיסה הזו. ההנחה כבר מופחתת בסיכום למטה.',
    bannerGraceBefore: 'יום ההולדת שלך היה לפני ימים ספורים, ולכן ההנחה של {percent}% עדיין בתוקף. היא כבר מופחתת בסיכום למטה.',
    bannerGraceAfter: 'יום ההולדת שלך ממש בפתח, ולכן {percent}% הנחה חלים על הטיסה הזו. ההנחה כבר מופחתת בסיכום למטה.',
    discountLine: 'הנחת יום הולדת ({percent}%)',
    fieldLabel: 'תאריך לידה של הטייס המפקד',
    fieldHint: 'מי שיטוס בפועל. אנו משתמשים בו כדי לבדוק את הטבת יום ההולדת ושומרים רק את היום והחודש.',
    required: 'נא להזין את תאריך הלידה של הטייס המפקד.',
    invalid: 'נא להזין תאריך לידה תקין.',
    future: 'תאריך הלידה לא יכול להיות בעתיד.',
    tooYoung: 'הטייס המפקד חייב להיות בן {minAge} לפחות ביום הטיסה.',
    tooOld: 'נא לבדוק את השנה: תאריך הלידה לא נראה תקין.',
    pricingUnavailable: 'לא ניתן היה לאמת את מחיר יום ההולדת. נסו שוב.',
    notEligible: 'אין הנחת יום הולדת בתאריך הטיסה הזה.',
  },
  ru: {
    linkLabel: 'Как работает скидка ко дню рождения?',
    bannerTitle: 'С днем рождения, командир.',
    bannerSameMonth: 'Месяц вашего дня рождения дает скидку {percent}% на этот полет. Она уже применена ниже.',
    bannerGraceBefore: 'Ваш день рождения был совсем недавно, поэтому скидка {percent}% еще действует. Она уже применена ниже.',
    bannerGraceAfter: 'Ваш день рождения совсем скоро, поэтому на этот полет действует скидка {percent}%. Она уже применена ниже.',
    discountLine: 'Скидка ко дню рождения ({percent}%)',
    fieldLabel: 'Дата рождения командира воздушного судна',
    fieldHint: 'Человек, который будет пилотировать. Мы используем дату для проверки предложения и сохраняем только день и месяц.',
    required: 'Укажите дату рождения командира воздушного судна.',
    invalid: 'Укажите корректную дату рождения.',
    future: 'Дата рождения не может быть в будущем.',
    tooYoung: 'Командиру воздушного судна должно быть не менее {minAge} лет на дату полета.',
    tooOld: 'Проверьте год: такая дата рождения выглядит неверной.',
    pricingUnavailable: 'Не удалось подтвердить цену ко дню рождения. Попробуйте ещё раз.',
    notEligible: 'На эту дату полета скидка ко дню рождения не действует.',
  },
  fr: {
    linkLabel: 'Comment fonctionne la remise anniversaire ?',
    bannerTitle: 'Joyeux anniversaire, Commandant.',
    bannerSameMonth: 'Votre mois d’anniversaire vous offre {percent} % de remise sur ce vol. Elle est déjà appliquée ci-dessous.',
    bannerGraceBefore: 'Votre anniversaire était il y a quelques jours : vos {percent} % restent valables. Ils sont déjà appliqués ci-dessous.',
    bannerGraceAfter: 'Votre anniversaire approche : vos {percent} % s’appliquent à ce vol. Ils sont déjà appliqués ci-dessous.',
    discountLine: 'Remise anniversaire ({percent} %)',
    fieldLabel: 'Date de naissance du commandant de bord',
    fieldHint: 'La personne qui pilotera. Nous l’utilisons pour vérifier l’offre anniversaire et ne conservons que le jour et le mois.',
    required: 'Saisissez la date de naissance du commandant de bord.',
    invalid: 'Saisissez une date de naissance valide.',
    future: 'La date de naissance ne peut pas être dans le futur.',
    tooYoung: 'Le commandant de bord doit avoir au moins {minAge} ans à la date du vol.',
    tooOld: 'Vérifiez l’année : cette date de naissance semble incorrecte.',
    pricingUnavailable: 'Le tarif anniversaire n’a pas pu être vérifié. Réessayez.',
    notEligible: 'Aucune remise anniversaire pour cette date de vol.',
  },
  ar: {
    linkLabel: 'كيف يعمل خصم عيد الميلاد؟',
    bannerTitle: 'عيد ميلاد سعيد أيها القبطان.',
    bannerSameMonth: 'شهر عيد ميلادك يمنحك خصم {percent}% على هذه الرحلة، وهو مطبق بالفعل أدناه.',
    bannerGraceBefore: 'مرّ عيد ميلادك قبل أيام قليلة، لذا ما زال خصم {percent}% ساريًا، وهو مطبق بالفعل أدناه.',
    bannerGraceAfter: 'عيد ميلادك على الأبواب، لذا ينطبق خصم {percent}% على هذه الرحلة، وهو مطبق بالفعل أدناه.',
    discountLine: 'خصم عيد الميلاد ({percent}%)',
    fieldLabel: 'تاريخ ميلاد قائد الطائرة',
    fieldHint: 'الشخص الذي سيقود الرحلة. نستخدمه للتحقق من عرض عيد الميلاد ونحتفظ باليوم والشهر فقط.',
    required: 'أدخل تاريخ ميلاد قائد الطائرة.',
    invalid: 'أدخل تاريخ ميلاد صحيحًا.',
    future: 'لا يمكن أن يكون تاريخ الميلاد في المستقبل.',
    tooYoung: 'يجب ألا يقل عمر قائد الطائرة عن {minAge} سنوات في تاريخ الرحلة.',
    tooOld: 'تحقق من السنة: لا يبدو تاريخ الميلاد هذا صحيحًا.',
    pricingUnavailable: 'تعذر التحقق من سعر عيد الميلاد. حاول مرة أخرى.',
    notEligible: 'لا ينطبق خصم عيد الميلاد على تاريخ الرحلة هذا.',
  },
  es: {
    linkLabel: '¿Cómo funciona el descuento de cumpleaños?',
    bannerTitle: 'Feliz cumpleaños, Capitán.',
    bannerSameMonth: 'Tu mes de cumpleaños te da un {percent}% de descuento en este vuelo. Ya está aplicado abajo.',
    bannerGraceBefore: 'Tu cumpleaños fue hace pocos días, así que tu {percent}% sigue vigente. Ya está aplicado abajo.',
    bannerGraceAfter: 'Tu cumpleaños está a la vuelta de la esquina, así que tu {percent}% se aplica a este vuelo. Ya está aplicado abajo.',
    discountLine: 'Descuento de cumpleaños ({percent}%)',
    fieldLabel: 'Fecha de nacimiento del piloto al mando',
    fieldHint: 'La persona que volará. La usamos para comprobar la oferta de cumpleaños y solo conservamos el día y el mes.',
    required: 'Introduce la fecha de nacimiento del piloto al mando.',
    invalid: 'Introduce una fecha de nacimiento válida.',
    future: 'La fecha de nacimiento no puede ser futura.',
    tooYoung: 'El piloto al mando debe tener al menos {minAge} años en la fecha del vuelo.',
    tooOld: 'Revisa el año: esta fecha de nacimiento no parece correcta.',
    pricingUnavailable: 'No se pudo verificar el precio de cumpleaños. Inténtalo de nuevo.',
    notEligible: 'No hay descuento de cumpleaños para esta fecha de vuelo.',
  },
  de: {
    linkLabel: 'Wie funktioniert der Geburtstagsrabatt?',
    bannerTitle: 'Alles Gute zum Geburtstag, Kapitän.',
    bannerSameMonth: 'Ihr Geburtstagsmonat schenkt Ihnen {percent}% Rabatt auf diesen Flug. Er ist unten bereits abgezogen.',
    bannerGraceBefore: 'Ihr Geburtstag war vor wenigen Tagen, daher gelten Ihre {percent}% noch. Sie sind unten bereits abgezogen.',
    bannerGraceAfter: 'Ihr Geburtstag steht kurz bevor, daher gelten {percent}% Rabatt für diesen Flug. Sie sind unten bereits abgezogen.',
    discountLine: 'Geburtstagsrabatt ({percent}%)',
    fieldLabel: 'Geburtsdatum des Pilot in Command',
    fieldHint: 'Die Person, die fliegen wird. Wir nutzen es zur Prüfung des Geburtstagsangebots und speichern nur Tag und Monat.',
    required: 'Bitte geben Sie das Geburtsdatum des Pilot in Command ein.',
    invalid: 'Bitte geben Sie ein gültiges Geburtsdatum ein.',
    future: 'Das Geburtsdatum darf nicht in der Zukunft liegen.',
    tooYoung: 'Der Pilot in Command muss am Flugdatum mindestens {minAge} Jahre alt sein.',
    tooOld: 'Bitte prüfen Sie das Jahr: Dieses Geburtsdatum wirkt unplausibel.',
    pricingUnavailable: 'Der Geburtstagspreis konnte nicht bestätigt werden. Bitte versuchen Sie es erneut.',
    notEligible: 'Für dieses Flugdatum gilt kein Geburtstagsrabatt.',
  },
};

/** Fills `{name}` placeholders; the birthday copy only ever needs the constants below. */
export function fillBirthdayTemplate(
  template: string,
  values: Record<string, string | number> = {}
): string {
  const all: Record<string, string | number> = {
    percent: BIRTHDAY_DISCOUNT_PERCENT,
    minAge: BIRTHDAY_MIN_PILOT_AGE_YEARS,
    ...values,
  };
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in all ? String(all[key]) : match));
}

/** The six-language copy for a language with the placeholders already filled. */
export function getBirthdayCheckoutCopy(language: SupportedLanguage): BirthdayCheckoutCopy {
  const copy = BIRTHDAY_CHECKOUT_COPY[language] || BIRTHDAY_CHECKOUT_COPY.en;
  return Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [key, fillBirthdayTemplate(value)])
  ) as unknown as BirthdayCheckoutCopy;
}

/** The congratulations banner text for an eligible evaluation, or null when nothing applies. */
export function getBirthdayBannerText(
  language: SupportedLanguage,
  reason: BirthdayReason
): { title: string; body: string } | null {
  const copy = getBirthdayCheckoutCopy(language);
  if (reason === 'same_month') return { title: copy.bannerTitle, body: copy.bannerSameMonth };
  if (reason === 'grace_before') return { title: copy.bannerTitle, body: copy.bannerGraceBefore };
  if (reason === 'grace_after') return { title: copy.bannerTitle, body: copy.bannerGraceAfter };
  return null;
}

/** The message for a date error from `evaluateBirthdayDiscount`. */
export function getBirthdayErrorText(language: SupportedLanguage, error: BirthdayDateError): string {
  const copy = getBirthdayCheckoutCopy(language);
  switch (error) {
    case 'invalid_birth_date':
    case 'invalid_flight_date':
      return copy.invalid;
    case 'birth_date_in_future':
      return copy.future;
    case 'pilot_too_young':
      return copy.tooYoung;
    case 'pilot_too_old':
      return copy.tooOld;
  }
}
