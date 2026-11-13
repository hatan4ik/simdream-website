/**
 * Experience Flights ("טיסות חוויה") route catalog — the World Trios and flight adventures a
 * line captain would put in front of a guest.
 *
 * Two kinds of entries live here:
 *  - World Trios: three real-world airports flown back to back. The eight trios that are sold as
 *    booking add-ons point at their `FLIGHT_ADDONS` id, so price and extra cockpit minutes always
 *    come from the authoritative catalog (never from this file). The remaining trios are proposed
 *    "on request" routes: a guest chooses an eligible 60+ minute flight slot first, then the
 *    requested route is retained with the booking for a captain to confirm. They are not an
 *    automatically priced add-on and must never be presented as a guaranteed online purchase.
 *  - Adventures: scenario-style missions (a transatlantic ETOPS leg, a Dead Sea low pass, ...) that
 *    are flown inside a booked session on request.
 *
 * Every airport is real, every ICAO code is real, and every destination is one the Boeing 737 can
 * operate to in reality (AGENTS.md §1, pillar 5 "Authentic Aviation Integrity"). All text is
 * provided for the five supported languages (AGENTS.md §5); ICAO codes are telemetry and are
 * rendered in LTR.
 */
import type { Language, LocalizedRecord } from '@/lib/i18n/translations';
import type { AddonIconName } from '@/types';

export type RouteRegion = 'israel' | 'europe' | 'americas' | 'asia_pacific' | 'africa_middle_east' | 'extreme';

export interface RouteAirport {
  /** Four-letter ICAO location indicator (telemetry, always LTR). */
  icao: string;
  /** Three-letter IATA code shown to guests. */
  iata: string;
}

export interface RouteAirportCopy {
  /** Airport name as a guest knows it. */
  name: string;
  /** The sight or the piece of airmanship that makes the approach memorable. */
  sight: string;
}

export interface WorldRouteCopy {
  title: string;
  tagline: string;
  /** First-person note from the captain, 1–2 sentences. */
  pilotNote: string;
  airports: [RouteAirportCopy, RouteAirportCopy, RouteAirportCopy];
  bestFor: string[];
}

export interface WorldRoute {
  id: string;
  /** Present when the trio is sold as a booking add-on; price and minutes come from FLIGHT_ADDONS. */
  addonId?: string;
  region: RouteRegion;
  /** Captain's handling rating, 1 (relaxed sightseeing) to 5 (captain-only approach). */
  difficulty: 1 | 2 | 3 | 4 | 5;
  icon: AddonIconName;
  airports: [RouteAirport, RouteAirport, RouteAirport];
  copy: LocalizedRecord<WorldRouteCopy>;
}

/** A custom World Trio needs the full Captain's Command session, not a short discovery flight. */
export const MINIMUM_ROUTE_REQUEST_MINUTES = 60 as const;

export interface AdventureCopy {
  title: string;
  description: string;
  /** Where in the world it is flown. */
  where: string;
}

export interface Adventure {
  id: string;
  icon: AddonIconName;
  /** Recommended minimum booked session for the adventure to fit comfortably. */
  minimumSessionMinutes: 45 | 60 | 90;
  copy: LocalizedRecord<AdventureCopy>;
}

