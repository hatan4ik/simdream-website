import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import type { Language, LocalizedRecord } from '@/lib/i18n/translations';

/**
 * Single-payment flight tracks (sold to customers as "flight tracks", held in Wix as
 * Pricing Plans). These are deliberately separate from a one-off booking package: a
 * track describes commercial terms and a structured learning journey, while the booking engine remains the authority for an individual
 * departure and its reserved capacity.
 *
 * Wix Pricing Plans is the eventual authority for a purchased subscription and its
 * entitlement. Until that backend is enabled, this registry is the approved
 * public offer catalogue and the customer is handed to Dispatch to enrol.
 */
export type SubscriptionPassId =
  | 'flight-foundations-5x60'
  | 'advanced-captain-5x90'
  | 'atpl-concepts-10x60'
  | 'airline-readiness-10x90';

export interface SubscriptionPassCopy {
  title: string;
  summary: string;
  curriculum: string[];
}

export interface SubscriptionSectionCopy {
  badge: string;
  title: string;
  subtitle: string;
  sessionLabel: string;
  totalFlightTimeLabel: string;
  /** Pace and payment reassurance shown on each card; never a validity deadline. */
  flexibilityLabel: string;
  standardValueLabel: string;
  savingsLabel: string;
  curriculumLabel: string;
  trainingModulesLabel: string;
  trainingModulesDescription: string;
  requestEnrollment: string;
  redirectingToPayment: string;
  educationalDisclosure: string;
  consultDispatch: string;
}

export interface SubscriptionPass {
  id: SubscriptionPassId;
  /** The regular simulator package the subscription may be redeemed against. */
  packageId: string;
  sessions: 5 | 10;
  sessionMinutes: 60 | 90;
  /** Single-payment price. Recurring billing is intentionally not implied. */
  priceIls: number;
  /**
   * Commercial validity of the Wix plan. Marketing copy never leads with it
   * (AGENTS.md / GENESIS: outcome-first, no limited-time phrasing); it is disclosed
   * once, in the billing FAQ answer.
   */
  validityMonths: 12;
  /**
   * Existing add-on modules used as instructor-led curriculum themes. They do
   * not silently add the add-on's extra cockpit minutes to a reservation.
   */
  trainingAddonIds: readonly string[];
  copy: LocalizedRecord<SubscriptionPassCopy>;
}

