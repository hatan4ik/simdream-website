import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import type { Language, LocalizedRecord } from '@/lib/i18n/translations';

/**
 * Single-payment flight tracks (sold to customers as "flight tracks", held in Wix as
 * Pricing Plans). These are deliberately separate from a one-off booking package: a
 * track describes commercial terms and a structured learning journey, while the booking engine remains the authority for an individual
 * departure and its reserved capacity.
 *
 * Two audiences, two routes (product decision 2026-11-11):
 * - `consumer` tracks are sold on `/subscriptions` (and the `/experiences` Flight Tracks tab)
 *   to non-professional customers. Their copy never speaks of airline interviews, assessments
 *   or screening and never uses the professional acronyms (SOP, QRH, V1, raw data, ATPL);
 *   "airline captain" stays, because the mentor is the brand's second pillar.
 * - `pro` tracks are the multi-session Airline Interview Prep offers, sold only on `/pro`,
 *   built on the PRO single-session packages, with no add-on themes (noise-free, AGENTS.md §3).
 * `tests/unit/subscription-passes.test.ts` enforces the split.
 *
 * Wix Pricing Plans is the eventual authority for a purchased subscription and its
 * entitlement. Until that backend is enabled, this registry is the approved
 * public offer catalogue and the customer is handed to Dispatch to enrol.
 */
export type SubscriptionPassId =
  | 'flight-foundations-5x60'
  | 'advanced-captain-5x90'
  | 'atpl-concepts-10x60'
  | 'airline-readiness-10x90'
  | 'pro-interview-3x90'
  | 'pro-interview-5x60';

export type SubscriptionPassAudience = 'consumer' | 'pro';

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
  /** Which route sells the track; see the module comment. */
  audience: SubscriptionPassAudience;
  /** The regular simulator package the subscription may be redeemed against. */
  packageId: string;
  sessions: 3 | 5 | 10;
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
   * Empty for `pro` tracks: professional sessions carry zero add-on noise.
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
  de: {
    badge: 'FLUG-TRACKS UNTER KAPITÄNSLEITUNG',
    title: 'Wählen Sie Ihren Flug-Track',
    subtitle:
      'Fünf oder zehn Boeing-737-Flüge mit demselben Flugkapitän, einmal bezahlt und in Ihrem Tempo geflogen. Urteilsvermögen, Sicherheit und Cockpit-Routine, die ein einzelner Flug nicht vermitteln kann.',
    sessionLabel: 'enthaltene Flüge',
    totalFlightTimeLabel: 'gesamte Cockpitzeit',
    flexibilityLabel: 'jeden Flug buchen, wann es Ihnen passt · Einmalzahlung',
    standardValueLabel: 'Einzelflug-Wert',
    savingsLabel: 'Sie sparen',
    curriculumLabel: 'Lernabfolge unter Kapitänsleitung',
    trainingModulesLabel: 'Fokussierte Zusatz-Trainingsthemen',
    trainingModulesDescription:
      'Ihr Kapitän kann diese instruktorgeführten Themen in einen Track-Flug einbinden. Jede separat aufgeführte Zusatzzeit unterliegt der Buchungskapazität und den bei der Anmeldung bestätigten Bedingungen.',
    requestEnrollment: 'Diesen Track starten',
    redirectingToPayment: 'Weiterleitung zur Zahlung...',
    educationalDisclosure:
      'Das Flight-Track-Coaching ist ausschließlich ein pädagogisches Simulatorerlebnis. Es gewährt keine anrechenbaren Flugstunden, keine Pilotenlizenz, kein Type Rating, keine Prüfungsanrechnung und keine Beschäftigungsgarantie bei einer Fluggesellschaft.',
    consultDispatch: 'Fragen? Einsatzleitung kontaktieren',
  },
};

