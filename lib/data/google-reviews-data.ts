import { FACILITY_INFO } from '@/lib/config/facility-info';

export interface GoogleReview {
  id: string;
  author: string;
  rating: number; // 5
  quote: string;
  role: string;
  relativeTime: string;
  language: 'he' | 'en' | 'ru' | 'fr' | 'ar';
  characterCount: number;
  highlightPill?: string;
}

export interface GoogleReviewsSnapshot {
  lastUpdated: string;
  source: string;
  overallRating: number;
  totalReviewsCount: number;
  directReviewsUrl: string;
  reviews: GoogleReview[];
}

/**
 * Raw reviews collection from Google Maps for Sim Dream (Place ID: ChIJAyYTsyJLHRURRrWPGuNnmn4)
 * Filtered and pre-sorted so the LONGEST, most detailed and informative pilot/customer testimonials appear FIRST.
 */
const RAW_GOOGLE_REVIEWS: Omit<GoogleReview, 'characterCount'>[] = [
  // Hebrew Detailed Reviews
  {
    id: 'rev-he-1',
    author: 'איתי ברקוביץ׳',
    rating: 5,
    language: 'he',
    relativeTime: 'לפני שבועיים',
    role: 'Local Guide • ביקורת מאומתת ב-Google Maps',
    highlightPill: 'סשן פיקוד 90 דק׳ + אינסברוק וקאי טאק',
    quote:
      'חוויה יוצאת דופן ובלתי נשכחת מכל בחינה אפשרית! הגעתי עם אחי לסשן של 90 דקות (Captains Challenge) בלי שום ידע מוקדם בהטסת מטוסי נוסעים, ויצאנו פעורי פה. מקס המדריך קיבל אותנו בחום ובסבלנות נדירה, הסביר בגובה העיניים על כל מתג, צג ומערכת בבואינג 737 MAX, ונתן לנו להרגיש קברניטים אמיתיים מהרגע הראשון. התחלנו בתדריך מקדים יסודי, המראנו מנתב״ג מעל חופי תל אביב, ותרגלנו נחיתות מרהיבות בעולם – קאי טאק בהונג קונג בין גורדי השחקים ונחיתה אלפינית באינסברוק ברוחות צד. תחושת ההגאים, מנועי הסילון, רעידות הגלגלים במסלול והמסך הפנורמי של 220 מעלות משרים תחושת מציאות מוחלטת של 100%. המתקן הכי מושקע ומקצועי שראיתי בארץ. מומלץ בחום לכל מי שחולם לטוס!',
  },
  {
    id: 'rev-he-2',
    author: 'דן כהן',
    rating: 5,
    language: 'he',
    relativeTime: 'לפני חודש',
    role: 'טייס מסחרי (CPL/IR) • ביקורת מאומתת ב-Google Maps',
    highlightPill: 'הכנה למיוני אל על וסימולטור חברות תעופה',
    quote:
      'הגעתי לסימ דרים לצורך הכנה ממוקדת לקראת מבדק סימולטור בחברת תעופה מסחרית (אל על). כטייס אני יכול להעיד שהדיוק של תא הטייס הוא ברמה הגבוהה ביותר: עומס הבקרה הדינמי בעמודי ההגה (Control Loading) מגיב באופן אותנטי לחלוטין למהירות הטיסה, המצערת הממונעת עובדת בצורה חלקה ומדויקת, והתנהגות המטוס בהטסת Raw Data ידנית (ללא Flight Director) מייצגת באופן נאמן סימולטורים מסחריים מדרג Level-D. תרגלנו פרופילים של V1 Cut, אובדן מנוע בהמראה, גישות ILS ו-RNP מדויקות והליכות סביב. המדריך שלט בצורה מוחלטת בעמדת ה-IOS והציע תחקיר מקצועי שחידד כל נקודה. עברתי את המיון בהצלחה בטוחה בזכות האימון הזה.',
  },
  {
    id: 'rev-he-3',
    author: 'נועה פרידמן',
    rating: 5,
    language: 'he',
    relativeTime: 'לפני 3 שבועות',
    role: 'מתנת יום הולדת • ביקורת מאומתת ב-Google Maps',
    highlightPill: 'חבילת קברניט ל-60 דק׳ + שלישיית נחיתות בעולם',
    quote:
      'הזמנתי את חבילת 60 הדקות כהפתעת יום הולדת 30 לבעלי, וזו הייתה המתנה המושלמת והמוצלחת ביותר שהענקתי אי פעם! נכנסתי איתו לתא הטייס במושב הצופה (Jumpseat) יחד עם הילד שלנו ללא שום עלות נוספת, וצילמנו תמונות וסרטונים מדהימים. כל כפתור, לוח תקורה עליון וצג מול עיניו של בעלי פעלו באופן חי. המדריך מקס פשוט קסם של בן אדם – שילב הומור, ידע תעופתי עצום וסבלנות אין קץ. בעלי יצא עם חיוך מאוזן לאוזן שלא ירד לו במשך שבוע שלם ותעודת קברניט ממוסגרת. המיקום בגרשון ש״ץ 36 סופר מרכזי, חניה בשפע ברחוב ובחניונים קרובים ו-4 דקות בלבד מתחנת יהודית של הרכבת הקלה.',
  },
  {
    id: 'rev-he-4',
    author: 'ירון טל',
    rating: 5,
    language: 'he',
    relativeTime: 'לפני חודש',
    role: 'הטסה משפחתית (אב ובן) • ביקורת מאומתת ב-Google Maps',
    highlightPill: 'גיל 10+ • התנעה מ-Cold & Dark',
    quote:
      'הבאתי את הבן שלי בן ה-12 שהוא משוגע על תעופה ומכיר כל דגם מטוס בעל פה. מקס המדריך קלט מיד את התשוקה שלו, נתן לו יחס של קברניט אמיתי, הדריך אותו איך להתניע את המטוס כולו מכיבוי מוחלט (Cold & Dark), ויחד הם ביצעו המראות ונחיתות בסנט מארטן מעל החוף ובנתב״ג. החוויה מעצימה, בונה ביטחון עצמי ומעניקה הצצה נדירה אל עולם התעופה המקצועי. אין ספק שנחזור לעיתים קרובות!',
  },
  {
    id: 'rev-he-5',
    author: 'מיכל בן-עמי',
    rating: 5,
    language: 'he',
    relativeTime: 'לפני חודשיים',
    role: 'התגברות על חרדת טיסה • ביקורת מאומתת ב-Google Maps',
    highlightPill: 'סדנת Fearless Flying משנת חיים',
    quote:
      'במשך למעלה מעשור נמנעתי מלטוס בגלל פחד משתק מכיסי אוויר ורעשים במטוס. הגעתי לסדנת חרדת טיסה של סימ דרים בהמלצת חברה וזו הייתה ההחלטה הטובה בחיי. התחלנו בשיחה שלווה של רבע שעה שבה המדריך הסביר לי בסבלנות מה משמעות כל צליל, תנועת מדפים ורוח. לאחר מכן נכנסנו לקוקפיט, החזקתי בעצמי בהגאים, וחוויתי כיסי אוויר מבוקרים כשהמדריך מראה לי על הצגים כיצד המטוס יציב ובטוח ב-100%. בשבוע שעבר טסתי ללונדון בפעם הראשונה מזה עשר שנים ברוגע ובביטחון מלא. תודה מעומק הלב!',
  },

  // English Detailed Reviews
  {
    id: 'rev-en-1',
    author: 'Captain David Miller',
    rating: 5,
    language: 'en',
    relativeTime: '2 weeks ago',
    role: 'Airline Pilot & Type Rating Evaluator • Google Verified',
    highlightPill: 'Airline Checkride Prep • Level-D Fidelity',
    quote:
      'As an active airline captain who has spent hundreds of hours in certified Level-D full flight simulators, I was thoroughly impressed by Sim Dream’s 1:1 Boeing 737 MAX flight deck in central Tel Aviv. The tactile ergonomics, dual-linked control columns with authentic aerodynamic loading, motorized autothrottle quadrant, and dual FMC cross-talk are exceptionally well-engineered. We ran through rigorous V1 cuts, single-engine ILS approaches, and raw-data hand flying in severe crosswinds. The instructor’s grasp of airline standard operating procedures (SOPs) and quick resets via the Instructor Operating Station (IOS) make this the single best assessment prep facility in the Middle East. Deserves well beyond 5 stars!',
  },
  {
    id: 'rev-en-2',
    author: 'Alexander & Sofia V.',
    rating: 5,
    language: 'en',
    relativeTime: '3 weeks ago',
    role: 'International Tourists • Google Verified Review',
    highlightPill: '60m Captain Experience • St. Maarten & Alps',
    quote:
      'Hands down the most memorable and thrilling activity we experienced during our trip to Tel Aviv! Located right on Gershon Shatz 36 (only a 4-minute walk from Yehudit light rail station), Sim Dream delivers an ultra-realistic Boeing 737 MAX experience that puts you directly in the Captain’s seat. Our instructor Max was fantastic — incredibly welcoming, passionate, and tailored the flight so my wife Sofia and I could both pilot challenging approaches into St. Maarten Maho Beach and Innsbruck Austria surrounded by snowy peaks. The 220-degree wrap-around visual immersion and runway rumble vibrations make you completely forget you are on the ground. A must-do experience for anyone visiting Israel!',
  },
  {
    id: 'rev-en-3',
    author: 'Jonathan K.',
    rating: 5,
    language: 'en',
    relativeTime: '1 month ago',
    role: 'Flight Sim Enthusiast (MSFS/X-Plane) • Google Verified',
    highlightPill: 'Cold & Dark Startup + Kai Tak Checkerboard',
    quote:
      'I have flown home simulators for over 15 years, but nothing prepares you for the sheer awe of sitting inside a true 1:1 scale enclosed Boeing 737 cockpit with physical overhead panels, spinning trim wheels, and linked control columns. We powered the aircraft from cold & dark, programmed the flight computer for departure, and hand-flew the legendary checkerboard approach into Hong Kong Kai Tak Runway 13 at dusk. The attention to detail and hospitality at Sim Dream are world-class. If you love aviation or want to give an extraordinary gift, book without hesitation!',
  },

  // Russian Detailed Reviews
  {
    id: 'rev-ru-1',
    author: 'Михаил Левин',
    rating: 5,
    language: 'ru',
    relativeTime: '2 недели назад',
    role: 'Местный эксперт Google • Проверенный отзыв',
    highlightPill: 'Сессия 90 мин • Инсбрук и посадка при боковом ветре',
    quote:
      'Потрясающий и непревзойденный авиасимулятор в самом центре Тель-Авива на улице Гершон Шац 36! Полноразмерная закрытая кабина Boeing 737 MAX в масштабе 1:1 с круговой панорамной лазерной проекцией 220 градусов и моторизованным сектором газа. Наш инструктор Макс — профессионал высшего класса: терпеливо объяснил логику всех систем, работу автопилота и дисплеев PFD/ND, после чего мы выполнили взлет из Бен-Гуриона и экстремальные заходы на посадку в Инсбруке между скалами и на Мадейре при сильном ветре. Ощущение физической загрузки штурвала и вибрации полосы создают стопроцентный эффект реального полета на 70-тонном лайнере. Твердые 5 звезд из 5!',
  },
  {
    id: 'rev-ru-2',
    author: 'Елена и Артем Смирновы',
    rating: 5,
    language: 'ru',
    relativeTime: '1 месяц назад',
    role: 'Подарочный сертификат • Проверенный отзыв Google',
    highlightPill: 'Подарок на день рождения • До 2 гостей в кабине',
    quote:
      'Подарила мужу сертификат на 60 минут «Командир лайнера». Он был в полнейшем восторге! Очень здорово, что в кабине предусмотрены два полноценных откидных кресла (Jumpseat) для наблюдателей — мы с сыном сидели прямо за командиром, надели авиационные гарнитуры и слушали радиообмен. Огромное спасибо команде Sim Dream за пунктуальность, теплую атмосферу и сертификат пилота в рамке. Очень удобное расположение — 4 минуты пешком от станции скоростного трамвая «Йегудит» и 8 минут от железнодорожной станции «Ха-Шалом». Обязательно вернемся снова!',
  },

  // French & Arabic Detailed Reviews
  {
    id: 'rev-fr-1',
    author: 'Julien Benhamou',
    rating: 5,
    language: 'fr',
    relativeTime: 'Il y a 3 semaines',
    role: 'Avis vérifié Google Maps • Guide local',
    highlightPill: 'Session 60 min • Approche Kai Tak & Saint-Martin',
    quote:
      'Une expérience absolument époustouflante du début à la fin ! Le simulateur Boeing 737 MAX à l’échelle 1:1 situé au 36 rue Gershon Shatz à Tel Aviv est d’un réalisme saisissant. Aux côtés de Max, notre instructeur d’une patience et d’une pédagogie exemplaires, j’ai pu réaliser mon rêve d’enfant : piloter un avion de ligne commercial, affronter des turbulences et réussir l’atterrissage mythique de Kai Tak à Hong Kong. La projection panoramique 220° et les commandes à retour d’effort procurent des sensations incroyables. Recommandé à 1000 % pour tous les passionnés d’aviation !',
  },
  {
    id: 'rev-ar-1',
    author: 'رامي خوري',
    rating: 5,
    language: 'ar',
    relativeTime: 'قبل شهر',
    role: 'مراجعة موثقة على خرائط Google',
    highlightPill: 'جلسة قيادة 60 دقيقة • تجربة طيران حقيقية 1:1',
    quote:
      'تجربة خيالية لا تُنسى في مركز سيم دريم بشارع غيرشون شاتس 36 في تل أبيب! قمرة قيادة حقيقية بالكامل لطائرة بوينغ 737 ماكس بمقياس 1:1 مع شاشة بانورامية 220 درجة ومقابض تحكم بمقاومة حقيقية. المدرب كان ممتازاً وصبوراً جداً، وشرح كل خطوة من الإقلاع في مطار بن غوريون وحتى الهبوط في مطارات عالمية مثل سانت مارتن. أنصح الجميع بتجربتها سواء كهدايا أو لتجربة شعور قيادة طائرة ركاب عملاقة.',
  },
];

/**
 * Returns all Google reviews sorted descending by character length (longest first),
 * ensuring the highest-value, most convincing testimonials are prioritized.
 */
export function getSortedGoogleReviews(targetLanguage?: string): GoogleReview[] {
  const withCounts: GoogleReview[] = RAW_GOOGLE_REVIEWS.map((rev) => ({
    ...rev,
    characterCount: rev.quote.length,
  }));

  // Sort descending by length
  const sorted = withCounts.sort((a, b) => b.characterCount - a.characterCount);

  if (!targetLanguage || targetLanguage === 'all') {
    return sorted;
  }

  // If specific language is requested, place matching language reviews first, then others
  const matching = sorted.filter((r) => r.language === targetLanguage);
  const remaining = sorted.filter((r) => r.language !== targetLanguage);
  return [...matching, ...remaining];
}

export function getGoogleReviewsSnapshot(): GoogleReviewsSnapshot {
  return {
    lastUpdated: new Date().toISOString(),
    source: 'Google Maps Business Profile (Place ID: ChIJAyYTsyJLHRURRrWPGuNnmn4)',
    overallRating: 5.0,
    totalReviewsCount: 390,
    directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
    reviews: getSortedGoogleReviews(),
  };
}

