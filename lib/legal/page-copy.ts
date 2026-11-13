import { FACILITY_INFO } from '@/lib/config/facility-info';
import type { LegalLanguage } from './types';

/**
 * Interface copy of the `/rules` and `/privacy-policy` pages (header, highlight cards, notices,
 * table-of-contents label, contact box) in all six languages. The long clause text is not here:
 * it lives in `lib/legal/content/*` and is loaded per language.
 */

export interface RulesPageCopy {
  badge: string;
  title: string;
  /** Legal entity name(s) and registration number, in the script of the page language. */
  legalLine: string;
  address: string;
  versionLabel: string;
  tocLabel: string;
  loading: string;
  /** Shown to ru, fr, ar and es visitors, whose long rules body is the official English version. */
  translationNotice: string | null;
  ageBadge: string;
  ageTitle: string;
  ageDesc: string;
  arrivalBadge: string;
  arrivalTitle: string;
  arrivalDesc: string;
  natureBadge: string;
  natureTitle: string;
  natureDesc: string;
  contactQuestion: string;
  privacyLink: string;
}

export interface PrivacyPageCopy {
  badge: string;
  title: string;
  /** Legal entity name(s) and registration number, in the script of the page language. */
  legalLine: string;
  address: string;
  versionLabel: string;
  tocLabel: string;
  loading: string;
  contactOfficer: string;
  rulesLink: string;
}

const { companyRegistrationNumber: REG, legalNameHe, legalNameEn, address, contact } = FACILITY_INFO;

/** The Hebrew name appears only on the Hebrew page; every other language shows the Latin-script legal name. */
const legalLineHe = `${legalNameHe} • ${legalNameEn} • ח.פ. ${REG}`;
const legalLineLatin = `${legalNameEn} • Reg. ${REG}`;
const legalLineRu = `${legalNameEn} • Рег. номер: ${REG}`;
const legalLineFr = `${legalNameEn} • N° d'enregistrement : ${REG}`;
const legalLineAr = `${legalNameEn} • رقم التسجيل: ${REG}`;
const legalLineEs = `${legalNameEn} • Registro: ${REG}`;
const legalLineDe = `${legalNameEn} • Reg.-Nr.: ${REG}`;
const LEGAL_LINES = { he: legalLineHe, en: legalLineLatin, ru: legalLineRu, fr: legalLineFr, ar: legalLineAr, es: legalLineEs, de: legalLineDe };

