/**
 * Verified local SimDream Tel Aviv Boeing 737 MAX media catalog.
 *
 * All stills are pre-encoded WebP and decorative loops are muted H.264 MP4
 * (`+faststart`, zero audio track) under `public/media/cockpit/`.
 * Provenance & validation guards live in `./cockpit-media`.
 */
import type { LocalizedRecord } from '@/lib/i18n/translations';
import type {
  ApprovedCockpitMedia,
  MediaControlLabels,
  ReelTeaserMedia,
  RouteScenarioVisual,
} from './cockpit-media';

export const MEDIA_CONTROL_COPY: LocalizedRecord<MediaControlLabels> = {
  he: { playLabel: 'הפעלת קטע וידאו מתא הטייס', pauseLabel: 'השהיית קטע הווידאו' },
  en: { playLabel: 'Play cockpit clip', pauseLabel: 'Pause cockpit clip' },
  ru: { playLabel: 'Воспроизвести видео из кабины', pauseLabel: 'Приостановить видео' },
  fr: { playLabel: 'Lire la séquence du cockpit', pauseLabel: 'Mettre en pause la séquence' },
  ar: { playLabel: 'تشغيل مقطع قمرة القيادة', pauseLabel: 'إيقاف مقطع قمرة القيادة مؤقتاً' },
  es: { playLabel: 'Reproducir clip de cabina', pauseLabel: 'Pausar clip de cabina' },
  de: { playLabel: 'Cockpit-Clip abspielen', pauseLabel: 'Cockpit-Clip pausieren' },
};

/**
 * Primary above-the-fold cockpit proof on `/` (static WebP only, zero hero video).
 */
export const HOME_HERO_MEDIA: ApprovedCockpitMedia = {
  id: 'home-hero-cockpit',
  posterSrc: '/media/cockpit/alpine-approach.webp',
  width: 1600,
  height: 901,
  aspect: 'video',
  scenarioTag: 'B737 MAX • TEL AVIV',
  caption: {
    he: 'צילום אמיתי · הקוקפיט של Sim Dream בתל אביב',
    en: 'Real photo · Sim Dream Boeing 737 MAX cockpit in Tel Aviv',
    ru: 'Реальное фото · Кабина Boeing 737 MAX Sim Dream в Тель-Авиве',
    fr: 'Photo réelle · Cockpit Boeing 737 MAX Sim Dream à Tel-Aviv',
    ar: 'صورة حقيقية · قمرة بوينغ 737 MAX في Sim Dream تل أبيب',
    es: 'Foto real · Cabina Boeing 737 MAX de Sim Dream en Tel Aviv',
    de: 'Echtes Foto · Sim Dream Boeing 737 MAX Cockpit in Tel Aviv',
  },
  alt: {
    he: 'מבט מרכזי מתוך קוקפיט הבואינג 737 MAX האמיתי של Sim Dream בתל אביב מול הרים ומכ״ם שטח',
    en: 'Center cockpit view inside the real Sim Dream Boeing 737 MAX simulator in Tel Aviv showing illuminated overhead switches, MCP, and mountain terrain radar',
    ru: 'Вид из реальной кабины Boeing 737 MAX Sim Dream в Тель-Авиве с подсвеченными дисплеями и радаром рельефа в горах',
    fr: 'Vue centrale du vrai simulateur Boeing 737 MAX Sim Dream à Tel-Aviv avec panneaux éclairés et radar de relief en montagne',
    ar: 'منظر مركزي من داخل قمرة محاكي بوينغ 737 MAX الحقيقية في تل أبيب مع شاشات مضاءة ورادار تضاريس جبلية',
    es: 'Vista central desde la cabina real del simulador Boeing 737 MAX de Sim Dream en Tel Aviv con pantallas iluminadas y radar de terreno',
    de: 'Zentrale Cockpit-Ansicht im echten Sim Dream Boeing 737 MAX Simulator in Tel Aviv mit beleuchteten Displays und Berg-Geländeradar',
  },
};

/**
 * Two-card editorial cockpit showcase on `/about` (one muted approach loop + one captain-mentorship still).
 */
