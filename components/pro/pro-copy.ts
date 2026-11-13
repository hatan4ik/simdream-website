import { FACILITY_INFO } from '@/lib/config/facility-info';
import type { LocalizedRecord } from '@/lib/i18n/translations';

export interface ProCopy {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  trustFMC: string;
  trustMentors: string;
  trustIOS: string;
  trustZeroNoise: string;
  whyBadge: string;
  whyHeading: string;
  whySubtitle: string;
  whyCalloutTitle: string;
  whyCalloutDesc: string;
  whyPillars: Array<{
    title: string;
    desc: string;
  }>;
  bookDirectTitle: string;
  bookDirectSubtitle: string;
  /** Direct-booking labels take the registry price (AGENTS.md §8: never retype a price). */
  bookDirectCta: (price: string) => string;
  bookDirect60: (price: string) => string;
  bookDirect120: (price: string) => string;
  recreationalLink: string;
  perSession: string;
  iosReset: string;
  bookBtn: (title: string, price: string) => string;
  officialServicePage: string;
  recommendedBadge: string;
  interviewGuideBadge: string;
  interviewGuideTitle: string;
  interviewGuideDesc: string;
  sessionFlowLabel: string;
  interviewPackages: Array<{
    duration: string;
    title: string;
    slug: string;
    bestFor: string;
    flow: string;
  }>;
  interviewNote: string;
  techSpecsSummary: string;
  techSpecsVisualsTitle: string;
  techSpecsVisualsDesc: string;
  techSpecsControlsTitle: string;
  techSpecsControlsDesc: string;
  techSpecsLocationTitle: string;
  techSpecsLocationDesc: string;
  b2cBridgeBadge: string;
  b2cBridgeTitle: string;
  b2cBtn: string;
  b2bBtn: string;
  proTracksBadge: string;
  proTracksTitle: string;
  proTracksDesc: string;
  proTracksSessionsLabel: string;
  proTracksStandardValueLabel: string;
  proTracksSavingsLabel: string;
  proTracksPerSessionLabel: string;
  proTracksFlexibility: string;
  proTracksCta: string;
  proTracksRedirecting: string;
  proTracksDispatch: string;
  proTracksDisclosure: string;
}

