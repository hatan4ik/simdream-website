import type { LocalizedRecord } from '@/lib/i18n/translations';

export interface StorefrontCalendarCopy {
  departureTitle: string;
  departureSubtitle: string;
  viewWeek: string;
  viewMonth: string;
  previousMonth: string;
  nextMonth: string;
  departureSlots: (date: string) => string;
  selectedWindow: string;
  maxAvailable: (minutes: number) => string;
  checkNextDay: string;
  noSlots: (packageTitle: string, date: string) => string;
  noSlotsHint: string;
  tryFlight: (minutes: number, price: string) => string;
  morning: string;
  afternoon: string;
  evening: string;
  upToFit: (minutes: number) => string;
  packagesAvailable: (date: string) => string;
  openSlotsCount: (count: number) => string;
  jumpToTimes: string;
  jumpToCheckout: string;
  customizeFlight: string;
  chooseTrainingDuration: string;
  reviewFlightDetails: string;
  basePackagePrice: string;
  selectPackageTitle: string;
  edition: string;
  minutes: (minutes: number) => string;
  noSlotsToday: string;
  slotsOpenToday: (count: number) => string;
  selected: string;
  select: string;
}

export interface StorefrontAddonCopy {
  selectedPlanEyebrow: string;
  selectedPlanTitle: string;
  selectedPlanSubtitle: string;
  selected: string;
  remove: string;
  removeFromSelectedPlan: (addonName: string) => string;
}

