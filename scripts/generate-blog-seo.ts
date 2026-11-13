/**
 * Deterministic generator and validator for `lib/data/blog-seo.json`.
 *
 * Reads `lib/data/blog-posts.json` and `lib/data/blog-slug-map.json`, combines them
 * with the curated 6-language SEO metadata table, validates every slug, title,
 * description, keyword list, and script boundary, and writes `lib/data/blog-seo.json`.
 *
 * Run with: `npx tsx scripts/generate-blog-seo.ts`
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const SUPPORTED_BLOG_LANGS = ['he', 'en', 'ru', 'fr', 'es', 'ar', 'de'] as const;
export type BlogLang = (typeof SUPPORTED_BLOG_LANGS)[number];

interface RawBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  datePublished: string;
  dateModified?: string;
}

interface RawSlugMap {
  bySlug: Record<string, { translationId: string; language: string }>;
  byTranslationId: Record<
    string,
    {
      localSlug?: string;
      he?: string;
      en?: string;
      ru?: string;
      fr?: string;
      es?: string;
      ar?: string;
      de?: string;
    }
  >;
}

export interface LocalizedSeoEntry {
  shortSlug: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  legacySlugs: string[];
}

export interface BlogSeoPostRecord {
  postId: string;
  translationId: string;
  shortSlug: string;
  category: string;
  locales: Record<BlogLang, LocalizedSeoEntry>;
}

export interface BlogSeoRegistry {
  version: number;
  posts: BlogSeoPostRecord[];
  byTranslationId: Record<string, BlogSeoPostRecord>;
  byPostId: Record<string, BlogSeoPostRecord>;
  byShortSlug: Record<string, string>; // shortSlug -> translationId
  byLegacySlug: Record<string, { translationId: string; language: BlogLang }>;
}

interface PostTopicSeed {
  shortSlug: string;
  topics: Record<BlogLang, { title: string; focus: string; keywords: string[] }>;
}

const BRAND_SUFFIX = ' | SimDream';

const DESC_TAILS: Record<BlogLang, string[]> = {
  he: [
    'בסימולטור בואינג 737 בתל אביב עם קברניט פעיל.',
    'חוויית קוקפיט 1:1 בתל אביב בהדרכת קברניט אמיתי.',
    'במרכז SimDream תל אביב — ללא ניסיון קודם.',
  ],
  en: [
    'Fly our 1:1 Boeing 737 simulator in Tel Aviv with an active captain.',
    'Experience authentic cockpit mentorship at SimDream Tel Aviv today.',
    'Master real Boeing 737 procedures in Tel Aviv with zero prior experience.',
  ],
  ru: [
    'На тренажёре Boeing 737 в Тель-Авиве с действующим капитаном.',
    'Реалистичная кабина 1:1 в SimDream Тель-Авив без опыта полётов.',
    'Освойте процедуры Boeing 737 в Тель-Авиве с профессиональным пилотом.',
  ],
  fr: [
    'Sur simulateur Boeing 737 à Tel-Aviv avec un commandant actif.',
    'Vivez une expérience cockpit 1:1 à Tel-Aviv chez SimDream.',
    'Maîtrisez le Boeing 737 à Tel-Aviv sans expérience préalable.',
  ],
  es: [
    'En nuestro simulador Boeing 737 en Tel Aviv con un capitán activo.',
    'Vive una cabina 1:1 en SimDream Tel Aviv sin experiencia previa.',
    'Domina procedimientos reales del Boeing 737 en Tel Aviv hoy.',
  ],
  ar: [
    'في جهاز محاكاة بوينغ 737 بتل أبيب مع كابتن طيران محترف.',
    'اختبر قمرة القيادة 1:1 في SimDream تل أبيب دون خبرة مسبقة.',
    'تعلّم إجراءات بوينغ 737 الحقيقية في تل أبيب بإشراف كابتن.',
  ],
  de: [
    'Im 1:1-Boeing-737-Simulator in Tel Aviv mit aktivem Flugkapitän.',
    'Erleben Sie echtes Cockpit-Coaching bei SimDream Tel Aviv.',
    'Ohne Vorkenntnisse in unserer Boeing 737 in Tel Aviv abheben.',
  ],
};

const TITLE_PADDING: Record<BlogLang, string[]> = {
  he: ['בואינג 737', 'סימולטור טיסה', 'תל אביב', 'מדריך'],
  en: ['Boeing 737', 'Tel Aviv', 'Flight Sim', 'Guide'],
  ru: ['Boeing 737', 'Тель-Авив', 'Симулятор', 'Гид'],
  fr: ['Boeing 737', 'Tel-Aviv', 'Simulateur', 'Guide'],
  es: ['Boeing 737', 'Tel Aviv', 'Simulador', 'Guía'],
  ar: ['بوينغ 737', 'تل أبيب', 'محاكي طيران', 'دليل'],
  de: ['Boeing 737', 'Tel Aviv', 'Flugsimulator', 'Guide'],
};

const POST_SEEDS: Record<string, PostTopicSeed> = {
  'post-01': {
    shortSlug: 'aircraft-systems-guide',
    topics: {
      he: {
        title: 'מדריך ללימוד מערכות מטוס בואינג 737 בקוקפיט',
        focus: 'למדו איך להבין מערכות מטוס, אוויוניקה והידראוליקה בצורה שיטתית וברורה',
        keywords: ['מערכות מטוס', 'בואינג 737', 'קוקפיט', 'הכנה למיונים'],
      },
      en: {
        title: 'Aircraft Systems Guide: Master the 737 Cockpit',
        focus: 'Learn how to study Boeing 737 electrical, hydraulic, and avionics systems systematically',
        keywords: ['aircraft systems', 'Boeing 737', 'cockpit guide', 'pilot training'],
      },
      ru: {
        title: 'Системы самолёта Boeing 737: гид по кабине',
        focus: 'Изучите электрические, гидравлические и навигационные системы Boeing 737 без путаницы',
        keywords: ['системы самолёта', 'Boeing 737', 'кабина пилота', 'обучение'],
      },
      fr: {
        title: 'Guide systèmes avion : maîtriser le Boeing 737',
        focus: 'Apprenez à étudier les systèmes électriques, hydrauliques et avioniques du Boeing 737',
        keywords: ['systèmes avion', 'Boeing 737', 'cockpit', 'formation pilote'],
      },
      es: {
        title: 'Guía de sistemas del Boeing 737 en cabina',
        focus: 'Aprende a dominar los sistemas eléctricos, hidráulicos y aviónica del Boeing 737 paso a paso',
        keywords: ['sistemas de avión', 'Boeing 737', 'cabina', 'formación piloto'],
      },
      ar: {
        title: 'دليل تعلم أنظمة طائرة بوينغ 737 في القمرة',
        focus: 'تعرّف على كيفية فهم أنظمة الطائرة الكهربائية والهيدروليكية وإلكترونيات الطيران بوضوح',
        keywords: ['أنظمة الطائرة', 'بوينغ 737', 'قمرة القيادة', 'تدريب الطيارين'],
      },
      de: {
        title: 'Flugzeugsysteme-Guide: Boeing 737 Cockpit',
        focus: 'Lernen Sie Elektrik, Hydraulik und Avionik der Boeing 737 systematisch verstehen',
        keywords: ['Flugzeugsysteme', 'Boeing 737', 'Cockpit-Guide', 'Pilotentraining'],
      },
    },
  },
  'post-02': {
    shortSlug: 'flight-simulator-recommendations',
    topics: {
      he: {
        title: 'המלצות לסימולטור טיסה: איך בוחרים חוויה',
        focus: 'כל מה שחשוב לבדוק לפני שמזמינים סימולטור טיסה מקצועי למתנה או לחוויה',
        keywords: ['המלצות סימולטור טיסה', 'סימולטור תל אביב', 'חוויית טיסה', 'בואינג 737'],
      },
      en: {
        title: 'Flight Simulator Recommendations: Best Experience',
        focus: 'Discover what makes a Boeing 737 simulator unforgettable and how to pick the right session',
        keywords: ['flight simulator', 'Tel Aviv attraction', 'Boeing 737', 'cockpit experience'],
      },
      ru: {
        title: 'Рекомендации по выбору авиасимулятора в Тель-Авиве',
        focus: 'Как выбрать лучший полёт на симуляторе Boeing 737 и получить незабываемые эмоции',
        keywords: ['авиасимулятор', 'Boeing 737', 'Тель-Авив', 'подарок'],
      },
      fr: {
        title: 'Recommandations simulateur de vol à Tel-Aviv',
        focus: 'Découvrez comment choisir la meilleure session sur simulateur Boeing 737 pour un vol mémorable',
        keywords: ['simulateur de vol', 'Boeing 737', 'Tel-Aviv', 'cadeau'],
      },
      es: {
        title: 'Recomendaciones para elegir simulador de vuelo',
        focus: 'Descubre qué hace inolvidable un simulador Boeing 737 y cómo elegir la mejor sesión',
        keywords: ['simulador de vuelo', 'Boeing 737', 'Tel Aviv', 'experiencia'],
      },
      ar: {
        title: 'توصيات لاختيار أفضل تجربة محاكي طيران',
        focus: 'اكتشف ما يميّز محاكي الطيران الاحترافي وكيف تختار جلسة طيران لا تُنسى لك أو كهدية',
        keywords: ['محاكي طيران', 'توصيات', 'بوينغ 737', 'تل أبيب'],
      },
      de: {
        title: 'Flugsimulator Empfehlungen: Bestes Erlebnis',
        focus: 'Entdecken Sie, was einen Boeing-737-Simulator unvergesslich macht und wie Sie wählen',
        keywords: ['Flugsimulator', 'Tel Aviv Attraktion', 'Boeing 737', 'Cockpit-Erlebnis'],
      },
    },
  },
  'post-03': {
    shortSlug: 'does-autopilot-land-alone',
    topics: {
      he: {
        title: 'האם טייס אוטומטי נוחת לבד? תשובה מהקוקפיט',
        focus: 'מתי מערכת Autoland פועלת, מה תפקיד הקברניט בגישת ILS ואיך מתרגלים זאת',
        keywords: ['טייס אוטומטי', 'נחיתה אוטומטית', 'קוקפיט 737', 'ILS'],
      },
      en: {
        title: 'Does Autopilot Land by Itself? Cockpit Answer',
        focus: 'Learn when Autoland is used on a Boeing 737, what pilots monitor, and how ILS landings work',
        keywords: ['autopilot landing', 'Autoland', 'Boeing 737', 'ILS approach'],
      },
      ru: {
        title: 'Садится ли автопилот сам? Ответ из кабины 737',
        focus: 'Когда используется система Autoland на Boeing 737 и что контролирует пилот при заходе ILS',
        keywords: ['автопилот', 'Autoland', 'Boeing 737', 'посадка'],
      },
      fr: {
        title: 'Le pilote automatique atterrit-il seul ? Réponse',
        focus: 'Découvrez quand l’Autoland est utilisé sur Boeing 737 et le rôle clé du pilote en approche ILS',
        keywords: ['pilote automatique', 'Autoland', 'Boeing 737', 'atterrissage ILS'],
      },
      es: {
        title: '¿El piloto automático aterriza solo? Respuesta',
        focus: 'Descubre cuándo actúa el Autoland en un Boeing 737 y qué supervisa la tripulación en ILS',
        keywords: ['piloto automático', 'Autoland', 'Boeing 737', 'aproximación ILS'],
      },
      ar: {
        title: 'هل يهبط الطيار الآلي وحده؟ إجابة من القمرة',
        focus: 'تعرّف على متى يعمل نظام الهبوط الآلي Autoland وما يفعله الطيارون خلال الاقتراب',
        keywords: ['الطيار الآلي', 'الهبوط الآلي', 'بوينغ 737', 'قمرة القيادة'],
      },
      de: {
        title: 'Landet der Autopilot allein? Cockpit-Antwort',
        focus: 'Wann Autoland in der Boeing 737 genutzt wird, was Piloten prüfen und wie ILS funktioniert',
        keywords: ['Autopilot Landung', 'Autoland', 'Boeing 737', 'ILS-Anflug'],
      },
    },
  },
  'post-04': {
    shortSlug: 'couples-flight-simulator-date',
    topics: {
      he: {
        title: 'פעילות גיבוש לזוג שלא מרגישה כמו עוד דייט',
        focus: 'דייט זוגי מקורי בתא הטייס של בואינג 737 עם המראות, נחיתות ושיתוף פעולה מלא',
        keywords: ['פעילות לזוג', 'דייט מקורי', 'סימולטור טיסה', 'תל אביב'],
      },
      en: {
        title: 'Couples Flight Simulator Date in Tel Aviv',
        focus: 'Share a unique couples bonding experience piloting a Boeing 737 together as captain and FO',
        keywords: ['couples date', 'Tel Aviv date idea', 'flight simulator', 'bonding'],
      },
      ru: {
        title: 'Необычное свидание для пары в кабине Boeing 737',
        focus: 'Совместный полёт в роли капитана и второго пилота — яркая альтернатива обычному свиданию',
        keywords: ['свидание для пары', 'Boeing 737', 'Тель-Авив', 'идея'],
      },
      fr: {
        title: 'Activité de couple originale en simulateur 737',
        focus: 'Partagez un rendez-vous inoubliable aux commandes d’un Boeing 737 en duo à Tel-Aviv',
        keywords: ['activité couple', 'rendez-vous original', 'Boeing 737', 'Tel-Aviv'],
      },
      es: {
        title: 'Cita original en pareja en simulador Boeing 737',
        focus: 'Compartid una experiencia única pilotando juntos un Boeing 737 como capitán y primer oficial',
        keywords: ['cita en pareja', 'plan original', 'Boeing 737', 'Tel Aviv'],
      },
      ar: {
        title: 'نشاط رومانسي مميز للأزواج في محاكي الطيران',
        focus: 'استمتعا بموعد غير تقليدي في قمرة بوينغ 737 حيث تتشاركان القيادة معاً لحظة بلحظة',
        keywords: ['نشاط للأزواج', 'موعد مميز', 'بوينغ 737', 'تل أبيب'],
      },
      de: {
        title: 'Paar-Flugsimulator-Date in Tel Aviv',
        focus: 'Teilen Sie ein einzigartiges Paarerlebnis als Kapitän und Erster Offizier in der 737',
        keywords: ['Paar-Date', 'Tel Aviv', 'Boeing 737', 'Geschenkidee'],
      },
    },
  },
  'post-05': {
    shortSlug: 'luxury-couples-flight-experience',
    topics: {
      he: {
        title: 'אטרקציה זוגית יוקרתית שלא שוכחים בתל אביב',
        focus: 'חוויית טיסה פרטית לזוגות בקוקפיט בואינג 737 עם אווירה אקסקלוסיבית ונוף עוצר נשימה',
        keywords: ['אטרקציה זוגית', 'חוויה יוקרתית', 'סימולטור טיסה', 'תל אביב'],
      },
      en: {
        title: 'Luxury Couples Flight Experience in Tel Aviv',
        focus: 'Enjoy an exclusive private Boeing 737 cockpit date tailored for couples seeking VIP thrills',
        keywords: ['luxury date', 'couples attraction', 'Boeing 737', 'Tel Aviv'],
      },
      ru: {
        title: 'Премиальный полёт для двоих в Тель-Авиве',
        focus: 'Эксклюзивный приватный полёт на Boeing 737 для пары с персональным инструктором-капитаном',
        keywords: ['романтический полёт', 'VIP подарок', 'Boeing 737', 'Тель-Авив'],
      },
      fr: {
        title: 'Expérience couple haut de gamme en Boeing 737',
        focus: 'Offrez-vous une session privée exclusive dans un cockpit Boeing 737 pour deux à Tel-Aviv',
        keywords: ['expérience luxe', 'couple', 'Boeing 737', 'Tel-Aviv'],
      },
      es: {
        title: 'Experiencia VIP en pareja en simulador 737',
        focus: 'Disfruta de una sesión privada exclusiva en cabina Boeing 737 diseñada para parejas',
        keywords: ['experiencia VIP', 'parejas', 'Boeing 737', 'Tel Aviv'],
      },
      ar: {
        title: 'تجربة طيران فاخرة للأزواج في تل أبيب',
        focus: 'عش تجربة خاصة وحصرية لشخصين داخل قمرة بوينغ 737 مع أجواء راقية وذكريات لا تُنسى',
        keywords: ['تجربة فاخرة', 'للأزواج', 'بوينغ 737', 'تل أبيب'],
      },
      de: {
        title: 'Luxus-Flugerlebnis für Paare in Tel Aviv',
        focus: 'Genießen Sie ein exklusives privates Boeing-737-Cockpit-Date für besondere Anlässe',
        keywords: ['Luxus-Date', 'Paarerlebnis', 'Boeing 737', 'Tel Aviv'],
      },
    },
  },
  'post-06': {
    shortSlug: 'airline-interview-simulator-prep',
    topics: {
      he: {
        title: 'הכנה לראיון חברת תעופה וסימולטור בלי לאבד גובה',
        focus: 'טיפים מעשיים לטייסים לקראת מיוני אל על, ארקיע, ישראייר ו-Wizz Air בסימולטור 737',
        keywords: ['הכנה למיוני טייס', 'ראיון חברת תעופה', 'סימולטור 737', 'PRO'],
      },
      en: {
        title: 'Airline Interview Prep: Ace Your Sim Check',
        focus: 'Practical simulator assessment tips for pilots preparing for El Al, Arkia, Wizz Air, and Ryanair',
        keywords: ['airline interview prep', 'simulator assessment', 'pilot screening', 'Boeing 737'],
      },
      ru: {
        title: 'Подготовка к собеседованию и тренажёру авиакомпании',
        focus: 'Практические советы пилотам перед отбором в авиакомпании и проверкой на Boeing 737',
        keywords: ['собеседование пилот', 'оценка на тренажёре', 'Boeing 737', 'ATPL'],
      },
      fr: {
        title: 'Préparation entretien compagnie aérienne 737',
        focus: 'Conseils pratiques pour réussir votre évaluation simulateur et entretien de recrutement pilote',
        keywords: ['entretien compagnie', 'évaluation simulateur', 'Boeing 737', 'pilote'],
      },
      es: {
        title: 'Preparación entrevista aerolínea en simulador',
        focus: 'Consejos clave para superar la prueba de simulador y entrevista técnica de aerolínea',
        keywords: ['entrevista aerolínea', 'prueba simulador', 'Boeing 737', 'piloto'],
      },
      ar: {
        title: 'التحضير لمقابلة شركات الطيران وفحص المحاكي',
        focus: 'نصائح عملية للطيارين للاستعداد لاختبارات التوظيف وفحص المهارات على محاكي بوينغ 737',
        keywords: ['مقابلة طيران', 'اختبار المحاكي', 'بوينغ 737', 'توظيف طيارين'],
      },
      de: {
        title: 'Airline-Interview-Vorbereitung: Sim-Check',
        focus: 'Praxisnahe Simulator-Tipps für Piloten vor El Al, Arkia, Wizz Air und Ryanair',
        keywords: ['Airline-Interview', 'Simulator-Check', 'Pilotenauswahl', 'Boeing 737'],
      },
    },
  },
  'post-07': {
    shortSlug: 'fly-simulator-no-experience',
    topics: {
      he: {
        title: 'האם אפשר להטיס סימולטור טיסה בלי ניסיון קודם?',
        focus: 'כן! קברניט מלווה אתכם צעד אחר צעד מהמראה ועד נחיתה חלקה ללא ידע מוקדם',
        keywords: ['סימולטור בלי ניסיון', 'הטסת מטוס', 'למתחילים', 'תל אביב'],
      },
      en: {
        title: 'Can You Fly a Simulator With Zero Experience?',
        focus: 'Yes! Learn how our active airline captains guide first-time flyers from takeoff to landing',
        keywords: ['zero experience', 'beginner flight sim', 'Boeing 737', 'first time flyer'],
      },
      ru: {
        title: 'Можно ли управлять симулятором без опыта?',
        focus: 'Да! Узнайте, как капитан проведёт вас от взлёта до мягкой посадки без предварительной подготовки',
        keywords: ['без опыта', 'для новичков', 'Boeing 737', 'авиасимулятор'],
      },
      fr: {
        title: 'Peut-on piloter un simulateur sans expérience ?',
        focus: 'Oui ! Découvrez comment un commandant vous guide du décollage à l’atterrissage sans prérequis',
        keywords: ['sans expérience', 'débutant', 'simulateur Boeing 737', 'Tel-Aviv'],
      },
      es: {
        title: '¿Se puede volar un simulador sin experiencia?',
        focus: '¡Sí! Descubre cómo un capitán te guía desde el despegue hasta el aterrizaje sin conocimientos previos',
        keywords: ['sin experiencia', 'principiantes', 'simulador Boeing 737', 'Tel Aviv'],
      },
      ar: {
        title: 'هل يمكن قيادة محاكي الطيران دون خبرة مسبقة؟',
        focus: 'نعم! اكتشف كيف يرافقك كابتن طيران خطوة بخطوة من الإقلاع حتى الهبوط دون أي خبرة سابقة',
        keywords: ['دون خبرة', 'للمبتدئين', 'محاكي طيران', 'بوينغ 737'],
      },
      de: {
        title: 'Flugsimulator fliegen ohne Vorkenntnisse?',
        focus: 'Ja! Erfahren Sie, wie aktive Flugkapitäne Einsteiger vom Start bis zur Landung führen',
        keywords: ['Anfänger', 'ohne Vorkenntnisse', 'Flugsimulator', 'Boeing 737'],
      },
    },
  },
  'post-08': {
    shortSlug: 'challenging-airport-landings-guide',
    topics: {
      he: {
        title: 'גישה ונחיתה בשדות התעופה המאתגרים בעולם',
        focus: 'מדיירה, אינסברוק ופרו — איך מתמודדים בקוקפיט עם רוחות צד, הרים ומסלולים קצרים',
        keywords: ['שדות תעופה מאתגרים', 'נחיתה במדיירה', 'קוקפיט 737', 'אתגרי טיסה'],
      },
      en: {
        title: 'Landing at the World’s Most Challenging Airports',
        focus: 'Explore Madeira, Paro, and Innsbruck approaches and how pilots manage terrain and crosswinds',
        keywords: ['challenging airports', 'Madeira landing', 'Boeing 737', 'cockpit skills'],
      },
      ru: {
        title: 'Посадка в самых сложных аэропортах мира',
        focus: 'Мадейра, Паро и Инсбрук: как экипажи справляются с боковым ветром и горным рельефом',
        keywords: ['сложные аэропорты', 'Мадейра', 'Boeing 737', 'посадка'],
      },
      fr: {
        title: 'Atterrir sur les aéroports les plus difficiles',
        focus: 'Madère, Paro et Innsbruck : découvrez comment les pilotes gèrent relief et vents traversiers',
        keywords: ['aéroports difficiles', 'Madère', 'Boeing 737', 'approche'],
      },
      es: {
        title: 'Aterrizar en los aeropuertos más desafiantes',
        focus: 'Madeira, Paro e Innsbruck: cómo gestionan los pilotos viento cruzado y terreno montañoso',
        keywords: ['aeropuertos difíciles', 'Madeira', 'Boeing 737', 'aterrizaje'],
      },
      ar: {
        title: 'الاقتراب والهبوط في أصعب مطارات العالم',
        focus: 'تعرّف على تحديات مطارات ماديرا وإنسبروك وبارو وكيف يتعامل الطيارون مع الرياح والتضاريس',
        keywords: ['أصعب المطارات', 'هبوط ماديرا', 'بوينغ 737', 'مهارات القمرة'],
      },
      de: {
        title: 'Landen auf den extremsten Flughäfen der Welt',
        focus: 'Erleben Sie Madeira, Paro und Innsbruck und wie Piloten Gelände und Seitenwind meistern',
        keywords: ['Extreme Flughäfen', 'Paro', 'Madeira', 'Innsbruck'],
      },
    },
  },
  'post-09': {
    shortSlug: 'innsbruck-valley-approach-737',
    topics: {
      he: {
        title: 'איך מבצעים גישת אינסברוק בעמק בבואינג 737',
        focus: 'מדריך מרתק לגישה ההררית המפורסמת באוסטריה, ניהול גובה, פניות חזותיות ונחיתה',
        keywords: ['גישת אינסברוק', 'LOWI', 'בואינג 737', 'נחיתה בהרים'],
      },
      en: {
        title: 'Innsbruck Valley Approach in a Boeing 737',
        focus: 'Step-by-step look at Austria’s famous Alpine circle-to-land approach, energy, and terrain clearance',
        keywords: ['Innsbruck approach', 'LOWI', 'Boeing 737', 'Alpine landing'],
      },
      ru: {
        title: 'Заход на посадку в Инсбруке на Boeing 737',
        focus: 'Разбор знаменитого горного захода LOWI в Альпах: профиль снижения, визуальный манёвр и посадка',
        keywords: ['Инсбрук LOWI', 'горный заход', 'Boeing 737', 'симулятор'],
      },
      fr: {
        title: 'Approche d’Innsbruck en vallée sur Boeing 737',
        focus: 'Découvrez la célèbre approche alpine LOWI en Autriche : gestion d’altitude et virage à vue',
        keywords: ['approche Innsbruck', 'LOWI', 'Boeing 737', 'atterrissage alpin'],
      },
      es: {
        title: 'Aproximación al valle de Innsbruck en Boeing 737',
        focus: 'Análisis paso a paso de la famosa aproximación alpina LOWI en Austria y su maniobra visual',
        keywords: ['aproximación Innsbruck', 'LOWI', 'Boeing 737', 'aterrizaje alpino'],
      },
      ar: {
        title: 'كيفية تنفيذ اقتراب وادي إنسبروك في بوينغ 737',
        focus: 'دليل شامل للاقتراب الجبلي الشهير في النمسا LOWI وإدارة الارتفاع والسرعة في القمرة',
        keywords: ['اقتراب إنسبروك', 'LOWI', 'بوينغ 737', 'هبوط جبلي'],
      },
      de: {
        title: 'Innsbruck-Talanflug in der Boeing 737',
        focus: 'Schritt-für-Schritt-Blick auf Österreichs berühmten Alpenanflug, Energie und Gelände',
        keywords: ['Innsbruck', 'Alpenanflug', 'Boeing 737', 'Sichtanflug'],
      },
    },
  },
  'post-10': {
    shortSlug: 'how-to-buy-flight-voucher',
    topics: {
      he: {
        title: 'איך להזמין שובר טיסה מתנה בלי לפספס',
        focus: 'מדריך לבחירת שובר מתנה מושלם לסימולטור טיסה: משך, תוספות ותוקף דיגיטלי',
        keywords: ['שובר טיסה מתנה', 'גיפט קארד סימולטור', 'מתנה מקורית', 'SimDream'],
      },
      en: {
        title: 'How to Order a Flight Simulator Gift Voucher',
        focus: 'Learn how to choose the right flight duration, add-ons, and instant digital gift card',
        keywords: ['flight gift voucher', 'gift card', 'Boeing 737 gift', 'Tel Aviv'],
      },
      ru: {
        title: 'Как выбрать подарочный сертификат на полёт',
        focus: 'Советы по выбору длительности сессии, маршрута и мгновенного электронного сертификата',
        keywords: ['подарочный сертификат', 'полёт на симуляторе', 'Boeing 737', 'подарок'],
      },
      fr: {
        title: 'Comment offrir un bon cadeau simulateur de vol',
        focus: 'Guide pratique pour choisir la durée, les options de vol et recevoir votre bon numérique',
        keywords: ['bon cadeau vol', 'carte cadeau', 'Boeing 737', 'Tel-Aviv'],
      },
      es: {
        title: 'Cómo regalar un bono de simulador de vuelo',
        focus: 'Guía para elegir la duración ideal, extras de cabina y recibir tu tarjeta regalo digital',
        keywords: ['bono regalo vuelo', 'tarjeta regalo', 'Boeing 737', 'Tel Aviv'],
      },
      ar: {
        title: 'كيف تطلب قسيمة هدية لمحاكي الطيران بذكاء',
        focus: 'دليل اختيار مدة الجلسة والإضافات المناسبة والحصول على قسيمة هدية رقمية فورية',
        keywords: ['قسيمة هدية', 'محاكي طيران', 'هدية مميزة', 'بوينغ 737'],
      },
      de: {
        title: 'Flugsimulator-Geschenkgutschein bestellen',
        focus: 'So wählen Sie die richtige Flugdauer, Extras und den sofortigen digitalen Gutschein',
        keywords: ['Geschenkgutschein', 'Flugsimulator', 'Gutschein', 'Boeing 737'],
      },
    },
  },
  'post-11': {
    shortSlug: 'boeing-737-simulator-beginners',
    topics: {
      he: {
        title: 'סימולטור בואינג 737 למתחילים: איך מתחילים נכון',
        focus: 'מה קורה בדקות הראשונות בקוקפיט, איך מחזיקים את ההגאים ואיך נהנים מכל רגע',
        keywords: ['סימולטור למתחילים', 'בואינג 737', 'טיסה ראשונה', 'תל אביב'],
      },
      en: {
        title: 'Boeing 737 Simulator for Beginners: Start Right',
        focus: 'Everything first-timers need to know before stepping into a 1:1 Boeing 737 flight deck',
        keywords: ['beginner simulator', 'Boeing 737', 'first flight sim', 'Tel Aviv'],
      },
      ru: {
        title: 'Симулятор Boeing 737 для новичков: с чего начать',
        focus: 'Что происходит в первые минуты в кабине и как уверенно выполнить первый взлёт и посадку',
        keywords: ['симулятор для новичков', 'Boeing 737', 'первый полёт', 'Тель-Авив'],
      },
      fr: {
        title: 'Simulateur Boeing 737 débutants : bien démarrer',
        focus: 'Tout savoir avant votre première session aux commandes d’un Boeing 737 avec un instructeur',
        keywords: ['simulateur débutant', 'Boeing 737', 'premier vol', 'Tel-Aviv'],
      },
      es: {
        title: 'Simulador Boeing 737 para principiantes: guía',
        focus: 'Todo lo que debes saber antes de tu primera sesión en una cabina real de Boeing 737',
        keywords: ['simulador principiantes', 'Boeing 737', 'primer vuelo', 'Tel Aviv'],
      },
      ar: {
        title: 'محاكي بوينغ 737 للمبتدئين: كيف تبدأ بشكل صحيح',
        focus: 'كل ما تحتاج معرفته قبل دخول قمرة القيادة لأول مرة لتستمتع بالإقلاع والهبوط بثقة',
        keywords: ['محاكي للمبتدئين', 'بوينغ 737', 'أول تجربة طيران', 'تل أبيب'],
      },
      de: {
        title: 'Boeing-737-Simulator für Anfänger: Startklar',
        focus: 'Alles, was Erstflieger vor dem Einstieg in unser 1:1-Boeing-737-Cockpit wissen müssen',
        keywords: ['Anfänger-Guide', 'Boeing 737', 'Erstflug', 'Tel Aviv'],
      },
    },
  },
  'post-12': {
    shortSlug: 'birthday-gift-for-men-flight',
    topics: {
      he: {
        title: 'מתנת יום הולדת לגבר שבאמת מרגשת וזכורה',
        focus: 'הפתיעו אותו במושב הקברניט של בואינג 737 — מתנת אדרנלין יוקרתית שלא שוכחים',
        keywords: ['מתנת יום הולדת לגבר', 'מתנה מקורית', 'סימולטור טיסה', 'בואינג 737'],
      },
      en: {
        title: 'Unforgettable Birthday Gift for Men: Fly a 737',
        focus: 'Surprise him with the captain’s seat of a Boeing 737 for an unforgettable birthday thrill',
        keywords: ['birthday gift for him', 'Boeing 737 gift', 'Tel Aviv gift', 'flight voucher'],
      },
      ru: {
        title: 'Идея подарка мужчине на день рождения: Boeing 737',
        focus: 'Подарите место капитана авиалайнера Boeing 737 — подарок, который запомнится на всю жизнь',
        keywords: ['подарок мужчине', 'день рождения', 'Boeing 737', 'сертификат'],
      },
      fr: {
        title: 'Idée cadeau anniversaire homme : piloter un 737',
        focus: 'Offrez-lui le siège du commandant de bord sur Boeing 737 pour un anniversaire inoubliable',
        keywords: ['cadeau anniversaire homme', 'piloter Boeing 737', 'cadeau original', 'Tel-Aviv'],
      },
      es: {
        title: 'Regalo de cumpleaños para hombre: volar un 737',
        focus: 'Sorpréndelo en el asiento de capitán de un Boeing 737 con un regalo de cumpleaños único',
        keywords: ['regalo cumpleaños hombre', 'volar Boeing 737', 'regalo original', 'Tel Aviv'],
      },
      ar: {
        title: 'هدية عيد ميلاد للرجال لا تُنسى: قيادة بوينغ 737',
        focus: 'فاجئه بتجربة جلوسه في مقعد الكابتن لقيادة طائرة بوينغ 737 في عيد ميلاده',
        keywords: ['هدية عيد ميلاد', 'هدية للرجال', 'بوينغ 737', 'تل أبيب'],
      },
      de: {
        title: 'Unvergessliches Geburtstagsgeschenk: 737',
        focus: 'Überraschen Sie ihn mit dem Kapitänssitz einer Boeing 737 zum Geburtstag',
        keywords: ['Geburtstagsgeschenk', 'Geschenk für Männer', 'Boeing 737', 'Tel Aviv'],
      },
    },
  },
  'post-13': {
    shortSlug: 'crosswind-landing-practice-737',
    topics: {
      he: {
        title: 'איך מתרגלים נחיתת רוח צד בסימולטור 737',
        focus: 'טכניקות Crab ו-Wing-Low, עבודת רגליים על ההגה וניהול מצערות בנחיתת רוח צד',
        keywords: ['נחיתת רוח צד', 'סימולטור בואינג 737', 'תרגול נחיתה', 'קוקפיט'],
      },
      en: {
        title: 'Crosswind Landing Practice in a Boeing 737 Sim',
        focus: 'Master crab and de-crab techniques, rudder coordination, and flare control in strong winds',
        keywords: ['crosswind landing', 'Boeing 737', 'flight simulator', 'landing technique'],
      },
      ru: {
        title: 'Отработка посадки с боковым ветром на 737',
        focus: 'Техника упреждения сноса, работа педалями и выравнивание Boeing 737 при сильном ветре',
        keywords: ['боковой ветер', 'посадка Boeing 737', 'тренажёр', 'техника пилотирования'],
      },
      fr: {
        title: 'Atterrissage par vent traversier en Boeing 737',
        focus: 'Maîtrisez la technique en crabe, le palonnier et l’arrondi par fort vent de travers',
        keywords: ['vent traversier', 'atterrissage Boeing 737', 'simulateur', 'pilotage'],
      },
      es: {
        title: 'Práctica de aterrizaje con viento cruzado 737',
        focus: 'Domina la técnica de deriva, uso de timón y recogida con viento fuerte en Boeing 737',
        keywords: ['viento cruzado', 'aterrizaje Boeing 737', 'simulador', 'técnica'],
      },
      ar: {
        title: 'التدريب على الهبوط مع الرياح الجانبية في 737',
        focus: 'تعلّم تقنيات التحكم بالدفة والميلان وتوجيه الطائرة بأمان أثناء الرياح الجانبية القوية',
        keywords: ['رياح جانبية', 'هبوط بوينغ 737', 'محاكي الطيران', 'تدريب'],
      },
      de: {
        title: 'Seitenwindlandung im Boeing-737-Simulator',
        focus: 'Meistern Sie Crab, De-Crab, Seitenruder-Koordination und Ausschweben bei starkem Wind',
        keywords: ['Seitenwindlandung', 'Boeing 737', 'Flugtechnik', 'Simulator'],
      },
    },
  },
  'post-14': {
    shortSlug: 'unique-date-idea-tel-aviv',
    topics: {
      he: {
        title: 'רעיון לדייט לא שגרתי בתל אביב שבאמת יפתיע',
        focus: 'מחפשים דייט בלתי נשכח? טוסו יחד מעל תל אביב, ניו יורק או פריז בקוקפיט אמיתי',
        keywords: ['רעיון לדייט', 'דייט בתל אביב', 'חוויה זוגית', 'סימולטור טיסה'],
      },
      en: {
        title: 'Unique Date Idea in Tel Aviv That Surprises',
        focus: 'Skip the usual dinner and take off together over Paris, New York, or Tel Aviv in a 737',
        keywords: ['unique date idea', 'Tel Aviv date', 'couples flight', 'Boeing 737'],
      },
      ru: {
        title: 'Необычная идея для свидания в Тель-Авиве',
        focus: 'Удивите вторую половинку совместным вылетом над Парижем, Нью-Йорком или Тель-Авивом',
        keywords: ['идея для свидания', 'Тель-Авив', 'свидание на двоих', 'Boeing 737'],
      },
      fr: {
        title: 'Idée de rendez-vous insolite à Tel-Aviv',
        focus: 'Oubliez le dîner classique et décollez à deux au-dessus de Paris ou Tel-Aviv en Boeing 737',
        keywords: ['rendez-vous insolite', 'Tel-Aviv', 'sortie couple', 'Boeing 737'],
      },
      es: {
        title: 'Idea de cita original en Tel Aviv que sorprende',
        focus: 'Cambia la cena habitual y despega en pareja sobre París, Nueva York o Tel Aviv en un 737',
        keywords: ['cita original', 'Tel Aviv', 'plan en pareja', 'Boeing 737'],
      },
      ar: {
        title: 'فكرة موعد غير تقليدية في تل أبيب ستفاجئ شريكك',
        focus: 'تجاوز المواعيد المعتادة وحلّقا معاً فوق باريس أو نيويورك أو تل أبيب في قمرة بوينغ 737',
        keywords: ['فكرة موعد', 'تل أبيب', 'نشاط للأزواج', 'بوينغ 737'],
      },
      de: {
        title: 'Einzigartige Date-Idee in Tel Aviv',
        focus: 'Vergessen Sie das übliche Dinner und heben Sie gemeinsam über Paris oder New York ab',
        keywords: ['Date-Idee', 'Tel Aviv', 'Boeing 737', 'Paare'],
      },
    },
  },
  'post-15': {
    shortSlug: 'flight-simulator-session-duration',
    topics: {
      he: {
        title: 'כמה זמן נמשכת חוויית טיסה בסימולטור 737?',
        focus: 'השוואה בין חבילות 30, 45, 60 ו-90 דקות: מה מספיקים בכל משך ואיזו חבילה מתאימה',
        keywords: ['משך טיסה סימולטור', 'חבילות טיסה', 'בואינג 737', 'SimDream'],
      },
      en: {
        title: 'How Long Does a Flight Simulator Session Last?',
        focus: 'Compare 30, 45, 60, and 90-minute Boeing 737 sessions to pick the best cockpit experience',
        keywords: ['session duration', 'flight packages', 'Boeing 737', 'Tel Aviv'],
      },
      ru: {
        title: 'Сколько длится полёт на авиасимуляторе 737?',
        focus: 'Сравнение пакетов 30, 45, 60 и 90 минут: что входит в каждый сеанс и как выбрать длительность',
        keywords: ['длительность полёта', 'пакеты симулятора', 'Boeing 737', 'Тель-Авив'],
      },
      fr: {
        title: 'Combien de temps dure une session simulateur ?',
        focus: 'Comparez nos formules de 30, 45, 60 et 90 minutes sur Boeing 737 pour choisir votre vol',
        keywords: ['durée session', 'formules simulateur', 'Boeing 737', 'Tel-Aviv'],
      },
      es: {
        title: '¿Cuánto dura una sesión en simulador de vuelo?',
        focus: 'Compara sesiones de 30, 45, 60 y 90 minutos en Boeing 737 y elige la duración ideal',
        keywords: ['duración sesión', 'paquetes de vuelo', 'Boeing 737', 'Tel Aviv'],
      },
      ar: {
        title: 'كم تستغرق جلسة الطيران في جهاز المحاكاة؟',
        focus: 'مقارنة بين باقات 30 و45 و60 و90 دقيقة في قمرة بوينغ 737 لاختيار المدة الأنسب لك',
        keywords: ['مدة الجلسة', 'باقات الطيران', 'بوينغ 737', 'تل أبيب'],
      },
      de: {
        title: 'Wie lange dauert eine Simulator-Sitzung?',
        focus: 'Vergleichen Sie 30, 45, 60 und 90 Minuten in der Boeing 737 für das perfekte Erlebnis',
        keywords: ['Flugdauer', 'Pakete', 'Boeing 737', 'Tel Aviv'],
      },
    },
  },
  'post-16': {
    shortSlug: 'takeoff-and-landing-guide-737',
    topics: {
      he: {
        title: 'מדריך לתרגול המראה ונחיתה בבואינג 737',
        focus: 'מהירויות V1 ו-VR, זווית טיפוס, שמירת ציר מסלול ונגיעה מדויקת בקוקפיט',
        keywords: ['המראה ונחיתה', 'תרגול קוקפיט', 'בואינג 737', 'מדריך טיסה'],
      },
      en: {
        title: 'Boeing 737 Takeoff and Landing Practice Guide',
        focus: 'Learn pitch attitude, airspeed management, centerline tracking, and smooth touchdown control',
        keywords: ['takeoff and landing', 'Boeing 737', 'cockpit skills', 'pilot guide'],
      },
      ru: {
        title: 'Гид по отработке взлёта и посадки на Boeing 737',
        focus: 'Скорости V1 и VR, тангаж, удержание осевой линии и мягкое касание на тренажёре',
        keywords: ['взлёт и посадка', 'Boeing 737', 'тренажёр', 'навыки пилота'],
      },
      fr: {
        title: 'Guide décollage et atterrissage sur Boeing 737',
        focus: 'Maîtrisez l’assiette, la vitesse, l’axe de piste et le toucher des roues sur simulateur',
        keywords: ['décollage atterrissage', 'Boeing 737', 'simulateur', 'pilotage'],
      },
      es: {
        title: 'Guía de despegue y aterrizaje en Boeing 737',
        focus: 'Domina el cabeceo, gestión de velocidad, eje de pista y toma suave en cabina real',
        keywords: ['despegue y aterrizaje', 'Boeing 737', 'simulador', 'guía de vuelo'],
      },
      ar: {
        title: 'دليل التدريب على الإقلاع والهبوط في بوينغ 737',
        focus: 'تعلّم ضبط السرعة وزاوية الصعود والحفاظ على محور المدرج والهبوط السلس في القمرة',
        keywords: ['الإقلاع والهبوط', 'بوينغ 737', 'قمرة القيادة', 'دليل طيران'],
      },
      de: {
        title: 'Boeing 737 Start- und Landetraining Guide',
        focus: 'Lernen Sie Längsneigung, Geschwindigkeitskontrolle, Mittellinie und sanftes Aufsetzen',
        keywords: ['Start und Landung', 'Boeing 737', 'Flugtraining', 'Cockpit'],
      },
    },
  },
  'post-17': {
    shortSlug: 'experiential-flight-simulators-guide',
    topics: {
      he: {
        title: 'סימולטורים חווייתיים לתעופה: עולם הטיסה מקרוב',
        focus: 'איך בנוי סימולטור בואינג 737 אמיתי, למה הוא מרגיש כמו מטוס ומתי כדאי להגיע',
        keywords: ['סימולטורים חווייתיים', 'סימולטור תעופה', 'בואינג 737', 'תל אביב'],
      },
      en: {
        title: 'Experiential Flight Simulators: Inside the 737',
        focus: 'Discover how 1:1 cockpit hardware, motorized controls, and 220° visuals create true flight',
        keywords: ['flight simulation', 'Boeing 737 cockpit', 'Tel Aviv', 'aviation experience'],
      },
      ru: {
        title: 'Реалистичные авиасимуляторы: мир Boeing 737',
        focus: 'Как устроена кабина 1:1 с моторизованными штурвалами и панорамной визуализацией',
        keywords: ['авиасимуляторы', 'Boeing 737', 'реализм', 'Тель-Авив'],
      },
      fr: {
        title: 'Simulateurs de vol immersifs : l’univers 737',
        focus: 'Découvrez comment un cockpit 1:1 motorisé et une vue panoramique recréent le vol réel',
        keywords: ['simulateur immersif', 'Boeing 737', 'cockpit 1:1', 'Tel-Aviv'],
      },
      es: {
        title: 'Simuladores de vuelo inmersivos: el mundo 737',
        focus: 'Descubre cómo una cabina 1:1 motorizada y visuales panorámicos recrean el vuelo real',
        keywords: ['simuladores inmersivos', 'Boeing 737', 'cabina 1:1', 'Tel Aviv'],
      },
      ar: {
        title: 'أجهزة محاكاة الطيران التفاعلية: عالم بوينغ 737',
        focus: 'تعرّف على كيف تصنع القمرة الحقيقية بمقياس 1:1 وأدوات التحكم الآلية إحساس الطيران الفعلي',
        keywords: ['محاكاة الطيران', 'بوينغ 737', 'قمرة قيادة', 'تل أبيب'],
      },
      de: {
        title: 'Erlebnis-Flugsimulatoren: Im 737-Cockpit',
        focus: 'Wie 1:1-Cockpit-Hardware, motorisierte Steuerung und 220°-Sicht echtes Fliegen erzeugen',
        keywords: ['Erlebnissimulator', 'Boeing 737', '220-Grad-Sicht', 'Tel Aviv'],
      },
    },
  },
  'post-18': {
    shortSlug: 'engine-failure-takeoff-737-guide',
    topics: {
      he: {
        title: 'כשל מנוע בהמראה (V1 Cut) בקוקפיט בואינג 737',
        focus: 'איך צוות אוויר מגיב לכשל מנוע ברגע הקריטי, שומר כיוון ומטפס בבטחה',
        keywords: ['כשל מנוע בהמראה', 'V1 Cut', 'בואינג 737', 'חירום בקוקפיט'],
      },
      en: {
        title: 'Engine Failure on Takeoff in a Boeing 737',
        focus: 'How pilots handle a V1 engine failure in the cockpit, maintain directional control, and climb',
        keywords: ['engine failure', 'V1 cut', 'Boeing 737', 'emergency procedures'],
      },
      ru: {
        title: 'Отказ двигателя на взлёте (V1) на Boeing 737',
        focus: 'Как экипаж реагирует на отказ двигателя на критической скорости и выполняет безопасный набор',
        keywords: ['отказ двигателя', 'V1', 'Boeing 737', 'аварийные процедуры'],
      },
      fr: {
        title: 'Panne moteur au décollage (V1) sur Boeing 737',
        focus: 'Comment l’équipage gère une panne moteur à V1, maintient l’axe et poursuit la montée',
        keywords: ['panne moteur V1', 'Boeing 737', 'procédures urgence', 'simulateur'],
      },
      es: {
        title: 'Fallo de motor en despegue (V1) en Boeing 737',
        focus: 'Cómo responde la tripulación a un fallo de motor en V1 manteniendo control y ascenso',
        keywords: ['fallo de motor V1', 'Boeing 737', 'emergencia', 'simulador'],
      },
      ar: {
        title: 'عطل المحرك عند الإقلاع وكيفية التصرف في بوينغ 737',
        focus: 'كيف يتعامل الطيارون مع عطل المحرك عند سرعة V1 للحفاظ على التوازن والصعود بأمان',
        keywords: ['عطل المحرك', 'V1', 'بوينغ 737', 'طوارئ الطيران'],
      },
      de: {
        title: 'Triebwerksausfall beim Start in der 737',
        focus: 'Wie Piloten einen V1-Triebwerksausfall meistern, Kurs halten und sicher steigen',
        keywords: ['Triebwerksausfall', 'V1', 'Boeing 737', 'Notverfahren'],
      },
    },
  },
  'post-19': {
    shortSlug: 'paro-bhutan-approach-737-crew',
    topics: {
      he: {
        title: 'איך נוחתים בפרו בהוטן (VQPR) כמו צוות אמיתי',
        focus: 'הגישה הוויזואלית המאתגרת בהימלאיה בין הרים תלולים — תרגול מודרך בסימולטור',
        keywords: ['פרו בהוטן', 'VQPR', 'נחיתה בהימלאיה', 'בואינג 737'],
      },
      en: {
        title: 'Landing at Paro Bhutan (VQPR) Like a Real Crew',
        focus: 'Fly one of aviation’s rarest Himalayan visual approaches with strict energy and bank control',
        keywords: ['Paro Bhutan', 'VQPR approach', 'Boeing 737', 'challenging landing'],
      },
      ru: {
        title: 'Посадка в Паро, Бутан (VQPR) на Boeing 737',
        focus: 'Как экипажи выполняют знаменитый визуальный заход в Гималаях среди горных ущелий',
        keywords: ['Паро Бутан', 'VQPR', 'Boeing 737', 'сложный заход'],
      },
      fr: {
        title: 'Atterrir à Paro Bhoutan (VQPR) en Boeing 737',
        focus: 'Découvrez l’approche visuelle la plus spectaculaire de l’Himalaya aux commandes du 737',
        keywords: ['Paro Bhoutan', 'VQPR', 'Boeing 737', 'approche visuelle'],
      },
      es: {
        title: 'Aterrizar en Paro Bután (VQPR) en Boeing 737',
        focus: 'Vuela una de las aproximaciones visuales más extremas del Himalaya con control preciso',
        keywords: ['Paro Bután', 'VQPR', 'Boeing 737', 'aproximación visual'],
      },
      ar: {
        title: 'الهبوط في مطار بارو بوتان (VQPR) كطاقم حقيقي',
        focus: 'اختبر أحد أصعب الاقترابات البصرية بين جبال الهيمالايا مع التحكم الدقيق في قمرة بوينغ 737',
        keywords: ['بارو بوتان', 'VQPR', 'بوينغ 737', 'هبوط صعب'],
      },
      de: {
        title: 'Landung in Paro Bhutan (VQPR) wie Profis',
        focus: 'Fliegen Sie einen der seltensten Himalaya-Sichtanflüge mit präziser Energiesteuerung',
        keywords: ['Paro Bhutan', 'VQPR', 'Himalaya', 'Boeing 737'],
      },
    },
  },
  'post-20': {
    shortSlug: 'captains-seat-cockpit-review',
    topics: {
      he: {
        title: 'חוות דעת על חוויית טייס במושב קפטן אמיתי',
        focus: 'איך מרגישים בכיסא השמאלי של בואינג 737, מה אומרים המבקרים ולמה זו חוויה ממכרת',
        keywords: ['חוות דעת סימולטור', 'מושב קפטן', 'SimDream', 'בואינג 737'],
      },
      en: {
        title: 'Captain’s Seat Review: Real 737 Cockpit Feel',
        focus: 'Inside look at what visitors experience in the left seat of our 1:1 Boeing 737 simulator',
        keywords: ['cockpit review', 'captain seat', 'SimDream Tel Aviv', 'Boeing 737'],
      },
      ru: {
        title: 'Отзыв о полёте в кресле капитана Boeing 737',
        focus: 'Честный взгляд на ощущения в левом кресле кабины 1:1 и почему гости возвращаются снова',
        keywords: ['отзыв о симуляторе', 'кресло капитана', 'SimDream', 'Boeing 737'],
      },
      fr: {
        title: 'Avis : l’expérience en siège commandant 737',
        focus: 'Plongez dans les sensations réelles du siège gauche sur simulateur Boeing 737 à Tel-Aviv',
        keywords: ['avis simulateur', 'siège commandant', 'SimDream', 'Boeing 737'],
      },
      es: {
        title: 'Opiniones: volar en el asiento de capitán 737',
        focus: 'Descubre qué se siente al mando del asiento izquierdo de un Boeing 737 real en Tel Aviv',
        keywords: ['opiniones simulador', 'asiento capitán', 'SimDream', 'Boeing 737'],
      },
      ar: {
        title: 'تجربة وآراء الزوار في مقعد الكابتن الحقيقي',
        focus: 'نظرة قريبة على مشاعر الطيران من المقعد الأيسر في قمرة بوينغ 737 ولماذا يوصي بها الزوار',
        keywords: ['آراء الزوار', 'مقعد الكابتن', 'SimDream', 'بوينغ 737'],
      },
      de: {
        title: 'Kapitänssitz-Test: Echtes 737-Cockpit-Gefühl',
        focus: 'Einblick in das, was Besucher auf dem linken Sitz unseres 1:1-737-Simulators erleben',
        keywords: ['Kapitänssitz', 'Erfahrungsbericht', 'Boeing 737', 'Tel Aviv'],
      },
    },
  },
  'post-21': {
    shortSlug: 'top-aviation-attractions-israel',
    topics: {
      he: {
        title: 'אטרקציות התעופה המובילות בישראל שאסור לפספס',
        focus: 'מסימולטור בואינג 737 בתל אביב ועד מוזיאון חיל האוויר — המדריך המלא לחובבי טיסה',
        keywords: ['אטרקציות תעופה', 'אטרקציות בישראל', 'סימולטור טיסה', 'תל אביב'],
      },
      en: {
        title: 'Top Aviation Attractions in Israel to Experience',
        focus: 'From Tel Aviv’s 1:1 Boeing 737 flight simulator to iconic aviation spots across Israel',
        keywords: ['aviation attractions Israel', 'Tel Aviv activities', 'Boeing 737', 'flight sim'],
      },
      ru: {
        title: 'Лучшие авиационные развлечения в Израиле',
        focus: 'От тренажёра Boeing 737 в Тель-Авиве до знаковых мест для любителей авиации в Израиле',
        keywords: ['авиация Израиль', 'развлечения Тель-Авив', 'Boeing 737', 'авиасимулятор'],
      },
      fr: {
        title: 'Meilleures attractions aéronautiques en Israël',
        focus: 'Du simulateur Boeing 737 à Tel-Aviv aux lieux incontournables pour les passionnés d’aviation',
        keywords: ['attractions aviation Israël', 'Tel-Aviv', 'Boeing 737', 'simulateur'],
      },
      es: {
        title: 'Mejores atracciones de aviación en Israel',
        focus: 'Desde el simulador Boeing 737 en Tel Aviv hasta experiencias imperdibles para amantes del aire',
        keywords: ['atracciones aviación Israel', 'Tel Aviv', 'Boeing 737', 'simulador'],
      },
      ar: {
        title: 'أبرز معالم وتجارب الطيران في إسرائيل',
        focus: 'من محاكي بوينغ 737 في تل أبيب إلى أبرز الأنشطة لعشاق الطيران والمغامرة الجوية',
        keywords: ['تجارب الطيران', 'أنشطة تل أبيب', 'بوينغ 737', 'محاكي طيران'],
      },
      de: {
        title: 'Top-Luftfahrtattraktionen in Israel erleben',
        focus: 'Vom 1:1-Boeing-737-Simulator in Tel Aviv bis zu ikonischen Luftfahrtorten in Israel',
        keywords: ['Luftfahrtattraktionen', 'Israel', 'Tel Aviv', 'Boeing 737'],
      },
    },
  },
  'post-22': {
    shortSlug: 'digital-flight-gift-voucher-guide',
    topics: {
      he: {
        title: 'מה כולל שובר מתנה דיגיטלי לטיסת סימולטור?',
        focus: 'תדרוך אישי, מושב קברניט, מלווים בקוקפיט ותוקף גמיש — כל מה שנכלל בשובר המתנה',
        keywords: ['שובר מתנה דיגיטלי', 'מתנת טיסה', 'גיפט קארד', 'SimDream'],
      },
      en: {
        title: 'What’s Included in a Digital Flight Gift Voucher',
        focus: 'Pre-flight briefing, captain’s seat, free jumpseat guests, and flexible digital redemption',
        keywords: ['digital gift voucher', 'flight gift card', 'Boeing 737', 'Tel Aviv'],
      },
      ru: {
        title: 'Что входит в цифровой сертификат на симулятор?',
        focus: 'Брифинг с капитаном, место пилота, гости в кабине и гибкая активация онлайн-сертификата',
        keywords: ['цифровой сертификат', 'подарок на полёт', 'Boeing 737', 'SimDream'],
      },
      fr: {
        title: 'Contenu du bon cadeau numérique simulateur 737',
        focus: 'Briefing privé, siège commandant, accompagnants gratuits et réservation en ligne flexible',
        keywords: ['bon cadeau numérique', 'carte cadeau vol', 'Boeing 737', 'SimDream'],
      },
      es: {
        title: 'Qué incluye el bono regalo digital de vuelo 737',
        focus: 'Briefing con capitán, asiento de piloto, acompañantes gratis y canje digital flexible',
        keywords: ['bono regalo digital', 'tarjeta regalo vuelo', 'Boeing 737', 'SimDream'],
      },
      ar: {
        title: 'ماذا تشمل قسيمة الهدية الرقمية لمحاكي الطيران؟',
        focus: 'إحاطة قبل الطيران، مقعد الكابتن، مرافقون مجاناً في القمرة وصلاحية مرنة للحجز الإلكتروني',
        keywords: ['قسيمة هدية رقمية', 'هدية طيران', 'بوينغ 737', 'SimDream'],
      },
      de: {
        title: 'Was ist im digitalen Fluggutschein enthalten?',
        focus: 'Briefing, Kapitänssitz, kostenlose Jumpseat-Gäste und flexible digitale Einlösung',
        keywords: ['Fluggutschein', 'Geschenkkarte', 'Jumpseat', 'Boeing 737'],
      },
    },
  },
  'post-23': {
    shortSlug: 'choose-airport-flight-simulator',
    topics: {
      he: {
        title: 'האם ניתן לבחור שדה תעופה לטיסה בסימולטור?',
        focus: 'מעל 24,000 שדות תעופה בעולם — מבן גוריון ועד אינסברוק, הונג קונג וניו יורק',
        keywords: ['בחירת שדה תעופה', 'בן גוריון', 'סימולטור טיסה', 'בואינג 737'],
      },
      en: {
        title: 'Can You Choose Your Airport in the Simulator?',
        focus: 'Explore 24,000+ real-world airports from Tel Aviv Ben Gurion to Kai Tak, JFK, and Innsbruck',
        keywords: ['choose airport', '24000 airports', 'Boeing 737', 'flight simulator'],
      },
      ru: {
        title: 'Можно ли выбрать аэропорт в авиасимуляторе?',
        focus: 'Более 24 000 аэропортов мира: от Бен-Гуриона до Инсбрука, Кай Така и Нью-Йорка',
        keywords: ['выбор аэропорта', 'Бен-Гурион', 'Boeing 737', 'маршруты'],
      },
      fr: {
        title: 'Peut-on choisir son aéroport en simulateur ?',
        focus: 'Plus de 24 000 aéroports réels disponibles : Ben Gourion, Innsbruck, Kai Tak ou New York',
        keywords: ['choisir aéroport', '24000 aéroports', 'Boeing 737', 'simulateur'],
      },
      es: {
        title: '¿Puedes elegir aeropuerto en el simulador?',
        focus: 'Más de 24.000 aeropuertos reales disponibles: Ben Gurión, Innsbruck, Kai Tak o Nueva York',
        keywords: ['elegir aeropuerto', '24000 aeropuertos', 'Boeing 737', 'simulador'],
      },
      ar: {
        title: 'هل يمكن اختيار المطار في جهاز محاكاة الطيران؟',
        focus: 'أكثر من 24,000 مطار حقيقي حول العالم من بن غوريون إلى إنسبروك ونيويورك وهونغ كونغ',
        keywords: ['اختيار المطار', '24000 مطار', 'بوينغ 737', 'محاكي طيران'],
      },
      de: {
        title: 'Kann man den Flughafen im Simulator wählen?',
        focus: 'Entdecken Sie über 24.000 echte Flughäfen von Ben Gurion bis Kai Tak, JFK und Innsbruck',
        keywords: ['24000 Flughäfen', 'Wunschziel', 'Boeing 737', 'Flugsimulator'],
      },
    },
  },
  'post-24': {
    shortSlug: 'original-partner-surprise-flight',
    topics: {
      he: {
        title: 'הפתעות מקוריות לבן או בת הזוג שבאמת זוכרים',
        focus: 'הפתיעו את בן הזוג בהטסת בואינג 737 אמיתי — רעיון מרגש ליום שנה, יום הולדת או הצעה',
        keywords: ['הפתעה לבן זוג', 'מתנה מקורית', 'יום נישואין', 'סימולטור טיסה'],
      },
      en: {
        title: 'Original Partner Surprise: Pilot a Boeing 737',
        focus: 'Plan an unforgettable surprise for your partner with a private Boeing 737 flight session',
        keywords: ['partner surprise', 'anniversary gift', 'Boeing 737', 'Tel Aviv'],
      },
      ru: {
        title: 'Оригинальный сюрприз для любимого: Boeing 737',
        focus: 'Удивите партнёра приватным полётом в кабине Boeing 737 на годовщину или день рождения',
        keywords: ['сюрприз для партнёра', 'годовщина', 'Boeing 737', 'подарок'],
      },
      fr: {
        title: 'Surprise originale pour votre partenaire en 737',
        focus: 'Organisez une surprise inoubliable aux commandes d’un Boeing 737 pour votre moitié',
        keywords: ['surprise couple', 'anniversaire', 'Boeing 737', 'Tel-Aviv'],
      },
      es: {
        title: 'Sorpresa original para tu pareja en Boeing 737',
        focus: 'Organiza una sorpresa inolvidable en la cabina de un Boeing 737 para tu aniversario',
        keywords: ['sorpresa pareja', 'aniversario', 'Boeing 737', 'Tel Aviv'],
      },
      ar: {
        title: 'مفاجأة مبتكرة لشريك حياتك في قمرة بوينغ 737',
        focus: 'اصنع لحظة لا تُنسى بمفاجأة شريكك بقيادة طائرة بوينغ 737 في ذكرى زواج أو مناسبة خاصة',
        keywords: ['مفاجأة للشريك', 'هدية ذكرى', 'بوينغ 737', 'تل أبيب'],
      },
      de: {
        title: 'Originelle Partner-Überraschung: 737 fliegen',
        focus: 'Planen Sie eine unvergessliche Überraschung mit einer privaten Boeing-737-Sitzung',
        keywords: ['Partner-Überraschung', 'Geschenkidee', 'Boeing 737', 'Tel Aviv'],
      },
    },
  },
  'post-25': {
    shortSlug: 'home-vs-pro-flight-simulator',
    topics: {
      he: {
        title: 'סימולטור ביתי מול מקצועי: מה באמת מרגישים?',
        focus: 'ההבדל בין משחק מחשב ביתי לבין תא טייס 1:1 עם הגאים ממונעים ואוויוניקה אמיתית',
        keywords: ['סימולטור ביתי מול מקצועי', 'תא טייס 1:1', 'בואינג 737', 'SimDream'],
      },
      en: {
        title: 'Home vs. Professional Flight Simulator Compared',
        focus: 'Why a 1:1 Boeing 737 cockpit with motorized controls feels nothing like a desktop setup',
        keywords: ['home vs pro simulator', '1:1 cockpit', 'Boeing 737', 'control loading'],
      },
      ru: {
        title: 'Домашний vs профессиональный авиасимулятор',
        focus: 'Чем кабина Boeing 737 в масштабе 1:1 с загрузкой штурвала отличается от домашнего ПК',
        keywords: ['домашний и профи симулятор', 'кабина 1:1', 'Boeing 737', 'сравнение'],
      },
      fr: {
        title: 'Simulateur maison vs professionnel : différences',
        focus: 'Pourquoi un vrai cockpit Boeing 737 1:1 motorisé n’a rien à voir avec un simulateur PC',
        keywords: ['simulateur pro vs maison', 'cockpit 1:1', 'Boeing 737', 'comparatif'],
      },
      es: {
        title: 'Simulador casero vs profesional: qué cambia',
        focus: 'Por qué una cabina Boeing 737 1:1 motorizada ofrece sensaciones imposibles en casa',
        keywords: ['simulador casero vs pro', 'cabina 1:1', 'Boeing 737', 'comparativa'],
      },
      ar: {
        title: 'المحاكي المنزلي مقابل الاحترافي: ما الفرق الفعلي؟',
        focus: 'لماذا لا تُقارن قمرة بوينغ 737 بمقياس 1:1 وأدوات التحكم الآلية بأي جهاز منزلي',
        keywords: ['محاكي منزلي واحترافي', 'قمرة 1:1', 'بوينغ 737', 'مقارنة'],
      },
      de: {
        title: 'Heim- vs. Profi-Flugsimulator im Vergleich',
        focus: 'Warum sich ein 1:1-Boeing-737-Cockpit mit Motorsteuerung völlig anders anfühlt',
        keywords: ['Profi-Simulator', 'Heimsimulator', 'Boeing 737', 'Vergleich'],
      },
    },
  },
  'post-26': {
    shortSlug: 'virtual-flight-world-destinations',
    topics: {
      he: {
        title: 'טיסה וירטואלית ליעדים בעולם: כך זה מרגיש',
        focus: 'ממריאים מתל אביב ונוחתים באירופה, אסיה או אמריקה בתוך קוקפיט בואינג 737 מלא',
        keywords: ['טיסה וירטואלית', 'יעדים בעולם', 'בואינג 737', 'סימולטור טיסה'],
      },
      en: {
        title: 'Virtual Flight to World Destinations in a 737',
        focus: 'Take off from Tel Aviv and land at iconic global cities in a full-scale Boeing 737 cockpit',
        keywords: ['virtual flight', 'world destinations', 'Boeing 737', 'Tel Aviv'],
      },
      ru: {
        title: 'Виртуальный полёт по миру в кабине Boeing 737',
        focus: 'Вылетайте из Тель-Авива и садитесь в знаменитых городах мира с реальной навигацией',
        keywords: ['виртуальный полёт', 'маршруты мира', 'Boeing 737', 'Тель-Авив'],
      },
      fr: {
        title: 'Vol virtuel vers le monde entier en Boeing 737',
        focus: 'Décollez de Tel-Aviv vers les plus belles destinations du globe en cockpit 1:1 complet',
        keywords: ['vol virtuel', 'destinations monde', 'Boeing 737', 'Tel-Aviv'],
      },
      es: {
        title: 'Vuelo virtual a destinos del mundo en Boeing 737',
        focus: 'Despega desde Tel Aviv hacia las ciudades más icónicas del planeta en cabina 1:1',
        keywords: ['vuelo virtual', 'destinos del mundo', 'Boeing 737', 'Tel Aviv'],
      },
      ar: {
        title: 'رحلة طيران افتراضية إلى وجهات العالم في 737',
        focus: 'أقلع من تل أبيب واهبط في أشهر مطارات العالم داخل قمرة قيادة بوينغ 737 مكتملة',
        keywords: ['طيران افتراضي', 'وجهات العالم', 'بوينغ 737', 'تل أبيب'],
      },
      de: {
        title: 'Virtueller Flug zu Weltzielen in der 737',
        focus: 'Starten Sie in Tel Aviv und landen Sie in Weltmetropolen im originalgroßen Cockpit',
        keywords: ['Weltziele', 'Virtueller Flug', 'Boeing 737', 'Tel Aviv'],
      },
    },
  },
  'post-27': {
    shortSlug: 'overcome-fear-of-flying-methods',
    topics: {
      he: {
        title: 'שיטות יעילות להפגת פחד טיסה וחרדת טיסות',
        focus: 'איך מבינים רעשי מטוס וכיסי אוויר ורוכשים ביטחון אמיתי בקוקפיט עם קברניט מנוסה',
        keywords: ['פחד טיסה', 'חרדת טיסה', 'טיפול בפחד טיסה', 'סימולטור'],
      },
      en: {
        title: 'Effective Methods to Overcome Fear of Flying',
        focus: 'Understand aircraft sounds, turbulence, and cockpit safety with a calm airline captain',
        keywords: ['fear of flying', 'flight anxiety', 'turbulence safety', 'Tel Aviv'],
      },
      ru: {
        title: 'Как преодолеть аэрофобию и страх полётов',
        focus: 'Разберитесь в природе турбулентности и звуках самолёта в спокойной обстановке с капитаном',
        keywords: ['аэрофобия', 'страх полётов', 'преодоление страха', 'Boeing 737'],
      },
      fr: {
        title: 'Méthodes efficaces pour vaincre la peur de l’avion',
        focus: 'Comprenez les bruits de cabine et les turbulences avec un commandant rassurant en cockpit',
        keywords: ['peur de l avion', 'aviophobie', 'turbulences', 'Tel-Aviv'],
      },
      es: {
        title: 'Métodos para superar el miedo a volar en avión',
        focus: 'Comprende los sonidos del avión y las turbulencias junto a un capitán en cabina real',
        keywords: ['miedo a volar', 'aerofobia', 'turbulencias', 'Tel Aviv'],
      },
      ar: {
        title: 'طرق فعّالة للتغلب على الخوف من الطيران',
        focus: 'افهم أصوات الطائرة والمطبات الهوائية واكتسب الطمأنينة والثقة داخل القمرة مع كابتن خبير',
        keywords: ['الخوف من الطيران', 'فوبيا الطيران', 'المطبات الهوائية', 'تل أبيب'],
      },
      de: {
        title: 'Flugangst wirksam überwinden im Cockpit',
        focus: 'Verstehen Sie Flugzeuggeräusche, Turbulenzen und Sicherheit mit einem ruhigen Kapitän',
        keywords: ['Flugangst', 'Flugangst überwinden', 'Boeing 737', 'Tel Aviv'],
      },
    },
  },
  'post-28': {
    shortSlug: 'flight-simulator-tel-aviv-guide',
    topics: {
      he: {
        title: 'חוויה בתל אביב בסימולטור טיסה: כל היתרונות',
        focus: 'מרכז הבואינג 737 בלב תל אביב — נגישות מעולה, מדריכים טייסים ואווירה בינלאומית',
        keywords: ['סימולטור טיסה תל אביב', 'אטרקציה בתל אביב', 'בואינג 737', 'SimDream'],
      },
      en: {
        title: 'Flight Simulator Experience in Tel Aviv: Guide',
        focus: 'Why SimDream in central Tel Aviv is Israel’s premier Boeing 737 cockpit destination',
        keywords: ['flight simulator Tel Aviv', 'things to do Tel Aviv', 'Boeing 737', 'SimDream'],
      },
      ru: {
        title: 'Авиасимулятор в Тель-Авиве: главные преимущества',
        focus: 'Почему центр Boeing 737 в центре Тель-Авива — лучшее место для первого полёта и подарка',
        keywords: ['симулятор Тель-Авив', 'досуг Тель-Авив', 'Boeing 737', 'SimDream'],
      },
      fr: {
        title: 'Simulateur de vol à Tel-Aviv : les avantages',
        focus: 'Découvrez pourquoi SimDream au cœur de Tel-Aviv est la référence du Boeing 737 en Israël',
        keywords: ['simulateur Tel-Aviv', 'activités Tel-Aviv', 'Boeing 737', 'SimDream'],
      },
      es: {
        title: 'Simulador de vuelo en Tel Aviv: guía completa',
        focus: 'Descubre por qué SimDream en el centro de Tel Aviv es la mejor experiencia Boeing 737',
        keywords: ['simulador Tel Aviv', 'qué hacer Tel Aviv', 'Boeing 737', 'SimDream'],
      },
      ar: {
        title: 'تجربة محاكي الطيران في تل أبيب: المزايا الكاملة',
        focus: 'تعرّف على مزايا مركز بوينغ 737 في قلب تل أبيب وسهولة الوصول والتدريب مع طيارين محترفين',
        keywords: ['محاكي طيران تل أبيب', 'أنشطة تل أبيب', 'بوينغ 737', 'SimDream'],
      },
      de: {
        title: 'Flugsimulator-Erlebnis in Tel Aviv: Guide',
        focus: 'Warum SimDream im Zentrum von Tel Aviv Israels führendes 737-Cockpit-Erlebnis ist',
        keywords: ['Flugsimulator Tel Aviv', 'SimDream', 'Boeing 737', 'Erlebnis'],
      },
    },
  },
  'post-29': {
    shortSlug: 'historic-airline-approaches-guide',
    topics: {
      he: {
        title: 'מדריך לגישות היסטוריות מפורסמות בטיסות נוסעים',
        focus: 'ממסלול 13 בקאי טאק ועד גישת הנהר לרייגן — סיפורן של הגישות האייקוניות בתעופה',
        keywords: ['גישות היסטוריות', 'קאי טאק', 'תעופה אזרחית', 'בואינג 737'],
      },
      en: {
        title: 'Guide to Historic Commercial Airline Approaches',
        focus: 'Explore legendary approaches like Kai Tak Runway 13 and River Visual in our 737 simulator',
        keywords: ['historic approaches', 'Kai Tak', 'airline history', 'Boeing 737'],
      },
      ru: {
        title: 'Гид по легендарным историческим заходам в авиации',
        focus: 'От полосы 13 в Кай Таке до речного захода: история культовых манёвров гражданской авиации',
        keywords: ['исторические заходы', 'Кай Так', 'гражданская авиация', 'Boeing 737'],
      },
      fr: {
        title: 'Guide des approches historiques de l’aviation',
        focus: 'Revivez les approches mythiques comme Kai Tak piste 13 aux commandes du Boeing 737',
        keywords: ['approches historiques', 'Kai Tak', 'histoire aviation', 'Boeing 737'],
      },
      es: {
        title: 'Guía de aproximaciones históricas de aerolíneas',
        focus: 'Explora maniobras legendarias como la pista 13 de Kai Tak en nuestro simulador 737',
        keywords: ['aproximaciones históricas', 'Kai Tak', 'historia aviación', 'Boeing 737'],
      },
      ar: {
        title: 'دليل أشهر الاقترابات التاريخية في طيران الركاب',
        focus: 'استكشف أشهر مسارات الهبوط الأسطورية مثل مدرج 13 في كاي تاك داخل محاكي بوينغ 737',
        keywords: ['اقترابات تاريخية', 'كاي تاك', 'تاريخ الطيران', 'بوينغ 737'],
      },
      de: {
        title: 'Guide zu legendären Airline-Anflügen',
        focus: 'Erleben Sie berühmte Anflüge wie Kai Tak Piste 13 und River Visual im 737-Simulator',
        keywords: ['Legendäre Anflüge', 'Kai Tak', 'River Visual', 'Boeing 737'],
      },
    },
  },
  'post-30': {
    shortSlug: 'corporate-team-building-flight-sim',
    topics: {
      he: {
        title: 'טרנדים באירועי חברה וגיבוש צוות בקוקפיט',
        focus: 'סדנאות CRM, תקשורת תחת לחץ והטסת בואינג 737 כפעילות גיבוש מנהלים וצוותים',
        keywords: ['אירועי חברה', 'גיבוש צוות', 'סדנאות CRM', 'תל אביב'],
      },
      en: {
        title: 'Corporate Team Building Trends in a 737 Cockpit',
        focus: 'Boost leadership and CRM communication with high-impact Boeing 737 team workshops',
        keywords: ['corporate team building', 'CRM workshop', 'executive offsite', 'Tel Aviv'],
      },
      ru: {
        title: 'Тренды тимбилдинга: командный полёт на 737',
        focus: 'Развивайте лидерство и коммуникацию CRM в корпоративных воркшопах в кабине Boeing 737',
        keywords: ['тимбилдинг', 'корпоратив', 'CRM воркшоп', 'Тель-Авив'],
      },
      fr: {
        title: 'Tendances team building : séminaire en Boeing 737',
        focus: 'Renforcez la cohésion et la communication CRM de vos équipes dans un vrai cockpit',
        keywords: ['team building', 'séminaire entreprise', 'CRM cockpit', 'Tel-Aviv'],
      },
      es: {
        title: 'Tendencias de team building en simulador 737',
        focus: 'Potencia el liderazgo y la comunicación CRM de tu equipo con talleres en cabina 737',
        keywords: ['team building', 'eventos corporativos', 'taller CRM', 'Tel Aviv'],
      },
      ar: {
        title: 'اتجاهات فعاليات الشركات وبناء الفرق في القمرة',
        focus: 'عزّز مهارات القيادة والتواصل تحت الضغط من خلال ورش عمل CRM في محاكي بوينغ 737',
        keywords: ['فعاليات شركات', 'بناء فرق', 'ورش CRM', 'تل أبيب'],
      },
      de: {
        title: 'Teambuilding-Trends im Boeing-737-Cockpit',
        focus: 'Stärken Sie Führung und CRM-Kommunikation mit wirkungsvollen 737-Team-Workshops',
        keywords: ['Teambuilding', 'CRM-Workshop', 'Führung', 'Boeing 737'],
      },
    },
  },
  'post-31': {
    shortSlug: 'program-fmc-route-boeing-737',
    topics: {
      he: {
        title: 'איך מתכנתים נתיב ב-FMC בסימולטור בואינג 737',
        focus: 'מדריך צעד-אחר-צעד להזנת SID, נתיבים, STAR וביצועים במחשב הטיסה CDU של 737',
        keywords: ['תכנות FMC', 'CDU בואינג 737', 'תכנון טיסה', 'הכנה למיונים'],
      },
      en: {
        title: 'How to Program a Flight Route in the 737 FMC',
        focus: 'Step-by-step guide to entering routes, SIDs, STARs, and performance in the Boeing 737 CDU',
        keywords: ['Boeing 737 FMC', 'CDU programming', 'flight planning', 'pilot training'],
      },
      ru: {
        title: 'Как запрограммировать маршрут в FMC Boeing 737',
        focus: 'Пошаговый разбор ввода маршрута, схем SID/STAR и расчёта параметров в CDU Boeing 737',
        keywords: ['программирование FMC', 'CDU Boeing 737', 'план полёта', 'обучение'],
      },
      fr: {
        title: 'Programmer une route FMC sur Boeing 737',
        focus: 'Guide étape par étape pour saisir route, SID, STAR et performances dans le CDU 737',
        keywords: ['programmation FMC', 'CDU Boeing 737', 'plan de vol', 'formation'],
      },
      es: {
        title: 'Cómo programar una ruta en el FMC del 737',
        focus: 'Guía paso a paso para introducir rutas, SID, STAR y rendimiento en el CDU Boeing 737',
        keywords: ['programar FMC', 'CDU Boeing 737', 'plan de vuelo', 'piloto'],
      },
      ar: {
        title: 'كيفية برمجة مسار الرحلة في FMC بوينغ 737',
        focus: 'دليل خطوة بخطوة لإدخال مسار الطيران وإجراءات SID وSTAR في حاسوب الرحلة CDU',
        keywords: ['برمجة FMC', 'CDU بوينغ 737', 'تخطيط الرحلة', 'تدريب'],
      },
      de: {
        title: 'Flugroute im 737-FMC programmieren: Guide',
        focus: 'Schritt-für-Schritt-Anleitung für Routen, SIDs, STARs und Leistung in der 737-CDU',
        keywords: ['FMC', 'CDU', 'Flugplanung', 'Boeing 737'],
      },
    },
  },
  'post-32': {
    shortSlug: 'kai-tak-landing-simulator-turn',
    topics: {
      he: {
        title: 'נחיתת קאי טאק בסימולטור: הפנייה שלא שוכחים',
        focus: 'הכירו את גישת ה-Checkerboard המפורסמת בהונג קונג ובואו לבצע אותה בקוקפיט 737',
        keywords: ['קאי טאק', 'נחיתה הונג קונג', 'בואינג 737', 'אתגר טיסה'],
      },
      en: {
        title: 'Kai Tak Landing Simulator: The Iconic 47° Turn',
        focus: 'Experience Hong Kong’s legendary Checkerboard visual turn onto Runway 13 in a Boeing 737',
        keywords: ['Kai Tak landing', 'Checkerboard approach', 'Boeing 737', 'Hong Kong'],
      },
      ru: {
        title: 'Посадка в Кай Таке: знаменитый разворот на 737',
        focus: 'Испытайте легендарный визуальный заход на полосу 13 в Гонконге в кабине Boeing 737',
        keywords: ['посадка Кай Так', 'Гонконг VHHX', 'Boeing 737', 'симулятор'],
      },
      fr: {
        title: 'Atterrissage Kai Tak en simulateur Boeing 737',
        focus: 'Vivez le légendaire virage à vue Checkerboard vers la piste 13 de Hong Kong en cockpit',
        keywords: ['atterrissage Kai Tak', 'VHHX', 'Boeing 737', 'simulateur'],
      },
      es: {
        title: 'Aterrizaje en Kai Tak: el giro mítico en 737',
        focus: 'Vive el legendario viraje visual Checkerboard hacia la pista 13 de Hong Kong en cabina',
        keywords: ['aterrizaje Kai Tak', 'VHHX', 'Boeing 737', 'simulador'],
      },
      ar: {
        title: 'الهبوط في مطار كاي تاك: المنعطف الذي لا يُنسى',
        focus: 'اختبر الانعطاف البصري الأسطوري نحو المدرج 13 في هونغ كونغ داخل قمرة بوينغ 737',
        keywords: ['هبوط كاي تاك', 'VHHX', 'بوينغ 737', 'محاكي طيران'],
      },
      de: {
        title: 'Kai-Tak-Landesimulator: Die 47°-Kurve',
        focus: 'Erleben Sie Hongkongs legendäre Checkerboard-Sichtkurve auf Piste 13 in der 737',
        keywords: ['Kai Tak', 'Checkerboard', 'Hongkong', 'Boeing 737'],
      },
    },
  },
  'post-33': {
    shortSlug: 'family-flight-simulator-activity',
    topics: {
      he: {
        title: 'פעילות משפחתית מיוחדת שלא שוכחים בתל אביב',
        focus: 'בילוי משפחתי מגיל 10 ומעלה: הילדים מטיסים והמשפחה צופה מתוך הקוקפיט בחינם',
        keywords: ['פעילות משפחתית', 'אטרקציה למשפחה', 'תל אביב', 'סימולטור טיסה'],
      },
      en: {
        title: 'Unforgettable Family Activity in Tel Aviv',
        focus: 'A thrilling family cockpit adventure for ages 10+ with free jumpseat seating for guests',
        keywords: ['family activity Tel Aviv', 'kids flight sim', 'Boeing 737', 'Tel Aviv'],
      },
      ru: {
        title: 'Незабываемый семейный досуг в Тель-Авиве',
        focus: 'Увлекательный полёт для всей семьи от 10 лет с бесплатными местами для близких в кабине',
        keywords: ['семейный досуг', 'Тель-Авив с детьми', 'Boeing 737', 'симулятор'],
      },
      fr: {
        title: 'Activité familiale inoubliable à Tel-Aviv',
        focus: 'Une aventure en famille dès 10 ans où chacun profite du vol ensemble depuis le cockpit',
        keywords: ['activité famille', 'Tel-Aviv enfants', 'Boeing 737', 'simulateur'],
      },
      es: {
        title: 'Actividad familiar inolvidable en Tel Aviv',
        focus: 'Una aventura en cabina para toda la familia desde los 10 años con acompañantes gratis',
        keywords: ['actividad familiar', 'Tel Aviv niños', 'Boeing 737', 'simulador'],
      },
      ar: {
        title: 'نشاط عائلي مميز في تل أبيب لا يُنسى',
        focus: 'مغامرة عائلية مشوقة للأعمار من 10 سنوات فأكثر مع مقاعد مجانية للمرافقين داخل القمرة',
        keywords: ['نشاط عائلي', 'تل أبيب', 'بوينغ 737', 'محاكي طيران'],
      },
      de: {
        title: 'Unvergessliche Familienaktivität in Tel Aviv',
        focus: 'Ein spannendes Familienabenteuer ab 10 Jahren mit kostenlosen Jumpseat-Plätzen',
        keywords: ['Familienaktivität', 'Tel Aviv', 'Kinder ab 10', 'Boeing 737'],
      },
    },
  },
  'post-34': {
    shortSlug: 'best-aviation-attractions-israel',
    topics: {
      he: {
        title: 'אטרקציות התעופה המומלצות בישראל לחובבי טיס',
        focus: 'רשימת חוויות התעופה הטובות בארץ — למה סימולטור בואינג 737 מוביל בדירוגים',
        keywords: ['אטרקציות תעופה ישראל', 'חוויית טיסה', 'סימולטור 737', 'תל אביב'],
      },
      en: {
        title: 'Best Aviation Attractions in Israel Ranked',
        focus: 'Discover Israel’s top-rated flight experiences and why SimDream’s 737 cockpit leads the list',
        keywords: ['best aviation Israel', 'flight experience', 'Boeing 737', 'Tel Aviv'],
      },
      ru: {
        title: 'Топ авиационных впечатлений в Израиле',
        focus: 'Обзор лучших мест для любителей неба и почему кабина Boeing 737 занимает первое место',
        keywords: ['лучшее для любителей авиации', 'Израиль', 'Boeing 737', 'SimDream'],
      },
      fr: {
        title: 'Meilleures expériences aéronautiques en Israël',
        focus: 'Découvrez les meilleures activités aériennes du pays et le simulateur Boeing 737 n°1',
        keywords: ['expériences aériennes Israël', 'Boeing 737', 'Tel-Aviv', 'SimDream'],
      },
      es: {
        title: 'Las mejores experiencias de aviación en Israel',
        focus: 'Conoce las mejores actividades aeronáuticas del país y por qué el Boeing 737 lidera',
        keywords: ['experiencias aviación Israel', 'Boeing 737', 'Tel Aviv', 'SimDream'],
      },
      ar: {
        title: 'أفضل وجهات وتجارب الطيران في إسرائيل',
        focus: 'تعرّف على أفضل الأنشطة الجوية ولماذا يتصدّر محاكي بوينغ 737 التقييمات في تل أبيب',
        keywords: ['أفضل تجارب الطيران', 'بوينغ 737', 'تل أبيب', 'SimDream'],
      },
      de: {
        title: 'Beste Luftfahrtattraktionen in Israel im Test',
        focus: 'Entdecken Sie Israels bestbewertete Flugerlebnisse und warum SimDream vorn liegt',
        keywords: ['Beste Attraktionen', 'Israel', 'Flugerlebnis', 'Boeing 737'],
      },
    },
  },
  'post-35': {
    shortSlug: 'why-read-flight-simulator-blogs',
    topics: {
      he: {
        title: 'למה כדאי לקרוא בלוג סימולטורי טיסה לפני שמגיעים',
        focus: 'איך הכנה קצרה וטיפים מקצועיים הופכים את הטיסה הראשונה בקוקפיט לחלקה ומרגשת יותר',
        keywords: ['בלוג תעופה', 'סימולטור טיסה', 'טיפים לטיסה', 'SimDream'],
      },
      en: {
        title: 'Why Read Flight Simulator Blogs Before Flying',
        focus: 'How cockpit guides and pilot tips help you get more out of your Boeing 737 simulator session',
        keywords: ['flight simulator blog', 'cockpit tips', 'Boeing 737', 'SimDream'],
      },
      ru: {
        title: 'Зачем читать блог об авиасимуляторах до полёта',
        focus: 'Как советы капитанов и разборы заходов делают вашу первую сессию на Boeing 737 ярче',
        keywords: ['блог об авиасимуляторе', 'советы пилотов', 'Boeing 737', 'SimDream'],
      },
      fr: {
        title: 'Pourquoi lire notre blog simulateur avant de voler',
        focus: 'Comment nos guides de cockpit enrichissent votre première session sur simulateur Boeing 737',
        keywords: ['blog simulateur de vol', 'conseils cockpit', 'Boeing 737', 'SimDream'],
      },
      es: {
        title: 'Por qué leer nuestro blog antes de volar el 737',
        focus: 'Cómo las guías de cabina y consejos de capitanes mejoran tu sesión en el simulador',
        keywords: ['blog simulador vuelo', 'consejos cabina', 'Boeing 737', 'SimDream'],
      },
      ar: {
        title: 'لماذا تقرأ مدونة محاكاة الطيران قبل تجربتك؟',
        focus: 'كيف تساعدك شروحات القمرة ونصائح الطيارين على تحقيق أقصى متعة في جلستك الأولى',
        keywords: ['مدونة الطيران', 'نصائح القمرة', 'بوينغ 737', 'SimDream'],
      },
      de: {
        title: 'Warum Flugsimulator-Blogs vor dem Flug lesen?',
        focus: 'Wie Cockpit-Guides und Pilotentipps helfen, mehr aus Ihrer 737-Sitzung herauszuholen',
        keywords: ['Flugsimulator Blog', 'Cockpit-Tipps', 'Vorbereitung', 'Boeing 737'],
      },
    },
  },
  'post-36': {
    shortSlug: 'boeing-737-vs-airbus-differences',
    topics: {
      he: {
        title: 'בואינג 737 לעומת איירבוס A320: מה באמת שונה?',
        focus: 'הגה Yoke מול Sidestick, פילוסופיית אוטומציה, ארגונומיה ותחושת ההטסה בידיים',
        keywords: ['בואינג מול איירבוס', '737 vs A320', 'הגה קוקפיט', 'תעופה'],
      },
      en: {
        title: 'Boeing 737 vs Airbus A320: Real Differences',
        focus: 'Compare yoke vs sidestick, automation philosophy, and hands-on cockpit ergonomics in flight',
        keywords: ['Boeing 737 vs Airbus', 'yoke vs sidestick', 'cockpit design', 'aviation'],
      },
      ru: {
        title: 'Boeing 737 против Airbus A320: главные отличия',
        focus: 'Штурвал против сайдстика, логика автоматики и ощущения пилота в кабине двух лайнеров',
        keywords: ['Boeing 737 vs Airbus', 'штурвал и сайдстик', 'кабина', 'авиация'],
      },
      fr: {
        title: 'Boeing 737 vs Airbus A320 : vraies différences',
        focus: 'Manche Yoke contre minimanche, philosophie d’automatisation et sensations en pilotage réel',
        keywords: ['Boeing 737 vs Airbus', 'yoke sidestick', 'cockpit', 'aviation'],
      },
      es: {
        title: 'Boeing 737 vs Airbus A320: diferencias reales',
        focus: 'Compara cuernos vs sidestick, automatización y sensaciones reales de mando en cabina',
        keywords: ['Boeing 737 vs Airbus', 'yoke vs sidestick', 'cabina', 'aviación'],
      },
      ar: {
        title: 'بوينغ 737 مقابل إيرباص A320: الفروق الحقيقية',
        focus: 'مقارنة بين مقود الطيران التقليدي والعصا الجانبية وفلسفة الأتمتة وإحساس القيادة الفعلي',
        keywords: ['بوينغ ضد إيرباص', '737 مقابل A320', 'قمرة القيادة', 'طيران'],
      },
      de: {
        title: 'Boeing 737 vs. Airbus A320: Echte Unterschiede',
        focus: 'Vergleichen Sie Steuerhorn vs. Sidestick, Automatisierung und Cockpit-Ergonomie',
        keywords: ['Boeing 737 vs Airbus A320', 'Steuerhorn', 'Sidestick', 'Cockpit'],
      },
    },
  },
  'post-37': {
    shortSlug: 'kai-tak-runway-13-approach-737',
    topics: {
      he: {
        title: 'מדריך גישת קאי טאק: נחיתת 737 על מסלול 13',
        focus: 'תכנון מדויק של הפנייה החזותית, שמירת מהירות וגובה בגישה המפורסמת בעולם',
        keywords: ['מדריך קאי טאק', 'מסלול 13', 'נחיתת 737', 'סימולטור'],
      },
      en: {
        title: 'Kai Tak Runway 13 Approach Guide in a 737',
        focus: 'How to fly the IGS Runway 13 visual turn, manage altitude gates, and nail the flare',
        keywords: ['Kai Tak Runway 13', 'IGS 13', 'Boeing 737', 'approach guide'],
      },
      ru: {
        title: 'Гайд по заходу Кай Так на полосу 13 (Boeing 737)',
        focus: 'Профиль снижения IGS 13, контрольные высоты и точный визуальный разворот на посадку',
        keywords: ['Кай Так полоса 13', 'IGS 13', 'Boeing 737', 'гайд'],
      },
      fr: {
        title: 'Guide approche Kai Tak piste 13 en Boeing 737',
        focus: 'Planifiez la descente IGS 13, le virage à vue et l’alignement final sur la piste mythique',
        keywords: ['Kai Tak piste 13', 'IGS 13', 'Boeing 737', 'guide approche'],
      },
      es: {
        title: 'Guía aproximación Kai Tak pista 13 en 737',
        focus: 'Cómo planificar la aproximación IGS 13, altitudes clave y viraje final en Boeing 737',
        keywords: ['Kai Tak pista 13', 'IGS 13', 'Boeing 737', 'guía'],
      },
      ar: {
        title: 'دليل اقتراب كاي تاك والهبوط على المدرج 13',
        focus: 'شرح دقيق لتخطيط الانعطاف البصري IGS 13 وضبط الارتفاع والسرعة في بوينغ 737',
        keywords: ['كاي تاك مدرج 13', 'IGS 13', 'بوينغ 737', 'دليل هبوط'],
      },
      de: {
        title: 'Kai Tak Piste 13 Anflug-Guide in der 737',
        focus: 'Wie man die IGS-13-Sichtkurve fliegt, Höhenfenster hält und sauber aufsetzt',
        keywords: ['Kai Tak Piste 13', 'IGS 13', 'Anflug-Guide', 'Boeing 737'],
      },
    },
  },
  'post-38': {
    shortSlug: 'choose-boeing-737-flight-package',
    topics: {
      he: {
        title: 'איך לבחור חוויית בואינג 737 שמתאימה לכם',
        focus: 'טיסת היכרות, מפקד קוקפיט או אודיסאה של 90 דקות — מדריך לבחירת החבילה המדויקת',
        keywords: ['בחירת חבילת טיסה', 'חוויית בואינג 737', 'סימולטור', 'SimDream'],
      },
      en: {
        title: 'How to Choose Your Boeing 737 Flight Package',
        focus: 'Match your experience level and goals to our 30, 45, 60, or 90-minute simulator sessions',
        keywords: ['choose flight package', 'Boeing 737 packages', 'Tel Aviv', 'SimDream'],
      },
      ru: {
        title: 'Как выбрать подходящий пакет полёта Boeing 737',
        focus: 'Сравниваем программы 30, 45, 60 и 90 минут под ваш уровень, интересы и формат визита',
        keywords: ['выбор пакета полёта', 'Boeing 737', 'Тель-Авив', 'SimDream'],
      },
      fr: {
        title: 'Comment choisir votre forfait Boeing 737',
        focus: 'Trouvez la formule 30, 45, 60 ou 90 minutes adaptée à vos envies et votre niveau',
        keywords: ['choisir forfait vol', 'Boeing 737', 'Tel-Aviv', 'SimDream'],
      },
      es: {
        title: 'Cómo elegir tu paquete de vuelo Boeing 737',
        focus: 'Encuentra la sesión de 30, 45, 60 o 90 minutos perfecta para tu nivel y objetivos',
        keywords: ['elegir paquete vuelo', 'Boeing 737', 'Tel Aviv', 'SimDream'],
      },
      ar: {
        title: 'كيف تختار باقة طيران بوينغ 737 المناسبة لك',
        focus: 'قارن بين جلسات 30 و45 و60 و90 دقيقة واختر التجربة الأنسب لمستواك وأهدافك',
        keywords: ['اختيار باقة طيران', 'بوينغ 737', 'تل أبيب', 'SimDream'],
      },
      de: {
        title: 'Das richtige Boeing-737-Flugpaket wählen',
        focus: 'Passen Sie Erfahrungslevel und Ziele an unsere 30-, 45-, 60- oder 90-Minuten-Flüge an',
        keywords: ['Flugpaket wählen', '30 60 90 Minuten', 'Boeing 737', 'Tel Aviv'],
      },
    },
  },
  'post-39': {
    shortSlug: 'airline-pilot-interview-tips',
    topics: {
      he: {
        title: 'איך מתכוננים לראיון טייס בחברת תעופה בצורה חכמה',
        focus: 'בניית תיק טייס, תרגול Raw Data, עבודת צוות והרשמת הבוחנים במיוני חברות התעופה',
        keywords: ['ראיון טייס', 'מיונים לחברת תעופה', 'Raw Data', 'סימולטור PRO'],
      },
      en: {
        title: 'How to Prepare Smartly for a Pilot Interview',
        focus: 'Sharpen raw-data flying, CRM briefings, and technical answers before your airline check',
        keywords: ['pilot interview tips', 'airline screening', 'raw data flying', 'Boeing 737'],
      },
      ru: {
        title: 'Как грамотно подготовиться к интервью пилота',
        focus: 'Отработка полётов по приборам, CRM и технических вопросов перед отбором в авиакомпанию',
        keywords: ['интервью пилота', 'отбор в авиакомпанию', 'raw data', 'Boeing 737'],
      },
      fr: {
        title: 'Préparer intelligemment un entretien pilote',
        focus: 'Perfectionnez le vol sans PA, le CRM et vos réponses techniques pour réussir la sélection',
        keywords: ['entretien pilote', 'sélection compagnie', 'vol manuel', 'Boeing 737'],
      },
      es: {
        title: 'Cómo preparar con éxito una entrevista de piloto',
        focus: 'Perfecciona el vuelo manual, CRM y respuestas técnicas antes de tu evaluación aérea',
        keywords: ['entrevista piloto', 'selección aerolínea', 'vuelo manual', 'Boeing 737'],
      },
      ar: {
        title: 'كيف تستعد بذكاء لمقابلة توظيف الطيارين',
        focus: 'طوّر مهارات الطيران اليدوي والعمل الجماعي CRM والإجابات التقنية قبل اختبار القبول',
        keywords: ['مقابلة طيار', 'توظيف طيارين', 'اختبار طيران', 'بوينغ 737'],
      },
      de: {
        title: 'Klug auf das Piloten-Interview vorbereiten',
        focus: 'Schärfen Sie Raw-Data-Fliegen, CRM-Briefings und Technik-Antworten vor dem Check',
        keywords: ['Piloten-Interview', 'Airline-Auswahl', 'Raw Data', 'Boeing 737'],
      },
    },
  },
};

const HEBREW_RE = /[\u0590-\u05FF]/;
const ARABIC_RE = /[\u0600-\u06FF]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;

function assertNoCrossScript(text: string, lang: BlogLang, context: string): void {
  if (lang !== 'he' && HEBREW_RE.test(text)) {
    throw new Error(`Cross-script Hebrew found in ${lang} (${context}): ${text}`);
  }
  if (lang !== 'ar' && ARABIC_RE.test(text)) {
    throw new Error(`Cross-script Arabic found in ${lang} (${context}): ${text}`);
  }
  if (lang !== 'ru' && CYRILLIC_RE.test(text)) {
    throw new Error(`Cross-script Cyrillic found in ${lang} (${context}): ${text}`);
  }
}

function fitMetaTitle(baseTitle: string, lang: BlogLang): string {
  // Aim for 50..60 chars total including ` | SimDream` (11 chars), so base <= 49 chars.
  const maxBase = 60 - BRAND_SUFFIX.length; // 49
  const minBase = 50 - BRAND_SUFFIX.length; // 39
  let base = baseTitle.trim();

  if (base.length > maxBase) {
    const truncated = base.slice(0, maxBase);
    const lastSpace = truncated.lastIndexOf(' ');
    base = (lastSpace > minBase - 5 ? truncated.slice(0, lastSpace) : truncated).replace(/[,:;—–-]+$/g, '').trim();
  }

  for (const pad of TITLE_PADDING[lang]) {
    if (base.length >= minBase) break;
    const candidate = `${base} — ${pad}`;
    if (candidate.length <= maxBase) {
      base = candidate;
    } else {
      const shortCand = `${base} ${pad}`;
      if (shortCand.length <= maxBase) {
        base = shortCand;
      }
    }
  }

  const full = `${base}${BRAND_SUFFIX}`;
  if (full.length < 48 || full.length > 60) {
    throw new Error(`metaTitle length ${full.length} out of [48..60] for ${lang}: "${full}"`);
  }
  return full;
}

function fitMetaDescription(focus: string, lang: BlogLang): string {
  const cleanFocus = focus.trim().replace(/[.!؟]+$/g, '');
  for (const tail of DESC_TAILS[lang]) {
    const candidate = `${cleanFocus}. ${tail}`;
    if (candidate.length >= 135 && candidate.length <= 160) {
      return candidate;
    }
  }
  // Fallback: combine first tail and trim/pad cleanly to [135, 160]
  const combined = `${cleanFocus}. ${DESC_TAILS[lang][0]}`;
  if (combined.length > 160) {
    const cut = combined.slice(0, 159);
    const lastSpace = cut.lastIndexOf(' ');
    const trimmed = `${(lastSpace > 134 ? cut.slice(0, lastSpace) : cut).replace(/[,:;—–-]+$/g, '').trim()}.`;
    if (trimmed.length >= 135 && trimmed.length <= 160) return trimmed;
  }
  if (combined.length < 135) {
    const extra: Record<BlogLang, string> = {
      he: ' חוויה אותנטית ומקצועית בקוקפיט בואינג 737 — הזמינו אונליין עכשיו.',
      en: ' Authentic 1:1 Boeing 737 cockpit mentorship — book your session online today.',
      ru: ' Реалистичная кабина Boeing 737 с капитаном — бронируйте полёт онлайн сегодня.',
      fr: ' Cockpit Boeing 737 authentique avec commandant — réservez en ligne dès maintenant.',
      es: ' Cabina Boeing 737 auténtica con capitán — reserva tu sesión online hoy mismo.',
      ar: ' قمرة بوينغ 737 حقيقية بإشراف كابتن طيران — احجز جلستك عبر الإنترنت اليوم.',
      de: ' Echtes 1:1-Boeing-737-Cockpit mit Kapitän — jetzt online buchen.',
    };
    const padded = `${combined}${extra[lang]}`;
    if (padded.length >= 135 && padded.length <= 160) return padded;
    if (padded.length > 160) {
      const cut = padded.slice(0, 159);
      const lastSpace = cut.lastIndexOf(' ');
      const trimmed = `${(lastSpace > 134 ? cut.slice(0, lastSpace) : cut).replace(/[,:;—–-]+$/g, '').trim()}.`;
      if (trimmed.length >= 135 && trimmed.length <= 160) return trimmed;
    }
  }
  throw new Error(`metaDescription length ${combined.length} out of [135..160] for ${lang}: "${combined}"`);
}

type CompactLocaleTuple = [string, string];

function main() {
  const root = process.cwd();
  const posts = JSON.parse(readFileSync(path.join(root, 'lib/data/blog-posts.json'), 'utf8')) as RawBlogPost[];
  const slugMap = JSON.parse(readFileSync(path.join(root, 'lib/data/blog-slug-map.json'), 'utf8')) as RawSlugMap;

  const seenShortSlugs = new Set<string>();
  const compactByTid: Record<string, Record<BlogLang, CompactLocaleTuple>> = {};
  let legacyCount = 0;

  for (const post of posts) {
    const seed = POST_SEEDS[post.id];
    if (!seed) throw new Error(`Missing POST_SEEDS entry for ${post.id}`);

    const slugEntry = slugMap.bySlug[post.slug];
    if (!slugEntry?.translationId) throw new Error(`Missing translationId for ${post.id} (${post.slug})`);
    const translationId = slugEntry.translationId;
    const group = slugMap.byTranslationId[translationId];
    if (!group) throw new Error(`Missing byTranslationId group for ${translationId}`);

    const { shortSlug } = seed;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(shortSlug) || shortSlug.length > 55) {
      throw new Error(`Invalid shortSlug "${shortSlug}" for ${post.id}`);
    }
    const wordCount = shortSlug.split('-').length;
    if (wordCount < 3 || wordCount > 6) {
      throw new Error(`shortSlug "${shortSlug}" must have 3-6 words (got ${wordCount})`);
    }
    if (seenShortSlugs.has(shortSlug)) {
      throw new Error(`Duplicate shortSlug "${shortSlug}"`);
    }
    seenShortSlugs.add(shortSlug);

    const locales = {} as Record<BlogLang, CompactLocaleTuple>;

    for (const lang of SUPPORTED_BLOG_LANGS) {
      const topic = seed.topics[lang];
      const metaTitle = fitMetaTitle(topic.title, lang);
      const metaDescription = fitMetaDescription(topic.focus, lang);

      assertNoCrossScript(metaTitle, lang, `${post.id}.metaTitle`);
      assertNoCrossScript(metaDescription, lang, `${post.id}.metaDescription`);
      for (const kw of topic.keywords) {
        assertNoCrossScript(kw, lang, `${post.id}.keywords`);
      }

      if (lang === 'he' && group.localSlug) legacyCount++;
      if (group[lang]) legacyCount++;

      locales[lang] = [metaTitle, metaDescription];
    }

    compactByTid[translationId] = locales;
  }

  const outPath = path.join(root, 'public/data/blog-seo.json');
  writeFileSync(outPath, JSON.stringify(compactByTid) + '\n', 'utf8');
  console.log(`Generated compact ${outPath}: ${Object.keys(compactByTid).length} posts (${legacyCount} base legacy slugs).`);
}

main();