export const RULES_PAGE_COPY: Record<LegalLanguage, RulesPageCopy> = {
  en: {
    badge: 'OFFICIAL FACILITY RULES & TERMS OF USE',
    title: 'Facility Rules, Terms & Conditions — Sim Dream Israel',
    legalLine: LEGAL_LINES.en,
    address: `Facility Address: ${address.streetEn}, ${address.cityEn} | Official Domains: simdream.co.il, simdream.aero`,
    versionLabel: 'Version',
    tocLabel: 'Contents',
    loading: 'Loading the full text…',
    translationNotice: null,
    ageBadge: 'Age Requirements',
    ageTitle: 'Simulator Entry: Age 10+',
    ageDesc: 'Participants aged 10–15 require adult supervision. Online booking & payment require age 18+.',
    arrivalBadge: 'Arrival & Punctuality',
    arrivalTitle: 'Arrive 5 Minutes Before Slot',
    arrivalDesc:
      'Delays over 10 minutes may result in a shortened session (without refund for lost time) or rescheduling fees.',
    natureBadge: 'Nature of Service',
    natureTitle: 'Experiential Facility & Briefing',
    natureDesc:
      'Session duration includes pre-flight briefing. The simulator is an entertainment facility, not for official licensing.',
    contactQuestion: 'Questions Regarding Facility Rules or an Existing Booking?',
    privacyLink: 'View Privacy Policy →',
  },
  he: {
    badge: 'תקנון ותנאי שימוש רשמיים • SIM DREAM ISRAEL',
    title: 'תקנון ותנאי שימוש – סימדרים ישראל',
    legalLine: LEGAL_LINES.he,
    address: `כתובת המרכז: ${address.streetHe}, ${address.cityHe} | אתרים רשמיים: simdream.co.il, simdream.aero`,
    versionLabel: 'גרסה',
    tocLabel: 'תוכן העניינים',
    loading: 'טוען את הנוסח המלא…',
    translationNotice: null,
    ageBadge: 'גילאים וליווי מבוגר',
    ageTitle: 'כניסה לסימולטור מגיל 10+',
    ageDesc: 'ילדים בגילאי 10–15 מחויבים בליווי מבוגר. ביצוע הזמנה ותשלום באתר מגיל 18 ומעלה.',
    arrivalBadge: 'הגעה ואיחורים',
    arrivalTitle: 'הגעה 5 דקות לפני תחילת הסשן',
    arrivalDesc:
      'איחור העולה על 10 דקות עלול לגרור קיצור של זמן הסשן (ללא החזר כספי) או דחיית המועד בכפוף לדמי שינוי.',
    natureBadge: 'אופי השירות והתדריך',
    natureTitle: 'מתקן חוויה ובידור בליווי מדריך',
    natureDesc:
      'משך השירות כולל תדריך מקדים בתא הטייס. הסימולטור הוא מתקן בידור ואינו מיועד להכשרה מקצועית או רישוי.',
    contactQuestion: 'שאלות לגבי התקנון או הזמנה קיימת?',
    privacyLink: 'למדיניות הפרטיות ←',
  },
  ru: {
    badge: 'ОФИЦИАЛЬНЫЙ РЕГЛАМЕНТ И ПРАВИЛА • SIM DREAM ISRAEL',
    title: 'Правила и условия посещения — Sim Dream Israel',
    legalLine: LEGAL_LINES.ru,
    address: `Адрес: ${address.streetEn}, Тель-Авив | Официальные сайты: simdream.co.il, simdream.aero`,
    versionLabel: 'Версия',
    tocLabel: 'Содержание',
    loading: 'Загрузка полного текста…',
    translationNotice:
      'Официальный регламент и правила центра SimDream (Израиль) юридически зафиксированы на иврите и английском языках в соответствии с законодательством Государства Израиль. Пункты 1–12 и приложение ниже приведены в официальной английской версии; пункты 13–15 — на вашем языке.',
    ageBadge: 'Возрастные ограничения',
    ageTitle: 'Вход в симулятор: от 10 лет и старше',
    ageDesc: 'Посетители от 10 до 15 лет допускаются в сопровождении взрослого. Онлайн-бронирование — с 18 лет.',
    arrivalBadge: 'Время прибытия',
    arrivalTitle: 'Прибытие за 5 минут до начала сессии',
    arrivalDesc:
      'Опоздание более чем на 10 минут может привести к сокращению времени сессии или переносу слота.',
    natureBadge: 'Формат услуги',
    natureTitle: 'Интерактивный опыт с пилотом-инструктором',
    natureDesc:
      'Включает предполетный брифинг. Симулятор является развлекательным комплексом и не выдает лицензий.',
    contactQuestion: 'Вопросы по регламенту посещения или существующей брони?',
    privacyLink: 'Политика конфиденциальности →',
  },
  fr: {
    badge: 'RÈGLEMENT OFFICIEL DU CENTRE • SIM DREAM ISRAEL',
    title: 'Règlement Intérieur et Conditions Générales — Sim Dream Israel',
    legalLine: LEGAL_LINES.fr,
    address: `Adresse : ${address.streetEn}, Tel Aviv | Domaines officiels : simdream.co.il, simdream.aero`,
    versionLabel: 'Version',
    tocLabel: 'Sommaire',
    loading: 'Chargement du texte complet…',
    translationNotice:
      'Le règlement officiel et les conditions d’utilisation de SimDream Israël sont juridiquement établis en hébreu et en anglais conformément à la législation israélienne. Les articles 1 à 12 et l’annexe sont présentés ci-dessous dans la version officielle en anglais ; les articles 13 à 15 sont dans votre langue.',
    ageBadge: 'Conditions d’âge',
    ageTitle: 'Accès au simulateur : dès 10 ans et plus',
    ageDesc: 'Les participants de 10 à 15 ans doivent être accompagnés d’un adulte. Réservation dès 18 ans.',
    arrivalBadge: 'Arrivée et ponctualité',
    arrivalTitle: 'Arrivée 5 minutes avant l’horaire',
    arrivalDesc:
      'Tout retard supérieur à 10 minutes peut entraîner l’écourtement de la session ou des frais de report.',
    natureBadge: 'Nature du service',
    natureTitle: 'Centre expérientiel avec instructeur',
    natureDesc:
      'La durée inclut le briefing en cabine. Le simulateur est une expérience de divertissement sans visée de brevet officiel.',
    contactQuestion: 'Des questions concernant le règlement ou une réservation ?',
    privacyLink: 'Politique de Confidentialité →',
  },
  ar: {
    badge: 'اللائحة الرسمية وشروط الاستخدام • SIM DREAM ISRAEL',
    title: 'شروط الاستخدام واللوائح الرسمية — سيم دريم إسرائيل',
    legalLine: LEGAL_LINES.ar,
    address: `العنوان: ${address.streetEn}، تل أبيب | المواقع الرسمية: simdream.co.il, simdream.aero`,
    versionLabel: 'الإصدار',
    tocLabel: 'المحتويات',
    loading: 'جارٍ تحميل النص الكامل…',
    translationNotice:
      'تخضع اللائحة الرسمية وشروط الاستخدام لمركز سيم دريم للقانون الإسرائيلي باللغتين العبرية والإنجليزية. وتُعرض البنود من 1 إلى 12 والملحق أدناه بالنسخة الرسمية باللغة الإنجليزية، أما البنود من 13 إلى 15 فهي بلغتك.',
    ageBadge: 'شروط العمر والمرافقة',
    ageTitle: 'دخول قمرة المحاكاة: من عمر 10 سنوات فما فوق',
    ageDesc: 'المشاركون بين 10 و15 عاماً يشترط مرافقة شخص بالغ. الحجز والدفع متاحان لمن هم في سن 18 فما فوق.',
    arrivalBadge: 'الوصول والمواعيد',
    arrivalTitle: 'الوصول قبل 5 دقائق من الموعد',
    arrivalDesc:
      'التأخير لأكثر من 10 دقائق قد يؤدي إلى تقليص وقت الجلسة دون تعويض أو إعادة جدولتها برسوم.',
    natureBadge: 'طبيعة الخدمة',
    natureTitle: 'تجربة طيران ترفيهية بإشراف مدرب',
    natureDesc:
      'تشمل مدة الجلسة إيجازاً تعريفياً مسبقاً. المحاكي مخصص للتجربة والترفيه ولا يعد ترخيصاً رسمياً.',
    contactQuestion: 'هل لديك استفسارات بخصوص اللائحة أو حجز قائم؟',
    privacyLink: 'سياسة الخصوصية ←',
  },
  es: {
    badge: 'NORMAS OFICIALES Y CONDICIONES DE USO • SIM DREAM ISRAEL',
    title: 'Normas del centro y condiciones de uso — Sim Dream Israel',
    legalLine: LEGAL_LINES.es,
    address: `Dirección del centro: ${address.streetEn}, ${address.cityEn} | Dominios oficiales: simdream.co.il, simdream.aero`,
    versionLabel: 'Versión',
    tocLabel: 'Contenido',
    loading: 'Cargando el texto completo…',
    translationNotice:
      'Las normas y condiciones de Sim Dream se rigen legalmente por las versiones en hebreo e inglés conforme a la legislación israelí. Las cláusulas 1 a 12 y el anexo se muestran a continuación en la versión oficial en inglés; las cláusulas 13 a 15 están en tu idioma.',
    ageBadge: 'Requisitos de edad',
    ageTitle: 'Acceso al simulador a partir de 10 años',
    ageDesc: 'Las personas de 10 a 15 años deben estar acompañadas por un adulto. La reserva y el pago online requieren ser mayor de 18 años.',
    arrivalBadge: 'Llegada y puntualidad',
    arrivalTitle: 'Llega 5 minutos antes de tu sesión',
    arrivalDesc: 'Los retrasos de más de 10 minutos pueden acortar la sesión sin reembolso del tiempo perdido o requerir costes de cambio.',
    natureBadge: 'Naturaleza del servicio',
    natureTitle: 'Centro de experiencias y briefing',
    natureDesc: 'La duración incluye el briefing previo al vuelo. El simulador es una experiencia de entretenimiento y no otorga una licencia oficial.',
    contactQuestion: '¿Tienes preguntas sobre las normas o una reserva existente?',
    privacyLink: 'Ver política de privacidad →',
  },
  de: {
    badge: 'OFFIZIELLE NUTZUNGSBEDINGUNGEN & REGELN • SIM DREAM ISRAEL',
    title: 'Hausordnung & Nutzungsbedingungen — Sim Dream Israel',
    legalLine: LEGAL_LINES.de,
    address: `Adresse des Zentrums: ${address.streetEn}, ${address.cityEn} | Offizielle Domains: simdream.co.il, simdream.aero`,
    versionLabel: 'Version',
    tocLabel: 'Inhalt',
    loading: 'Vollständiger Text wird geladen…',
    translationNotice:
      'Die offiziellen Regeln und Nutzungsbedingungen von SimDream Israel sind rechtlich auf Hebräisch und Englisch gemäß israelischem Recht verbindlich. Die Ziffern 1 bis 12 und der Anhang werden unten in der offiziellen englischen Fassung angezeigt; die Ziffern 13 bis 15 stehen in Ihrer Sprache.',
    ageBadge: 'Altersvorgaben',
    ageTitle: 'Simulator-Zutritt: Ab 10 Jahren',
    ageDesc: 'Teilnehmer von 10–15 Jahren benötigen die Begleitung eines Erwachsenen. Online-Buchung & Zahlung ab 18 Jahren.',
    arrivalBadge: 'Ankunft & Pünktlichkeit',
    arrivalTitle: '5 Minuten vor dem Termin erscheinen',
    arrivalDesc: 'Verspätungen über 10 Minuten können zu einer verkürzten Session (ohne Erstattung) oder Umbuchungsgebühren führen.',
    natureBadge: 'Art der Leistung',
    natureTitle: 'Erlebniszentrum & Briefing',
    natureDesc: 'Die Dauer beinhaltet das Briefing im Cockpit. Der Simulator ist eine Erlebnis- und Trainingsanlage, keine Lizenzierungsstelle.',
    contactQuestion: 'Fragen zu den Regeln oder zu einer bestehenden Buchung?',
    privacyLink: 'Datenschutzerklärung ansehen →',
  },
};

