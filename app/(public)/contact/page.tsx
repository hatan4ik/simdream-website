'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Navigation,
  Train,
  Car,
  Send,
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  UserCheck,
  ShieldCheck,
  Compass,
  LocateFixed,
  Footprints,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useLanguage, SupportedLanguage } from '@/lib/i18n/language-context';
import {
  FACILITY_INFO,
  ROUTE_ORIGIN_PRESETS,
  calculateDynamicRouteFromCoords,
  RouteOriginPreset,
} from '@/lib/config/facility-info';
import { useLiveFacilityStatus } from '@/lib/config/use-live-facility-status';

type TravelMode = 'transit' | 'driving' | 'walking';

const CONTACT_COPY: Record<
  SupportedLanguage,
  {
    minAgeLabel: string;
    minAgeValue: string;
    reservationPolicyLabel: string;
    reservationPolicyValue: string;
    cockpitJumpseatsLabel: string;
    cockpitJumpseatsValue: string;
    openNow: string;
    closedNow: string;
    sunThu: string;
    friday: string;
    saturday: string;
    calcTitle: string;
    calcSubtitle: string;
    gpsLocating: string;
    gpsReady: string;
    gpsUse: string;
    choosePreset: string;
    customSrOnly: string;
    customPlaceholder: string;
    modes: {
      transit: string;
      driving: string;
      walking: string;
    };
    destinationLabel: string;
    launchMaps: string;
  }