export const PRO_COPY: LocalizedRecord<ProCopy> = {
  en: {
    heroBadge: 'PROFESSIONAL TRAINING • AIRLINE ASSESSMENT SCREENING',
    heroTitle: 'Professional Training — Airline Assessment & Pilot Screening Prep',
    heroSubtitle:
      'Tailored for licensed commercial pilots (PPL / CPL / ATPL), cadets, and airline applicants preparing for simulator screening evaluations (El Al, Arkia, Israir, Ryanair, Wizz Air & international carriers). Personalized visual and instrument flight training in a 1:1 scale Boeing 737 MAX flight deck.',
    heroCtaPrimary: 'Book Airline Assessment Prep (90 PRO)',
    heroCtaSecondary: 'Why Pilots Need Prep ↓',
    trustFMC: '1:1 Scale Boeing 737 MAX Cockpit',
    trustMentors: 'Active Airline Captain Mentors',
    trustIOS: 'Instant IOS Approach Resets',
    trustZeroNoise: 'Dedicated Noise-Free Sessions',
    whyBadge: 'CRITICAL SCREENING PREPARATION',
    whyHeading: 'Why Commercial Pilots Need Simulator Assessment Preparation',
    whySubtitle:
      'Airline simulator checkrides are elimination assessments with zero margin for error. A single failed screening often results in a 6-to-12-month re-application freeze. Here is why structured prep in our 1:1 Boeing 737 MAX flight deck gives you the decisive edge:',
    whyCalloutTitle: 'High-Stakes Checkride Reality',
    whyCalloutDesc:
      'Airline recruiters do not assess your overall logbook hours — they evaluate how you handle 70 tons of swept-wing jet under extreme stress on day one. Pre-interview cockpit practice turns anxiety into automated muscle memory.',
    whyPillars: [
      {
        title: 'Raw Data Manual Flight Mastery (FD OFF, A/T OFF)',
        desc: 'Checkride examiners evaluate how you hand-fly without automation. Master Boeing 737 pitch & power tables, 45° steep turns, and raw-data ILS tracking under strict airline tolerances.',
      },
      {
        title: 'V1 Cut Engine Failure & QRH Discipline',
        desc: 'Engine failure at V1 decision speed requires immediate directional control, precise rudder trim, single-engine go-around capability, and structured Quick Reference Handbook (QRH) checklist discipline under pressure.',
      },
      {
        title: 'Precision & Non-Precision Instrument IFR',
        desc: 'Full FMS/CDU initialization, SID/STAR departures, published holding entries, LOC/DME and RNAV/RNP-AR approaches in low visibility and gusty crosswinds.',
      },
      {
        title: 'Active Airline Captain Mentorship & PM Coordination',
        desc: 'Train 1-on-1 with real commercial airline pilots who know current airline assessment profiles. Your instructor can act as Pilot Monitoring (PM) or step aside for your crew partner to rehearse your carrier’s exact MCC profile.',
      },
    ],
    bookDirectTitle: 'Ready to Secure Your Airline Assessment Slot?',
    bookDirectSubtitle:
      'Choose your preparation duration below to enter the streamlined 2-step airline booking flow with zero add-on distractions.',
    bookDirectCta: (price) => `Book Recommended 90-Minute Rehearsal (${price})`,
    bookDirect60: (price) => `60m Focus · ${price}`,
    bookDirect120: (price) => `120m Extended · ${price}`,
    recreationalLink: 'Looking for Recreational & Gift Flight Packages? View Standard Packages →',
    perSession: '/ session',
    iosReset: 'Instant IOS Approach Resets',
    bookBtn: (title, price) => `Book ${title} (${price})`,
    officialServicePage: 'View Service Page on simdream.co.il',
    recommendedBadge: 'RECOMMENDED FOR AIRLINE SCREENINGS',
    interviewGuideBadge: 'ATP / ATPL INTERVIEW PREPARATION',
    interviewGuideTitle: 'Practice for the simulator interview — not just cockpit time',
    interviewGuideDesc:
      'These PRO packages are built for ATP / ATPL candidates, cadets, and commercial pilots who want to practise the skills commonly explored in airline simulator interviews: manual flying, instrument procedures, abnormal situations, SOP discipline, and crew coordination. Choose the session length that matches the depth of practice you need.',
    sessionFlowLabel: 'Session flow: ',
    interviewPackages: [
      {
        duration: '60 minutes',
        title: 'Airline Interview Prep 60 PRO',
        slug: 'airline-prep-60-pro',
        bestFor:
          'Targeting one or two priorities before an interview or simulator assessment (Raw data, steep turns, specific profile).',
        flow: 'Short brief → focused raw-data or instrument profile → debrief with next steps.',
      },
      {
        duration: '90 minutes',
        title: 'Airline Interview Prep 90 PRO',
        slug: 'airline-prep-90-pro',
        bestFor:
          'Candidates who want a balanced, end-to-end rehearsal before their evaluation (Recommended standard for airline screenings).',
        flow: 'FMS setup → departure and raw data → engine or approach scenario → structured debrief.',
      },
      {
        duration: '120 minutes',
        title: 'Airline Interview Prep 120 PRO',
        slug: 'airline-assessment-prep',
        bestFor:
          'Deep preparation, PF/PM crew practice, full emergency scenarios, and time to repeat improvement areas.',
        flow: 'Multiple practice profiles → two-pilot workflow → repeat key exercises → detailed debrief.',
      },
    ],
    interviewNote:
      'Preparation is practical coaching tailored to your goals conducted on the Boeing 737 MAX simulator at Gershon Shatz 36 Tel Aviv with instructor / PM flexibility.',
    techSpecsSummary:
      'About Sim Dream & Boeing 737 MAX Simulator Technical Specifications (Click to Expand)',
    techSpecsVisualsTitle: 'Visual & Cockpit Shell',
    techSpecsVisualsDesc:
      '1:1 scale enclosed Boeing 737 MAX flight deck with dynamic day/dusk/night conditions and authentic spatial sounds.',
    techSpecsControlsTitle: 'Flight Controls & Avionics',
    techSpecsControlsDesc:
      'Dual mechanically linked control columns with dynamic loading, linked rudder pedals, motorized autothrottle quadrant, dual Sismo FMS/CDUs, and CPflight MCP.',
    techSpecsLocationTitle: 'Location & Scheduling',
    techSpecsLocationDesc: `Located at ${FACILITY_INFO.address.streetEn} (near Yehudit Light Rail & HaShalom Train Station). Direct contact: ${FACILITY_INFO.contact.phoneDisplay}.`,
    b2cBridgeBadge: 'LOOKING FOR EXPERIENCES OR B2B WORKSHOPS?',
    b2cBridgeTitle: 'Discover Recreational Flight Packages or Book Corporate CRM Workshops',
    b2cBtn: 'Flight Experiences (B2C)',
    b2bBtn: 'Corporate CRM Workshops (B2B)',
    proTracksBadge: 'MULTI-SESSION AIRLINE INTERVIEW PREP',
    proTracksTitle: 'Rehearse More Than Once Before the Real Assessment',
    proTracksDesc:
      'One assessment rehearsal shows you where you stand. Three or five PRO sessions, paid once and booked when it suits you, let an active airline captain fix the weak points before the examiner finds them. The same noise-free PRO sessions, at a lower price per session.',
    proTracksSessionsLabel: 'PRO sessions',
    proTracksStandardValueLabel: 'single-session value',
    proTracksSavingsLabel: 'you save',
    proTracksPerSessionLabel: 'per session',
    proTracksFlexibility: 'one payment · book each session whenever it suits you · no add-ons',
    proTracksCta: 'Start this PRO track',
    proTracksRedirecting: 'Redirecting to payment...',
    proTracksDispatch: 'Questions? Consult Dispatch',
    proTracksDisclosure:
      'PRO track coaching is practical simulator preparation. It does not grant logged flight hours, a licence, a type rating or assessment credit.',
  },
  he: {
    heroBadge: 'הדרכה מקצועית לטייסים • הכנה למבדקי חברות תעופה (60 / 90 / 120 דקות)',
    heroTitle: 'הדרכה מקצועית לטייסים והכנה למבדקי סימולטור בחברות תעופה',
    heroSubtitle:
      'מיועד לטייסים בעלי רישיון (PPL / CPL / ATPL), בוגרי קורסי טיס ומועמדים למיוני קבלה בחברות תעופה (אל על, ישראייר, ארקיע, Wizz Air וחברות אירופאיות). אימונים מותאמים אישית בטיסה חזותית וטיסת מכשירים בתא טייס בואינג 737 MAX בקנה מידה 1:1 ברחוב גרשון שץ 36 תל אביב.',
    heroCtaPrimary: 'הזמנת אימון מבדק (90 PRO)',
    heroCtaSecondary: 'למה צריך הכנה למבדק? ↓',
    trustFMC: 'תא טייס בואינג 737 MAX בקנה מידה 1:1',
    trustMentors: 'קברניטי חברות תעופה פעילים כמדריכים',
    trustIOS: 'איפוס גישות מיידי בעמדת מדריך (IOS)',
    trustZeroNoise: 'סשן הדרכה ייעודי וממוקד ללא הסחות דעת',
    whyBadge: 'חשיבות ההכנה למבדק',
    whyHeading: 'למה טייסים מסחריים וקדטים חייבים הכנה מקצועית לסימולטור?',
    whySubtitle:
      'מבדקי סימולטור בחברות תעופה הם שלב סינון קריטי ללא פשרות. כישלון במבדק מוביל לרוב להקפאת מועמדות של 6 עד 12 חודשים. אימון ממוקד בסימולטור הבואינג 737 MAX מעניק לכם את היתרון המכריע לעבור בפעם הראשונה:',
    whyCalloutTitle: 'המציאות של מבדקי סימולטור',
    whyCalloutDesc:
      'בוחני חברות התעופה לא בודקים כמה שעות צברתם בסך הכל — הם בודקים כיצד אתם מתפעלים מטוס סילון כבד תחת עומס קיצוני ביום המבחן. אימון מקדים הופך לחץ לזיכרון שריר מדויק.',
    whyPillars: [
      {
        title: 'הטסת Raw Data ידנית מלאה (ללא Flight Director וללא מצערת אוטומטית)',
        desc: 'הבוחנים בחברות התעופה בודקים הטסה ידנית של מטוס סילון כבד ללא אוטומציה. תרגול מדויק של טבלאות Pitch & Thrust לבואינג 737, פניות 45° חדות, ושמירת נתיב ILS לפי סטיות מותרות של חברות התעופה.',
      },
      {
        title: 'תקלת מנוע ב-V1 (V1 Cut) ונהלי חירום QRH',
        desc: 'אובדן מנוע במהירות ההחלטה V1 דורש תגובה מיידית לשמירת ציר, קיזוז הגה כיוון מדויק, הליכה סביב במנוע בודד ותפעול נהלי חירום וספרי בד״ח (QRH) תחת עומס גבוה.',
      },
      {
        title: 'שליטה בגישות מכשירים מתקדמות (ILS, LOC/DME, RNP)',
        desc: 'הזנת FMS מלאה, תהליכי יציאה והצטרפות (SID/STAR), מעגלי המתנה (Holdings) והנמכות בראות מוגבלת ורוחות צד חזקות.',
      },
      {
        title: 'הדרכה עם קברניט פעיל ותיאום צוות (MCC)',
        desc: 'אימון אחד-על-אחד עם טייס חברת תעופה מנוסה שמתפקד כטייס מנטר (PM) או פינוי המושב הימני לשותף צוות מטעמכם לתרגול פרופיל המיון המדויק של החברה.',
      },
    ],
    bookDirectTitle: 'מוכנים לשריין מועד לאימון הכנה למבדק?',
    bookDirectSubtitle:
      'בחרו את משך האימון הרצוי למעבר ישיר למערכת ההזמנות המקצועית והשקטה ללא הסחות דעת.',
    bookDirectCta: (price) => `הזמנת אימון מבדק מומלץ (90 דק׳ — ${price})`,
    bookDirect60: (price) => `מיקוד 60 דק׳ · ${price}`,
    bookDirect120: (price) => `אימון מקיף 120 דק׳ · ${price}`,
    recreationalLink: 'מחפשים חבילות חוויה או מתנה לקהל הרחב? לחצו כאן ←',
    perSession: '/ סשן מקצועי',
    iosReset: 'עמדת IOS לאיפוס גישות מיידי',
    bookBtn: (title, price) => `הזמנת ${title} (${price})`,
    officialServicePage: 'דף השירות הרשמי ב-simdream.co.il',
    recommendedBadge: 'המסלול המומלץ למיוני חברות תעופה',
    interviewGuideBadge: 'הכנה לראיון ולמבדק סימולטור',
    interviewGuideTitle: 'מתאמנים למבדק סימולטור — לא רק מזמינים זמן בתא הטייס',
    interviewGuideDesc:
      'חבילות ה-PRO בנויות עבור מועמדי ATP / ATPL, קדטים וטייסים מסחריים שרוצים לתרגל את המשימות שמופיעות בדרך כלל במיוני חברות תעופה: הטסה ידנית, ניווט מכשירים, ניהול תקלות, SOP ועבודת צוות. בחרו את משך הסשן לפי עומק התרגול הדרוש לכם.',
    sessionFlowLabel: 'מבנה הסשן: ',
    interviewPackages: [
      {
        duration: '60 דקות',
        title: 'Airline Interview Prep 60 PRO',
        slug: 'airline-prep-60-pro',
        bestFor:
          'למיקוד בנושא או שניים לפני ראיון או מבדק סימולטור (Raw Data, פניות חדות, גישה ספציפית).',
        flow: 'תדריך קצר → Raw Data / גישת מכשירים ממוקדת → דיבריף עם נקודות עבודה.',
      },
      {
        duration: '90 דקות',
        title: 'Airline Interview Prep 90 PRO',
        slug: 'airline-prep-90-pro',
        bestFor:
          'למועמדים שרוצים חזרה מלאה ומאוזנת לפני מבדק (הסטנדרט המומלץ ביותר למיונים).',
        flow: 'הגדרת FMS → יציאה ו-Raw Data → תרחיש מנוע / גישה → דיבריף מובנה.',
      },
      {
        duration: '120 דקות',
        title: 'Airline Interview Prep 120 PRO',
        slug: 'airline-assessment-prep',
        bestFor:
          'לתרגול מעמיק, עבודה בצוות PF/PM, חזרה על תקלות וזמן לעיבוד נקודות לשיפור.',
        flow: 'כמה פרופילי תרגול → תפעול שני טייסים → חזרה על תרגילים → דיבריף מפורט.',
      },
    ],
    interviewNote:
      'ההכנה היא אימון מעשי מותאם אישית למטרותיכם. האימון מועבר על גבי סימולטור בואינג 737 MAX ברחוב גרשון שץ 36 תל אביב עם אפשרות לצוות שני או מדריך אישי.',
    techSpecsSummary:
      'אודות מרכז הסימולטור ומפרט טכני של תא הטייס בואינג 737 MAX (לחצו לצפייה)',
    techSpecsVisualsTitle: 'תצוגה פנורמית ומבנה',
    techSpecsVisualsDesc:
      'תא טייס סגור בקנה מידה 1:1 של בואינג 737 MAX עם תנאי יום/לילה דינמיים ומערכת שמע היקפית מתקדמת.',
    techSpecsControlsTitle: 'הגאים, מצערות ואוויוניקה',
    techSpecsControlsDesc:
      'שני הגאים מקושרים מכנית עם משוב עומס (Control Loading), דוושות כיוון מקושרות, מצערות ממונעות אוטומטית (Motorized Autothrottle), מחשב FMS/CDU כפול ופאנל טייס אוטומטי MCP.',
    techSpecsLocationTitle: 'מיקום ותיאום הגעה',
    techSpecsLocationDesc: `מרכז Sim Dream ממוקם ברחוב ${FACILITY_INFO.address.streetHe} (סמוך לתחנת הרכבת הקלה יהודית ותחנת רכבת השלום). טלפון לתיאום: ${FACILITY_INFO.contact.phoneDisplay}.`,
    b2cBridgeBadge: 'מחפשים חבילות טיסה חווייתיות או סדנאות לחברות?',
    b2cBridgeTitle: 'גלו את חבילות הטיסה לקהל הרחב או הזמינו סדנת CRM לצוותי הנהלה',
    b2cBtn: 'חבילות טיסה ומתנה (B2C)',
    b2bBtn: 'סדנאות CRM לחברות (B2B)',
    proTracksBadge: 'הכנה למיוני חברות תעופה · מסלולי PRO',
    proTracksTitle: 'מתאמנים יותר מפעם אחת לפני המבדק האמיתי',
    proTracksDesc:
      'אימון מבדק אחד מראה לכם איפה אתם עומדים. שלושה או חמישה אימוני PRO, בתשלום אחד ובתיאום כשמתאים לכם, נותנים לקברניט פעיל בחברת תעופה לתקן את נקודות התורפה לפני שהבוחן מוצא אותן. אותם אימוני PRO נקיים מרעש, במחיר נמוך יותר לאימון.',
    proTracksSessionsLabel: 'אימוני PRO',
    proTracksStandardValueLabel: 'שווי באימונים בודדים',
    proTracksSavingsLabel: 'אתם חוסכים',
    proTracksPerSessionLabel: 'לאימון',
    proTracksFlexibility: 'תשלום אחד · מתאמים כל אימון כשמתאים לכם · ללא תוספות',
    proTracksCta: 'להתחיל מסלול PRO זה',
    proTracksRedirecting: 'מעביר לתשלום...',
    proTracksDispatch: 'שאלות? פנו למבצעים',
    proTracksDisclosure:
      'אימוני מסלולי PRO הם הכנה מעשית בסימולטור. הם אינם מקנים שעות טיסה רשמיות, רישיון, הגדר סוג או זיכוי למבדק.',
  },
  ru: {
    heroBadge: 'ПРОФЕССИОНАЛЬНАЯ ПОДГОТОВКА • СКРИНИНГ В АВИАКОМПАНИИ (60 / 90 / 120 МИН)',
    heroTitle: 'Профессиональная подготовка пилотов — скрининги и чек-райды',
    heroSubtitle:
      'Специализированная программа для пилотов с лицензиями PPL / CPL / ATPL, выпускников летных школ и соискателей в авиакомпании (El Al, Arkia, Israir, Wizz Air, Ryanair и др.). Индивидуальные тренировки визуальных заходов и IFR в точной кабине Boeing 737 MAX масштаба 1:1 в Тель-Авиве.',
    heroCtaPrimary: 'Забронировать подготовку к скринингу (90 PRO)',
    heroCtaSecondary: 'Зачем пилотам подготовка? ↓',
    trustFMC: 'Кабина Boeing 737 MAX масштаба 1:1',
    trustMentors: 'Действующие командиры авиакомпаний',
    trustIOS: 'Мгновенный сброс заходов через пульт IOS',
    trustZeroNoise: 'Целевые профессиональные сессии',
    whyBadge: 'ЗНАЧЕНИЕ ПОДГОТОВКИ К СКРИНИНГУ',
    whyHeading: 'Почему коммерческим пилотам необходима подготовка на симуляторе?',
    whySubtitle:
      'Отборочный чек-райд на симуляторе — решающий этап отбора в авиакомпанию, где оцениваются навыки без права на ошибку. Неудачный скрининг часто приводит к заморозке подачи резюме на 6–12 месяцев. Структурированная подготовка на симуляторе Boeing 737 MAX обеспечивает решающее преимущество:',
    whyCalloutTitle: 'Реальность отборочных чек-райдов',
    whyCalloutDesc:
      'Экзаменаторы авиакомпаний оценивают не общий налет в летной книжке, а способность пилотировать тяжелый реактивный самолет в условиях стресса. Подготовка превращает волнение в автоматизированную мышечную память.',
    whyPillars: [
      {
        title: 'Пилотирование Raw Data вручную (FD OFF, A/T OFF)',
        desc: 'Экзаменаторы оценивают ручное пилотирование 70-тонного реактивного лайнера без директоров и автомата тяги. Отработка таблиц Pitch & Thrust для Boeing 737, виражей 45° и заходов по ILS в жестких допусках авиакомпаний.',
      },
      {
        title: 'Отказ двигателя на V1 (V1 Cut) и процедуры QRH',
        desc: 'Отказ двигателя на скорости принятия решения требует мгновенного удержания курса, балансировки рулем направления, ухода на второй круг на одном двигателе и действий по QRH под нагрузкой.',
      },
      {
        title: 'Инструментальные заходы повышенной сложности (ILS, LOC, RNP)',
        desc: 'Полная инициализация FMS/CDU, схемы SID/STAR, зоны ожидания и инструментальные заходы в условиях бокового ветра и низкой видимости.',
      },
      {
        title: 'Наставничество действующих пилотов и работа в экипаже (MCC)',
        desc: 'Тренировка один на один с опытным пилотом авиакомпании в роли Pilot Monitoring (PM) либо работа с вашим напарником по экипажу по конкретному профилю авиакомпании.',
      },
    ],
    bookDirectTitle: 'Готовы забронировать тренировочный слот?',
    bookDirectSubtitle:
      'Выберите продолжительность сессии для перехода к прямой профессиональной записи без лишних опций.',
    bookDirectCta: (price) => `Забронировать рекомендуемую репетицию (90 мин — ${price})`,
    bookDirect60: (price) => `60 мин фокус · ${price}`,
    bookDirect120: (price) => `120 мин полный курс · ${price}`,
    recreationalLink: 'Ищете ознакомительные или подарочные полеты? Стандартные пакеты →',
    perSession: '/ сессия',
    iosReset: 'Мгновенный сброс заходов через пульт IOS',
    bookBtn: (title, price) => `Забронировать ${title} (${price})`,
    officialServicePage: 'Страница услуги на сайте simdream.co.il',
    recommendedBadge: 'РЕКОМЕНДУЕМЫЙ СТАНДАРТ ДЛЯ СКРИНИНГОВ',
    interviewGuideBadge: 'ПОДГОТОВКА К ИНТЕРВЬЮ И ТРЕНАЖЕРУ ATP / ATPL',
    interviewGuideTitle: 'Тренируйтесь для реального скрининга — не просто время в кабине',
    interviewGuideDesc:
      'Пакеты PRO созданы для соискателей ATP / ATPL, курсантов и коммерческих пилотов, желающих отработать типовые задания отборочных скринингов: пилотирование Raw Data без директоров, заходы по приборам, особые случаи в полете, соблюдение SOP и взаимодействие в экипаже.',
    sessionFlowLabel: 'Структура сессии: ',
    interviewPackages: [
      {
        duration: '60 минут',
        title: 'Airline Interview Prep 60 PRO',
        slug: 'airline-prep-60-pro',
        bestFor:
          'Целевая отработка одного-двух ключевых навыков перед скринингом (Raw Data, виражи, конкретный заход).',
        flow: 'Краткий брифинг → профиль Raw Data / инструментальный заход → дебрифинг с рекомендациями.',
      },
      {
        duration: '90 минут',
        title: 'Airline Interview Prep 90 PRO',
        slug: 'airline-prep-90-pro',
        bestFor:
          'Полная сбалансированная репетиция контрольного полета перед отбором (Рекомендуемый стандарт).',
        flow: 'Инициализация FMS → взлет и Raw Data → отказ двигателя / заход → структурированный разбор.',
      },
      {
        duration: '120 минут',
        title: 'Airline Interview Prep 120 PRO',
        slug: 'airline-assessment-prep',
        bestFor:
          'Глубокая проработка, командное взаимодействие PF/PM, отработка отказов и повтор упражнений.',
        flow: 'Несколько профилей полета → работа в два пилота → отработка ошибок → детальный дебрифинг.',
      },
    ],
    interviewNote:
      'Практическая подготовка, адаптированная под требования авиакомпаний, на симуляторе Boeing 737 MAX по адресу: Тель-Авив, ул. Гершон Шац 36.',
    techSpecsSummary:
      'О центре Sim Dream и технические характеристики симулятора Boeing 737 MAX (нажмите для просмотра)',
    techSpecsVisualsTitle: 'Визуальная система и кабина',
    techSpecsVisualsDesc:
      'Закрытая кабина Boeing 737 MAX масштаба 1:1 с реалистичной сменой времени суток и пространственным звуком.',
    techSpecsControlsTitle: 'Органы управления и авионика',
    techSpecsControlsDesc:
      'Сдвоенные штурвальные колонки с динамической загрузкой усилий, связанные педали руля направления, моторизованный блок РУД, два FMC/CDU Sismo и панель автопилота CPflight MCP.',
    techSpecsLocationTitle: 'Локация и запись',
    techSpecsLocationDesc: `Центр расположен по адресу: ул. Гершон Шац 36, Тель-Авив (рядом со станциями Йегудит и Ха-Шалом). Телефон: ${FACILITY_INFO.contact.phoneDisplay}.`,
    b2cBridgeBadge: 'ИНТЕРЕСУЮТ ПОДАРОЧНЫЕ ПОЛЕТЫ ИЛИ B2B-СЕМИНАРЫ?',
    b2cBridgeTitle: 'Ознакомьтесь с программами для всех желающих или закажите корпоративный CRM-семинар',
    b2cBtn: 'Полеты для всех (B2C)',
    b2bBtn: 'Корпоративный CRM (B2B)',
    proTracksBadge: 'ПОДГОТОВКА К ОТБОРУ · ПРОГРАММЫ PRO',
    proTracksTitle: 'Репетируйте не один раз перед настоящей оценкой',
    proTracksDesc:
      'Одна репетиция показывает, где вы находитесь. Три или пять сессий PRO, оплаченных один раз и назначенных, когда вам удобно, позволяют действующему капитану авиакомпании исправить слабые места до того, как их найдёт экзаменатор. Те же сессии PRO без лишнего шума — по меньшей цене за сессию.',
    proTracksSessionsLabel: 'сессий PRO',
    proTracksStandardValueLabel: 'стоимость разовых сессий',
    proTracksSavingsLabel: 'ваша экономия',
    proTracksPerSessionLabel: 'за сессию',
    proTracksFlexibility: 'одна оплата · каждая сессия — когда удобно · без дополнений',
    proTracksCta: 'Начать эту программу PRO',
    proTracksRedirecting: 'Переход к оплате...',
    proTracksDispatch: 'Вопросы? Напишите диспетчеру',
    proTracksDisclosure:
      'Программы PRO — практическая подготовка на симуляторе. Они не дают официальные лётные часы, лицензию, type rating или зачёт отбора.',
  },
  fr: {
    heroBadge: 'FORMATION PROFESSIONNELLE • PRÉPARATION AUX SÉLECTIONS (60 / 90 / 120 MIN)',
    heroTitle: 'Entraînement Professionnel — Préparation aux Sélections et Évaluations',
    heroSubtitle:
      'Conçu pour les pilotes brevetés (PPL / CPL / ATPL), cadets et candidats préparant les sélections en compagnie aérienne (El Al, Arkia, Israir, Wizz Air, Ryanair et transporteurs internationaux). Entraînement personnalisé VFR et IFR dans un cockpit Boeing 737 MAX à l’échelle 1:1 à Tel Aviv.',
    heroCtaPrimary: 'Réserver la préparation aux sélections (90 PRO)',
    heroCtaSecondary: 'Pourquoi une préparation est indispensable ↓',
    trustFMC: 'Cockpit Boeing 737 MAX échelle 1:1',
    trustMentors: 'Commandants de bord en activité',
    trustIOS: 'Repositionnements instantanés via console IOS',
    trustZeroNoise: 'Créneaux dédiés 100% professionnels',
    whyBadge: 'ENJEUX DES SÉLECTIONS EN COMPAGNIE',
    whyHeading: 'Pourquoi les pilotes professionnels ont besoin d’une préparation sur simulateur',
    whySubtitle:
      'L’évaluation en simulateur lors des sélections en compagnie aérienne est éliminatoire et sans compromis. Un échec entraîne généralement un gel des candidatures de 6 à 12 mois. Une préparation ciblée dans notre cockpit Boeing 737 MAX vous offre l’avantage décisif pour réussir dès la première tentative :',
    whyCalloutTitle: 'La réalité des évaluations en simulateur',
    whyCalloutDesc:
      'Les examinateurs n’évaluent pas le volume total de votre carnet de vol — ils jugent votre capacité à piloter manuellement un jet lourd sous forte charge de travail. L’entraînement préalable transforme le stress en réflexes automatiques.',
    whyPillars: [
      {
        title: 'Maîtrise du vol manuel en Raw Data (sans directeur de vol ni automanette)',
        desc: 'Les examinateurs évaluent votre pilotage manuel d’un avion de ligne de 70 tonnes sans automatismes. Maîtrisez les assiettes et poussées Boeing 737, les virages à 45° et le suivi ILS manuel selon les tolérances strictes des compagnies.',
      },
      {
        title: 'Panne moteur à V1 (V1 Cut) et gestion du QRH',
        desc: 'La panne moteur à la vitesse de décision exige un contrôle directionnel immédiat, une compensation précise au palonnier, une remise de gaz monomoteur et l’exécution rigoureuse des listes QRH sous stress.',
      },
      {
        title: 'Procédures aux instruments de précision et classiques (ILS, LOC, RNP)',
        desc: 'Initialisation complète du FMS/CDU, départs SID/STAR, hippodromes d’attente et approches par fort vent de travers et faible visibilité.',
      },
      {
        title: 'Coaching par des pilotes de ligne et coordination en équipage (MCC)',
        desc: 'Entraînement individuel avec un pilote de ligne expérimenté agissant comme Pilot Monitoring (PM), ou venez avec votre binôme pour répéter le profil exact de votre compagnie cible.',
      },
    ],
    bookDirectTitle: 'Prêt à réserver votre créneau de préparation ?',
    bookDirectSubtitle:
      'Sélectionnez la durée de votre session pour accéder directement au parcours de réservation professionnel sans options superflues.',
    bookDirectCta: (price) => `Réserver la répétition recommandée (90 min — ${price})`,
    bookDirect60: (price) => `Session ciblée 60 min · ${price}`,
    bookDirect120: (price) => `Session complète 120 min · ${price}`,
    recreationalLink: 'Vous cherchez des vols découverte ou cadeaux ? Formules grand public →',
    perSession: '/ session',
    iosReset: 'Repositionnements instantanés via console instructeur IOS',
    bookBtn: (title, price) => `Réserver ${title} (${price})`,
    officialServicePage: 'Voir la page officielle sur simdream.co.il',
    recommendedBadge: 'STANDARD RECOMMANDÉ POUR LES SÉLECTIONS',
    interviewGuideBadge: 'PRÉPARATION AUX ENTRETIENS ET SÉLECTIONS ATP / ATPL',
    interviewGuideTitle: 'Entraînez-vous pour les sélections — pas seulement du temps de vol',
    interviewGuideDesc:
      'Ces packs PRO sont conçus pour les candidats ATP / ATPL, cadets et pilotes professionnels préparant les sélections : pilotage manuel brut, procédures aux instruments, pannes, respect des SOP et coordination équipage. Choisissez la durée adaptée à vos objectifs.',
    sessionFlowLabel: 'Déroulement de la session : ',
    interviewPackages: [
      {
        duration: '60 minutes',
        title: 'Airline Interview Prep 60 PRO',
        slug: 'airline-prep-60-pro',
        bestFor:
          'Ciblage d’une ou deux priorités avant un entretien ou une évaluation sur simulateur (Raw data, virages serrés, approche spécifique).',
        flow: 'Briefing court → profil Raw Data ou instruments ciblé → débriefing structuré.',
      },
      {
        duration: '90 minutes',
        title: 'Airline Interview Prep 90 PRO',
        slug: 'airline-prep-90-pro',
        bestFor:
          'Répétition complète et équilibrée d’une évaluation en compagnie aérienne (Standard recommandé pour les sélections).',
        flow: 'Initialisation FMS → départ et Raw Data → panne moteur / approche → débriefing complet.',
      },
      {
        duration: '120 minutes',
        title: 'Airline Interview Prep 120 PRO',
        slug: 'airline-assessment-prep',
        bestFor:
          'Préparation approfondie, coordination PF/PM, gestion des pannes et répétition des exercices clés.',
        flow: 'Profils multiples → travail en équipage deux pilotes → répétition des points clés → débriefing détaillé.',
      },
    ],
    interviewNote:
      'Coaching pratique adapté à vos objectifs sur simulateur Boeing 737 MAX au 36 rue Gershon Shatz, Tel Aviv, avec flexibilité instructeur / PM.',
    techSpecsSummary:
      'À propos de Sim Dream et spécifications techniques du simulateur Boeing 737 MAX (cliquer pour ouvrir)',
    techSpecsVisualsTitle: 'Système visuel et structure cockpit',
    techSpecsVisualsDesc:
      'Cockpit fermé échelle 1:1 de Boeing 737 MAX avec conditions dynamiques jour/nuit et acoustique spatiale immersive.',
    techSpecsControlsTitle: 'Commandes de vol et avionique',
    techSpecsControlsDesc:
      'Colonnes de commandes interconnectées avec retour d’effort dynamique, palonniers couplés, manette des gaz motorisée, double FMC/CDU Sismo et panneau MCP CPflight.',
    techSpecsLocationTitle: 'Emplacement et réservation',
    techSpecsLocationDesc: `Situé au ${FACILITY_INFO.address.streetEn} (proche tramway Yehudit et gare HaShalom). Contact direct : ${FACILITY_INFO.contact.phoneDisplay}.`,
    b2cBridgeBadge: 'VOUS CHERCHEZ DES VOLS DÉCOUVERTE OU DES WORKSHOPS B2B ?',
    b2cBridgeTitle: 'Découvrez les packs de vol pour tous ou réservez un atelier CRM pour votre équipe',
    b2cBtn: 'Expériences de vol (B2C)',
    b2bBtn: 'Workshops CRM Entreprise (B2B)',
    proTracksBadge: 'PRÉPARATION SÉLECTION · PARCOURS PRO',
    proTracksTitle: 'Répétez plus d’une fois avant la vraie évaluation',
    proTracksDesc:
      'Une répétition d’évaluation vous montre où vous en êtes. Trois ou cinq séances PRO, réglées en une fois et réservées quand cela vous convient, laissent un commandant de compagnie en activité corriger les points faibles avant que l’examinateur ne les trouve. Les mêmes séances PRO sans distraction, à un prix inférieur par séance.',
    proTracksSessionsLabel: 'séances PRO',
    proTracksStandardValueLabel: 'valeur des séances à l’unité',
    proTracksSavingsLabel: 'vous économisez',
    proTracksPerSessionLabel: 'par séance',
    proTracksFlexibility: 'un seul paiement · chaque séance quand cela vous convient · sans options',
    proTracksCta: 'Commencer ce parcours PRO',
    proTracksRedirecting: 'Redirection vers le paiement...',
    proTracksDispatch: 'Une question ? Consulter le Dispatch',
    proTracksDisclosure:
      'Les parcours PRO sont une préparation pratique sur simulateur. Ils ne délivrent ni heures de vol officielles, ni licence, ni qualification de type, ni crédit de sélection.',
  },
  ar: {
    heroBadge: 'تدريب احترافي للطيارين • التحضير لاختبارات شركات الطيران (60 / 90 / 120 دقيقة)',
    heroTitle: 'تدريب احترافي للطيارين والتحضير لاختبارات المحاكاة في شركات الطيران',
    heroSubtitle:
      'مخصص للطيارين المرخصين (PPL / CPL / ATPL)، والخريجين الجدد، والطيارين المتقدمين لاختبارات التقييم في شركات الطيران (إل عال، أركيا، يسرائير، ويز إير، رايان إير وشركات الطيران الدولية). تدريب فردي مكثف على الطيران البصري والآلي في قمرة بوينغ 737 ماكس بمقياس 1:1 في تل أبيب.',
    heroCtaPrimary: 'حجز تدريب التقييم (90 PRO)',
    heroCtaSecondary: 'لماذا يحتاج الطيارون إلى التحضير؟ ↓',
    trustFMC: 'قمرة بوينغ 737 ماكس بمقياس 1:1',
    trustMentors: 'مدربون من قادة طائرات الخطوط الجوية',
    trustIOS: 'إعادة ضبط فورية لمسارات الاقتراب عبر محطة IOS',
    trustZeroNoise: 'جلسات تدريب احترافية بدون مشتتات',
    whyBadge: 'أهمية التحضير لاختبارات المحاكاة',
    whyHeading: 'لماذا يحتاج الطيارون التجاريون والمتدربون إلى تحضير مسبق في جهاز المحاكاة؟',
    whySubtitle:
      'تعد اختبارات فحص المحاكاة في شركات الطيران مرحلة تصفية حاسمة لا مجال فيها للخطأ. وغالباً ما يؤدي الإخفاق في الفحص إلى تجميد تقديم الطلبات لمدة تتراوح بين 6 إلى 12 شهراً. التدريب المنهجي في قمرة بوينغ 737 ماكس يمنحكم الميزة الحاسمة للنجاح من المحاولة الأولى:',
    whyCalloutTitle: 'واقع اختبارات الفحص في شركات الطيران',
    whyCalloutDesc:
      'لا ينظر فاحصو شركات الطيران إلى مجمل ساعات الطيران المسجلة لديك فحسب — بل يختبرون قدرتك الدقيقة على قيادة طائرة ركاب نفاثة ضخمة تحت وطأة الضغط العالي. التدريب المسبق يحول التوتر إلى ذاكرة عضلية وثقة مطلقة.',
    whyPillars: [
      {
        title: 'إتقان الطيران اليدوي بدون أجهزة توجيه (FD OFF, A/T OFF)',
        desc: 'يقيم الفاحصون قدرتك على قيادة طائرة ركاب نفاثة تزن 70 طناً يدوياً بدون طيار آلي أو موجهات. أتقن جداول زوايا الميل والدفع لطائرات بوينغ 737، والالتفاف بزاوية 45 درجة، وتتبع مسار ILS وفق معايير الشركات الدقيقة.',
      },
      {
        title: 'عطل المحرك عند سرعة القرار V1 وإجراءات QRH',
        desc: 'فقدان المحرك عند سرعة V1 يتطلب استجابة فورية لحفظ اتجاه المدرج، واستخدام دقيق لموازن التوجيه، وإجراء الذهاب حولاً بمحرك واحد، وتطبيق قوائم فحص QRH المنظمة تحت الضغط.',
      },
      {
        title: 'إتقان اقترابات الطيران الآلي الدقيقة وغير الدقيقة',
        desc: 'برمجة كاملة لـ FMS/CDU، مسارات SID/STAR، مناطق الانتظار، واقترابات ILS وRNAV/RNP في ظروف الرؤية المحدودة والرياح الجانبية.',
      },
      {
        title: 'إرشاد من قادة طائرات مدنية وتنسيق الطاقم (MCC)',
        desc: 'تدريب فردي مباشر مع كابتن طيران تجاري متمرس يعمل كطيار مراقب (PM)، أو التدرب مع شريكك في الطيران لتكرار ملف الاختبار الدقيق للشركة المستهدفة.',
      },
    ],
    bookDirectTitle: 'هل أنت مستعد لتأكيد موعد تدريب التقييم؟',
    bookDirectSubtitle:
      'اختر مدة الجلسة المطلوبة للانتقال المباشر إلى نظام الحجز الاحترافي دون أي خيارات غير ضرورية.',
    bookDirectCta: (price) => `حجز جلسة التقييم الموصى بها (90 دقيقة — ${price})`,
    bookDirect60: (price) => `جلسة مركزة 60 دقيقة · ${price}`,
    bookDirect120: (price) => `جلسة شاملة 120 دقيقة · ${price}`,
    recreationalLink: 'هل تبحث عن باقات الطيران الترفيهية أو الهدايا؟ شاهد الباقات العامة ←',
    perSession: '/ جلسة',
    iosReset: 'إعادة ضبط فورية لمسارات الاقتراب عبر محطة المدرب IOS',
    bookBtn: (title, price) => `حجز ${title} (${price})`,
    officialServicePage: 'عرض صفحة الخدمة على موقع simdream.co.il',
    recommendedBadge: 'الخيار الموصى به لاختبارات شركات الطيران',
    interviewGuideBadge: 'التحضير لمقابلات واختبارات المحاكاة ATP / ATPL',
    interviewGuideTitle: 'تدرب على اختبار المحاكاة الفعلي — وليس مجرد قضاء وقت في القمرة',
    interviewGuideDesc:
      'صُممت باقات PRO لمرشحي رخص ATP / ATPL والطيارين المتدربين والمهنيين الراغبين في ممارسة المهام المطلوبة في اختبارات شركات الطيران: الطيران اليدوي بدون مساعدات آلية، إجراءات الأجهزة، حالات الطوارئ، معايير SOP، والتنسيق بين أفراد الطاقم.',
    sessionFlowLabel: 'تسلسل الجلسة: ',
    interviewPackages: [
      {
        duration: '60 دقيقة',
        title: 'Airline Interview Prep 60 PRO',
        slug: 'airline-prep-60-pro',
        bestFor:
          'للتركيز على موضوع أو موضوعين محددين قبل مقابلة التقييم (Raw Data، الالتفاف الحاد، اقتراب محدد).',
        flow: 'موجز قصير → تدريب مركز على Raw Data أو الأجهزة → تحليل الأداء ونقاط التطوير.',
      },
      {
        duration: '90 دقيقة',
        title: 'Airline Interview Prep 90 PRO',
        slug: 'airline-prep-90-pro',
        bestFor:
          'محاكاة شاملة ومتوازنة لاختبار التقييم الكامل قبل موعد الفحص (المعيار الموصى به).',
        flow: 'برمجة FMS → الإقلاع والطيران اليدوي → سيناريو عطل محرك / اقتراب → تقييم منهجي.',
      },
      {
        duration: '120 دقيقة',
        title: 'Airline Interview Prep 120 PRO',
        slug: 'airline-assessment-prep',
        bestFor:
          'تدريب معمق، وممارسة العمل الثنائي PF/PM، وإعادة تكرار حالات الطوارئ والنقاط الحرجة.',
        flow: 'عدة مسارات تدريبية → توزيع المهام كطاقم طيارين → تكرار التمارين → تقرير تفصيلي.',
      },
    ],
    interviewNote:
      'تدريب عملي مخصص وموجه لأهدافك على جهاز محاكاة بوينغ 737 ماكس في شارع غيرشون شاتس 36، تل أبيب، مع مرونة المدرب أو شريك الطيران.',
    techSpecsSummary:
      'حول مركز سيم دريم والمواصفات الفنية لقمرة بوينغ 737 ماكس (انقر للتوسيع)',
    techSpecsVisualsTitle: 'نظام العرض البانورامي وهيكل القمرة',
    techSpecsVisualsDesc:
      'قمرة قيادة مغلقة بمقياس 1:1 لطائرة بوينغ 737 ماكس مع ظروف إضاءة ديناميكية وتأثيرات صوتية واقعية.',
    techSpecsControlsTitle: 'أدوات التحكم وإلكترونيات الطيران',
    techSpecsControlsDesc:
      'مقاود تحكم مزدوجة ومقترنة مع محاكاة الأحمال الهوائية الديناميكية، دواسات توجيه مقترنة، أذرع دفع آلية، جهازا FMS/CDU ولوحة الطيار الآلي MCP.',
    techSpecsLocationTitle: 'الموقع والتنسيق',
    techSpecsLocationDesc: `يقع مركز Sim Dream في شارع ${FACILITY_INFO.address.streetEn} (بالقرب من محطة القطار الخفيف يهوديت ومحطة قطار ههشالوم). هاتف: ${FACILITY_INFO.contact.phoneDisplay}.`,
    b2cBridgeBadge: 'هل تبحث عن رحلات تجريبية أو ورش عمل للشركات؟',
    b2cBridgeTitle: 'اكتشف باقات الطيران العامة أو احجز ورشة عمل CRM لفرق القيادة',
    b2cBtn: 'تجارب الطيران والهدايا (B2C)',
    b2bBtn: 'ورش عمل CRM للشركات (B2B)',
    proTracksBadge: 'الإعداد لمقابلات شركات الطيران · مسارات PRO',
    proTracksTitle: 'تدرّبوا أكثر من مرة قبل التقييم الحقيقي',
    proTracksDesc:
      'تجربة تقييم واحدة تُظهر لكم أين تقفون. ثلاث أو خمس جلسات PRO، بدفعة واحدة وبحجز في الوقت الذي يناسبكم، تتيح لكابتن عامل في شركة طيران إصلاح نقاط الضعف قبل أن يجدها الممتحن. جلسات PRO نفسها دون تشويش، وبسعر أقل للجلسة.',
    proTracksSessionsLabel: 'جلسات PRO',
    proTracksStandardValueLabel: 'قيمة الجلسات الفردية',
    proTracksSavingsLabel: 'توفرون',
    proTracksPerSessionLabel: 'للجلسة',
    proTracksFlexibility: 'دفعة واحدة · كل جلسة في الوقت الذي يناسبكم · بدون إضافات',
    proTracksCta: 'ابدؤوا مسار PRO هذا',
    proTracksRedirecting: 'جارٍ التحويل للدفع...',
    proTracksDispatch: 'أسئلة؟ تواصلوا مع العمليات',
    proTracksDisclosure:
      'مسارات PRO هي إعداد عملي على جهاز المحاكاة. لا تمنح ساعات طيران مسجلة أو رخصة أو تأهيلاً على طراز أو رصيداً لاختبار.',
  },
  de: {
    heroBadge: 'PROFI-TRAINING • AIRLINE-ASSESSMENT-VORBEREITUNG',
    heroTitle: 'Profi-Training — Airline-Assessment & Piloten-Screening-Vorbereitung',
    heroSubtitle:
      'Maßgeschneidert für lizenzierte Piloten (PPL / CPL / ATPL), Kadetten und Airline-Bewerber zur Vorbereitung auf Simulator-Screenings (El Al, Arkia, Israir, Ryanair, Wizz Air & internationale Airlines). Individuelles Sicht- und Instrumententraining im 1:1-Boeing-737-MAX-Flugdeck.',
    heroCtaPrimary: 'Airline-Assessment-Vorbereitung buchen (90 PRO)',
    heroCtaSecondary: 'Warum Piloten Vorbereitung brauchen ↓',
    trustFMC: '1:1 Boeing 737 MAX Cockpit',
    trustMentors: 'Aktive Flugkapitäne als Mentoren',
    trustIOS: 'Sofortige IOS-Anflug-Resets',
    trustZeroNoise: 'Ablenkungsfreie Profi-Sessions',
    whyBadge: 'ENTSCHEIDENDE SCREENING-VORBEREITUNG',
    whyHeading: 'Warum Berufspiloten eine gezielte Simulator-Assessment-Vorbereitung brauchen',
    whySubtitle:
      'Airline-Simulator-Checkrides sind Auswahlprüfungen ohne Fehlertoleranz. Ein nicht bestandenes Screening führt oft zu einer 6- bis 12-monatigen Sperrfrist. Darum verschafft Ihnen strukturiertes Training in unserem 1:1-Boeing-737-MAX-Flugdeck den entscheidenden Vorsprung:',
    whyCalloutTitle: 'Die Realität des Assessment-Checkrides',
    whyCalloutDesc:
      'Airline-Prüfer bewerten nicht Ihre gesamte Flugbuch-Stundenzahl – sie prüfen, wie Sie ein 70-Tonnen-Jetflugzeug am Prüfungstag unter hohem Druck beherrschen. Vorheriges Cockpit-Training verwandelt Nervosität in automatisierte Abläufe.',
    whyPillars: [
      {
        title: 'Manuelles Raw-Data-Fliegen (FD OFF, A/T OFF)',
        desc: 'Prüfer testen das manuelle Fliegen ohne Automatik. Beherrschen Sie Boeing-737-Pitch-&-Power-Tabellen, 45°-Steilkurven und Raw-Data-ILS-Tracking innerhalb enger Airline-Toleranzen.',
      },
      {
        title: 'Triebwerksausfall bei V1 (V1 Cut) & QRH-Disziplin',
        desc: 'Ein Triebwerksausfall bei Entscheidungsgeschwindigkeit V1 erfordert sofortige Richtungskontrolle, präzise Seitenrudertrimmung, einmotoriges Durchstarten und strukturierte QRH-Checklistenarbeit unter Zeitdruck.',
      },
      {
        title: 'Präzisions- & Nicht-Präzisions-Instrumentenanflüge (IFR)',
        desc: 'Vollständige FMS/CDU-Initialisierung, SID/STAR-Abflüge, Holding-Verfahren sowie LOC/DME- und RNAV/RNP-AR-Anflüge bei geringer Sicht und böigem Seitenwind.',
      },
      {
        title: 'Coaching mit aktivem Flugkapitän & PM-Koordination',
        desc: 'Trainieren Sie 1-zu-1 mit aktiven Verkehrspiloten, die aktuelle Airline-Assessment-Profile kennen. Ihr Instruktor agiert als Pilot Monitoring (PM) oder macht den Platz für Ihren Crew-Partner frei.',
      },
    ],
    bookDirectTitle: 'Bereit, Ihren Airline-Assessment-Termin zu sichern?',
    bookDirectSubtitle:
      'Wählen Sie unten Ihre Trainingsdauer für den schlanken 2-Schritte-Profi-Buchungsflow ohne ablenkende Extras.',
    bookDirectCta: (price) => `Empfohlenen 90-Minuten-Checkride buchen (${price})`,
    bookDirect60: (price) => `60 Min. Fokus · ${price}`,
    bookDirect120: (price) => `120 Min. Intensiv · ${price}`,
    recreationalLink: 'Suchen Sie Erlebnisflüge oder Geschenkgutscheine? Zu den Standardpaketen →',
    perSession: '/ Session',
    iosReset: 'Sofortige IOS-Anflug-Resets',
    bookBtn: (title, price) => `${title} buchen (${price})`,
    officialServicePage: 'Service-Seite auf simdream.co.il ansehen',
    recommendedBadge: 'EMPFOHLEN FÜR AIRLINE-SCREENINGS',
    interviewGuideBadge: 'ATP / ATPL INTERVIEW-VORBEREITUNG',
    interviewGuideTitle: 'Trainieren Sie gezielt für das Simulator-Interview – nicht nur Cockpit-Zeit',
    interviewGuideDesc:
      'Diese PRO-Pakete sind für ATP-/ATPL-Kandidaten, Kadetten und Berufspiloten konzipiert, die typische Screening-Aufgaben trainieren möchten: manuelles Fliegen, Instrumentenverfahren, Notfälle, SOP-Disziplin und Crew-Koordination.',
    sessionFlowLabel: 'Ablauf der Session: ',
    interviewPackages: [
      {
        duration: '60 Minuten',
        title: 'Airline Interview Prep 60 PRO',
        slug: 'airline-prep-60-pro',
        bestFor:
          'Gezieltes Training für ein bis zwei Schwerpunkte vor dem Screening (Raw Data, Steilkurven, spezieller Anflug).',
        flow: 'Kurzes Briefing → fokussiertes Raw-Data- oder IFR-Profil → Debriefing mit nächsten Schritten.',
      },
      {
        duration: '90 Minuten',
        title: 'Airline Interview Prep 90 PRO',
        slug: 'airline-prep-90-pro',
        bestFor:
          'Kandidaten, die eine ausgewogene Generalprobe von Anfang bis Ende vor der Prüfung wünschen (Standardempfehlung).',
        flow: 'FMS-Setup → Abflug & Raw Data → Triebwerks- oder Anflugszenario → strukturiertes Debriefing.',
      },
      {
        duration: '120 Minuten',
        title: 'Airline Interview Prep 120 PRO',
        slug: 'airline-assessment-prep',
        bestFor:
          'Intensive Vorbereitung, PF/PM-Crew-Training, vollständige Notfallszenarien und Zeit zur Wiederholung von Schwachpunkten.',
        flow: 'Mehrere Übungsprofile → Zwei-Piloten-Ablauf → Wiederholung zentraler Manöver → detailliertes Debriefing.',
      },
    ],
    interviewNote:
      'Die Vorbereitung ist praxisnahes Coaching auf unserem Boeing 737 MAX Simulator in der Gershon Shatz 36 in Tel Aviv mit flexibler Instruktor-/PM-Unterstützung.',
    techSpecsSummary:
      'Über Sim Dream & technische Spezifikationen des Boeing 737 MAX Simulators (zum Aufklappen klicken)',
    techSpecsVisualsTitle: 'Sichtsystem & Cockpit-Struktur',
    techSpecsVisualsDesc:
      'Geschlossenes Boeing 737 MAX Flugdeck im Maßstab 1:1 mit dynamischen Tag-/Dämmerungs-/Nachtbedingungen und authentischem Raumklang.',
    techSpecsControlsTitle: 'Steuerung & Avionik',
    techSpecsControlsDesc:
      'Mechanisch gekoppelte Steuersäulen mit dynamischer Steuerkraftsimulation, gekoppelte Seitenruderpedale, motorisierter Schubhebelquadrant, duale Sismo-FMS/CDUs und CPflight MCP.',
    techSpecsLocationTitle: 'Standort & Terminplanung',
    techSpecsLocationDesc: `Standort: ${FACILITY_INFO.address.streetEn} (nahe Stadtbahn Yehudit & Bahnhof HaShalom). Direktkontakt: ${FACILITY_INFO.contact.phoneDisplay}.`,
    b2cBridgeBadge: 'ERLEBNISFLÜGE ODER BUSINESS-WORKSHOPS GESUCHT?',
    b2cBridgeTitle: 'Entdecken Sie Freizeit-Flugpakete oder Business-CRM-Workshops',
    b2cBtn: 'Flugerlebnisse (B2C)',
    b2bBtn: 'Business-CRM-Workshops (B2B)',
    proTracksBadge: 'MEHRSTUFIGE AIRLINE-INTERVIEW-VORBEREITUNG',
    proTracksTitle: 'Mehr als einmal proben, bevor das echte Assessment zählt',
    proTracksDesc:
      'Eine Generalprobe zeigt, wo Sie stehen. Mit drei oder fünf PRO-Sessions – einmal bezahlt und flexibel gebucht – behebt ein aktiver Flugkapitän Schwachstellen, bevor der Prüfer sie sieht. Dieselben ruhigen PRO-Sessions zu einem günstigeren Preis pro Session.',
    proTracksSessionsLabel: 'PRO-Sessions',
    proTracksStandardValueLabel: 'Einzelbuchungswert',
    proTracksSavingsLabel: 'Sie sparen',
    proTracksPerSessionLabel: 'pro Session',
    proTracksFlexibility: 'Einmalzahlung · jede Session flexibel buchen · keine Extras',
    proTracksCta: 'Dieses PRO-Programm starten',
    proTracksRedirecting: 'Weiterleitung zur Zahlung...',
    proTracksDispatch: 'Fragen? Disposition kontaktieren',
    proTracksDisclosure:
      'PRO-Programme sind praxisnahe Simulatorvorbereitung. Sie verleihen keine anrechenbaren Flugstunden, keine Lizenz, kein Type Rating und keine Prüfungsanerkennung.',
  },
};
