import type { LocalizedRecord } from '@/lib/i18n/translations';

export interface BookingBlueprintCopy {
  whatIncludedBtn: string;
  badge: string;
  missionArch: string;
  duration: (minutes: number) => string;
  handsOnPic: string;
  handsOnDesc: (minutes: number) => string;
  takeoffTitle: string;
  takeoffDesc: string;
  worldTitle: string;
  world60: string;
  world90: string;
  worldPro: string;
  worldBasic: string;
  observersTitle: string;
  observersDesc: string;
  guidanceTitle: string;
  guidanceDesc: string;
  highlightsTitle: string;
  closeBtn: string;
  closeDialogLabel: string;
  selectBtn: (price: string) => string;
}

/** Shared, localized package-inclusions copy for both booking experiences. */
export const BOOKING_BLUEPRINT_COPY: LocalizedRecord<BookingBlueprintCopy> = {
  en: {
    whatIncludedBtn: "See what's included",
    badge: 'OFFICIAL FLIGHT BLUEPRINT • SESSION INCLUSIONS',
    missionArch: 'Your cockpit mission, step by step',
    duration: (minutes) => `${minutes}-minute flight session`,
    handsOnPic: 'Hands-on pilot-in-command:',
    handsOnDesc: (minutes) => `${minutes} minutes in the Captain or First Officer seat with active controls feedback in an authentic flight-deck environment.`,
    takeoffTitle: 'Takeoff and landing foundation:',
    takeoffDesc: 'Guided takeoff roll, climb-out navigation, visual pattern circuit, and manual touchdown.',
    worldTitle: 'World routes and scenarios:',
    world60: 'Includes a Takeoff & Landing exercise and one World Trio theme of your choice: three iconic airports, Mediterranean islands, or the Innsbruck Alps.',
    world90: 'Includes a Takeoff & Landing exercise, up to two World Trio themes (4–6 international landings), and a Cold & Dark start or V1 engine-out scenario. Two pilots can take turns.',
    worldPro: 'Raw-data manual flying (FD OFF), steep 45° turns, V1-cut engine failure, single-engine ILS, and QRH checklist drills.',
    worldBasic: 'A focused takeoff-and-landing session at one international airport, such as Ben Gurion (LLBG).',
    observersTitle: 'Cockpit observers:',
    observersDesc: 'Up to 2 observers can join you in the cockpit jumpseats at no extra charge. Photos and video are welcome.',
    guidanceTitle: 'Airline-pilot guidance:',
    guidanceDesc: 'A 1-on-1 pre-flight briefing and active cockpit coaching from a commercial pilot.',
    highlightsTitle: 'Package highlights',
    closeBtn: 'Close details',
    closeDialogLabel: 'Close package inclusions',
    selectBtn: (price) => `Choose this package (${price})`,
  },
  he: {
    whatIncludedBtn: 'לכלול בחבילה ולתוכנית המשימה',
    badge: 'תוכנית טיסה רשמית • מה כלול בסשן',
    missionArch: 'כך נראית משימת הטיסה שלכם, שלב אחר שלב',
    duration: (minutes) => `סשן טיסה של ${minutes} דקות`,
    handsOnPic: 'הטסה מעשית כטייס מפקד:',
    handsOnDesc: (minutes) => `${minutes} דקות מלאות בכיסא הקברניט או הקצין הראשון, עם משוב אמיתי מההגאים וסביבת תא טייס אותנטית.`,
    takeoffTitle: 'בסיס להמראה ולנחיתה:',
    takeoffDesc: 'ריצת המראה מודרכת, ניווט בטיפוס, הקפה חזותית ונחיתה ידנית.',
    worldTitle: 'מסלולים ותרחישים בעולם:',
    world60: 'כולל תרגול המראה ונחיתה ושלישיית שדות תעופה עולמית אחת לבחירתכם: שלושה שדות איקוניים, איי הים התיכון או האלפים באינסברוק.',
    world90: 'כולל תרגול המראה ונחיתה, עד שתי שלישיות עולמיות (4–6 נחיתות בינלאומיות) ובחירה בין התנעת Cold & Dark לתרחיש כשל מנוע V1. שני טייסים יכולים לחלוק את ההגאים.',
    worldPro: 'הטסה ידנית ללא Flight Director (Raw Data), פניות 45°, תרגול כשל מנוע V1 Cut, גישת ILS במנוע בודד ונוהלי QRH.',
    worldBasic: 'סשן ממוקד של המראה ונחיתה בשדה תעופה בינלאומי אחד, כגון נתב״ג (LLBG).',
    observersTitle: 'מלווים בקוקפיט:',
    observersDesc: 'עד שני מלווים יכולים להצטרף בכיסאות הצופה בקוקפיט ללא עלות. צילום ותיעוד וידאו מוזמנים.',
    guidanceTitle: 'ליווי של טייס מסחרי:',
    guidanceDesc: 'תדריך אישי לפני הטיסה והדרכה פעילה בקוקפיט, אחד על אחד, מטייס מסחרי.',
    highlightsTitle: 'מה כלול בחבילה',
    closeBtn: 'סגירת הפרטים',
    closeDialogLabel: 'סגירת פירוט החבילה',
    selectBtn: (price) => `בחירת חבילה זו (${price})`,
  },
  ru: {
    whatIncludedBtn: 'Посмотреть, что включено',
    badge: 'ОФИЦИАЛЬНЫЙ ПЛАН ПОЛЁТА • ЧТО ВКЛЮЧЕНО В СЕССИЮ',
    missionArch: 'Ваша миссия в кабине — шаг за шагом',
    duration: (minutes) => `Полётная сессия ${minutes} минут`,
    handsOnPic: 'За штурвалом как командир:',
    handsOnDesc: (minutes) => `${minutes} минут в кресле командира или второго пилота с реальной обратной связью органов управления в аутентичной среде кабины.`,
    takeoffTitle: 'Основа взлёта и посадки:',
    takeoffDesc: 'Управляемый разбег, навигация на наборе, визуальный круг и ручная посадка.',
    worldTitle: 'Мировые маршруты и сценарии:',
    world60: 'Включает упражнение «Взлёт и посадка» и одну тему World Trio на выбор: три знаковых аэропорта, средиземноморские острова или Альпы Инсбрука.',
    world90: 'Включает «Взлёт и посадка», до двух тем World Trio (4–6 международных посадок) и запуск Cold & Dark или отказ двигателя на V1. Два пилота могут меняться у штурвала.',
    worldPro: 'Ручное пилотирование Raw Data (FD OFF), виражи 45°, отказ двигателя V1 Cut, заход ILS на одном двигателе и работа по QRH.',
    worldBasic: 'Сфокусированная сессия взлёта и посадки в одном международном аэропорту, например Бен-Гурион (LLBG).',
    observersTitle: 'Наблюдатели в кабине:',
    observersDesc: 'До 2 наблюдателей могут находиться в кабине на откидных креслах без доплаты. Фото и видео приветствуются.',
    guidanceTitle: 'Сопровождение пилота авиалинии:',
    guidanceDesc: 'Индивидуальный предполётный брифинг и активное сопровождение в кабине от коммерческого пилота.',
    highlightsTitle: 'Что включено в пакет',
    closeBtn: 'Закрыть детали',
    closeDialogLabel: 'Закрыть состав пакета',
    selectBtn: (price) => `Выбрать этот пакет (${price})`,
  },
  fr: {
    whatIncludedBtn: 'Voir ce qui est inclus',
    badge: 'PLAN DE VOL OFFICIEL • CONTENU DE LA SESSION',
    missionArch: 'Votre mission cockpit, étape par étape',
    duration: (minutes) => `Session de vol de ${minutes} minutes`,
    handsOnPic: 'Aux commandes comme pilote commandant :',
    handsOnDesc: (minutes) => `${minutes} minutes au siège commandant ou copilote, avec retour d’effort actif dans un environnement de cockpit authentique.`,
    takeoffTitle: 'Les bases du décollage et de l’atterrissage :',
    takeoffDesc: 'Roulage et décollage guidés, navigation en montée, tour de piste visuel et atterrissage manuel.',
    worldTitle: 'Routes et scénarios du monde :',
    world60: 'Comprend un exercice décollage et atterrissage et un thème World Trio au choix : trois aéroports emblématiques, les îles méditerranéennes ou les Alpes d’Innsbruck.',
    world90: 'Comprend un exercice décollage et atterrissage, jusqu’à deux thèmes World Trio (4 à 6 atterrissages internationaux), et un démarrage Cold & Dark ou une panne moteur à V1. Deux pilotes peuvent alterner.',
    worldPro: 'Pilotage manuel Raw Data (FD OFF), virages à 45°, panne moteur V1 Cut, ILS monomoteur et exercices de checklist QRH.',
    worldBasic: 'Une session ciblée de décollage et atterrissage sur un seul aéroport international, tel que Ben Gourion (LLBG).',
    observersTitle: 'Accompagnateurs dans le cockpit :',
    observersDesc: 'Jusqu’à 2 accompagnateurs peuvent rejoindre les jumpseats du cockpit sans supplément. Photos et vidéos bienvenues.',
    guidanceTitle: 'Encadrement par un pilote de ligne :',
    guidanceDesc: 'Briefing pré-vol individuel et accompagnement actif dans le cockpit par un pilote commercial.',
    highlightsTitle: 'Ce qui est inclus dans le pack',
    closeBtn: 'Fermer les détails',
    closeDialogLabel: 'Fermer le détail du pack',
    selectBtn: (price) => `Choisir cette formule (${price})`,
  },
  ar: {
    whatIncludedBtn: 'عرض ما تتضمنه الجلسة',
    badge: 'مخطط الرحلة الرسمي • ما تتضمنه الجلسة',
    missionArch: 'مهمتك في قمرة القيادة، خطوة بخطوة',
    duration: (minutes) => `جلسة طيران لمدة ${minutes} دقيقة`,
    handsOnPic: 'التحكم الفعلي كقائد للطائرة:',
    handsOnDesc: (minutes) => `${minutes} دقيقة في مقعد القائد أو المساعد مع استجابة فعلية لأدوات التحكم داخل بيئة قمرة قيادة أصيلة.`,
    takeoffTitle: 'أساسيات الإقلاع والهبوط:',
    takeoffDesc: 'إقلاع موجه، وملاحة أثناء الصعود، ودورة مرئية، وهبوط يدوي.',
    worldTitle: 'المسارات والسيناريوهات العالمية:',
    world60: 'يتضمن تمرين الإقلاع والهبوط وموضوع World Trio واحداً من اختيارك: ثلاثة مطارات بارزة أو جزر المتوسط أو جبال الألب في إنسبروك.',
    world90: 'يتضمن تمرين الإقلاع والهبوط وما يصل إلى موضوعين من World Trio (4–6 عمليات هبوط دولية) وتشغيل Cold & Dark أو سيناريو عطل محرك عند V1. يمكن لطيارين تبادل التحكم.',
    worldPro: 'طيران يدوي كامل Raw Data (FD OFF)، وانعطافات حادة 45°، وعطل محرك V1 Cut، واقتراب ILS بمحرك واحد، وتدريبات قائمة QRH.',
    worldBasic: 'جلسة مركزة للإقلاع والهبوط في مطار دولي واحد، مثل بن غوريون (LLBG).',
    observersTitle: 'مرافقون في قمرة القيادة:',
    observersDesc: 'يمكن لمرافقين اثنين كحد أقصى الانضمام إلى مقاعد المراقبة في قمرة القيادة من دون تكلفة إضافية. التصوير الفوتوغرافي والفيديو مرحب بهما.',
    guidanceTitle: 'إرشاد من طيار تجاري:',
    guidanceDesc: 'إحاطة فردية قبل الطيران وإرشاد نشط داخل قمرة القيادة من طيار تجاري.',
    highlightsTitle: 'ما تتضمنه الباقة',
    closeBtn: 'إغلاق التفاصيل',
    closeDialogLabel: 'إغلاق تفاصيل الباقة',
    selectBtn: (price) => `اختيار هذه الباقة (${price})`,
  },
};