export const WORLD_ROUTES: WorldRoute[] = [
  // ───────────────────────── Bookable add-on trios (FLIGHT_ADDONS) ─────────────────────────
  {
    id: 'route-extreme-airports',
    addonId: 'addon-extreme-airports',
    region: 'extreme',
    difficulty: 5,
    icon: 'Compass',
    airports: [
      { icao: 'VQPR', iata: 'PBH' },
      { icao: 'VHHX', iata: 'HKG' },
      { icao: 'LOWI', iata: 'INN' },
    ],
    copy: {
      en: {
        title: 'Extreme World Airports',
        tagline: 'Three approaches where only a captain’s hands can land the jet.',
        pilotNote:
          'Fewer than a few dozen captains in the world are certified for Paro. The autopilot is off, the valley walls are close, and you fly by eye. It is the closest a guest will ever get to real mountain airline flying.',
        airports: [
          { name: 'Paro, Bhutan', sight: 'Visual weave between 18,000-ft Himalayan ridges to a hidden valley runway' },
          { name: 'Hong Kong Kai Tak', sight: 'The legendary 47° checkerboard turn at 650 ft over Kowloon rooftops' },
          { name: 'Innsbruck', sight: 'Steep Alpine valley descent with a circling visual onto Runway 08' },
        ],
        bestFor: ['Thrill seekers', 'Experienced sim pilots', 'Bucket-list gifts'],
      },
      he: {
        title: 'שדות התעופה האקסטרימיים בעולם',
        tagline: 'שלוש גישות שבהן רק ידיו של קברניט מנחיתות את המטוס.',
        pilotNote:
          'רק כמה עשרות קברניטים בעולם מוסמכים לנחות בפארו. הטייס האוטומטי כבוי, קירות העמק קרובים, ומטיסים לפי העין. זו ההתנסות הקרובה ביותר לטיסת הרים אמיתית של חברת תעופה.',
        airports: [
          { name: 'פארו, בהוטן', sight: 'תמרון ויזואלי בין רכסי הימלאיה בגובה 18,000 רגל אל מסלול חבוי בעמק' },
          { name: 'הונג קונג קאי טאק', sight: 'פניית ה"שחמט" המפורסמת ב-47° בגובה 650 רגל מעל גגות קאולון' },
          { name: 'אינסברוק', sight: 'ירידה תלולה בעמק אלפיני עם הקפה ויזואלית למסלול 08' },
        ],
        bestFor: ['מחפשי ריגושים', 'טייסי סימולטור מנוסים', 'מתנות חלום'],
      },
      ru: {
        title: 'Самые экстремальные аэропорты мира',
        tagline: 'Три захода, где посадить самолёт могут только руки командира.',
        pilotNote:
          'Лишь несколько десятков командиров в мире допущены к посадке в Паро. Автопилот выключен, стены долины рядом, и вы летите «на глаз». Это максимально близко к настоящему горному полёту авиакомпании.',
        airports: [
          { name: 'Паро, Бутан', sight: 'Визуальное маневрирование между гималайскими гребнями высотой 18 000 футов к скрытой в долине полосе' },
          { name: 'Гонконг Кайтак', sight: 'Легендарный разворот на 47° у «шахматной доски» на высоте 650 футов над крышами Коулуна' },
          { name: 'Инсбрук', sight: 'Крутое снижение в альпийской долине и визуальный круг на полосу 08' },
        ],
        bestFor: ['Любители адреналина', 'Опытные сим-пилоты', 'Подарок мечты'],
      },
      fr: {
        title: 'Les aéroports les plus extrêmes du monde',
        tagline: 'Trois approches où seules les mains d’un commandant posent l’avion.',
        pilotNote:
          'Quelques dizaines de commandants dans le monde sont qualifiés pour Paro. Pilote automatique coupé, parois de la vallée toutes proches : on vole à vue. C’est ce qui se rapproche le plus du vrai vol de ligne en montagne.',
        airports: [
          { name: 'Paro, Bhoutan', sight: 'Slalom visuel entre des crêtes himalayennes de 18 000 ft vers une piste cachée dans la vallée' },
          { name: 'Hong Kong Kai Tak', sight: 'Le légendaire virage à 47° du damier, à 650 ft au-dessus des toits de Kowloon' },
          { name: 'Innsbruck', sight: 'Descente abrupte dans la vallée alpine et circuit à vue vers la piste 08' },
        ],
        bestFor: ['Amateurs de sensations', 'Pilotes sim expérimentés', 'Cadeau de rêve'],
      },
      ar: {
        title: 'أكثر مطارات العالم تطرفاً',
        tagline: 'ثلاث مقاربات لا تهبط فيها الطائرة إلا بيدي قبطان.',
        pilotNote:
          'بضع عشرات فقط من القباطنة في العالم مؤهلون للهبوط في بارو. الطيار الآلي مطفأ، وجدران الوادي قريبة، وتقود بعينيك. هذه أقرب تجربة لطيران شركات الطيران الحقيقي في الجبال.',
        airports: [
          { name: 'بارو، بوتان', sight: 'مناورة بصرية بين قمم الهيمالايا على ارتفاع 18,000 قدم نحو مدرج مخفي في الوادي' },
          { name: 'هونغ كونغ كاي تاك', sight: 'انعطاف «رقعة الشطرنج» الأسطوري بزاوية 47° على ارتفاع 650 قدماً فوق أسطح كولون' },
          { name: 'إنسبروك', sight: 'هبوط حاد في وادٍ ألبي مع دورة بصرية نحو المدرج 08' },
        ],
        bestFor: ['عشاق الإثارة', 'طيارو المحاكاة المتمرسون', 'هدايا الأحلام'],
      },
      de: {
        title: 'Extreme Flughäfen der Welt',
        tagline: 'Drei Anflüge, bei denen nur die Hände eines Kapitäns das Flugzeug landen können.',
        pilotNote:
          'Nur wenige Dutzend Kapitäne weltweit sind für Paro zertifiziert. Der Autopilot ist aus, die Talwände sind zum Greifen nah und man fliegt nach Sicht. Näher kommt ein Gast echtem Gebirgs-Linienflug nicht.',
        airports: [
          { name: 'Paro, Bhutan', sight: 'Sichtflug-Slalom zwischen 18.000 ft hohen Himalaya-Graten zu einer versteckten Talpiste' },
          { name: 'Hongkong Kai Tak', sight: 'Die legendäre 47°-Checkerboard-Kurve in 650 ft Höhe über den Dächern von Kowloon' },
          { name: 'Innsbruck', sight: 'Steiler Sinkflug im Alpental mit Sichtplatzrunde auf Piste 08' },
        ],
        bestFor: ['Adrenalin-Fans', 'Erfahrene Sim-Piloten', 'Bucket-List-Geschenke'],
      },
    },
  },
  {
    id: 'route-classical-eu',
    addonId: 'addon-classical-eu',
    region: 'europe',
    difficulty: 2,
    icon: 'Globe',
    airports: [
      { icao: 'EGLL', iata: 'LHR' },
      { icao: 'LFPG', iata: 'CDG' },
      { icao: 'EHAM', iata: 'AMS' },
    ],
    copy: {
      en: {
        title: 'Classical European Hubs',
        tagline: 'The three megahubs every airline pilot knows by heart.',
        pilotNote:
          'This is my daily office. Heathrow’s 27L over the Thames, the parallel runways at Charles de Gaulle, and Schiphol’s Polderbaan four metres below sea level. You will fly real ILS approaches exactly as the airlines do.',
        airports: [
          { name: 'London Heathrow', sight: 'ILS over the Thames with Windsor Castle and Wembley off the wing' },
          { name: 'Paris Charles de Gaulle', sight: 'Parallel-runway operations with the Eiffel Tower on the horizon' },
          { name: 'Amsterdam Schiphol', sight: 'The Polderbaan: a runway four metres below sea level' },
        ],
        bestFor: ['First-time pilots', 'Frequent flyers', 'Families'],
      },
      he: {
        title: 'מרכזי התעופה הקלאסיים של אירופה',
        tagline: 'שלושת הנמלים הגדולים שכל טייס קווים מכיר בעל פה.',
        pilotNote:
          'זה המשרד היומי שלי. מסלול 27L בהית׳רו מעל התמזה, המסלולים המקבילים בשארל דה גול, והפולדרבאן בסכיפהול ארבעה מטרים מתחת לפני הים. תטיסו גישות ILS אמיתיות בדיוק כמו חברות התעופה.',
        airports: [
          { name: 'לונדון הית׳רו', sight: 'גישת ILS מעל התמזה עם טירת וינדזור ואצטדיון וומבלי מחוץ לכנף' },
          { name: 'פריז שארל דה גול', sight: 'תפעול מסלולים מקבילים עם מגדל אייפל באופק' },
          { name: 'אמסטרדם סכיפהול', sight: 'הפולדרבאן: מסלול ארבעה מטרים מתחת לפני הים' },
        ],
        bestFor: ['טייסים בפעם הראשונה', 'נוסעים מתמידים', 'משפחות'],
      },
      ru: {
        title: 'Классические хабы Европы',
        tagline: 'Три мегахаба, которые каждый линейный пилот знает наизусть.',
        pilotNote:
          'Это мой рабочий кабинет. Полоса 27L в Хитроу над Темзой, параллельные полосы Шарля-де-Голля и Полдербаан в Схипхоле на четыре метра ниже уровня моря. Вы выполните настоящие заходы по ILS точно так же, как авиакомпании.',
        airports: [
          { name: 'Лондон Хитроу', sight: 'Заход по ILS над Темзой: Виндзорский замок и «Уэмбли» под крылом' },
          { name: 'Париж Шарль-де-Голль', sight: 'Работа с параллельными полосами с Эйфелевой башней на горизонте' },
          { name: 'Амстердам Схипхол', sight: 'Полдербаан — полоса на четыре метра ниже уровня моря' },
        ],
        bestFor: ['Новички', 'Частые пассажиры', 'Семьи'],
      },
      fr: {
        title: 'Les grands hubs européens',
        tagline: 'Les trois mégahubs que tout pilote de ligne connaît par cœur.',
        pilotNote:
          'C’est mon bureau quotidien. La 27L de Heathrow au-dessus de la Tamise, les pistes parallèles de Roissy et la Polderbaan de Schiphol, quatre mètres sous le niveau de la mer. Vous volerez de vraies approches ILS, exactement comme les compagnies.',
        airports: [
          { name: 'Londres Heathrow', sight: 'ILS au-dessus de la Tamise, château de Windsor et Wembley sous l’aile' },
          { name: 'Paris Charles-de-Gaulle', sight: 'Pistes parallèles avec la tour Eiffel à l’horizon' },
          { name: 'Amsterdam Schiphol', sight: 'La Polderbaan : une piste quatre mètres sous le niveau de la mer' },
        ],
        bestFor: ['Premiers vols', 'Grands voyageurs', 'Familles'],
      },
      ar: {
        title: 'مراكز أوروبا الكلاسيكية',
        tagline: 'ثلاثة مطارات محورية يعرفها كل طيار خطوط عن ظهر قلب.',
        pilotNote:
          'هذا مكتبي اليومي. المدرج 27L في هيثرو فوق نهر التايمز، والمدرجات المتوازية في شارل دو غول، ومدرج بولدربان في سخيبول على عمق أربعة أمتار تحت سطح البحر. ستنفّذ مقاربات ILS حقيقية كما تفعل شركات الطيران تماماً.',
        airports: [
          { name: 'لندن هيثرو', sight: 'مقاربة ILS فوق التايمز مع قلعة وندسور وملعب ويمبلي بجوار الجناح' },
          { name: 'باريس شارل دو غول', sight: 'عمليات المدرجات المتوازية وبرج إيفل في الأفق' },
          { name: 'أمستردام سخيبول', sight: 'بولدربان: مدرج على عمق أربعة أمتار تحت سطح البحر' },
        ],
        bestFor: ['الطيارون لأول مرة', 'المسافرون الدائمون', 'العائلات'],
      },
      de: {
        title: 'Klassische Europa-Drehkreuze',
        tagline: 'Die drei Megahubs, die jeder Linienpilot im Schlaf kennt.',
        pilotNote:
          'Das ist mein tägliches Büro. Heatrows 27L über der Themse, die Parallelbahnen von Charles de Gaulle und Schiphols Polderbaan vier Meter unter dem Meeresspiegel. Sie fliegen echte ILS-Anflüge genau wie die Airlines.',
        airports: [
          { name: 'London Heathrow', sight: 'ILS über der Themse mit Windsor Castle und Wembley unter der Tragfläche' },
          { name: 'Paris Charles de Gaulle', sight: 'Parallelbahnbetrieb mit dem Eiffelturm am Horizont' },
          { name: 'Amsterdam Schiphol', sight: 'Die Polderbaan: eine Landebahn vier Meter unter dem Meeresspiegel' },
        ],
        bestFor: ['Erstflieger', 'Vielflieger', 'Familien'],
      },
    },
  },
  {
    id: 'route-med-islands',
    addonId: 'addon-med-islands',
    region: 'europe',
    difficulty: 3,
    icon: 'Globe',
    airports: [
      { icao: 'LGKR', iata: 'CFU' },
      { icao: 'LGSK', iata: 'JSI' },
      { icao: 'LFMN', iata: 'NCE' },
    ],
    copy: {
      en: {
        title: 'Mediterranean Islands & Riviera',
        tagline: 'Sun-drenched coastal approaches an hour and a half from Tel Aviv.',
        pilotNote:
          'Summer charter flying at its best. Corfu’s runway starts at the water, Skiathos has sunbathers under the threshold, and the Riviera Visual into Nice curves past Monaco. Pure visual flying, feet on the rudder.',
        airports: [
          { name: 'Corfu', sight: 'Over the Vlacherna monastery causeway onto a runway bordered by water' },
          { name: 'Skiathos', sight: 'Europe’s St. Maarten: plane-spotters on the beach under the threshold' },
          { name: 'Nice Côte d’Azur', sight: 'The Riviera Visual: a curving approach past Monaco and Cap d’Antibes' },
        ],
        bestFor: ['Couples', 'Summer-holiday lovers', 'Visual-flying fans'],
      },
      he: {
        title: 'איי הים התיכון והריביירה',
        tagline: 'גישות חופיות שטופות שמש, שעה וחצי טיסה מתל אביב.',
        pilotNote:
          'טיסות הצ׳רטר של הקיץ במיטבן. המסלול בקורפו מתחיל במים, בסקיאתוס המשתזפים שוכבים מתחת לסף המסלול, והגישה הוויזואלית לניס מתעקלת ליד מונקו. טיסה ויזואלית טהורה, הרגליים על ההגה.',
        airports: [
          { name: 'קורפו', sight: 'מעל שובר הגלים של מנזר ולכרנה אל מסלול מוקף מים' },
          { name: 'סקיאתוס', sight: 'הסנט מארטן של אירופה: צלמי מטוסים על החוף מתחת לסף המסלול' },
          { name: 'ניס קוט ד׳אזור', sight: 'הגישה הוויזואלית של הריביירה: פנייה מתעקלת ליד מונקו וקאפ ד׳אנטיב' },
        ],
        bestFor: ['זוגות', 'חובבי חופשות קיץ', 'חובבי טיסה ויזואלית'],
      },
      ru: {
        title: 'Острова Средиземноморья и Ривьера',
        tagline: 'Солнечные прибрежные заходы в полутора часах полёта от Тель-Авива.',
        pilotNote:
          'Летние чартеры в лучшем виде. Полоса на Корфу начинается у воды, в Скиатосе отдыхающие лежат прямо под торцом, а визуальный заход в Ниццу огибает Монако. Чистый визуальный полёт, ноги на педалях.',
        airports: [
          { name: 'Корфу', sight: 'Над дамбой монастыря Влахерна на полосу, окружённую водой' },
          { name: 'Скиатос', sight: 'Европейский Сен-Мартен: споттеры на пляже под торцом полосы' },
          { name: 'Ницца Лазурный Берег', sight: 'Riviera Visual — дугообразный заход мимо Монако и мыса Антиб' },
        ],
        bestFor: ['Пары', 'Любители летнего отдыха', 'Поклонники визуальных полётов'],
      },
      fr: {
        title: 'Îles de Méditerranée et Riviera',
        tagline: 'Des approches côtières ensoleillées à une heure et demie de Tel-Aviv.',
        pilotNote:
          'Le charter d’été dans ce qu’il a de meilleur. La piste de Corfou commence dans l’eau, à Skiathos les baigneurs sont sous le seuil, et la Riviera Visual vers Nice s’incurve devant Monaco. Du vol à vue pur, les pieds sur le palonnier.',
        airports: [
          { name: 'Corfou', sight: 'Au-dessus de la digue du monastère de Vlacherna vers une piste bordée d’eau' },
          { name: 'Skiathos', sight: 'Le Saint-Martin européen : des spotters sur la plage sous le seuil de piste' },
          { name: 'Nice Côte d’Azur', sight: 'La Riviera Visual : une approche en courbe devant Monaco et le cap d’Antibes' },
        ],
        bestFor: ['Couples', 'Amoureux des vacances d’été', 'Fans de vol à vue'],
      },
      ar: {
        title: 'جزر البحر المتوسط والريفييرا',
        tagline: 'مقاربات ساحلية مشمسة على بعد ساعة ونصف من تل أبيب.',
        pilotNote:
          'طيران الصيف المستأجر في أفضل حالاته. مدرج كورفو يبدأ عند الماء، وفي سكياثوس يستلقي المصطافون تحت عتبة المدرج، والمقاربة البصرية إلى نيس تنحني أمام موناكو. طيران بصري خالص والأقدام على الدفة.',
        airports: [
          { name: 'كورفو', sight: 'فوق جسر دير فلاخيرنا نحو مدرج تحيط به المياه' },
          { name: 'سكياثوس', sight: 'سانت مارتن الأوروبية: مصوّرو الطائرات على الشاطئ تحت عتبة المدرج' },
          { name: 'نيس كوت دازور', sight: 'المقاربة البصرية للريفييرا: منعطف منحنٍ أمام موناكو ورأس أنتيب' },
        ],
        bestFor: ['الأزواج', 'عشاق عطلات الصيف', 'محبو الطيران البصري'],
      },
      de: {
        title: 'Mittelmeerinseln & Riviera',
        tagline: 'Sonnenverwöhnte Küstenanflüge, anderthalb Flugstunden von Tel Aviv entfernt.',
        pilotNote:
          'Sommer-Charterfliegerei vom Feinsten. Korfus Piste beginnt am Wasser, in Skiathos liegen Sonnenanbeter direkt unter der Schwelle, und der Riviera Visual nach Nizza schwingt sich an Monaco vorbei. Purer Sichtflug, Füße am Seitenruder.',
        airports: [
          { name: 'Korfu', sight: 'Über den Damm des Klosters Vlacherna auf eine von Wasser umgebene Piste' },
          { name: 'Skiathos', sight: 'Europas St. Maarten: Planespotter am Strand unter der Landebahnschwelle' },
          { name: 'Nizza Côte d’Azur', sight: 'Der Riviera Visual: ein geschwungener Anflug vorbei an Monaco und Cap d’Antibes' },
        ],
        bestFor: ['Paare', 'Sommerurlaubs-Fans', 'Sichtflug-Begeisterte'],
      },
    },
  },
  {
    id: 'route-us-megacities',
    addonId: 'addon-us-megacities',
    region: 'americas',
    difficulty: 3,
    icon: 'Globe',
    airports: [
      { icao: 'KLGA', iata: 'LGA' },
      { icao: 'KDCA', iata: 'DCA' },
      { icao: 'KSFO', iata: 'SFO' },
    ],
    copy: {
      en: {
        title: 'American Megacity Skylines',
        tagline: 'The three most photographed visual approaches in the United States.',
        pilotNote:
          'The Expressway Visual into LaGuardia is a hand-flown turn at 1,500 ft with Manhattan filling the windscreen. The River Visual into Washington follows the Potomac between prohibited areas. These are the approaches pilots brag about.',
        airports: [
          { name: 'New York LaGuardia', sight: 'Expressway Visual to Runway 31 past the Empire State Building and the Statue of Liberty' },
          { name: 'Washington National', sight: 'River Visual to Runway 19 down the Potomac past the Monument and the Pentagon' },
          { name: 'San Francisco', sight: 'Descent over the Golden Gate Bridge into the Bay with Alcatraz below' },
        ],
        bestFor: ['US travellers', 'City lovers', 'Landmark lovers'],
      },
      he: {
        title: 'קווי הרקיע של הערים הגדולות באמריקה',
        tagline: 'שלוש הגישות הוויזואליות המצולמות ביותר בארצות הברית.',
        pilotNote:
          'גישת ה-Expressway Visual ללה גווארדיה היא פנייה ידנית בגובה 1,500 רגל כשמנהטן ממלאת את השמשה הקדמית. גישת ה-River Visual לוושינגטון עוקבת אחרי הפוטומק בין אזורים אסורים לטיסה. אלה הגישות שטייסים מתגאים בהן.',
        airports: [
          { name: 'ניו יורק לה גווארדיה', sight: 'Expressway Visual למסלול 31 ליד האמפייר סטייט ופסל החירות' },
          { name: 'וושינגטון נשיונל', sight: 'River Visual למסלול 19 לאורך הפוטומק ליד האנדרטה והפנטגון' },
          { name: 'סן פרנסיסקו', sight: 'ירידה מעל גשר שער הזהב אל המפרץ עם אלקטרז מלמטה' },
        ],
        bestFor: ['מטיילים לארה״ב', 'חובבי ערים', 'חובבי נקודות ציון'],
      },
      ru: {
        title: 'Небоскрёбы американских мегаполисов',
        tagline: 'Три самых фотографируемых визуальных захода в США.',
        pilotNote:
          'Expressway Visual в Ла-Гуардию — это ручной разворот на 1500 футах, когда Манхэттен заполняет лобовое стекло. River Visual в Вашингтон идёт вдоль Потомака между запретными зонами. Этими заходами пилоты гордятся.',
        airports: [
          { name: 'Нью-Йорк Ла-Гуардия', sight: 'Expressway Visual на полосу 31 мимо Эмпайр-стейт-билдинг и статуи Свободы' },
          { name: 'Вашингтон Нэшнл', sight: 'River Visual на полосу 19 вдоль Потомака мимо Монумента и Пентагона' },
          { name: 'Сан-Франциско', sight: 'Снижение над мостом Золотые Ворота в залив, Алькатрас внизу' },
        ],
        bestFor: ['Путешественники в США', 'Любители городов', 'Любители городских достопримечательностей'],
      },
      fr: {
        title: 'Skylines des mégapoles américaines',
        tagline: 'Les trois approches à vue les plus photographiées des États-Unis.',
        pilotNote:
          'L’Expressway Visual vers LaGuardia est un virage à la main à 1 500 ft, Manhattan plein pare-brise. La River Visual vers Washington suit le Potomac entre des zones interdites. Ce sont les approches dont les pilotes se vantent.',
        airports: [
          { name: 'New York LaGuardia', sight: 'Expressway Visual piste 31 devant l’Empire State Building et la statue de la Liberté' },
          { name: 'Washington National', sight: 'River Visual piste 19 le long du Potomac, devant le Monument et le Pentagone' },
          { name: 'San Francisco', sight: 'Descente au-dessus du Golden Gate vers la baie, Alcatraz en dessous' },
        ],
        bestFor: ['Voyageurs aux États-Unis', 'Amoureux des villes', 'Amateurs de monuments urbains'],
      },
      ar: {
        title: 'أفق المدن الأمريكية الكبرى',
        tagline: 'المقاربات البصرية الثلاث الأكثر تصويراً في الولايات المتحدة.',
        pilotNote:
          'مقاربة Expressway Visual إلى لاغوارديا هي انعطاف يدوي على ارتفاع 1,500 قدم ومانهاتن تملأ الزجاج الأمامي. ومقاربة River Visual إلى واشنطن تتبع نهر بوتوماك بين مناطق محظورة. هذه هي المقاربات التي يتفاخر بها الطيارون.',
        airports: [
          { name: 'نيويورك لاغوارديا', sight: 'Expressway Visual نحو المدرج 31 بجوار إمباير ستيت وتمثال الحرية' },
          { name: 'واشنطن ناشيونال', sight: 'River Visual نحو المدرج 19 على طول بوتوماك بجوار النصب والبنتاغون' },
          { name: 'سان فرانسيسكو', sight: 'هبوط فوق جسر البوابة الذهبية نحو الخليج وألكاتراز في الأسفل' },
        ],
        bestFor: ['المسافرون إلى أمريكا', 'عشاق المدن', 'محبو المعالم الحضرية'],
      },
      de: {
        title: 'Amerikanische Megacity-Skylines',
        tagline: 'Die drei meistfotografierten Sichtanflüge der Vereinigten Staaten.',
        pilotNote:
          'Der Expressway Visual nach LaGuardia ist eine handgeflogene Kurve in 1.500 ft Höhe, während Manhattan die Frontscheibe füllt. Der River Visual nach Washington folgt dem Potomac zwischen Sperrgebieten hindurch. Anflüge, mit denen Piloten angeben.',
        airports: [
          { name: 'New York LaGuardia', sight: 'Expressway Visual auf Piste 31 vorbei am Empire State Building und der Freiheitsstatue' },
          { name: 'Washington National', sight: 'River Visual auf Piste 19 den Potomac hinunter vorbei an Monument und Pentagon' },
          { name: 'San Francisco', sight: 'Sinkflug über die Golden Gate Bridge in die Bucht mit Alcatraz darunter' },
        ],
        bestFor: ['USA-Reisende', 'Städte-Fans', 'Wahrzeichen-Liebhaber'],
      },
    },
  },
  {
    id: 'route-night-neon',
    addonId: 'addon-night-neon',
    region: 'asia_pacific',
    difficulty: 3,
    icon: 'Globe',
    airports: [
      { icao: 'EGLC', iata: 'LCY' },
      { icao: 'RJTT', iata: 'HND' },
      { icao: 'KLAS', iata: 'LAS' },
    ],
    copy: {
      en: {
        title: 'City-Centre & Night Neon',
        tagline: 'Sunset and night landings in three of the brightest cities on Earth.',
        pilotNote:
          'Night flying changes everything: the runway becomes a ribbon of light and the city a carpet of neon. London City’s 5.5° glideslope is nearly twice the normal angle, and Tokyo at night is the most beautiful approach I have flown.',
        airports: [
          { name: 'London City', sight: 'A steep 5.5° approach past Tower Bridge and Canary Wharf' },
          { name: 'Tokyo Haneda', sight: 'Over Rainbow Bridge and Tokyo Tower onto a runway built in the bay' },
          { name: 'Las Vegas', sight: 'Landing parallel to the Strip, the Sphere and the Bellagio fountains' },
        ],
        bestFor: ['Evening sessions', 'Romantic gifts', 'Shared flight memories'],
      },
      he: {
        title: 'מרכזי ערים וניאון בלילה',
        tagline: 'נחיתות שקיעה ולילה בשלוש מהערים הזוהרות בעולם.',
        pilotNote:
          'טיסת לילה משנה הכול: המסלול הופך לסרט של אור והעיר לשטיח של ניאון. שיפוע הגלישה של 5.5° ללונדון סיטי כפול כמעט מהרגיל, וטוקיו בלילה היא הגישה היפה ביותר שטסתי.',
        airports: [
          { name: 'לונדון סיטי', sight: 'גישה תלולה של 5.5° ליד טאוור ברידג׳ וקנרי וורף' },
          { name: 'טוקיו הנדה', sight: 'מעל גשר הקשת ומגדל טוקיו אל מסלול שנבנה במפרץ' },
          { name: 'לאס וגאס', sight: 'נחיתה במקביל לסטריפ, לספרה ולמזרקות הבלאג׳יו' },
        ],
        bestFor: ['מפגשי ערב', 'מתנות רומנטיות', 'זיכרון משותף מהטיסה'],
      },
      ru: {
        title: 'Центры городов и ночной неон',
        tagline: 'Посадки на закате и ночью в трёх самых ярких городах планеты.',
        pilotNote:
          'Ночной полёт меняет всё: полоса превращается в ленту света, а город — в ковёр неона. Глиссада 5,5° в Лондон-Сити почти вдвое круче обычной, а ночной Токио — самый красивый заход, который я выполнял.',
        airports: [
          { name: 'Лондон-Сити', sight: 'Крутой заход 5,5° мимо Тауэрского моста и Кэнэри-Уорф' },
          { name: 'Токио Ханэда', sight: 'Над Радужным мостом и Токийской башней на полосу, построенную в заливе' },
          { name: 'Лас-Вегас', sight: 'Посадка параллельно Стрипу, Sphere и фонтанам «Белладжио»' },
        ],
        bestFor: ['Вечерние сеансы', 'Романтический подарок', 'Совместные воспоминания о полете'],
      },
      fr: {
        title: 'Centres-villes et néons de nuit',
        tagline: 'Atterrissages au couchant et de nuit dans trois des villes les plus lumineuses du monde.',
        pilotNote:
          'Le vol de nuit change tout : la piste devient un ruban de lumière et la ville un tapis de néons. La pente de 5,5° de London City est presque le double de la normale, et Tokyo de nuit est la plus belle approche que j’aie volée.',
        airports: [
          { name: 'London City', sight: 'Approche raide à 5,5° devant Tower Bridge et Canary Wharf' },
          { name: 'Tokyo Haneda', sight: 'Au-dessus du Rainbow Bridge et de la tour de Tokyo vers une piste construite dans la baie' },
          { name: 'Las Vegas', sight: 'Atterrissage parallèle au Strip, à la Sphere et aux fontaines du Bellagio' },
        ],
        bestFor: ['Séances du soir', 'Cadeaux romantiques', 'Souvenirs partagés du vol'],
      },
      ar: {
        title: 'قلب المدن ونيون الليل',
        tagline: 'هبوط عند الغروب وفي الليل في ثلاث من أكثر مدن الأرض إشراقاً.',
        pilotNote:
          'الطيران الليلي يغيّر كل شيء: يصبح المدرج شريطاً من الضوء والمدينة بساطاً من النيون. زاوية الانحدار 5.5° في لندن سيتي تقارب ضعف المعتاد، وطوكيو ليلاً هي أجمل مقاربة قمت بها.',
        airports: [
          { name: 'لندن سيتي', sight: 'مقاربة حادة بزاوية 5.5° بجوار جسر البرج وكناري وورف' },
          { name: 'طوكيو هانيدا', sight: 'فوق جسر قوس قزح وبرج طوكيو نحو مدرج مبني في الخليج' },
          { name: 'لاس فيغاس', sight: 'هبوط بمحاذاة الستريب وكرة Sphere ونوافير بيلاجيو' },
        ],
        bestFor: ['جلسات المساء', 'هدايا رومانسية', 'ذكريات مشتركة من الرحلة'],
      },
      de: {
        title: 'City-Centre & Nacht-Neon',
        tagline: 'Sonnenuntergangs- und Nachtlandungen in drei der hellsten Städte der Welt.',
        pilotNote:
          'Nachtflug verändert alles: Die Piste wird zum Lichtband und die Stadt zum Neonteppich. London Citys 5,5°-Gleitpfad ist fast doppelt so steil wie üblich, und Tokio bei Nacht ist der schönste Anflug, den ich je geflogen bin.',
        airports: [
          { name: 'London City', sight: 'Steiler 5,5°-Anflug vorbei an Tower Bridge und Canary Wharf' },
          { name: 'Tokio Haneda', sight: 'Über Rainbow Bridge und Tokyo Tower auf eine in der Bucht gebaute Piste' },
          { name: 'Las Vegas', sight: 'Landung parallel zum Strip, der Sphere und den Bellagio-Fontänen' },
        ],
        bestFor: ['Abend-Sitzungen', 'Romantische Geschenke', 'Gemeinsame Flugerinnerungen'],
      },
    },
  },
  {
    id: 'route-alpine-mountains',
    addonId: 'addon-alpine-mountains',
    region: 'extreme',
    difficulty: 4,
    icon: 'Compass',
    airports: [
      { icao: 'NZQN', iata: 'ZQN' },
      { icao: 'LSGG', iata: 'GVA' },
      { icao: 'LOWS', iata: 'SZG' },
    ],
    copy: {
      en: {
        title: 'Alpine & Fjord Mountain Masters',
        tagline: 'Snow-capped peaks, glacial lakes and curved approaches between the rocks.',
        pilotNote:
          'Mountain flying is about energy management: you cannot go around the usual way, so every knot and every foot matters. Queenstown’s curved RNP path through the Remarkables is the most precise flying an airliner does.',
        airports: [
          { name: 'Queenstown', sight: 'Curved RNP-AR approach through the Remarkables over Lake Wakatipu' },
          { name: 'Geneva', sight: 'Descent past Mont Blanc along the length of Lake Geneva' },
          { name: 'Salzburg', sight: 'Visual circling beneath the Untersberg cliffs in Mozart’s city' },
        ],
        bestFor: ['Ski lovers', 'Nature photographers', 'Precision-flying fans'],
      },
      he: {
        title: 'אלופי ההרים: אלפים ופיורדים',
        tagline: 'פסגות מושלגות, אגמים קרחוניים וגישות מתעקלות בין הסלעים.',
        pilotNote:
          'טיסת הרים היא ניהול אנרגיה: אי אפשר לבצע הליכה סביב בדרך הרגילה, ולכן כל קשר וכל רגל נחשבים. נתיב ה-RNP המתעקל של קווינסטאון בין רכס הרמרקבלס הוא הטיסה המדויקת ביותר שמטוס נוסעים מבצע.',
        airports: [
          { name: 'קווינסטאון', sight: 'גישת RNP-AR מתעקלת דרך רכס הרמרקבלס מעל אגם ווקטיפו' },
          { name: 'ז׳נבה', sight: 'ירידה ליד המון בלאן לאורך אגם ז׳נבה' },
          { name: 'זלצבורג', sight: 'הקפה ויזואלית מתחת לצוקי האונטרסברג בעיר של מוצרט' },
        ],
        bestFor: ['חובבי סקי', 'צלמי טבע', 'חובבי טיסה מדויקת'],
      },
      ru: {
        title: 'Мастера гор: Альпы и фьорды',
        tagline: 'Снежные вершины, ледниковые озёра и криволинейные заходы между скалами.',
        pilotNote:
          'Горный полёт — это управление энергией: обычный уход на второй круг невозможен, поэтому важен каждый узел и каждый фут. Криволинейный RNP-заход в Квинстаун через хребет Ремаркаблс — самое точное пилотирование, которое выполняет лайнер.',
        airports: [
          { name: 'Квинстаун', sight: 'Криволинейный заход RNP-AR через хребет Ремаркаблс над озером Уакатипу' },
          { name: 'Женева', sight: 'Снижение мимо Монблана вдоль всего Женевского озера' },
          { name: 'Зальцбург', sight: 'Визуальный круг под скалами Унтерсберга в городе Моцарта' },
        ],
        bestFor: ['Любители лыж', 'Фотографы природы', 'Поклонники точного пилотирования'],
      },
      fr: {
        title: 'Maîtres des montagnes : Alpes et fjords',
        tagline: 'Sommets enneigés, lacs glaciaires et approches en courbe entre les rochers.',
        pilotNote:
          'Le vol en montagne, c’est la gestion de l’énergie : impossible de remettre les gaz comme d’habitude, chaque nœud et chaque pied comptent. La trajectoire RNP en courbe de Queenstown à travers les Remarkables est le pilotage le plus précis qu’un avion de ligne exécute.',
        airports: [
          { name: 'Queenstown', sight: 'Approche RNP-AR en courbe à travers les Remarkables au-dessus du lac Wakatipu' },
          { name: 'Genève', sight: 'Descente devant le Mont Blanc le long du lac Léman' },
          { name: 'Salzbourg', sight: 'Circuit à vue sous les falaises de l’Untersberg, dans la ville de Mozart' },
        ],
        bestFor: ['Amateurs de ski', 'Photographes nature', 'Fans de vol de précision'],
      },
      ar: {
        title: 'أساتذة الجبال: الألب والمضايق',
        tagline: 'قمم مكللة بالثلوج وبحيرات جليدية ومقاربات منحنية بين الصخور.',
        pilotNote:
          'طيران الجبال هو إدارة الطاقة: لا يمكنك الدوران للإعادة بالطريقة المعتادة، لذلك تهم كل عقدة وكل قدم. مسار RNP المنحني في كوينزتاون عبر جبال ريماركابلز هو أدق طيران تقوم به طائرة ركاب.',
        airports: [
          { name: 'كوينزتاون', sight: 'مقاربة RNP-AR منحنية عبر جبال ريماركابلز فوق بحيرة واكاتيبو' },
          { name: 'جنيف', sight: 'هبوط بجوار مون بلان على طول بحيرة جنيف' },
          { name: 'سالزبورغ', sight: 'دورة بصرية تحت منحدرات أونترسبرغ في مدينة موزارت' },
        ],
        bestFor: ['عشاق التزلج', 'مصوّرو الطبيعة', 'محبو الطيران الدقيق'],
      },
      de: {
        title: 'Alpen- & Fjord-Bergmeister',
        tagline: 'Schneebedeckte Gipfel, Gletscherseen und geschwungene Anflüge zwischen Felsen.',
        pilotNote:
          'Gebirgsfliegerei ist Energiemanagement: Man kann nicht auf die übliche Art durchstarten, also zählt jeder Knoten und jeder Fuß. Queenstowns geschwungener RNP-Pfad durch die Remarkables ist das präziseste Fliegen eines Verkehrsflugzeugs.',
        airports: [
          { name: 'Queenstown', sight: 'Geschwungener RNP-AR-Anflug durch die Remarkables über dem Lake Wakatipu' },
          { name: 'Genf', sight: 'Sinkflug vorbei am Mont Blanc entlang des gesamten Genfersees' },
          { name: 'Salzburg', sight: 'Sichtplatzrunde unter den Klippen des Untersbergs in Mozarts Stadt' },
        ],
        bestFor: ['Ski-Fans', 'Naturfotografen', 'Präzisionsflug-Liebhaber'],
      },
    },
  },
  {
    id: 'route-tropical-ocean',
    addonId: 'addon-tropical-ocean',
    region: 'americas',
    difficulty: 3,
    icon: 'Globe',
    airports: [
      { icao: 'TNCM', iata: 'SXM' },
      { icao: 'SBRJ', iata: 'SDU' },
      { icao: 'VRMM', iata: 'MLE' },
    ],
    copy: {
      en: {
        title: 'Tropical Caribbean & Ocean Runways',
        tagline: 'Turquoise reefs, beach thresholds and strips built in the sea.',
        pilotNote:
          'Short, wet, hot and humid: ocean runways punish a long flare. Santos Dumont is 1,323 metres with water at both ends, so the touchdown point is everything. I will show you how airline crews land on the numbers.',
        airports: [
          { name: 'St. Maarten Princess Juliana', sight: 'Forty feet over the Maho Beach fence onto Runway 10' },
          { name: 'Rio de Janeiro Santos Dumont', sight: 'Past Christ the Redeemer and Sugarloaf onto a 1,323-metre bay runway' },
          { name: 'Malé Velana', sight: 'A coral-atoll strip surrounded by Indian Ocean lagoon' },
        ],
        bestFor: ['Honeymooners', 'Beach lovers', 'Short-field challenge'],
      },
      he: {
        title: 'הקריביים הטרופיים ומסלולים באוקיינוס',
        tagline: 'שוניות טורקיז, ספי מסלול על החוף ומסלולים שנבנו בתוך הים.',
        pilotNote:
          'קצר, רטוב, חם ולח: מסלולים באוקיינוס מענישים ריחוף ארוך. סנטוס דומון הוא 1,323 מטר עם מים בשני הקצוות, ולכן נקודת הנגיעה היא הכול. אראה לכם איך צוותי תעופה נוחתים בדיוק על המספרים.',
        airports: [
          { name: 'סנט מארטן פרינסס ג׳וליאנה', sight: 'ארבעים רגל מעל גדר חוף מאהו אל מסלול 10' },
          { name: 'ריו דה ז׳ניירו סנטוס דומון', sight: 'ליד פסל ישו הגואל וסוכר-לוף אל מסלול מפרץ של 1,323 מטר' },
          { name: 'מאלה ולאנה', sight: 'מסלול על אטול אלמוגים מוקף לגונה באוקיינוס ההודי' },
        ],
        bestFor: ['ירח דבש', 'חובבי חופים', 'אתגר מסלול קצר'],
      },
      ru: {
        title: 'Тропики Карибов и океанские полосы',
        tagline: 'Бирюзовые рифы, торцы на пляже и полосы, построенные в море.',
        pilotNote:
          'Коротко, мокро, жарко и влажно: океанские полосы наказывают за долгое выравнивание. Сантос-Дюмон — 1323 метра с водой с обеих сторон, поэтому точка касания решает всё. Покажу, как экипажи сажают самолёт точно «на цифры».',
        airports: [
          { name: 'Сен-Мартен Принцесса Юлиана', sight: 'Сорок футов над ограждением пляжа Махо на полосу 10' },
          { name: 'Рио-де-Жанейро Сантос-Дюмон', sight: 'Мимо статуи Христа и Сахарной Головы на полосу 1323 м в заливе' },
          { name: 'Мале Велана', sight: 'Полоса на коралловом атолле среди лагуны Индийского океана' },
        ],
        bestFor: ['Молодожёны', 'Любители пляжей', 'Короткая полоса как вызов'],
      },
      fr: {
        title: 'Caraïbes tropicales et pistes océanes',
        tagline: 'Récifs turquoise, seuils de piste sur la plage et pistes construites dans la mer.',
        pilotNote:
          'Court, mouillé, chaud et humide : les pistes océanes punissent un arrondi trop long. Santos Dumont fait 1 323 mètres avec de l’eau aux deux bouts, le point de toucher est donc tout. Je vous montrerai comment les équipages posent « sur les chiffres ».',
        airports: [
          { name: 'Saint-Martin Princess Juliana', sight: 'Quarante pieds au-dessus de la clôture de Maho Beach vers la piste 10' },
          { name: 'Rio de Janeiro Santos Dumont', sight: 'Devant le Christ Rédempteur et le Pain de Sucre vers une piste de 1 323 m dans la baie' },
          { name: 'Malé Velana', sight: 'Une piste sur un atoll corallien entourée du lagon de l’océan Indien' },
        ],
        bestFor: ['Lune de miel', 'Amoureux des plages', 'Défi piste courte'],
      },
      ar: {
        title: 'الكاريبي الاستوائي ومدارج المحيط',
        tagline: 'شعاب فيروزية وعتبات مدارج على الشاطئ ومدارج مبنية في البحر.',
        pilotNote:
          'قصير ورطب وحار: مدارج المحيط تعاقب على الانسياب الطويل قبل الملامسة. طول سانتوس دومون 1,323 متراً والماء على طرفيه، لذا نقطة الملامسة هي كل شيء. سأريك كيف تهبط أطقم شركات الطيران على الأرقام تماماً.',
        airports: [
          { name: 'سانت مارتن برينسيس جوليانا', sight: 'أربعون قدماً فوق سور شاطئ ماهو نحو المدرج 10' },
          { name: 'ريو دي جانيرو سانتوس دومون', sight: 'بجوار تمثال المسيح الفادي وجبل السكر نحو مدرج خليجي طوله 1,323 متراً' },
          { name: 'ماليه فيلانا', sight: 'مدرج على جزيرة مرجانية تحيط به بحيرة المحيط الهندي' },
        ],
        bestFor: ['شهر العسل', 'عشاق الشواطئ', 'تحدي المدرج القصير'],
      },
      de: {
        title: 'Tropische Karibik & Ozean-Pisten',
        tagline: 'Türkisfarbene Riffe, Strandschwellen und mitten ins Meer gebaute Landebahnen.',
        pilotNote:
          'Kurz, nass, heiß und feucht: Ozeanpisten bestrafen langes Ausschweben. Santos Dumont misst 1.323 Meter mit Wasser an beiden Enden – der Aufsetzpunkt ist alles. Ich zeige Ihnen, wie Airline-Crews exakt auf den Zahlen landen.',
        airports: [
          { name: 'St. Maarten Princess Juliana', sight: 'Vierzig Fuß über dem Zaun von Maho Beach auf Piste 10' },
          { name: 'Rio de Janeiro Santos Dumont', sight: 'Vorbei an Christusstatue und Zuckerhut auf eine 1.323-m-Buchtpiste' },
          { name: 'Malé Velana', sight: 'Eine Korallenatoll-Piste umgeben von der Lagune des Indischen Ozeans' },
        ],
        bestFor: ['Flitterwochen', 'Strandliebhaber', 'Kurzstrecken-Herausforderung'],
      },
    },
  },
  {
    id: 'route-middle-east-legends',
    addonId: 'addon-middle-east-legends',
    region: 'africa_middle_east',
    difficulty: 3,
    icon: 'Globe',
    airports: [
      { icao: 'OMDB', iata: 'DXB' },
      { icao: 'LXGB', iata: 'GIB' },
      { icao: 'LCLK', iata: 'LCA' },
    ],
    copy: {
      en: {
        title: 'Aviation Legends & Iconic Hubs',
        tagline: 'From the Burj Khalifa to the Rock of Gibraltar and home via Cyprus.',
        pilotNote:
          'Dubai is the busiest international airport in the world and Gibraltar has a main road crossing its runway. Larnaca is the approach every Israeli crew knows: it is our closest alternate, forty minutes from Ben Gurion.',
        airports: [
          { name: 'Dubai International', sight: 'Past the Burj Khalifa and Palm Jumeirah onto parallel runways' },
          { name: 'Gibraltar', sight: 'Wind rotors off the 1,400-ft Rock onto a runway crossed by Winston Churchill Avenue' },
          { name: 'Larnaca', sight: 'The classic Eastern Mediterranean coastal approach, Israel’s nearest alternate' },
        ],
        bestFor: ['Gulf travellers', 'History buffs', 'First world trio'],
      },
      he: {
        title: 'אגדות התעופה ונמלים איקוניים',
        tagline: 'מהבורג׳ ח׳ליפה לסלע גיברלטר, והביתה דרך קפריסין.',
        pilotNote:
          'דובאי הוא שדה התעופה הבינלאומי העמוס בעולם, ובגיברלטר כביש ראשי חוצה את המסלול. לרנקה היא הגישה שכל צוות ישראלי מכיר: שדה החלופה הקרוב ביותר שלנו, ארבעים דקות מנתב״ג.',
        airports: [
          { name: 'דובאי הבינלאומי', sight: 'ליד הבורג׳ ח׳ליפה ופאלם ג׳ומיירה אל מסלולים מקבילים' },
          { name: 'גיברלטר', sight: 'מערבולות רוח מהסלע בגובה 1,400 רגל אל מסלול שחוצה אותו שדרת וינסטון צ׳רצ׳יל' },
          { name: 'לרנקה', sight: 'הגישה החופית הקלאסית של מזרח הים התיכון, שדה החלופה הקרוב לישראל' },
        ],
        bestFor: ['מטיילים למפרץ', 'חובבי היסטוריה', 'שלישייה עולמית ראשונה'],
      },
      ru: {
        title: 'Легенды авиации и знаковые хабы',
        tagline: 'От Бурдж-Халифы до Гибралтарской скалы и домой через Кипр.',
        pilotNote:
          'Дубай — самый загруженный международный аэропорт мира, а в Гибралтаре полосу пересекает главная автодорога. Ларнаку знает каждый израильский экипаж: это наш ближайший запасной аэродром, сорок минут от Бен-Гуриона.',
        airports: [
          { name: 'Дубай Интернэшнл', sight: 'Мимо Бурдж-Халифы и Палм-Джумейры на параллельные полосы' },
          { name: 'Гибралтар', sight: 'Роторы ветра от 1400-футовой Скалы на полосу, которую пересекает авеню Уинстона Черчилля' },
          { name: 'Ларнака', sight: 'Классический прибрежный заход Восточного Средиземноморья, ближайший запасной для Израиля' },
        ],
        bestFor: ['Путешественники в Залив', 'Любители истории', 'Первое мировое трио'],
      },
      fr: {
        title: 'Légendes de l’aviation et hubs iconiques',
        tagline: 'Du Burj Khalifa au rocher de Gibraltar, puis retour par Chypre.',
        pilotNote:
          'Dubaï est l’aéroport international le plus fréquenté du monde et à Gibraltar, une route principale traverse la piste. Larnaca, c’est l’approche que tout équipage israélien connaît : notre dégagement le plus proche, à quarante minutes de Ben Gourion.',
        airports: [
          { name: 'Dubaï International', sight: 'Devant le Burj Khalifa et Palm Jumeirah vers des pistes parallèles' },
          { name: 'Gibraltar', sight: 'Rotors de vent au pied du Rocher (1 400 ft) vers une piste traversée par la Winston Churchill Avenue' },
          { name: 'Larnaca', sight: 'L’approche côtière classique de Méditerranée orientale, dégagement le plus proche d’Israël' },
        ],
        bestFor: ['Voyageurs du Golfe', 'Passionnés d’histoire', 'Premier trio mondial'],
      },
      ar: {
        title: 'أساطير الطيران والمطارات الأيقونية',
        tagline: 'من برج خليفة إلى صخرة جبل طارق، والعودة عبر قبرص.',
        pilotNote:
          'دبي أكثر مطارات العالم الدولية ازدحاماً، وفي جبل طارق يقطع طريق رئيسي المدرج. ولارنكا هي المقاربة التي يعرفها كل طاقم إسرائيلي: أقرب مطار بديل لنا، على بعد أربعين دقيقة من بن غوريون.',
        airports: [
          { name: 'دبي الدولي', sight: 'بجوار برج خليفة ونخلة جميرا نحو مدرجات متوازية' },
          { name: 'جبل طارق', sight: 'دوامات رياح من الصخرة بارتفاع 1,400 قدم نحو مدرج يقطعه شارع ونستون تشرشل' },
          { name: 'لارنكا', sight: 'المقاربة الساحلية الكلاسيكية لشرق المتوسط، أقرب مطار بديل لإسرائيل' },
        ],
        bestFor: ['المسافرون إلى الخليج', 'عشاق التاريخ', 'أول ثلاثية عالمية'],
      },
      de: {
        title: 'Luftfahrt-Legenden & Ikonische Hubs',
        tagline: 'Vom Burj Khalifa zum Felsen von Gibraltar und über Zypern zurück nach Hause.',
        pilotNote:
          'Dubai ist der verkehrsreichste internationale Flughafen der Welt, und in Gibraltar kreuzt eine Hauptstraße die Piste. Larnaka ist der Anflug, den jede israelische Crew kennt: unser nächster Ausweichflughafen, vierzig Minuten ab Ben Gurion.',
        airports: [
          { name: 'Dubai International', sight: 'Vorbei am Burj Khalifa und Palm Jumeirah auf parallele Pisten' },
          { name: 'Gibraltar', sight: 'Windrotoren vom 1.400 ft hohen Felsen auf eine von der Winston Churchill Avenue gekreuzte Piste' },
          { name: 'Larnaka', sight: 'Der klassische Küstenanflug im östlichen Mittelmeer, Israels nächster Ausweichplatz' },
        ],
        bestFor: ['Golf-Reisende', 'Geschichtsfans', 'Erstes Welt-Trio'],
      },
    },
  },

  // ───────────────────────── Proposed trios (on request, briefed via /contact) ─────────────────────────
  {
    id: 'route-israel-home-skies',
    region: 'israel',
    difficulty: 2,
    icon: 'Compass',
    airports: [
      { icao: 'LLBG', iata: 'TLV' },
      { icao: 'LLER', iata: 'ETM' },
      { icao: 'LLOV', iata: 'VDA' },
    ],
    copy: {
      en: {
        title: 'Israel Home Skies',
        tagline: 'Take off from Ben Gurion, see your own country from the captain’s seat.',
        pilotNote:
          'Nothing beats recognising your own street from 3,000 feet. We depart Runway 26 over Tel Aviv, run down the coast and the Dead Sea at 1,400 feet below sea level, and land in the Timna desert at Ramon. Every Israeli should fly this once.',
        airports: [
          { name: 'Tel Aviv Ben Gurion', sight: 'Departure over the Tel Aviv shoreline and the Azrieli towers' },
          { name: 'Eilat Ramon', sight: 'Desert valley approach beside the Timna mountains with the Red Sea ahead' },
          { name: 'Ovda', sight: 'A former air-force runway in the Negev, flown as a scenic desert landing' },
        ],
        bestFor: ['Families', 'Grandparents and grandchildren', 'New immigrants'],
      },
      he: {
        title: 'שמי הבית: ישראל',
        tagline: 'ממריאים מנתב״ג ורואים את הארץ שלכם מכיסא הקברניט.',
        pilotNote:
          'אין כמו לזהות את הרחוב שלכם מגובה 3,000 רגל. נמריא ממסלול 26 מעל תל אביב, נרד לאורך החוף ולים המלח בגובה 1,400 רגל מתחת לפני הים, וננחת במדבר תמנע ברמון. כל ישראלי צריך לטוס את זה פעם אחת.',
        airports: [
          { name: 'תל אביב נתב״ג', sight: 'המראה מעל קו החוף של תל אביב ומגדלי עזריאלי' },
          { name: 'אילת רמון', sight: 'גישה בעמק מדברי לצד הרי תמנע עם ים סוף מלפנים' },
          { name: 'עובדה', sight: 'מסלול חיל האוויר לשעבר בנגב, כנחיתה מדברית נופית' },
        ],
        bestFor: ['משפחות', 'סבים ונכדים', 'עולים חדשים'],
      },
      ru: {
        title: 'Родное небо: Израиль',
        tagline: 'Взлетите из Бен-Гуриона и увидьте свою страну из кресла командира.',
        pilotNote:
          'Ничто не сравнится с тем, чтобы узнать свою улицу с высоты 3000 футов. Взлетаем с полосы 26 над Тель-Авивом, идём вдоль побережья и над Мёртвым морем на 1400 футов ниже уровня моря и садимся в пустыне Тимна в аэропорту Рамон. Каждый израильтянин должен пролететь это хотя бы раз.',
        airports: [
          { name: 'Тель-Авив Бен-Гурион', sight: 'Вылет над побережьем Тель-Авива и башнями «Азриэли»' },
          { name: 'Эйлат Рамон', sight: 'Заход по пустынной долине у гор Тимна, впереди Красное море' },
          { name: 'Овда', sight: 'Бывшая полоса ВВС в Негеве — живописная посадка в пустыне' },
        ],
        bestFor: ['Семьи', 'Бабушки, дедушки и внуки', 'Новые репатрианты'],
      },
      fr: {
        title: 'Le ciel de la maison : Israël',
        tagline: 'Décollez de Ben Gourion et découvrez votre pays depuis le siège du commandant.',
        pilotNote:
          'Rien ne vaut reconnaître sa propre rue depuis 3 000 pieds. Nous décollons de la piste 26 au-dessus de Tel-Aviv, longeons la côte et la mer Morte à 1 400 pieds sous le niveau de la mer, puis nous posons dans le désert de Timna, à Ramon. Chaque Israélien devrait voler cela une fois.',
        airports: [
          { name: 'Tel-Aviv Ben Gourion', sight: 'Décollage au-dessus du littoral de Tel-Aviv et des tours Azrieli' },
          { name: 'Eilat Ramon', sight: 'Approche dans la vallée désertique le long des monts Timna, mer Rouge droit devant' },
          { name: 'Ovda', sight: 'Une ancienne piste de l’armée de l’air dans le Néguev, en atterrissage panoramique' },
        ],
        bestFor: ['Familles', 'Grands-parents et petits-enfants', 'Nouveaux immigrants'],
      },
      ar: {
        title: 'سماء الوطن: إسرائيل',
        tagline: 'أقلع من بن غوريون وشاهد بلدك من مقعد القبطان.',
        pilotNote:
          'لا شيء يضاهي التعرف على شارعك من ارتفاع 3,000 قدم. نقلع من المدرج 26 فوق تل أبيب، ونتجه على طول الساحل والبحر الميت على ارتفاع 1,400 قدم تحت سطح البحر، ونهبط في صحراء تمنع في مطار رامون. على كل إسرائيلي أن يطير هذه الرحلة مرة واحدة.',
        airports: [
          { name: 'تل أبيب بن غوريون', sight: 'إقلاع فوق شاطئ تل أبيب وأبراج عزرائيلي' },
          { name: 'إيلات رامون', sight: 'مقاربة في وادٍ صحراوي بجوار جبال تمنع والبحر الأحمر في الأمام' },
          { name: 'عوفدا', sight: 'مدرج سابق لسلاح الجو في النقب، يُطار كهبوط صحراوي خلاب' },
        ],
        bestFor: ['العائلات', 'الأجداد والأحفاد', 'المهاجرون الجدد'],
      },
      de: {
        title: 'Heimathimmel Israel',
        tagline: 'Starten Sie in Ben Gurion und sehen Sie Ihr Land vom Kapitänssitz aus.',
        pilotNote:
          'Nichts übertrifft es, die eigene Straße aus 3.000 Fuß zu erkennen. Wir starten auf Piste 26 über Tel Aviv, fliegen die Küste entlang und über das Tote Meer 1.400 Fuß unter dem Meeresspiegel und landen in der Timna-Wüste in Ramon. Jeder Israeli sollte das einmal fliegen.',
        airports: [
          { name: 'Tel Aviv Ben Gurion', sight: 'Abflug über die Küste von Tel Aviv und die Azrieli-Türme' },
          { name: 'Eilat Ramon', sight: 'Wüstental-Anflug neben den Timna-Bergen mit dem Roten Meer voraus' },
          { name: 'Ovda', sight: 'Eine ehemalige Luftwaffenpiste im Negev als malerische Wüstenlandung' },
        ],
        bestFor: ['Familien', 'Großeltern und Enkel', 'Neueinwanderer'],
      },
    },
  },
  {
    id: 'route-atlantic-outposts',
    region: 'europe',
    difficulty: 4,
    icon: 'Compass',
    airports: [
      { icao: 'LPMA', iata: 'FNC' },
      { icao: 'EKVG', iata: 'FAE' },
      { icao: 'GCXO', iata: 'TFN' },
    ],
    copy: {
      en: {
        title: 'Atlantic Outposts',
        tagline: 'Island runways on stilts, in fjords and in the clouds.',
        pilotNote:
          'Madeira requires a special captain qualification: the runway sits on concrete pillars and the wind rolls off the cliffs. Vágar hides between Faroese fjords, and Tenerife North lives in orographic cloud. Three airports that demand respect.',
        airports: [
          { name: 'Madeira Funchal', sight: 'A hand-flown curved approach onto a runway extended on 180 concrete pillars' },
          { name: 'Faroe Islands Vágar', sight: 'Through North Atlantic fjords onto a short wind-swept strip' },
          { name: 'Tenerife North', sight: 'ILS into fast-moving cloud 2,000 ft up Mount Teide’s slopes' },
        ],
        bestFor: ['Weather-flying fans', 'Experienced sim pilots', 'Island hoppers'],
      },
      he: {
        title: 'מאחזי האטלנטי',
        tagline: 'מסלולי איים על עמודים, בפיורדים ובתוך העננים.',
        pilotNote:
          'מדיירה דורשת הסמכת קברניט מיוחדת: המסלול יושב על עמודי בטון והרוח מתגלגלת מהצוקים. ואגאר מסתתר בין פיורדים בפארו, וטנריף צפון חי בתוך ענן אורוגרפי. שלושה שדות שדורשים כבוד.',
        airports: [
          { name: 'מדיירה פונשל', sight: 'גישה ידנית מתעקלת אל מסלול שהוארך על 180 עמודי בטון' },
          { name: 'איי פארו ואגאר', sight: 'דרך פיורדים של צפון האטלנטי אל מסלול קצר וסחוף רוח' },
          { name: 'טנריף צפון', sight: 'גישת ILS לתוך ענן נע במהירות, 2,000 רגל במעלה מדרונות הר טיידה' },
        ],
        bestFor: ['חובבי טיסת מזג אוויר', 'טייסי סימולטור מנוסים', 'מדלגי איים'],
      },
      ru: {
        title: 'Форпосты Атлантики',
        tagline: 'Островные полосы на сваях, во фьордах и в облаках.',
        pilotNote:
          'Для Мадейры нужен особый допуск командира: полоса стоит на бетонных опорах, а ветер скатывается со скал. Вагар прячется между фарерскими фьордами, а Тенерифе-Северный живёт в орографической облачности. Три аэропорта, требующих уважения.',
        airports: [
          { name: 'Мадейра Фуншал', sight: 'Ручной криволинейный заход на полосу, удлинённую на 180 бетонных опорах' },
          { name: 'Фарерские острова Вагар', sight: 'Сквозь фьорды Северной Атлантики на короткую, продуваемую ветром полосу' },
          { name: 'Тенерифе-Северный', sight: 'ILS в быстро бегущие облака на 2000 футах по склонам вулкана Тейде' },
        ],
        bestFor: ['Любители полётов в непогоду', 'Опытные сим-пилоты', 'Островные путешественники'],
      },
      fr: {
        title: 'Avant-postes de l’Atlantique',
        tagline: 'Des pistes insulaires sur pilotis, dans les fjords et dans les nuages.',
        pilotNote:
          'Madère exige une qualification spéciale du commandant : la piste repose sur des piliers de béton et le vent déferle des falaises. Vágar se cache entre les fjords féringiens, et Tenerife Nord vit dans le nuage orographique. Trois aéroports qui imposent le respect.',
        airports: [
          { name: 'Madère Funchal', sight: 'Approche en courbe à la main vers une piste prolongée sur 180 piliers de béton' },
          { name: 'Îles Féroé Vágar', sight: 'À travers les fjords de l’Atlantique Nord vers une piste courte et ventée' },
          { name: 'Tenerife Nord', sight: 'ILS dans des nuages rapides à 2 000 ft sur les pentes du Teide' },
        ],
        bestFor: ['Fans de vol par mauvais temps', 'Pilotes sim expérimentés', 'Sauteurs d’îles'],
      },
      ar: {
        title: 'مواقع الأطلسي النائية',
        tagline: 'مدارج جزر على أعمدة، وفي المضايق، وداخل الغيوم.',
        pilotNote:
          'ماديرا تتطلب تأهيلاً خاصاً للقبطان: المدرج يقوم على أعمدة خرسانية والرياح تتدحرج من المنحدرات. فاغار يختبئ بين مضايق جزر فارو، وتينيريفي الشمالي يعيش داخل غيوم جبلية. ثلاثة مطارات تستحق الاحترام.',
        airports: [
          { name: 'ماديرا فونشال', sight: 'مقاربة يدوية منحنية نحو مدرج مُمدَّد على 180 عموداً خرسانياً' },
          { name: 'جزر فارو فاغار', sight: 'عبر مضايق شمال الأطلسي نحو مدرج قصير تعصف به الرياح' },
          { name: 'تينيريفي الشمالي', sight: 'مقاربة ILS داخل غيوم سريعة الحركة على ارتفاع 2,000 قدم فوق منحدرات جبل تيدي' },
        ],
        bestFor: ['محبو الطيران في الأحوال الجوية', 'طيارو المحاكاة المتمرسون', 'متنقلو الجزر'],
      },
      de: {
        title: 'Atlantik-Außenposten',
        tagline: 'Inselpisten auf Stelzen, in Fjorden und mitten in den Wolken.',
        pilotNote:
          'Madeira erfordert eine besondere Kapitänsqualifikation: Die Piste ruht auf Betonpfeilern und der Wind fällt von den Klippen. Vágar versteckt sich zwischen Färöer-Fjorden, und Teneriffa Nord liegt oft in orografischen Wolken. Drei Flughäfen, die Respekt verlangen.',
        airports: [
          { name: 'Madeira Funchal', sight: 'Handgeflogener Kurvenanflug auf eine Piste auf 180 Betonpfeilern' },
          { name: 'Färöer-Inseln Vágar', sight: 'Durch Nordatlantik-Fjorde auf eine kurze, windumtoste Piste' },
          { name: 'Teneriffa Nord', sight: 'ILS in schnell ziehende Wolken 2.000 ft hoch an den Hängen des Teide' },
        ],
        bestFor: ['Schlechtwetter-Fans', 'Erfahrene Sim-Piloten', 'Inselhüpfer'],
      },
    },
  },
  {
    id: 'route-arctic-lights',
    region: 'europe',
    difficulty: 3,
    icon: 'Compass',
    airports: [
      { icao: 'ENTC', iata: 'TOS' },
      { icao: 'ENSB', iata: 'LYR' },
      { icao: 'BIKF', iata: 'KEF' },
    ],
    copy: {
      en: {
        title: 'Arctic Northern Lights',
        tagline: 'Snow, aurora and icy runways above the Arctic Circle.',
        pilotNote:
          'Svalbard is the northernmost airport a Boeing 737 flies to on a scheduled service, at 78° north. In winter the sun never rises, the braking action is reported in friction coefficients and the aurora dances above the glideslope. Bring a sweater.',
        airports: [
          { name: 'Tromsø', sight: 'Fjord approach between snow-covered peaks under the northern lights' },
          { name: 'Svalbard Longyearbyen', sight: 'The world’s northernmost 737 destination: polar night and a frozen runway' },
          { name: 'Keflavík', sight: 'Lava fields and Atlantic gusts on Iceland’s windswept ILS' },
        ],
        bestFor: ['Winter romantics', 'Northern-lights dreamers', 'Cold-weather handling'],
      },
      he: {
        title: 'הזוהר הצפוני באזור הארקטי',
        tagline: 'שלג, זוהר צפוני ומסלולים קפואים מצפון לחוג הארקטי.',
        pilotNote:
          'סבאלבארד הוא השדה הצפוני ביותר שאליו מגיע בואינג 737 בטיסה סדירה, בקו רוחב 78° צפון. בחורף השמש לא עולה, פעולת הבלימה מדווחת במקדמי חיכוך והזוהר הצפוני רוקד מעל שיפוע הגלישה. תביאו סוודר.',
        airports: [
          { name: 'טרומסה', sight: 'גישה בפיורד בין פסגות מושלגות תחת הזוהר הצפוני' },
          { name: 'סבאלבארד לונגיירביין', sight: 'יעד ה-737 הצפוני בעולם: לילה קוטבי ומסלול קפוא' },
          { name: 'קפלאוויק', sight: 'שדות לבה ומשבי רוח אטלנטיים בגישת ILS סחופת רוח באיסלנד' },
        ],
        bestFor: ['רומנטיקנים של חורף', 'חולמים על הזוהר הצפוני', 'תפעול במזג אוויר קר'],
      },
      ru: {
        title: 'Северное сияние Арктики',
        tagline: 'Снег, полярное сияние и обледенелые полосы за Полярным кругом.',
        pilotNote:
          'Шпицберген — самый северный аэропорт, куда Boeing 737 летает по расписанию, 78° северной широты. Зимой солнце не восходит, эффективность торможения сообщают коэффициентом сцепления, а сияние танцует над глиссадой. Возьмите свитер.',
        airports: [
          { name: 'Тромсё', sight: 'Заход по фьорду между заснеженными вершинами под северным сиянием' },
          { name: 'Шпицберген Лонгйир', sight: 'Самый северный пункт назначения 737: полярная ночь и замёрзшая полоса' },
          { name: 'Кеблавик', sight: 'Лавовые поля и атлантические порывы на продуваемом ILS Исландии' },
        ],
        bestFor: ['Зимние романтики', 'Мечтающие о северном сиянии', 'Полёты в холод'],
      },
      fr: {
        title: 'Aurores boréales de l’Arctique',
        tagline: 'Neige, aurores et pistes verglacées au-delà du cercle polaire.',
        pilotNote:
          'Le Svalbard est l’aéroport le plus septentrional desservi en ligne régulière par un Boeing 737, à 78° nord. En hiver le soleil ne se lève pas, le freinage se mesure en coefficients de friction et l’aurore danse au-dessus du plan de descente. Prenez un pull.',
        airports: [
          { name: 'Tromsø', sight: 'Approche dans le fjord entre des sommets enneigés sous les aurores boréales' },
          { name: 'Svalbard Longyearbyen', sight: 'La destination 737 la plus au nord du monde : nuit polaire et piste gelée' },
          { name: 'Keflavík', sight: 'Champs de lave et rafales atlantiques sur l’ILS balayé par le vent d’Islande' },
        ],
        bestFor: ['Romantiques de l’hiver', 'Rêveurs d’aurores boréales', 'Pilotage par temps froid'],
      },
      ar: {
        title: 'الشفق القطبي في القطب الشمالي',
        tagline: 'ثلج وشفق قطبي ومدارج جليدية شمال الدائرة القطبية.',
        pilotNote:
          'سفالبارد هو أقصى مطار شمالي تصل إليه بوينغ 737 في رحلات منتظمة، عند خط عرض 78° شمالاً. في الشتاء لا تشرق الشمس، ويُبلَّغ عن فعالية الكبح بمعاملات الاحتكاك، ويرقص الشفق القطبي فوق مسار الانحدار. أحضر سترة.',
        airports: [
          { name: 'ترومسو', sight: 'مقاربة في المضيق بين قمم مكللة بالثلوج تحت الشفق القطبي' },
          { name: 'سفالبارد لونغييربين', sight: 'أقصى وجهة شمالية لطائرة 737 في العالم: ليل قطبي ومدرج متجمد' },
          { name: 'كيفلافيك', sight: 'حقول الحمم وهبّات الأطلسي على مقاربة ILS عاصفة في آيسلندا' },
        ],
        bestFor: ['رومانسيو الشتاء', 'الحالمون بالشفق القطبي', 'التعامل مع الطقس البارد'],
      },
      de: {
        title: 'Arktisches Nordlicht',
        tagline: 'Schnee, Polarlichter und vereiste Pisten jenseits des Polarkreises.',
        pilotNote:
          'Spitzbergen ist der nördlichste Flughafen, den eine Boeing 737 im Linienbetrieb anfliegt, auf 78° Nord. Im Winter geht die Sonne nie auf, die Bremswirkung wird in Reibungskoeffizienten gemeldet und das Nordlicht tanzt über dem Gleitpfad. Pullover mitbringen!',
        airports: [
          { name: 'Tromsø', sight: 'Fjordanflug zwischen schneebedeckten Gipfeln unter dem Nordlicht' },
          { name: 'Spitzbergen Longyearbyen', sight: 'Das nördlichste 737-Ziel der Welt: Polarnacht und gefrorene Piste' },
          { name: 'Keflavík', sight: 'Lavafelder und Atlantikböen auf Islands windumtostem ILS' },
        ],
        bestFor: ['Winterromantiker', 'Nordlicht-Träumer', 'Kaltwetter-Fliegerei'],
      },
    },
  },
  {
    id: 'route-himalaya-roof',
    region: 'extreme',
    difficulty: 5,
    icon: 'Compass',
    airports: [
      { icao: 'VNKT', iata: 'KTM' },
      { icao: 'VILH', iata: 'IXL' },
      { icao: 'ZULS', iata: 'LXA' },
    ],
    copy: {
      en: {
        title: 'Roof of the World',
        tagline: 'Three high-altitude airports where the air is thin and the margins thinner.',
        pilotNote:
          'At 11,000 feet elevation the 737 lands faster, climbs slower and needs most of the runway. Kathmandu’s steep VOR descent toward the Himalaya, Leh’s one-way valley, Lhasa on the Tibetan plateau: this is where performance calculations stop being theory.',
        airports: [
          { name: 'Kathmandu Tribhuvan', sight: 'A steep VOR/DME descent into the bowl with Everest on the horizon' },
          { name: 'Leh Kushok Bakula Rimpochee', sight: 'A one-way valley landing at 10,682 ft, no go-around beyond the point of commitment' },
          { name: 'Lhasa Gonggar', sight: 'The Tibetan plateau at 11,713 ft along the Yarlung Tsangpo river' },
        ],
        bestFor: ['Mountain lovers', 'Trekkers and climbers', 'Pilots who want the numbers'],
      },
      he: {
        title: 'גג העולם',
        tagline: 'שלושה שדות בגובה רב, שבהם האוויר דליל והמרווחים דלילים עוד יותר.',
        pilotNote:
          'בגובה 11,000 רגל ה-737 נוחת מהר יותר, מטפס לאט יותר וצריך את רוב המסלול. הירידה התלולה בקטמנדו לעבר ההימלאיה, העמק החד-כיווני של לה, להסה על הרמה הטיבטית: כאן חישובי הביצועים מפסיקים להיות תאוריה.',
        airports: [
          { name: 'קטמנדו טריבהובן', sight: 'ירידת VOR/DME תלולה אל הקערה עם האוורסט באופק' },
          { name: 'לה קושוק באקולה רימפוצ׳ה', sight: 'נחיתה בעמק חד-כיווני בגובה 10,682 רגל, בלי הליכה סביב אחרי נקודת ההחלטה' },
          { name: 'להסה גונגאר', sight: 'הרמה הטיבטית בגובה 11,713 רגל לאורך נהר הירלונג צאנגפו' },
        ],
        bestFor: ['חובבי הרים', 'מטיילים ומטפסים', 'טייסים שרוצים את המספרים'],
      },
      ru: {
        title: 'Крыша мира',
        tagline: 'Три высокогорных аэропорта, где воздух разрежён, а запасы ещё меньше.',
        pilotNote:
          'На высоте 11 000 футов 737 садится быстрее, набирает медленнее и использует почти всю полосу. Крутое снижение в Катманду к Гималаям, односторонняя долина Леха, Лхаса на Тибетском плато — здесь расчёты характеристик перестают быть теорией.',
        airports: [
          { name: 'Катманду Трибхуван', sight: 'Крутое снижение по VOR/DME в котловину с Эверестом на горизонте' },
          { name: 'Лех Кушок Бакула Римпочи', sight: 'Посадка в односторонней долине на 10 682 футах, без ухода на второй круг после точки принятия решения' },
          { name: 'Лхаса Гонггар', sight: 'Тибетское плато на 11 713 футах вдоль реки Ярлунг Цангпо' },
        ],
        bestFor: ['Любители гор', 'Треккеры и альпинисты', 'Пилоты, которым нужны цифры'],
      },
      fr: {
        title: 'Le toit du monde',
        tagline: 'Trois aéroports de haute altitude où l’air est rare et les marges plus encore.',
        pilotNote:
          'À 11 000 pieds d’altitude, le 737 se pose plus vite, monte plus lentement et utilise presque toute la piste. La descente VOR abrupte de Katmandou vers l’Himalaya, la vallée à sens unique de Leh, Lhassa sur le plateau tibétain : ici, les calculs de performances cessent d’être de la théorie.',
        airports: [
          { name: 'Katmandou Tribhuvan', sight: 'Descente VOR/DME abrupte dans la cuvette, l’Everest à l’horizon' },
          { name: 'Leh Kushok Bakula Rimpochee', sight: 'Atterrissage dans une vallée à sens unique à 10 682 ft, sans remise de gaz après le point d’engagement' },
          { name: 'Lhassa Gonggar', sight: 'Le plateau tibétain à 11 713 ft le long du Yarlung Tsangpo' },
        ],
        bestFor: ['Amoureux des montagnes', 'Trekkeurs et alpinistes', 'Pilotes qui veulent les chiffres'],
      },
      ar: {
        title: 'سقف العالم',
        tagline: 'ثلاثة مطارات شاهقة الارتفاع حيث الهواء رقيق والهوامش أرقّ.',
        pilotNote:
          'على ارتفاع 11,000 قدم تهبط 737 أسرع وتصعد أبطأ وتحتاج معظم المدرج. الهبوط الحاد في كاتماندو نحو الهيمالايا، ووادي ليه أحادي الاتجاه، ولاسا على هضبة التبت: هنا تتوقف حسابات الأداء عن كونها نظرية.',
        airports: [
          { name: 'كاتماندو تريبهوفان', sight: 'هبوط VOR/DME حاد إلى الحوض وإيفرست في الأفق' },
          { name: 'ليه كوشوك باكولا ريمبوتشي', sight: 'هبوط في وادٍ أحادي الاتجاه على ارتفاع 10,682 قدماً، بلا إعادة دوران بعد نقطة الالتزام' },
          { name: 'لاسا غونغار', sight: 'هضبة التبت على ارتفاع 11,713 قدماً على طول نهر يارلونغ تسانغبو' },
        ],
        bestFor: ['عشاق الجبال', 'المتنزهون والمتسلقون', 'طيارون يريدون الأرقام'],
      },
      de: {
        title: 'Dach der Welt',
        tagline: 'Drei Hochgebirgsflughäfen, wo die Luft dünn ist und die Reserven noch dünner.',
        pilotNote:
          'In 11.000 Fuß Höhe landet die 737 schneller, steigt langsamer und braucht fast die gesamte Piste. Kathmandus steiler VOR-Sinkflug zum Himalaya, Lehs Einbahn-Tal, Lhasa auf dem Tibet-Plateau: Hier wird Leistungsberechnung zur Realität.',
        airports: [
          { name: 'Kathmandu Tribhuvan', sight: 'Steiler VOR/DME-Sinkflug in den Kessel mit dem Everest am Horizont' },
          { name: 'Leh Kushok Bakula Rimpochee', sight: 'Einbahn-Tallandung auf 10.682 ft, kein Durchstarten nach dem Entscheidungspunkt' },
          { name: 'Lhasa Gonggar', sight: 'Das tibetische Hochplateau auf 11.713 ft entlang des Yarlung-Tsangpo-Flusses' },
        ],
        bestFor: ['Bergliebhaber', 'Trekker und Bergsteiger', 'Piloten, die es genau wissen wollen'],
      },
    },
  },
  {
    id: 'route-african-horizons',
    region: 'africa_middle_east',
    difficulty: 2,
    icon: 'Globe',
    airports: [
      { icao: 'FACT', iata: 'CPT' },
      { icao: 'HTKJ', iata: 'JRO' },
      { icao: 'HECA', iata: 'CAI' },
    ],
    copy: {
      en: {
        title: 'African Great Horizons',
        tagline: 'Table Mountain, Kilimanjaro and the Pyramids from the flight deck.',
        pilotNote:
          'Africa is the continent of big skies. The approach into Cape Town turns right under Table Mountain, Kilimanjaro’s snow sits above the clouds on short final, and Cairo at dawn puts the Pyramids of Giza under your left wing. Long, calm, unforgettable.',
        airports: [
          { name: 'Cape Town', sight: 'Approach beneath Table Mountain with the two oceans meeting below' },
          { name: 'Kilimanjaro', sight: 'Final approach pointed at Africa’s highest peak above the clouds' },
          { name: 'Cairo', sight: 'Dawn arrival over the Nile with the Pyramids of Giza off the wing' },
        ],
        bestFor: ['Safari dreamers', 'Relaxed sightseeing', 'Grandparents'],
      },
      he: {
        title: 'האופקים הגדולים של אפריקה',
        tagline: 'הר השולחן, הקילימנג׳רו והפירמידות מתא הטייס.',
        pilotNote:
          'אפריקה היא יבשת השמיים הגדולים. הגישה לקייפטאון פונה ימינה מתחת להר השולחן, השלג של הקילימנג׳רו יושב מעל העננים בפיינל קצר, וקהיר עם שחר שמה את פירמידות גיזה מתחת לכנף השמאלית. ארוך, רגוע, בלתי נשכח.',
        airports: [
          { name: 'קייפטאון', sight: 'גישה מתחת להר השולחן כששני האוקיינוסים נפגשים מלמטה' },
          { name: 'קילימנג׳רו', sight: 'פיינל שמכוון אל הפסגה הגבוהה באפריקה מעל העננים' },
          { name: 'קהיר', sight: 'הגעה עם שחר מעל הנילוס עם פירמידות גיזה מחוץ לכנף' },
        ],
        bestFor: ['חולמי ספארי', 'סיור נינוח', 'סבים וסבתות'],
      },
      ru: {
        title: 'Великие горизонты Африки',
        tagline: 'Столовая гора, Килиманджаро и пирамиды из кабины экипажа.',
        pilotNote:
          'Африка — континент большого неба. Заход в Кейптаун поворачивает вправо под Столовой горой, снег Килиманджаро лежит над облаками на короткой прямой, а рассветный Каир кладёт пирамиды Гизы под левое крыло. Долго, спокойно, незабываемо.',
        airports: [
          { name: 'Кейптаун', sight: 'Заход под Столовой горой, где внизу встречаются два океана' },
          { name: 'Килиманджаро', sight: 'Предпосадочная прямая нацелена на высочайшую вершину Африки над облаками' },
          { name: 'Каир', sight: 'Прибытие на рассвете над Нилом с пирамидами Гизы под крылом' },
        ],
        bestFor: ['Мечтающие о сафари', 'Спокойный обзорный полёт', 'Бабушки и дедушки'],
      },
      fr: {
        title: 'Grands horizons d’Afrique',
        tagline: 'La montagne de la Table, le Kilimandjaro et les pyramides depuis le cockpit.',
        pilotNote:
          'L’Afrique est le continent des grands ciels. L’approche du Cap vire à droite sous la montagne de la Table, la neige du Kilimandjaro repose au-dessus des nuages en courte finale, et Le Caire à l’aube place les pyramides de Gizeh sous l’aile gauche. Long, calme, inoubliable.',
        airports: [
          { name: 'Le Cap', sight: 'Approche sous la montagne de la Table, les deux océans se rejoignant en bas' },
          { name: 'Kilimandjaro', sight: 'Finale pointée vers le plus haut sommet d’Afrique au-dessus des nuages' },
          { name: 'Le Caire', sight: 'Arrivée à l’aube au-dessus du Nil, les pyramides de Gizeh sous l’aile' },
        ],
        bestFor: ['Rêveurs de safari', 'Tourisme aérien détendu', 'Grands-parents'],
      },
      ar: {
        title: 'آفاق أفريقيا الكبرى',
        tagline: 'جبل الطاولة وكليمنجارو والأهرامات من مقصورة القيادة.',
        pilotNote:
          'أفريقيا قارة السماء الواسعة. المقاربة إلى كيب تاون تنعطف يميناً تحت جبل الطاولة، وثلوج كليمنجارو تجلس فوق الغيوم في النهائي القصير، والقاهرة عند الفجر تضع أهرامات الجيزة تحت جناحك الأيسر. طويلة، هادئة، لا تُنسى.',
        airports: [
          { name: 'كيب تاون', sight: 'مقاربة تحت جبل الطاولة حيث يلتقي المحيطان في الأسفل' },
          { name: 'كليمنجارو', sight: 'نهائي موجّه نحو أعلى قمة في أفريقيا فوق الغيوم' },
          { name: 'القاهرة', sight: 'وصول عند الفجر فوق النيل وأهرامات الجيزة بجوار الجناح' },
        ],
        bestFor: ['الحالمون بالسفاري', 'جولة مريحة', 'الأجداد'],
      },
      de: {
        title: 'Afrikas große Horizonte',
        tagline: 'Tafelberg, Kilimandscharo und die Pyramiden aus dem Cockpit.',
        pilotNote:
          'Afrika ist der Kontinent der weiten Himmel. Der Anflug auf Kapstadt dreht direkt unter dem Tafelberg rechts ein, der Schnee des Kilimandscharos liegt im kurzen Endanflug über den Wolken, und Kairo im Morgengrauen legt die Pyramiden von Gizeh unter Ihre linke Tragfläche. Ruhig, weit, unvergesslich.',
        airports: [
          { name: 'Kapstadt', sight: 'Anflug unter dem Tafelberg, wo sich unten zwei Ozeane treffen' },
          { name: 'Kilimandscharo', sight: 'Endanflug direkt auf Afrikas höchsten Gipfel über den Wolken' },
          { name: 'Kairo', sight: 'Ankunft im Morgengrauen über dem Nil mit den Pyramiden von Gizeh unter dem Flügel' },
        ],
        bestFor: ['Safari-Träumer', 'Entspannte Rundflüge', 'Großeltern'],
      },
    },
  },
  {
    id: 'route-pacific-winds',
    region: 'asia_pacific',
    difficulty: 3,
    icon: 'Globe',
    airports: [
      { icao: 'NZWN', iata: 'WLG' },
      { icao: 'YSSY', iata: 'SYD' },
      { icao: 'PHNL', iata: 'HNL' },
    ],
    copy: {
      en: {
        title: 'Pacific Rim & Trade Winds',
        tagline: 'Harbour bridges, volcanic coasts and the windiest runway in the Pacific.',
        pilotNote:
          'Wellington is famous among crews for a reason: a short runway with the sea at both ends and a gusting southerly that never stops. Sydney’s 34L puts the Harbour Bridge and Opera House on your right, and Honolulu’s Reef Runway was built in the ocean.',
        airports: [
          { name: 'Wellington', sight: 'Gusting crosswind onto a 2,081-metre strip with Cook Strait at both ends' },
          { name: 'Sydney Kingsford Smith', sight: 'Harbour Bridge and Opera House off the wing on Runway 34L' },
          { name: 'Honolulu Daniel K. Inouye', sight: 'Diamond Head and Waikiki before touchdown on the Reef Runway' },
        ],
        bestFor: ['Far-East travellers', 'Crosswind practice', 'Tropical sunsets'],
      },
      he: {
        title: 'שולי האוקיינוס השקט ורוחות הסחר',
        tagline: 'גשרי נמל, חופים וולקניים והמסלול הסוער ביותר בפסיפיק.',
        pilotNote:
          'ולינגטון מפורסמת בקרב צוותים מסיבה טובה: מסלול קצר עם ים בשני הקצוות ורוח דרומית סוערת שלא נפסקת. מסלול 34L בסידני שם את גשר הנמל ובית האופרה מימינכם, ומסלול הריף בהונולולו נבנה בתוך האוקיינוס.',
        airports: [
          { name: 'ולינגטון', sight: 'רוח צד סוערת אל מסלול של 2,081 מטר עם מצר קוק בשני הקצוות' },
          { name: 'סידני קינגספורד סמית׳', sight: 'גשר הנמל ובית האופרה מחוץ לכנף במסלול 34L' },
          { name: 'הונולולו דניאל ק. אינואיי', sight: 'דיימונד הד ווייקיקי לפני הנגיעה במסלול הריף' },
        ],
        bestFor: ['מטיילים למזרח הרחוק', 'תרגול רוח צד', 'שקיעות טרופיות'],
      },
      ru: {
        title: 'Тихоокеанский пояс и пассаты',
        tagline: 'Портовые мосты, вулканические берега и самая ветреная полоса Тихого океана.',
        pilotNote:
          'Веллингтон не зря знаменит среди экипажей: короткая полоса с морем с обеих сторон и порывистый южный ветер, который не стихает. Полоса 34L в Сиднее ставит Харбор-Бридж и Оперный театр справа, а рифовая полоса Гонолулу построена в океане.',
        airports: [
          { name: 'Веллингтон', sight: 'Порывистый боковой ветер на полосу 2081 м с проливом Кука с обеих сторон' },
          { name: 'Сидней Кингсфорд-Смит', sight: 'Харбор-Бридж и Оперный театр под крылом на полосе 34L' },
          { name: 'Гонолулу имени Дэниела Иноуэ', sight: 'Даймонд-Хед и Вайкики перед касанием на рифовой полосе' },
        ],
        bestFor: ['Путешественники на Дальний Восток', 'Тренировка бокового ветра', 'Тропические закаты'],
      },
      fr: {
        title: 'Bord du Pacifique et alizés',
        tagline: 'Ponts de baie, côtes volcaniques et la piste la plus ventée du Pacifique.',
        pilotNote:
          'Wellington est célèbre chez les équipages pour une bonne raison : piste courte, mer aux deux extrémités et un vent du sud en rafales qui ne cesse jamais. La 34L de Sydney place le Harbour Bridge et l’Opéra à votre droite, et la Reef Runway d’Honolulu a été construite dans l’océan.',
        airports: [
          { name: 'Wellington', sight: 'Vent de travers en rafales sur une piste de 2 081 m, le détroit de Cook aux deux bouts' },
          { name: 'Sydney Kingsford Smith', sight: 'Harbour Bridge et Opéra sous l’aile sur la piste 34L' },
          { name: 'Honolulu Daniel K. Inouye', sight: 'Diamond Head et Waikiki avant le toucher sur la Reef Runway' },
        ],
        bestFor: ['Voyageurs en Extrême-Orient', 'Entraînement vent de travers', 'Couchers de soleil tropicaux'],
      },
      ar: {
        title: 'حافة المحيط الهادئ والرياح التجارية',
        tagline: 'جسور المرافئ والسواحل البركانية وأكثر مدارج المحيط الهادئ عصفاً بالرياح.',
        pilotNote:
          'ويلينغتون مشهورة بين الأطقم لسبب: مدرج قصير والبحر على طرفيه ورياح جنوبية هوجاء لا تهدأ. المدرج 34L في سيدني يضع جسر المرفأ ودار الأوبرا على يمينك، ومدرج الشعاب في هونولولو بُني داخل المحيط.',
        airports: [
          { name: 'ويلينغتون', sight: 'رياح جانبية هوجاء نحو مدرج طوله 2,081 متراً ومضيق كوك على طرفيه' },
          { name: 'سيدني كينغسفورد سميث', sight: 'جسر المرفأ ودار الأوبرا بجوار الجناح على المدرج 34L' },
          { name: 'هونولولو دانيال ك. إينوي', sight: 'دايموند هيد ووايكيكي قبل الملامسة على مدرج الشعاب' },
        ],
        bestFor: ['المسافرون إلى الشرق الأقصى', 'تدريب الرياح الجانبية', 'غروب استوائي'],
      },
      de: {
        title: 'Pazifik-Ring & Passatwinde',
        tagline: 'Hafenbrücken, Vulkanküsten und die windigste Landebahn im Pazifik.',
        pilotNote:
          'Wellington ist unter Crews aus gutem Grund berühmt: eine kurze Piste mit Meer an beiden Enden und ein böiger Südwind, der nie aufhört. Sydneys 34L legt Harbour Bridge und Opera House zu Ihrer Rechten, und Honolulus Reef Runway wurde direkt ins Meer gebaut.',
        airports: [
          { name: 'Wellington', sight: 'Böiger Seitenwind auf eine 2.081-m-Piste mit der Cookstraße an beiden Enden' },
          { name: 'Sydney Kingsford Smith', sight: 'Harbour Bridge und Opera House unter der Tragfläche auf Piste 34L' },
          { name: 'Honolulu Daniel K. Inouye', sight: 'Diamond Head und Waikiki vor dem Aufsetzen auf der Reef Runway' },
        ],
        bestFor: ['Fernost-Reisende', 'Seitenwind-Training', 'Tropische Sonnenuntergänge'],
      },
    },
  },
  {
    id: 'route-andes-altitude',
    region: 'americas',
    difficulty: 4,
    icon: 'Compass',
    airports: [
      { icao: 'MHTG', iata: 'TGU' },
      { icao: 'SEQM', iata: 'UIO' },
      { icao: 'SLLP', iata: 'LPB' },
    ],
    copy: {
      en: {
        title: 'Latin American Altitude',
        tagline: 'From a hillside strip in Honduras to the highest international airport on Earth.',
        pilotNote:
          'La Paz El Alto sits at 13,325 feet: the 737 needs a 4,000-metre runway and still touches down at speeds that feel like take-off. Toncontín is the opposite problem, a short runway tucked behind a ridge. Two extremes of the same aircraft.',
        airports: [
          { name: 'Tegucigalpa Toncontín', sight: 'A tight descending turn behind the ridge onto a short hillside runway' },
          { name: 'Quito Mariscal Sucre', sight: 'Approach at 7,900 ft between Andean volcanoes, Cotopaxi on the horizon' },
          { name: 'La Paz El Alto', sight: 'The highest international airport in the world, 13,325 ft above the Altiplano' },
        ],
        bestFor: ['South America fans', 'Performance geeks', 'Experienced sim pilots'],
      },
      he: {
        title: 'הגבהים של אמריקה הלטינית',
        tagline: 'ממסלול על גבעה בהונדורס ועד שדה התעופה הבינלאומי הגבוה בעולם.',
        pilotNote:
          'לה פאס אל אלטו יושב בגובה 13,325 רגל: ה-737 זקוק למסלול של 4,000 מטר ועדיין נוגע במהירויות שמרגישות כמו המראה. טונקונטין הוא הבעיה ההפוכה, מסלול קצר שמסתתר מאחורי רכס. שני קצוות של אותו מטוס.',
        airports: [
          { name: 'טגוסיגלפה טונקונטין', sight: 'פנייה יורדת וצמודה מאחורי הרכס אל מסלול קצר על צלע גבעה' },
          { name: 'קיטו מריסקל סוקרה', sight: 'גישה בגובה 7,900 רגל בין הרי געש אנדיים, הקוטופקסי באופק' },
          { name: 'לה פאס אל אלטו', sight: 'שדה התעופה הבינלאומי הגבוה בעולם, 13,325 רגל מעל האלטיפלנו' },
        ],
        bestFor: ['חובבי דרום אמריקה', 'חובבי נתוני ביצועים', 'טייסי סימולטור מנוסים'],
      },
      ru: {
        title: 'Высоты Латинской Америки',
        tagline: 'От полосы на склоне в Гондурасе до самого высокого международного аэропорта Земли.',
        pilotNote:
          'Ла-Пас Эль-Альто расположен на 13 325 футах: 737 нужна полоса 4000 метров, и всё равно касание происходит на скорости, похожей на взлётную. Тонконтин — противоположная задача: короткая полоса, спрятанная за хребтом. Две крайности одного самолёта.',
        airports: [
          { name: 'Тегусигальпа Тонконтин', sight: 'Крутой нисходящий разворот за хребтом на короткую полосу на склоне' },
          { name: 'Кито Марискаль Сукре', sight: 'Заход на 7900 футах между андскими вулканами, Котопахи на горизонте' },
          { name: 'Ла-Пас Эль-Альто', sight: 'Самый высокий международный аэропорт мира, 13 325 футов над Альтиплано' },
        ],
        bestFor: ['Поклонники Южной Америки', 'Любители расчётов характеристик', 'Опытные сим-пилоты'],
      },
      fr: {
        title: 'Altitudes d’Amérique latine',
        tagline: 'D’une piste à flanc de colline au Honduras au plus haut aéroport international du monde.',
        pilotNote:
          'La Paz El Alto se trouve à 13 325 pieds : le 737 a besoin d’une piste de 4 000 mètres et touche quand même à des vitesses de décollage. Toncontín, c’est le problème inverse : une piste courte cachée derrière une crête. Deux extrêmes d’un même avion.',
        airports: [
          { name: 'Tegucigalpa Toncontín', sight: 'Un virage descendant serré derrière la crête vers une courte piste à flanc de colline' },
          { name: 'Quito Mariscal Sucre', sight: 'Approche à 7 900 ft entre les volcans andins, le Cotopaxi à l’horizon' },
          { name: 'La Paz El Alto', sight: 'Le plus haut aéroport international du monde, 13 325 ft au-dessus de l’Altiplano' },
        ],
        bestFor: ['Fans d’Amérique du Sud', 'Passionnés de performances', 'Pilotes sim expérimentés'],
      },
      ar: {
        title: 'ارتفاعات أمريكا اللاتينية',
        tagline: 'من مدرج على سفح تل في هندوراس إلى أعلى مطار دولي على وجه الأرض.',
        pilotNote:
          'لاباز إل ألتو يقع على ارتفاع 13,325 قدماً: تحتاج 737 إلى مدرج طوله 4,000 متر وما زالت تلامس الأرض بسرعات تشبه الإقلاع. تونكونتين هو المشكلة المعاكسة، مدرج قصير مختبئ خلف سلسلة جبلية. طرفان متناقضان لنفس الطائرة.',
        airports: [
          { name: 'تيغوسيغالبا تونكونتين', sight: 'انعطاف هابط ضيق خلف السلسلة الجبلية نحو مدرج قصير على سفح تل' },
          { name: 'كيتو ماريسكال سوكري', sight: 'مقاربة على ارتفاع 7,900 قدم بين براكين الأنديز وكوتوباكسي في الأفق' },
          { name: 'لاباز إل ألتو', sight: 'أعلى مطار دولي في العالم، 13,325 قدماً فوق هضبة ألتيبلانو' },
        ],
        bestFor: ['عشاق أمريكا الجنوبية', 'مهووسو الأداء', 'طيارو المحاكاة المتمرسون'],
      },
      de: {
        title: 'Lateinamerikanische Höhenflüge',
        tagline: 'Von einer Hangpiste in Honduras bis zum höchsten internationalen Flughafen der Erde.',
        pilotNote:
          'La Paz El Alto liegt auf 13.325 Fuß: Die 737 braucht eine 4.000-Meter-Piste und setzt trotzdem mit Geschwindigkeiten auf, die sich wie ein Start anfühlen. Toncontín ist das genaue Gegenteil – eine kurze Piste hinter einem Bergrücken. Zwei Extreme desselben Flugzeugs.',
        airports: [
          { name: 'Tegucigalpa Toncontín', sight: 'Enge Sinkflugkurve hinter dem Bergrücken auf eine kurze Hangpiste' },
          { name: 'Quito Mariscal Sucre', sight: 'Anflug auf 7.900 ft zwischen Andenvulkanen, Cotopaxi am Horizont' },
          { name: 'La Paz El Alto', sight: 'Der höchste internationale Flughafen der Welt, 13.325 ft über dem Altiplano' },
        ],
        bestFor: ['Südamerika-Fans', 'Performance-Enthusiasten', 'Erfahrene Sim-Piloten'],
      },
    },
  },
  {
    id: 'route-north-american-wilderness',
    region: 'americas',
    difficulty: 3,
    icon: 'Compass',
    airports: [
      { icao: 'KJAC', iata: 'JAC' },
      { icao: 'PANC', iata: 'ANC' },
      { icao: 'CYVR', iata: 'YVR' },
    ],
    copy: {
      en: {
        title: 'North American Wilderness',
        tagline: 'Glaciers, the Grand Tetons and a mountain-ringed Pacific harbour.',
        pilotNote:
          'Jackson Hole is the only US airport inside a national park: the Tetons rise 7,000 feet straight off the runway. Anchorage brings Denali and the Chugach glaciers, and Vancouver’s approach threads between the North Shore mountains and the Strait of Georgia.',
        airports: [
          { name: 'Jackson Hole', sight: 'Steep approach below the Grand Tetons inside Grand Teton National Park' },
          { name: 'Anchorage Ted Stevens', sight: 'Glaciers and Denali on the horizon, the cargo hub of the Pacific' },
          { name: 'Vancouver', sight: 'Between the North Shore mountains and the Strait of Georgia onto the sea-level runway' },
        ],
        bestFor: ['Nature lovers', 'Ski and hiking fans', 'Calm scenic flying'],
      },
      he: {
        title: 'הטבע הפראי של צפון אמריקה',
        tagline: 'קרחונים, הרי הגרנד טיטון ונמל פסיפי מוקף הרים.',
        pilotNote:
          'ג׳קסון הול הוא שדה התעופה היחיד בארה״ב בתוך פארק לאומי: הרי הטיטון מתרוממים 7,000 רגל ישר מהמסלול. אנקורג׳ מביאה את דנאלי וקרחוני הצ׳וגאץ׳, והגישה לוונקובר משתחלת בין הרי החוף הצפוני למצר ג׳ורג׳יה.',
        airports: [
          { name: 'ג׳קסון הול', sight: 'גישה תלולה מתחת להרי הגרנד טיטון בתוך הפארק הלאומי' },
          { name: 'אנקורג׳ טד סטיבנס', sight: 'קרחונים ודנאלי באופק, מרכז המטען של הפסיפיק' },
          { name: 'ונקובר', sight: 'בין הרי החוף הצפוני למצר ג׳ורג׳יה אל מסלול בגובה פני הים' },
        ],
        bestFor: ['חובבי טבע', 'חובבי סקי וטרקים', 'טיסה נופית רגועה'],
      },
      ru: {
        title: 'Дикая природа Северной Америки',
        tagline: 'Ледники, Гранд-Титон и тихоокеанская гавань в кольце гор.',
        pilotNote:
          'Джексон-Хоул — единственный аэропорт США внутри национального парка: Титоны поднимаются на 7000 футов прямо от полосы. Анкоридж — это Денали и ледники Чугач, а заход в Ванкувер идёт между горами Норт-Шор и проливом Джорджия.',
        airports: [
          { name: 'Джексон-Хоул', sight: 'Крутой заход под хребтом Гранд-Титон внутри национального парка' },
          { name: 'Анкоридж имени Теда Стивенса', sight: 'Ледники и Денали на горизонте, грузовой хаб Тихого океана' },
          { name: 'Ванкувер', sight: 'Между горами Норт-Шор и проливом Джорджия на полосу на уровне моря' },
        ],
        bestFor: ['Любители природы', 'Лыжники и хайкеры', 'Спокойный обзорный полёт'],
      },
      fr: {
        title: 'Grands espaces d’Amérique du Nord',
        tagline: 'Glaciers, Grand Tetons et un port du Pacifique cerné de montagnes.',
        pilotNote:
          'Jackson Hole est le seul aéroport américain situé dans un parc national : les Tetons s’élèvent de 7 000 pieds droit depuis la piste. Anchorage apporte le Denali et les glaciers du Chugach, et l’approche de Vancouver se glisse entre les montagnes de la North Shore et le détroit de Géorgie.',
        airports: [
          { name: 'Jackson Hole', sight: 'Approche raide sous les Grand Tetons, dans le parc national' },
          { name: 'Anchorage Ted Stevens', sight: 'Glaciers et Denali à l’horizon, le hub cargo du Pacifique' },
          { name: 'Vancouver', sight: 'Entre les montagnes de la North Shore et le détroit de Géorgie vers une piste au niveau de la mer' },
        ],
        bestFor: ['Amoureux de la nature', 'Fans de ski et de randonnée', 'Vol panoramique tranquille'],
      },
      ar: {
        title: 'براري أمريكا الشمالية',
        tagline: 'أنهار جليدية وجبال غراند تيتون ومرفأ على المحيط الهادئ تحيط به الجبال.',
        pilotNote:
          'جاكسون هول هو المطار الأمريكي الوحيد داخل حديقة وطنية: ترتفع جبال تيتون 7,000 قدم مباشرة من المدرج. أنكوريج تجلب دينالي وأنهار تشوغاتش الجليدية، ومقاربة فانكوفر تنسلّ بين جبال الشاطئ الشمالي ومضيق جورجيا.',
        airports: [
          { name: 'جاكسون هول', sight: 'مقاربة حادة تحت جبال غراند تيتون داخل الحديقة الوطنية' },
          { name: 'أنكوريج تيد ستيفنز', sight: 'أنهار جليدية ودينالي في الأفق، مركز الشحن في المحيط الهادئ' },
          { name: 'فانكوفر', sight: 'بين جبال الشاطئ الشمالي ومضيق جورجيا نحو مدرج على مستوى سطح البحر' },
        ],
        bestFor: ['عشاق الطبيعة', 'محبو التزلج والمشي', 'طيران خلاب هادئ'],
      },
      de: {
        title: 'Nordamerikanische Wildnis',
        tagline: 'Gletscher, die Grand Tetons und ein von Bergen umrahmter Pazifikhafen.',
        pilotNote:
          'Jackson Hole ist der einzige US-Flughafen in einem Nationalpark: Die Tetons ragen 7.000 Fuß direkt neben der Piste auf. Anchorage bringt den Denali und die Chugach-Gletscher, und Vancouvers Anflug fädelt sich zwischen den North Shore Mountains und der Strait of Georgia hindurch.',
        airports: [
          { name: 'Jackson Hole', sight: 'Steiler Anflug unter den Grand Tetons im Grand-Teton-Nationalpark' },
          { name: 'Anchorage Ted Stevens', sight: 'Gletscher und Denali am Horizont, das Frachtdrehkreuz des Pazifiks' },
          { name: 'Vancouver', sight: 'Zwischen den North Shore Mountains und der Strait of Georgia auf die Meereshöhen-Piste' },
        ],
        bestFor: ['Naturfreunde', 'Ski- und Wanderfans', 'Ruhiges Panoramafliegen'],
      },
    },
  },
];

