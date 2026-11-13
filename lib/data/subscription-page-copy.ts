import type { Language, LocalizedRecord } from '@/lib/i18n/translations';

/**
 * Copy for the dedicated `/subscriptions` portal.
 *
 * Product decision (2026-11-09): the page sells the outcome of a flight track,
 * never its duration. "12 months", "annual", "365 days" and similar limited-time
 * phrases are banned from the marketing copy because they read as a deadline and
 * a lock-in. The validity term is still a real commercial condition, so it is
 * disclosed exactly once, in the billing FAQ answer, as reassurance ("a full year,
 * no rush"). `tests/unit/subscription-passes.test.ts` enforces this.
 */

export interface SubscriptionPillarCopy {
  title: string;
  description: string;
}

export interface SubscriptionSyllabusStageCopy {
  stage: string;
  title: string;
  description: string;
}

export interface SubscriptionFaqCopy {
  question: string;
  answer: string;
}

export interface SubscriptionPageCopy {
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  stats: {
    paymentLabel: string;
    paymentValue: string;
    paceLabel: string;
    paceValue: string;
    mentorshipLabel: string;
    mentorshipValue: string;
    savingsLabel: string;
    savingsValue: string;
  };
  reasonsTitle: string;
  reasonsSubtitle: string;
  /** First-person reasons ("why I need this"), each pointing at a track. */
  pillars: [
    SubscriptionPillarCopy,
    SubscriptionPillarCopy,
    SubscriptionPillarCopy,
    SubscriptionPillarCopy,
  ];
  filterAll: string;
  filter5: string;
  filter10: string;
  recommendedBadge: string;
  perSessionLabel: string;
  minutesLabel: string;
  totalMinutesLabel: string;
  roadmapTitle: string;
  roadmapSubtitle: string;
  stages: [
    SubscriptionSyllabusStageCopy,
    SubscriptionSyllabusStageCopy,
    SubscriptionSyllabusStageCopy,
    SubscriptionSyllabusStageCopy,
    SubscriptionSyllabusStageCopy,
  ];
  comparisonTitle: string;
  comparisonSubtitle: string;
  comparisonHeaders: {
    feature: string;
    singleFlight: string;
    sub5: string;
    sub10: string;
  };
  comparisonRows: Array<{
    feature: string;
    single: string;
    sub5: string;
    sub10: string;
  }>;
  faqTitle: string;
  faqSubtitle: string;
  faqEyebrow: string;
  faqs: [
    SubscriptionFaqCopy,
    SubscriptionFaqCopy,
    SubscriptionFaqCopy,
    SubscriptionFaqCopy,
  ];
  bottomCtaTitle: string;
  bottomCtaSubtitle: string;
  bottomCtaBadge: string;
  bottomCtaButton: string;
  bottomContactConcierge: string;
}