export const ABOUT_SHOWCASE_MEDIA: readonly ApprovedCockpitMedia[] = [
  {
    id: 'about-cockpit-approach',
    posterSrc: '/media/cockpit/final-approach-poster.webp',
    videoSrc: '/media/cockpit/final-approach-loop.mp4',
    width: 848,
    height: 478,
    aspect: 'video',
    scenarioTag: 'B737 MAX • FINAL APPROACH',
    caption: {
      he: 'גישת נחיתה אמיתית מתוך הקוקפיט בתל אביב',
      en: 'Live final approach filmed inside our Tel Aviv cockpit',
      ru: 'Реальный заход на посадку из кабины в Тель-Авиве',
      fr: 'Approche finale filmée dans notre cockpit de Tel-Aviv',
      ar: 'مقاربة هبوط حقيقية مصورة من داخل قمرة تل أبيب',
      es: 'Aproximación final filmada desde nuestra cabina en Tel Aviv',
      de: 'Echter Endanflug gefilmt im Cockpit in Tel Aviv',
    },
    alt: {
      he: 'סרטון גישת נחיתה בשעות בין ערביים מתא הטייס של הבואינג 737 MAX ב-Sim Dream',
      en: 'Dusk final approach and runway alignment filmed inside the Sim Dream Boeing 737 MAX cockpit',
      ru: 'Заход на посадку в сумерках, снятый в кабине Boeing 737 MAX Sim Dream',
      fr: 'Approche finale au crépuscule filmée dans le cockpit Boeing 737 MAX de Sim Dream',
      ar: 'مقاربة هبوط عند الغسق مصورة داخل قمرة بوينغ 737 MAX في Sim Dream',
      es: 'Aproximación final al atardecer grabada en la cabina Boeing 737 MAX de Sim Dream',
      de: 'Endanflug in der Dämmerung im Sim Dream Boeing 737 MAX Cockpit',
    },
  },
  {
    id: 'about-captain-mentorship',
    posterSrc: '/media/cockpit/captain-mentorship.webp',
    width: 1200,
    height: 900,
    aspect: 'video',
    scenarioTag: '1-ON-1 CAPTAIN • AGE 10+',
    caption: {
      he: 'ליווי אישי של קברניט תעופה — ללא צורך בניסיון קודם',
      en: '1-on-1 airline captain mentorship — no prior experience needed',
      ru: 'Личное сопровождение капитана авиакомпании — опыт не требуется',
      fr: 'Accompagnement individuel par un commandant de bord — sans expérience requise',
      ar: 'إرشاد شخصي من قبطان طيران — لا حاجة لخبرة سابقة',
      es: 'Acompañamiento 1 a 1 con capitán de aerolínea — sin experiencia previa',
      de: '1:1-Betreuung durch einen Airline-Kapitän — keine Vorkenntnisse nötig',
    },
    alt: {
      he: 'טייס צעיר מחייך בכיסא הקברניט לצד מדריך קברניט במדים בתוך קוקפיט הבואינג 737 MAX בתל אביב',
      en: 'Smiling young guest in the Captain seat beside a uniformed airline captain inside the Tel Aviv Boeing 737 MAX cockpit',
      ru: 'Улыбающийся юный гость в кресле капитана рядом с инструктором-капитаном в форме в кабине Boeing 737 MAX',
      fr: 'Jeune participant souriant au siège commandant aux côtés d’un instructeur en uniforme dans le cockpit Boeing 737 MAX',
      ar: 'ضيف شاب مبتسم في مقعد القبطان بجانب مدرب طيران بالزي الرسمي داخل قمرة بوينغ 737 MAX',
      es: 'Joven visitante sonriendo en el asiento del capitán junto a un instructor uniformado en la cabina Boeing 737 MAX',
      de: 'Lächelnder junger Gast auf dem Kapitänssitz neben einem uniformierten Airline-Kapitän im Boeing 737 MAX Cockpit',
    },
  },
];

/**
 * Calm daylight cockpit photo for `/fear-of-flying` (reassuring mood, zero red alerts or autoplay video).
 */
export const FEAR_OF_FLYING_MEDIA: ApprovedCockpitMedia = {
  id: 'fear-of-flying-daylight-cockpit',
  posterSrc: '/media/cockpit/captain-seat-daylight.webp',
  width: 1200,
  height: 900,
  aspect: 'video',
  scenarioTag: 'B737 MAX • CALM 1-ON-1',
  caption: {
    he: 'סביבת קוקפיט מוארת ורגועה — בקצב שלכם ועם מדריך צמוד',
    en: 'Bright, calm flight deck — at your own pace with a dedicated pilot instructor',
    ru: 'Светлая и спокойная кабина — в вашем темпе рядом с инструктором',
    fr: 'Cockpit lumineux et apaisant — à votre rythme avec un instructeur dédié',
    ar: 'قمرة قيادة مضيئة وهادئة — بالوتيرة التي تناسبك مع مدرب مخصص',
    es: 'Cabina luminosa y tranquila — a tu ritmo con un instructor dedicado',
    de: 'Helles, ruhiges Cockpit — in Ihrem eigenen Tempo mit persönlichem Fluglehrer',
  },
  alt: {
    he: 'אורחת רגועה ומחייכת בכיסא הקברניט בסימולטור הבואינג 737 MAX באור יום מול מסלול המראה בהיר',
    en: 'Relaxed, smiling guest sitting comfortably in the Boeing 737 MAX Captain seat looking out at a bright daytime runway',
    ru: 'Спокойная улыбающаяся гостья в кресле капитана Boeing 737 MAX на фоне светлой дневной взлётной полосы',
    fr: 'Participante détendue et souriante au siège commandant du Boeing 737 MAX face à une piste lumineuse de jour',
    ar: 'ضيفة هادئة ومبتسمة تجلس براحة في مقعد القبطان في بوينغ 737 MAX أمام مدرج نهاري مشرق',
    es: 'Visitante tranquila y sonriente en el asiento del capitán del Boeing 737 MAX frente a una pista soleada',
    de: 'Entspannte, lächelnde Besucherin auf dem Kapitänssitz der Boeing 737 MAX mit Blick auf eine helle Tageslicht-Startbahn',
  },
};

