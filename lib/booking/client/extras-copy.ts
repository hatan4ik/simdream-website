import type { SupportedLanguage } from '@/lib/i18n/translations';

/**
 * Checkout strings that neither `lib/legal` (consent) nor `lib/discounts/birthday` (birthday offer) own:
 * the new-tab hint for links, and the honest wording for the paths where the birthday offer is not applied.
 * Six languages, resolved with `copy[language] || copy.en`, never by text direction.
 * NEEDS OWNER REVIEW: the two birthday notices describe what each checkout path really does
 * (docs/modules/checkout-consent-birthday.md, section 3).
 */
export interface CheckoutExtrasCopy {
  /** Screen-reader suffix of a link that opens in a new tab, so the booking draft stays in this tab. */
  opensInNewTab: string;
  /** A valid date that would qualify, on a package that cannot carry the offer (no stacking, category). */
  birthdayNotApplicable: string;
  /** The bare Discounted Promotion is picked: the offer cannot stack on it. */
  birthdayPromoPicked: string;
  /** The Wix-hosted checkout: the offer cannot be applied automatically, the day and month go to the team. */
  birthdayWixNotice: string;
  /** A flight-track redemption: no offer, and the date is not stored anywhere. */
  birthdayNotStored: string;
}

export const CHECKOUT_EXTRAS_COPY: Record<SupportedLanguage, CheckoutExtrasCopy> = {
  en: {
    opensInNewTab: 'opens in a new tab',
    birthdayNotApplicable: 'The birthday discount does not apply to this booking.',
    birthdayPromoPicked: 'You already picked the Discounted Promotion, so the birthday discount cannot be added. Add a cockpit upgrade to move up to a full flight and it applies.',
    birthdayWixNotice:
      'The birthday discount cannot be applied automatically in this checkout. Your day and month are passed to our team with the order.',
    birthdayNotStored:
      'A flight-track session carries no birthday discount, so this date of birth is only checked and is not stored.',
  },
  he: {
    opensInNewTab: 'נפתח בלשונית חדשה',
    birthdayNotApplicable: 'הנחת יום ההולדת אינה חלה על הזמנה זו.',
    birthdayPromoPicked: 'כבר בחרתם בחבילת המבצע המוזל, ולכן אי אפשר להוסיף את הנחת יום ההולדת. הוסיפו שדרוג תא טייס כדי לעבור לטיסה מלאה והנחה תחול.',
    birthdayWixNotice:
      'לא ניתן להחיל את הנחת יום ההולדת אוטומטית בתשלום הזה. היום והחודש שלך מועברים לצוות שלנו יחד עם ההזמנה.',
    birthdayNotStored:
      'מימוש סשן ממסלול טיסות אינו כולל הנחת יום הולדת, ולכן תאריך הלידה נבדק בלבד ואינו נשמר.',
  },
  ru: {
    opensInNewTab: 'открывается в новой вкладке',
    birthdayNotApplicable: 'Скидка ко дню рождения не распространяется на это бронирование.',
    birthdayPromoPicked: 'Вы уже выбрали акционный пакет со скидкой, поэтому скидка ко дню рождения не добавляется. Добавьте апгрейд кабины, чтобы перейти на полноценный полёт, и скидка применится.',
    birthdayWixNotice:
      'Скидка ко дню рождения не может быть применена автоматически при этой оплате. День и месяц передаются нашей команде вместе с заказом.',
    birthdayNotStored:
      'Занятие из пакета полетов не дает скидки ко дню рождения, поэтому дата рождения только проверяется и не сохраняется.',
  },
  fr: {
    opensInNewTab: 's’ouvre dans un nouvel onglet',
    birthdayNotApplicable: 'La remise anniversaire ne s’applique pas à cette réservation.',
    birthdayPromoPicked: 'Vous avez déjà choisi l’offre promotionnelle, la remise anniversaire ne peut donc pas s’y ajouter. Ajoutez une option de cockpit pour passer à un vol complet et elle s’appliquera.',
    birthdayWixNotice:
      'La remise anniversaire ne peut pas être appliquée automatiquement dans ce paiement. Votre jour et votre mois sont transmis à notre équipe avec la commande.',
    birthdayNotStored:
      'Une séance d’un forfait de vols ne donne pas droit à la remise anniversaire : la date de naissance est seulement vérifiée et n’est pas conservée.',
  },
  ar: {
    opensInNewTab: 'يفتح في علامة تبويب جديدة',
    birthdayNotApplicable: 'لا ينطبق خصم عيد الميلاد على هذا الحجز.',
    birthdayPromoPicked: 'لقد اخترت بالفعل باقة العرض المخفَّض، لذلك لا يمكن إضافة خصم عيد الميلاد. أضف ترقية لمقصورة القيادة للانتقال إلى رحلة كاملة وسيُطبَّق الخصم.',
    birthdayWixNotice:
      'لا يمكن تطبيق خصم عيد الميلاد تلقائيًا في عملية الدفع هذه. يُرسَل يوم ميلادك وشهره إلى فريقنا مع الطلب.',
    birthdayNotStored:
      'جلسة من باقة الرحلات لا تتضمن خصم عيد الميلاد، لذلك يُتحقق من تاريخ الميلاد فقط ولا يُحفظ.',
  },
  es: {
    opensInNewTab: 'se abre en una pestaña nueva',
    birthdayNotApplicable: 'El descuento de cumpleaños no se aplica a esta reserva.',
    birthdayPromoPicked: 'Ya elegiste la promoción con descuento, así que no se puede añadir el descuento de cumpleaños. Añade una mejora de cabina para pasar a un vuelo completo y se aplicará.',
    birthdayWixNotice:
      'El descuento de cumpleaños no se puede aplicar automáticamente en este pago. Tu día y mes se envían a nuestro equipo junto con el pedido.',
    birthdayNotStored:
      'Una sesión de un bono de vuelos no incluye descuento de cumpleaños, por lo que la fecha de nacimiento solo se comprueba y no se guarda.',
  },
  de: {
    opensInNewTab: 'öffnet in einem neuen Tab',
    birthdayNotApplicable: 'Der Geburtstagsrabatt gilt für diese Buchung nicht.',
    birthdayPromoPicked: 'Sie haben bereits das Aktionsangebot gewählt, daher kann der Geburtstagsrabatt nicht hinzukommen. Fügen Sie ein Cockpit-Upgrade hinzu, um auf einen vollen Flug zu wechseln, dann gilt er.',
    birthdayWixNotice:
      'Der Geburtstagsrabatt kann in diesem Checkout nicht automatisch angewendet werden. Ihr Tag und Monat werden zusammen mit der Bestellung an unser Team übermittelt.',
    birthdayNotStored:
      'Eine Session aus einem Flugprogramm beinhaltet keinen Geburtstagsrabatt; das Geburtsdatum wird daher nur geprüft und nicht gespeichert.',
  },
};

export function getCheckoutExtrasCopy(language: string): CheckoutExtrasCopy {
  return CHECKOUT_EXTRAS_COPY[language as SupportedLanguage] ?? CHECKOUT_EXTRAS_COPY.en;
}