> = {
  en: {
    minAgeLabel: 'MINIMUM PILOT AGE',
    minAgeValue: 'Ages 10+ Years Old',
    reservationPolicyLabel: 'RESERVATION POLICY',
    reservationPolicyValue: 'Advance Booking Required (Arrive 10 min prior)',
    cockpitJumpseatsLabel: 'COCKPIT JUMPSEATS',
    cockpitJumpseatsValue: 'Up to 2 Observer Guests Welcome',
    openNow: 'OPEN NOW',
    closedNow: 'CLOSED',
    sunThu: 'Sun – Thu:',
    friday: 'Friday:',
    saturday: 'Saturday:',
    calcTitle: 'Dynamic Google Maps Arrival Calculator',
    calcSubtitle:
      'Select your starting point or use your live GPS location to calculate dynamic arrival instructions to Gershon Shatz St 36, Tel Aviv:',
    gpsLocating: 'Locating GPS...',
    gpsReady: '✓ Live GPS Active',
    gpsUse: 'Use My Live GPS',
    choosePreset: '1. Choose Starting Point or Enter Custom Origin:',
    customSrOnly: 'Custom starting address',
    customPlaceholder: 'Or type any starting street/city for live Google Maps routing...',
    modes: {
      transit: 'Train / Light Rail',
      driving: 'Driving & Parking',
      walking: 'Walking',
    },
    destinationLabel: 'DESTINATION:',
    launchMaps: 'Launch Turn-by-Turn Route in Google Maps ↗',
  },
  he: {
    minAgeLabel: 'גיל מינימלי להטסה',
    minAgeValue: 'גיל 10+ ומעלה',
    reservationPolicyLabel: 'תיאום והגעה',
    reservationPolicyValue: 'נדרשת הזמנה מראש (הגעה 10 דק׳ לפני)',
    cockpitJumpseatsLabel: 'מלווים בתא הטייס',
    cockpitJumpseatsValue: 'עד 2 אורחים נוספים בתא הטייס',
    openNow: 'פתוח כעת',
    closedNow: 'סגור כעת',
    sunThu: 'ראשון – חמישי:',
    friday: 'יום שישי:',
    saturday: 'מוצ״ש (שבת):',
    calcTitle: 'מחשבון מסלול הגעה דינמי (Google Maps)',
    calcSubtitle:
      'בחרו נקודת מוצא או השתמשו במיקום ה-GPS שלכם לחישוב מסלול הגעה דינמי אל רחוב גרשון ש"ץ 36, תל אביב:',
    gpsLocating: 'מאתר מיקום...',
    gpsReady: '✓ מיקום GPS פעיל',
    gpsUse: 'השתמש במיקום הנוכחי שלי',
    choosePreset: '1. בחרו נקודת מוצא מהירה או הקלידו כתובת:',
    customSrOnly: 'כתובת מוצא מותאמת אישית',
    customPlaceholder: 'או הקלידו עיר / כתובת מוצא לחישוב מסלול ב-Google Maps...',
    modes: {
      transit: 'רכבת / רכבת קלה',
      driving: 'רכב וחניה',
      walking: 'הליכה רגלית',
    },
    destinationLabel: 'יעד:',
    launchMaps: 'פתח מסלול ניווט חי ב-Google Maps ↗',
  },
  ru: {
    minAgeLabel: 'МИНИМАЛЬНЫЙ ВОЗРАСТ ПИЛОТА',
    minAgeValue: 'От 10 лет и старше',
    reservationPolicyLabel: 'ПРАВИЛА БРОНИРОВАНИЯ',
    reservationPolicyValue: 'Требуется предварительное бронирование (за 10 мин)',
    cockpitJumpseatsLabel: 'МЕСТА ДЛЯ ГОСТЕЙ В КАБИНЕ',
    cockpitJumpseatsValue: 'До 2 гостей-наблюдателей бесплатно',
    openNow: 'СЕЙЧАС ОТКРЫТО',
    closedNow: 'ЗАКРЫТО',
    sunThu: 'Вс – Чт:',
    friday: 'Пятница:',
    saturday: 'Суббота (вечер):',
    calcTitle: 'Динамический расчет маршрута в Google Maps',
    calcSubtitle:
      'Выберите начальную точку или включите GPS для пошаговой навигации к ул. Гершон Шац 36, Тель-Авив:',
    gpsLocating: 'Определение GPS...',
    gpsReady: '✓ GPS активен',
    gpsUse: 'Использовать мой GPS',
    choosePreset: '1. Выберите точку отправления или введите адрес:',
    customSrOnly: 'Пользовательский адрес отправления',
    customPlaceholder: 'Или введите город / улицу для построения маршрута в Google Maps...',
    modes: {
      transit: 'Поезд / Трамвай (Red Line)',
      driving: 'Автомобиль и парковка',
      walking: 'Пешком',
    },
    destinationLabel: 'ПУНКТ НАЗНАЧЕНИЯ:',
    launchMaps: 'Открыть навигацию в Google Maps ↗',
  },
  fr: {
    minAgeLabel: 'ÂGE MINIMUM DU PILOTE',
    minAgeValue: 'Dès 10 ans et plus',
    reservationPolicyLabel: 'POLITIQUE DE RÉSERVATION',
    reservationPolicyValue: 'Réservation préalable requise (arriver 10 min avant)',
    cockpitJumpseatsLabel: 'OBSERVATEURS EN CABINE',
    cockpitJumpseatsValue: 'Jusqu’à 2 invités observateurs inclus',
    openNow: 'OUVERT',
    closedNow: 'FERMÉ',
    sunThu: 'Dim – Jeu :',
    friday: 'Vendredi :',
    saturday: 'Samedi (soir) :',
    calcTitle: 'Calculateur dynamique d’itinéraire Google Maps',
    calcSubtitle:
      'Sélectionnez votre point de départ ou activez votre GPS pour vous rendre au 36 rue Gershon Shatz, Tel-Aviv :',
    gpsLocating: 'Recherche GPS...',
    gpsReady: '✓ GPS actif',
    gpsUse: 'Utiliser mon GPS',
    choosePreset: '1. Choisissez un point de départ ou saisissez une adresse :',
    customSrOnly: 'Adresse de départ personnalisée',
    customPlaceholder: 'Ou saisissez une rue / ville pour le calcul Google Maps...',
    modes: {
      transit: 'Train / Tramway',
      driving: 'Voiture et stationnement',
      walking: 'À pied',
    },
    destinationLabel: 'DESTINATION :',
    launchMaps: 'Lancer l’itinéraire dans Google Maps ↗',
  },
  ar: {
    minAgeLabel: 'الحد الأدنى لعمر الطيار',
    minAgeValue: 'من عمر 10 سنوات فما فوق',
    reservationPolicyLabel: 'سياسة الحجز',
    reservationPolicyValue: 'الحجز المسبق مطلوب (الوصول قبل 10 دقائق)',
    cockpitJumpseatsLabel: 'مقاعد المرافقين في قمرة القيادة',
    cockpitJumpseatsValue: 'ما يصل إلى ضيفين مرافقين في قمرة القيادة',
    openNow: 'مفتوح الآن',
    closedNow: 'مغلق الآن',
    sunThu: 'الأحد – الخميس:',
    friday: 'الجمعة:',
    saturday: 'السبت (مساءً):',
    calcTitle: 'حاسبة مسار الوصول المباشرة (Google Maps)',
    calcSubtitle:
      'اختر نقطة انطلاق أو استخدم موقع GPS لحساب مسار الوصول إلى شارع غيرشون شاتس 36، تل أبيب:',
    gpsLocating: 'تحديد الموقع...',
    gpsReady: '✓ نظام GPS نشط',
    gpsUse: 'استخدام موقعي الحالي',
    choosePreset: '1. اختر نقطة انطلاق سريعة أو أدخل عنواناً:',
    customSrOnly: 'عنوان انطلاق مخصص',
    customPlaceholder: 'أو اكتب شارع / مدينة الانطلاق لحساب المسار عبر خرائط Google...',
    modes: {
      transit: 'قطار / قطار خفيف',
      driving: 'بالسيارة والمواقف',
      walking: 'سيراً على الأقدام',
    },
    destinationLabel: 'الوجهة:',
    launchMaps: 'فتح مسار التنقل المباشر في خرائط Google ↗',
  },
};