export const STOREFRONT_CALENDAR_COPY: LocalizedRecord<StorefrontCalendarCopy> = {
  en: {
    departureTitle: 'Select Departure Date & Runway Slot',
    departureSubtitle: 'Real-time cockpit availability • Choose a date and departure time',
    viewWeek: 'Week',
    viewMonth: 'Month',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    departureSlots: (date) => `Departure Slots for ${date}:`,
    selectedWindow: 'Selected Window:',
    maxAvailable: (minutes) => `Max ${minutes}m available`,
    checkNextDay: 'Check Next Day →',
    noSlots: (packageTitle, date) => `No open runway slots for ${packageTitle} on ${date}`,
    noSlotsHint: 'All departure windows for this duration are currently booked or reserved. Choose another date or try an available duration today:',
    tryFlight: (minutes, price) => `Try ${minutes}m (${price})`,
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    upToFit: (minutes) => `Up to ${minutes}m fit`,
    packagesAvailable: (date) => `Showing packages with available runway time on ${date}`,
    openSlotsCount: (count) => `${count} slots open`,
    jumpToTimes: 'Pick Time ↓',
    jumpToCheckout: 'Continue to Checkout ↓',
    customizeFlight: 'Packages & Add-ons ↓',
    chooseTrainingDuration: 'Choose Training Duration ↓',
    reviewFlightDetails: 'Review Flight Details ↓',
    basePackagePrice: 'Base package price',
    selectPackageTitle: 'Choose your flight package and duration',
    edition: 'Selected duration',
    minutes: (minutes) => `${minutes} min`,
    noSlotsToday: 'No open slots today',
    slotsOpenToday: (count) => `${count} slots open`,
    selected: 'Selected',
    select: 'Choose',
  },
  he: {
    departureTitle: 'בחירת תאריך המראה ומשבצת מסלול',
    departureSubtitle: 'זמינות תא טייס בזמן אמת • בחרו תאריך ושעת המראה',
    viewWeek: 'שבוע',
    viewMonth: 'חודש',
    previousMonth: 'החודש הקודם',
    nextMonth: 'החודש הבא',
    departureSlots: (date) => `משבצות המראה עבור ${date}:`,
    selectedWindow: 'חלון שנבחר:',
    maxAvailable: (minutes) => `עד ${minutes} דקות זמינות`,
    checkNextDay: 'בדיקת היום הבא ←',
    noSlots: (packageTitle, date) => `אין משבצות מסלול פנויות עבור ${packageTitle} בתאריך ${date}`,
    noSlotsHint: 'כל חלונות ההמראה למשך זה כבר תפוסים או שמורים. בחרו תאריך אחר או משך טיסה זמין להיום:',
    tryFlight: (minutes, price) => `נסו ${minutes} דקות (${price})`,
    morning: 'בוקר',
    afternoon: 'צהריים',
    evening: 'ערב',
    upToFit: (minutes) => `מתאים לעד ${minutes} דקות`,
    packagesAvailable: (date) => `הצגת חבילות עם זמן מסלול זמין בתאריך ${date}`,
    openSlotsCount: (count) => `${count} משבצות פנויות`,
    jumpToTimes: 'בחירת שעה ↓',
    jumpToCheckout: 'המשך לתשלום ↓',
    customizeFlight: 'חבילות ותוספות ↓',
    chooseTrainingDuration: 'בחירת משך אימון ↓',
    reviewFlightDetails: 'לפרטי הטיסה ↓',
    basePackagePrice: 'מחיר החבילה הבסיסית',
    selectPackageTitle: 'בחירת חבילת הטיסה ומשך הטיסה',
    edition: 'משך שנבחר',
    minutes: (minutes) => `${minutes} דק׳`,
    noSlotsToday: 'אין משבצות פנויות היום',
    slotsOpenToday: (count) => `${count} משבצות פנויות`,
    selected: 'נבחרה',
    select: 'לבחירה',
  },
  ru: {
    departureTitle: 'Выберите дату и время вылета',
    departureSubtitle: 'Доступность кабины в реальном времени • выберите дату и время вылета',
    viewWeek: 'Неделя',
    viewMonth: 'Месяц',
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    departureSlots: (date) => `Слоты вылета на ${date}:`,
    selectedWindow: 'Выбранное окно:',
    maxAvailable: (minutes) => `Доступно до ${minutes} мин.`,
    checkNextDay: 'Следующий день →',
    noSlots: (packageTitle, date) => `Нет свободных слотов для ${packageTitle} на ${date}`,
    noSlotsHint: 'Все окна вылета для этой длительности заняты или зарезервированы. Выберите другую дату или доступную длительность сегодня:',
    tryFlight: (minutes, price) => `Попробовать ${minutes} мин. (${price})`,
    morning: 'Утро',
    afternoon: 'День',
    evening: 'Вечер',
    upToFit: (minutes) => `Помещается до ${minutes} мин.`,
    packagesAvailable: (date) => `Пакеты с доступным временем на ${date}`,
    openSlotsCount: (count) => `${count} слотов свободно`,
    jumpToTimes: 'Выбрать время ↓',
    jumpToCheckout: 'Перейти к оплате ↓',
    customizeFlight: 'Пакеты и опции ↓',
    chooseTrainingDuration: 'Выбрать длительность подготовки ↓',
    reviewFlightDetails: 'Проверить детали полёта ↓',
    basePackagePrice: 'Цена базового пакета',
    selectPackageTitle: 'Выберите пакет и длительность полёта',
    edition: 'Выбранная длительность',
    minutes: (minutes) => `${minutes} мин.`,
    noSlotsToday: 'Сегодня нет свободных слотов',
    slotsOpenToday: (count) => `${count} слотов свободно`,
    selected: 'Выбрано',
    select: 'Выбрать',
  },
  fr: {
    departureTitle: 'Choisir la date et le créneau de départ',
    departureSubtitle: 'Disponibilités du cockpit en temps réel • choisissez une date et une heure de départ',
    viewWeek: 'Semaine',
    viewMonth: 'Mois',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    departureSlots: (date) => `Créneaux de départ pour le ${date} :`,
    selectedWindow: 'Créneau sélectionné :',
    maxAvailable: (minutes) => `Jusqu’à ${minutes} min disponibles`,
    checkNextDay: 'Jour suivant →',
    noSlots: (packageTitle, date) => `Aucun créneau de piste disponible pour ${packageTitle} le ${date}`,
    noSlotsHint: 'Tous les créneaux de cette durée sont réservés. Choisissez une autre date ou une durée disponible aujourd’hui :',
    tryFlight: (minutes, price) => `Essayer ${minutes} min (${price})`,
    morning: 'Matin',
    afternoon: 'Après-midi',
    evening: 'Soir',
    upToFit: (minutes) => `Jusqu’à ${minutes} min possibles`,
    packagesAvailable: (date) => `Forfaits avec temps de piste disponible le ${date}`,
    openSlotsCount: (count) => `${count} créneaux libres`,
    jumpToTimes: 'Choisir l’heure ↓',
    jumpToCheckout: 'Continuer vers le paiement ↓',
    customizeFlight: 'Forfaits et options ↓',
    chooseTrainingDuration: 'Choisir la durée de préparation ↓',
    reviewFlightDetails: 'Voir les détails du vol ↓',
    basePackagePrice: 'Prix de la formule de base',
    selectPackageTitle: 'Choisir votre formule et sa durée',
    edition: 'Durée sélectionnée',
    minutes: (minutes) => `${minutes} min`,
    noSlotsToday: 'Aucun créneau libre aujourd’hui',
    slotsOpenToday: (count) => `${count} créneaux libres`,
    selected: 'Sélectionné',
    select: 'Choisir',
  },
  ar: {
    departureTitle: 'اختر تاريخ وموعد الإقلاع',
    departureSubtitle: 'توفر قمرة القيادة في الوقت الفعلي • اختر التاريخ ووقت الإقلاع',
    viewWeek: 'أسبوع',
    viewMonth: 'الشهر',
    previousMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    departureSlots: (date) => `مواعيد الإقلاع ليوم ${date}:`,
    selectedWindow: 'النافذة المختارة:',
    maxAvailable: (minutes) => `متاح حتى ${minutes} دقيقة`,
    checkNextDay: 'فحص اليوم التالي ←',
    noSlots: (packageTitle, date) => `لا توجد مواعيد مسار متاحة لـ ${packageTitle} في ${date}`,
    noSlotsHint: 'جميع نوافذ الإقلاع لهذه المدة محجوزة أو محجوزة مسبقاً. اختر تاريخاً آخر أو مدة متاحة اليوم:',
    tryFlight: (minutes, price) => `جرّب ${minutes} دقيقة (${price})`,
    morning: 'صباح',
    afternoon: 'بعد الظهر',
    evening: 'مساء',
    upToFit: (minutes) => `يتسع حتى ${minutes} دقيقة`,
    packagesAvailable: (date) => `الباقات ذات وقت المسار المتاح في ${date}`,
    openSlotsCount: (count) => `${count} مواعيد متاحة`,
    jumpToTimes: 'اختر الوقت ↓',
    jumpToCheckout: 'المتابعة للدفع ↓',
    customizeFlight: 'الباقات والإضافات ↓',
    chooseTrainingDuration: 'اختيار مدة التدريب ↓',
    reviewFlightDetails: 'مراجعة تفاصيل الرحلة ↓',
    basePackagePrice: 'سعر الباقة الأساسية',
    selectPackageTitle: 'اختر باقة الرحلة ومدتها',
    edition: 'المدة المختارة',
    minutes: (minutes) => `${minutes} دقيقة`,
    noSlotsToday: 'لا توجد مواعيد متاحة اليوم',
    slotsOpenToday: (count) => `${count} مواعيد متاحة`,
    selected: 'تم الاختيار',
    select: 'اختيار',
  },
  de: {
    departureTitle: 'Abflugdatum & Zeitfenster wählen',
    departureSubtitle: 'Cockpit-Verfügbarkeit in Echtzeit • Wählen Sie Datum und Abflugzeit',
    viewWeek: 'Woche',
    viewMonth: 'Monat',
    previousMonth: 'Vorheriger Monat',
    nextMonth: 'Nächster Monat',
    departureSlots: (date) => `Abflugzeiten für ${date}:`,
    selectedWindow: 'Gewähltes Zeitfenster:',
    maxAvailable: (minutes) => `Max. ${minutes} Min. verfügbar`,
    checkNextDay: 'Nächsten Tag prüfen →',
    noSlots: (packageTitle, date) => `Keine freien Cockpit-Slots für ${packageTitle} am ${date}`,
    noSlotsHint: 'Alle Zeitfenster dieser Dauer sind aktuell gebucht oder reserviert. Wählen Sie ein anderes Datum oder eine heute verfügbare Flugdauer:',
    tryFlight: (minutes, price) => `${minutes} Min. testen (${price})`,
    morning: 'Vormittag',
    afternoon: 'Nachmittag',
    evening: 'Abend',
    upToFit: (minutes) => `Passend bis ${minutes} Min.`,
    packagesAvailable: (date) => `Pakete mit verfügbarer Cockpit-Zeit am ${date}`,
    openSlotsCount: (count) => `${count} Slots frei`,
    jumpToTimes: 'Zeit wählen ↓',
    jumpToCheckout: 'Weiter zur Kasse ↓',
    customizeFlight: 'Pakete & Extras ↓',
    chooseTrainingDuration: 'Trainingsdauer wählen ↓',
    reviewFlightDetails: 'Flugdetails prüfen ↓',
    basePackagePrice: 'Basis-Paketpreis',
    selectPackageTitle: 'Flugpaket und Dauer wählen',
    edition: 'Gewählte Dauer',
    minutes: (minutes) => `${minutes} Min.`,
    noSlotsToday: 'Heute keine freien Slots',
    slotsOpenToday: (count) => `${count} Slots frei`,
    selected: 'Ausgewählt',
    select: 'Wählen',
  },
};