export const SUBSCRIPTION_PAGE_COPY: LocalizedRecord<SubscriptionPageCopy> = {
  en: {
    eyebrow: "SIM DREAM CAPTAIN'S CLUB · FLIGHT TRACKS",
    heroTitle: 'By Your Fifth Flight, You Fly the 737 Yourself.',
    heroSubtitle:
      'One flight is a memory. A track of five or ten captain-led flights turns it into a skill: you program the FMC, fly the pattern by hand and land in a crosswind, with an airline captain beside you every time. Pay once, fly at your own pace, and save up to ₪2,550 against single flights.',
    stats: {
      paymentValue: 'Pay Once',
      paymentLabel: 'No renewal, no monthly charge',
      paceValue: 'Your Pace',
      paceLabel: 'Book each flight whenever it suits you',
      mentorshipValue: 'Active Captains',
      mentorshipLabel: '1-on-1 in every flight',
      savingsValue: 'Save up to 30%',
      savingsLabel: 'Against single flights',
    },
    reasonsTitle: 'Why Would I Need More Than One Flight?',
    reasonsSubtitle: 'Pick the reason that sounds like you. Each one has a track built for it.',
    pillars: [
      {
        title: 'I never want to be just a passenger again.',
        description:
          'Flight one is about feel. By flight five you run the captain’s flows yourself, read the instruments and fly a stabilised approach to a landing you planned. Start with Flight Foundations, 5 × 60.',
      },
      {
        title: 'I want the big missions, not a short taste.',
        description:
          'Ninety-minute flights give you time to plan the route, fly it, recover from a windshear or a go-around and debrief it properly. Advanced Captain, 5 × 90, is built for exactly that.',
      },
      {
        title: 'I want to fly it the way real crews do.',
        description:
          'Ten flights that build the whole picture: how the systems work, how the crew shares the cockpit, how a route is planned and flown by hand on instruments, and what to do when something breaks. Flight Deck Mastery 10 × 60 or the Captains’ Course 10 × 90.',
      },
      {
        title: 'I am afraid of flying and want to understand it.',
        description:
          'Turbulence, engine sounds and go-arounds stop being mysteries once you have handled them from the left seat. Several calm flights with the same captain build an understanding one flight cannot. Begin with Flight Foundations, or ask Dispatch for a gentler pace.',
      },
    ],
    filterAll: 'All Tracks',
    filter5: '5-Flight Tracks (Mastery)',
    filter10: '10-Flight Tracks (Captain’s Syllabus)',
    recommendedBadge: 'CAPTAIN RECOMMENDED',
    perSessionLabel: 'effective per flight',
    minutesLabel: 'min',
    totalMinutesLabel: 'minutes total',
    roadmapTitle: 'The 5-Stage Flight Deck Learning Journey',
    roadmapSubtitle:
      'Every flight builds on the last. Here is the structured syllabus you master alongside active airline captains.',
    stages: [
      {
        stage: 'Stage 01',
        title: 'Primary Flight Controls & Cockpit Flows',
        description:
          'Master control loading, electric trim, flight director cues, takeoff rotation, and manual visual pattern flying.',
      },
      {
        stage: 'Stage 02',
        title: 'FMC Programming & Autopilot Modes',
        description:
          'Input route waypoints, configure performance parameters, and command LNAV/VNAV lateral and vertical flight profiles.',
      },
      {
        stage: 'Stage 03',
        title: 'Adverse Weather & 35-Knot Crosswinds',
        description:
          'Experience cockpit weather radar interpretation, severe turbulence recovery, crab angle corrections, and CAT III ILS autolandings.',
      },
      {
        stage: 'Stage 04',
        title: 'System Failures & Emergency Scenarios',
        description:
          'Emergencies, calmly: an engine failure after take-off, a single-engine go-around and a depressurisation, with the checklist in hand and a captain beside you.',
      },
      {
        stage: 'Stage 05',
        title: 'Iconic Extreme World Approaches',
        description:
          'Fly the checkerboard turn at Hong Kong Kai Tak, navigate the narrow alpine valley into Innsbruck, and descend into Paro Bhutan.',
      },
    ],
    comparisonTitle: 'One Flight vs. a Flight Track',
    comparisonSubtitle:
      'What changes between booking a single flight and following a five- or ten-flight track.',
    comparisonHeaders: {
      feature: 'What you get',
      singleFlight: 'Single Flight',
      sub5: '5-Flight Track',
      sub10: '10-Flight Track',
    },
    comparisonRows: [
      {
        feature: 'Cockpit Flight Time',
        single: '60–90 min (1 flight)',
        sub5: '300–450 min (5 flights)',
        sub10: '600–900 min (10 flights)',
      },
      {
        feature: 'Price per Flight',
        single: 'Standard rate',
        sub5: 'Save 20% (up to ₪860)',
        sub10: 'Save 30% (up to ₪2,550)',
      },
      {
        feature: 'What You Fly Yourself by the End',
        single: 'Take-off and a guided landing',
        sub5: 'FMC set-up, hand-flown pattern, crosswind landing',
        sub10: 'Full missions, emergencies and a graduation flight',
      },
      {
        feature: 'Training Syllabus',
        single: 'Introductory flight',
        sub5: '5-stage progressive syllabus',
        sub10: 'Comprehensive captain’s syllabus',
      },
      {
        feature: 'Booking',
        single: 'One fixed date',
        sub5: 'Each flight whenever it suits you',
        sub10: 'Each flight whenever it suits you',
      },
      {
        feature: 'Personal Pilot Debrief',
        single: 'Standard verbal debrief',
        sub5: 'Flight logbook tracking',
        sub10: 'Full pilot development debrief',
      },
    ],
    faqTitle: 'Questions Before You Choose a Track',
    faqSubtitle: 'How buying, booking and flying a track works.',
    faqEyebrow: 'Track questions',
    faqs: [
      {
        question: 'How do I book the flights in my track?',
        answer:
          'One at a time or all together, whichever you prefer. Captain Dispatch can plan them with you, and every reservation is confirmed against the live calendar and operating availability.',
      },
      {
        question: 'Can I add focused cockpit-training themes?',
        answer:
          'Your captain can include educational themes such as Cold & Dark, Crosswind/IFR and Extreme Airports where appropriate. Any separately listed add-on time, price and observer seating are confirmed before booking.',
      },
      {
        question: 'Do I need previous flight or simulator experience?',
        answer:
          'Zero experience is required. Every flight is conducted 1-on-1 with an active commercial airline pilot who adapts each mission to your personal comfort level and aspirations.',
      },
      {
        question: 'Is this a recurring subscription charge?',
        answer:
          'No. You pay once and nothing is ever charged again: no renewal, no monthly fee, no commitment. Your flights stay bookable for a full year from purchase, so there is no rush to use them.',
      },
    ],
    bottomCtaTitle: 'Your First Flight Can Be This Week.',
    bottomCtaSubtitle:
      'Choose the track that matches your reason, or talk to our Chief Flight Instructor about a custom one.',
    bottomCtaBadge: 'SIM DREAM PILOT PROGRESSION',
    bottomCtaButton: 'Choose my track',
    bottomContactConcierge: 'Have questions? Call or WhatsApp Captain Dispatch directly',
  },

  he: {
    eyebrow: 'מועדון הקברניטים של סים דרים · מסלולי טיסה',
    heroTitle: 'בטיסה החמישית אתם כבר מטיסים את ה-737 בעצמכם.',
    heroSubtitle:
      'טיסה אחת היא זיכרון. מסלול של חמש או עשר טיסות בהנחיית קברניט הופך אותו למיומנות: אתם מתכנתים את ה-FMC, מטיסים את ההקפה ביד ונוחתים ברוח צד, כשקברניט חברת תעופה לצידכם בכל טיסה. משלמים פעם אחת, טסים בקצב שלכם וחוסכים עד 2,550 ₪ ביחס לטיסות בודדות.',
    stats: {
      paymentValue: 'תשלום אחד',
      paymentLabel: 'בלי חידוש ובלי חיוב חודשי',
      paceValue: 'בקצב שלכם',
      paceLabel: 'מתאמים כל טיסה כשמתאים לכם',
      mentorshipValue: 'קברניטים פעילים',
      mentorshipLabel: '1-על-1 בכל טיסה',
      savingsValue: 'חיסכון של עד 30%',
      savingsLabel: 'ביחס לטיסות בודדות',
    },
    reasonsTitle: 'למה אני צריך יותר מטיסה אחת?',
    reasonsSubtitle: 'בחרו את הסיבה שנשמעת כמוכם. לכל אחת נבנה מסלול משלה.',
    pillars: [
      {
        title: 'אני לא רוצה להיות שוב רק נוסע.',
        description:
          'הטיסה הראשונה היא על תחושה. בטיסה החמישית אתם מריצים בעצמכם את זרימות הקברניט, קוראים את המכשירים ומטיסים גישה מיוצבת לנחיתה שאתם תכננתם. מתחילים ביסודות הטיסה, 5 × 60.',
      },
      {
        title: 'אני רוצה את המשימות הגדולות, לא רק טעימה.',
        description:
          'טיסות של 90 דקות נותנות זמן לתכנן את הנתיב, להטיס אותו, להתאושש מגזירת רוח או מהליכה סביב ולתחקר כמו שצריך. מסלול קברניט מתקדם, 5 × 90, נבנה בדיוק לזה.',
      },
      {
        title: 'אני רוצה להטיס אותו כמו צוות אמיתי.',
        description:
          'עשר טיסות שבונות את התמונה המלאה: איך המערכות עובדות, איך הצוות מתחלק בתא הטייס, איך מתכננים נתיב ומטיסים אותו ביד לפי מכשירים, ומה עושים כשמשהו מתקלקל. שליטה במערכות 10 × 60 או קורס הקברניטים 10 × 90.',
      },
      {
        title: 'אני חושש מטיסות ורוצה להבין מה קורה.',
        description:
          'כיסי אוויר, רעשי מנוע והליכה סביב מפסיקים להיות תעלומה אחרי שהתמודדתם איתם מהמושב השמאלי. כמה טיסות רגועות עם אותו קברניט בונות הבנה שטיסה אחת לא יכולה לתת. התחילו ביסודות הטיסה, או בקשו ממחלקת המבצעים קצב עדין יותר.',
      },
    ],
    filterAll: 'כל המסלולים',
    filter5: 'מסלולי 5 טיסות (בניית שליטה)',
    filter10: 'מסלולי 10 טיסות (סילבוס הקברניט)',
    recommendedBadge: 'הבחירה המומלצת',
    perSessionLabel: 'מחיר אפקטיבי לטיסה',
    minutesLabel: 'דקות',
    totalMinutesLabel: 'דקות בסך הכול',
    roadmapTitle: 'מסע הלמידה בתא הטייס ב-5 שלבים',
    roadmapSubtitle:
      'כל טיסה נבנית על גבי קודמתה. זהו הסילבוס המקצועי שתתרגלו לצד קברניטי חברות תעופה.',
    stages: [
      {
        stage: 'שלב 01',
        title: 'הגאי טיסה ראשיים וזרימות תא טייס',
        description:
          'שליטה בהתנגדות הגאים, קיזוז חשמלי, מחווני Flight Director, רוטציית המראה והטסה ידנית בהקפות ראייה.',
      },
      {
        stage: 'שלב 02',
        title: 'תכנות FMC ומצבי טייס אוטומטי',
        description:
          'הזנת נתיבי טיסה, הגדרת פרמטרי ביצועים ופיקוד על פרופילי ניווט אופקיים ואנכיים (LNAV/VNAV).',
      },
      {
        stage: 'שלב 03',
        title: 'מזג אוויר קיצוני ורוחות צד של 35 קשר',
        description:
          'קריאת מכ״ם מזג אוויר, התאוששות מכיסי אוויר חמורים, גישות זווית סרטן (Crab) ונחיתות אוטומטיות CAT III בערפל.',
      },
      {
        stage: 'שלב 04',
        title: 'תקלות מערכות ותרחישי חירום',
        description:
          'מצבי חירום, ברוגע: כשל מנוע אחרי ההמראה, הליכה סביב במנוע אחד וירידת לחץ, עם רשימת הבדיקה ביד וקברניט לצידכם.',
      },
      {
        stage: 'שלב 05',
        title: 'גישות מאתגרות במנחתים עולמיים',
        description:
          'ביצוע הפנייה המפורסמת בשחמט של קאי טאק הונג קונג, ניווט בעמק האלפיני של אינסברוק ונחיתה מאתגרת בפארו בהוטן.',
      },
    ],
    comparisonTitle: 'טיסה אחת מול מסלול טיסות',
    comparisonSubtitle: 'מה משתנה בין הזמנת טיסה בודדת לבין מסלול של חמש או עשר טיסות.',
    comparisonHeaders: {
      feature: 'מה מקבלים',
      singleFlight: 'טיסה בודדת',
      sub5: 'מסלול 5 טיסות',
      sub10: 'מסלול 10 טיסות',
    },
    comparisonRows: [
      {
        feature: 'זמן טיסה בתא הטייס',
        single: '60–90 דקות (טיסה 1)',
        sub5: '300–450 דקות (5 טיסות)',
        sub10: '600–900 דקות (10 טיסות)',
      },
      {
        feature: 'מחיר לטיסה',
        single: 'תעריף רגיל',
        sub5: 'חיסכון של 20% (עד 860 ₪)',
        sub10: 'חיסכון של 30% (עד 2,550 ₪)',
      },
      {
        feature: 'מה תטיסו בעצמכם בסוף',
        single: 'המראה ונחיתה מודרכת',
        sub5: 'הגדרת FMC, הקפה ביד ונחיתה ברוח צד',
        sub10: 'משימות מלאות, מצבי חירום וטיסת סיום',
      },
      {
        feature: 'סילבוס הדרכה מובנה',
        single: 'טיסת היכרות',
        sub5: 'סילבוס מדורג ב-5 שלבים',
        sub10: 'סילבוס קברניט מקיף',
      },
      {
        feature: 'תיאום',
        single: 'מועד קבוע אחד',
        sub5: 'כל טיסה כשמתאים לכם',
        sub10: 'כל טיסה כשמתאים לכם',
      },
      {
        feature: 'תחקיר אישי ומשוב',
        single: 'תחקיר מילולי קצר',
        sub5: 'מעקב ביומן טיסות',
        sub10: 'תחקיר התפתחות מקיף',
      },
    ],
    faqTitle: 'שאלות לפני שבוחרים מסלול',
    faqSubtitle: 'איך עובדים הרכישה, התיאום והטיסות במסלול.',
    faqEyebrow: 'שאלות על המסלול',
    faqs: [
      {
        question: 'איך מתאמים את הטיסות במסלול?',
        answer:
          'אחת בכל פעם או כולן יחד, איך שנוח לכם. מחלקת המבצעים תתכנן אותן איתכם, וכל הזמנה מאושרת מול היומן החי והזמינות התפעולית.',
      },
      {
        question: 'האם אפשר לשלב נושאי אימון ממוקדים בתא הטייס?',
        answer:
          'הקברניט יכול לשלב, לפי התאמה, נושאים לימודיים כגון Cold & Dark, רוח צד ו-IFR ושדות תעופה קיצוניים. זמן תוספת, מחיר ומושב צופה המופיעים בנפרד מאושרים לפני ההזמנה.',
      },
      {
        question: 'האם נדרש ניסיון טיסה קודם?',
        answer:
          'אין צורך בניסיון קודם כלל. כל טיסה מתבצעת בליווי אישי של קברניט פעיל שמתאים את רמת המשימה והאתגר לקצב האישי שלכם.',
      },
      {
        question: 'האם מדובר במנוי עם חיוב חודשי מתחדש?',
        answer:
          'לא. משלמים פעם אחת ולא מחויבים שוב לעולם: בלי חידוש, בלי דמי מנוי חודשיים ובלי התחייבות. הטיסות שלכם נשארות זמינות לתיאום במשך שנה שלמה מהרכישה, כך שאין שום לחץ לנצל אותן.',
      },
    ],
    bottomCtaTitle: 'הטיסה הראשונה שלכם יכולה להיות כבר השבוע.',
    bottomCtaSubtitle:
      'בחרו את המסלול שמתאים לסיבה שלכם, או דברו עם המדריך הראשי על מסלול מותאם אישית.',
    bottomCtaBadge: 'מסלול התקדמות לטייסי Sim Dream',
    bottomCtaButton: 'לבחירת המסלול שלי',
    bottomContactConcierge: 'יש שאלות? חייגו או שלחו הודעת וואטסאפ ישירות לדיספצ׳ר',
  },

  ru: {
    eyebrow: 'КЛУБ КАПИТАНОВ SIM DREAM · ЛЁТНЫЕ ПРОГРАММЫ',
    heroTitle: 'К пятому полёту вы ведёте 737 сами.',
    heroSubtitle:
      'Один полёт — впечатление. Программа из пяти или десяти полётов с капитаном превращает его в навык: вы программируете FMC, летите круг вручную и садитесь при боковом ветре, а рядом каждый раз капитан авиакомпании. Платите один раз, летаете в своём ритме и экономите до 2550 ₪ по сравнению с разовыми полётами.',
    stats: {
      paymentValue: 'Одна оплата',
      paymentLabel: 'Без продлений и ежемесячных списаний',
      paceValue: 'В своём ритме',
      paceLabel: 'Бронируйте каждый полёт, когда удобно',
      mentorshipValue: 'Капитаны авиалиний',
      mentorshipLabel: 'Один на один в каждом полёте',
      savingsValue: 'Экономия до 30%',
      savingsLabel: 'По сравнению с разовыми полётами',
    },
    reasonsTitle: 'Зачем мне больше одного полёта?',
    reasonsSubtitle: 'Выберите причину, которая похожа на вашу. Под каждую собрана своя программа.',
    pillars: [
      {
        title: 'Я больше не хочу быть просто пассажиром.',
        description:
          'Первый полёт — про ощущения. К пятому вы сами выполняете процедуры капитана, читаете приборы и выполняете стабилизированный заход на посадку, которую спланировали сами. Начните с программы «Основы полёта», 5 × 60.',
      },
      {
        title: 'Мне нужны большие миссии, а не короткая проба.',
        description:
          'Девяностоминутные полёты дают время спланировать маршрут, пролететь его, справиться со сдвигом ветра или уходом на второй круг и спокойно всё разобрать. Программа «Продвинутый капитан», 5 × 90, создана именно для этого.',
      },
      {
        title: 'Я хочу летать так, как летает настоящий экипаж.',
        description:
          'Десять полётов, собирающих полную картину: как работают системы, как экипаж делит кабину, как планируют маршрут и летят по нему вручную по приборам и что делать, когда что-то ломается. «Мастерство систем» 10 × 60 или «Курс капитанов» 10 × 90.',
      },
      {
        title: 'Я боюсь летать и хочу понять, что происходит.',
        description:
          'Турбулентность, звуки двигателей и уход на второй круг перестают быть загадкой, когда вы сами справились с ними с левого кресла. Несколько спокойных полётов с одним капитаном дают понимание, которого не даст один полёт. Начните с «Основ полёта» или попросите диспетчера о более мягком темпе.',
      },
    ],
    filterAll: 'Все программы',
    filter5: 'Программы из 5 полётов (мастерство)',
    filter10: 'Программы из 10 полётов (курс капитана)',
    recommendedBadge: 'ВЫБОР КАПИТАНА',
    perSessionLabel: 'за каждый полёт',
    minutesLabel: 'мин',
    totalMinutesLabel: 'минут всего',
    roadmapTitle: '5 этапов освоения лайнера',
    roadmapSubtitle:
      'Каждый полёт строится на базе предыдущего. Вот программа, которую вы пройдёте рука об руку с капитаном.',
    stages: [
      {
        stage: 'Этап 01',
        title: 'Органы управления и ручной полёт',
        description:
          'Загрузка штурвала, триммирование, планки Flight Director, взлётная ротация и визуальные круги над аэродромом.',
      },
      {
        stage: 'Этап 02',
        title: 'Программирование FMC и автопилот',
        description:
          'Ввод маршрута, расчёт летно-технических данных и управление режимами навигации LNAV и VNAV.',
      },
      {
        stage: 'Этап 03',
        title: 'Сложные метеоусловия и боковой ветер 35 узлов',
        description:
          'Метеорадар, преодоление сильной турбулентности, посадки крабом и автоматический заход CAT III в тумане.',
      },
      {
        stage: 'Этап 04',
        title: 'Отказы систем и нештатные ситуации',
        description:
          'Нештатные ситуации — спокойно: отказ двигателя после взлёта, уход на второй круг на одном двигателе, разгерметизация — с чеклистом в руках и капитаном рядом.',
      },
      {
        stage: 'Этап 05',
        title: 'Сложнейшие заходы мира',
        description:
          'Легендарный визуальный доворот в Гонконге (Кай Так), ущелье Инсбрука и высокогорный заход в Паро (Бутан).',
      },
    ],
    comparisonTitle: 'Один полёт или лётная программа?',
    comparisonSubtitle: 'Что меняется между разовым бронированием и программой из пяти или десяти полётов.',
    comparisonHeaders: {
      feature: 'Что вы получаете',
      singleFlight: 'Разовый полёт',
      sub5: 'Программа 5 полётов',
      sub10: 'Программа 10 полётов',
    },
    comparisonRows: [
      {
        feature: 'Время в кабине',
        single: '60–90 мин (1 полёт)',
        sub5: '300–450 мин (5 полётов)',
        sub10: '600–900 мин (10 полётов)',
      },
      {
        feature: 'Цена за полёт',
        single: 'Базовый тариф',
        sub5: 'Выгода 20% (до 860 ₪)',
        sub10: 'Выгода 30% (до 2550 ₪)',
      },
      {
        feature: 'Что вы летите сами к концу',
        single: 'Взлёт и посадка с подсказками',
        sub5: 'Настройка FMC, круг вручную, посадка при боковом ветре',
        sub10: 'Полные миссии, нештатные ситуации и выпускной полёт',
      },
      {
        feature: 'Программа обучения',
        single: 'Вводный полёт',
        sub5: '5 последовательных этапов',
        sub10: 'Полный курс капитана',
      },
      {
        feature: 'Бронирование',
        single: 'Одна фиксированная дата',
        sub5: 'Каждый полёт — когда вам удобно',
        sub10: 'Каждый полёт — когда вам удобно',
      },
      {
        feature: 'Разбор от пилота',
        single: 'Краткий устный итог',
        sub5: 'Записи в лётной книжке',
        sub10: 'Полный отчёт о прогрессе',
      },
    ],
    faqTitle: 'Вопросы перед выбором программы',
    faqSubtitle: 'Как устроены покупка, бронирование и полёты по программе.',
    faqEyebrow: 'Вопросы о программе',
    faqs: [
      {
        question: 'Как бронировать полёты из программы?',
        answer:
          'По одному или все сразу — как вам удобнее. Диспетчер спланирует их вместе с вами, а каждое бронирование подтверждается по живому календарю и операционной доступности.',
      },
      {
        question: 'Можно ли добавить целевые темы для тренировки в кабине?',
        answer:
          'Капитан может включить подходящие учебные темы, например Cold & Dark, Crosswind/IFR и Extreme Airports. Отдельно указанное дополнительное время, цена и место наблюдателя подтверждаются до бронирования.',
      },
      {
        question: 'Нужен ли предварительный опыт полётов?',
        answer:
          'Опыт не требуется. Занятия проходят один на один с пилотом гражданской авиации, который настраивает уровень сложности под вас.',
      },
      {
        question: 'Это абонемент с автоматическими ежемесячными списаниями?',
        answer:
          'Нет. Вы платите один раз, и больше ничего не списывается: без продления, без ежемесячной платы, без обязательств. Ваши полёты остаются доступными для бронирования целый год с момента покупки, так что спешить некуда.',
      },
    ],
    bottomCtaTitle: 'Ваш первый полёт может быть уже на этой неделе.',
    bottomCtaSubtitle:
      'Выберите программу под вашу причину или обсудите индивидуальную с шеф-пилотом.',
    bottomCtaBadge: 'Путь развития пилота Sim Dream',
    bottomCtaButton: 'Выбрать мою программу',
    bottomContactConcierge: 'Вопросы? Позвоните или напишите в WhatsApp диспетчеру',
  },

  fr: {
    eyebrow: 'CLUB DES COMMANDANTS SIM DREAM · PARCOURS DE VOL',
    heroTitle: 'Au cinquième vol, vous pilotez le 737 vous-même.',
    heroSubtitle:
      'Un vol est un souvenir. Un parcours de cinq ou dix vols avec commandant en fait une compétence : vous programmez le FMC, volez le tour de piste à la main et vous posez par vent de travers, un commandant de ligne à vos côtés à chaque fois. Payez une fois, volez à votre rythme et économisez jusqu’à 2 550 ₪ par rapport aux vols à l’unité.',
    stats: {
      paymentValue: 'Un seul paiement',
      paymentLabel: 'Ni renouvellement, ni prélèvement mensuel',
      paceValue: 'À votre rythme',
      paceLabel: 'Réservez chaque vol quand cela vous convient',
      mentorshipValue: 'Commandants en activité',
      mentorshipLabel: 'En 1-sur-1 à chaque vol',
      savingsValue: 'Jusqu’à 30% d’économie',
      savingsLabel: 'Par rapport aux vols à l’unité',
    },
    reasonsTitle: 'Pourquoi aurais-je besoin de plus d’un vol ?',
    reasonsSubtitle: 'Choisissez la raison qui vous ressemble. Chacune a son parcours.',
    pillars: [
      {
        title: 'Je ne veux plus être un simple passager.',
        description:
          'Le premier vol, c’est la sensation. Au cinquième, vous déroulez vous-même les flux du commandant, lisez les instruments et volez une approche stabilisée vers un atterrissage que vous avez planifié. Commencez par Fondations de vol, 5 × 60.',
      },
      {
        title: 'Je veux les grandes missions, pas un simple aperçu.',
        description:
          'Des vols de quatre-vingt-dix minutes laissent le temps de préparer la route, de la voler, de gérer un cisaillement de vent ou une remise de gaz et de débriefer correctement. Commandant avancé, 5 × 90, est conçu pour cela.',
      },
      {
        title: 'Je veux le piloter comme un vrai équipage.',
        description:
          'Dix vols qui construisent la vue d’ensemble : comment fonctionnent les systèmes, comment l’équipage se partage le poste, comment une route se prépare et se vole à la main aux instruments, et que faire quand quelque chose casse. Maîtrise des Systèmes 10 × 60 ou Cours des commandants 10 × 90.',
      },
      {
        title: 'J’ai peur de l’avion et je veux comprendre.',
        description:
          'Turbulences, bruits de moteur et remises de gaz cessent d’être des mystères une fois que vous les avez gérés depuis le siège gauche. Plusieurs vols calmes avec le même commandant construisent une compréhension qu’un seul vol ne peut pas donner. Commencez par Fondations de vol, ou demandez au Dispatch un rythme plus doux.',
      },
    ],
    filterAll: 'Tous les parcours',
    filter5: 'Parcours 5 vols (Maîtrise)',
    filter10: 'Parcours 10 vols (Syllabus du commandant)',
    recommendedBadge: 'RECOMMANDÉ PAR LE CAPITAINE',
    perSessionLabel: 'coût effectif par vol',
    minutesLabel: 'min',
    totalMinutesLabel: 'minutes au total',
    roadmapTitle: 'Parcours d’apprentissage en 5 étapes',
    roadmapSubtitle:
      'Chaque vol consolide le précédent. Voici le syllabus professionnel développé avec nos commandants de bord.',
    stages: [
      {
        stage: 'Étape 01',
        title: 'Commandes de vol et flux du cockpit',
        description:
          'Effort aux commandes, compensation électrique, barres du Flight Director, rotation et tours de piste en manuel.',
      },
      {
        stage: 'Étape 02',
        title: 'Programmation FMC et modes du pilote automatique',
        description:
          'Saisie de la route, calculs de performances et guidage latéral et vertical LNAV et VNAV.',
      },
      {
        stage: 'Étape 03',
        title: 'Météo adverse et vent de travers 35 nœuds',
        description:
          'Radar météo, gestion des turbulences sévères, atterrissage en crabe et guidage automatique CAT III en plein brouillard.',
      },
      {
        stage: 'Étape 04',
        title: 'Pannes de systèmes et procédures d’urgence',
        description:
          'Les urgences, calmement : panne moteur après le décollage, remise de gaz sur un seul réacteur, dépressurisation, check-list en main et un commandant à vos côtés.',
      },
      {
        stage: 'Étape 05',
        title: 'Approches spectaculaires à travers le monde',
        description:
          'Le virage mythique de Kai Tak à Hong Kong, la vallée alpine d’Innsbruck et la descente exigeante de Paro au Bhoutan.',
      },
    ],
    comparisonTitle: 'Un vol ou un parcours de vol ?',
    comparisonSubtitle: 'Ce qui change entre un vol à l’unité et un parcours de cinq ou dix vols.',
    comparisonHeaders: {
      feature: 'Ce que vous obtenez',
      singleFlight: 'Vol à l’unité',
      sub5: 'Parcours 5 vols',
      sub10: 'Parcours 10 vols',
    },
    comparisonRows: [
      {
        feature: 'Temps de cockpit',
        single: '60–90 min (1 vol)',
        sub5: '300–450 min (5 vols)',
        sub10: '600–900 min (10 vols)',
      },
      {
        feature: 'Prix par vol',
        single: 'Tarif standard',
        sub5: 'Économie de 20% (jusqu’à 860 ₪)',
        sub10: 'Économie de 30% (jusqu’à 2 550 ₪)',
      },
      {
        feature: 'Ce que vous volez vous-même à la fin',
        single: 'Décollage et atterrissage guidé',
        sub5: 'Préparation FMC, tour de piste à la main, atterrissage par vent de travers',
        sub10: 'Missions complètes, urgences et vol de fin de cours',
      },
      {
        feature: 'Syllabus de formation',
        single: 'Vol découverte',
        sub5: 'Syllabus progressif 5 étapes',
        sub10: 'Syllabus complet du commandant',
      },
      {
        feature: 'Réservation',
        single: 'Une date fixe',
        sub5: 'Chaque vol quand cela vous convient',
        sub10: 'Chaque vol quand cela vous convient',
      },
      {
        feature: 'Débriefing personnalisé',
        single: 'Bilan oral rapide',
        sub5: 'Suivi sur carnet de vol',
        sub10: 'Bilan complet de progression',
      },
    ],
    faqTitle: 'Questions avant de choisir un parcours',
    faqSubtitle: 'Comment fonctionnent l’achat, la réservation et les vols d’un parcours.',
    faqEyebrow: 'Questions sur le parcours',
    faqs: [
      {
        question: 'Comment réserver les vols de mon parcours ?',
        answer:
          'Un à la fois ou tous ensemble, comme vous préférez. Le Dispatch les planifie avec vous et chaque réservation est confirmée sur le calendrier en direct selon la disponibilité opérationnelle.',
      },
      {
        question: 'Puis-je ajouter des thèmes d’entraînement ciblés au cockpit ?',
        answer:
          'Votre commandant peut intégrer des thèmes pédagogiques adaptés comme Cold & Dark, Crosswind/IFR et Extreme Airports. Le temps additionnel, le prix et la place observateur affichés séparément sont confirmés avant réservation.',
      },
      {
        question: 'Faut-il une expérience préalable en pilotage ?',
        answer:
          'Aucune expérience n’est nécessaire. Chaque vol est encadré individuellement par un commandant de ligne qui adapte la mission à votre niveau.',
      },
      {
        question: 'S’agit-il d’un abonnement à prélèvement récurrent ?',
        answer:
          'Non. Vous payez une fois et rien n’est jamais prélevé ensuite : ni renouvellement, ni frais mensuels, ni engagement. Vos vols restent réservables pendant une année entière à compter de l’achat, sans aucune précipitation.',
      },
    ],
    bottomCtaTitle: 'Votre premier vol peut avoir lieu cette semaine.',
    bottomCtaSubtitle:
      'Choisissez le parcours qui correspond à votre raison, ou parlez-en avec notre chef-pilote pour un parcours sur mesure.',
    bottomCtaBadge: 'Parcours pilote Sim Dream',
    bottomCtaButton: 'Choisir mon parcours',
    bottomContactConcierge: 'Une question ? Contactez le Dispatch par téléphone ou WhatsApp',
  },

  ar: {
    eyebrow: 'نادي كباتن سيم دريم · مسارات الطيران',
    heroTitle: 'في رحلتكم الخامسة، تقودون الـ737 بأنفسكم.',
    heroSubtitle:
      'رحلة واحدة هي ذكرى. مسار من خمس أو عشر رحلات بإشراف كابتن يحوّلها إلى مهارة: تبرمجون FMC، وتطيرون الدائرة يدوياً، وتهبطون في رياح جانبية، وكابتن خطوط جوية بجانبكم في كل مرة. تدفعون مرة واحدة، وتطيرون بإيقاعكم، وتوفرون حتى 2,550 شيكل مقارنة بالرحلات الفردية.',
    stats: {
      paymentValue: 'دفعة واحدة',
      paymentLabel: 'بلا تجديد وبلا خصم شهري',
      paceValue: 'بإيقاعكم',
      paceLabel: 'احجزوا كل رحلة في الوقت الذي يناسبكم',
      mentorshipValue: 'كباتن خطوط جوية',
      mentorshipLabel: 'فردياً 1-على-1 في كل رحلة',
      savingsValue: 'توفير حتى 30%',
      savingsLabel: 'مقارنة بالرحلات الفردية',
    },
    reasonsTitle: 'لماذا أحتاج إلى أكثر من رحلة واحدة؟',
    reasonsSubtitle: 'اختاروا السبب الأقرب إليكم. لكل سبب مسار مبني له.',
    pillars: [
      {
        title: 'لا أريد أن أكون مجرد مسافر مرة أخرى.',
        description:
          'الرحلة الأولى عن الإحساس. في الرحلة الخامسة تنفذون تسلسلات الكابتن بأنفسكم، وتقرؤون العدادات، وتطيرون اقتراباً مستقراً نحو هبوط خططتم له. ابدؤوا بأساسيات الطيران، 5 × 60.',
      },
      {
        title: 'أريد المهام الكبيرة، لا مجرد تجربة قصيرة.',
        description:
          'رحلات التسعين دقيقة تمنحكم الوقت لتخطيط المسار والطيران به والتعافي من قص الرياح أو الذهاب حول واستخلاص الدروس كما ينبغي. الكابتن المتقدم، 5 × 90، مبني لهذا تماماً.',
      },
      {
        title: 'أريد أن أطير به كما يطير طاقم حقيقي.',
        description:
          'عشر رحلات تبني الصورة الكاملة: كيف تعمل الأنظمة، وكيف يتقاسم الطاقم قمرة القيادة، وكيف يُخطط المسار ويُطار يدوياً بالأجهزة، وماذا نفعل عندما يتعطل شيء. إتقان الأنظمة 10 × 60 أو دورة الكباتن 10 × 90.',
      },
      {
        title: 'أخاف من الطيران وأريد أن أفهم ما يحدث.',
        description:
          'المطبات الهوائية وأصوات المحركات والذهاب حول تتوقف عن كونها ألغازاً بعد أن تتعاملوا معها من المقعد الأيسر. عدة رحلات هادئة مع الكابتن نفسه تبني فهماً لا تمنحه رحلة واحدة. ابدؤوا بأساسيات الطيران، أو اطلبوا من قسم العمليات إيقاعاً أهدأ.',
      },
    ],
    filterAll: 'جميع المسارات',
    filter5: 'مسارات 5 رحلات (بناء الإتقان)',
    filter10: 'مسارات 10 رحلات (منهج الكابتن)',
    recommendedBadge: 'الخيار المفضل للكابتن',
    perSessionLabel: 'التكلفة الفعلية للرحلة',
    minutesLabel: 'دقيقة',
    totalMinutesLabel: 'دقيقة إجمالاً',
    roadmapTitle: 'رحلة تعلّم الطيران في 5 مراحل',
    roadmapSubtitle:
      'كل رحلة تكمل ما قبلها. هذا هو المنهج التدريبي المنظم الذي ستتدربون عليه مع كباتن الخطوط الجوية.',
    stages: [
      {
        stage: 'المرحلة 01',
        title: 'أدوات التحكم وتدفق العمل في القمرة',
        description:
          'إتقان موازنة الضغط على المقود، والتوجيه الكهربائي، وتوجيهات موجه الطيران، ومناورة الإقلاع والدوران البصري.',
      },
      {
        stage: 'المرحلة 02',
        title: 'برمجة FMC وأنظمة الطيار الآلي',
        description:
          'إدخال مسار الرحلة، وتحديد مؤشرات الأداء، والتحكم في أوضاع الملاحة الأفقية والعمودية LNAV وVNAV.',
      },
      {
        stage: 'المرحلة 03',
        title: 'الطقس القاسي والرياح الجانبية 35 عقدة',
        description:
          'قراءة رادار الطقس، والتعافي من المطبات الشديدة، والهبوط بطريقة السرطان (Crab)، والهبوط الآلي CAT III في الضباب.',
      },
      {
        stage: 'المرحلة 04',
        title: 'أعطال الأنظمة وسيناريوهات الطوارئ',
        description:
          'حالات الطوارئ بهدوء: فشل محرك بعد الإقلاع، والذهاب حول بمحرك واحد، وفقدان الضغط، مع قائمة الفحص في اليد وكابتن بجانبكم.',
      },
      {
        stage: 'المرحلة 05',
        title: 'أصعب الاقترابات في مطارات العالم',
        description:
          'تنفيذ الانعطاف الشهير في كاي تاك بهونغ كونغ، وملاحة وادي إنسبروك في جبال الألب، والهبوط في بارو بوتان.',
      },
    ],
    comparisonTitle: 'رحلة واحدة أم مسار طيران؟',
    comparisonSubtitle: 'ما الذي يتغير بين حجز رحلة واحدة ومسار من خمس أو عشر رحلات.',
    comparisonHeaders: {
      feature: 'ما تحصلون عليه',
      singleFlight: 'رحلة فردية',
      sub5: 'مسار 5 رحلات',
      sub10: 'مسار 10 رحلات',
    },
    comparisonRows: [
      {
        feature: 'الوقت في قمرة القيادة',
        single: '60–90 دقيقة (رحلة واحدة)',
        sub5: '300–450 دقيقة (5 رحلات)',
        sub10: '600–900 دقيقة (10 رحلات)',
      },
      {
        feature: 'السعر لكل رحلة',
        single: 'السعر الأساسي',
        sub5: 'توفير 20% (حتى 860 شيكل)',
        sub10: 'توفير 30% (حتى 2,550 شيكل)',
      },
      {
        feature: 'ما تطيرونه بأنفسكم في النهاية',
        single: 'إقلاع وهبوط بإرشاد',
        sub5: 'إعداد FMC ودائرة يدوية وهبوط في رياح جانبية',
        sub10: 'مهام كاملة وحالات طوارئ ورحلة تخرج',
      },
      {
        feature: 'المنهج التدريبي',
        single: 'رحلة تمهيدية',
        sub5: 'منهج متدرج من 5 مراحل',
        sub10: 'منهج كابتن متكامل',
      },
      {
        feature: 'الحجز',
        single: 'موعد واحد ثابت',
        sub5: 'كل رحلة في الوقت الذي يناسبكم',
        sub10: 'كل رحلة في الوقت الذي يناسبكم',
      },
      {
        feature: 'التقييم الشخصي والتحليل',
        single: 'استخلاص شفهي موجز',
        sub5: 'متابعة في سجل الطيران',
        sub10: 'تقرير تقييم وتطوير شامل',
      },
    ],
    faqTitle: 'أسئلة قبل اختيار المسار',
    faqSubtitle: 'كيف يعمل الشراء والحجز والطيران في المسار.',
    faqEyebrow: 'أسئلة عن المسار',
    faqs: [
      {
        question: 'كيف أحجز رحلات مساري؟',
        answer:
          'واحدة تلو الأخرى أو كلها معاً، كما تفضلون. يخططها قسم العمليات معكم، ويُؤكد كل حجز وفق التقويم المباشر والتوفر التشغيلي.',
      },
      {
        question: 'هل يمكن إضافة موضوعات تدريب مركزة في قمرة القيادة؟',
        answer:
          'يمكن للكابتن دمج موضوعات تعليمية مناسبة مثل Cold & Dark وCrosswind/IFR وExtreme Airports. يُؤكد وقت الإضافة والسعر ومقعد المراقب المعروض بشكل منفصل قبل الحجز.',
      },
      {
        question: 'هل يشترط وجود خبرة سابقة في الطيران؟',
        answer:
          'لا تشترط أي خبرة سابقة. تتم كل رحلة بإشراف مباشر من كابتن خطوط جوية يكيف التدريب مع سرعتكم وتطلعاتكم.',
      },
      {
        question: 'هل هذا اشتراك يتجدد بخصم شهري تلقائي؟',
        answer:
          'كلا. تدفعون مرة واحدة ولا يُخصم منكم شيء بعدها أبداً: بلا تجديد وبلا رسوم شهرية وبلا التزام. تبقى رحلاتكم متاحة للحجز سنة كاملة من تاريخ الشراء، فلا داعي للعجلة.',
      },
    ],
    bottomCtaTitle: 'رحلتكم الأولى يمكن أن تكون هذا الأسبوع.',
    bottomCtaSubtitle: 'اختاروا المسار الذي يناسب سببكم، أو تحدثوا مع كبير المدربين عن مسار مخصص.',
    bottomCtaBadge: 'مسار تطور طيار Sim Dream',
    bottomCtaButton: 'اختيار مساري',
    bottomContactConcierge: 'هل لديكم استفسار؟ اتصلوا أو تواصلوا عبر واتساب مباشرة مع العمليات',
  },
  de: {
    eyebrow: 'SIM DREAM CAPTAIN’S CLUB · FLUGPROGRAMME',
    heroTitle: 'Bei Ihrem fünften Flug fliegen Sie die 737 selbst.',
    heroSubtitle:
      'Ein einzelner Flug ist eine Erinnerung. Ein Programm aus fünf oder zehn Flügen mit einem Flugkapitän macht daraus echtes Können: Sie programmieren das FMC, fliegen die Platzrunde von Hand und landen bei Seitenwind – jedes Mal mit einem Verkehrspiloten an Ihrer Seite. Einmal zahlen, im eigenen Tempo fliegen und bis zu ₪2.550 gegenüber Einzelflügen sparen.',
    stats: {
      paymentValue: 'Einmal zahlen',
      paymentLabel: 'Keine Verlängerung, keine monatliche Gebühr',
      paceValue: 'Ihr Tempo',
      paceLabel: 'Jeden Flug flexibel buchen, wann es Ihnen passt',
      mentorshipValue: 'Aktive Kapitäne',
      mentorshipLabel: '1-zu-1 bei jedem Flug',
      savingsValue: 'Bis zu 30 % sparen',
      savingsLabel: 'Gegenüber Einzelflügen',
    },
    reasonsTitle: 'Warum mehr als einen Flug buchen?',
    reasonsSubtitle: 'Wählen Sie den Grund, der zu Ihnen passt. Für jeden gibt es das passende Programm.',
    pillars: [
      {
        title: 'Ich möchte nie wieder nur Passagier sein.',
        description:
          'Beim ersten Flug geht es um das Gefühl. Bis zum fünften Flug führen Sie die Abläufe des Kapitäns selbst aus, lesen die Instrumente und fliegen einen stabilisierten Anflug auf Ihre selbst geplante Landung. Starten Sie mit Flight Foundations, 5 × 60.',
      },
      {
        title: 'Ich möchte große Missionen, keine kurze Kostprobe.',
        description:
          'Neunzigminütige Flüge geben Ihnen Zeit, die Route zu planen, sie zu fliegen, auf Scherwind oder ein Durchstarten zu reagieren und alles sauber nachzubesprechen. Advanced Captain, 5 × 90, ist genau dafür gebaut.',
      },
      {
        title: 'Ich möchte fliegen, wie echte Crews es tun.',
        description:
          'Zehn Flüge, die das Gesamtbild formen: wie die Systeme arbeiten, wie sich die Crew das Cockpit teilt, wie eine Route geplant und von Hand nach Instrumenten geflogen wird und was bei Störungen zu tun ist. Flight Deck Mastery 10 × 60 oder der Captains’ Course 10 × 90.',
      },
      {
        title: 'Ich habe Flugangst und möchte sie verstehen.',
        description:
          'Turbulenzen, Triebwerksgeräusche und Durchstartmanöver verlieren ihren Schrecken, sobald Sie sie selbst vom linken Sitz aus gesteuert haben. Mehrere ruhige Flüge mit demselben Kapitän schaffen ein Verständnis, das ein einzelner Flug nicht leisten kann.',
      },
    ],
    filterAll: 'Alle Programme',
    filter5: '5-Flüge-Programme (Aufbau)',
    filter10: '10-Flüge-Programme (Kapitänslehrplan)',
    recommendedBadge: 'EMPFEHLUNG DES KAPITÄNS',
    perSessionLabel: 'effektiv pro Flug',
    minutesLabel: 'Min.',
    totalMinutesLabel: 'Minuten gesamt',
    roadmapTitle: 'Der 5-stufige Lernweg im Flugdeck',
    roadmapSubtitle:
      'Jeder Flug baut auf dem vorherigen auf. Das ist der strukturierte Lehrplan, den Sie gemeinsam mit aktiven Flugkapitänen meistern.',
    stages: [
      {
        stage: 'Stufe 01',
        title: 'Primäre Steuerung & Cockpit-Abläufe',
        description:
          'Steuerkräfte, elektrische Trimmung, Flight-Director-Anzeigen, Startrotation und manuelle Sichtplatzrunden sicher beherrschen.',
      },
      {
        stage: 'Stufe 02',
        title: 'FMC-Programmierung & Autopilot-Modi',
        description:
          'Wegpunkte eingeben, Leistungsparameter konfigurieren und laterale sowie vertikale Flugprofile über LNAV/VNAV steuern.',
      },
      {
        stage: 'Stufe 03',
        title: 'Schlechtwetter & 35-Knoten-Seitenwind',
        description:
          'Wetterradar im Cockpit deuten, starke Turbulenzen aussteuern, Vorhaltewinkel korrigieren und CAT-III-ILS-Autolandungen erleben.',
      },
      {
        stage: 'Stufe 04',
        title: 'Systemstörungen & Notfallszenarien',
        description:
          'Notfälle in Ruhe meistern: ein Triebwerksausfall nach dem Start, ein einmotoriges Durchstarten und Druckabfall – mit der Checkliste in der Hand und einem Kapitän neben Ihnen.',
      },
      {
        stage: 'Stufe 05',
        title: 'Legendäre Extrem-Anflüge weltweit',
        description:
          'Fliegen Sie die Checkerboard-Kurve in Hongkong Kai Tak, navigieren Sie durch das enge Alpental nach Innsbruck und sinken Sie nach Paro in Bhutan.',
      },
    ],
    comparisonTitle: 'Einzelflug vs. Flugprogramm',
    comparisonSubtitle:
      'Was sich ändert, wenn Sie statt eines einzelnen Fluges ein 5- oder 10-Flüge-Programm wählen.',
    comparisonHeaders: {
      feature: 'Das erhalten Sie',
      singleFlight: 'Einzelflug',
      sub5: '5-Flüge-Programm',
      sub10: '10-Flüge-Programm',
    },
    comparisonRows: [
      {
        feature: 'Cockpit-Flugzeit',
        single: '60–90 Min. (1 Flug)',
        sub5: '300–450 Min. (5 Flüge)',
        sub10: '600–900 Min. (10 Flüge)',
      },
      {
        feature: 'Preis pro Flug',
        single: 'Standardtarif',
        sub5: '20 % sparen (bis zu ₪860)',
        sub10: '30 % sparen (bis zu ₪2.550)',
      },
      {
        feature: 'Was Sie am Ende selbst fliegen',
        single: 'Start und geführte Landung',
        sub5: 'FMC-Setup, manuelle Platzrunde, Seitenwindlandung',
        sub10: 'Komplette Missionen, Notfälle und Abschlussflug',
      },
      {
        feature: 'Trainingslehrplan',
        single: 'Einführungsflug',
        sub5: '5-stufiger Aufbaulehrplan',
        sub10: 'Umfassender Kapitänslehrplan',
      },
      {
        feature: 'Buchung',
        single: 'Ein fester Termin',
        sub5: 'Jeder Flug flexibel nach Wunsch',
        sub10: 'Jeder Flug flexibel nach Wunsch',
      },
      {
        feature: 'Persönliches Debriefing',
        single: 'Kurzes mündliches Debriefing',
        sub5: 'Fortschritt im Flugbuch',
        sub10: 'Ausführliches Entwicklungs-Debriefing',
      },
    ],
    faqTitle: 'Fragen vor der Programmwahl',
    faqSubtitle: 'Wie Kauf, Terminbuchung und Flüge im Programm ablaufen.',
    faqEyebrow: 'Fragen zum Programm',
    faqs: [
      {
        question: 'Wie buche ich die Flüge in meinem Programm?',
        answer:
          'Einzeln nacheinander oder mehrere zusammen – ganz wie Sie möchten. Unsere Disposition plant sie mit Ihnen, und jede Buchung wird gegen den Live-Kalender bestätigt.',
      },
      {
        question: 'Kann ich gezielte Cockpit-Trainingsthemen hinzufügen?',
        answer:
          'Ihr Kapitän kann passende Lerninhalte wie Cold & Dark, Seitenwind/IFR oder Extrem-Flughäfen einbinden. Etwaige Zusatzzeit, Preise und Beobachterplätze werden vorab separat bestätigt.',
      },
      {
        question: 'Brauche ich Vorkenntnisse im Fliegen oder am Simulator?',
        answer:
          'Es sind keinerlei Vorkenntnisse nötig. Jeder Flug findet 1-zu-1 mit einem aktiven Verkehrspiloten statt, der jede Mission an Ihr Tempo anpasst.',
      },
      {
        question: 'Ist das ein Abo mit automatischer monatlicher Abbuchung?',
        answer:
          'Nein. Sie zahlen einmalig und danach wird nichts mehr abgebucht: keine Verlängerung, keine Monatsgebühren, keine Bindung. Ihre Flüge bleiben ab Kaufdatum ein volles Jahr lang buchbar.',
      },
    ],
    bottomCtaTitle: 'Ihr erster Flug kann schon diese Woche stattfinden.',
    bottomCtaSubtitle: 'Wählen Sie das Programm, das zu Ihrem Ziel passt, oder sprechen Sie mit unserem Cheffluglehrer über einen individuellen Plan.',
    bottomCtaBadge: 'Sim Dream Piloten-Entwicklungspfad',
    bottomCtaButton: 'Mein Programm wählen',
    bottomContactConcierge: 'Fragen? Direkt per Telefon oder WhatsApp mit der Disposition sprechen',
  },
};
