'use client';

import React from 'react';
import Link from 'next/link';
import {
  Plane,
  Clock,
  Award,
  Users,
  Compass,
  HeartHandshake,
  Briefcase,
  UserCheck,
  ShieldCheck,
  Globe,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Facebook,
  Instagram,
  Youtube,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/i18n/language-context';
import { Language } from '@/lib/i18n/translations';
import { FACILITY_INFO } from '@/lib/config/facility-info';

interface AboutCopy {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  ratingLabel: string;
  minAgePillar: string;
  locationPillar: string;
  stepsBadge: string;
  stepsTitle: string;
  stepsSubtitle: string;
  missionSteps: Array<{
    step: string;
    title: string;
    desc: string;
    badge: string;
  }>;
  audienceBadge: string;
  audienceTitle: string;
  audienceProfiles: Array<{
    title: string;
    desc: string;
  }>;
  hoursTitle: string;
  hoursVal: string;
  hoursDesc: string;
  ageTitle: string;
  ageVal: string;
  ageDesc: string;
  locTitle: string;
  locVal: string;
  locDesc: string;
  socialTitle: string;
  socialSubtitle: string;
  specsSummary: string;
  specsVisualsTitle: string;
  specsVisualsDesc: string;
  specsControlsTitle: string;
  specsControlsDesc: string;
  specsNoticeTitle: string;
  specsNoticeDesc: string;
}

const ABOUT_COPY: Record<Language, AboutCopy> = {
  en: {
    heroBadge: 'ABOUT SIM DREAM ISRAEL • TEL AVIV FLIGHT EXPERIENCE CENTER',
    heroTitle: 'Where Aviation Dreams Take Flight in the Heart of Tel Aviv',
    heroSubtitle:
      'Founded in central Tel Aviv (Gershon Shatz 36), Sim Dream Israel opens the locked cockpit door of the world’s iconic commercial airliner — the Boeing 737 — to first-time flyers, families, aviation lovers, and corporate teams under 1-on-1 commercial pilot guidance.',
    ratingLabel: '5.0★ Google Rating (390+ Verified Reviews)',
    minAgePillar: 'Minimum Age: 10+ (Zero Experience Needed)',
    locationPillar: 'Gershon Shatz 36, Tel Aviv (4m from Yehudit Light Rail)',
    stepsBadge: 'HOW YOUR SESSION WORKS',
    stepsTitle: 'From Pre-Flight Briefing to Touchdown',
    stepsSubtitle:
      'Every flight session is a personalized, hands-on mission where you fly the aircraft from the Captain’s seat.',
    missionSteps: [
      {
        step: '01',
        title: 'Personal Captain’s Briefing (Pre-Flight)',
        desc: 'Take the Left Seat (Captain’s position) alongside your personal commercial pilot instructor. Together you select your departure and arrival airports, time of day, weather conditions, and flight plan tailored to your goals.',
        badge: '1-on-1 Pilot Guidance',
      },
      {
        step: '02',
        title: 'Thrust Set & Takeoff Roll',
        desc: 'Advance the dual thrust levers, track the runway centerline across the 220° wrap-around horizon, rotate at V-speed, and climb out under full manual control.',
        badge: 'Hands-On Flight Control',
      },
      {
        step: '03',
        title: 'Iconic World Approaches & Weather Challenges',
        desc: 'Fly thrilling approaches into Ben Gurion (TLV), St. Maarten Maho Beach, Innsbruck Alps, Madeira, JFK, or Hong Kong Kai Tak — in clear skies, golden sunset, or dramatic crosswinds.',
        badge: '45,000+ Global Airports',
      },
      {
        step: '04',
        title: 'Cockpit Jumpseat Guests & Post-Flight Debrief',
        desc: 'Bring up to 2 family members or friends inside the cockpit observer seats free of charge to share the excitement, take photos & videos, and celebrate your landing.',
        badge: 'Up to 2 Guests Free',
      },
    ],
    audienceBadge: 'DESIGNED FOR EVERY FLYER',
    audienceTitle: 'Tailored to Your Experience Level & Goals',
    audienceProfiles: [
      {
        title: 'First-Time Flyers, Families & Youth (Age 10+)',
        desc: 'Zero prior flying experience needed. Your instructor adapts every moment to your pace. Ideal for ages 10+ (ages 10–15 accompanied by an adult), birthdays, Bar/Bat Mitzvahs, and unforgettable gifts.',
      },
      {
        title: 'Aviation Enthusiasts & Student Pilots',
        desc: 'Practice real airline flows, ILS & RNAV instrument approaches, challenging crosswind landings, and airline simulator assessment preparation in an authentic 1:1 flight deck.',
      },
      {
        title: 'Fear of Flying Relief (Fearless Flying)',
        desc: 'Demystify turbulence, aircraft sounds, and redundant safety systems in a calm, supportive session guided by an experienced pilot who puts you in control.',
      },
      {
        title: 'Executive Leadership & Corporate CRM Teams',
        desc: 'Action-packed Crew Resource Management (CRM) workshops translating airline cockpit communication, workload delegation, and crisis decision-making to business leadership.',
      },
    ],
    hoursTitle: 'Operating Hours & Arrival',
    hoursVal: 'Sun–Thu 10:00–23:00 • Fri 09:00–16:00 • Sat 19:00–24:00',
    hoursDesc:
      'Please arrive 5 minutes prior to your scheduled slot. Session duration includes your cockpit briefing.',
    ageTitle: 'Age Policy & Companions',
    ageVal: 'Fly from Age 10+ • Up to 2 Free Cockpit Guests',
    ageDesc:
      'Pilots aged 10–15 require an accompanying adult (18+). Online booking requires age 18+.',
    locTitle: 'Central Tel Aviv Location',
    locVal: 'Gershon Shatz St 36, Tel Aviv-Yafo',
    locDesc:
      '4-minute walk from Yehudit Light Rail Station (Red Line) & 8-minute walk from HaShalom Train Station.',
    socialTitle: 'Follow the Next Flight',
    socialSubtitle:
      'See cockpit moments, customer landings, behind-the-scenes updates, and new flight missions on our official channels.',
    specsSummary:
      'Fine-Print Simulator Specifications & Environment Summary (Optional Technical Note)',
    specsVisualsTitle: 'Visual & Cabin Environment',
    specsVisualsDesc:
      '1:1 scale enclosed Boeing 737 flight deck shell with a 220° seamless curved 4K visual projection dome, dynamic day/dusk/night lighting, and spatial cockpit audio.',
    specsControlsTitle: 'Flight Controls & Avionics',
    specsControlsDesc:
      'Dual mechanically linked control columns and rudder pedals with control-loading feedback, motorized autothrottle levers, mode control panel, dual flight management computers, and digital flight displays.',
    specsNoticeTitle: 'Global Scenery & Facility Notice',
    specsNoticeDesc: `Over 45,000 global airports with real-time weather synthesis. Operated by ${FACILITY_INFO.legalNameEn} (C.N. ${FACILITY_INFO.companyRegistrationNumber}) strictly as an experiential and entertainment facility.`,
  },
  he: {
    heroBadge: 'אודות סים דרים ישראל • חווית הטסה בקנה מידה 1:1 בתל אביב',
    heroTitle: 'הגשמת חלום הטיסה בלב תל אביב – אתם במושב הקברניט',
    heroSubtitle:
      'מרכז Sim Dream (מערכות הדמיה סימולטורים ישראל סיםדרים בע״מ, גרשון ש"ץ 36 תל אביב) הוקם כדי לפתוח את דלת תא הטייס של מטוס הנוסעים הפופולרי בעולם – בואינג 737 – לקהל הרחב, למשפחות, לחובבי תעופה ולצוותי הנהלה, בליווי אישי של טייסים ומדריכים מנוסים.',
    ratingLabel: 'דירוג 5.0★ מושלם ב-Google (מעל 390 ביקורות)',
    minAgePillar: 'גיל מינימלי: 10+ (ללא צורך בניסיון קודם)',
    locationPillar: 'גרשון ש"ץ 36, תל אביב (4 דק׳ מהרכבת הקלה יהודית)',
    stepsBadge: 'מהלך הטיסה שלכם',
    stepsTitle: 'מה קורה מרגע הכניסה לתא הטייס?',
    stepsSubtitle:
      'כל סשן מתוכנן כחוויה אישית וסוחפת שבה אתם מטיסים את המטוס בעצמכם בליווי צמוד של מדריך.',
    missionSteps: [
      {
        step: '01',
        title: 'תדריך קברניט אישי (Pre-Flight Briefing)',
        desc: 'מתיישבים במושב הקברניט (מושב שמאל) לצד מדריך טיסה מוסמך. בוחרים יחד את שדות התעופה בעולם, תנאי מזג האוויר ופרופיל המשימה המותאם אישית.',
        badge: 'מותאם אישית 1-על-1',
      },
      {
        step: '02',
        title: 'דחף מנועים והמראה (Takeoff & Climb)',
        desc: 'מקבלים אישור המראה ממגדל הפיקוח, דוחפים את מצערות המנועים קדימה, חשים את האצת המטוס מול תצוגה פנורמית של 220° וממריאים לשחקים.',
        badge: 'שליטה מלאה בידיים שלכם',
      },
      {
        step: '03',
        title: 'נחיתות אייקוניות ברחבי העולם (World Approaches)',
        desc: 'מטיסים את הבואינג 737 אל נחיתות מרהיבות בנתב״ג, סנט מארטן מעל החוף, אינסברוק בין הרי האלפים, ניו יורק JFK או דובאי.',
        badge: '45,000+ שדות תעופה',
      },
      {
        step: '04',
        title: 'אורחים בתא הטייס ותחקיר סיום (Jumpseat & Debrief)',
        desc: 'עד 2 מלווים (משפחה או חברים) יושבים איתכם בתוך הקוקפיט ללא תוספת תשלום, מצלמים רגעים בלתי נשכחים ומסיימים עם תחקיר מקצועי.',
        badge: 'עד 2 מלווים חינם',
      },
    ],
    audienceBadge: 'למי מתאימה החוויה?',
    audienceTitle: 'מותאם אישית לכל גיל, מטרה ורמת ניסיון',
    audienceProfiles: [
      {
        title: 'חוויה ראשונה, משפחות ונוער (מגיל 10+)',
        desc: 'אין צורך בשום ניסיון קודם! המדריך מלווה אתכם צעד אחר צעד. מתאים לילדים ובני נוער מגיל 10 ומעלה (גילאי 10–15 בליווי מבוגר), ימי הולדת ומתנות.',
      },
      {
        title: 'חובבי תעופה וטייסים מתלמדים',
        desc: 'תרגול נהלי תא טייס, גישות מכשירים (ILS / RNAV), התמודדות עם מזג אוויר קיצוני והכנה למבדקי מיון לחברות תעופה.',
      },
      {
        title: 'התגברות על חרדת טיסה (Fearless Flying)',
        desc: 'מפגש רגוע ומעצים בגובה העיניים שבו מבינים כיצד מטוס נוסעים מתמודד עם כיסי אוויר, מה משמעות הקולות וכיצד מערכות הגיבוי שומרות על בטיחות.',
      },
      {
        title: 'סדנאות מנהלים וגיבוש צוותים (Corporate CRM)',
        desc: 'סדנאות מנהיגות וקבלת החלטות תחת לחץ המבוססות על מתודולוגיית ניהול משאבי צוות (CRM) מעולם התעופה המסחרית.',
      },
    ],
    hoursTitle: 'שעות פעילות והגעה',
    hoursVal: 'א׳–ה׳ 10:00–23:00 • ו׳ 09:00–16:00 • שבת 19:00–24:00',
    hoursDesc: 'יש להגיע 5 דקות לפני מועד הסשן שהוזמן. הזמן כולל תדריך קברניט בתא הטייס.',
    ageTitle: 'גילאים ומלווים',
    ageVal: 'הטסה מגיל 10+ • עד 2 מלווים חינם בתא הטייס',
    ageDesc: 'משתתפים בגילאי 10–15 בליווי מבוגר (18+). ביצוע הזמנה באתר מגיל 18 ומעלה.',
    locTitle: 'מיקום ונגישות תחבורתית',
    locVal: 'גרשון ש"ץ 36, תל אביב-יפו',
    locDesc: '4 דקות הליכה מתחנת הרכבת הקלה יהודית (הקו האדום) ו-8 דקות מתחנת רכבת השלום.',
    socialTitle: 'הטיסה הבאה מתחילה כאן',
    socialSubtitle: 'עקבו אחרי רגעים מהקוקפיט, נחיתות של אורחים, עדכונים מאחורי הקלעים ומשימות טיסה חדשות בערוצים הרשמיים שלנו.',
    specsSummary: 'מפרט טכני כללי של תא הטייס (באותיות קטנות לחובבי תעופה)',
    specsVisualsTitle: 'תצוגה פנורמית ומבנה',
    specsVisualsDesc:
      'תא טייס סגור בקנה מידה 1:1 של בואינג 737 עם מסך הקרנה פנורמי מעוגל בזווית 220° ברזולוציית 4K, תאורת יום/לילה דינמית ומערכת שמע היקפית.',
    specsControlsTitle: 'הגאים, מצערות ומכשור',
    specsControlsDesc:
      'הגאים ודוושות כיוון מקושרים מכנית בעלי משוב עומס, מצערות ממונעות אוטומטית, פאנל טייס אוטומטי, מחשב ניווט וצגי טיסה דיגיטליים.',
    specsNoticeTitle: 'מאגר שדות תעופה והבהרה רגולטורית',
    specsNoticeDesc: `מעל 45,000 שדות תעופה בעולם וסימולציית מזג אוויר בזמן אמת. מופעל על ידי ${FACILITY_INFO.legalNameHe} (ח.פ. ${FACILITY_INFO.companyRegistrationNumber}) כמתקן חוויה ובידור.`,
  },
  ru: {
    heroBadge: 'О ЦЕНТРЕ SIM DREAM • ПОЛЕТНЫЙ КОМПЛЕКС В ТЕЛЬ-АВИВЕ',
    heroTitle: 'Мечта о небе становится реальностью в центре Тель-Авива',
    heroSubtitle:
      'Sim Dream Israel (ул. Гершон Шац 36, Тель-Авив) открывает двери кабины самого массового лайнера в истории — Boeing 737 — для каждого: семей, подростков, авиалюбителей и корпоративных команд с личным наставничеством опытных пилотов.',
    ratingLabel: 'Рейтинг 5.0★ в Google (390+ отзывов)',
    minAgePillar: 'Возраст: от 10 лет (опыт не требуется)',
    locationPillar: 'Гершон Шац 36, Тель-Авив (4 мин от трамвая Йегудит)',
    stepsBadge: 'КАК ПРОХОДИТ ВАШ ПОЛЕТ',
    stepsTitle: 'От предполетного брифинга до касания ВПП',
    stepsSubtitle:
      'Каждый полет строится как персональная миссия, где вы лично управляете авиалайнером в кресле командира.',
    missionSteps: [
      {
        step: '01',
        title: 'Персональный брифинг с пилотом (Pre-Flight)',
        desc: 'Вы занимаете левое кресло командира рядом с инструктором. Вместе выбираете аэропорты, время суток, погоду и профиль полета под ваши цели.',
        badge: 'Индивидуально 1-на-1',
      },
      {
        step: '02',
        title: 'Взлетный режим и отрыв от ВПП',
        desc: 'Переводите рычаги тяги вперед, удерживаете лайнер по осевой линии перед панорамным экраном 220° 4K и на скорости Vr берете штурвал на себя.',
        badge: 'Полный контроль в руках',
      },
      {
        step: '03',
        title: 'Легендарные аэропорты мира и испытания',
        desc: 'Выполняйте посадки в Бен-Гурионе, Сен-Мартене над пляжем, Инсбруке среди Альп, Нью-Йорке или Дубае — в ясную погоду или при штормовом ветре.',
        badge: '45,000+ аэропортов мира',
      },
      {
        step: '04',
        title: 'Гости в кабине и послеполетный разбор',
        desc: 'До двух ваших гостей бесплатно размещаются на откидных креслах в кабине, фотографируют памятные моменты и слушают дебрифинг инструктора.',
        badge: 'До 2 гостей бесплатно',
      },
    ],
    audienceBadge: 'ДЛЯ КОГО СОЗДАН ПОЛЕТ?',
    audienceTitle: 'Индивидуальный подход для любого возраста и уровня',
    audienceProfiles: [
      {
        title: 'Новички, семьи и подростки (от 10 лет)',
        desc: 'Опыт не нужен! Инструктор шаг за шагом ведет полет. Отлично подходит детям от 10 лет (10–15 лет в сопровождении взрослых) и на праздники.',
      },
      {
        title: 'Авиалюбители и курсанты летных школ',
        desc: 'Отработка стандартных процедур SOP, заходов по приборам (ILS/RNAV), бокового ветра и подготовка к собеседованиям в авиакомпании.',
      },
      {
        title: 'Преодоление аэрофобии (Fearless Flying)',
        desc: 'Спокойная терапевтическая сессия с пилотом: понимание турбулентности, физики полета, звуков кабины и многократного дублирования систем.',
      },
      {
        title: 'Руководители и команды (Корпоративный CRM)',
        desc: 'Семинары по принятию решений в стрессе и командной коммуникации по методике Crew Resource Management из коммерческой авиации.',
      },
    ],
    hoursTitle: 'График работы и прибытие',
    hoursVal: 'Вс–Чт 10:00–23:00 • Пт 09:00–16:00 • Сб 19:00–24:00',
    hoursDesc: 'Прибывайте за 5 минут до назначенного времени. В слот включен предполетный инструктаж.',
    ageTitle: 'Возрастные правила и гости',
    ageVal: 'Полеты от 10 лет • До 2 гостей в кабине бесплатно',
    ageDesc: 'Пилоты 10–15 лет — в сопровождении взрослого (18+). Оплата и бронирование — с 18 лет.',
    locTitle: 'Удобная локация в Тель-Авиве',
    locVal: 'ул. Гершон Шац 36, Тель-Авив-Яффо',
    locDesc: '4 минуты пешком от станции красной линии трамвая Йегудит и 8 минут от ЖД-станции Ха-Шалом.',
    socialTitle: 'Следите за следующим полётом',
    socialSubtitle: 'Смотрите моменты из кабины, посадки гостей, новости из-за кулис и новые полётные миссии в наших официальных каналах.',
    specsSummary: 'Технические характеристики симулятора (краткая справка)',
    specsVisualsTitle: 'Визуализация и кабина',
    specsVisualsDesc:
      'Кабина Boeing 737 масштаба 1:1 с бесшовным изогнутым экраном 220° 4K, динамической сменой освещения и реалистичной акустикой.',
    specsControlsTitle: 'Штурвалы, РУД и авионика',
    specsControlsDesc:
      'Связанные штурвалы и педали с загрузкой усилий, моторизованный автомат тяги, панель автопилота MCP, два компьютера FMS/CDU и дисплеи Glass Cockpit.',
    specsNoticeTitle: 'Аэропорты и регламент',
    specsNoticeDesc: `Свыше 45,000 аэропортов и реальная погода. SimDream Simulators (Israel) Ltd. действует как развлекательно-тренажерный центр.`,
  },
  fr: {
    heroBadge: 'À PROPOS DE SIM DREAM ISRAËL • CENTRE D’EXPÉRIENCE DE VOL TEL AVIV',
    heroTitle: 'Là où les rêves d’aviation prennent leur envol à Tel Aviv',
    heroSubtitle:
      'Installé au cœur de Tel Aviv (36 rue Gershon Shatz), Sim Dream Israël ouvre le cockpit du plus célèbre avion de ligne au monde — le Boeing 737 — au grand public, aux familles, aux passionnés et aux entreprises, accompagné par des pilotes professionnels.',
    ratingLabel: 'Note 5.0★ sur Google (plus de 390 avis vérifiés)',
    minAgePillar: 'Âge minimum : 10 ans (aucune expérience requise)',
    locationPillar: '36 rue Gershon Shatz, Tel Aviv (à 4 min du tramway Yehudit)',
    stepsBadge: 'DÉROULEMENT DU VOL',
    stepsTitle: 'Du briefing initial jusqu’au poser des roues',
    stepsSubtitle:
      'Chaque session est une mission sur mesure où vous pilotez l’avion depuis la place de gauche du commandant de bord.',
    missionSteps: [
      {
        step: '01',
        title: 'Briefing Commandant de bord (Pré-vol)',
        desc: 'Prenez place dans le siège de gauche aux côtés de votre instructeur. Ensemble, choisissez vos aéroports, la météo et le profil de vol adapté.',
        badge: 'Accompagnement 1-sur-1',
      },
      {
        step: '02',
        title: 'Mise en poussée et décollage',
        desc: 'Poussez les manettes de gaz, maintenez l’axe de piste face à l’écran panoramique 220° 4K et effectuez la rotation à la vitesse Vr.',
        badge: 'Contrôle direct en mains',
      },
      {
        step: '03',
        title: 'Approches spectaculaires dans le monde',
        desc: 'Atterrissez à Ben Gourion, Saint-Martin au ras de la plage, Innsbruck dans les Alpes ou New York — par grand soleil ou vent de travers.',
        badge: 'Plus de 45 000 aéroports',
      },
      {
        step: '04',
        title: 'Invités dans le cockpit et débriefing',
        desc: 'Jusqu’à 2 proches vous accompagnent gratuitement sur les strapontins du cockpit pour filmer et célébrer vos atterrissages.',
        badge: 'Jusqu’à 2 invités gratuits',
      },
    ],
    audienceBadge: 'POUR TOUS LES PUBLICS',
    audienceTitle: 'Adapté à tous les âges, objectifs et niveaux d’expérience',
    audienceProfiles: [
      {
        title: 'Découverte, familles et jeunes (dès 10 ans)',
        desc: 'Aucune expérience requise. L’instructeur adapte chaque étape. Idéal pour les 10 ans et plus (10-15 ans accompagnés d’un adulte) et anniversaires.',
      },
      {
        title: 'Passionnés d’aviation et élèves-pilotes',
        desc: 'Pratique des procédures SOP, approches ILS/RNAV, vent de travers et entraînement aux sélections en compagnie aérienne.',
      },
      {
        title: 'Apprivoiser la peur de l’avion (Fearless Flying)',
        desc: 'Séance bienveillante pour comprendre la météo, la mécanique du vol, les bruits de bord et les redondances de sécurité absolues.',
      },
      {
        title: 'Dirigeants et équipes (CRM Entreprise)',
        desc: 'Ateliers de leadership et décision sous stress inspirés du Crew Resource Management de l’aviation commerciale.',
      },
    ],
    hoursTitle: 'Horaires d’ouverture & Arrivée',
    hoursVal: 'Dim–Jeu 10:00–23:00 • Ven 09:00–16:00 • Sam 19:00–24:00',
    hoursDesc:
      'Merci d’arriver 5 minutes avant l’heure de votre vol. Le temps inclut le briefing en cockpit.',
    ageTitle: 'Âge & Accompagnateurs',
    ageVal: 'Accessible dès 10 ans • 2 observateurs gratuits',
    ageDesc:
      'Les jeunes de 10 à 15 ans doivent être accompagnés d’un adulte (18+). Réservation en ligne dès 18 ans.',
    locTitle: 'Emplacement Central Tel Aviv',
    locVal: '36 rue Gershon Shatz, Tel Aviv-Yafo',
    locDesc:
      'À 4 minutes à pied du tramway Yehudit (ligne rouge) et 8 minutes de la gare HaShalom.',
    socialTitle: 'Suivez le prochain vol',
    socialSubtitle:
      'Découvrez des moments dans le cockpit, les atterrissages de nos clients, les coulisses et les nouvelles missions sur nos canaux officiels.',
    specsSummary: 'Spécifications techniques du simulateur (note informative)',
    specsVisualsTitle: 'Système visuel & Cabine',
    specsVisualsDesc:
      'Cabine fermée échelle 1:1 de Boeing 737 avec écran panoramique incurvé 220° 4K laser, cycle jour/nuit et environnement sonore réaliste.',
    specsControlsTitle: 'Commandes de vol & Avionique',
    specsControlsDesc:
      'Colonnes de commandes et palonniers couplés à retour d’effort, manettes motorisées, MCP, deux ordinateurs de vol FMS et instruments digitaux.',
    specsNoticeTitle: 'Base mondiale & Mention légale',
    specsNoticeDesc: `Plus de 45 000 aéroports avec météo temps réel. Exploité par ${FACILITY_INFO.legalNameEn} à titre de loisir et d’entraînement.`,
  },
  ar: {
    heroBadge: 'عن مركز سيم دريم إسرائيل • مركز تجارب الطيران في تل أبيب',
    heroTitle: 'حيث تتحقق أحلام الطيران في قلب تل أبيب — أنت القبطان',
    heroSubtitle:
      'تأسس مركز Sim Dream في شارع غيرشون شاتس 36 بتل أبيب ليفتح باب قمرة القيادة لأشهر طائرة ركاب في العالم — بوينغ 737 — أمام الجميع: العائلات، والشباب، وعشاق الطيران وفرق الشركات برفقة طيارين ومدربين محترفين.',
    ratingLabel: 'تقييم 5.0★ ممتاز على Google (أكثر من 390 تقييماً)',
    minAgePillar: 'الحد الأدنى للعمر: 10+ (لا تشترط أي خبرة مسبقة)',
    locationPillar: 'غيرشون شاتس 36، تل أبيب (4 دقائق من القطار الخفيف يهوديت)',
    stepsBadge: 'مراحل رحلتك في القمرة',
    stepsTitle: 'من الموجز الإرشادي وحتى لمس عجلات الطائرة للمدرج',
    stepsSubtitle:
      'كل جلسة طيران مصممة كمهمة عملية شخصية حيث تقود الطائرة بنفسك من مقعد القبطان.',
    missionSteps: [
      {
        step: '01',
        title: 'موجز إرشادي شخصي من القبطان (Pre-Flight)',
        desc: 'اجلس في مقعد القبطان (المقعد الأيسر) إلى جانب مدرب الطيران. حددا معاً مطارات الإقلاع والوصول وأحوال الطقس بما يناسب رغبتك.',
        badge: 'تدريب فردي 1-على-1',
      },
      {
        step: '02',
        title: 'تطبيق قوة الدفع والإقلاع',
        desc: 'ادفع أذرع الدفع للأمام، وحافظ على مسار منتصف المدرج أمام شاشة العرض البانورامية 220° بدقة 4K، واسحب المقود للإقلاع.',
        badge: 'تحكم كامل بين يديك',
      },
      {
        step: '03',
        title: 'الهبوط في أشهر مطارات العالم وتحديات الطقس',
        desc: 'اهبط في مطار بن غوريون، أو سانت مارتن فوق الشاطئ، أو إنسبروك بين جبال الألب، أو نيويورك — في أجواء مشمسة أو رياح عاصفة.',
        badge: 'أكثر من 45,000 مطار',
      },
      {
        step: '04',
        title: 'ضيوف في مقاعد المراقب وتحليل ختامي للرحلة',
        desc: 'اصطحب ما يصل إلى مرافقين اثنين داخل القمرة مجاناً لمشاركتك المتعة والتقاط الصور والفيديوهات، مع تقييم نهائي لأدائك.',
        badge: 'حتى مرافقين اثنين مجاناً',
      },
    ],
    audienceBadge: 'لمن تناسب هذه التجربة؟',
    audienceTitle: 'مصممة خصيصاً لكل فئة عمرية وهدف ومستوى خبرة',
    audienceProfiles: [
      {
        title: 'المبتدئون والعائلات واليافعون (من عمر 10+)',
        desc: 'لا تشترط أي خبرة سابقة! يرافقك المدرب خطوة بخطوة. مناسبة للأطفال من عمر 10 سنوات فما فوق والمناسبات والهدايا الخاصة.',
      },
      {
        title: 'هواة الطيران وطلاب الطيران المتدربون',
        desc: 'ممارسة إجراءات شركات الطيران SOP، اقترابات ILS وRNAV، الهبوط في الرياح الجانبية والتحضير لمقابلات التقييم في الشركات.',
      },
      {
        title: 'التغلب على الخوف من الطيران (Fearless Flying)',
        desc: 'جلسة علاجية هادئة لفهم المطبات الجوية وفيزياء الطيران وأصوات الطائرة وأنظمة الأمان والنسخ الاحتياطية المتعددة.',
      },
      {
        title: 'فرق الإدارة والشركات (ورش عمل CRM)',
        desc: 'ورش عمل عملية لتطوير القيادة واتخاذ القرارات تحت الضغط مستوحاة من منهجية إدارة موارد الطاقم (CRM) في الطيران المدني.',
      },
    ],
    hoursTitle: 'أوقات العمل والوصول',
    hoursVal: 'الأحد–الخميس 10:00–23:00 • الجمعة 09:00–16:00 • السبت 19:00–24:00',
    hoursDesc: 'يرجى الوصول قبل 5 دقائق من الموعد المحدد. تشمل مدة الجلسة الموجز الإرشادي في القمرة.',
    ageTitle: 'سياسة العمر والمرافقين',
    ageVal: 'الطيران من عمر 10+ • حتى مرافقين اثنين مجاناً',
    ageDesc: 'المشاركون بين 10 و15 عاماً برفقة شخص بالغ (18+). الحجز عبر الموقع من عمر 18 وما فوق.',
    locTitle: 'موقع استراتيجي في تل أبيب',
    locVal: 'شارع غيرشون شاتس 36، تل أبيب-يافا',
    locDesc: '4 دقائق سيراً على الأقدام من محطة القطار الخفيف يهوديت و8 دقائق من محطة قطار ههشالوم.',
    socialTitle: 'تابعوا الرحلة القادمة',
    socialSubtitle: 'شاهدوا لحظات من قمرة القيادة وهبوط الضيوف والتحديثات من وراء الكواليس ومهام الطيران الجديدة عبر قنواتنا الرسمية.',
    specsSummary: 'المواصفات الفنية لجهاز المحاكاة (ملاحظة فنية)',
    specsVisualsTitle: 'نظام العرض البانورامي والقمرة',
    specsVisualsDesc:
      'قمرة قيادة بوينغ 737 مغلقة بمقياس 1:1 مع شاشة بانورامية منحنية 220° بدقة 4K وتأثيرات صوتية وإضاءة واقعية.',
    specsControlsTitle: 'أدوات التحكم وإلكترونيات الطيران',
    specsControlsDesc:
      'مقاود تحكم ودواسات توجيه مقترنة ميكانيكياً مع محاكاة الأحمال، أذرع دفع آلية، لوحة تحكم بالطيار الآلي MCP، وشاشات عرض رقمية.',
    specsNoticeTitle: 'قاعدة المطارات والإشعار التنظيمي',
    specsNoticeDesc: `أكثر من 45,000 مطار حول العالم مع محاكاة الطقس الحية. يُدار المركز كمنشأة ترفيهية وتدريبية متطورة.`,
  },
};

export function AboutExperienceView() {
  const { t, language, isRTL } = useLanguage();
  const copy = ABOUT_COPY[language] || ABOUT_COPY.en;

  const profileIcons = [Users, Compass, HeartHandshake, Briefcase];
  const profileAccents = ['sky', 'emerald', 'amber', 'purple'] as const;

  return (
    <div className="flex-1 w-full min-w-0 py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* 1. HERO: ABOUT SIM DREAM ISRAEL & THE FLIGHT EXPERIENCE */}
      <section className="text-center max-w-4xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-xs font-mono text-sky-400">
          <Plane className="w-3.5 h-3.5 -rotate-45" />
          <span>{copy.heroBadge}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          {copy.heroTitle}
        </h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          {copy.heroSubtitle}
        </p>

        {/* Key Trust Pillars Strip */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{copy.ratingLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>{copy.minAgePillar}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sky-300">
            <MapPin className="w-4 h-4 text-sky-400" />
            <span>{copy.locationPillar}</span>
          </span>
        </div>
      </section>

      {/* 2. HOW YOUR FLIGHT SESSION WORKS (STEP-BY-STEP MISSION TIMELINE) */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <Badge variant="sky">{copy.stepsBadge}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {copy.stepsTitle}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            {copy.stepsSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {copy.missionSteps.map((item) => (
            <Card key={item.step} glow borderAccent="sky" className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black font-mono text-sky-400">{item.step}</span>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 font-semibold">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white leading-snug">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 3. WHO CAN FLY AT SIM DREAM? */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <Badge variant="emerald">{copy.audienceBadge}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {copy.audienceTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {copy.audienceProfiles.map((profile, idx) => {
            const IconComponent = profileIcons[idx] || Users;
            const accent = profileAccents[idx] || 'sky';
            return (
              <Card key={idx} borderAccent={accent} className="flex items-start gap-4 p-6">
                <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">{profile.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{profile.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. ESSENTIAL VISITOR & BOOKING HIGHLIGHTS */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase font-bold">
              <Clock className="w-4 h-4" />
              <span>{copy.hoursTitle}</span>
            </div>
            <p className="text-sm font-bold text-white">{copy.hoursVal}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{copy.hoursDesc}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs uppercase font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{copy.ageTitle}</span>
            </div>
            <p className="text-sm font-bold text-white">{copy.ageVal}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{copy.ageDesc}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase font-bold">
              <Globe className="w-4 h-4" />
              <span>{copy.locTitle}</span>
            </div>
            <p className="text-sm font-bold text-white">{copy.locVal}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{copy.locDesc}</p>
          </div>
        </div>
      </section>

      {/* 5. Official Social Channels */}
      <section aria-labelledby="official-socials" className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-6 sm:p-8 text-center space-y-5">
        <div className="max-w-2xl mx-auto space-y-2">
          <h2 id="official-socials" className="text-2xl sm:text-3xl font-black text-white">
            {copy.socialTitle}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">{copy.socialSubtitle}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={FACILITY_INFO.social.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-orange-500 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Instagram aria-hidden="true" className="h-5 w-5 text-orange-500" />
            <span>Instagram</span>
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
          </a>
          <a
            href={FACILITY_INFO.social.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-sky-500 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Facebook aria-hidden="true" className="h-5 w-5 text-sky-400" />
            <span>Facebook</span>
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
          </a>
          <a
            href={FACILITY_INFO.social.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-orange-500 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Youtube aria-hidden="true" className="h-5 w-5 text-orange-500" />
            <span>YouTube</span>
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
          </a>
        </div>
      </section>

      {/* 6. CTA BOX */}
      <section className="text-center bg-gradient-to-r from-sky-900/30 via-slate-900/80 to-sky-900/30 border border-sky-500/30 rounded-2xl p-8 sm:p-10 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-black text-white">{t.cta.title}</h2>
        <p className="text-slate-300 max-w-xl mx-auto text-sm">{t.cta.subtitle}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/book">
            <Button size="lg" className="font-bold">
              <span>{t.cta.bookFlight}</span>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </Link>
          <Link href="/experiences">
            <Button variant="secondary" size="lg">
              <span>{t.experiences.viewAll}</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* 7. SMALL-PRINT TECHNICAL SPECIFICATIONS (COMPACT COLLAPSIBLE <details> FOOTNOTE) */}
      <section className="pt-4 border-t border-slate-900">
        <details className="group rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-400">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-mono text-xs text-slate-400 hover:text-slate-200">
            <span>{copy.specsSummary}</span>
            <ChevronDown
              aria-hidden="true"
              className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180 shrink-0"
            />
          </summary>
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] leading-relaxed text-slate-400">
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.specsVisualsTitle}
              </p>
              <p>{copy.specsVisualsDesc}</p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.specsControlsTitle}
              </p>
              <p>{copy.specsControlsDesc}</p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.specsNoticeTitle}
              </p>
              <p>{copy.specsNoticeDesc}</p>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