export const SUBSCRIPTION_SECTION_COPY: LocalizedRecord<SubscriptionSectionCopy> = {
  en: {
    badge: 'CAPTAIN-LED FLIGHT TRACKS',
    title: 'Choose Your Flight Track',
    subtitle:
      'Five or ten Boeing 737 flights with the same captain, paid once and flown at your pace. Judgement, confidence and cockpit fluency that one ride cannot give.',
    sessionLabel: 'included flights',
    totalFlightTimeLabel: 'total cockpit time',
    flexibilityLabel: 'book each flight whenever it suits you · one payment',
    standardValueLabel: 'single-flight value',
    savingsLabel: 'you save',
    curriculumLabel: 'Captain-led learning sequence',
    trainingModulesLabel: 'Focused add-on training themes',
    trainingModulesDescription:
      'Your captain can place these instructor-led themes within a track flight. Any separately listed add-on time remains subject to booking capacity and the terms confirmed at enrolment.',
    requestEnrollment: 'Start this track',
    redirectingToPayment: 'Redirecting to payment...',
    educationalDisclosure:
      'Flight track coaching is educational simulator experience only. It does not grant logged flight hours, a pilot licence, a type rating, assessment credit, or an airline-employment guarantee.',
    consultDispatch: 'Have questions? Consult Dispatch',
  },
  he: {
    badge: 'מסלולי טיסה בהנחיית קברניט',
    title: 'בחרו את מסלול הטיסה שלכם',
    subtitle:
      'חמש או עשר טיסות בבואינג 737 עם אותו קברניט, בתשלום אחד ובקצב שלכם. שיקול דעת, ביטחון ושליטה בתא הטייס שחוויה אחת לא יכולה לתת.',
    sessionLabel: 'טיסות כלולות',
    totalFlightTimeLabel: 'זמן מצטבר בתא הטייס',
    flexibilityLabel: 'מתאמים כל טיסה כשמתאים לכם · תשלום אחד',
    standardValueLabel: 'שווי בטיסות בודדות',
    savingsLabel: 'אתם חוסכים',
    curriculumLabel: 'רצף למידה בהנחיית קברניט',
    trainingModulesLabel: 'נושאי אימון ממוקדים מתוך התוספות',
    trainingModulesDescription:
      'הקברניט יכול לשלב נושאים אלה בהנחיית מדריך בתוך טיסה במסלול. זמן תוספת המופיע בנפרד כפוף לקיבולת ההזמנה ולתנאים שאושרו בהרשמה.',
    requestEnrollment: 'להתחיל את המסלול הזה',
    redirectingToPayment: 'מעביר לתשלום...',
    educationalDisclosure:
      'הדרכות הסימולטור במסלולי הטיסה הן לימודיות וחווייתיות בלבד. הן אינן מקנות שעות טיסה רשמיות, רישיון, הגדר סוג, זיכוי למבדק או הבטחת העסקה בחברת תעופה.',
    consultDispatch: 'לשאלות והתאמה אישית: פנו למבצעים',
  },
  ru: {
    badge: 'ЛЁТНЫЕ ПРОГРАММЫ С КАПИТАНОМ',
    title: 'Выберите свою лётную программу',
    subtitle:
      'Пять или десять полётов на Boeing 737 с одним капитаном, одна оплата и ваш собственный ритм. Уверенность, осознанность и навыки кабины, которых не даст разовое впечатление.',
    sessionLabel: 'включённых полётов',
    totalFlightTimeLabel: 'всего времени в кабине',
    flexibilityLabel: 'каждый полёт — когда удобно · одна оплата',
    standardValueLabel: 'стоимость разовых полётов',
    savingsLabel: 'ваша экономия',
    curriculumLabel: 'Последовательность занятий с капитаном',
    trainingModulesLabel: 'Фокусные темы из модулей-дополнений',
    trainingModulesDescription:
      'Капитан может включить эти темы с инструктором в полёт программы. Отдельно указанное дополнительное время зависит от доступной ёмкости и условий, подтверждённых при оформлении.',
    requestEnrollment: 'Начать эту программу',
    redirectingToPayment: 'Переход к оплате...',
    educationalDisclosure:
      'Занятия в лётных программах являются учебным коучингом на симуляторе. Они не дают официальные лётные часы, лицензию, type rating, зачёт отбора или гарантию трудоустройства в авиакомпании.',
    consultDispatch: 'Есть вопросы? Напишите диспетчеру',
  },
  fr: {
    badge: 'PARCOURS DE VOL AVEC COMMANDANT',
    title: 'Choisissez votre parcours de vol',
    subtitle:
      'Cinq ou dix vols sur Boeing 737 avec le même commandant, réglés en une fois et volés à votre rythme. Du jugement, de l’assurance et une aisance au poste qu’une expérience unique ne peut pas donner.',
    sessionLabel: 'vols inclus',
    totalFlightTimeLabel: 'temps total au poste de pilotage',
    flexibilityLabel: 'chaque vol quand cela vous convient · un seul paiement',
    standardValueLabel: 'valeur des vols à l’unité',
    savingsLabel: 'vous économisez',
    curriculumLabel: 'Parcours d’apprentissage avec un commandant',
    trainingModulesLabel: 'Thèmes ciblés issus des modules additionnels',
    trainingModulesDescription:
      'Votre commandant peut intégrer ces thèmes guidés à un vol du parcours. Tout temps additionnel affiché séparément reste soumis à la capacité de réservation et aux conditions confirmées lors de l’inscription.',
    requestEnrollment: 'Commencer ce parcours',
    redirectingToPayment: 'Redirection vers le paiement...',
    educationalDisclosure:
      'L’accompagnement en simulateur constitue une expérience pédagogique uniquement. Il ne délivre ni heures de vol officielles, ni licence, ni qualification de type, ni crédit de sélection, ni garantie d’emploi en compagnie aérienne.',
    consultDispatch: 'Une question ? Consulter le Dispatch',
  },
  ar: {
    badge: 'مسارات طيران بإشراف كابتن',
    title: 'اختاروا مسار طيرانكم',
    subtitle:
      'خمس أو عشر رحلات على بوينغ 737 مع الكابتن نفسه، بدفعة واحدة وبإيقاعكم. حسن تقدير وثقة وطلاقة في قمرة القيادة لا تمنحها تجربة واحدة.',
    sessionLabel: 'رحلات مشمولة',
    totalFlightTimeLabel: 'إجمالي الوقت في قمرة القيادة',
    flexibilityLabel: 'كل رحلة في الوقت الذي يناسبكم · دفعة واحدة',
    standardValueLabel: 'قيمة الرحلات الفردية',
    savingsLabel: 'توفرون',
    curriculumLabel: 'مسار تعلّم بإشراف كابتن',
    trainingModulesLabel: 'موضوعات تدريب مركزة من الإضافات',
    trainingModulesDescription:
      'يمكن للكابتن دمج هذه الموضوعات بإشراف مدرب ضمن رحلة من المسار. أي وقت إضافي معروض بصورة منفصلة يبقى خاضعاً لسعة الحجز والشروط المؤكدة عند التسجيل.',
    requestEnrollment: 'ابدؤوا هذا المسار',
    redirectingToPayment: 'جارٍ التحويل للدفع...',
    educationalDisclosure:
      'تدريب مسارات الطيران هو تجربة محاكاة تعليمية وتطبيقية فقط. لا يمنح ساعات طيران مسجلة أو رخصة أو تأهيلاً على طراز أو رصيداً لاختبار أو ضمان عمل لدى شركة طيران.',
    consultDispatch: 'هل لديكم استفسار؟ تواصلوا مع العمليات',
  },
};

