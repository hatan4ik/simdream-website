import type { Language } from '@/lib/i18n/translations';

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
    validityLabel: string;
    validityValue: string;
    savingsLabel: string;
    savingsValue: string;
    mentorshipLabel: string;
    mentorshipValue: string;
    guestLabel: string;
    guestValue: string;
  };
  whySubscribeTitle: string;
  whySubscribeSubtitle: string;
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
  faqs: [
    SubscriptionFaqCopy,
    SubscriptionFaqCopy,
    SubscriptionFaqCopy,
    SubscriptionFaqCopy,
  ];
  bottomCtaTitle: string;
  bottomCtaSubtitle: string;
  bottomCtaButton: string;
  bottomContactConcierge: string;
}

export const SUBSCRIPTION_PAGE_COPY: Record<Language, SubscriptionPageCopy> = {
  en: {
    eyebrow: "SIM DREAM CAPTAIN'S CLUB · ANNUAL SUBSCRIPTIONS",
    heroTitle: 'One Flight Is a Memory. A Subscription Makes You a Pilot.',
    heroSubtitle:
      'Master 70 tons of Boeing 737 airliner power across five or ten structured flight sessions. Experience 1-on-1 coaching with commercial airline captains, 12 months of complete scheduling freedom, free jumpseat guests, and up to ₪2,550 in guaranteed savings.',
    stats: {
      validityLabel: 'Scheduling Window',
      validityValue: '12 Months Valid',
      savingsLabel: 'Guaranteed Savings',
      savingsValue: 'Up to ₪2,550 Off',
      mentorshipLabel: 'Personal Coaching',
      mentorshipValue: 'Active Captains',
      guestLabel: 'Observer Jumpseat',
      guestValue: 'Free Every Flight',
    },
    whySubscribeTitle: 'Why Choose an Annual Flight Subscription?',
    whySubscribeSubtitle:
      'A single flight gives you a taste of the cockpit. An annual subscription builds muscle memory, system comprehension, and authentic airmanship.',
    pillars: [
      {
        title: 'Structured Pilot Progression',
        description:
          'Move systematically from basic visual traffic patterns to flight management computer (FMC) programming, autothrottle logic, CAT III bad weather landings, and emergency procedures.',
      },
      {
        title: 'Maximum Economic Value',
        description:
          'Lock in our lowest flight-hour tariff and save between ₪700 and ₪2,550 compared to booking standalone flights, with full protection against seasonal price updates.',
      },
      {
        title: '365 Days of Scheduling Freedom',
        description:
          'Your flight credits remain active for a full calendar year. Fly on weekends, weekday evenings, or holidays with direct priority booking through Captain Dispatch.',
      },
      {
        title: 'Bring a Co-Pilot or Observer for Free',
        description:
          'Every single flight session includes an accompanying cockpit jumpseat guest at zero extra charge. Share the thrill of commercial aviation with family, friends, or colleagues.',
      },
    ],
    filterAll: 'All Subscriptions',
    filter5: '5-Flight Track (Mastery)',
    filter10: '10-Flight Track (Airline Syllabus)',
    recommendedBadge: 'CAPTAIN RECOMMENDED',
    perSessionLabel: 'effective per flight',
    roadmapTitle: 'The 5-Stage Flight Deck Learning Journey',
    roadmapSubtitle:
      'Every session builds on the last. Here is the structured syllabus you master alongside active airline captains.',
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
          'Handle V1 engine cuts, single-engine go-arounds, rapid depressurization, and Quick Reference Handbook (QRH) checklists.',
      },
      {
        stage: 'Stage 05',
        title: 'Iconic Extreme World Approaches',
        description:
          'Fly the checkerboard turn at Hong Kong Kai Tak, navigate the narrow alpine valley into Innsbruck, and descend into Paro Bhutan.',
      },
    ],
    comparisonTitle: 'Standalone Flights vs. Annual Subscription',
    comparisonSubtitle:
      'Compare standard one-off flight bookings with our 5-flight and 10-flight structured subscription programmes.',
    comparisonHeaders: {
      feature: 'Included Feature',
      singleFlight: '1-Time Flight',
      sub5: '5-Flight Subscription',
      sub10: '10-Flight Subscription',
    },
    comparisonRows: [
      {
        feature: 'Cockpit Flight Time',
        single: '60–90 min (1 flight)',
        sub5: '300–450 min (5 flights)',
        sub10: '600–900 min (10 flights)',
      },
      {
        feature: 'Effective Hourly Savings',
        single: 'Standard rate',
        sub5: 'Save 20% (up to ₪860)',
        sub10: 'Save 30% (up to ₪2,550)',
      },
      {
        feature: 'Training Syllabus',
        single: 'Introductory flight',
        sub5: '5-stage progressive syllabus',
        sub10: 'Comprehensive airline syllabus',
      },
      {
        feature: 'Validity Window',
        single: 'Booked date only',
        sub5: '12 full months (365 days)',
        sub10: '12 full months (365 days)',
      },
      {
        feature: 'Free Observer Jumpseat',
        single: '1 session',
        sub5: 'Free on all 5 sessions',
        sub10: 'Free on all 10 sessions',
      },
      {
        feature: 'Personal Pilot Debrief',
        single: 'Standard verbal debrief',
        sub5: 'Flight logbook tracking',
        sub10: 'Full pilot development debrief',
      },
    ],
    faqTitle: 'Frequently Asked Questions About Subscriptions',
    faqSubtitle:
      'Everything you need to know about purchasing, scheduling, and enjoying your annual flight subscription.',
    faqs: [
      {
        question: 'How do I schedule my flight sessions after purchasing a subscription?',
        answer:
          'Scheduling is completely flexible. You can book all sessions in advance or reserve them one by one through our dedicated Captain Dispatch desk or online member booking. There are no blackout dates.',
      },
      {
        question: 'Can I bring someone with me to the cockpit?',
        answer:
          'Yes. Every subscription session includes one free observer jumpseat in the cockpit. You are welcome to bring a different family member, friend, or partner on each flight.',
      },
      {
        question: 'Do I need previous flight or simulator experience?',
        answer:
          'Zero experience is required. Every flight is conducted 1-on-1 with an active commercial airline pilot who adapts each mission to your personal comfort level and aspirations.',
      },
      {
        question: 'Is this an automatically recurring subscription charge?',
        answer:
          'No. All our flight subscriptions are paid as a single one-time payment with zero recurring billing, zero commitments, and 12 full months of validity.',
      },
    ],
    bottomCtaTitle: 'Ready to Begin Your Pilot Progression?',
    bottomCtaSubtitle:
      'Choose your subscription track or consult with our Chief Flight Instructor to design a custom training journey.',
    bottomCtaButton: 'Discuss Your Subscription with Dispatch',
    bottomContactConcierge: 'Have questions? Call or WhatsApp Captain Dispatch directly',
  },

  he: {
    eyebrow: 'מועדון הטיסה של סים דרים · מנויים שנתיים',
    heroTitle: 'טיסה אחת היא חוויה בלתי נשכחת. מנוי הופך אתכם לטייסים.',
    heroSubtitle:
      'שלטו ב-70 טון של מטוס בואינג 737 לאורך חמש או עשר משימות טיסה מובנות. תיהנו מהדרכה אישית של קברניטי חברות תעופה, 12 חודשי חופש מוחלט בקביעת מועדים, מושב צופה חינם בכל טיסה, וחיסכון כספי מובטח של עד 2,550 ₪.',
    stats: {
      validityLabel: 'תוקף למימוש',
      validityValue: '12 חודשים מלאים',
      savingsLabel: 'חיסכון מובטח',
      savingsValue: 'עד 2,550 ₪ הנחה',
      mentorshipLabel: 'הדרכה אישית',
      mentorshipValue: 'קברניטים פעילים',
      guestLabel: 'מושב צופה',
      guestValue: 'חינם בכל טיסה',
    },
    whySubscribeTitle: 'למה לבחור במנוי טיסה שנתי?',
    whySubscribeSubtitle:
      'טיסה בודדת מעניקה טעימה ראשונית מתא הטייס. מנוי שנתי מעניק שליטה אמיתית, זיכרון שרירי, הבנה מעמיקה ומיומנות תעופתית.',
    pillars: [
      {
        title: 'התקדמות מובנית שלב אחר שלב',
        description:
          'מתקדמים באופן שיטתי מהקפות ראייה בסיסיות, דרך תכנות מחשב הטיסה (FMC), ניהול מצערת אוטומטית, נחיתות ILS במזג אוויר סוער ועד התמודדות עם תקלות חירום.',
      },
      {
        title: 'ערך כלכלי מרבי וחיסכון כספי',
        description:
          'מבטיחים את תעריף שעת הטיסה המשתלם ביותר וחוסכים בין 700 ₪ ל-2,550 ₪ ביחס להזמנת טיסות בודדות, עם חסינות מלאה מעדכוני מחירים.',
      },
      {
        title: '365 ימים של גמישות מוחלטת',
        description:
          'יתרת הטיסות שלכם נשמרת לשנה קלנדרית מלאה. טסים בסופי שבוע, בערבים או בחגים בתיאום ישיר בעדיפות מול מחלקת המבצעים.',
      },
      {
        title: 'מצרפים בן משפחה או חבר ללא תשלום',
        description:
          'כל מפגש טיסה כולל מושב צופה בתא הטייס ללא עלות נוספת. חולקים את חוויית התעופה המסחרית עם בן או בת זוג, ילדים או חברים.',
      },
    ],
    filterAll: 'כל המנויים',
    filter5: 'מסלול 5 טיסות (בניית שליטה)',
    filter10: 'מסלול 10 טיסות (סילבוס חברת תעופה)',
    recommendedBadge: 'הבחירה המומלצת',
    perSessionLabel: 'מחיר אפקטיבי לטיסה',
    roadmapTitle: 'מסע הלמידה בתא הטייס ב-5 שלבים',
    roadmapSubtitle:
      'כל מפגש נבנה על גבי קודמו. זהו הסילבוס המקצועי שתתרגלו לצד קברניטי חברות תעופה.',
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
          'התמודדות עם אובדן מנוע בהמראה (V1 Cut), הליכה סביב במנוע בודד, ירידת לחץ מהירה ועבודה מול ספר נהלי החירום (QRH).',
      },
      {
        stage: 'שלב 05',
        title: 'גישות מאתגרות במנחתים עולמיים',
        description:
          'ביצוע הפנייה המפורסמת בשחמט של קאי טאק הונג קונג, ניווט בעמק האלפיני של אינסברוק ונחיתה מאתגרת בפארו בהוטן.',
      },
    ],
    comparisonTitle: 'טיסות בודדות מול מנוי טיסה שנתי',
    comparisonSubtitle:
      'השוואה ברורה בין הזמנת טיסות בודדות לבין מנוי טיסה מובנה של חמש או עשר טיסות.',
    comparisonHeaders: {
      feature: 'מאפיין כלול',
      singleFlight: 'טיסה בודדת',
      sub5: 'מנוי 5 טיסות',
      sub10: 'מנוי 10 טיסות',
    },
    comparisonRows: [
      {
        feature: 'זמן טיסה בתא הטייס',
        single: '60–90 דקות (טיסה 1)',
        sub5: '300–450 דקות (5 טיסות)',
        sub10: '600–900 דקות (10 טיסות)',
      },
      {
        feature: 'חיסכון אפקטיבי בשעות',
        single: 'תעריף רגיל',
        sub5: 'חיסכון של 20% (עד 860 ₪)',
        sub10: 'חיסכון של 30% (עד 2,550 ₪)',
      },
      {
        feature: 'סילבוס הדרכה מובנה',
        single: 'טיסת היכרות',
        sub5: 'סילבוס מדורג ב-5 שלבים',
        sub10: 'סילבוס קו תעופה מקיף',
      },
      {
        feature: 'תוקף מימוש הטיסות',
        single: 'המועד המוזמן בלבד',
        sub5: '12 חודשים מלאים (365 ימים)',
        sub10: '12 חודשים מלאים (365 ימים)',
      },
      {
        feature: 'מושב צופה ללא עלות',
        single: 'במפגש הבודד',
        sub5: 'חינם בכל 5 המפגשים',
        sub10: 'חינם בכל 10 המפגשים',
      },
      {
        feature: 'תחקיר אישי ומשוב',
        single: 'תחקיר מילולי קצר',
        sub5: 'מעקב ביומן טיסות',
        sub10: 'תחקיר התפתחות מקיף',
      },
    ],
    faqTitle: 'שאלות נפוצות על מנויי הטיסה',
    faqSubtitle:
      'כל מה שחשוב לדעת על רכישה, תיאום המועדים והחוויה במנוי הטיסה השנתי.',
    faqs: [
      {
        question: 'כיצד מתאמים את מועדי הטיסות לאחר רכישת המנוי?',
        answer:
          'התיאום גמיש לחלוטין. ניתן לתאם את כל המפגשים מראש או לקבוע כל טיסה בנפרד מול מחלקת המבצעים שלנו או במערכת ההזמנות, ללא תאריכים חסומים.',
      },
      {
        question: 'האם מותר לצרף מלווה לתא הטייס?',
        answer:
          'בהחלט. כל מפגש מנוי כולל מושב צופה אחד ללא כל תוספת תשלום. ניתן להביא בן משפחה, חבר או שותף שונה בכל טיסה מחדש.',
      },
      {
        question: 'האם נדרש ניסיון טיסה קודם כדי להצטרף למנוי?',
        answer:
          'אין צורך בניסיון קודם כלל. כל טיסה מתבצעת בליווי אישי של קברניט פעיל שמתאים את רמת המשימה והאתגר לקצב האישי שלכם.',
      },
      {
        question: 'האם מדובר בחיוב חודשי מתחדש?',
        answer:
          'לא. כל מנויי הטיסה נרכשים בתשלום חד-פעמי מלא, ללא כל חיובים אוטומטיים מתחדשים, ללא התחייבויות עתידיות ועם תוקף של שנה שלמה.',
      },
    ],
    bottomCtaTitle: 'מוכנים לקחת פיקוד על תא הטייס?',
    bottomCtaSubtitle:
      'בחרו את מסלול המנוי המתאים לכם או התייעצו עם המדריך הראשי לתכנון מסלול טיסה מותאם אישית.',
    bottomCtaButton: 'תיאום והרשמה למנוי מול מחלקת המבצעים',
    bottomContactConcierge: 'יש שאלות? חייגו או שלחו הודעת וואטסאפ ישירות לדיספצ׳ר',
  },

  ru: {
    eyebrow: 'ЛЁТНЫЙ КЛУБ SIM DREAM · ГОДОВЫЕ АБОНЕМЕНТЫ',
    heroTitle: 'Один полёт — впечатление. Абонемент делает вас пилотом.',
    heroSubtitle:
      'Освойте 70-тонный лайнер Boeing 737 за пять или десять структурированных миссий. Индивидуальный коучинг от действующих капитанов авиалиний, 12 месяцев полной свободы расписания, бесплатное место для гостя и гарантированная выгода до 2550 ₪.',
    stats: {
      validityLabel: 'Срок действия',
      validityValue: '12 месяцев',
      savingsLabel: 'Гарантированная выгода',
      savingsValue: 'До 2550 ₪ экономии',
      mentorshipLabel: 'Обучение с пилотом',
      mentorshipValue: 'Капитаны авиалиний',
      guestLabel: 'Место наблюдателя',
      guestValue: 'Бесплатно каждый полёт',
    },
    whySubscribeTitle: 'Почему стоит выбрать годовой абонемент?',
    whySubscribeSubtitle:
      'Разовый полёт даёт первое знакомство с кабиной. Годовой абонемент формирует мышечную память, глубокое понимание систем и уверенное пилотирование.',
    pillars: [
      {
        title: 'Последовательный лётный прогресс',
        description:
          'Системный переход от визуальных кругов к программированию FMC, автомату тяги, заходам по ILS в сложных метеоусловиях и отказам двигателей.',
      },
      {
        title: 'Максимальная финансовая выгода',
        description:
          'Фиксация минимального тарифа за лётный час и экономия от 700 ₪ до 2550 ₪ по сравнению с разовыми сессиями, без влияния сезонных повышений цен.',
      },
      {
        title: '365 дней полной свободы графика',
        description:
          'Ваши часы действительны целый год. Выбирайте выходные, будни или праздники с приоритетным согласованием через диспетчера.',
      },
      {
        title: 'Бесплатное кресло для гостя',
        description:
          'Каждая сессия включает место наблюдателя в кабине без доплаты. Делитесь эмоциями с супругой, детьми или друзьями на каждом вылете.',
      },
    ],
    filterAll: 'Все абонементы',
    filter5: '5 полётов (Базовое мастерство)',
    filter10: '10 полётов (Курс авиалинии)',
    recommendedBadge: 'ВЫБОР КАПИТАНА',
    perSessionLabel: 'за каждый полёт',
    roadmapTitle: '5 этапов освоения лайнера',
    roadmapSubtitle:
      'Каждое занятие строится на базе предыдущего. Вот программа, которую вы пройдёте рука об руку с капитаном.',
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
          'Отказ двигателя на скорости V1, уход на второй круг на одном моторе, разгерметизация и чеклисты QRH.',
      },
      {
        stage: 'Этап 05',
        title: 'Сложнейшие заходы мира',
        description:
          'Легендарный визуальный доворот в Гонконге (Кай Так), ущелье Инсбрука и высокогорный заход в Паро (Бутан).',
      },
    ],
    comparisonTitle: 'Разовые полёты или годовой абонемент?',
    comparisonSubtitle:
      'Наглядное сравнение разовых бронирований с программами на пять и десять полётов.',
    comparisonHeaders: {
      feature: 'Параметр',
      singleFlight: 'Разовый полёт',
      sub5: 'Абонемент 5 полётов',
      sub10: 'Абонемент 10 полётов',
    },
    comparisonRows: [
      {
        feature: 'Время в кабине',
        single: '60–90 мин (1 раз)',
        sub5: '300–450 мин (5 сессий)',
        sub10: '600–900 мин (10 сессий)',
      },
      {
        feature: 'Экономия на часах',
        single: 'Базовый тариф',
        sub5: 'Выгода 20% (до 860 ₪)',
        sub10: 'Выгода 30% (до 2550 ₪)',
      },
      {
        feature: 'Программа обучения',
        single: 'Вводный полёт',
        sub5: '5 последовательных этапов',
        sub10: 'Полный линейный курс',
      },
      {
        feature: 'Срок действия',
        single: 'Только дата брони',
        sub5: '12 месяцев (365 дней)',
        sub10: '12 месяцев (365 дней)',
      },
      {
        feature: 'Гость в кабине',
        single: '1 сессия',
        sub5: 'Бесплатно все 5 сессий',
        sub10: 'Бесплатно все 10 сессий',
      },
      {
        feature: 'Разбор от пилота',
        single: 'Краткий устный итог',
        sub5: 'Записи в летной книжке',
        sub10: 'Полный отчет прогресса',
      },
    ],
    faqTitle: 'Частые вопросы об абонементах',
    faqSubtitle:
      'Всё о приобретении, бронировании времени и прохождении лётной программы.',
    faqs: [
      {
        question: 'Как бронировать даты после покупки абонемента?',
        answer:
          'График полностью гибкий. Можно спланировать все сессии заранее или бронировать по одной через диспетчера без закрытых дат.',
      },
      {
        question: 'Можно ли приводить с собой гостей в кабину?',
        answer:
          'Да. Каждое занятие включает одно бесплатное кресло наблюдателя. Вы можете приглашать разных гостей на каждую сессию.',
      },
      {
        question: 'Нужен ли предварительный опыт полетов?',
        answer:
          'Опыт не требуется. Занятия проходят один на один с пилотом гражданской авиации, который настраивает уровень сложности под вас.',
      },
      {
        question: 'Будут ли автоматические ежемесячные списания?',
        answer:
          'Нет. Абонемент оплачивается один раз. Никаких скрытых платежей, подписок или автопродлений — у вас есть 12 месяцев на полёты.',
      },
    ],
    bottomCtaTitle: 'Готовы взять управление на себя?',
    bottomCtaSubtitle:
      'Выберите свой абонемент или обсудите индивидуальную программу с шеф-пилотом.',
    bottomCtaButton: 'Обсудить абонемент с диспетчером',
    bottomContactConcierge: 'Вопросы? Позвоните или напишите в WhatsApp диспетчеру',
  },

  fr: {
    eyebrow: 'CLUB DES COMMANDANTS SIM DREAM · ABONNEMENTS ANNUELS',
    heroTitle: 'Un vol est un souvenir. Un abonnement fait de vous un pilote.',
    heroSubtitle:
      'Prenez les commandes des 70 tonnes du Boeing 737 sur cinq ou dix missions progressives. Coaching individuel avec des commandants de ligne en activité, 12 mois de totale liberté de planning, place observateur offerte et jusqu’à 2 550 ₪ d’économie garantie.',
    stats: {
      validityLabel: 'Période de validité',
      validityValue: '12 mois complets',
      savingsLabel: 'Économie garantie',
      savingsValue: 'Jusqu’à 2 550 ₪',
      mentorshipLabel: 'Formation dédiée',
      mentorshipValue: 'Commandants de ligne',
      guestLabel: 'Siège observateur',
      guestValue: 'Offert à chaque vol',
    },
    whySubscribeTitle: 'Pourquoi choisir un abonnement annuel ?',
    whySubscribeSubtitle:
      'Un vol unique offre une première découverte. Un abonnement annuel ancre la mémoire musculaire, la logique des systèmes et une réelle aisance en poste de pilotage.',
    pillars: [
      {
        title: 'Progression structurée et cohérente',
        description:
          'Avancez pas à pas : du tour de piste visuel à la programmation du FMC, la gestion de l’automanette, les approches CAT III par gros temps et les pannes critiques.',
      },
      {
        title: 'Valeur économique maximale',
        description:
          'Bénéficiez de notre tarif horaire le plus avantageux et économisez entre 700 ₪ et 2 550 ₪ par rapport aux séances individuelles, à l’abri de toute hausse tarifaire.',
      },
      {
        title: '365 jours de liberté pour voler',
        description:
          'Vos séances restent disponibles pendant une année civile complète. Volez en week-end, en soirée ou pendant les congés avec un accès prioritaire via le Dispatch.',
      },
      {
        title: 'Invitez un proche sans supplément',
        description:
          'Chaque vol comprend un strapontin observateur dans le cockpit sans aucun frais supplémentaire. Partagez la passion avec un proche différent à chaque séance.',
      },
    ],
    filterAll: 'Tous les abonnements',
    filter5: 'Cursus 5 vols (Maîtrise)',
    filter10: 'Cursus 10 vols (Ligne aérienne)',
    recommendedBadge: 'RECOMMANDÉ PAR LE CAPITAINE',
    perSessionLabel: 'coût effectif par vol',
    roadmapTitle: 'Parcours d’apprentissage en 5 étapes',
    roadmapSubtitle:
      'Chaque séance consolide la précédente. Voici le syllabus professionnel développé avec nos commandants de bord.',
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
          'Panne moteur à V1, remise de gaz sur un seul réacteur, dépressurisation et utilisation des check-lists QRH.',
      },
      {
        stage: 'Étape 05',
        title: 'Approches spectaculaires à travers le monde',
        description:
          'Le virage mythique de Kai Tak à Hong Kong, la vallée alpine d’Innsbruck et la descente exigeante de Paro au Bhoutan.',
      },
    ],
    comparisonTitle: 'Séances uniques ou abonnement annuel ?',
    comparisonSubtitle:
      'Tableau comparatif entre des vols ponctuels et nos formules d’abonnement de 5 ou 10 séances.',
    comparisonHeaders: {
      feature: 'Prestation',
      singleFlight: 'Vol à l’unité',
      sub5: 'Abonnement 5 vols',
      sub10: 'Abonnement 10 vols',
    },
    comparisonRows: [
      {
        feature: 'Temps de cockpit',
        single: '60–90 min (1 séance)',
        sub5: '300–450 min (5 séances)',
        sub10: '600–900 min (10 séances)',
      },
      {
        feature: 'Économie horaire',
        single: 'Tarif standard',
        sub5: 'Économie de 20% (jusqu’à 860 ₪)',
        sub10: 'Économie de 30% (jusqu’à 2 550 ₪)',
      },
      {
        feature: 'Syllabus de formation',
        single: 'Vol découverte',
        sub5: 'Syllabus progressif 5 étapes',
        sub10: 'Syllabus complet compagnie',
      },
      {
        feature: 'Durée de validité',
        single: 'Date réservée',
        sub5: '12 mois complets (365 jours)',
        sub10: '12 mois complets (365 jours)',
      },
      {
        feature: 'Invité observateur',
        single: '1 fois',
        sub5: 'Offert sur les 5 séances',
        sub10: 'Offert sur les 10 séances',
      },
      {
        feature: 'Débriefing personnalisé',
        single: 'Bilan oral rapide',
        sub5: 'Suivi sur carnet de vol',
        sub10: 'Bilan complet de progression',
      },
    ],
    faqTitle: 'Questions fréquentes sur les abonnements',
    faqSubtitle:
      'Toutes les réponses pour choisir, planifier et profiter pleinement de votre abonnement.',
    faqs: [
      {
        question: 'Comment réserver mes séances après l’achat ?',
        answer:
          'La planification est totalement libre. Vous pouvez programmer vos séances à l’avance ou les fixer une par une auprès de notre Dispatch, sans restriction de calendrier.',
      },
      {
        question: 'Puis-je être accompagné dans le cockpit ?',
        answer:
          'Oui. Chaque séance comprend une place observateur gratuite dans le poste. Vous pouvez convier un proche différent à chaque vol.',
      },
      {
        question: 'Faut-il une expérience préalable en pilotage ?',
        answer:
          'Aucune expérience n’est nécessaire. Chaque vol est encadré individuellement par un commandant de ligne qui adapte la mission à votre niveau.',
      },
      {
        question: 'S’agit-il d’un prélèvement automatique récurrent ?',
        answer:
          'Non. Nos abonnements sont réglés en un paiement unique, sans reconduction tacite ni frais dissimulés, avec 12 mois de validité.',
      },
    ],
    bottomCtaTitle: 'Prêt à prendre les commandes ?',
    bottomCtaSubtitle:
      'Sélectionnez votre formule ou échangez avec notre chef-pilote pour construire votre parcours sur mesure.',
    bottomCtaButton: 'Organiser mon abonnement avec le Dispatch',
    bottomContactConcierge: 'Une question ? Contactez le Dispatch par téléphone ou WhatsApp',
  },

  ar: {
    eyebrow: 'نادي كباتن سيم دريم · اشتراكات سنوية',
    heroTitle: 'رحلة واحدة هي ذكرى لا تُنسى. الاشتراك يجعلكم طيارين.',
    heroSubtitle:
      'تولوا قيادة طائرة بوينغ 737 بوزن 70 طناً عبر خمس أو عشر مهام طيران منظمة. تدريب فردي مباشر مع كباتن طيران تجاري، 12 شهراً من الحرية التامة في تحديد المواعيد، مقعد مرافق مجاني في كل رحلة، وتوفير مضمون يصل إلى 2,550 شيكل.',
    stats: {
      validityLabel: 'صلاحية الاستخدام',
      validityValue: '12 شهراً كاملاً',
      savingsLabel: 'توفير مضمون',
      savingsValue: 'خصم حتى 2,550 شيكل',
      mentorshipLabel: 'تدريب فردي',
      mentorshipValue: 'كباتن خطوط جوية',
      guestLabel: 'مقعد المرافق',
      guestValue: 'مجاني في كل رحلة',
    },
    whySubscribeTitle: 'لماذا تختارون اشتراك طيران سنوياً؟',
    whySubscribeSubtitle:
      'الرحلة الواحدة تمنحكم فكرة أولية عن قمرة القيادة. الاشتراك السنوي يبني ذاكرة عضلية حقيقية وفهماً شاملاً لأنظمة الطيران وإتقاناً للتحليق.',
    pillars: [
      {
        title: 'تدرج تعليمي منهجي ومنظم',
        description:
          'انتقال مدروس من مناورات الدوائر البصرية الأولية إلى برمجة كمبيوتر إدارة الرحلة (FMC)، وضبط السرعة الآلي، وهبوط ILS في أصعب الظروف والتعامل مع الطوارئ.',
      },
      {
        title: 'أعلى قيمة اقتصادية وتوفير مالي',
        description:
          'تضمنون الحصول على أفضل سعر لساعة الطيران وتوفرون ما بين 700 و2,550 شيكل مقارنة بحجز الرحلات الفردية، مع حماية كاملة من تغير الأسعار.',
      },
      {
        title: '365 يوماً من المرونة الكاملة',
        description:
          'رصيد ساعاتكم سارٍ لعام كامل. احجزوا في عطلات نهاية الأسبوع أو المساء أو المناسبات بأولوية مباشرة عبر قسم العمليات.',
      },
      {
        title: 'اصطحبوا مرافقاً مجاناً في كل رحلة',
        description:
          'كل جلسة طيران تتضمن مقعد مراقب إضافياً في قمرة القيادة بدون أي تكلفة إضافية. شاركوا التجربة مع العائلة أو الأصدقاء في كل زيارة.',
      },
    ],
    filterAll: 'جميع الاشتراكات',
    filter5: 'مسار 5 رحلات (بناء الإتقان)',
    filter10: 'مسار 10 رحلات (منهج شركات الطيران)',
    recommendedBadge: 'الخيار المفضل للكابتن',
    perSessionLabel: 'التكلفة الفعلية للرحلة',
    roadmapTitle: 'رحلة تعلّم الطيران في 5 مراحل',
    roadmapSubtitle:
      'كل جلسة تكمل ما قبلها. هذا هو المنهج التدريبي المنظم الذي ستتدربون عليه مع كباتن الخطوط الجوية.',
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
          'التعامل مع تعطل المحرك عند سرعة V1، والتحليق بمحرك واحد، وفقدان الضغط، واستخدام دليل الطوارئ QRH.',
      },
      {
        stage: 'المرحلة 05',
        title: 'أصعب الاقترابات في مطارات العالم',
        description:
          'تنفيذ الانعطاف الشهير في كاي تاك بهونغ كونغ، وملاحة وادي إنسبروك في جبال الألب، والهبوط في بارو بوتان.',
      },
    ],
    comparisonTitle: 'الرحلات الفردية مقارنة بالاشتراك السنوي',
    comparisonSubtitle:
      'مقارنة واضحة بين حجز الرحلات الفردية وبرامج الاشتراكات لخمس أو عشر رحلات.',
    comparisonHeaders: {
      feature: 'الميزة المشمولة',
      singleFlight: 'رحلة فردية',
      sub5: 'اشتراك 5 رحلات',
      sub10: 'اشتراك 10 رحلات',
    },
    comparisonRows: [
      {
        feature: 'الوقت في قمرة القيادة',
        single: '60–90 دقيقة (جلسة واحدة)',
        sub5: '300–450 دقيقة (5 جلسات)',
        sub10: '600–900 دقيقة (10 جلسات)',
      },
      {
        feature: 'التوفير الفعلي في الساعات',
        single: 'السعر الأساسي',
        sub5: 'توفير 20% (حتى 860 شيكل)',
        sub10: 'توفير 30% (حتى 2,550 شيكل)',
      },
      {
        feature: 'المنهج التدريبي',
        single: 'رحلة تمهيدية',
        sub5: 'منهج متدرج من 5 مراحل',
        sub10: 'منهج تدريب خطوط متكامل',
      },
      {
        feature: 'صلاحية الاستخدام',
        single: 'الموعد المحدد فقط',
        sub5: '12 شهراً كاملاً (365 يوماً)',
        sub10: '12 شهراً كاملاً (365 يوماً)',
      },
      {
        feature: 'مرافق مجاني في القمرة',
        single: 'في الجلسة المحددة',
        sub5: 'مجاناً في الجلسات الـ 5',
        sub10: 'مجاناً في الجلسات الـ 10',
      },
      {
        feature: 'التقييم الشخصي والتحليل',
        single: 'استخلاص شفهي موجز',
        sub5: 'متابعة في سجل الطيران',
        sub10: 'تقرير تقييم وتطوير شامل',
      },
    ],
    faqTitle: 'الأسئلة الشائعة حول اشتراكات الطيران',
    faqSubtitle:
      'كل ما تودون معرفته عن شراء وجدولة وخوض تجربة اشتراكات الطيران السنوية.',
    faqs: [
      {
        question: 'كيف يتم تحديد مواعيد الرحلات بعد الاشتراك؟',
        answer:
          'الجدولة مرنة بالكامل. يمكنكم حجز جميع الجلسات مسبقاً أو تحديد كل رحلة على حدة عبر قسم العمليات أو نظام الحجز، دون أي تواريخ محظورة.',
      },
      {
        question: 'هل يمكنني اصطحاب شخص معي في القمرة؟',
        answer:
          'نعم. كل جلسة تتضمن مقعد مراقب مجانياً في القمرة. يسعدنا استقبال مرافق مختلف في كل رحلة.',
      },
      {
        question: 'هل يشترط وجود خبرة سابقة في الطيران؟',
        answer:
          'لا تشترط أي خبرة سابقة. تتم كل رحلة بإشراف مباشر من كابتن خطوط جوية يكيف التدريب مع سرعتكم وتطلعاتكم.',
      },
      {
        question: 'هل هذا اشتراك يتجدد بخصم شهري تلقائي؟',
        answer:
          'كلا. تدفع الاشتراكات بدفعة واحدة دون أي اقتطاعات شهرية أو التزامات متكررة، مع صلاحية كاملة لمدة 12 شهراً.',
      },
    ],
    bottomCtaTitle: 'هل أنتم مستعدون لتولي القيادة؟',
    bottomCtaSubtitle:
      'اختاروا مسار الاشتراك الأنسب لكم أو استشيروا كبير المدربين لتصميم رحلة تدريبية مخصصة.',
    bottomCtaButton: 'تنسيق الاشتراك والتسجيل مع قسم العمليات',
    bottomContactConcierge: 'هل لديكم استفسار؟ اتصلوا أو تواصلوا عبر واتساب مباشرة مع العمليات',
  },
};
