'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock,
  Award,
  CheckCircle2,
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
import { getLocalizedPackages, Language } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { FACILITY_INFO } from '@/lib/config/facility-info';

const SIMDREAM_SERVICE_URLS: Record<string, string> = {
  'pkg-pro-60': 'https://www.simdream.co.il/service-page/airline-interview-prep-60-pro?referral=service_list_widget',
  'pkg-pro-90': 'https://www.simdream.co.il/service-page/airline-interview-prep-90-pro?referral=service_list_widget',
  'pkg-assessment-prep-120': 'https://www.simdream.co.il/service-page/airline-interview-prep-120-pro?referral=service_list_widget',
};

interface ProCopy {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  packagesBadge: string;
  packagesHeading: string;
  recreationalLink: string;
  minutesLabel: string;
  perSession: string;
  iosReset: string;
  syllabusLabel: string;
  bookBtn: (title: string, price: string) => string;
  officialServicePage: string;
  interviewGuideBadge: string;
  interviewGuideTitle: string;
  interviewGuideDesc: string;
  sessionFlowLabel: string;
  interviewPackages: Array<{
    duration: string;
    title: string;
    bestFor: string;
    flow: string;
  }>;
  interviewNote: string;
  methodologyBadge: string;
  methodologyTitle: string;
  proModules: Array<{
    title: string;
    desc: string;
  }>;
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
    heroBadge: 'PROFESSIONAL TRAINING • AIRLINE INTERVIEW PREPARATION (60 / 90 / 120 MIN)',
    heroTitle: 'Professional Training — Airline Assessment & Pilot Screening Prep',
    heroSubtitle:
      'Tailored for licensed commercial pilots (PPL / CPL / ATPL), cadets, and airline applicants preparing for simulator screening evaluations (El Al, Arkia, Israir, Ryanair, Wizz Air & international carriers). Personalized visual and instrument flight training in a 1:1 scale Boeing 737 MAX flight deck.',
    packagesBadge: 'OFFICIAL AIRLINE INTERVIEW PREP PACKAGES',
    packagesHeading: 'Select Your Airline Interview Prep Block',
    recreationalLink: 'Looking for Recreational & Gift Flight Packages? View Standard Packages →',
    minutesLabel: 'MINUTES PROFESSIONAL TRAINING',
    perSession: '/ session',
    iosReset: 'Instant IOS Approach Resets',
    syllabusLabel: 'PRO Syllabus & Included Profiles:',
    bookBtn: (title, price) => `Book ${title} (${price})`,
    officialServicePage: 'View Service Page on simdream.co.il',
    interviewGuideBadge: 'ATP / ATPL INTERVIEW PREPARATION',
    interviewGuideTitle: 'Practice for the simulator interview — not just cockpit time',
    interviewGuideDesc:
      'These PRO packages are built for ATP / ATPL candidates, cadets, and commercial pilots who want to practise the skills commonly explored in airline simulator interviews: manual flying, instrument procedures, abnormal situations, SOP discipline, and crew coordination. Choose the session length that matches the depth of practice you need.',
    sessionFlowLabel: 'Session flow: ',
    interviewPackages: [
      {
        duration: '60 minutes',
        title: 'ATP / ATPL Interview Focus',
        bestFor: 'Targeting one or two priorities before an interview or simulator assessment.',
        flow: 'Short brief → focused raw-data or instrument profile → debrief with next steps.',
      },
      {
        duration: '90 minutes',
        title: 'Airline Simulator Interview Rehearsal',
        bestFor: 'Candidates who want a balanced, end-to-end practice run before their assessment.',
        flow: 'FMS setup → departure and raw data → engine or approach scenario → structured debrief.',
      },
      {
        duration: '120 minutes',
        title: 'ATP / ATPL Assessment Intensive',
        bestFor: 'Deep preparation, PF/PM crew practice, and time to repeat improvement areas.',
        flow: 'Multiple practice profiles → two-pilot workflow → repeat key exercises → detailed debrief.',
      },
    ],
    interviewNote:
      'Preparation is practical coaching tailored to your goals conducted on the Boeing 737 MAX simulator at Gershon Shatz 36 Tel Aviv with instructor / PM flexibility.',
    methodologyBadge: 'AIRLINE CHECKRIDE METHODOLOGY',
    methodologyTitle: 'What You Will Train in Your Professional Training Session',
    proModules: [
      {
        title: 'Raw Data Manual Flight (Flight Director OFF)',
        desc: 'Master Boeing 737 pitch-and-thrust power tables, steep 45° bank turns, altitude/airspeed tolerances, and stall recovery to strict airline checkride standards.',
      },
      {
        title: 'Precision & Non-Precision IFR (ILS, RNAV, RNP-AR)',
        desc: 'Full FMS/CDU route initialization, SID/STAR transitions, published holding patterns, and raw-data ILS & LOC/DME approaches in low-visibility crosswinds.',
      },
      {
        title: 'V1 Engine Failure (V1 Cut) & QRH Abnormal Flows',
        desc: 'Engine failure at takeoff decision speed, rudder trim discipline, Single-Engine ILS approach, single-engine go-around, and structured QRH checklist execution.',
      },
      {
        title: 'Flexible Crew Seat: Instructor as PM or Bring Your Partner',
        desc: 'Our instructor can serve as your Pilot Monitoring (PM) or cede the right seat to your crew partner or personal flight examiner for two-crew training.',
      },
    ],
    techSpecsSummary:
      'About Sim Dream & Boeing 737 MAX Simulator Technical Specifications (Click to Expand)',
    techSpecsVisualsTitle: 'Visual & Cockpit Shell',
    techSpecsVisualsDesc:
      '1:1 scale enclosed Boeing 737 MAX flight deck with 220° cylindrical laser projection, dynamic day/dusk/night visuals, and authentic spatial sounds.',
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
    packagesBadge: 'חבילות הדרכה רשמיות להזמנה ישירה',
    packagesHeading: 'חבילות הכנה למבדקי חברות תעופה',
    recreationalLink: 'מחפשים חבילות חוויה או מתנה לקהל הרחב? לחצו כאן ←',
    minutesLabel: 'דקות אימון מקצועי',
    perSession: '/ סשן מקצועי',
    iosReset: 'עמדת IOS לאיפוס גישות מיידי',
    syllabusLabel: 'סילבוס ודגשי האימון:',
    bookBtn: (title, price) => `הזמנת ${title} (${price})`,
    officialServicePage: 'דף השירות הרשמי ב-simdream.co.il',
    interviewGuideBadge: 'הכנה לראיון ולמבדק סימולטור',
    interviewGuideTitle: 'מתאמנים למבדק סימולטור — לא רק מזמינים זמן בתא הטייס',
    interviewGuideDesc:
      'חבילות ה-PRO בנויות עבור מועמדי ATP / ATPL, קדטים וטייסים מסחריים שרוצים לתרגל את המשימות שמופיעות בדרך כלל במיוני חברות תעופה: הטסה ידנית, ניווט מכשירים, ניהול תקלות, SOP ועבודת צוות. בחרו את משך הסשן לפי עומק התרגול הדרוש לכם.',
    sessionFlowLabel: 'מבנה הסשן: ',
    interviewPackages: [
      {
        duration: '60 דקות',
        title: 'ATP / ATPL Interview Focus',
        bestFor: 'למיקוד בנושא או שניים לפני ראיון או מבדק סימולטור.',
        flow: 'תדריך קצר → Raw Data / גישת מכשירים ממוקדת → דיבריף עם נקודות עבודה.',
      },
      {
        duration: '90 דקות',
        title: 'Airline Simulator Interview Rehearsal',
        bestFor: 'למועמדים שרוצים חזרה מלאה ומאוזנת לפני מבדק.',
        flow: 'הגדרת FMS → יציאה ו-Raw Data → תרחיש מנוע / גישה → דיבריף מובנה.',
      },
      {
        duration: '120 דקות',
        title: 'ATP / ATPL Assessment Intensive',
        bestFor: 'לתרגול מעמיק, עבודה בצוות PF/PM וזמן לחזרה על נקודות לשיפור.',
        flow: 'כמה פרופילי תרגול → תפעול שני טייסים → חזרה על תרגילים → דיבריף מפורט.',
      },
    ],
    interviewNote:
      'ההכנה היא אימון מעשי מותאם אישית למטרותיכם. האימון מועבר על גבי סימולטור בואינג 737 MAX ברחוב גרשון שץ 36 תל אביב עם אפשרות לצוות שני או מדריך אישי.',
    methodologyBadge: 'מתודולוגיית אימון מקצועית',
    methodologyTitle: 'מה מתרגלים בסשן ההדרכה המקצועית?',
    proModules: [
      {
        title: 'הטסת Raw Data ידנית (ללא Flight Director)',
        desc: 'תרגול מדויק של טבלאות Pitch & Thrust, שמירת גובה ומהירות בפניות 45°, היחלצות מהזדקרות ועבודת אוויר לפי דרישות בוחני חברות התעופה.',
      },
      {
        title: 'גישות מכשירים: ILS, RNAV ו-RNP-AR',
        desc: 'הזנת תוכנית טיסה מלאה ב-FMS/CDU, תהליכי יציאה והצטרפות (SID/STAR), מעגלי המתנה (Holdings) והנמכות מכשירים בראות מוגבלת ורוחות צד.',
      },
      {
        title: 'תקלת מנוע ב-V1 (V1 Cut) ונהלי QRH',
        desc: 'תרגול אובדן מנוע בהמראה, שמירת ציר מסלול, גישת ILS במנוע בודד (Single-Engine ILS), הליכה סביב (Go-Around) וחלוקת עבודה בצוות (PF/PM).',
      },
      {
        title: 'גמישות צוותית: מדריך כ-PM או צוות של 2 טייסים',
        desc: 'מדריך הסימולטור יכול לתפקד כקצין ראשון (PM/PNF) או לפנות את המושב הימני לטייס שותף / מדריך אישי מטעמכם לאימון MCC מלא.',
      },
    ],
    techSpecsSummary:
      'אודות מרכז הסימולטור ומפרט טכני של תא הטייס בואינג 737 MAX (לחצו לצפייה)',
    techSpecsVisualsTitle: 'תצוגה פנורמית ומבנה',
    techSpecsVisualsDesc:
      'תא טייס סגור בקנה מידה 1:1 של בואינג 737 MAX עם מסך הקרנה פנורמי מעוגל בזווית 220° ברזולוציית 4K, תאורת קוקפיט מלאה ומערכת שמע היקפית מתקדמת.',
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
    packagesBadge: 'ОФИЦИАЛЬНЫЕ ПРОГРАММЫ ПОДГОТОВКИ К СОБЕСЕДОВАНИЯМ',
    packagesHeading: 'Выберите блок профессиональной подготовки',
    recreationalLink: 'Ищете ознакомительные или подарочные полеты? Стандартные пакеты →',
    minutesLabel: 'МИНУТ ПРОФЕССИОНАЛЬНОЙ ПОДГОТОВКИ',
    perSession: '/ сессия',
    iosReset: 'Мгновенный сброс заходов через пульт IOS',
    syllabusLabel: 'Программа тренировки и отрабатываемые профили:',
    bookBtn: (title, price) => `Забронировать ${title} (${price})`,
    officialServicePage: 'Страница услуги на сайте simdream.co.il',
    interviewGuideBadge: 'ПОДГОТОВКА К ИНТЕРВЬЮ И ТРЕНАЖЕРУ ATP / ATPL',
    interviewGuideTitle: 'Тренируйтесь для реального скрининга — не просто время в кабине',
    interviewGuideDesc:
      'Пакеты PRO созданы для соискателей ATP / ATPL, курсантов и коммерческих пилотов, желающих отработать типовые задания отборочных скринингов: пилотирование Raw Data без директоров, заходы по приборам, особые случаи в полете, соблюдение SOP и взаимодействие в экипаже.',
    sessionFlowLabel: 'Структура сессии: ',
    interviewPackages: [
      {
        duration: '60 минут',
        title: 'ATP / ATPL Interview Focus',
        bestFor: 'Целевая отработка одного-двух ключевых навыков перед скринингом.',
        flow: 'Краткий брифинг → профиль Raw Data / инструментальный заход → дебрифинг с рекомендациями.',
      },
      {
        duration: '90 минут',
        title: 'Airline Simulator Interview Rehearsal',
        bestFor: 'Полная сбалансированная репетиция контрольного полета перед отбором.',
        flow: 'Инициализация FMS → взлет и Raw Data → отказ двигателя / заход → структурированный разбор.',
      },
      {
        duration: '120 минут',
        title: 'ATP / ATPL Assessment Intensive',
        bestFor: 'Глубокая проработка, командное взаимодействие PF/PM и повтор проблемных элементов.',
        flow: 'Несколько профилей полета → работа в два пилота → отработка ошибок → детальный дебрифинг.',
      },
    ],
    interviewNote:
      'Практическая подготовка, адаптированная под требования авиакомпаний, на симуляторе Boeing 737 MAX по адресу: Тель-Авив, ул. Гершон Шац 36.',
    methodologyBadge: 'МЕТОДОЛОГИЯ ЧЕК-РАЙДОВ АВИАКОМПАНИЙ',
    methodologyTitle: 'Что отрабатывается на профессиональной сессии?',
    proModules: [
      {
        title: 'Ручное пилотирование Raw Data (FD OFF)',
        desc: 'Таблицы Pitch & Thrust для Boeing 737, виражи 45°, выдерживание высоты и скорости, вывод из сваливания по жестким стандартам авиакомпаний.',
      },
      {
        title: 'Заходы по приборам: ILS, RNAV и RNP-AR',
        desc: 'Полная инициализация маршрута в FMS/CDU, схемы SID/STAR, зоны ожидания (Holdings) и точные заходы по ILS в условиях бокового ветра и низкой видимости.',
      },
      {
        title: 'Отказ двигателя на V1 (V1 Cut) и действия по QRH',
        desc: 'Отказ двигателя на скорости принятия решения, балансировка триммером руля направления, заход ILS на одном двигателе, уход на второй круг и чек-листы QRH.',
      },
      {
        title: 'Гибкость экипажа: инструктор в роли PM или второй пилот',
        desc: 'Наш инструктор может действовать как Pilot Monitoring (PM) либо уступить правое кресло вашему напарнику по экипажу для полноценного тренинга MCC.',
      },
    ],
    techSpecsSummary:
      'О центре Sim Dream и технические характеристики симулятора Boeing 737 MAX (нажмите для просмотра)',
    techSpecsVisualsTitle: 'Визуальная система и кабина',
    techSpecsVisualsDesc:
      'Закрытая кабина Boeing 737 MAX масштаба 1:1 с цилиндрическим проекционным экраном 220° 4K, реалистичной сменой времени суток и пространственным звуком.',
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
    packagesBadge: 'PROGRAMMES OFFICIELS DE PRÉPARATION AUX SÉLECTIONS',
    packagesHeading: 'Sélectionnez votre bloc d’entraînement professionnel',
    recreationalLink: 'Vous cherchez des vols découverte ou cadeaux ? Formules grand public →',
    minutesLabel: 'MINUTES DE FORMATION PROFESSIONNELLE',
    perSession: '/ session',
    iosReset: 'Repositionnements instantanés via console instructeur IOS',
    syllabusLabel: 'Programme professionnel et profils inclus :',
    bookBtn: (title, price) => `Réserver ${title} (${price})`,
    officialServicePage: 'Voir la page officielle sur simdream.co.il',
    interviewGuideBadge: 'PRÉPARATION AUX ENTRETIENS ET SÉLECTIONS ATP / ATPL',
    interviewGuideTitle: 'Entraînez-vous pour les sélections — pas seulement du temps de vol',
    interviewGuideDesc:
      'Ces packs PRO sont conçus pour les candidats ATP / ATPL, cadets et pilotes professionnels préparant les sélections : pilotage manuel brut, procédures aux instruments, pannes, respect des SOP et coordination équipage. Choisissez la durée adaptée à vos objectifs.',
    sessionFlowLabel: 'Déroulement de la session : ',
    interviewPackages: [
      {
        duration: '60 minutes',
        title: 'ATP / ATPL Interview Focus',
        bestFor: 'Ciblage d’une ou deux priorités avant un entretien ou une évaluation sur simulateur.',
        flow: 'Briefing court → profil Raw Data ou instruments ciblé → débriefing structuré.',
      },
      {
        duration: '90 minutes',
        title: 'Airline Simulator Interview Rehearsal',
        bestFor: 'Répétition complète et équilibrée d’une évaluation en compagnie aérienne.',
        flow: 'Initialisation FMS → départ et Raw Data → panne moteur / approche → débriefing complet.',
      },
      {
        duration: '120 minutes',
        title: 'ATP / ATPL Assessment Intensive',
        bestFor: 'Préparation approfondie, coordination PF/PM et temps de reprise des exercices.',
        flow: 'Profils multiples → travail en équipage deux pilotes → répétition des points clés → débriefing détaillé.',
      },
    ],
    interviewNote:
      'Coaching pratique adapté à vos objectifs sur simulateur Boeing 737 MAX au 36 rue Gershon Shatz, Tel Aviv, avec flexibilité instructeur / PM.',
    methodologyBadge: 'MÉTHODOLOGIE D’ÉVALUATION EN COMPAGNIE',
    methodologyTitle: 'Ce que vous travaillerez lors de votre session professionnelle',
    proModules: [
      {
        title: 'Vol manuel Raw Data (sans directeur de vol)',
        desc: 'Tables d’assiette et poussée Boeing 737, virages à 45°, tenue d’altitude et de vitesse, sortie de décrochage selon les normes strictes des compagnies.',
      },
      {
        title: 'Approches aux instruments : ILS, RNAV et RNP-AR',
        desc: 'Programmation complète du FMS/CDU, trajectoires SID/STAR, hippodromes d’attente et approches de précision ILS par vent de travers et faible visibilité.',
      },
      {
        title: 'Panne moteur à V1 (V1 Cut) et procédures QRH',
        desc: 'Gestion de la panne à la vitesse de décision, compensation au palonnier, approche ILS monomoteur, remise de gaz et exécution méthodique du QRH.',
      },
      {
        title: 'Configuration d’équipage : instructeur PM ou votre binôme',
        desc: 'Notre instructeur peut agir comme Pilot Monitoring (PM) ou céder la place droite à votre binôme ou instructeur personnel pour un entraînement MCC.',
      },
    ],
    techSpecsSummary:
      'À propos de Sim Dream et spécifications techniques du simulateur Boeing 737 MAX (cliquer pour ouvrir)',
    techSpecsVisualsTitle: 'Système visuel et structure cockpit',
    techSpecsVisualsDesc:
      'Cockpit fermé échelle 1:1 de Boeing 737 MAX avec écran cylindrique 220° 4K laser, visuel dynamique jour/nuit et acoustique spatiale immersive.',
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
    packagesBadge: 'باقات التدريب الرسمية للحجز المباشر',
    packagesHeading: 'اختر باقة التدريب لاختبارات شركات الطيران',
    recreationalLink: 'هل تبحث عن باقات الطيران الترفيهية أو الهدايا؟ شاهد الباقات العامة ←',
    minutesLabel: 'دقيقة تدريب احترافي',
    perSession: '/ جلسة',
    iosReset: 'إعادة ضبط فورية لمسارات الاقتراب عبر محطة المدرب IOS',
    syllabusLabel: 'المنهاج التدريبي والمحاور المشمولة:',
    bookBtn: (title, price) => `حجز ${title} (${price})`,
    officialServicePage: 'عرض صفحة الخدمة على موقع simdream.co.il',
    interviewGuideBadge: 'التحضير لمقابلات واختبارات المحاكاة ATP / ATPL',
    interviewGuideTitle: 'تدرب على اختبار المحاكاة الفعلي — وليس مجرد قضاء وقت في القمرة',
    interviewGuideDesc:
      'صُممت باقات PRO لمرشحي رخص ATP / ATPL والطيارين المتدربين والمهنيين الراغبين في ممارسة المهام المطلوبة في اختبارات شركات الطيران: الطيران اليدوي بدون مساعدات آلية، إجراءات الأجهزة، حالات الطوارئ، معايير SOP، والتنسيق بين أفراد الطاقم.',
    sessionFlowLabel: 'تسلسل الجلسة: ',
    interviewPackages: [
      {
        duration: '60 دقيقة',
        title: 'ATP / ATPL Interview Focus',
        bestFor: 'للتركيز على موضوع أو موضوعين محددين قبل مقابلة التقييم.',
        flow: 'موجز قصير → تدريب مركز على Raw Data أو الأجهزة → تحليل الأداء ونقاط التطوير.',
      },
      {
        duration: '90 دقيقة',
        title: 'Airline Simulator Interview Rehearsal',
        bestFor: 'محاكاة شاملة ومتوازنة لاختبار التقييم الكامل قبل موعد الفحص.',
        flow: 'برمجة FMS → الإقلاع والطيران اليدوي → سيناريو عطل محرك / اقتراب → تقييم منهجي.',
      },
      {
        duration: '120 دقيقة',
        title: 'ATP / ATPL Assessment Intensive',
        bestFor: 'تدريب معمق، وممارسة العمل الثنائي PF/PM، مع وقت لإعادة تكرار النقاط الحرجة.',
        flow: 'عدة مسارات تدريبية → توزيع المهام كطاقم طيارين → تكرار التمارين → تقرير تفصيلي.',
      },
    ],
    interviewNote:
      'تدريب عملي مخصص وموجه لأهدافك على جهاز محاكاة بوينغ 737 ماكس في شارع غيرشون شاتس 36، تل أبيب، مع مرونة المدرب أو شريك الطيران.',
    methodologyBadge: 'منهجية تقييم واختبارات شركات الطيران',
    methodologyTitle: 'ماذا ستتدرب عليه في جلسة التدريب الاحترافي؟',
    proModules: [
      {
        title: 'طيران يدوي كامل Raw Data (بدون Flight Director)',
        desc: 'إتقان جداول زوايا الميل والدفع (Pitch & Thrust)، الالتفاف بزاوية 45 درجة، الحفاظ على الارتفاع والسرعة والتعافي من الانهيار وفق معايير فاحصي الشركات.',
      },
      {
        title: 'اقترابات الطيران الآلي: ILS، RNAV وRNP-AR',
        desc: 'برمجة خطة الرحلة في FMS/CDU، إجراءات الإقلاع والوصول SID/STAR، مسارات الانتظار Holdings، والاقتراب الآلي في ظروف الرؤية المنخفضة والرياح الجانبية.',
      },
      {
        title: 'عطل المحرك عند سرعة القرار V1 وإجراءات QRH',
        desc: 'التدرب على فقدان المحرك أثناء الإقلاع، المحافظة على اتجاه المدرج، اقتراب ILS بمحرك واحد، الذهاب حولاً، وتطبيق قوائم فحص QRH المنظمة.',
      },
      {
        title: 'مرونة مقعد الطاقم: المدرب كمساعد طيار أو إحضار زميلك',
        desc: 'يمكن لمدربنا أن يؤدي دور الطيار المراقب (PM) أو إتاحة المقعد الأيمن لزميلك أو مدربك الخاص للتدرب على العمل الجماعي في القمرة (MCC).',
      },
    ],
    techSpecsSummary:
      'حول مركز سيم دريم والمواصفات الفنية لقمرة بوينغ 737 ماكس (انقر للتوسيع)',
    techSpecsVisualsTitle: 'نظام العرض البانورامي وهيكل القمرة',
    techSpecsVisualsDesc:
      'قمرة قيادة مغلقة بمقياس 1:1 لطائرة بوينغ 737 ماكس مع شاشة إسقاط ليزرية أسطوانية 220° بدقة 4K وتأثيرات صوتية واقعية.',
    techSpecsControlsTitle: 'أدوات التحكم وإلكترونيات الطيران',
    techSpecsControlsDesc:
      'مقاود تحكم مزدوجة ومقترنة مع محاكاة الأحمال الهوائية الديناميكية، دواسات توجيه مقترنة، أذرع دفع آلية، جهازا FMS/CDU ولوحة الطيار الآلي MCP.',
    techSpecsLocationTitle: 'الموقع والتنسيق',
    techSpecsLocationDesc: `يقع مركز Sim Dream في شارع ${FACILITY_INFO.address.streetHe} (بالقرب من محطة القطار الخفيف يهوديت ومحطة قطار ههشالوم). هاتف: ${FACILITY_INFO.contact.phoneDisplay}.`,
    b2cBridgeBadge: 'هل تبحث عن رحلات تجريبية أو ورش عمل للشركات؟',
    b2cBridgeTitle: 'اكتشف باقات الطيران العامة أو احجز ورشة عمل CRM لفرق القيادة',
    b2cBtn: 'تجارب الطيران والهدايا (B2C)',
    b2bBtn: 'ورش عمل CRM للشركات (B2B)',
  },
};