const PRESET_LOCALIZATIONS: Record<
  string,
  {
    ru: { label: string; transit: string; driving: string };
    fr: { label: string; transit: string; driving: string };
    ar: { label: string; transit: string; driving: string };
  }
> = {
  'yehudit-lrt': {
    ru: {
      label: 'Трамвай — станция Йехудит (Красная линия)',
      transit:
        'Выйдите из подземной станции «Йехудит» (Красная ветка) в сторону ул. Ицхак Садэ / Ха-Масгер → 4 минуты пешком (350 м) по кварталу Монтефиори до ул. Гершон Шац 36.',
      driving:
        'С улицы Бегин поверните на ул. Ицхак Садэ → поворот на ул. Гершон Шац 36. Доступна городская разметка (сине-белая) и платные парковки рядом.',
    },
    fr: {
      label: 'Tramway — Station Yehudit (Ligne Rouge)',
      transit:
        'Sortez de la station souterraine « Yehudit » (Ligne Rouge) vers HaMasger / Yitzhak Sadeh → 4 minutes à pied (350 m) dans le quartier Montefiore jusqu’au 36 rue Gershon Shatz.',
      driving:
        'Depuis Derech Menachem Begin, tournez rue Yitzhak Sadeh → entrez rue Gershon Shatz 36. Stationnement voirie (bleu-blanc) ou parkings privés disponibles.',
    },
    ar: {
      label: 'القطار الخفيف — محطة يهوديت (الخط الأحمر)',
      transit:
        'اخرج من محطة القطار الخفيف تحت الأرض "يهوديت" (الخط الأحمر) باتجاه يتسحاق سديه / هماسغير ← سير لمدة 4 دقائق (350 متراً) عبر حي مونتيفيوري حتى شارع غيرشون شاتس 36.',
      driving:
        'من طريق بيغن انعطف إلى شارع يتسحاق سديه ← ادخل شارع غيرشون شاتس 36. تتوفر مواقف بلدية (أزرق وأبيض) أو مواقف خاصة مدفوعة.',
    },
  },
  'hashalom-train': {
    ru: {
      label: 'Поезд — станция Тель-Авив Ха-Шалом',
      transit:
        'Выйдите из станции «Ха-Шалом» (Азриэли) на запад к ул. Бегин → 8–10 мин пешком на юг через ул. Ицхак Садэ (или 1 остановка на Красной линии до Йехудит) → ул. Гершон Шац 36.',
      driving:
        'От развязки Азриэли на юг по Дерех Менахем Бегин → налево на ул. Ицхак Садэ → на ул. Гершон Шац 36.',
    },
    fr: {
      label: 'Train — Gare Tel Aviv HaShalom',
      transit:
        'Sortez de la gare HaShalom (Azrieli) vers Derech Begin → 8–10 min à pied vers le sud par Yitzhak Sadeh (ou 1 arrêt en Tramway Ligne Rouge jusqu’à Yehudit) → 36 rue Gershon Shatz.',
      driving:
        'Depuis Azrieli, prenez vers le sud sur Derech Menachem Begin → tournez à gauche rue Yitzhak Sadeh → entrez rue Gershon Shatz 36.',
    },
    ar: {
      label: 'القطار — محطة تل أبيب هشالوم',
      transit:
        'اخرج من محطة قطار هشالوم (عزرائيلي) غرباً نحو طريق بيغن ← مشي 8–10 دقائق جنوباً عبر يتسحاق سديه (أو محطة واحدة بالقطار الخفيف إلى يهوديت) ← الوصول إلى شارع غيرشون شاتس 36.',
      driving:
        'من مفرق عزرائيلي اتجه جنوباً على طريق مناحيم بيغن ← انعطف يساراً إلى شارع يتسحاق سديه ← ادخل شارع غيرشون شاتس 36.',
    },
  },
  'ben-gurion-llbg': {
    ru: {
      label: 'Аэропорт Бен-Гурион (TLV / LLBG)',
      transit:
        'Поезд Израильских железных дорог от станции Бен-Гурион до станции Тель-Авив Ха-Шалом (12 минут) → 9 минут пешком до ул. Гершон Шац 36.',
      driving:
        'Трасса 1 на запад к Аялон Север (шоссе 20) → съезд Ла-Гвардия / Ха-Шалом на ул. Ицхак Садэ → ул. Гершон Шац 36.',
    },
    fr: {
      label: 'Aéroport Ben Gourion (TLV / LLBG)',
      transit:
        'Prenez le train depuis l’aéroport Ben Gourion jusqu’à la gare Tel Aviv HaShalom (12 min) → 9 min à pied via Yitzhak Sadeh jusqu’au 36 rue Gershon Shatz.',
      driving:
        'Prenez la Route 1 Ouest vers Ayalon Nord (Route 20) → Sortie La Guardia / HaShalom vers Yitzhak Sadeh → 36 rue Gershon Shatz.',
    },
    ar: {
      label: 'مطار بن غوريون (TLV / LLBG)',
      transit:
        'استقل قطار إسرائيل من محطة مطار بن غوريون مباشرة إلى محطة تل أبيب هشالوم (12 دقيقة) ← 9 دقائق سيراً عبر شارع يتسحاق سديه إلى شارع غيرشون شاتس 36.',
      driving:
        'اسلك طريق 1 غرباً باتجاه أيالون شمالاً (طريق 20) ← اخرج عند مفرق لاغوارديا / هشالوم باتجاه شارع يتسحاق سديه ← انعطف إلى شارع غيرشون شاتس 36.',
    },
  },
  'herzliya-north': {
    ru: {
      label: 'Герцлия / Северный Тель-Авив',
      transit:
        'Поезд на юг до станции Тель-Авив Ха-Шалом или Красная линия трамвая до ст. Йехудит → короткая прогулка до ул. Гершон Шац 36.',
      driving:
        'Аялон Юг (шоссе 20) → съезд Ха-Шалом → на ул. Ицхак Садэ и поворот на ул. Гершон Шац 36.',
    },
    fr: {
      label: 'Herzliya / Nord de Tel-Aviv',
      transit:
        'Train vers le sud jusqu’à HaShalom ou Ligne Rouge du Tramway jusqu’à Yehudit → courte marche jusqu’au 36 rue Gershon Shatz.',
      driving:
        'Ayalon Sud (Route 20) → Sortie HaShalom → continuez sur Yitzhak Sadeh et tournez rue Gershon Shatz 36.',
    },
    ar: {
      label: 'هرتسليا / شمال تل أبيب',
      transit:
        'قطار إسرائيل جنوباً إلى محطة تل أبيب هشالوم أو الخط الأحمر للقطار الخفيف إلى محطة يهوديت ← مشي قصير إلى شارع غيرشون شاتس 36.',
      driving:
        'اسلك أيالون جنوباً (طريق 20) ← اخرج عند مفرق هشالوم ← تابع إلى شارع يتسحاق سديه وانعطف إلى شارع غيرشون شاتس 36.',
    },
  },
  'rishon-south': {
    ru: {
      label: 'Ришон-ле-Цион / Бат-Ям / Юг',
      transit:
        'Красная ветка трамвая на север прямо до станции Йехудит (без пересадок) → 4 минуты пешком до ул. Гершон Шац 36.',
      driving:
        'Аялон Север (шоссе 20) → съезд Ла-Гвардия на ул. Ицхак Садэ → поворот на ул. Гершон Шац 36.',
    },
    fr: {
      label: 'Rishon LeZion / Bat Yam / Sud',
      transit:
        'Ligne Rouge du Tramway vers le nord directement jusqu’à Yehudit (direct) → 4 minutes à pied jusqu’au 36 rue Gershon Shatz.',
      driving:
        'Ayalon Nord (Route 20) → Sortie La Guardia vers Yitzhak Sadeh → tournez rue Gershon Shatz 36.',
    },
    ar: {
      label: 'ريشون لتسيون / بات يام / الجنوب',
      transit:
        'الخط الأحمر للقطار الخفيف شمالاً مباشرة إلى محطة يهوديت (مباشر) ← 4 دقائق مشي إلى شارع غيرشون شاتس 36.',
      driving:
        'اسلك أيالون شمالاً (طريق 20) ← اخرج عند مفرق لاغوارديا باتجاه شارع يتسحاق سديه ← انعطف إلى شارع غيرشون شاتس 36.',
    },
  },
};