export const SUBSCRIPTION_PASSES: readonly SubscriptionPass[] = [
  {
    id: 'flight-foundations-5x60',
    packageId: 'pkg-captain-60',
    sessions: 5,
    sessionMinutes: 60,
    priceIls: 2750,
    validityMonths: 12,
    trainingAddonIds: ['addon-xwind-ifr', 'addon-cold-dark'],
    copy: {
      en: {
        title: 'Flight Foundations · 5 × 60 min',
        summary: 'A confident first progression from cockpit orientation to a stable, weather-aware landing.',
        curriculum: [
          'Captain’s flow: controls, instrument scan and stable approach',
          'FMS and flight-deck logic, explained step by step',
          'Live-weather awareness and IFR instrument-scan fundamentals',
          'Crosswind decisions and ILS coaching',
          'Final mission with a personalised captain debrief',
        ],
      },
      he: {
        title: 'יסודות הטיסה · 5 × 60 דקות',
        summary: 'מסלול ראשון שבונה ביטחון, מהיכרות עם תא הטייס ועד נחיתה יציבה ומודעת למזג האוויר.',
        curriculum: [
          'זרימת עבודה של קברניט: הגאים, סריקת מכשירים וגישה מיוצבת',
          'לוגיקת FMS ותא הטייס בהסבר שלב אחר שלב',
          'מודעות למזג אוויר חי ויסודות סריקת מכשירים IFR',
          'קבלת החלטות ברוח צד ואימון ILS',
          'משימת סיכום עם תחקיר אישי מהקברניט',
        ],
      },
      ru: {
        title: '«Основы полёта» · 5 × 60 мин',
        summary: 'Уверенный первый путь от знакомства с кабиной до стабильной посадки с учётом погоды.',
        curriculum: [
          'Поток работы капитана: органы управления, приборный скан и стабильный заход',
          'Логика FMS и кабины, объяснённая шаг за шагом',
          'Осведомлённость о реальной погоде и основы приборного сканирования IFR',
          'Решения при боковом ветре и обучение ILS',
          'Итоговая миссия с персональным разбором от капитана',
        ],
      },
      fr: {
        title: 'Fondations de vol · 5 × 60 min',
        summary: 'Une première progression sûre, de la découverte du poste de pilotage à un atterrissage stabilisé et conscient de la météo.',
        curriculum: [
          'Flux du commandant : commandes, balayage instruments et approche stabilisée',
          'Logique du FMS et du poste expliquée pas à pas',
          'Météo réelle et fondamentaux du balayage IFR',
          'Décisions au vent de travers et coaching ILS',
          'Mission finale avec débriefing personnalisé du commandant',
        ],
      },
      ar: {
        title: 'أساسيات الطيران · 5 × 60 دقيقة',
        summary: 'مسار أول واثق من التعرف على قمرة القيادة إلى هبوط مستقر مع فهم للطقس.',
        curriculum: [
          'تسلسل عمل الكابتن: أدوات التحكم ومسح العدادات والاقتراب المستقر',
          'شرح منطق FMS وقمرة القيادة خطوة بخطوة',
          'الوعي بالطقس المباشر وأساسيات مسح عدادات IFR',
          'قرارات الرياح الجانبية وتدريب ILS',
          'مهمة ختامية مع استخلاص شخصي من الكابتن',
        ],
      },
    },
  },
  {
    id: 'advanced-captain-5x90',
    packageId: 'pkg-ultimate-90',
    sessions: 5,
    sessionMinutes: 90,
    priceIls: 3390,
    validityMonths: 12,
    trainingAddonIds: ['addon-cold-dark', 'addon-xwind-ifr', 'addon-extreme-airports'],
    copy: {
      en: {
        title: 'Advanced Captain · 5 × 90 min',
        summary: 'Five deeper missions for pilots who want time to plan, fly, recover and debrief each scenario.',
        curriculum: [
          'Airliner set-up: route logic, performance and SOP rationale',
          'Instrument approaches, missed approach choices and threat awareness',
          'Weather, windshear and crosswind scenario management',
          'Abnormal-situation communication and calm decision-making',
          'A multi-leg command mission with captain feedback',
        ],
      },
      he: {
        title: 'קברניט מתקדם · 5 × 90 דקות',
        summary: 'חמש משימות עמוקות יותר למי שרוצה זמן לתכנן, להטיס, להתאושש ולתחקר כל תרחיש.',
        curriculum: [
          'הכנת מטוס נוסעים: לוגיקת נתיב, ביצועים והסיבה שמאחורי SOP',
          'גישות מכשירים, החלטות הליכה סביב ומודעות לאיומים',
          'ניהול תרחישי מזג אוויר, גזירת רוח ורוח צד',
          'תקשורת במצב חריג וקבלת החלטות רגועה',
          'משימת פיקוד מרובת מקטעים עם משוב קברניט',
        ],
      },
      ru: {
        title: '«Продвинутый капитан» · 5 × 90 мин',
        summary: 'Пять более глубоких миссий для тех, кому нужно время планировать, лететь, восстанавливаться и разбирать каждый сценарий.',
        curriculum: [
          'Подготовка лайнера: логика маршрута, характеристики и смысл SOP',
          'Приборные заходы, решения об уходе и осведомлённость об угрозах',
          'Управление сценариями погоды, сдвига ветра и бокового ветра',
          'Связь при нештатной ситуации и спокойное принятие решений',
          'Командная миссия из нескольких этапов с обратной связью капитана',
        ],
      },
      fr: {
        title: 'Commandant avancé · 5 × 90 min',
        summary: 'Cinq missions approfondies pour disposer du temps de préparer, voler, récupérer et débriefer chaque scénario.',
        curriculum: [
          'Préparation de l’avion : logique route, performances et raison des SOP',
          'Approches aux instruments, choix de remise de gaz et conscience des menaces',
          'Gestion des scénarios météo, cisaillement et vent de travers',
          'Communication en situation anormale et prise de décision sereine',
          'Mission de commandement multi-étapes avec retour du commandant',
        ],
      },
      ar: {
        title: 'الكابتن المتقدم · 5 × 90 دقيقة',
        summary: 'خمس مهام أعمق لمن يريد وقتاً للتخطيط والطيران والتعافي واستخلاص الدروس من كل سيناريو.',
        curriculum: [
          'إعداد طائرة النقل: منطق المسار والأداء وسبب إجراءات SOP',
          'الاقترابات بالأجهزة وخيارات الذهاب حول والوعي بالتهديدات',
          'إدارة سيناريوهات الطقس وقص الرياح والرياح الجانبية',
          'التواصل في الظروف غير العادية واتخاذ القرار بهدوء',
          'مهمة قيادة متعددة المراحل مع ملاحظات الكابتن',
        ],
      },
    },
  },
  {
    id: 'atpl-concepts-10x60',
    packageId: 'pkg-captain-60',
    sessions: 10,
    sessionMinutes: 60,
    priceIls: 4850,
    validityMonths: 12,
    trainingAddonIds: ['addon-xwind-ifr', 'addon-cold-dark'],
    copy: {
      en: {
        title: 'Flight Deck Mastery & Systems · 10 × 60 min',
        summary: 'Ten focused missions pairing hands-on cockpit command with clear airline-style explanations of aircraft systems, navigation, and crew procedures.',
        curriculum: [
          'Aircraft systems story: power, air, hydraulics and redundancy',
          'Flight planning: weather, fuel, alternates and operational margins',
          'FMC route building, departure and arrival briefings',
          'Instrument scan, energy management and approach gates',
          'CRM, TEM and practical cockpit decision-making',
        ],
      },
      he: {
        title: 'שליטה במערכות תא הטייס וניווט · 10 × 60 דקות',
        summary: 'עשר טיסות ממוקדות שמשלבות תרגול מעשי והסברים ברורים בסגנון חברות תעופה על מערכות המטוס, ניווט ונהלי צוות.',
        curriculum: [
          'סיפור מערכות המטוס: חשמל, אוויר, הידראוליקה ויתירות',
          'תכנון טיסה: מזג אוויר, דלק, חלופות ומרווחים תפעוליים',
          'בניית נתיב ב-FMC ותדריכי המראה ונחיתה',
          'סריקת מכשירים, ניהול אנרגיה ושערי גישה',
          'CRM, TEM וקבלת החלטות מעשית בתא הטייס',
        ],
      },
      ru: {
        title: '«Мастерство систем кабины и навигации» · 10 × 60 мин',
        summary: 'Десять сфокусированных полётов, сочетающих практику с понятными объяснениями в стиле авиалиний: устройство систем самолёта, навигация и процедуры экипажа.',
        curriculum: [
          'История систем самолёта: электропитание, воздух, гидравлика и резервирование',
          'Планирование полёта: погода, топливо, запасные аэродромы и эксплуатационные запасы',
          'Построение маршрута в FMC и брифинги вылета и прибытия',
          'Приборный скан, управление энергией и ворота захода',
          'CRM, TEM и практические решения в кабине',
        ],
      },
      fr: {
        title: 'Maîtrise des Systèmes & Navigation · 10 × 60 min',
        summary: 'Dix vols ciblés mêlant pratique et explications claires de style compagnie aérienne sur les systèmes avion, la navigation et les procédures d’équipage.',
        curriculum: [
          'Histoire des systèmes : électrique, air, hydraulique et redondance',
          'Préparation du vol : météo, carburant, dégagements et marges opérationnelles',
          'Construction de route FMC et briefings départ-arrivée',
          'Balayage instruments, gestion de l’énergie et portes d’approche',
          'CRM, TEM et décisions pratiques en cabine',
        ],
      },
      ar: {
        title: 'إتقان أنظمة قمرة القيادة والملاحة · 10 × 60 دقيقة',
        summary: 'عشر رحلات مركزة تجمع بين التدريب العملي وشروحات واضحة بأسلوب شركات الطيران حول أنظمة الطائرة والملاحة وإجراءات الطاقم.',
        curriculum: [
          'قصة أنظمة الطائرة: الكهرباء والهواء والهيدروليك والازدواجية',
          'تخطيط الرحلة: الطقس والوقود والمطارات البديلة والهوامش التشغيلية',
          'بناء المسار في FMC وإحاطات المغادرة والوصول',
          'مسح العدادات وإدارة الطاقة وبوابات الاقتراب',
          'CRM وTEM واتخاذ القرارات العملية في قمرة القيادة',
        ],
      },
    },
  },
  {
    id: 'airline-readiness-10x90',
    packageId: 'pkg-ultimate-90',
    sessions: 10,
    sessionMinutes: 90,
    priceIls: 5950,
    validityMonths: 12,
    trainingAddonIds: ['addon-cold-dark', 'addon-xwind-ifr', 'addon-extreme-airports'],
    copy: {
      en: {
        title: 'Airline Readiness · 10 × 90 min',
        summary: 'Our most complete educational progression: ten 90-minute missions for deliberate practice, scenario repetition and captain-level explanations.',
        curriculum: [
          'SOP discipline: flows, callouts, cross-checks and workload priorities',
          'Raw-data flying concepts, pitch-and-thrust reasoning and recovery margins',
          'IFR, weather radar and approach strategy under changing conditions',
          'Abnormal scenarios, QRH thinking and two-pilot communication concepts',
          'A tailored final line-oriented mission and development debrief',
        ],
      },
      he: {
        title: 'מוכנות לחברת תעופה · 10 × 90 דקות',
        summary: 'המסלול הלימודי המקיף ביותר: עשר משימות של 90 דקות לתרגול מכוון, חזרתיות בתרחישים והסברים ברמת קברניט.',
        curriculum: [
          'משמעת SOP: זרימות, קריאות, הצלבות וסדרי עדיפויות בעומס',
          'מושגי טיסה ללא נתוני טיסה, היגיון Pitch-and-Thrust ומרווחי התאוששות',
          'IFR, מכ״ם מזג אוויר ואסטרטגיית גישה בתנאים משתנים',
          'תרחישים חריגים, חשיבת QRH ומושגי תקשורת של שני טייסים',
          'משימת קו מותאמת ותחקיר התפתחות מסכם',
        ],
      },
      ru: {
        title: '«Готовность к авиакомпании» · 10 × 90 мин',
        summary: 'Самая полная учебная программа: десять 90-минутных миссий для осознанной практики, повторения сценариев и объяснений уровня капитана.',
        curriculum: [
          'Дисциплина SOP: потоки, доклады, взаимные проверки и приоритеты нагрузки',
          'Концепции полёта без директоров, логика pitch-and-thrust и запасы восстановления',
          'IFR, метеорадар и стратегия захода в меняющихся условиях',
          'Нештатные сценарии, мышление QRH и концепции общения двух пилотов',
          'Итоговая линейная миссия и развивающий разбор',
        ],
      },
      fr: {
        title: 'Préparation compagnie · 10 × 90 min',
        summary: 'Notre progression pédagogique la plus complète : dix missions de 90 minutes pour une pratique délibérée, la répétition des scénarios et des explications de niveau commandant.',
        curriculum: [
          'Discipline SOP : flows, callouts, vérifications croisées et priorités de charge',
          'Concepts de pilotage raw data, raisonnement pitch-and-thrust et marges de récupération',
          'IFR, radar météo et stratégie d’approche dans des conditions changeantes',
          'Scénarios anormaux, raisonnement QRH et concepts de communication à deux pilotes',
          'Mission finale orientée ligne sur mesure et débriefing de progression',
        ],
      },
      ar: {
        title: 'الجاهزية لشركات الطيران · 10 × 90 دقيقة',
        summary: 'أكمل تقدم تعليمي لدينا: عشر مهام مدة كل منها 90 دقيقة للتدريب المتعمد وتكرار السيناريوهات وشروحات بمستوى الكابتن.',
        curriculum: [
          'انضباط SOP: التسلسلات والنداءات والتحققات المتبادلة وأولويات عبء العمل',
          'مفاهيم الطيران بالبيانات الخام ومنطق pitch-and-thrust وهوامش الاستعادة',
          'IFR ورادار الطقس واستراتيجية الاقتراب في الظروف المتغيرة',
          'سيناريوهات غير عادية وتفكير QRH ومفاهيم تواصل طاقم من طيارين',
          'مهمة خطية نهائية مصممة خصيصاً واستخلاص لتطوير الأداء',
        ],
      },
    },
  },
];

export function findSubscriptionPass(id: string | null | undefined): SubscriptionPass | undefined {
  return SUBSCRIPTION_PASSES.find((pass) => pass.id === id);
}

export function getSubscriptionPassFinancials(pass: SubscriptionPass): {
  standardValueIls: number;
  savingsIls: number;
  savingsPercent: number;
} {
  const packagePrice = SIMULATOR_PACKAGES.find((entry) => entry.id === pass.packageId)?.priceIls;
  if (!packagePrice) throw new Error(`Subscription pass ${pass.id} references an unknown package ${pass.packageId}.`);
  const standardValueIls = packagePrice * pass.sessions;
  const savingsIls = standardValueIls - pass.priceIls;
  return {
    standardValueIls,
    savingsIls,
    savingsPercent: Math.round((savingsIls / standardValueIls) * 100),
  };
}

export function getSubscriptionPassTrainingAddons(pass: SubscriptionPass) {
  return pass.trainingAddonIds.map((id) => {
    const addon = FLIGHT_ADDONS.find((entry) => entry.id === id);
    if (!addon) throw new Error(`Subscription pass ${pass.id} references an unknown add-on ${id}.`);
    return addon;
  });
}