export function ProSessionsView() {
  const { language, isRTL } = useLanguage();
  const copy = PRO_COPY[language] || PRO_COPY.en;

  // Pull all PRO Training packages (60 PRO, 90 PRO, 120 PRO)
  const proPackages = getLocalizedPackages(language).filter((p) => p.category === 'training');

  const moduleIcons = [Gauge, Compass, ShieldCheck, Users];

  return (
    <main className="flex-1 py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* 1. PROFESSIONAL TRAINING HERO */}
      <section className="text-center max-w-4xl mx-auto space-y-5">
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
      </section>

      {/* 2. PRO TRAINING PACKAGES GRID (60 PRO, 90 PRO, 120 PRO) */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <Badge variant="amber">
              {copy.packagesBadge}
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2">
              {copy.packagesHeading}
            </h2>
          </div>
          <Link href="/experiences" className="text-xs font-mono text-sky-400 hover:underline">
            {copy.recreationalLink}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {proPackages.map((pkg) => (
            <Card
              key={pkg.id}
              glow={pkg.featured}
              borderAccent={pkg.featured ? 'amber' : 'sky'}
              className="flex flex-col justify-between relative overflow-hidden"
            >
              {pkg.badge && (
                <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                  <Badge variant={pkg.featured ? 'amber' : 'sky'}>{pkg.badge}</Badge>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {pkg.durationMinutes} {copy.minutesLabel}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white">{pkg.title}</h3>
                </div>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{pkg.description}</p>

                {/* Price Box */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-white font-mono">
                        {formatCurrency(pkg.priceIls)}
                      </span>
                      <span className="text-xs text-slate-400 font-mono ml-1 rtl:mr-1">
                        {copy.perSession}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">~${pkg.priceUsd} USD</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2.5 text-[11px] text-emerald-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" />
                      <span>{copy.iosReset}</span>
                    </span>
                  </div>
                </div>

                {/* Syllabus Highlights */}
                <div className="space-y-2">
                  <p className="text-[11px] font-mono uppercase text-amber-300 font-bold">
                    {copy.syllabusLabel}
                  </p>
                  <ul className="space-y-2 text-xs text-slate-200">
                    {pkg.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Direct Booking & Official Link */}
              <div className="pt-8 mt-auto space-y-3">
                <Link href={`/book?package=${pkg.slug}`}>
                  <Button
                    variant={pkg.featured ? 'primary' : 'secondary'}
                    className={`w-full font-bold justify-between ${
                      pkg.featured
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
                    href={SIMDREAM_SERVICE_URLS[pkg.id] || 'https://www.simdream.co.il/booking'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-amber-300 transition-colors"
                  >
                    <span>{copy.officialServicePage}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400/80" />
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 3. ATP / ATPL INTERVIEW PREPARATION GUIDE */}
      <section className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6 sm:p-8 space-y-8">
        <div className="max-w-4xl space-y-3">
          <Badge variant="amber">
            {copy.interviewGuideBadge}
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {copy.interviewGuideTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {copy.interviewGuideDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {copy.interviewPackages.map((pkg) => (
            <div key={pkg.duration} className="rounded-xl border border-slate-700/80 bg-slate-950/55 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-mono text-xs font-bold">
                <Clock className="w-4 h-4" />
                <span>{pkg.duration}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{pkg.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{pkg.bestFor}</p>
              <p className="border-t border-slate-800 pt-3 text-xs text-sky-200 leading-relaxed">
                <span className="font-bold text-sky-300">{copy.sessionFlowLabel}</span>
                {pkg.flow}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
          {copy.interviewNote}
        </p>
      </section>

      {/* 4. CORE TRAINING MODULES FOR PILOTS */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <Badge variant="sky">{copy.methodologyBadge}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {copy.methodologyTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {copy.proModules.map((mod, i) => {
            const IconComp = moduleIcons[i] || Gauge;
            return (
              <Card key={i} borderAccent="sky" className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <IconComp className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">{mod.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{mod.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 5. FACILITY & BOEING 737 MAX COCKPIT SPECIFICATIONS */}
      <section className="pt-4 border-t border-slate-900">
        <details className="group rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-400">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-mono text-xs text-slate-400 hover:text-slate-200">
            <span>
              {copy.techSpecsSummary}
            </span>
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
              <p>
                {copy.techSpecsVisualsDesc}
              </p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.techSpecsControlsTitle}
              </p>
              <p>
                {copy.techSpecsControlsDesc}
              </p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.techSpecsLocationTitle}
              </p>
              <p>
                {copy.techSpecsLocationDesc}
              </p>
            </div>
          </div>
        </details>
      </section>

      {/* 6. BOTTOM BRIDGE TO RECREATIONAL PACKAGES & B2B WORKSHOPS */}
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
    </main>
  );
}
