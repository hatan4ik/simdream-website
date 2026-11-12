import { LEGAL_PATHS } from './anchors';
import { REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION as MIN_DAYS, REFUND_WINDOW_DAYS as WINDOW } from './policy-constants';
import type { LegalLanguage } from './types';

/**
 * Checkout consent copy: the two mandatory, separate confirmations the checkout step renders before
 * payment, in all six languages.
 *
 * 1. Rules and privacy: acceptance of the rules, the refund-by-form rule (clause 13) and the privacy policy.
 * 2. Media release and waiver of claims (clause 14), with a plain-language summary and the full
 *    clause behind an expander (`loadMediaReleaseSectionHe()` from `./loaders`; the other five languages
 *    come from the client-only `./loaders-intl`).
 *
 * Wording rules: one plain sentence first, the full legal text on demand. The labels name their
 * links with `{rules}`, `{refunds}` and `{privacy}` tokens (see `splitConsentLabel`) so every
 * language can order the words naturally. NEEDS LEGAL REVIEW: the translations have not been
 * checked by counsel. Bump `CONSENT_VERSION` (./versions) whenever any string here changes.
 */

export interface ConsentCopy {
  heading: string;
  intro: string;
  rules: {
    /** Checkbox label containing the `{rules}`, `{refunds}` and `{privacy}` tokens. */
    label: string;
    linkRules: string;
    linkRefunds: string;
    linkPrivacy: string;
    /** One plain sentence under the checkbox. */
    summary: string;
    /** Accessible name of the checkbox (read by screen readers instead of the visual label). */
    ariaLabel: string;
    error: string;
  };
  media: {
    label: string;
    /** One plain sentence under the checkbox. */
    summary: string;
    /** Booker is 18 or over; a minor's parent or guardian consents on the child's behalf. */
    guardianNote: string;
    /** Reminder that the written opt-out of clause 6.4 stays available. */
    optOutNote: string;
    expand: string;
    collapse: string;
    fullTextTitle: string;
    loading: string;
    loadError: string;
    openOnPage: string;
    ariaLabel: string;
    error: string;
  };
  /** One line explaining that the version and time of the confirmations are stored with the order. */
  recordNote: string;
}

export type ConsentLinkKey = 'rules' | 'refunds' | 'privacy';

/** Where each token of the rules checkbox label points. */
export const CONSENT_LINKS: Record<ConsentLinkKey, string> = {
  rules: LEGAL_PATHS.rules,
  refunds: LEGAL_PATHS.refunds,
  privacy: LEGAL_PATHS.privacyPolicy,
};

/** Where the media release clause lives, for the "open on the rules page" link. */
export const MEDIA_RELEASE_PATH = LEGAL_PATHS.mediaRelease;

export type ConsentLabelPart = { type: 'text'; text: string } | { type: 'link'; key: ConsentLinkKey; text: string };

/**
 * Splits a rules checkbox label into text and link parts, so the checkout can render real links
 * inside the label. Unknown tokens stay as plain text.
 */
export function splitConsentLabel(copy: ConsentCopy['rules']): ConsentLabelPart[] {
  const linkText: Record<ConsentLinkKey, string> = {
    rules: copy.linkRules,
    refunds: copy.linkRefunds,
    privacy: copy.linkPrivacy,
  };
  return copy.label
    .split(/(\{(?:rules|refunds|privacy)\})/)
    .filter((part) => part !== '')
    .map((part): ConsentLabelPart => {
      const token = /^\{(rules|refunds|privacy)\}$/.exec(part);
      if (!token) return { type: 'text', text: part };
      const key = token[1] as ConsentLinkKey;
      return { type: 'link', key, text: linkText[key] };
    });
}

