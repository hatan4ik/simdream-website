import type { ConsentCategory } from '@/lib/consent';
import type { Language } from '@/lib/i18n/translations';

/**
 * Copy for the cookie banner and settings dialog, in all six languages. Plain descriptions of what
 * this site really stores today (docs/modules/cookie-consent.md, Findings); nothing here is legal
 * text, and the wording that would change the day a tracker is added is marked in that document.
 * The "Cookie settings" label lives in link-label.ts so the footer does not load this file.
 */
export interface ConsentStoredItemCopy {
  title: string;
  description: string;
}

export interface ConsentCopy {
  /** Accessible name of the banner region. */
  bannerLabel: string;
  /** Informational notice (no optional category in use). */
  noticeBody: string;
  /** Real choice (an optional category is in use). */
  choiceTitle: string;
  choiceBody: string;
  gotIt: string;
  acceptAll: string;
  rejectNonEssential: string;
  customize: string;
  privacyPolicy: string;
  dialogTitle: string;
  dialogIntroNotice: string;
  dialogIntroChoice: string;
  close: string;
  save: string;
  alwaysOn: string;
  on: string;
  off: string;
  notUsed: string;
  storedHeading: string;
  categories: Record<ConsentCategory, { title: string; description: string }>;
  /** The inventory shown under "Necessary": what is stored, where, and by whom. */
  storedItems: readonly ConsentStoredItemCopy[];
}

