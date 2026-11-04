'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock,
  Award,
  ArrowRight,
  Compass,
  ShieldCheck,
  Gauge,
  Users,
  Radio,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Language } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { FACILITY_INFO } from '@/lib/config/facility-info';

const SIMDREAM_SERVICE_URLS: Record<string, string> = {
  'airline-prep-60-pro':
    'https://www.simdream.co.il/service-page/airline-interview-prep-60-pro?referral=service_list_widget',
  'airline-prep-90-pro':
    'https://www.simdream.co.il/service-page/airline-interview-prep-90-pro?referral=service_list_widget',
  'airline-assessment-prep':
    'https://www.simdream.co.il/service-page/airline-interview-prep-120-pro?referral=service_list_widget',
  'pkg-pro-60':
    'https://www.simdream.co.il/service-page/airline-interview-prep-60-pro?referral=service_list_widget',
  'pkg-pro-90':
    'https://www.simdream.co.il/service-page/airline-interview-prep-90-pro?referral=service_list_widget',
  'pkg-assessment-prep-120':
    'https://www.simdream.co.il/service-page/airline-interview-prep-120-pro?referral=service_list_widget',
};

interface ProCopy {
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
  bookDirectCta: string;
  bookDirect60: string;
  bookDirect120: string;
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
    priceIls: number;
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
}

const PRO_COPY: Record<Language, ProCopy> = {
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
    bookDirectCta: 'Book Recommended 90-Minute Rehearsal (₪1,250)',
    bookDirect60: '60m Focus · ₪890',
    bookDirect120: '120m Extended · ₪1,590',
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
        priceIls: 890,
        bestFor:
          'Targeting one or two priorities before an interview or simulator assessment (Raw data, steep turns, specific profile).',
        flow: 'Short brief → focused raw-data or instrument profile → debrief with next steps.',
      },
      {
        duration: '90 minutes',
        title: 'Airline Interview Prep 90 PRO',
        slug: 'airline-prep-90-pro',
        priceIls: 1250,
        bestFor:
          'Candidates who want a balanced, end-to-end rehearsal before their evaluation (Recommended standard for airline screenings).',
        flow: 'FMS setup → departure and raw data → engine or approach scenario → structured debrief.',
      },
      {
        duration: '120 minutes',
        title: 'Airline Interview Prep 120 PRO',
        slug: 'airline-assessment-prep',
        priceIls: 1590,
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
    bookDirectCta: 'הזמנת אימון מבדק מומלץ (90 דק׳ — ₪1,250)',
    bookDirect60: 'מיקוד 60 דק׳ · ₪890',
    bookDirect120: 'אימון מקיף 120 דק׳ · ₪1,590',
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
        priceIls: 890,
        bestFor:
          'למיקוד בנושא או שניים לפני ראיון או מבדק סימולטור (Raw Data, פניות חדות, גישה ספציפית).',
        flow: 'תדריך קצר → Raw Data / גישת מכשירים ממוקדת → דיבריף עם נקודות עבודה.',
      },
      {
        duration: '90 דקות',
        title: 'Airline Interview Prep 90 PRO',
        slug: 'airline-prep-90-pro',
        priceIls: 1250,
        bestFor:
          'למועמדים שרוצים חזרה מלאה ומאוזנת לפני מבדק (הסטנדרט המומלץ ביותר למיונים).',
        flow: 'הגדרת FMS → יציאה ו-Raw Data → תרחיש מנוע / גישה → דיבריף מובנה.',
      },
      {
        duration: '120 דקות',
        title: 'Airline Interview Prep 120 PRO',
        slug: 'airline-assessment-prep',
        priceIls: 1590,
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
    bookDirectCta: 'Забронировать рекомендуемую репетицию (90 мин — ₪1,250)',
    bookDirect60: '60 мин фокус · ₪890',
    bookDirect120: '120 мин полный курс · ₪1,590',
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
        priceIls: 890,
        bestFor:
          'Целевая отработка одного-двух ключевых навыков перед скринингом (Raw Data, виражи, конкретный заход).',
        flow: 'Краткий брифинг → профиль Raw Data / инструментальный заход → дебрифинг с рекомендациями.',
      },
      {
        duration: '90 минут',
        title: 'Airline Interview Prep 90 PRO',
        slug: 'airline-prep-90-pro',
        priceIls: 1250,
        bestFor:
          'Полная сбалансированная репетиция контрольного полета перед отбором (Рекомендуемый стандарт).',
        flow: 'Инициализация FMS → взлет и Raw Data → отказ двигателя / заход → структурированный разбор.',
      },
      {
        duration: '120 минут',
        title: 'Airline Interview Prep 120 PRO',
        slug: 'airline-assessment-prep',
        priceIls: 1590,
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
    bookDirectCta: 'Réserver la répétition recommandée (90 min — ₪1,250)',
    bookDirect60: 'Session ciblée 60 min · ₪890',
    bookDirect120: 'Session complète 120 min · ₪1,590',
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
        priceIls: 890,
        bestFor:
          'Ciblage d’une ou deux priorités avant un entretien ou une évaluation sur simulateur (Raw data, virages serrés, approche spécifique).',
        flow: 'Briefing court → profil Raw Data ou instruments ciblé → débriefing structuré.',
      },
      {
        duration: '90 minutes',
        title: 'Airline Interview Prep 90 PRO',
        slug: 'airline-prep-90-pro',
        priceIls: 1250,
        bestFor:
          'Répétition complète et équilibrée d’une évaluation en compagnie aérienne (Standard recommandé pour les sélections).',
        flow: 'Initialisation FMS → départ et Raw Data → panne moteur / approche → débriefing complet.',
      },
      {
        duration: '120 minutes',
        title: 'Airline Interview Prep 120 PRO',
        slug: 'airline-assessment-prep',
        priceIls: 1590,
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
    bookDirectCta: 'حجز جلسة التقييم الموصى بها (90 دقيقة — ₪1,250)',
    bookDirect60: 'جلسة مركزة 60 دقيقة · ₪890',
    bookDirect120: 'جلسة شاملة 120 دقيقة · ₪1,590',
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
        priceIls: 890,
        bestFor:
          'للتركيز على موضوع أو موضوعين محددين قبل مقابلة التقييم (Raw Data، الالتفاف الحاد، اقتراب محدد).',
        flow: 'موجز قصير → تدريب مركز على Raw Data أو الأجهزة → تحليل الأداء ونقاط التطوير.',
      },
      {
        duration: '90 دقيقة',
        title: 'Airline Interview Prep 90 PRO',
        slug: 'airline-prep-90-pro',
        priceIls: 1250,
        bestFor:
          'محاكاة شاملة ومتوازنة لاختبار التقييم الكامل قبل موعد الفحص (المعيار الموصى به).',
        flow: 'برمجة FMS → الإقلاع والطيران اليدوي → سيناريو عطل محرك / اقتراب → تقييم منهجي.',
      },
      {
        duration: '120 دقيقة',
        title: 'Airline Interview Prep 120 PRO',
        slug: 'airline-assessment-prep',
        priceIls: 1590,
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
  },
};