export const ADVENTURES: Adventure[] = [
  {
    id: 'adventure-dead-sea-low-pass',
    icon: 'Compass',
    minimumSessionMinutes: 45,
    copy: {
      en: {
        title: 'Dead Sea Low Pass & Masada Sunrise',
        where: 'Israel, from Ben Gurion',
        description:
          'The lowest flight on Earth. Depart Ben Gurion, cross Jerusalem at dawn and descend over the Judean Desert to fly along the Dead Sea 1,400 feet below sea level, with Masada and the Ein Gedi cliffs on your wing.',
      },
      he: {
        title: 'יעף נמוך מעל ים המלח וזריחה במצדה',
        where: 'ישראל, מנתב״ג',
        description:
          'הטיסה הנמוכה בעולם. ממריאים מנתב״ג, חוצים את ירושלים עם שחר ויורדים מעל מדבר יהודה לטיסה לאורך ים המלח בגובה 1,400 רגל מתחת לפני הים, עם מצדה וצוקי עין גדי על הכנף.',
      },
      ru: {
        title: 'Низкий проход над Мёртвым морем и рассвет над Масадой',
        where: 'Израиль, из Бен-Гуриона',
        description:
          'Самый низкий полёт на Земле. Вылет из Бен-Гуриона, Иерусалим на рассвете, снижение над Иудейской пустыней и полёт вдоль Мёртвого моря на 1400 футов ниже уровня моря с Масадой и скалами Эйн-Геди под крылом.',
      },
      fr: {
        title: 'Passage bas sur la mer Morte et lever de soleil à Massada',
        where: 'Israël, depuis Ben Gourion',
        description:
          'Le vol le plus bas de la planète. Décollage de Ben Gourion, Jérusalem à l’aube, descente au-dessus du désert de Judée et vol le long de la mer Morte à 1 400 pieds sous le niveau de la mer, Massada et les falaises d’Ein Gedi sous l’aile.',
      },
      ar: {
        title: 'تحليق منخفض فوق البحر الميت وشروق مسعدة',
        where: 'إسرائيل، من بن غوريون',
        description:
          'أدنى رحلة على وجه الأرض. أقلع من بن غوريون، واعبر القدس عند الفجر، وانزل فوق صحراء يهودا لتطير على طول البحر الميت على ارتفاع 1,400 قدم تحت سطح البحر، ومسعدة ومنحدرات عين جدي بجوار جناحك.',
      },
      de: {
        title: 'Tiefflug über das Tote Meer & Sonnenaufgang über Masada',
        where: 'Israel, ab Ben Gurion',
        description:
          'Der tiefste Flug der Erde. Start in Ben Gurion, Überflug Jerusalems im Morgengrauen und Sinkflug über die Judäische Wüste, um 1.400 Fuß unter dem Meeresspiegel entlang des Toten Meeres zu fliegen – mit Masada und den Klippen von En Gedi neben der Tragfläche.',
      },
    },
  },
  {
    id: 'adventure-etops-crossing',
    icon: 'Globe',
    minimumSessionMinutes: 90,
    copy: {
      en: {
        title: 'Transatlantic ETOPS Crossing',
        where: 'North Atlantic, Keflavík as the alternate',
        description:
          'Fly a compressed New York to London oceanic leg the way long-haul 737 crews do: oceanic clearance, position reports, a fuel decision over the ocean and an engine failure that sends you to the ice-bound alternate at Keflavík.',
      },
      he: {
        title: 'חציית האטלנטי ב-ETOPS',
        where: 'צפון האטלנטי, קפלאוויק כשדה חלופה',
        description:
          'טוסו קטע אוקייני דחוס מניו יורק ללונדון כמו צוותי 737 בטיסות ארוכות: אישור אוקייני, דיווחי מיקום, החלטת דלק מעל האוקיינוס ותקלת מנוע ששולחת אתכם לשדה החלופה הקפוא בקפלאוויק.',
      },
      ru: {
        title: 'Трансатлантический перелёт ETOPS',
        where: 'Северная Атлантика, Кеблавик как запасной',
        description:
          'Пролетите сжатый океанский участок Нью-Йорк — Лондон так, как это делают экипажи 737 на дальних рейсах: океаническое разрешение, доклады о местоположении, решение по топливу над океаном и отказ двигателя, уводящий вас на обледенелый запасной Кеблавик.',
      },
      fr: {
        title: 'Traversée transatlantique ETOPS',
        where: 'Atlantique Nord, Keflavík en dégagement',
        description:
          'Volez un tronçon océanique New York – Londres condensé, comme les équipages 737 long-courrier : clairance océanique, comptes rendus de position, décision carburant au-dessus de l’océan et une panne moteur qui vous envoie vers le dégagement glacé de Keflavík.',
      },
      ar: {
        title: 'عبور الأطلسي ETOPS',
        where: 'شمال الأطلسي، كيفلافيك كمطار بديل',
        description:
          'حلّق في مرحلة محيطية مكثفة من نيويورك إلى لندن كما تفعل أطقم 737 في الرحلات الطويلة: تصريح محيطي، وتقارير موقع، وقرار وقود فوق المحيط، وعطل محرك يرسلك إلى المطار البديل المتجمد في كيفلافيك.',
      },
      de: {
        title: 'Transatlantik-ETOPS-Überquerung',
        where: 'Nordatlantik, Keflavík als Ausweichflughafen',
        description:
          'Fliegen Sie eine komprimierte Ozean-Etappe von New York nach London wie Langstrecken-737-Crews: ozeanische Freigabe, Positionsmeldungen, eine Treibstoffentscheidung über dem Meer und ein Triebwerksausfall, der Sie zum vereisten Ausweichflughafen Keflavík führt.',
      },
    },
  },
  {
    id: 'adventure-everest-flyover',
    icon: 'Compass',
    minimumSessionMinutes: 60,
    copy: {
      en: {
        title: 'Everest Mountain Flight',
        where: 'Himalaya, from Kathmandu',
        description:
          'The scenic flight Nepal is famous for, flown in a 737. Climb out of Kathmandu at sunrise and track east along the Himalayan range at 29,000 feet, eye to eye with Everest, Lhotse and Makalu, before returning to the valley.',
      },
      he: {
        title: 'טיסת הרים אל האוורסט',
        where: 'ההימלאיה, מקטמנדו',
        description:
          'טיסת הנוף שנפאל מפורסמת בה, במטוס 737. מטפסים מקטמנדו עם זריחה ועוקבים מזרחה לאורך רכס ההימלאיה בגובה 29,000 רגל, עין בעין עם האוורסט, הלהוטסה והמאקאלו, לפני שחוזרים לעמק.',
      },
      ru: {
        title: 'Горный полёт к Эвересту',
        where: 'Гималаи, из Катманду',
        description:
          'Обзорный полёт, которым славится Непал, — на 737. Набор высоты из Катманду на рассвете и полёт на восток вдоль Гималайского хребта на 29 000 футов, глаза в глаза с Эверестом, Лхоцзе и Макалу, затем возвращение в долину.',
      },
      fr: {
        title: 'Vol de montagne vers l’Everest',
        where: 'Himalaya, depuis Katmandou',
        description:
          'Le vol panoramique qui a fait la renommée du Népal, en 737. Montée depuis Katmandou au lever du soleil, puis cap à l’est le long de la chaîne himalayenne à 29 000 pieds, face à l’Everest, au Lhotse et au Makalu, avant de revenir dans la vallée.',
      },
      ar: {
        title: 'رحلة جبلية إلى إيفرست',
        where: 'الهيمالايا، من كاتماندو',
        description:
          'الرحلة الخلابة التي تشتهر بها نيبال، على متن 737. اصعد من كاتماندو عند الشروق واتجه شرقاً على طول سلسلة الهيمالايا على ارتفاع 29,000 قدم، وجهاً لوجه مع إيفرست ولوتسي وماكالو، قبل العودة إلى الوادي.',
      },
      de: {
        title: 'Everest-Gebirgsrundflug',
        where: 'Himalaya, ab Kathmandu',
        description:
          'Der berühmte Rundflug Nepals – geflogen in einer 737. Steigen Sie bei Sonnenaufgang aus Kathmandu auf und folgen Sie der Himalaya-Kette auf 29.000 Fuß nach Osten, auf Augenhöhe mit Everest, Lhotse und Makalu, bevor es zurück ins Tal geht.',
      },
    },
  },
  {
    id: 'adventure-storm-diversion',
    icon: 'CloudLightning',
    minimumSessionMinutes: 60,
    copy: {
      en: {
        title: 'Thunderstorm Diversion Decision',
        where: 'Any destination, live or custom weather',
        description:
          'Arrive to find a cell sitting over the airport. Hold, read the weather radar, weigh fuel against time and make the captain’s call: wait it out, or divert to the alternate and land in rain with a 25-knot crosswind. The decision is yours.',
      },
      he: {
        title: 'החלטת הסטה בסופת רעמים',
        where: 'כל יעד, מזג אוויר חי או מותאם',
        description:
          'מגיעים ומוצאים תא סערה שיושב מעל השדה. ממתינים בהמתנה, קוראים את מכ״ם מזג האוויר, שוקלים דלק מול זמן ומקבלים את החלטת הקברניט: לחכות, או להסיט לשדה החלופה ולנחות בגשם עם רוח צד של 25 קשר. ההחלטה שלכם.',
      },
      ru: {
        title: 'Решение об уходе на запасной в грозу',
        where: 'Любой пункт назначения, реальная или заданная погода',
        description:
          'Вы прибываете, а над аэропортом стоит грозовая ячейка. Зона ожидания, чтение метеорадара, топливо против времени — и решение командира: ждать или уходить на запасной и садиться под дождём с боковым ветром 25 узлов. Решать вам.',
      },
      fr: {
        title: 'Décision de déroutement orageux',
        where: 'Toute destination, météo réelle ou personnalisée',
        description:
          'À l’arrivée, une cellule orageuse stationne sur l’aéroport. Attente, lecture du radar météo, carburant contre temps, et la décision du commandant : patienter, ou dérouter vers le dégagement et poser sous la pluie avec 25 nœuds de travers. La décision est la vôtre.',
      },
      ar: {
        title: 'قرار التحويل في عاصفة رعدية',
        where: 'أي وجهة، طقس حي أو مخصص',
        description:
          'تصل لتجد خلية عاصفة تجلس فوق المطار. انتظر في نمط الانتظار، واقرأ رادار الطقس، ووازن الوقود مقابل الوقت، واتخذ قرار القبطان: الانتظار، أو التحويل إلى المطار البديل والهبوط تحت المطر مع رياح جانبية بسرعة 25 عقدة. القرار قرارك.',
      },
      de: {
        title: 'Gewitter-Ausweichentscheidung',
        where: 'Jedes Ziel, Live- oder Wunschwetter',
        description:
          'Bei der Ankunft liegt eine Gewitterzelle direkt über dem Flughafen. Im Warteschleifenverfahren kreisen, Wetterradar lesen, Treibstoff gegen Zeit abwägen und die Kapitänsentscheidung treffen: abwarten oder zum Ausweichflughafen abdrehen und bei Regen mit 25 Knoten Seitenwind landen. Sie entscheiden.',
      },
    },
  },
  {
    id: 'adventure-round-the-world',
    icon: 'Globe',
    minimumSessionMinutes: 90,
    copy: {
      en: {
        title: 'Around the World in 90 Minutes',
        where: 'Six continents, six landings',
        description:
          'A time-compressed world tour: one landing on each continent, chosen with your captain. Sunrise in Sydney, noon over Cape Town, sunset into Rio and the lights of Tokyo, with the simulator repositioning between legs so every minute is spent on approach.',
      },
      he: {
        title: 'מסביב לעולם ב-90 דקות',
        where: 'שש יבשות, שש נחיתות',
        description:
          'סיבוב עולם דחוס בזמן: נחיתה אחת בכל יבשת, שנבחרת יחד עם הקברניט. זריחה בסידני, צהריים מעל קייפטאון, שקיעה לריו ואורות טוקיו, כשהסימולטור ממקם מחדש בין הקטעים כך שכל דקה מוקדשת לגישה.',
      },
      ru: {
        title: 'Вокруг света за 90 минут',
        where: 'Шесть континентов, шесть посадок',
        description:
          'Кругосветка в сжатом времени: по одной посадке на каждом континенте, выбранной вместе с командиром. Рассвет в Сиднее, полдень над Кейптауном, закат в Рио и огни Токио — симулятор переставляется между участками, чтобы каждая минута шла на заход.',
      },
      fr: {
        title: 'Le tour du monde en 90 minutes',
        where: 'Six continents, six atterrissages',
        description:
          'Un tour du monde en temps condensé : un atterrissage sur chaque continent, choisi avec votre commandant. Lever de soleil à Sydney, midi au-dessus du Cap, coucher de soleil à Rio et les lumières de Tokyo, le simulateur se repositionnant entre les étapes pour que chaque minute soit consacrée à l’approche.',
      },
      ar: {
        title: 'حول العالم في 90 دقيقة',
        where: 'ست قارات، ست عمليات هبوط',
        description:
          'جولة حول العالم بزمن مكثف: هبوط واحد في كل قارة تختاره مع قبطانك. شروق في سيدني، وظهيرة فوق كيب تاون، وغروب في ريو، وأضواء طوكيو، مع إعادة تموضع المحاكي بين المراحل لتُقضى كل دقيقة في المقاربة.',
      },
      de: {
        title: 'In 90 Minuten um die Welt',
        where: 'Sechs Kontinente, sechs Landungen',
        description:
          'Eine zeitlich komprimierte Weltreise: eine Landung auf jedem Kontinent, gemeinsam mit Ihrem Kapitän gewählt. Sonnenaufgang in Sydney, Mittag über Kapstadt, Sonnenuntergang in Rio und die Lichter von Tokio – der Simulator versetzt Sie zwischen den Etappen, damit jede Minute im Anflug verbracht wird.',
      },
    },
  },
  {
    id: 'adventure-your-hometown',
    icon: 'Compass',
    minimumSessionMinutes: 45,
    copy: {
      en: {
        title: 'Fly Home: Your Own Airport',
        where: 'Any of 24,000 airports worldwide',
        description:
          'Where did you grow up? Where do your parents live? Tell us the city and we load the real airport, the real terrain and today’s weather. Land where your family lives, with them watching from the jumpseats.',
      },
      he: {
        title: 'טיסה הביתה: שדה התעופה שלכם',
        where: 'כל אחד מ-24,000 שדות תעופה בעולם',
        description:
          'איפה גדלתם? איפה ההורים שלכם גרים? ספרו לנו את העיר ואנחנו נטען את השדה האמיתי, את פני השטח האמיתיים ואת מזג האוויר של היום. תנחתו במקום שבו המשפחה שלכם גרה, כשהם צופים ממושבי הקוקפיט.',
      },
      ru: {
        title: 'Полёт домой: ваш собственный аэропорт',
        where: 'Любой из 24 000 аэропортов мира',
        description:
          'Где вы выросли? Где живут ваши родители? Назовите город — и мы загрузим реальный аэропорт, реальный рельеф и сегодняшнюю погоду. Сядьте там, где живёт ваша семья, пока она наблюдает с откидных кресел в кабине.',
      },
      fr: {
        title: 'Rentrer chez soi : votre propre aéroport',
        where: 'N’importe lequel des 24 000 aéroports du monde',
        description:
          'Où avez-vous grandi ? Où vivent vos parents ? Dites-nous la ville et nous chargeons le vrai aéroport, le vrai relief et la météo du jour. Posez-vous là où vit votre famille, pendant qu’elle regarde depuis les sièges du cockpit.',
      },
      ar: {
        title: 'الطيران إلى الوطن: مطارك أنت',
        where: 'أي مطار من 24,000 مطار حول العالم',
        description:
          'أين نشأت؟ أين يعيش والداك؟ أخبرنا بالمدينة ونحمّل المطار الحقيقي والتضاريس الحقيقية وطقس اليوم. اهبط حيث تعيش عائلتك، وهم يشاهدون من مقاعد المقصورة.',
      },
      de: {
        title: 'Heimflug: Ihr eigener Flughafen',
        where: 'Jeder von 24.000 Flughäfen weltweit',
        description:
          'Wo sind Sie aufgewachsen? Wo leben Ihre Eltern? Nennen Sie uns die Stadt und wir laden den echten Flughafen, das echte Gelände und das heutige Wetter. Landen Sie dort, wo Ihre Familie lebt, während sie von den Cockpit-Sitzen zuschaut.',
      },
    },
  },
];