function getPresetLabel(preset: RouteOriginPreset, lang: SupportedLanguage): string {
  if (lang === 'he') return preset.labelHe;
  if (lang === 'ru' && PRESET_LOCALIZATIONS[preset.id]?.ru) return PRESET_LOCALIZATIONS[preset.id].ru.label;
  if (lang === 'fr' && PRESET_LOCALIZATIONS[preset.id]?.fr) return PRESET_LOCALIZATIONS[preset.id].fr.label;
  if (lang === 'ar' && PRESET_LOCALIZATIONS[preset.id]?.ar) return PRESET_LOCALIZATIONS[preset.id].ar.label;
  return preset.labelEn;
}

function getPresetSteps(
  preset: RouteOriginPreset,
  lang: SupportedLanguage,
  mode: TravelMode
): string {
  if (lang === 'he') {
    return mode === 'driving' ? preset.drivingStepsHe : preset.transitStepsHe;
  }
  if (lang === 'ru' && PRESET_LOCALIZATIONS[preset.id]?.ru) {
    return mode === 'driving' ? PRESET_LOCALIZATIONS[preset.id].ru.driving : PRESET_LOCALIZATIONS[preset.id].ru.transit;
  }
  if (lang === 'fr' && PRESET_LOCALIZATIONS[preset.id]?.fr) {
    return mode === 'driving' ? PRESET_LOCALIZATIONS[preset.id].fr.driving : PRESET_LOCALIZATIONS[preset.id].fr.transit;
  }
  if (lang === 'ar' && PRESET_LOCALIZATIONS[preset.id]?.ar) {
    return mode === 'driving' ? PRESET_LOCALIZATIONS[preset.id].ar.driving : PRESET_LOCALIZATIONS[preset.id].ar.transit;
  }
  return mode === 'driving' ? preset.drivingStepsEn : preset.transitStepsEn;
}

