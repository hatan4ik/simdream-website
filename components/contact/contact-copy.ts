import type { SupportedLanguage } from '@/lib/i18n/translations';

export const CONTACT_COPY: Record<
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
  es: {
    minAgeLabel: 'EDAD MÍNIMA DEL PILOTO',
    minAgeValue: 'A partir de 10 años',
    reservationPolicyLabel: 'POLÍTICA DE RESERVAS',
    reservationPolicyValue: 'Es necesario reservar con antelación (llega 10 min antes)',
    cockpitJumpseatsLabel: 'ASIENTOS DE OBSERVACIÓN',
    cockpitJumpseatsValue: 'Hasta 2 invitados observadores',
    openNow: 'ABIERTO AHORA',
    closedNow: 'CERRADO',
    sunThu: 'Dom – Jue:',
    friday: 'Viernes:',
    saturday: 'Sábado (noche):',
    calcTitle: 'Calculadora de llegada con Google Maps',
    calcSubtitle: 'Elige tu punto de partida o usa tu GPS para calcular la llegada a Gershon Shatz 36, Tel Aviv:',
    gpsLocating: 'Buscando GPS…',
    gpsReady: '✓ GPS activo',
    gpsUse: 'Usar mi GPS',
    choosePreset: '1. Elige un punto de partida o introduce una dirección:',
    customSrOnly: 'Dirección de salida personalizada',
    customPlaceholder: 'O escribe una ciudad o calle para abrir la ruta en Google Maps…',
    modes: { transit: 'Tren / tren ligero', driving: 'Coche y aparcamiento', walking: 'A pie' },
    destinationLabel: 'DESTINO:',
    launchMaps: 'Abrir navegación en Google Maps ↗',
  },
  de: {
    minAgeLabel: 'MINDESTALTER DES PILOTEN',
    minAgeValue: 'Ab 10 Jahren',
    reservationPolicyLabel: 'BUCHUNGSRICHTLINIE',
    reservationPolicyValue: 'Vorherige Buchung erforderlich (10 Min. vorher erscheinen)',
    cockpitJumpseatsLabel: 'COCKPIT-JUMPSEATS',
    cockpitJumpseatsValue: 'Bis zu 2 begleitende Gäste',
    openNow: 'JETZT GEÖFFNET',
    closedNow: 'GESCHLOSSEN',
    sunThu: 'So – Do:',
    friday: 'Freitag:',
    saturday: 'Samstag (Abend):',
    calcTitle: 'Anfahrtsrechner mit Google Maps',
    calcSubtitle: 'Wählen Sie Ihren Startpunkt oder nutzen Sie GPS für die Route zur Gershon Shatz 36, Tel Aviv:',
    gpsLocating: 'GPS wird gesucht…',
    gpsReady: '✓ GPS aktiv',
    gpsUse: 'Mein GPS nutzen',
    choosePreset: '1. Startpunkt wählen oder Adresse eingeben:',
    customSrOnly: 'Eigene Abfahrtsadresse',
    customPlaceholder: 'Oder Stadt bzw. Straße für Google Maps eingeben…',
    modes: { transit: 'Bahn / Stadtbahn', driving: 'Auto & Parken', walking: 'Zu Fuß' },
    destinationLabel: 'ZIEL:',
    launchMaps: 'Live-Navigation in Google Maps öffnen ↗',
  },
};