/** Section-level interface copy for the Experience Flights routes section. */
export interface ExperienceRoutesCopy {
  badge: string;
  title: string;
  subtitle: string;
  /** Short captain's introduction, first person. */
  captainIntro: string;
  statsRoutes: string;
  statsAirports: string;
  statsWorldwide: string;
  filterAll: string;
  regions: Record<RouteRegion, string>;
  bookableBadge: string;
  onRequestBadge: string;
  /** e.g. "+40 min cockpit time" */
  extraMinutes: (minutes: number) => string;
  difficultyLabel: string;
  difficultyLevels: Record<1 | 2 | 3 | 4 | 5, string>;
  pilotNoteLabel: string;
  bestForLabel: string;
  bookTrioCta: string;
  requestRouteCta: string;
  bookingIntentEyebrow: string;
  bookingIntentDescription: string;
  bookingIntentAddOn: string;
  routeRequestEyebrow: string;
  routeRequestDescription: string;
  routeRequestPriceNote: string;
  routeRequestSaved: string;
  routeRequestConfirmation: string;
  adventuresBadge: string;
  adventuresTitle: string;
  adventuresSubtitle: string;
  /** e.g. "From a 60-minute session" */
  fromSession: (minutes: number) => string;
  askCaptainCta: string;
  bookableHint: string;
  onRequestHint: string;
  howItWorksTitle: string;
  howItWorksSubtitle: string;
  includedPillarTitle: string;
  includedPillarDesc: string;
  extendedPillarTitle: string;
  extendedPillarDesc: string;
}