export default function ContactPage() {
  const { t, language } = useLanguage();
  const c = CONTACT_COPY[language] || CONTACT_COPY.en;

  // Live Israel Time & Facility Open/Closed Status (browser-only; null until mounted)
  const liveStatus = useLiveFacilityStatus(30_000);

  const liveStatusHeadline = !liveStatus
    ? ''
    : language === 'he'
      ? liveStatus.statusHeadlineHe
      : language === 'ru'
      ? (liveStatus.isOpen ? 'ОТКРЫТО • По предварительной записи' : 'СЕЙЧАС ЗАКРЫТО • Бронирование 24/7')
      : language === 'fr'
      ? (liveStatus.isOpen ? 'OUVERT • Sur réservation préalable' : 'ACTUELLEMENT FERMÉ • Réservation 24/7')
      : language === 'ar'
      ? (liveStatus.isOpen ? 'مفتوح ويعمل • يتطلب حجزاً مسبقاً' : 'مغلق حالياً • الحجز الإلكتروني متاح 24/7')
      : liveStatus.statusHeadlineEn;

  const liveStatusSubline = !liveStatus
    ? ''
    : language === 'he'
      ? liveStatus.statusSublineHe
      : language === 'ru'
      ? `Время в Тель-Авиве: ${liveStatus.israelTimeFormatted} IST • Онлайн-бронирование 24/7`
      : language === 'fr'
      ? `Heure de Tel-Aviv : ${liveStatus.israelTimeFormatted} IST • Réservation en ligne 24/7`
      : language === 'ar'
      ? `توقيت تل أبيب: ${liveStatus.israelTimeFormatted} IST • الحجز الإلكتروني متاح 24/7`
      : liveStatus.statusSublineEn;

  // Dynamic Arrival & Route Calculator State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('yehudit-lrt');
  const [customOrigin, setCustomOrigin] = useState<string>('');
  const [travelMode, setTravelMode] = useState<TravelMode>('transit');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'ready' | 'error'>('idle');
  const [gpsMetrics, setGpsMetrics] = useState<{
    lat: number;
    lng: number;
    roadDistanceKm: number;
    walkingMinutes: number;
    drivingMinutes: number;
    transitMinutes: number;
  } | null>(null);

  const activePreset = useMemo(
    () => ROUTE_ORIGIN_PRESETS.find((p) => p.id === selectedPresetId) || ROUTE_ORIGIN_PRESETS[0],
    [selectedPresetId]
  );

  const handleUseMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const metrics = calculateDynamicRouteFromCoords(latitude, longitude);
        setGpsMetrics({
          lat: latitude,
          lng: longitude,
          ...metrics,
        });
        setGpsStatus('ready');
      },
      () => {
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Build dynamic Google Maps Directions URL with origin, destination Place ID, and travelmode
  const dynamicGoogleMapsDirectionsUrl = useMemo(() => {
    const params = new URLSearchParams({
      api: '1',
      destination: 'Gershon Shatz St 36, Tel Aviv-Yafo, Israel',
      destination_place_id: FACILITY_INFO.placeId,
      travelmode: travelMode,
    });

    if (customOrigin.trim()) {
      params.set('origin', customOrigin.trim());
    } else if (gpsStatus === 'ready' && gpsMetrics) {
      params.set('origin', `${gpsMetrics.lat},${gpsMetrics.lng}`);
    } else if (activePreset) {
      params.set('origin', activePreset.query);
    }

    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [customOrigin, gpsStatus, gpsMetrics, activePreset, travelMode]);

  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Question',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSuccess(true);
    setIsSubmitting(false);
  };

  const activeDistanceKm =
    gpsStatus === 'ready' && gpsMetrics ? gpsMetrics.roadDistanceKm : activePreset.distanceKm;
  const activeEtaMinutes =
    gpsStatus === 'ready' && gpsMetrics
      ? travelMode === 'walking'
        ? gpsMetrics.walkingMinutes
        : travelMode === 'driving'
        ? gpsMetrics.drivingMinutes
        : gpsMetrics.transitMinutes
      : travelMode === 'walking'
      ? activePreset.walkingMinutes ?? Math.round(activePreset.distanceKm * 12)
      : travelMode === 'driving'
      ? activePreset.drivingMinutes
      : activePreset.transitMinutes;

  return (
    <div className="flex-1 w-full min-w-0 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-14">
      {/* 1. HEADER */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="sky">{t.contact.badge}</Badge>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
          {t.contact.title}
        </h1>
        <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
          {t.contact.subtitle}
        </p>
      </div>

      {/* 2. KEY FACILITY RULES & MINIMUM AGE RIBBON (10+) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900/90 to-slate-900/90">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <UserCheck aria-hidden="true" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-amber-400 font-bold">
              {c.minAgeLabel}
            </div>
            <div className="text-sm sm:text-base font-black text-white">
              {c.minAgeValue}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0">
            <ShieldCheck aria-hidden="true" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-sky-400 font-bold">
              {c.reservationPolicyLabel}
            </div>
            <div className="text-sm font-bold text-white">
              {c.reservationPolicyValue}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Compass aria-hidden="true" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-emerald-400 font-bold">
              {c.cockpitJumpseatsLabel}
            </div>
            <div className="text-sm font-bold text-white">
              {c.cockpitJumpseatsValue}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CORE BUSINESS CARDS (ADDRESS, DYNAMIC HOURS, DIRECT PHONE & EMAIL) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Verified Google Business Address */}
        <Card className="space-y-4 flex flex-col justify-between" borderAccent="sky">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                <MapPin aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 font-bold">
                GOOGLE VERIFIED
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">{t.contact.addressTitle}</h2>
            <div className="text-slate-200 text-sm font-semibold space-y-0.5">
              <p>{t.contact.addressLine1}</p>
              <p className="text-slate-400 font-normal">{t.contact.addressLine2}</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{t.contact.addressNote}</p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
            <a
              href={FACILITY_INFO.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-mono font-bold transition-all"
            >
              <span>Google Maps</span>
              <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
            </a>
            <a
              href={FACILITY_INFO.wazeNavigationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold transition-all"
            >
              <span>Waze Navigation</span>
              <Navigation aria-hidden="true" className="w-3.5 h-3.5 text-sky-400" />
            </a>
          </div>
        </Card>

        {/* Card 2: Dynamic Operating Hours & Real-Time IST Status */}
        <Card className="space-y-4 flex flex-col justify-between" borderAccent="emerald">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Clock aria-hidden="true" className="w-5 h-5" />
              </div>
              {liveStatus && (
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold border ${
                    liveStatus.isOpen
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      liveStatus.isOpen ? 'bg-emerald-400 motion-safe:animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span>{liveStatus.isOpen ? c.openNow : c.closedNow}</span>
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-white">{t.contact.hoursTitle}</h2>

            <div className="text-slate-200 text-xs font-mono space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <div className="flex justify-between">
                <span className="text-slate-400">{c.sunThu}</span>
                <span className="font-bold text-white" dir="ltr">10:00 – 23:00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{c.friday}</span>
                <span className="font-bold text-white" dir="ltr">09:00 – 16:00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{c.saturday}</span>
                <span className="font-bold text-amber-300" dir="ltr">19:00 – 24:00</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 space-y-0.5 font-mono text-[11px] min-h-12">
            <p className={liveStatus?.isOpen ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {liveStatusHeadline}
            </p>
            <p className="text-slate-400">
              {liveStatusSubline}
            </p>
          </div>
        </Card>

        {/* Card 3: Direct Dispatch Phone, WhatsApp & Email */}
        <Card className="space-y-4 flex flex-col justify-between" borderAccent="amber">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Phone aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                DIRECT DISPATCH
              </span>
            </div>

            <h2 className="text-lg font-bold text-white">{t.contact.dispatchTitle}</h2>

            <div className="space-y-2 text-sm font-mono">
              <a
                href={FACILITY_INFO.contact.phoneHref}
                dir="ltr"
                className="flex items-center gap-2 text-white hover:text-sky-400 font-bold transition-colors"
              >
                <Phone aria-hidden="true" className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{FACILITY_INFO.contact.phoneDisplay}</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({FACILITY_INFO.contact.phoneInternational})
                </span>
              </a>

              <a
                href={FACILITY_INFO.contact.emailHref}
                dir="ltr"
                className="flex items-center gap-2 text-slate-200 hover:text-sky-400 transition-colors"
              >
                <Mail aria-hidden="true" className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{FACILITY_INFO.contact.email}</span>
              </a>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80">
            <a
              href={FACILITY_INFO.contact.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold transition-all"
            >
              <MessageCircle aria-hidden="true" className="w-4 h-4" />
              <span>{t.contact.chatWhatsApp}</span>
            </a>
          </div>
        </Card>
      </div>

      {/* 4. DYNAMIC GOOGLE MAPS ARRIVAL ROUTE PLANNER & TRANSIT CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left 7 Columns: Dynamic Route Calculator + Transit Modes */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">{t.contact.directionsTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {c.calcSubtitle}
            </p>
          </div>

          {/* Interactive Dynamic Route Engine Box */}
          <div className="p-5 sm:p-6 rounded-2xl border border-sky-500/30 bg-slate-900/90 space-y-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <Compass aria-hidden="true" className="w-5 h-5 text-sky-400" />
                <span className="text-sm font-bold text-white font-mono uppercase">
                  {c.calcTitle}
                </span>
              </div>

              <button
                type="button"
                onClick={handleUseMyLocation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-mono font-bold transition-all"
              >
                <LocateFixed aria-hidden="true" className="w-3.5 h-3.5" />
                <span>
                  {gpsStatus === 'locating'
                    ? c.gpsLocating
                    : gpsStatus === 'ready'
                    ? c.gpsReady
                    : c.gpsUse}
                </span>
              </button>
            </div>

            {/* Quick Starting Point Pills */}
            <div className="space-y-2">
              <span className="block text-[11px] font-mono uppercase text-slate-400">
                {c.choosePreset}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ROUTE_ORIGIN_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id && gpsStatus !== 'ready' && !customOrigin;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setGpsStatus('idle');
                        setCustomOrigin('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {getPresetLabel(preset, language)}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1">
                <label htmlFor="custom-origin-input" className="sr-only">
                  {c.customSrOnly}
                </label>
                <input
                  id="custom-origin-input"
                  name="customOrigin"
                  type="text"
                  value={customOrigin}
                  onChange={(e) => setCustomOrigin(e.target.value)}
                  placeholder={c.customPlaceholder}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Travel Mode Switcher */}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    id: 'transit',
                    label: c.modes.transit,
                    icon: Train,
                  },
                  {
                    id: 'driving',
                    label: c.modes.driving,
                    icon: Car,
                  },
                  {
                    id: 'walking',
                    label: c.modes.walking,
                    icon: Footprints,
                  },
                ] as const
              ).map((mode) => {
                const Icon = mode.icon;
                const active = travelMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTravelMode(mode.id)}
                    className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                      active
                        ? 'border-sky-400 bg-sky-500/15 text-white'
                        : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon aria-hidden="true" className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Computed ETA, Distance & Step-by-Step Instructions */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 font-mono text-xs">
                <span className="text-slate-400">
                  {c.destinationLabel}{' '}
                  <strong className="text-white">Gershon Shatz 36, Tel Aviv</strong>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sky-400 font-bold">~{activeDistanceKm} km</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                    ~{activeEtaMinutes} min
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {getPresetSteps(activePreset, language, travelMode)}
              </p>

              <div className="pt-1 flex flex-wrap gap-2">
                <a
                  href={dynamicGoogleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-xs font-black transition-all shadow-md"
                >
                  <Navigation aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>{c.launchMaps}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Static Reference Cards for Light Rail (Yehudit), Israel Railways (HaShalom), and Street/Private Parking */}
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 mt-1">
                <Navigation aria-hidden="true" className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-sm">
                <h3 className="font-bold text-white">{t.contact.lightRailTitle}</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t.contact.lightRailDesc}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 mt-1">
                <Train aria-hidden="true" className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-sm">
                <h3 className="font-bold text-white">{t.contact.trainTitle}</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t.contact.trainDesc}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-1">
                <Car aria-hidden="true" className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-sm">
                <h3 className="font-bold text-white">{t.contact.carTitle}</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t.contact.carDesc}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Live Google Map Embed + Direct Inquiry Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Interactive Google Maps Embed for Gershon Shatz 36 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-2xl space-y-2">
            <div className="flex items-center justify-between px-1 text-xs font-mono text-slate-300">
              <span>📍 Gershon Shatz St 36, Tel Aviv-Yafo</span>
              <a
                href={FACILITY_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline"
              >
                Open Full Map ↗
              </a>
            </div>
            <iframe
              title="SimDream Boeing 737 MAX Flight Simulator Location — Gershon Shatz St 36, Tel Aviv-Yafo"
              src={FACILITY_INFO.googleEmbedUrl}
              className="w-full h-64 rounded-xl border border-slate-800"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Direct Dispatch Contact Form */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">{t.contact.messageTitle}</h2>
              <p className="text-xs text-slate-400">{t.contact.messageSubtitle}</p>
            </div>

            {isSuccess ? (
              <div
                role="status"
                aria-live="polite"
                className="p-8 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-center space-y-3"
              >
                <CheckCircle2 aria-hidden="true" className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">{t.contact.formSuccessTitle}</h3>
                <p className="text-xs text-slate-300">{t.contact.formSuccessDesc}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} method="POST" action="/contact" className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-name"
                    className="block font-mono uppercase text-slate-300 font-semibold"
                  >
                    {t.contact.formName}
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ronen Katz"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-email"
                      className="block font-mono uppercase text-slate-300 font-semibold"
                    >
                      {t.contact.formEmail}
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ronen@example.com"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-phone"
                      className="block font-mono uppercase text-slate-300 font-semibold"
                    >
                      {t.contact.formPhone}
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="055-507-1307"
                      dir="ltr"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base text-white focus:outline-none focus:border-sky-500 text-left rtl:text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-subject"
                    className="block font-mono uppercase text-slate-300 font-semibold"
                  >
                    {t.contact.formSubject}
                  </label>
                  <select
                    id="contact-subject"
                    name="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="General Question">{t.contact.subjectGeneral}</option>
                    <option value="Pilot Assessment Screening">{t.contact.subjectTraining}</option>
                    <option value="Corporate Offsite">{t.contact.subjectCorporate}</option>
                    <option value="Gift Voucher Support">{t.contact.subjectVoucher}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-message"
                    className="block font-mono uppercase text-slate-300 font-semibold"
                  >
                    {t.contact.formMessage}
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t.contact.formMessagePlaceholder}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <Button type="submit" size="md" isLoading={isSubmitting} className="w-full font-bold">
                  <Send aria-hidden="true" className="w-4 h-4" />
                  <span>{isSubmitting ? t.contact.formSending : t.contact.formSubmit}</span>
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