export const SUBSCRIPTION_PASSES: readonly SubscriptionPass[] = [
  {
    id: 'flight-foundations-5x60',
    audience: 'consumer',
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
      de: {
        title: 'Flug-Grundlagen · 5 × 60 Min.',
        summary: 'Ein souveräner Einstieg von der Cockpit-Orientierung bis zur stabilen, wetterbewussten Landung.',
        curriculum: [
          'Kapitäns-Ablauf: Steuerung, Instrumenten-Scan und stabiler Anflug',
          'FMS und Cockpit-Logik Schritt für Schritt erklärt',
          'Live-Wetter-Bewusstsein und Grundlagen des IFR-Instrumenten-Scans',
          'Seitenwind-Entscheidungen und ILS-Coaching',
          'Abschlussmission mit persönlichem Kapitäns-Debriefing',
        ],
      },
    },
  },
  {
    id: 'advanced-captain-5x90',
    audience: 'consumer',
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
          'Setting up the 737 the way the crew does: route, fuel and performance',
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
          'הכנת ה-737 כמו הצוות: נתיב, דלק וביצועים',
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
          'Подготовка 737 как у экипажа: маршрут, топливо и характеристики',
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
          'Préparer le 737 comme l’équipage : route, carburant et performances',
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
          'إعداد الـ737 كما يفعل الطاقم: المسار والوقود والأداء',
          'الاقترابات بالأجهزة وخيارات الذهاب حول والوعي بالتهديدات',
          'إدارة سيناريوهات الطقس وقص الرياح والرياح الجانبية',
          'التواصل في الظروف غير العادية واتخاذ القرار بهدوء',
          'مهمة قيادة متعددة المراحل مع ملاحظات الكابتن',
        ],
      },
      de: {
        title: 'Fortgeschrittener Kapitän · 5 × 90 Min.',
        summary: 'Fünf intensive Sitzungen für ruhige Entscheidungsfindung, Seitenwind und unerwartete Situationen.',
        curriculum: [
          'Präzises manuelles Fliegen mit Leistungs- und Lagewerten ohne Automatik',
          'Seitenwindlandungen, eingeschränkte Sicht und anspruchsvolle Flughäfen',
          'Systemstörungen, Checklisten-Führung und ruhige Aufgabenverteilung',
          'Ruhige Kommunikation im Cockpit unter hoher Arbeitsbelastung',
          'Mehrstufige Kapitänsmission mit detailliertem Kapitäns-Feedback',
        ],
      },
    },
  },
  {
    id: 'atpl-concepts-10x60',
    audience: 'consumer',
    packageId: 'pkg-captain-60',
    sessions: 10,
    sessionMinutes: 60,
    priceIls: 4850,
    validityMonths: 12,
    trainingAddonIds: ['addon-xwind-ifr', 'addon-cold-dark'],
    copy: {
      en: {
        title: 'Flight Deck Mastery & Systems · 10 × 60 min',
        summary: 'Ten focused missions pairing hands-on cockpit command with the way a captain explains the systems, the navigation and crew teamwork.',
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
        summary: 'עשר טיסות ממוקדות שמשלבות פיקוד מעשי בתא הטייס עם ההסבר של קברניט על המערכות, הניווט ועבודת הצוות.',
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
        summary: 'Десять сфокусированных полётов: практическое управление в кабине и объяснения капитана о системах, навигации и работе экипажа.',
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
        summary: 'Dix vols ciblés mêlant commandement pratique au poste et explications d’un commandant sur les systèmes, la navigation et le travail d’équipage.',
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
        summary: 'عشر رحلات مركزة تجمع بين القيادة العملية في قمرة القيادة وشرح الكابتن للأنظمة والملاحة وعمل الطاقم.',
        curriculum: [
          'قصة أنظمة الطائرة: الكهرباء والهواء والهيدروليك والازدواجية',
          'تخطيط الرحلة: الطقس والوقود والمطارات البديلة والهوامش التشغيلية',
          'بناء المسار في FMC وإحاطات المغادرة والوصول',
          'مسح العدادات وإدارة الطاقة وبوابات الاقتراب',
          'CRM وTEM واتخاذ القرارات العملية في قمرة القيادة',
        ],
      },
      de: {
        title: 'Cockpit-Beherrschung & Systeme · 10 × 60 Min.',
        summary: 'Zehn fokussierte Flüge, die praktisches Steuern mit Kapitäns-Briefings zu Systemen, Navigation und Teamwork verbinden.',
        curriculum: [
          'Die Geschichte der Flugzeugsysteme: Elektrik, Pneumatik, Hydraulik und Redundanz',
          'Flugplanung: Wetter, Treibstoff, Ausweichflughäfen und Sicherheitsreserven',
          'FMC-Routenprogrammierung sowie Abflug- und Anflug-Briefings',
          'Instrumenten-Scan, Energiemanagement und stabile Anflugtore',
          'Zusammenarbeit im Cockpit, Gefahrenerkennung und praxisnahe Entscheidungen',
        ],
      },
    },
  },
  {
    id: 'airline-readiness-10x90',
    audience: 'consumer',
    packageId: 'pkg-ultimate-90',
    sessions: 10,
    sessionMinutes: 90,
    priceIls: 5950,
    validityMonths: 12,
    trainingAddonIds: ['addon-cold-dark', 'addon-xwind-ifr', 'addon-extreme-airports'],
    copy: {
      en: {
        title: 'Captains’ Course · 10 × 90 min',
        summary:
          'Our most complete progression: ten 90-minute missions that take you from the right seat to planning, flying and debriefing a full mission yourself, with a captain beside you every time.',
        curriculum: [
          'Captain’s flows: who does what, and when, in a two-person cockpit',
          'Flying by hand on instruments: pitch, power and recovering from a bad approach',
          'Weather days: crosswind, low visibility and the go-around decision',
          'When something breaks: engine failure and the checklist, calmly',
          'Graduation mission: your own route, your own landing, captain’s debrief',
        ],
      },
      he: {
        title: 'קורס הקברניטים · 10 × 90 דקות',
        summary:
          'המסלול המקיף ביותר שלנו: עשר משימות של 90 דקות שמובילות אתכם מהמושב הימני לתכנון, הטסה ותחקיר של משימה מלאה בעצמכם, עם קברניט לצידכם בכל טיסה.',
        curriculum: [
          'זרימות הקברניט: מי עושה מה, ומתי, בתא טייס של שני אנשים',
          'הטסה ידנית לפי מכשירים: זווית, כוח והתאוששות מגישה לא טובה',
          'ימי מזג אוויר: רוח צד, ראות נמוכה והחלטת ההליכה סביב',
          'כשמשהו מתקלקל: כשל מנוע ורשימת הבדיקה, ברוגע',
          'משימת הסיום: הנתיב שלכם, הנחיתה שלכם, תחקיר הקברניט',
        ],
      },
      ru: {
        title: '«Курс капитанов» · 10 × 90 мин',
        summary:
          'Самая полная программа: десять 90-минутных миссий, которые ведут вас от правого кресла к самостоятельному планированию, выполнению и разбору полной миссии — с капитаном рядом в каждом полёте.',
        curriculum: [
          'Потоки капитана: кто что делает и когда в кабине на двоих',
          'Ручной полёт по приборам: тангаж, тяга и выход из неудачного захода',
          'Погодные дни: боковой ветер, низкая видимость и решение об уходе на второй круг',
          'Когда что-то ломается: отказ двигателя и чеклист — спокойно',
          'Выпускная миссия: ваш маршрут, ваша посадка, разбор капитана',
        ],
      },
      fr: {
        title: 'Cours des commandants · 10 × 90 min',
        summary:
          'Notre progression la plus complète : dix missions de 90 minutes qui vous mènent du siège droit à la préparation, au vol et au débriefing d’une mission complète par vous-même, avec un commandant à vos côtés à chaque vol.',
        curriculum: [
          'Flux du commandant : qui fait quoi, et quand, dans un cockpit à deux',
          'Pilotage manuel aux instruments : assiette, puissance et rattrapage d’une approche ratée',
          'Jours de météo : vent de travers, faible visibilité et décision de remise de gaz',
          'Quand quelque chose casse : panne moteur et check-list, calmement',
          'Mission de fin de cours : votre route, votre atterrissage, débriefing du commandant',
        ],
      },
      ar: {
        title: 'دورة الكباتن · 10 × 90 دقيقة',
        summary:
          'أكمل مسار لدينا: عشر مهام مدة كل منها 90 دقيقة تنقلكم من المقعد الأيمن إلى تخطيط مهمة كاملة وتنفيذها واستخلاص دروسها بأنفسكم، مع كابتن بجانبكم في كل رحلة.',
        curriculum: [
          'تسلسلات الكابتن: من يفعل ماذا ومتى في قمرة قيادة لشخصين',
          'الطيران اليدوي بالأجهزة: الزاوية والقوة والتعافي من اقتراب غير جيد',
          'أيام الطقس: الرياح الجانبية والرؤية المنخفضة وقرار الذهاب حول',
          'عندما يتعطل شيء: فشل المحرك وقائمة الفحص بهدوء',
          'مهمة التخرج: مساركم وهبوطكم واستخلاص الكابتن',
        ],
      },
      de: {
        title: 'Der Kapitänskurs · 10 × 90 Min.',
        summary: 'Zehn vollwertige Sitzungen vom Cold-&-Dark-Start bis zum souveränen Führen einer Boeing 737.',
        curriculum: [
          'Cold & Dark: Die gesamte Boeing 737 Schritt für Schritt zum Leben erwecken',
          'Vom Start bis zur Landung unter persönlicher Anleitung Ihres Kapitäns',
          'Anspruchsvolle Anflüge: Seitenwind, Nebel und weltberühmte Flughäfen',
          'Wenn etwas passiert: Triebwerksausfall und Checklisten-Ruhe bewahren',
          'Abschlussmission: Ihre Route, Ihre Landung und Ihr Kapitäns-Debriefing',
        ],
      },
    },
  },
  {
    id: 'pro-interview-3x90',
    audience: 'pro',
    packageId: 'pkg-pro-90',
    sessions: 3,
    sessionMinutes: 90,
    priceIls: 2565,
    validityMonths: 12,
    trainingAddonIds: [],
    copy: {
      en: {
        title: 'Airline Interview Prep · 3 × 90 PRO',
        summary:
          'Three full assessment rehearsals before your screening: the complete 90-minute profile flown three times, a captain’s grading sheet after each one and a targeted plan for the next.',
        curriculum: [
          'Rehearsal 1: the full screening profile under exam conditions, FMS set-up to single-engine ILS',
          'Scored debrief against airline tolerances with a written list of priorities',
          'Rehearsal 2: raw-data airwork, V1 cut and go-around rebuilt around your weak points',
          'Rehearsal 3: the complete checkride once more, timed, with PM callouts and QRH discipline',
          'Final grading sheet and interview-day briefing from an active airline captain',
        ],
      },
      he: {
        title: 'הכנה למיוני חברות תעופה · 3 × 90 PRO',
        summary:
          'שלושה אימוני מבדק מלאים לפני המיון: פרופיל ה-90 דקות השלם מוטס שלוש פעמים, עם גיליון ציונים של קברניט אחרי כל אימון ותוכנית ממוקדת לאימון הבא.',
        curriculum: [
          'אימון 1: פרופיל המיון המלא בתנאי מבחן, מהזנת FMS ועד ILS במנוע אחד',
          'תחקיר מדורג מול טולרנסים של חברות תעופה עם רשימת עדיפויות כתובה',
          'אימון 2: Raw Data, תקלת מנוע ב-V1 והליכה סביב, בנויים מחדש סביב נקודות התורפה שלכם',
          'אימון 3: המבדק השלם פעם נוספת, בזמן אמת, עם קריאות PM ומשמעת QRH',
          'גיליון ציונים סופי ותדריך ליום המיון מקברניט פעיל בחברת תעופה',
        ],
      },
      ru: {
        title: 'Подготовка к отбору в авиакомпанию · 3 × 90 PRO',
        summary:
          'Три полные репетиции оценочной сессии перед скринингом: полный 90-минутный профиль выполняется трижды, после каждой — оценочный лист капитана и целевой план на следующую.',
        curriculum: [
          'Репетиция 1: полный профиль скрининга в экзаменационных условиях, от настройки FMS до ILS на одном двигателе',
          'Оценочный разбор по допускам авиакомпаний с письменным списком приоритетов',
          'Репетиция 2: пилотирование по сырым данным, отказ на V1 и уход на второй круг — вокруг ваших слабых мест',
          'Репетиция 3: полный чекрайд ещё раз, по времени, с докладами PM и дисциплиной QRH',
          'Итоговый оценочный лист и брифинг на день отбора от действующего капитана авиакомпании',
        ],
      },
      fr: {
        title: 'Préparation sélection compagnie · 3 × 90 PRO',
        summary:
          'Trois répétitions complètes de l’évaluation avant votre sélection : le profil complet de 90 minutes volé trois fois, une fiche de notation du commandant après chacune et un plan ciblé pour la suivante.',
        curriculum: [
          'Répétition 1 : le profil de sélection complet en conditions d’examen, de la préparation du FMS à l’ILS monomoteur',
          'Débriefing noté selon les tolérances compagnie avec une liste écrite de priorités',
          'Répétition 2 : pilotage raw data, panne à V1 et remise de gaz reconstruits autour de vos points faibles',
          'Répétition 3 : le checkride complet une nouvelle fois, chronométré, avec annonces PM et discipline QRH',
          'Fiche de notation finale et briefing du jour de sélection par un commandant de compagnie en activité',
        ],
      },
      ar: {
        title: 'الإعداد لمقابلات شركات الطيران · 3 × 90 PRO',
        summary:
          'ثلاث تجارب تقييم كاملة قبل اختبار القبول: الملف الكامل لمدة 90 دقيقة يُطار ثلاث مرات، مع ورقة تقييم من الكابتن بعد كل تجربة وخطة موجهة للتجربة التالية.',
        curriculum: [
          'التجربة 1: ملف الاختبار الكامل في ظروف الامتحان، من إعداد FMS إلى ILS بمحرك واحد',
          'استخلاص مُقيَّم وفق حدود شركات الطيران مع قائمة أولويات مكتوبة',
          'التجربة 2: الطيران بالبيانات الخام وفشل المحرك عند V1 والذهاب حول، مبنية حول نقاط ضعفكم',
          'التجربة 3: الاختبار الكامل مرة أخرى بتوقيت فعلي، مع نداءات PM وانضباط QRH',
          'ورقة تقييم نهائية وإحاطة ليوم المقابلة من كابتن عامل في شركة طيران',
        ],
      },
      de: {
        title: 'Airline-Interview-Vorbereitung PRO · 3 × 90 Min.',
        summary: 'Drei volle 90-Minuten-Simulator-Checks für Piloten im Auswahlverfahren bei El Al, Arkia, Israir, Wizz Air oder Ryanair.',
        curriculum: [
          'Raw-Data-ILS, Holdings und Steilkurven ohne Flight Director',
          'V1-Triebwerksausfall, QRH-Management und strukturierte Entscheidungsfindung',
          'Standard-Callouts, Pilot-Monitoring-Koordination und Kapitäns-Briefings',
          'Realistisches Echtzeit-Auswahlprofil inklusive Abschätzungen unter Zeitdruck',
          'Abschließender Bewertungsbogen und Briefing für den Interviewtag mit aktivem Linienkapitän',
        ],
      },
    },
  },
  {
    id: 'pro-interview-5x60',
    audience: 'pro',
    packageId: 'pkg-pro-60',
    sessions: 5,
    sessionMinutes: 60,
    priceIls: 4165,
    validityMonths: 12,
    trainingAddonIds: [],
    copy: {
      en: {
        title: 'Airline Interview Prep · 5 × 60 PRO',
        summary:
          'Five focused 60-minute blocks that take one skill each to airline standard: raw data, steep turns and stalls, instrument procedures, single-engine work and the full profile.',
        curriculum: [
          'Raw-data manual flight (FD OFF, A/T OFF): pitch and power tables, trim and scan',
          'Steep turns, stalls and unusual attitudes flown to assessment tolerances',
          'Precision and non-precision approaches: ILS, LOC/DME and RNAV with holding entries',
          'Single-engine work: V1 cut, engine-out ILS, go-around and the QRH flow',
          'Full timed profile with PM coordination and a captain’s grading sheet',
        ],
      },
      he: {
        title: 'הכנה למיוני חברות תעופה · 5 × 60 PRO',
        summary:
          'חמישה בלוקים ממוקדים של 60 דקות, כל אחד מביא מיומנות אחת לסטנדרט של חברת תעופה: Raw Data, סיבובים חדים והזדקרות, נהלי מכשירים, עבודה במנוע אחד והפרופיל המלא.',
        curriculum: [
          'טיסה ידנית Raw Data (FD OFF, A/T OFF): טבלאות Pitch & Power, קיזוז וסריקה',
          'סיבובים חדים, הזדקרות ומצבים חריגים לפי טולרנסים של מבדק',
          'גישות מדויקות ולא מדויקות: ILS, LOC/DME ו-RNAV עם כניסות להמתנה',
          'עבודה במנוע אחד: תקלה ב-V1, ILS במנוע אחד, הליכה סביב וזרימת QRH',
          'פרופיל מלא בזמן אמת עם תיאום PM וגיליון ציונים של קברניט',
        ],
      },
      ru: {
        title: 'Подготовка к отбору в авиакомпанию · 5 × 60 PRO',
        summary:
          'Пять сфокусированных 60-минутных блоков, каждый доводит один навык до стандарта авиакомпании: сырые данные, крутые виражи и сваливание, приборные процедуры, работа на одном двигателе и полный профиль.',
        curriculum: [
          'Ручной полёт по сырым данным (FD OFF, A/T OFF): таблицы тангажа и тяги, триммирование и скан',
          'Крутые виражи, сваливание и сложные пространственные положения в допусках оценки',
          'Точные и неточные заходы: ILS, LOC/DME и RNAV с входом в зону ожидания',
          'Работа на одном двигателе: отказ на V1, ILS с отказавшим двигателем, уход на второй круг и поток QRH',
          'Полный профиль по времени с координацией PM и оценочным листом капитана',
        ],
      },
      fr: {
        title: 'Préparation sélection compagnie · 5 × 60 PRO',
        summary:
          'Cinq blocs ciblés de 60 minutes qui amènent chacun une compétence au standard compagnie : raw data, virages serrés et décrochages, procédures aux instruments, travail monomoteur et profil complet.',
        curriculum: [
          'Pilotage manuel raw data (FD OFF, A/T OFF) : tables assiette-puissance, compensation et balayage',
          'Virages serrés, décrochages et positions inusuelles volés aux tolérances d’évaluation',
          'Approches de précision et de non-précision : ILS, LOC/DME et RNAV avec entrées en attente',
          'Travail monomoteur : panne à V1, ILS monomoteur, remise de gaz et flux QRH',
          'Profil complet chronométré avec coordination PM et fiche de notation du commandant',
        ],
      },
      ar: {
        title: 'الإعداد لمقابلات شركات الطيران · 5 × 60 PRO',
        summary:
          'خمس جلسات مركزة مدة كل منها 60 دقيقة، كل واحدة ترفع مهارة واحدة إلى مستوى شركات الطيران: البيانات الخام، والانعطافات الحادة والانهيار، وإجراءات الأجهزة، والعمل بمحرك واحد، والملف الكامل.',
        curriculum: [
          'الطيران اليدوي بالبيانات الخام (FD OFF, A/T OFF): جداول الزاوية والقوة والموازنة والمسح',
          'الانعطافات الحادة والانهيار والأوضاع غير المعتادة ضمن حدود التقييم',
          'الاقترابات الدقيقة وغير الدقيقة: ILS وLOC/DME وRNAV مع الدخول إلى الانتظار',
          'العمل بمحرك واحد: الفشل عند V1 وILS بمحرك واحد والذهاب حول وتسلسل QRH',
          'ملف كامل بتوقيت فعلي مع تنسيق PM وورقة تقييم من الكابتن',
        ],
      },
      de: {
        title: 'Airline-Interview-Vorbereitung PRO · 5 × 60 Min.',
        summary: 'Fünf fokussierte 60-Minuten-Sitzungen vom Raw-Data-Scan bis zu komplexen QRH-Fällen für Piloten in der Airline-Vorbereitung.',
        curriculum: [
          'Sitzung 1: Raw-Data-Scan und präzise manuelle Flugsteuerung',
          'Sitzung 2: Steilkurven, Geschwindigkeitskontrolle und Stabilisierung',
          'Sitzung 3: Holdings, Go-Arounds und Non-Precision-Anflüge',
          'Sitzung 4: V1-Triebwerksausfall, QRH-Verfahren und Ausweichentscheidungen',
          'Sitzung 5: Vollständiges Echtzeit-Checkprofil mit PM-Koordination und Kapitäns-Bewertungsbogen',
        ],
      },
    },
  },
];

/** Tracks sold on `/subscriptions` and the `/experiences` Flight Tracks tab. */
export const CONSUMER_SUBSCRIPTION_PASSES: readonly SubscriptionPass[] = SUBSCRIPTION_PASSES.filter(
  (pass) => pass.audience === 'consumer'
);

/** Multi-session Airline Interview Prep tracks, sold only on `/pro`. */
export const PRO_SUBSCRIPTION_PASSES: readonly SubscriptionPass[] = SUBSCRIPTION_PASSES.filter(
  (pass) => pass.audience === 'pro'
);

export function findSubscriptionPass(id: string | null | undefined): SubscriptionPass | undefined {
  return SUBSCRIPTION_PASSES.find((pass) => pass.id === id);
}

/** Where a purchase returns to after the Wix-hosted checkout: the route that sells the track. */
export function subscriptionPassReturnPath(pass: Pick<SubscriptionPass, 'id' | 'audience'>): string {
  return pass.audience === 'pro' ? `/pro#pro-tracks` : `/subscriptions#${pass.id}`;
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