export const STOREFRONT_ADDON_COPY: LocalizedRecord<StorefrontAddonCopy> = {
  en: {
    selectedPlanEyebrow: 'FLIGHT PLAN LOADED',
    selectedPlanTitle: 'Selected cockpit modules',
    selectedPlanSubtitle: 'These are included in your flight and itemized again in the checkout manifest.',
    selected: 'Selected',
    remove: 'Remove',
    removeFromSelectedPlan: (addonName) => `Remove ${addonName} from the selected flight plan`,
  },
  he: {
    selectedPlanEyebrow: 'תכנית הטיסה נטענה',
    selectedPlanTitle: 'מודולים שנבחרו לתא הטייס',
    selectedPlanSubtitle: 'אלה כלולים בטיסה שלכם ומופיעים שוב בפירוט ההזמנה לפני התשלום.',
    selected: 'נבחר',
    remove: 'הסרה',
    removeFromSelectedPlan: (addonName) => `הסרת ${addonName} מתכנית הטיסה שנבחרה`,
  },
  ru: {
    selectedPlanEyebrow: 'ПЛАН ПОЛЁТА ЗАГРУЖЕН',
    selectedPlanTitle: 'Выбранные модули кабины',
    selectedPlanSubtitle: 'Они включены в ваш полёт и снова показаны в составе заказа перед оплатой.',
    selected: 'Выбрано',
    remove: 'Удалить',
    removeFromSelectedPlan: (addonName) => `Удалить ${addonName} из выбранного плана полёта`,
  },
  fr: {
    selectedPlanEyebrow: 'PLAN DE VOL CHARGÉ',
    selectedPlanTitle: 'Modules de cockpit sélectionnés',
    selectedPlanSubtitle: 'Ils sont inclus dans votre vol et récapitulés dans le manifeste avant le paiement.',
    selected: 'Sélectionné',
    remove: 'Retirer',
    removeFromSelectedPlan: (addonName) => `Retirer ${addonName} du plan de vol sélectionné`,
  },
  ar: {
    selectedPlanEyebrow: 'تم تحميل خطة الرحلة',
    selectedPlanTitle: 'وحدات قمرة القيادة المختارة',
    selectedPlanSubtitle: 'هذه الوحدات مشمولة في رحلتك وتظهر مجدداً في ملخص الطلب قبل الدفع.',
    selected: 'تم الاختيار',
    remove: 'إزالة',
    removeFromSelectedPlan: (addonName) => `إزالة ${addonName} من خطة الرحلة المختارة`,
  },
  de: {
    selectedPlanEyebrow: 'FLUGPLAN GELADEN',
    selectedPlanTitle: 'Ausgewählte Cockpit-Module',
    selectedPlanSubtitle: 'Diese sind in Ihrem Flug enthalten und werden im Checkout-Manifest einzeln aufgeführt.',
    selected: 'Ausgewählt',
    remove: 'Entfernen',
    removeFromSelectedPlan: (addonName) => `${addonName} aus dem gewählten Flugplan entfernen`,
  },
};