export function ProSessionsView() {
  const { language, isRTL } = useLanguage();
  const copy = PRO_COPY[language] || PRO_COPY.en;

  const pillarIcons = [Gauge, ShieldCheck, Compass, Users];

  return (
    <div className="flex-1 w-full min-w-0 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 sm:space-y-20">
      {/* 1. PROFESSIONAL TRAINING HERO WITH PROMINENT BOOK CTA */}
      <section className="text-center max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-xs font-mono text-amber-300 font-bold">
          <Award className="w-4 h-4 text-amber-400" />
          <span>{copy.heroBadge}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          {copy.heroTitle}
        </h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          {copy.heroSubtitle}
        </p>

        {/* Primary Booking & Information Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 pt-2">
          <Link href="/book?package=airline-prep-90-pro" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto font-bold shadow-glow text-base px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300"
            >
              <span>{copy.heroCtaPrimary}</span>
              <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </Link>
          <a href="#why-prep" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto font-semibold text-base px-6 py-4"
            >
              <span>{copy.heroCtaSecondary}</span>
            </Button>
          </a>
        </div>

        {/* Trust & Avionics Highlights Bar */}
        <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 max-w-4xl mx-auto text-left rtl:text-right">
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 flex items-center gap-2.5">
            <Compass className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono text-slate-200 font-semibold leading-tight">
              {copy.trustFMC}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 flex items-center gap-2.5">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono text-slate-200 font-semibold leading-tight">
              {copy.trustMentors}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono text-slate-200 font-semibold leading-tight">
              {copy.trustIOS}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono text-slate-200 font-semibold leading-tight">
              {copy.trustZeroNoise}
            </span>
          </div>
        </div>
      </section>

      {/* 2. WHY THEY NEED IT: HIGH-STAKES CHECKRIDE REALITY & EVALUATION DOMAINS */}
      <section id="why-prep" className="space-y-10 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="amber">{copy.whyBadge}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {copy.whyHeading}
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {copy.whySubtitle}
          </p>
        </div>

        {/* Screening Reality Callout Box */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-slate-950 p-6 sm:p-7 flex flex-col sm:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">
              {copy.whyCalloutTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {copy.whyCalloutDesc}
            </p>
          </div>
        </div>

        {/* The 4 Checkride Preparation Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {copy.whyPillars.map((pillar, idx) => {
            const IconComp = pillarIcons[idx] || Gauge;
            return (
              <Card
                key={idx}
                glow
                borderAccent="amber"
                className="p-6 sm:p-7 space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                    {pillar.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Direct Booking Call-To-Action Banner */}
        <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {copy.bookDirectTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              {copy.bookDirectSubtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/book?package=airline-prep-90-pro" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto font-bold shadow-glow bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 px-8 py-4 text-base"
              >
                <span>{copy.bookDirectCta}</span>
                <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link href="/book?package=airline-prep-60-pro">
              <Button variant="secondary" size="sm" className="font-mono text-xs">
                <span>{copy.bookDirect60}</span>
              </Button>
            </Link>
            <Link href="/book?package=airline-assessment-prep">
              <Button variant="secondary" size="sm" className="font-mono text-xs">
                <span>{copy.bookDirect120}</span>
              </Button>
            </Link>
          </div>

          <div className="pt-2">
            <Link
              href="/experiences"
              className="text-xs font-mono text-sky-400 hover:underline"
            >
              {copy.recreationalLink}
            </Link>
          </div>
        </div>
      </section>

      {/* 3. SESSION DEPTH BREAKDOWN & DIRECT BOOKING OPTIONS */}
      <section className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6 sm:p-8 space-y-8">
        <div className="max-w-4xl space-y-3">
          <Badge variant="amber">{copy.interviewGuideBadge}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {copy.interviewGuideTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {copy.interviewGuideDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {copy.interviewPackages.map((pkg) => {
            const isRecommended = pkg.slug === 'airline-prep-90-pro';
            return (
              <div
                key={pkg.slug}
                className={`rounded-2xl border p-6 flex flex-col justify-between space-y-5 transition-all ${
                  isRecommended
                    ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/15 via-slate-950/90 to-slate-950 shadow-glowAmber'
                    : 'border-slate-800 bg-slate-950/70'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-300 font-mono text-xs font-bold">
                      <Clock className="w-4 h-4" />
                      <span>{pkg.duration}</span>
                    </div>
                    {isRecommended && (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        {copy.recommendedBadge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">{pkg.title}</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                        {formatCurrency(pkg.priceIls)}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {copy.perSession}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {pkg.bestFor}
                  </p>

                  <div className="border-t border-slate-800/80 pt-3 text-xs text-sky-200 leading-relaxed">
                    <span className="font-bold text-sky-300">
                      {copy.sessionFlowLabel}
                    </span>
                    {pkg.flow}
                  </div>
                </div>

                <div className="pt-4 space-y-2.5">
                  <Link href={`/book?package=${pkg.slug}`}>
                    <Button
                      variant={isRecommended ? 'primary' : 'secondary'}
                      className={`w-full font-bold justify-between ${
                        isRecommended
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300'
                          : ''
                      }`}
                    >
                      <span>
                        {copy.bookBtn(pkg.title, formatCurrency(pkg.priceIls))}
                      </span>
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    </Button>
                  </Link>

                  <div className="text-center pt-1">
                    <a
                      href={
                        SIMDREAM_SERVICE_URLS[pkg.slug] ||
                        'https://www.simdream.co.il/booking'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-amber-300 transition-colors"
                    >
                      <span>{copy.officialServicePage}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400/80" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
          {copy.interviewNote}
        </p>
      </section>

      {/* 4. FACILITY & BOEING 737 MAX COCKPIT SPECIFICATIONS (CLEAN DISCLOSURE DRAWER) */}
      <section className="pt-4 border-t border-slate-900">
        <details className="group rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-400">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-mono text-xs text-slate-400 hover:text-slate-200">
            <span>{copy.techSpecsSummary}</span>
            <ChevronDown
              aria-hidden="true"
              className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180 shrink-0"
            />
          </summary>
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] leading-relaxed text-slate-400">
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.techSpecsVisualsTitle}
              </p>
              <p>{copy.techSpecsVisualsDesc}</p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.techSpecsControlsTitle}
              </p>
              <p>{copy.techSpecsControlsDesc}</p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.techSpecsLocationTitle}
              </p>
              <p>{copy.techSpecsLocationDesc}</p>
            </div>
          </div>
        </details>
      </section>

      {/* 5. BOTTOM BRIDGE TO RECREATIONAL PACKAGES & B2B WORKSHOPS */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left rtl:md:text-right">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-400 font-bold uppercase">
            <Sparkles className="w-4 h-4" />
            <span>{copy.b2cBridgeBadge}</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            {copy.b2cBridgeTitle}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link href="/experiences">
            <Button variant="secondary" size="sm">
              <span>{copy.b2cBtn}</span>
            </Button>
          </Link>
          <Link href="/workshops">
            <Button variant="outline" size="sm">
              <span>{copy.b2bBtn}</span>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