export const CONSENT_COPY: Record<Language, ConsentCopy> = {
  en: {
    bannerLabel: 'Cookies and privacy',
    noticeBody:
      'This site adds no advertising or analytics cookies and does not track you across websites. It stores only what it needs to work: your language and display choices on this device, and the cookies our booking, payment and sign-in providers set on their own pages.',
    choiceTitle: 'Your cookie choices',
    choiceBody:
      'We use storage that is necessary to run the site, and optional storage that you can allow or refuse. You can change your choice at any time from Cookie settings.',
    gotIt: 'Got it',
    acceptAll: 'Accept all',
    rejectNonEssential: 'Reject non-essential',
    customize: 'Customize',
    privacyPolicy: 'Privacy policy',
    dialogTitle: 'Cookie settings',
    dialogIntroNotice:
      'This is everything the site stores on your device and why. No optional category is in use, so there is nothing to switch on or off.',
    dialogIntroChoice: 'Choose which optional storage you allow. Necessary storage is always on. You can change this at any time.',
    close: 'Close',
    save: 'Save choices',
    alwaysOn: 'Always on',
    on: 'On',
    off: 'Off',
    notUsed: 'Not used on this site',
    storedHeading: 'What is stored',
    categories: {
      necessary: { title: 'Necessary', description: 'Needed for the site to work and to be secure. It cannot be switched off.' },
      preferences: { title: 'Preferences', description: 'Remembers choices such as your language and display style between visits.' },
      analytics: { title: 'Analytics', description: 'Measures how the site is used so that we can improve it.' },
      marketing: { title: 'Marketing', description: 'Shows or measures advertising, on this site or elsewhere.' },
    },
    storedItems: [
      {
        title: 'Language and display choice',
        description:
          "Your language and theme, kept in your browser's local storage on this device. It is not a cookie and it does not identify you. Clear it in your browser settings at any time.",
      },
      {
        title: 'Sign-in and booking session',
        description:
          'Kept only for the open browser tab (session storage) while you sign in or complete a booking, and gone when you close the tab.',
      },
      {
        title: 'Booking, payment and sign-in providers',
        description:
          'When you sign in or pay, Wix and our payment provider set the cookies they need on their own pages to keep those steps secure.',
      },
      {
        title: 'Map on the contact page',
        description: 'The contact page embeds a Google map. Google receives your IP address when it loads and may set its own cookies.',
      },
    ],
  },
  he: {
    bannerLabel: 'עוגיות ופרטיות',
    noticeBody:
      'האתר אינו מוסיף עוגיות פרסום או סטטיסטיקה ואינו עוקב אחריך בין אתרים. הוא שומר רק את מה שנחוץ לפעולתו: בחירת השפה והתצוגה שלך במכשיר זה, והעוגיות שספקי ההזמנה, התשלום וההתחברות שלנו קובעים בעמודים שלהם.',
    choiceTitle: 'בחירות העוגיות שלך',
    choiceBody:
      'אנו משתמשים באחסון הנחוץ להפעלת האתר, ובאחסון אופציונלי שאפשר לאשר או לסרב לו. אפשר לשנות את הבחירה בכל עת דרך ״הגדרות עוגיות״.',
    gotIt: 'הבנתי',
    acceptAll: 'אישור הכול',
    rejectNonEssential: 'דחיית עוגיות לא הכרחיות',
    customize: 'התאמה אישית',
    privacyPolicy: 'מדיניות פרטיות',
    dialogTitle: 'הגדרות עוגיות',
    dialogIntroNotice: 'זה כל מה שהאתר שומר במכשיר שלך, ולמה. אף קטגוריה אופציונלית אינה בשימוש, ולכן אין מה להפעיל או לכבות.',
    dialogIntroChoice: 'בחרו איזה אחסון אופציונלי להתיר. אחסון הכרחי פועל תמיד. אפשר לשנות זאת בכל עת.',
    close: 'סגירה',
    save: 'שמירת הבחירות',
    alwaysOn: 'פעיל תמיד',
    on: 'פועל',
    off: 'כבוי',
    notUsed: 'לא בשימוש באתר',
    storedHeading: 'מה נשמר',
    categories: {
      necessary: { title: 'הכרחי', description: 'נחוץ לפעולת האתר ולאבטחתו. לא ניתן לכבות.' },
      preferences: { title: 'העדפות', description: 'זוכר בחירות כמו שפה וסגנון תצוגה בין ביקורים.' },
      analytics: { title: 'סטטיסטיקה', description: 'מודד כיצד משתמשים באתר כדי שנוכל לשפר אותו.' },
      marketing: { title: 'שיווק', description: 'מציג או מודד פרסום, באתר זה או באתרים אחרים.' },
    },
    storedItems: [
      {
        title: 'בחירת שפה ותצוגה',
        description:
          'השפה וערכת הנושא שלך נשמרות באחסון המקומי של הדפדפן במכשיר זה. זו אינה עוגייה והיא אינה מזהה אותך. אפשר למחוק אותה בהגדרות הדפדפן בכל עת.',
      },
      {
        title: 'התחברות והזמנה',
        description: 'נשמר רק עבור לשונית הדפדפן הפתוחה (אחסון סשן) בזמן התחברות או השלמת הזמנה, ונמחק עם סגירת הלשונית.',
      },
      {
        title: 'ספקי הזמנה, תשלום והתחברות',
        description: 'בעת התחברות או תשלום, Wix וספק התשלום שלנו קובעים בעמודים שלהם את העוגיות הנחוצות לאבטחת השלבים האלה.',
      },
      {
        title: 'המפה בעמוד יצירת הקשר',
        description: 'עמוד יצירת הקשר מטמיע מפת Google. Google מקבלת את כתובת ה-IP שלך בעת הטעינה ועשויה לקבוע עוגיות משלה.',
      },
    ],
  },
  ru: {
    bannerLabel: 'Файлы cookie и конфиденциальность',
    noticeBody:
      'Этот сайт не добавляет рекламные и аналитические файлы cookie и не отслеживает вас на других сайтах. Он хранит только то, что нужно для работы: ваш выбор языка и оформления на этом устройстве и файлы cookie, которые наши провайдеры бронирования, оплаты и входа устанавливают на своих страницах.',
    choiceTitle: 'Ваш выбор по файлам cookie',
    choiceBody:
      'Мы используем хранилище, необходимое для работы сайта, и необязательное хранилище, которое вы можете разрешить или отклонить. Выбор можно изменить в любой момент в «Настройках cookie».',
    gotIt: 'Понятно',
    acceptAll: 'Принять все',
    rejectNonEssential: 'Отклонить необязательные',
    customize: 'Настроить',
    privacyPolicy: 'Политика конфиденциальности',
    dialogTitle: 'Настройки cookie',
    dialogIntroNotice:
      'Здесь всё, что сайт хранит на вашем устройстве, и зачем. Необязательные категории не используются, поэтому включать и отключать нечего.',
    dialogIntroChoice:
      'Выберите, какое необязательное хранилище разрешить. Необходимое хранилище включено всегда. Выбор можно изменить в любой момент.',
    close: 'Закрыть',
    save: 'Сохранить выбор',
    alwaysOn: 'Всегда включено',
    on: 'Вкл.',
    off: 'Выкл.',
    notUsed: 'На сайте не используется',
    storedHeading: 'Что хранится',
    categories: {
      necessary: { title: 'Необходимые', description: 'Нужны для работы и безопасности сайта. Отключить их нельзя.' },
      preferences: { title: 'Предпочтения', description: 'Запоминают ваш выбор, например язык и оформление, между посещениями.' },
      analytics: { title: 'Аналитика', description: 'Измеряет, как используется сайт, чтобы мы могли его улучшать.' },
      marketing: { title: 'Маркетинг', description: 'Показывает или измеряет рекламу на этом сайте или на других.' },
    },
    storedItems: [
      {
        title: 'Выбор языка и оформления',
        description:
          'Ваш язык и тема хранятся в локальном хранилище браузера на этом устройстве. Это не файл cookie, и он не идентифицирует вас. Удалить его можно в настройках браузера в любой момент.',
      },
      {
        title: 'Сессия входа и бронирования',
        description:
          'Хранится только для открытой вкладки браузера (хранилище сессии) во время входа или оформления бронирования и удаляется при закрытии вкладки.',
      },
      {
        title: 'Провайдеры бронирования, оплаты и входа',
        description:
          'При входе или оплате Wix и наш платёжный провайдер устанавливают на своих страницах файлы cookie, необходимые для безопасности этих шагов.',
      },
      {
        title: 'Карта на странице контактов',
        description:
          'На странице контактов встроена карта Google. Google получает ваш IP-адрес при загрузке и может установить собственные файлы cookie.',
      },
    ],
  },
  fr: {
    bannerLabel: 'Cookies et confidentialité',
    noticeBody:
      "Ce site n'ajoute aucun cookie publicitaire ni d'analyse et ne vous suit pas d'un site à l'autre. Il ne conserve que ce qui est nécessaire à son fonctionnement : votre choix de langue et d'affichage sur cet appareil, et les cookies que nos prestataires de réservation, de paiement et de connexion déposent sur leurs propres pages.",
    choiceTitle: 'Vos choix en matière de cookies',
    choiceBody:
      'Nous utilisons un stockage nécessaire au fonctionnement du site et un stockage facultatif que vous pouvez autoriser ou refuser. Vous pouvez modifier votre choix à tout moment dans « Paramètres des cookies ».',
    gotIt: 'Compris',
    acceptAll: 'Tout accepter',
    rejectNonEssential: 'Refuser les non essentiels',
    customize: 'Personnaliser',
    privacyPolicy: 'Politique de confidentialité',
    dialogTitle: 'Paramètres des cookies',
    dialogIntroNotice:
      "Voici tout ce que le site conserve sur votre appareil et pourquoi. Aucune catégorie facultative n'est utilisée : il n'y a donc rien à activer ou à désactiver.",
    dialogIntroChoice:
      'Choisissez le stockage facultatif que vous autorisez. Le stockage nécessaire est toujours actif. Vous pouvez le modifier à tout moment.',
    close: 'Fermer',
    save: 'Enregistrer mes choix',
    alwaysOn: 'Toujours actif',
    on: 'Activé',
    off: 'Désactivé',
    notUsed: 'Non utilisé sur ce site',
    storedHeading: 'Ce qui est conservé',
    categories: {
      necessary: { title: 'Nécessaires', description: 'Indispensables au fonctionnement et à la sécurité du site. Ils ne peuvent pas être désactivés.' },
      preferences: { title: 'Préférences', description: "Mémorisent vos choix, comme la langue et le style d'affichage, d'une visite à l'autre." },
      analytics: { title: "Mesure d'audience", description: "Mesure l'utilisation du site afin que nous puissions l'améliorer." },
      marketing: { title: 'Marketing', description: 'Affiche ou mesure de la publicité, sur ce site ou ailleurs.' },
    },
    storedItems: [
      {
        title: "Choix de langue et d'affichage",
        description:
          "Votre langue et votre thème sont conservés dans le stockage local de votre navigateur, sur cet appareil. Ce n'est pas un cookie et cela ne vous identifie pas. Vous pouvez l'effacer à tout moment dans les réglages du navigateur.",
      },
      {
        title: 'Session de connexion et de réservation',
        description:
          "Conservée uniquement pour l'onglet ouvert (stockage de session) pendant la connexion ou la réservation, puis supprimée à la fermeture de l'onglet.",
      },
      {
        title: 'Prestataires de réservation, de paiement et de connexion',
        description:
          'Lorsque vous vous connectez ou payez, Wix et notre prestataire de paiement déposent sur leurs propres pages les cookies nécessaires à la sécurité de ces étapes.',
      },
      {
        title: 'Carte de la page contact',
        description: 'La page contact intègre une carte Google. Google reçoit votre adresse IP au chargement et peut déposer ses propres cookies.',
      },
    ],
  },
  ar: {
    bannerLabel: 'ملفات تعريف الارتباط والخصوصية',
    noticeBody:
      'لا يضيف هذا الموقع ملفات تعريف ارتباط للإعلانات أو للتحليلات ولا يتتبعك عبر المواقع. إنه يخزّن فقط ما يلزم لعمله: اختيارك للغة والمظهر على هذا الجهاز، وملفات تعريف الارتباط التي يضعها مزوّدو الحجز والدفع وتسجيل الدخول لدينا في صفحاتهم.',
    choiceTitle: 'خياراتك لملفات تعريف الارتباط',
    choiceBody:
      'نستخدم تخزينًا ضروريًا لتشغيل الموقع، وتخزينًا اختياريًا يمكنك السماح به أو رفضه. يمكنك تغيير اختيارك في أي وقت من «إعدادات ملفات تعريف الارتباط».',
    gotIt: 'حسنًا، فهمت',
    acceptAll: 'قبول الكل',
    rejectNonEssential: 'رفض غير الضروري',
    customize: 'تخصيص',
    privacyPolicy: 'سياسة الخصوصية',
    dialogTitle: 'إعدادات ملفات تعريف الارتباط',
    dialogIntroNotice: 'هذا كل ما يخزّنه الموقع على جهازك ولماذا. لا توجد فئة اختيارية قيد الاستخدام، لذا لا شيء لتفعيله أو تعطيله.',
    dialogIntroChoice: 'اختر أي تخزين اختياري تسمح به. التخزين الضروري يعمل دائمًا. يمكنك تغيير ذلك في أي وقت.',
    close: 'إغلاق',
    save: 'حفظ الخيارات',
    alwaysOn: 'مفعّل دائمًا',
    on: 'مفعّل',
    off: 'معطّل',
    notUsed: 'غير مستخدم في هذا الموقع',
    storedHeading: 'ما الذي يُخزَّن',
    categories: {
      necessary: { title: 'ضروري', description: 'مطلوب لعمل الموقع وأمانه. لا يمكن تعطيله.' },
      preferences: { title: 'التفضيلات', description: 'يتذكر خياراتك مثل اللغة ونمط العرض بين الزيارات.' },
      analytics: { title: 'التحليلات', description: 'يقيس كيفية استخدام الموقع لنتمكن من تحسينه.' },
      marketing: { title: 'التسويق', description: 'يعرض الإعلانات أو يقيسها، في هذا الموقع أو في مواقع أخرى.' },
    },
    storedItems: [
      {
        title: 'اختيار اللغة والمظهر',
        description:
          'تُحفظ لغتك ونمط العرض في التخزين المحلي للمتصفح على هذا الجهاز. وهو ليس ملف تعريف ارتباط ولا يحدد هويتك. يمكنك مسحه من إعدادات المتصفح في أي وقت.',
      },
      {
        title: 'جلسة تسجيل الدخول والحجز',
        description: 'تُحفظ فقط لعلامة تبويب المتصفح المفتوحة (تخزين الجلسة) أثناء تسجيل الدخول أو إتمام الحجز، وتُحذف عند إغلاق علامة التبويب.',
      },
      {
        title: 'مزوّدو الحجز والدفع وتسجيل الدخول',
        description: 'عند تسجيل الدخول أو الدفع، تضع Wix ومزوّد الدفع لدينا في صفحاتهما ملفات تعريف الارتباط اللازمة لتأمين هذه الخطوات.',
      },
      {
        title: 'الخريطة في صفحة التواصل',
        description: 'تتضمن صفحة التواصل خريطة Google. تستلم Google عنوان IP الخاص بك عند تحميلها وقد تضع ملفات تعريف ارتباط خاصة بها.',
      },
    ],
  },
  es: {
    bannerLabel: 'Cookies y privacidad',
    noticeBody:
      'Este sitio no añade cookies publicitarias ni de analítica y no le sigue entre sitios web. Solo guarda lo necesario para funcionar: su elección de idioma y de aspecto en este dispositivo, y las cookies que nuestros proveedores de reservas, pago e inicio de sesión establecen en sus propias páginas.',
    choiceTitle: 'Sus opciones de cookies',
    choiceBody:
      'Usamos almacenamiento necesario para que el sitio funcione y almacenamiento opcional que puede permitir o rechazar. Puede cambiar su elección en cualquier momento desde «Configuración de cookies».',
    gotIt: 'Entendido',
    acceptAll: 'Aceptar todo',
    rejectNonEssential: 'Rechazar las no esenciales',
    customize: 'Personalizar',
    privacyPolicy: 'Política de privacidad',
    dialogTitle: 'Configuración de cookies',
    dialogIntroNotice:
      'Esto es todo lo que el sitio guarda en su dispositivo y por qué. No se usa ninguna categoría opcional, así que no hay nada que activar o desactivar.',
    dialogIntroChoice:
      'Elija qué almacenamiento opcional permite. El almacenamiento necesario siempre está activo. Puede cambiarlo en cualquier momento.',
    close: 'Cerrar',
    save: 'Guardar mis opciones',
    alwaysOn: 'Siempre activo',
    on: 'Activado',
    off: 'Desactivado',
    notUsed: 'No se usa en este sitio',
    storedHeading: 'Qué se guarda',
    categories: {
      necessary: { title: 'Necesarias', description: 'Imprescindibles para que el sitio funcione y sea seguro. No se pueden desactivar.' },
      preferences: { title: 'Preferencias', description: 'Recuerdan sus elecciones, como el idioma y el aspecto, entre visitas.' },
      analytics: { title: 'Analítica', description: 'Mide cómo se usa el sitio para que podamos mejorarlo.' },
      marketing: { title: 'Marketing', description: 'Muestra o mide publicidad, en este sitio o en otros.' },
    },
    storedItems: [
      {
        title: 'Idioma y aspecto',
        description:
          'Su idioma y su tema se guardan en el almacenamiento local de su navegador, en este dispositivo. No es una cookie y no le identifica. Puede borrarlo en los ajustes del navegador en cualquier momento.',
      },
      {
        title: 'Sesión de inicio de sesión y reserva',
        description:
          'Se conserva solo para la pestaña abierta (almacenamiento de sesión) mientras inicia sesión o completa una reserva, y desaparece al cerrar la pestaña.',
      },
      {
        title: 'Proveedores de reservas, pago e inicio de sesión',
        description:
          'Cuando inicia sesión o paga, Wix y nuestro proveedor de pago establecen en sus propias páginas las cookies necesarias para la seguridad de esos pasos.',
      },
      {
        title: 'Mapa de la página de contacto',
        description: 'La página de contacto incluye un mapa de Google. Google recibe su dirección IP al cargarlo y puede establecer sus propias cookies.',
      },
    ],
  },
  de: {
    bannerLabel: 'Cookies und Datenschutz',
    noticeBody:
      'Diese Website setzt keine Werbe- oder Analyse-Cookies und verfolgt Sie nicht über andere Websites hinweg. Sie speichert nur das Nötigste für den Betrieb: Ihre Sprach- und Darstellungseinstellungen auf diesem Gerät sowie Cookies, die unsere Buchungs-, Zahlungs- und Login-Anbieter auf ihren eigenen Seiten setzen.',
    choiceTitle: 'Ihre Cookie-Einstellungen',
    choiceBody:
      'Wir verwenden Speicher, der für den Betrieb der Website erforderlich ist, sowie optionalen Speicher, den Sie zulassen oder ablehnen können. Sie können Ihre Auswahl jederzeit über die „Cookie-Einstellungen“ ändern.',
    gotIt: 'Verstanden',
    acceptAll: 'Alle akzeptieren',
    rejectNonEssential: 'Nur notwendige',
    customize: 'Anpassen',
    privacyPolicy: 'Datenschutzerklärung',
    dialogTitle: 'Cookie-Einstellungen',
    dialogIntroNotice:
      'Dies ist alles, was die Website auf Ihrem Gerät speichert und warum. Es wird keine optionale Kategorie verwendet, daher muss nichts ein- oder ausgeschaltet werden.',
    dialogIntroChoice:
      'Wählen Sie, welche optionalen Speicher Sie zulassen möchten. Notwendiger Speicher ist immer aktiv. Sie können dies jederzeit ändern.',
    close: 'Schließen',
    save: 'Auswahl speichern',
    alwaysOn: 'Immer aktiv',
    on: 'Ein',
    off: 'Aus',
    notUsed: 'Auf dieser Website nicht verwendet',
    storedHeading: 'Was gespeichert wird',
    categories: {
      necessary: { title: 'Notwendig', description: 'Für den Betrieb und die Sicherheit der Website erforderlich. Kann nicht deaktiviert werden.' },
      preferences: { title: 'Präferenzen', description: 'Merkt sich Einstellungen wie Ihre Sprache und das Design zwischen Besuchen.' },
      analytics: { title: 'Analyse', description: 'Misst die Nutzung der Website, damit wir sie verbessern können.' },
      marketing: { title: 'Marketing', description: 'Zeigt oder misst Werbung auf dieser Website oder anderswo.' },
    },
    storedItems: [
      {
        title: 'Sprach- und Darstellungsauswahl',
        description:
          'Ihre Sprache und Ihr Design werden im lokalen Speicher Ihres Browsers auf diesem Gerät gespeichert. Es ist kein Cookie und identifiziert Sie nicht. Sie können es jederzeit in den Browsereinstellungen löschen.',
      },
      {
        title: 'Anmelde- und Buchungssitzung',
        description:
          'Wird nur für den geöffneten Browser-Tab (Session Storage) gespeichert, während Sie sich anmelden oder eine Buchung abschließen, und beim Schließen des Tabs gelöscht.',
      },
      {
        title: 'Buchungs-, Zahlungs- und Login-Anbieter',
        description:
          'Wenn Sie sich anmelden oder bezahlen, setzen Wix und unser Zahlungsanbieter auf ihren eigenen Seiten die Cookies, die für die Sicherheit dieser Schritte erforderlich sind.',
      },
      {
        title: 'Karte auf der Kontaktseite',
        description: 'Die Kontaktseite bettet eine Google-Karte ein. Google erhält beim Laden Ihre IP-Adresse und kann eigene Cookies setzen.',
      },
    ],
  },
};
