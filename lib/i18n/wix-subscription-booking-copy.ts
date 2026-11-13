import type { Language, LocalizedRecord } from './translations';

interface WixSubscriptionBookingCopy {
  eyebrow: string;
  title: string;
  description: string;
  checkoutLabel: string;
  memberRequired: string;
  noEligiblePlan: string;
  unavailable: string;
  checkoutFailed: string;
}

export const WIX_SUBSCRIPTION_BOOKING_COPY: LocalizedRecord<WixSubscriptionBookingCopy> = {
  en: {
    eyebrow: 'WIX SUBSCRIPTION REDEMPTION',
    title: 'This flight is covered by your active subscription.',
    description: 'Choose a live slot and continue to Wix Bookings. Wix verifies your member account and consumes one included session; add-ons and vouchers are not part of this redemption.',
    checkoutLabel: 'Redeem subscription in Wix Bookings',
    memberRequired: 'Sign in to the Wix member account that owns this subscription before redeeming a flight.',
    noEligiblePlan: 'No active Wix subscription covers this flight duration. Return to your subscription flight deck and choose an included session.',
    unavailable: 'That departure is no longer available. Choose another live slot.',
    checkoutFailed: 'We could not open Wix Bookings. Please try again.',
  },
  he: {
    eyebrow: 'מימוש מנוי WIX',
    title: 'הטיסה הזו כלולה במנוי הפעיל שלכם.',
    description: 'בחרו מועד פנוי והמשיכו ל־Wix Bookings. Wix מאמת את חשבון החבר ומממש טיסה כלולה אחת; תוספות ושוברים אינם חלק מהמימוש הזה.',
    checkoutLabel: 'מימוש המנוי ב־Wix Bookings',
    memberRequired: 'יש להתחבר לחשבון חבר Wix שבו נמצא המנוי לפני מימוש הטיסה.',
    noEligiblePlan: 'אין מנוי Wix פעיל הכולל משך טיסה זה. חזרו ללוח המנויים ובחרו טיסה הכלולה במנוי.',
    unavailable: 'המועד הזה כבר אינו פנוי. בחרו מועד פנוי אחר.',
    checkoutFailed: 'לא ניתן היה לפתוח את Wix Bookings. נסו שוב.',
  },
  ru: {
    eyebrow: 'ИСПОЛЬЗОВАНИЕ ПОДПИСКИ WIX',
    title: 'Этот полёт входит в вашу активную подписку.',
    description: 'Выберите доступное время и перейдите в Wix Bookings. Wix проверит аккаунт участника и спишет один включённый сеанс; дополнения и ваучеры в это использование не входят.',
    checkoutLabel: 'Использовать подписку в Wix Bookings',
    memberRequired: 'Войдите в аккаунт Wix, которому принадлежит эта подписка, прежде чем использовать полёт.',
    noEligiblePlan: 'Нет активной подписки Wix для такой длительности полёта. Вернитесь в кабинет подписки и выберите включённый сеанс.',
    unavailable: 'Это время уже недоступно. Выберите другое доступное время.',
    checkoutFailed: 'Не удалось открыть Wix Bookings. Попробуйте ещё раз.',
  },
  fr: {
    eyebrow: 'UTILISATION D’ABONNEMENT WIX',
    title: 'Ce vol est couvert par votre abonnement actif.',
    description: 'Choisissez un créneau disponible et poursuivez dans Wix Bookings. Wix vérifie votre compte membre et utilise une séance incluse ; les options et bons ne font pas partie de cette utilisation.',
    checkoutLabel: 'Utiliser l’abonnement dans Wix Bookings',
    memberRequired: 'Connectez-vous au compte membre Wix qui possède cet abonnement avant d’utiliser un vol.',
    noEligiblePlan: 'Aucun abonnement Wix actif ne couvre cette durée de vol. Retournez à votre espace abonnement et choisissez une séance incluse.',
    unavailable: 'Ce créneau n’est plus disponible. Choisissez un autre créneau.',
    checkoutFailed: 'Impossible d’ouvrir Wix Bookings. Veuillez réessayer.',
  },
  ar: {
    eyebrow: 'استخدام اشتراك WIX',
    title: 'هذه الرحلة مشمولة في اشتراككم النشط.',
    description: 'اختاروا موعدًا متاحًا وتابعوا إلى Wix Bookings. يتحقق Wix من حساب العضو ويستخدم جلسة مشمولة واحدة؛ الإضافات والقسائم ليست جزءًا من هذا الاستخدام.',
    checkoutLabel: 'استخدام الاشتراك في Wix Bookings',
    memberRequired: 'سجّلوا الدخول إلى حساب عضو Wix الذي يملك هذا الاشتراك قبل استخدام الرحلة.',
    noEligiblePlan: 'لا يوجد اشتراك Wix نشط يغطي مدة هذه الرحلة. عودوا إلى منصة الاشتراك واختاروا جلسة مشمولة.',
    unavailable: 'هذا الموعد لم يعد متاحًا. اختاروا موعدًا متاحًا آخر.',
    checkoutFailed: 'تعذر فتح Wix Bookings. يرجى المحاولة مرة أخرى.',
  },
  de: {
    eyebrow: 'WIX-ABO EINLÖSEN',
    title: 'Dieser Flug ist durch Ihr aktives Flugprogramm abgedeckt.',
    description:
      'Wählen Sie ein freies Zeitfenster und fahren Sie mit Wix Bookings fort. Wix prüft Ihr Mitgliedskonto und löst eine enthaltene Session ein; Extras und Gutscheine sind nicht Teil dieser Einlösung.',
    checkoutLabel: 'Flugprogramm in Wix Bookings einlösen',
    memberRequired:
      'Melden Sie sich zuerst bei dem Wix-Mitgliedskonto an, dem dieses Flugprogramm gehört.',
    noEligiblePlan:
      'Kein aktives Wix-Flugprogramm deckt diese Flugdauer ab. Kehren Sie zu Ihrer Flugprogramm-Übersicht zurück und wählen Sie eine enthaltene Session.',
    unavailable: 'Dieser Termin ist nicht mehr verfügbar. Wählen Sie ein anderes freies Zeitfenster.',
    checkoutFailed: 'Wix Bookings konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.',
  },
};