/**
 * Verified local cockpit stills used as consent-safe external Reel poster teasers on `/about`.
 */
export const ABOUT_REEL_TEASERS: readonly ReelTeaserMedia[] = [
  {
    id: 'about-reel-instagram',
    channel: 'Instagram',
    posterSrc: '/media/cockpit/captain-seat-daylight.webp',
    width: 1200,
    height: 900,
    aspect: 'video',
    scenarioTag: 'SIM DREAM • REELS',
    badge: {
      he: 'רילס מתא הטייס באינסטגרם',
      en: 'Cockpit Reels on Instagram',
      ru: 'Ролики из кабины в Instagram',
      fr: 'Reels cockpit sur Instagram',
      ar: 'مقاطع القمرة على إنستغرام',
      es: 'Reels de cabina en Instagram',
      de: 'Cockpit-Reels auf Instagram',
    },
    alt: {
      he: 'תמונת קוקפיט אמיתית מתל אביב המשמשת כתמונת פתיחה לרילס של Sim Dream באינסטגרם',
      en: 'Real Tel Aviv cockpit photo used as the poster for Sim Dream Instagram Reels',
      ru: 'Реальное фото кабины в Тель-Авиве для Reels Sim Dream в Instagram',
      fr: 'Photo réelle du cockpit à Tel-Aviv utilisée comme aperçu des Reels Instagram Sim Dream',
      ar: 'صورة حقيقية لقمرة القيادة في تل أبيب كملصق لمقاطع Sim Dream على إنستغرام',
      es: 'Foto real de la cabina en Tel Aviv usada como póster para los Reels de Sim Dream en Instagram',
      de: 'Echtes Cockpit-Foto aus Tel Aviv als Vorschau für Sim Dream Reels auf Instagram',
    },
  },
  {
    id: 'about-reel-youtube',
    channel: 'YouTube',
    posterSrc: '/media/cockpit/alpine-approach.webp',
    width: 1600,
    height: 901,
    aspect: 'video',
    scenarioTag: 'SIM DREAM • VIDEO',
    badge: {
      he: 'גישות נחיתה ביוטיוב',
      en: 'Approach Clips on YouTube',
      ru: 'Заходы на посадку на YouTube',
      fr: 'Approches filmées sur YouTube',
      ar: 'مقاطع مقاربات الهبوط على يوتيوب',
      es: 'Clips de aproximación en YouTube',
      de: 'Anflug-Clips auf YouTube',
    },
    alt: {
      he: 'תמונת תא טייס 737 MAX מול הרים המשמשת כתמונת פתיחה לסרטוני Sim Dream ביוטיוב',
      en: 'Real Boeing 737 MAX mountain cockpit view used as the poster for Sim Dream YouTube videos',
      ru: 'Реальный вид из кабины Boeing 737 MAX в горах для видео Sim Dream на YouTube',
      fr: 'Vue réelle du cockpit Boeing 737 MAX en montagne pour les vidéos YouTube Sim Dream',
      ar: 'منظر حقيقي لقمرة بوينغ 737 MAX في الجبال كملصق لفيديوهات Sim Dream على يوتيوب',
      es: 'Vista real de la cabina Boeing 737 MAX en montaña como póster para vídeos de Sim Dream en YouTube',
      de: 'Echte Boeing 737 MAX Berg-Cockpitansicht als Vorschau für Sim Dream YouTube-Videos',
    },
  },
];