export const EXPERIENCE_ROUTES_COPY: LocalizedRecord<ExperienceRoutesCopy> = {
  en: {
    badge: 'EXPERIENCE FLIGHTS • FROM THE CAPTAIN’S LOGBOOK',
    title: 'Routes, Sights & Adventures Around the World',
    subtitle:
      'Every experience flight includes a takeoff and landing exercise and a World Trio: three real airports flown back to back. These are the routes I would put in front of a guest, chosen from thirty years on the flight deck.',
    captainIntro:
      'I have landed on most of these runways for real. Pick a trio by region or by nerve, read my note on what makes each approach special, and we will fly it together in the Boeing 737 with live or custom weather.',
    statsRoutes: 'curated world trios',
    statsAirports: 'hand-picked airports',
    statsWorldwide: 'airports available on request',
    filterAll: 'All regions',
    regions: {
      israel: 'Israel',
      europe: 'Europe & Atlantic',
      americas: 'Americas',
      asia_pacific: 'Asia-Pacific',
      africa_middle_east: 'Africa & Middle East',
      extreme: 'Extreme approaches',
    },
    bookableBadge: 'Extended Mission (+40m)',
    onRequestBadge: 'Included in 60m Flight',
    extraMinutes: (minutes) => `+${minutes} min cockpit time`,
    difficultyLabel: 'Captain’s handling rating',
    difficultyLevels: {
      1: 'Relaxed sightseeing',
      2: 'Easy, fully guided',
      3: 'Hands-on visual flying',
      4: 'Demanding, instructor assists',
      5: 'Captain-only approach',
    },
    pilotNoteLabel: 'Captain’s note',
    bestForLabel: 'Best for',
    bookTrioCta: 'Book extended flight (100 min)',
    requestRouteCta: 'Fly this route in 60m flight',
    bookingIntentEyebrow: 'WORLD TRIO ADDED TO YOUR FLIGHT',
    bookingIntentDescription:
      'This route is already selected. Choose a departure time that fits the complete flight, then confirm its minutes and price in your checkout manifest.',
    bookingIntentAddOn: 'Route add-on',
    routeRequestEyebrow: 'CUSTOM ROUTE REQUEST',
    routeRequestDescription:
      'Choose a date and time for a 60-minute or longer session. We save this route request with your booking, then your captain confirms the final mission plan before your visit.',
    routeRequestPriceNote: 'No route surcharge today',
    routeRequestSaved: 'Route request saved with booking',
    routeRequestConfirmation: 'Captain confirmation required',
    adventuresBadge: 'FLIGHT ADVENTURES',
    adventuresTitle: 'Beyond the Trios: Missions a Captain Would Fly',
    adventuresSubtitle:
      'Scenario flights briefed with your captain and flown inside your booked session. Tell us which one when you book, or ask at the briefing.',
    fromSession: (minutes) => `From a ${minutes}-minute session`,
    askCaptainCta: 'Ask your captain',
    bookableHint: 'Bookable trios open a 60-minute Captain’s Command flight with the chosen trio already selected; review the full manifest before checkout.',
    onRequestHint: 'Route requests open the booking calendar with a 60-minute session selected. We save your request with the booking and your captain confirms the mission plan.',
    howItWorksTitle: 'How to Choose Your Flight Route',
    howItWorksSubtitle: 'Fly iconic real-world routes. Choose an included destination in your standard flight, or expand to an extended multi-leg mission.',
    includedPillarTitle: 'Included in 60m Flight (₪0 extra)',
    includedPillarDesc: 'Choose any of our 14 curated routes worldwide. Your captain programs the flight computer (FMC) for your chosen destination at no additional cost.',
    extendedPillarTitle: 'Extended Mission (100 min · +₪290)',
    extendedPillarDesc: 'Want to land at 3 distinct airports in one session? Adds +40 minutes of cockpit time (100 minutes total) to fly 3 full consecutive approaches.',
  },
  he: {
    badge: 'טיסות חוויה • מיומן הטיסה של הקברניט',
    title: 'מסלולים, נופים והרפתקאות מסביב לעולם',
    subtitle:
      'כל טיסת חוויה כוללת תרגיל המראה ונחיתה ושלישייה עולמית: שלושה שדות תעופה אמיתיים שטסים אליהם ברצף. אלה המסלולים שהייתי מציע לאורח, שנבחרו מתוך שלושים שנה בתא הטייס.',
    captainIntro:
      'נחתתי ברוב המסלולים האלה באמת. בחרו שלישייה לפי אזור או לפי רמת האתגר, קראו את ההערה שלי על מה שמייחד כל גישה, ונטוס אותה יחד בבואינג 737 עם מזג אוויר חי או מותאם.',
    statsRoutes: 'שלישיות עולמיות נבחרות',
    statsAirports: 'שדות תעופה שנבחרו בקפידה',
    statsWorldwide: 'שדות תעופה זמינים לפי בקשה',
    filterAll: 'כל האזורים',
    regions: {
      israel: 'ישראל',
      europe: 'אירופה והאטלנטי',
      americas: 'אמריקה',
      asia_pacific: 'אסיה והפסיפיק',
      africa_middle_east: 'אפריקה והמזרח התיכון',
      extreme: 'גישות אקסטרימיות',
    },
    bookableBadge: 'טיסה מורחבת (תוספת 40 דק׳)',
    onRequestBadge: 'כלול בטיסת 60 דק׳',
    extraMinutes: (minutes) => `+${minutes} דקות זמן קוקפיט`,
    difficultyLabel: 'דירוג הקושי של הקברניט',
    difficultyLevels: {
      1: 'סיור נינוח',
      2: 'קל, בהנחיה מלאה',
      3: 'טיסה ויזואלית ידנית',
      4: 'תובעני, המדריך מסייע',
      5: 'גישה לקברניטים בלבד',
    },
    pilotNoteLabel: 'הערת הקברניט',
    bestForLabel: 'מתאים במיוחד ל',
    bookTrioCta: 'הזמנת טיסה מורחבת (100 דק׳)',
    requestRouteCta: 'בחירת מסלול זה (60 דק׳)',
    bookingIntentEyebrow: 'השלישייה העולמית נוספה לטיסה שלכם',
    bookingIntentDescription:
      'המסלול כבר נבחר. בחרו שעת המראה שמתאימה לטיסה המלאה, ואשרו את הדקות והמחיר בפירוט ההזמנה לפני התשלום.',
    bookingIntentAddOn: 'תוספת מסלול',
    routeRequestEyebrow: 'בקשת מסלול מותאם',
    routeRequestDescription:
      'בחרו תאריך ושעה למפגש של 60 דקות או יותר. בקשת המסלול נשמרת עם ההזמנה, והקברניט יאשר את תוכנית המשימה הסופית לפני ההגעה.',
    routeRequestPriceNote: 'אין תוספת מחיר למסלול כעת',
    routeRequestSaved: 'בקשת המסלול נשמרה עם ההזמנה',
    routeRequestConfirmation: 'נדרש אישור קברניט',
    adventuresBadge: 'הרפתקאות טיסה',
    adventuresTitle: 'מעבר לשלישיות: משימות שקברניט היה טס',
    adventuresSubtitle:
      'טיסות תרחיש שמתודרכות עם הקברניט ומבוצעות בתוך המפגש שהזמנתם. ציינו איזו מהן בהזמנה, או בקשו בתדריך.',
    fromSession: (minutes) => `ממפגש של ${minutes} דקות`,
    askCaptainCta: 'לשאול את הקברניט',
    bookableHint: 'שלישיות הזמינות אונליין פותחות טיסת Captain’s Command של 60 דקות עם השלישייה שכבר נבחרה; בדקו את הפירוט המלא לפני התשלום.',
    onRequestHint: 'בקשת מסלול פותחת את יומן ההזמנות עם מפגש של 60 דקות. הבקשה נשמרת עם ההזמנה והקברניט מאשר את תוכנית המשימה.',
    howItWorksTitle: 'איך בוחרים מסלול לטיסה שלכם?',
    howItWorksSubtitle: 'טסים ליעדים אמיתיים בעולם. בחרו מסלול הכלול בטיסה הרגילה, או שדרגו למשימה רב-יעדית מורחבת.',
    includedPillarTitle: 'כלול בטיסת 60 דק׳ (ללא עלות)',
    includedPillarDesc: 'בחרו מתוך 14 מסלולים עולמיים ללא תוספת תשלום (₪0). הקברניט מתכנת עבורכם את מחשב הטיסה (FMC) ליעד שבחרתם.',
    extendedPillarTitle: 'טיסה מורחבת (100 דק׳ · תוספת ₪290)',
    extendedPillarDesc: 'רוצים לנחות ב-3 שדות תעופה שונים באותה טיסה? תוספת של 40 דקות זמן קוקפיט (סך הכל 100 דקות טיסה) ל-3 גישות מלאות ומאתגרות.',
  },
  ru: {
    badge: 'ПОЛЁТЫ-ВПЕЧАТЛЕНИЯ • ИЗ ЛЁТНОЙ КНИЖКИ КОМАНДИРА',
    title: 'Маршруты, виды и приключения по всему миру',
    subtitle:
      'Каждый полёт-впечатление включает упражнение «взлёт и посадка» и мировое трио — три реальных аэропорта один за другим. Это маршруты, которые я предложил бы гостю, выбранные за тридцать лет в кабине экипажа.',
    captainIntro:
      'На большинство этих полос я садился по-настоящему. Выберите трио по региону или по уровню смелости, прочитайте мою заметку о том, чем особенен каждый заход, и мы пролетим его вместе на Boeing 737 с реальной или заданной погодой.',
    statsRoutes: 'отобранных мировых трио',
    statsAirports: 'аэропортов, выбранных вручную',
    statsWorldwide: 'аэропортов доступно по запросу',
    filterAll: 'Все регионы',
    regions: {
      israel: 'Израиль',
      europe: 'Европа и Атлантика',
      americas: 'Америка',
      asia_pacific: 'Азия и Тихий океан',
      africa_middle_east: 'Африка и Ближний Восток',
      extreme: 'Экстремальные заходы',
    },
    bookableBadge: 'Расширенная миссия (+40 мин)',
    onRequestBadge: 'Включено в 60 мин полёт',
    extraMinutes: (minutes) => `+${minutes} мин в кабине`,
    difficultyLabel: 'Оценка сложности от командира',
    difficultyLevels: {
      1: 'Спокойный обзорный полёт',
      2: 'Легко, с полным сопровождением',
      3: 'Ручной визуальный полёт',
      4: 'Требовательно, инструктор помогает',
      5: 'Заход только для командиров',
    },
    pilotNoteLabel: 'Заметка командира',
    bestForLabel: 'Лучше всего для',
    bookTrioCta: 'Забронировать расширенный полёт (100 мин)',
    requestRouteCta: 'Выбрать этот маршрут (60 мин)',
    bookingIntentEyebrow: 'МИРОВОЕ ТРИО ДОБАВЛЕНО К ВАШЕМУ ПОЛЁТУ',
    bookingIntentDescription:
      'Этот маршрут уже выбран. Выберите время вылета, подходящее для полного полёта, затем проверьте минуты и цену в составе заказа перед оплатой.',
    bookingIntentAddOn: 'Опция маршрута',
    routeRequestEyebrow: 'ЗАПРОС ИНДИВИДУАЛЬНОГО МАРШРУТА',
    routeRequestDescription:
      'Выберите дату и время для сеанса от 60 минут. Мы сохраним запрос маршрута вместе с бронированием, а командир подтвердит окончательный план полёта до вашего визита.',
    routeRequestPriceNote: 'Доплаты за маршрут сегодня нет',
    routeRequestSaved: 'Запрос маршрута сохранён с бронированием',
    routeRequestConfirmation: 'Требуется подтверждение командира',
    adventuresBadge: 'ЛЁТНЫЕ ПРИКЛЮЧЕНИЯ',
    adventuresTitle: 'За пределами трио: миссии, которые выбрал бы командир',
    adventuresSubtitle:
      'Сценарные полёты, которые разбираются с командиром и выполняются внутри забронированного сеанса. Укажите нужный при бронировании или попросите на брифинге.',
    fromSession: (minutes) => `От сеанса ${minutes} минут`,
    askCaptainCta: 'Спросить командира',
    bookableHint: 'Доступные для бронирования трио открывают 60-минутный полёт Captain’s Command с уже выбранным трио; проверьте полный состав заказа перед оплатой.',
    onRequestHint: 'Запрос маршрута открывает календарь бронирования с выбранным сеансом 60 минут. Мы сохраняем запрос с бронированием, а командир подтверждает план полёта.',
    howItWorksTitle: 'Как выбрать маршрут для вашего полёта',
    howItWorksSubtitle: 'Летайте по культовым реальным маршрутам. Выберите направление, включённое в стандартный полёт, или расширенную миссию.',
    includedPillarTitle: 'Включено в 60 мин полёт (без доплаты)',
    includedPillarDesc: 'Выберите любой из 14 мировых маршрутов без доплаты (₪0). Командир запрограммирует бортовой компьютер (FMC) под выбранную вами полосу.',
    extendedPillarTitle: 'Расширенная миссия (100 мин · +₪290)',
    extendedPillarDesc: 'Хотите приземлиться в 3 разных аэропортах за один полёт? Добавляет +40 минут времени в кабине (всего 100 мин) для трёх полных заходов подряд.',
  },
  fr: {
    badge: 'VOLS D’EXPÉRIENCE • CHOIX DU COMMANDANT',
    title: 'Routes, panoramas et aventures autour du monde',
    subtitle:
      'Chaque vol d’expérience comprend un exercice de décollage et d’atterrissage et un trio mondial : trois aéroports réels volés à la suite. Voici les routes que je proposerais à un invité, choisies après trente ans de cockpit.',
    captainIntro:
      'Je me suis posé pour de vrai sur la plupart de ces pistes. Choisissez un trio par région ou par audace, lisez ma note sur ce qui rend chaque approche spéciale, et nous le volerons ensemble en Boeing 737 avec la météo réelle ou personnalisée.',
    statsRoutes: 'trios mondiaux sélectionnés',
    statsAirports: 'aéroports choisis à la main',
    statsWorldwide: 'aéroports disponibles sur demande',
    filterAll: 'Toutes les régions',
    regions: {
      israel: 'Israël',
      europe: 'Europe et Atlantique',
      americas: 'Amériques',
      asia_pacific: 'Asie-Pacifique',
      africa_middle_east: 'Afrique et Moyen-Orient',
      extreme: 'Approches extrêmes',
    },
    bookableBadge: 'Mission prolongée (+40 min)',
    onRequestBadge: 'Inclus dans le vol de 60 min',
    extraMinutes: (minutes) => `+${minutes} min de cockpit`,
    difficultyLabel: 'Niveau de pilotage selon le commandant',
    difficultyLevels: {
      1: 'Tourisme aérien détendu',
      2: 'Facile, entièrement guidé',
      3: 'Vol à vue aux commandes',
      4: 'Exigeant, l’instructeur assiste',
      5: 'Approche réservée aux commandants',
    },
    pilotNoteLabel: 'Note du commandant',
    bestForLabel: 'Idéal pour',
    bookTrioCta: 'Réserver le vol prolongé (100 min)',
    requestRouteCta: 'Choisir cet itinéraire (60 min)',
    bookingIntentEyebrow: 'TRIO MONDIAL AJOUTÉ À VOTRE VOL',
    bookingIntentDescription:
      'Cet itinéraire est déjà sélectionné. Choisissez une heure de départ adaptée au vol complet, puis vérifiez ses minutes et son prix dans le manifeste avant le paiement.',
    bookingIntentAddOn: 'Option d’itinéraire',
    routeRequestEyebrow: 'DEMANDE D’ITINÉRAIRE PERSONNALISÉ',
    routeRequestDescription:
      'Choisissez une date et une heure pour une séance de 60 minutes ou plus. Nous enregistrons cette demande avec votre réservation, puis votre commandant confirme le plan de mission final avant votre venue.',
    routeRequestPriceNote: 'Aucun supplément d’itinéraire aujourd’hui',
    routeRequestSaved: 'Demande d’itinéraire enregistrée avec la réservation',
    routeRequestConfirmation: 'Confirmation du commandant requise',
    adventuresBadge: 'AVENTURES EN VOL',
    adventuresTitle: 'Au-delà des trios : des missions qu’un commandant volerait',
    adventuresSubtitle:
      'Des vols scénarisés, briefés avec votre commandant et volés pendant votre séance réservée. Indiquez-nous lequel à la réservation, ou demandez-le au briefing.',
    fromSession: (minutes) => `À partir d’une séance de ${minutes} minutes`,
    askCaptainCta: 'Demander au commandant',
    bookableHint: 'Les trios réservables ouvrent un vol Captain’s Command de 60 minutes avec le trio déjà sélectionné ; vérifiez le manifeste complet avant le paiement.',
    onRequestHint: 'Les demandes d’itinéraire ouvrent le calendrier avec une séance de 60 minutes sélectionnée. Nous enregistrons la demande avec la réservation et le commandant confirme le plan de mission.',
    howItWorksTitle: 'Comment choisir votre itinéraire de vol',
    howItWorksSubtitle: 'Volez sur des routes réelles emblématiques. Choisissez une destination incluse dans votre vol standard, ou une mission prolongée.',
    includedPillarTitle: 'Inclus dans le vol 60 min (sans supplément)',
    includedPillarDesc: 'Choisissez parmi nos 14 itinéraires mondiaux sans supplément (0 ₪). Votre commandant programme le calculateur (FMC) vers votre destination.',
    extendedPillarTitle: 'Mission prolongée (100 min · +290 ₪)',
    extendedPillarDesc: 'Envie de poser l’avion sur 3 aéroports différents en une seule séance ? Ajoute +40 minutes de cockpit (100 min au total) pour 3 approches complètes.',
  },
  ar: {
    badge: 'رحلات التجربة • من سجل القبطان',
    title: 'مسارات ومشاهد ومغامرات حول العالم',
    subtitle:
      'كل رحلة تجربة تتضمن تمرين إقلاع وهبوط وثلاثية عالمية: ثلاثة مطارات حقيقية تُطار على التوالي. هذه هي المسارات التي أقدمها لضيف، مختارة من ثلاثين عاماً في مقصورة القيادة.',
    captainIntro:
      'هبطتُ فعلاً على معظم هذه المدارج. اختر ثلاثية بحسب المنطقة أو بحسب الجرأة، واقرأ ملاحظتي عمّا يميّز كل مقاربة، وسنطير بها معاً في بوينغ 737 مع طقس حي أو مخصص.',
    statsRoutes: 'ثلاثيات عالمية منتقاة',
    statsAirports: 'مطارات مختارة بعناية',
    statsWorldwide: 'مطار متاح عند الطلب',
    filterAll: 'كل المناطق',
    regions: {
      israel: 'إسرائيل',
      europe: 'أوروبا والأطلسي',
      americas: 'الأمريكتان',
      asia_pacific: 'آسيا والمحيط الهادئ',
      africa_middle_east: 'أفريقيا والشرق الأوسط',
      extreme: 'مقاربات متطرفة',
    },
    bookableBadge: 'مهمة موسّعة (+40 دقيقة)',
    onRequestBadge: 'مشمول في رحلة 60 دقيقة',
    extraMinutes: (minutes) => `+${minutes} دقيقة في المقصورة`,
    difficultyLabel: 'تقييم القبطان لصعوبة القيادة',
    difficultyLevels: {
      1: 'جولة مريحة',
      2: 'سهل، بإرشاد كامل',
      3: 'طيران بصري يدوي',
      4: 'متطلّب، بمساعدة المدرب',
      5: 'مقاربة للقباطنة فقط',
    },
    pilotNoteLabel: 'ملاحظة القبطان',
    bestForLabel: 'الأنسب لـ',
    bookTrioCta: 'حجز رحلة موسّعة (100 دقيقة)',
    requestRouteCta: 'اختيار هذا المسار (60 دقيقة)',
    bookingIntentEyebrow: 'تمت إضافة الثلاثية العالمية إلى رحلتك',
    bookingIntentDescription:
      'هذا المسار محدد بالفعل. اختر وقت إقلاع يناسب الرحلة الكاملة، ثم راجع الدقائق والسعر في ملخص طلبك قبل الدفع.',
    bookingIntentAddOn: 'إضافة المسار',
    routeRequestEyebrow: 'طلب مسار مخصص',
    routeRequestDescription:
      'اختر تاريخاً ووقتاً لجلسة مدتها 60 دقيقة أو أكثر. نحفظ طلب المسار مع حجزك، ثم يؤكد القبطان خطة المهمة النهائية قبل زيارتك.',
    routeRequestPriceNote: 'لا رسوم إضافية للمسار اليوم',
    routeRequestSaved: 'تم حفظ طلب المسار مع الحجز',
    routeRequestConfirmation: 'يلزم تأكيد القبطان',
    adventuresBadge: 'مغامرات الطيران',
    adventuresTitle: 'ما بعد الثلاثيات: مهام يطير بها قبطان',
    adventuresSubtitle:
      'رحلات سيناريو يتم التحضير لها مع قبطانك وتُنفَّذ ضمن الجلسة المحجوزة. أخبرنا بأيّها عند الحجز، أو اطلبها في الإحاطة.',
    fromSession: (minutes) => `من جلسة مدتها ${minutes} دقيقة`,
    askCaptainCta: 'اسأل قبطانك',
    bookableHint: 'الثلاثيات القابلة للحجز تفتح رحلة Captain’s Command لمدة 60 دقيقة مع تحديد الثلاثية مسبقاً؛ راجع ملخص الطلب الكامل قبل الدفع.',
    onRequestHint: 'يفتح طلب المسار تقويم الحجز مع تحديد جلسة 60 دقيقة. نحفظ الطلب مع الحجز ويؤكد القبطان خطة المهمة.',
    howItWorksTitle: 'كيف تختارون مسار رحلتكم؟',
    howItWorksSubtitle: 'طيران إلى وجهات حقيقية شهيرة. اختاروا وجهة مشمولة في رحلتكم القياسية، أو قوموا بالترقية إلى مهمة موسّعة متعددة المطارات.',
    includedPillarTitle: 'مشمول في رحلة 60 دقيقة (دون تكلفة إضافية)',
    includedPillarDesc: 'اختاروا من بين 14 مساراً عالمياً دون أي رسوم إضافية (0 ش.ج). يبرمج القبطان كمبيوتر الطيران (FMC) نحو وجهتكم المختارة.',
    extendedPillarTitle: 'مهمة موسّعة (100 دقيقة · +290 ش.ج)',
    extendedPillarDesc: 'هل ترغبون في الهبوط في 3 مطارات مختلفة في جلسة واحدة؟ تضيف +40 دقيقة في المقصورة (إجمالي 100 دقيقة) لثلاث مقاربات متتالية كاملة.',
  },
  de: {
    badge: 'ERLEBNISFLÜGE • AUS DEM LOGBUCH DES KAPITÄNS',
    title: 'Routen, Aussichten & Abenteuer weltweit',
    subtitle:
      'Jeder Erlebnisflug umfasst eine Start- und Landeübung sowie ein Welt-Trio: drei echte Flughäfen direkt hintereinander geflogen. Das sind die Routen, die ich einem Gast vorschlagen würde, ausgewählt aus dreißig Jahren im Cockpit.',
    captainIntro:
      'Auf den meisten dieser Pisten bin ich selbst im Linienbetrieb gelandet. Wählen Sie ein Trio nach Region oder Nervenkitzel, lesen Sie meine Notiz zu jedem Anflug und wir fliegen es gemeinsam in der Boeing 737 bei Live- oder Wunschwetter.',
    statsRoutes: 'kuratierte Welt-Trios',
    statsAirports: 'handverlesene Flughäfen',
    statsWorldwide: 'Flughäfen auf Anfrage verfügbar',
    filterAll: 'Alle Regionen',
    regions: {
      israel: 'Israel',
      europe: 'Europa & Atlantik',
      americas: 'Amerika',
      asia_pacific: 'Asien-Pazifik',
      africa_middle_east: 'Afrika & Naher Osten',
      extreme: 'Extreme Anflüge',
    },
    bookableBadge: 'Erweiterte Mission (+40 Min.)',
    onRequestBadge: 'Im 60-Min.-Flug enthalten',
    extraMinutes: (minutes) => `+${minutes} Min. Cockpitzeit`,
    difficultyLabel: 'Schwierigkeitswertung des Kapitäns',
    difficultyLevels: {
      1: 'Entspannter Rundflug',
      2: 'Leicht, vollständig geführt',
      3: 'Manueller Sichtflug',
      4: 'Anspruchsvoll, Instruktor unterstützt',
      5: 'Anflug nur für Kapitäne',
    },
    pilotNoteLabel: 'Notiz des Kapitäns',
    bestForLabel: 'Ideal für',
    bookTrioCta: 'Erweiterten Flug buchen (100 Min.)',
    requestRouteCta: 'Diese Route im 60-Min.-Flug wählen',
    bookingIntentEyebrow: 'WELT-TRIO ZU IHREM FLUG HINZUGEFÜGT',
    bookingIntentDescription:
      'Diese Route ist bereits ausgewählt. Wählen Sie eine Abflugzeit für den gesamten Flug und prüfen Sie Minuten und Preis im Manifest vor der Zahlung.',
    bookingIntentAddOn: 'Routen-Extra',
    routeRequestEyebrow: 'INDIVIDUELLE ROUTENANFRAGE',
    routeRequestDescription:
      'Wählen Sie Datum und Uhrzeit für eine Sitzung ab 60 Minuten. Wir speichern Ihre Routenanfrage mit der Buchung, und Ihr Kapitän bestätigt vor Ihrem Besuch den endgültigen Missionsplan.',
    routeRequestPriceNote: 'Kein Routenaufpreis heute',
    routeRequestSaved: 'Routenanfrage mit Buchung gespeichert',
    routeRequestConfirmation: 'Kapitänsbestätigung erforderlich',
    adventuresBadge: 'FLUGABENTEUER',
    adventuresTitle: 'Jenseits der Trios: Missionen, die ein Kapitän fliegt',
    adventuresSubtitle:
      'Szenarioflüge, die mit Ihrem Kapitän gebrieft und während Ihrer gebuchten Sitzung geflogen werden. Nennen Sie uns Ihren Wunsch bei der Buchung oder beim Briefing.',
    fromSession: (minutes) => `Ab einer ${minutes}-Minuten-Sitzung`,
    askCaptainCta: 'Kapitän fragen',
    bookableHint: 'Buchbare Trios öffnen einen 60-minütigen Captain’s-Command-Flug mit bereits ausgewähltem Trio; prüfen Sie vor dem Bezahlen das vollständige Manifest.',
    onRequestHint: 'Routenanfragen öffnen den Buchungskalender mit einer 60-Minuten-Sitzung. Wir speichern Ihren Wunsch mit der Buchung und Ihr Kapitän bestätigt den Missionsplan.',
    howItWorksTitle: 'So wählen Sie Ihre Flugroute',
    howItWorksSubtitle: 'Fliegen Sie legendäre reale Routen. Wählen Sie ein enthaltenes Ziel in Ihrem Standardflug oder erweitern Sie auf eine Multi-Stopp-Mission.',
    includedPillarTitle: 'Im 60-Min.-Flug enthalten (0 ₪ extra)',
    includedPillarDesc: 'Wählen Sie eine unserer 14 kuratierten Weltrouten ohne Aufpreis. Ihr Kapitän programmiert den Bordcomputer (FMC) für Ihr Wunschziel.',
    extendedPillarTitle: 'Erweiterte Mission (100 Min. · +290 ₪)',
    extendedPillarDesc: 'Sie möchten in einer Sitzung an 3 verschiedenen Flughäfen landen? Fügt +40 Minuten Cockpitzeit (100 Min. gesamt) für 3 volle Anflüge hinzu.',
  },
};

export const ROUTE_REGIONS: RouteRegion[] = ['israel', 'europe', 'americas', 'asia_pacific', 'africa_middle_east', 'extreme'];

/** Only non-priced World Trios can be requested for captain confirmation at checkout. */
export function findOnRequestWorldRoute(id: string | undefined): WorldRoute | undefined {
  return WORLD_ROUTES.find((route) => route.id === id && !route.addonId);
}

/** Total number of distinct airports across all curated routes. */
export function countRouteAirports(routes: readonly WorldRoute[] = WORLD_ROUTES): number {
  return new Set(routes.flatMap((route) => route.airports.map((airport) => airport.icao))).size;
}