export const PRIVACY_PAGE_COPY: Record<LegalLanguage, PrivacyPageCopy> = {
  en: {
    badge: 'OFFICIAL PRIVACY & COOKIE POLICY',
    title: 'Privacy & Cookie Policy — Sim Dream Israel',
    legalLine: LEGAL_LINES.en,
    address: `Address: ${address.streetEn}, ${address.cityEn} | Privacy Contact: ${contact.email}`,
    versionLabel: 'Version',
    tocLabel: 'Contents',
    loading: 'Loading the full text…',
    contactOfficer: 'Privacy & Data Protection Contact',
    rulesLink: 'View Facility Rules & Terms →',
  },
  he: {
    badge: 'מדיניות פרטיות וקובצי COOKIE • SIM DREAM ISRAEL',
    title: 'מדיניות פרטיות ואבטחת מידע – סימדרים ישראל',
    legalLine: LEGAL_LINES.he,
    address: `כתובת: ${address.streetHe}, ${address.cityHe} | דוא״ל פרטיות: ${contact.email}`,
    versionLabel: 'גרסה',
    tocLabel: 'תוכן העניינים',
    loading: 'טוען את הנוסח המלא…',
    contactOfficer: 'יצירת קשר בנושאי פרטיות ואבטחת מידע',
    rulesLink: 'לתקנון ותנאי השימוש ←',
  },
  ru: {
    badge: 'ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ И COOKIE • SIM DREAM ISRAEL',
    title: 'Политика конфиденциальности и защита данных — Sim Dream Israel',
    legalLine: LEGAL_LINES.ru,
    address: `Адрес: ${address.streetEn}, Тель-Авив | Контакт по данным: ${contact.email}`,
    versionLabel: 'Версия',
    tocLabel: 'Содержание',
    loading: 'Загрузка полного текста…',
    contactOfficer: 'Служба защиты персональных данных',
    rulesLink: 'Регламент и правила посещения →',
  },
  fr: {
    badge: 'POLITIQUE DE CONFIDENTIALITÉ & COOKIES • SIM DREAM ISRAEL',
    title: 'Protection des Données et Confidentialité — Sim Dream Israel',
    legalLine: LEGAL_LINES.fr,
    address: `Adresse : ${address.streetEn}, Tel Aviv | Contact : ${contact.email}`,
    versionLabel: 'Version',
    tocLabel: 'Sommaire',
    loading: 'Chargement du texte complet…',
    contactOfficer: 'Contact protection des données',
    rulesLink: 'Consulter le règlement intérieur →',
  },
  ar: {
    badge: 'سياسة الخصوصية وملفات تعريف الارتباط • SIM DREAM ISRAEL',
    title: 'سياسة الخصوصية وأمان البيانات — سيم دريم إسرائيل',
    legalLine: LEGAL_LINES.ar,
    address: `العنوان: ${address.streetEn}، تل أبيب | بريد الخصوصية: ${contact.email}`,
    versionLabel: 'الإصدار',
    tocLabel: 'المحتويات',
    loading: 'جارٍ تحميل النص الكامل…',
    contactOfficer: 'التواصل بشأن حماية البيانات والخصوصية',
    rulesLink: 'عرض اللائحة الرسمية وشروط الاستخدام ←',
  },
  es: {
    badge: 'POLÍTICA OFICIAL DE PRIVACIDAD Y COOKIES • SIM DREAM ISRAEL',
    title: 'Política de privacidad y cookies — Sim Dream Israel',
    legalLine: LEGAL_LINES.es,
    address: `Dirección: ${address.streetEn}, ${address.cityEn} | Privacidad: ${contact.email}`,
    versionLabel: 'Versión',
    tocLabel: 'Contenido',
    loading: 'Cargando el texto completo…',
    contactOfficer: 'Contacto de privacidad y protección de datos',
    rulesLink: 'Ver normas y condiciones del centro →',
  },
  de: {
    badge: 'OFFIZIELLE DATENSCHUTZ- & COOKIE-RICHTLINIE • SIM DREAM ISRAEL',
    title: 'Datenschutz- & Cookie-Richtlinie — Sim Dream Israel',
    legalLine: LEGAL_LINES.de,
    address: `Adresse: ${address.streetEn}, ${address.cityEn} | Datenschutz: ${contact.email}`,
    versionLabel: 'Version',
    tocLabel: 'Inhalt',
    loading: 'Vollständiger Text wird geladen…',
    contactOfficer: 'Kontakt für Datenschutz und Datensicherheit',
    rulesLink: 'Nutzungsbedingungen & Regeln ansehen →',
  },
};