const ILLUSTRATIVE_ROUTE_VISUAL_NOTE: LocalizedRecord<string> = {
  he: 'תמונת הקוקפיט היא אילוסטרציה בלבד; קוד המסלול מתאר את משימת הטיסה שנבחרה.',
  en: 'The cockpit image is illustrative; the route code identifies the selected flight mission.',
  ru: 'Изображение кабины носит иллюстративный характер; код маршрута обозначает выбранное задание полёта.',
  fr: 'L’image du cockpit est illustrative ; le code de route identifie la mission de vol sélectionnée.',
  ar: 'صورة قمرة القيادة توضيحية؛ يعرّف رمز المسار مهمة الطيران المختارة.',
  es: 'La imagen de cabina es ilustrativa; el código de ruta identifica la misión de vuelo seleccionada.',
  de: 'Das Cockpitbild ist illustrativ; der Routencode bezeichnet die ausgewählte Flugmission.',
};

/**
 * Interactive route briefing showcase on `/experiences#world-routes`.
 * VHHX & VQPR render static WebP stills; LOWI renders our muted dusk approach MP4 loop.
 */
export const EXPERIENCE_ROUTE_SCENARIOS: readonly RouteScenarioVisual[] = [
  {
    id: 'scenario-vhhx',
    routeId: 'route-extreme-airports',
    airportIndex: 1,
    icao: 'VHHX',
    runwayTag: 'VHHX • RWY 13',
    illustrativeNote: ILLUSTRATIVE_ROUTE_VISUAL_NOTE,
    media: {
      id: 'route-visual-vhhx',
      posterSrc: '/media/cockpit/captain-seat-daylight.webp',
      width: 1200,
      height: 900,
      aspect: 'video',
      scenarioTag: 'VHHX • RWY 13',
      alt: {
        he: 'תמונת תא טייס להמחשת תדריך מסלול VHHX מסלול 13',
        en: 'Illustrative cockpit image for the VHHX Runway 13 route briefing',
        ru: 'Иллюстративное изображение кабины для брифинга по маршруту VHHX ВПП 13',
        fr: 'Image de cockpit illustrative pour le briefing de route VHHX piste 13',
        ar: 'صورة توضيحية لقمرة القيادة لإحاطة مسار VHHX المدرج 13',
        es: 'Imagen ilustrativa de cabina para la sesión informativa de la ruta VHHX pista 13',
        de: 'Illustratives Cockpitbild für die Streckeneinweisung VHHX Piste 13',
      },
    },
  },
  {
    id: 'scenario-vqpr',
    routeId: 'route-extreme-airports',
    airportIndex: 0,
    icao: 'VQPR',
    runwayTag: 'VQPR • RWY 15',
    illustrativeNote: ILLUSTRATIVE_ROUTE_VISUAL_NOTE,
    media: {
      id: 'route-visual-vqpr',
      posterSrc: '/media/cockpit/alpine-approach.webp',
      width: 1600,
      height: 901,
      aspect: 'video',
      scenarioTag: 'VQPR • RWY 15',
      alt: {
        he: 'תמונת תא טייס להמחשת תדריך מסלול VQPR מסלול 15',
        en: 'Illustrative cockpit image for the VQPR Runway 15 route briefing',
        ru: 'Иллюстративное изображение кабины для брифинга по маршруту VQPR ВПП 15',
        fr: 'Image de cockpit illustrative pour le briefing de route VQPR piste 15',
        ar: 'صورة توضيحية لقمرة القيادة لإحاطة مسار VQPR المدرج 15',
        es: 'Imagen ilustrativa de cabina para la sesión informativa de la ruta VQPR pista 15',
        de: 'Illustratives Cockpitbild für die Streckeneinweisung VQPR Piste 15',
      },
    },
  },
  {
    id: 'scenario-lowi',
    routeId: 'route-extreme-airports',
    airportIndex: 2,
    icao: 'LOWI',
    runwayTag: 'LOWI • RWY 08',
    illustrativeNote: ILLUSTRATIVE_ROUTE_VISUAL_NOTE,
    media: {
      id: 'route-visual-lowi',
      posterSrc: '/media/cockpit/final-approach-poster.webp',
      videoSrc: '/media/cockpit/final-approach-loop.mp4',
      width: 848,
      height: 478,
      aspect: 'video',
      scenarioTag: 'LOWI • RWY 08',
      alt: {
        he: 'קטע וידאו מתא הטייס להמחשת תדריך מסלול LOWI מסלול 08',
        en: 'Illustrative cockpit approach clip for the LOWI Runway 08 route briefing',
        ru: 'Иллюстративный клип захода на посадку для брифинга по маршруту LOWI ВПП 08',
        fr: 'Séquence d’approche illustrative pour le briefing de route LOWI piste 08',
        ar: 'مقطع توضيحي من قمرة القيادة لإحاطة مسار LOWI المدرج 08',
        es: 'Clip ilustrativo de aproximación en cabina para la ruta LOWI pista 08',
        de: 'Illustrativer Cockpit-Anflugclip für das Routenbriefing LOWI Piste 08',
      },
    },
  },
];