export const CONSENT_COPY: Record<LegalLanguage, ConsentCopy> = {
  en: {
    heading: 'Before you pay',
    intro: 'Two short confirmations are needed to complete your booking.',
    rules: {
      label: 'I accept the {rules}, the {refunds} and the {privacy}.',
      linkRules: 'rules and regulations',
      linkRefunds: 'refund-by-form rule',
      linkPrivacy: 'privacy policy',
      summary: `A full refund needs a request within ${WINDOW} days of ordering and at least ${MIN_DAYS} business days before your session, made through our online refund form only.`,
      ariaLabel: 'Accept the rules and regulations, the refund-by-form rule and the privacy policy',
      error: 'Please accept the rules, the refund rule and the privacy policy to continue.',
    },
    media: {
      label: 'I agree to the media release and waiver of claims (clause 14 of the rules).',
      summary:
        'Sim Dream may use photos, video and audio from your visit in its marketing, online and in print, without payment to you, and this agreement includes waiving claims over that use.',
      guardianNote:
        'By ticking this box you confirm that you are 18 or over. If a minor takes part, a parent or guardian consents on the minor’s behalf.',
      optOutNote: 'You can still ask in writing not to be filmed (clause 6.4).',
      expand: 'Read the full text',
      collapse: 'Hide the full text',
      fullTextTitle: 'Media release and waiver of claims',
      loading: 'Loading…',
      loadError: 'The full text could not be loaded. You can read it on the rules page.',
      openOnPage: 'Open on the rules page',
      ariaLabel: 'Agree to the media release and waiver of claims',
      error: 'Please agree to the media release and waiver of claims to continue.',
    },
    recordNote: 'We record the version and time of your confirmations with your order.',
  },
  he: {
    heading: 'לפני התשלום',
    intro: 'שתי הצהרות קצרות נדרשות להשלמת ההזמנה.',
    rules: {
      label: 'אני מסכים/ה ל{rules}, ל{refunds} ול{privacy}.',
      linkRules: 'תקנון ותנאי השימוש',
      linkRefunds: 'כלל בקשת ההחזר באמצעות הטופס',
      linkPrivacy: 'מדיניות הפרטיות',
      summary: `החזר כספי מלא מותנה בבקשה עד ${WINDOW} יום מההזמנה ולפחות ${MIN_DAYS} ימי עסקים לפני הסשן, והיא מוגשת אך ורק בטופס ההחזר המקוון שלנו.`,
      ariaLabel: 'אישור התקנון, כלל בקשת ההחזר באמצעות הטופס ומדיניות הפרטיות',
      error: 'יש לאשר את התקנון, כלל בקשת ההחזר ומדיניות הפרטיות כדי להמשיך.',
    },
    media: {
      label: 'אני מסכים/ה לצילום ולשימוש בתוצרים ולוויתור על תביעות (סעיף 14 בתקנון).',
      summary:
        'סימדרים רשאית להשתמש בתמונות, בסרטונים ובהקלטות מהביקור שלך בפרסום ובשיווק, באינטרנט ובדפוס, ללא תשלום, והסכמה זו כוללת ויתור על טענות בגין השימוש.',
      guardianNote: 'בסימון התיבה אני מצהיר/ה שאני מעל גיל 18. אם משתתף קטין, הורה או אפוטרופוס מסכים בשמו.',
      optOutNote: 'עדיין ניתן לבקש בכתב שלא לצלם (סעיף 6.4).',
      expand: 'לקריאת הנוסח המלא',
      collapse: 'הסתרת הנוסח המלא',
      fullTextTitle: 'הסכמה לצילום, שחרור מאחריות וויתור על זכויות',
      loading: 'טוען…',
      loadError: 'לא ניתן היה לטעון את הנוסח המלא. ניתן לקרוא אותו בעמוד התקנון.',
      openOnPage: 'פתיחה בעמוד התקנון',
      ariaLabel: 'אישור ההסכמה לצילום ולוויתור על תביעות',
      error: 'יש לאשר את ההסכמה לצילום ולוויתור על תביעות כדי להמשיך.',
    },
    recordNote: 'גרסת ההסכמה ומועדה נשמרים עם ההזמנה.',
  },
  ru: {
    heading: 'Перед оплатой',
    intro: 'Для завершения бронирования нужны два коротких подтверждения.',
    rules: {
      label: 'Я принимаю {rules}, {refunds} и {privacy}.',
      linkRules: 'правила и условия посещения',
      linkRefunds: 'правило о возврате через форму',
      linkPrivacy: 'политику конфиденциальности',
      summary: `Полный возврат возможен по запросу не позднее ${WINDOW} дней после заказа и не менее чем за ${MIN_DAYS} рабочих дня до сеанса; запрос подаётся только через нашу онлайн-форму.`,
      ariaLabel: 'Принять правила, правило о возврате через форму и политику конфиденциальности',
      error: 'Чтобы продолжить, примите правила, правило о возврате и политику конфиденциальности.',
    },
    media: {
      label: 'Я согласен(на) на съёмку и использование материалов и на отказ от претензий (пункт 14 правил).',
      summary:
        'Sim Dream вправе использовать фото, видео и аудио с вашего визита в рекламе и маркетинге, в интернете и в печати, без оплаты вам; согласие включает отказ от претензий в связи с таким использованием.',
      guardianNote:
        'Отмечая этот флажок, вы подтверждаете, что вам исполнилось 18 лет. Если участвует несовершеннолетний, согласие от его имени даёт родитель или опекун.',
      optOutNote: 'Вы по-прежнему можете письменно попросить не снимать вас (пункт 6.4).',
      expand: 'Прочитать полный текст',
      collapse: 'Скрыть полный текст',
      fullTextTitle: 'Согласие на съёмку и отказ от претензий',
      loading: 'Загрузка…',
      loadError: 'Не удалось загрузить полный текст. Его можно прочитать на странице правил.',
      openOnPage: 'Открыть на странице правил',
      ariaLabel: 'Согласиться на съёмку и отказ от претензий',
      error: 'Чтобы продолжить, подтвердите согласие на съёмку и отказ от претензий.',
    },
    recordNote: 'Версия и время ваших подтверждений сохраняются вместе с заказом.',
  },
  fr: {
    heading: 'Avant de payer',
    intro: 'Deux courtes confirmations sont nécessaires pour finaliser votre réservation.',
    rules: {
      label: 'J’accepte {rules}, {refunds} et {privacy}.',
      linkRules: 'le règlement et les conditions d’utilisation',
      linkRefunds: 'la règle de remboursement par formulaire',
      linkPrivacy: 'la politique de confidentialité',
      summary: `Un remboursement intégral se demande dans les ${WINDOW} jours suivant la commande et au moins ${MIN_DAYS} jours ouvrables avant votre session, uniquement via notre formulaire en ligne.`,
      ariaLabel: 'Accepter le règlement, la règle de remboursement par formulaire et la politique de confidentialité',
      error: 'Veuillez accepter le règlement, la règle de remboursement et la politique de confidentialité pour continuer.',
    },
    media: {
      label: 'J’accepte l’autorisation de captation d’images et la renonciation à toute réclamation (article 14 du règlement).',
      summary:
        'Sim Dream peut utiliser les photos, vidéos et enregistrements sonores de votre visite dans sa communication, en ligne et sur papier, sans rémunération, et cet accord inclut la renonciation à toute réclamation liée à cet usage.',
      guardianNote:
        'En cochant cette case, vous confirmez avoir 18 ans ou plus. Si un mineur participe, un parent ou tuteur consent en son nom.',
      optOutNote: 'Vous pouvez toujours demander par écrit à ne pas être filmé (article 6.4).',
      expand: 'Lire le texte complet',
      collapse: 'Masquer le texte complet',
      fullTextTitle: 'Autorisation de captation d’images et renonciation à toute réclamation',
      loading: 'Chargement…',
      loadError: 'Le texte complet n’a pas pu être chargé. Vous pouvez le lire sur la page du règlement.',
      openOnPage: 'Ouvrir sur la page du règlement',
      ariaLabel: 'Accepter l’autorisation de captation d’images et la renonciation à toute réclamation',
      error: 'Veuillez accepter l’autorisation de captation d’images et la renonciation à toute réclamation pour continuer.',
    },
    recordNote: 'La version et l’heure de vos confirmations sont enregistrées avec votre commande.',
  },
  ar: {
    heading: 'قبل الدفع',
    intro: 'نحتاج إلى تأكيدين قصيرين لإتمام حجزك.',
    rules: {
      label: 'أوافق على {rules} و{refunds} و{privacy}.',
      linkRules: 'اللائحة وشروط الاستخدام',
      linkRefunds: 'قاعدة طلب الاسترداد عبر النموذج',
      linkPrivacy: 'سياسة الخصوصية',
      summary: `يتطلب الاسترداد الكامل تقديم الطلب خلال ${WINDOW} يوماً من تاريخ الطلب وقبل موعد الجلسة بما لا يقل عن ${MIN_DAYS} أيام عمل، عبر نموذجنا الإلكتروني فقط.`,
      ariaLabel: 'الموافقة على اللائحة وقاعدة طلب الاسترداد عبر النموذج وسياسة الخصوصية',
      error: 'يرجى الموافقة على اللائحة وقاعدة الاسترداد وسياسة الخصوصية للمتابعة.',
    },
    media: {
      label: 'أوافق على التصوير واستخدام المواد والتنازل عن المطالبات (البند 14 من اللائحة).',
      summary:
        'يجوز لشركة Sim Dream استخدام الصور ومقاطع الفيديو والتسجيلات الصوتية من زيارتك في دعايتها وتسويقها، عبر الإنترنت وفي المطبوعات، دون مقابل لك، وتتضمن هذه الموافقة التنازل عن المطالبات المتعلقة بهذا الاستخدام.',
      guardianNote:
        'بتحديد هذه الخانة تؤكد أنك بلغت 18 عاماً أو أكثر. وإذا شارك قاصر، يوافق أحد والديه أو وصيّه نيابةً عنه.',
      optOutNote: 'ويمكنك دائماً أن تطلب كتابةً عدم تصويرك (البند 6.4).',
      expand: 'قراءة النص الكامل',
      collapse: 'إخفاء النص الكامل',
      fullTextTitle: 'الموافقة على التصوير والتنازل عن المطالبات',
      loading: 'جارٍ التحميل…',
      loadError: 'تعذّر تحميل النص الكامل. يمكنك قراءته في صفحة اللائحة.',
      openOnPage: 'فتح في صفحة اللائحة',
      ariaLabel: 'الموافقة على التصوير والتنازل عن المطالبات',
      error: 'يرجى الموافقة على التصوير والتنازل عن المطالبات للمتابعة.',
    },
    recordNote: 'يُحفظ إصدار تأكيداتك ووقتها مع طلبك.',
  },
  es: {
    heading: 'Antes de pagar',
    intro: 'Necesitamos dos confirmaciones breves para completar tu reserva.',
    rules: {
      label: 'Acepto {rules}, {refunds} y {privacy}.',
      linkRules: 'las normas y condiciones de uso',
      linkRefunds: 'la regla de reembolso mediante formulario',
      linkPrivacy: 'la política de privacidad',
      summary: `Para un reembolso total, la solicitud debe hacerse en los ${WINDOW} días siguientes a la reserva y al menos ${MIN_DAYS} días hábiles antes de tu sesión, solo a través de nuestro formulario en línea.`,
      ariaLabel: 'Aceptar las normas, la regla de reembolso mediante formulario y la política de privacidad',
      error: 'Acepta las normas, la regla de reembolso y la política de privacidad para continuar.',
    },
    media: {
      label: 'Acepto la autorización de imagen y la renuncia a reclamaciones (cláusula 14 de las normas).',
      summary:
        'Sim Dream puede usar las fotos, los vídeos y el audio de tu visita en su publicidad y marketing, en línea y en papel, sin pago para ti, y este consentimiento incluye la renuncia a reclamaciones por ese uso.',
      guardianNote:
        'Al marcar esta casilla confirmas que tienes 18 años o más. Si participa un menor, su madre, padre o tutor consiente en su nombre.',
      optOutNote: 'Sigues pudiendo pedir por escrito que no se te grabe (cláusula 6.4).',
      expand: 'Leer el texto completo',
      collapse: 'Ocultar el texto completo',
      fullTextTitle: 'Autorización de imagen y renuncia a reclamaciones',
      loading: 'Cargando…',
      loadError: 'No se pudo cargar el texto completo. Puedes leerlo en la página de normas.',
      openOnPage: 'Abrir en la página de normas',
      ariaLabel: 'Aceptar la autorización de imagen y la renuncia a reclamaciones',
      error: 'Acepta la autorización de imagen y la renuncia a reclamaciones para continuar.',
    },
    recordNote: 'La versión y la hora de tus confirmaciones se guardan con tu reserva.',
  },
};

export function getConsentCopy(language: string): ConsentCopy {
  return CONSENT_COPY[language as LegalLanguage] ?? CONSENT_COPY.en;
}
