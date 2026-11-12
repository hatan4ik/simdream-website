import type { Language } from '@/lib/i18n/translations';
import type { RefundEmailCopy } from './refund-copy-types';

/**
 * The acknowledgement email, in the customer's language. Kept apart from the form copy so the
 * server (which sends the email) never bundles the form strings. Placeholders: {reference},
 * {name}, {days}.
 */
export const REFUND_EMAIL_COPY: Record<Language, RefundEmailCopy> = {
  en: {
    subject: 'Your Sim Dream refund request {reference}',
    greeting: 'Hello {name},',
    received: 'We received your refund request.',
    referenceLabel: 'Your reference',
    next: 'A member of the team will check it against the refund rules and reply by email or phone. The rules allow up to {days} days to reply to a written request. This message is an acknowledgement, not a decision.',
    rulesLabel: 'Refund rules',
    footer: 'Sim Dream LTD',
  },
  he: {
    subject: 'בקשת ההחזר שלכם ל-Sim Dream {reference}',
    greeting: 'שלום {name},',
    received: 'קיבלנו את בקשת ההחזר הכספי שלכם.',
    referenceLabel: 'מספר הבקשה שלכם',
    next: 'נציג מהצוות יבדוק אותה מול כללי ההחזרים ויחזור אליכם במייל או בטלפון. התקנון מאפשר עד {days} ימים למענה על פנייה בכתב. הודעה זו היא אישור קבלה, לא החלטה.',
    rulesLabel: 'כללי ההחזרים',
    footer: 'Sim Dream LTD',
  },
  ru: {
    subject: 'Ваш запрос на возврат в Sim Dream {reference}',
    greeting: 'Здравствуйте, {name}!',
    received: 'Мы получили ваш запрос на возврат.',
    referenceLabel: 'Ваш номер запроса',
    next: 'Сотрудник команды сверит его с правилами возврата и ответит по email или по телефону. Правила отводят до {days} дн. на ответ на письменное обращение. Это сообщение подтверждает получение и не является решением.',
    rulesLabel: 'Правила возврата',
    footer: 'Sim Dream LTD',
  },
  fr: {
    subject: 'Votre demande de remboursement Sim Dream {reference}',
    greeting: 'Bonjour {name},',
    received: 'Nous avons bien reçu votre demande de remboursement.',
    referenceLabel: 'Votre référence',
    next: 'Un membre de l’équipe la comparera aux règles de remboursement et vous répondra par e-mail ou par téléphone. Le règlement prévoit jusqu’à {days} jours pour répondre à une demande écrite. Ce message est un accusé de réception, pas une décision.',
    rulesLabel: 'Règles de remboursement',
    footer: 'Sim Dream LTD',
  },
  ar: {
    subject: 'طلب الاسترداد الخاص بكم لدى Sim Dream {reference}',
    greeting: 'مرحبًا {name}،',
    received: 'استلمنا طلب الاسترداد الخاص بكم.',
    referenceLabel: 'الرقم المرجعي لطلبكم',
    next: 'سيطابقه أحد أفراد الفريق مع قواعد الاسترداد ويردّ عليكم عبر البريد الإلكتروني أو الهاتف. تتيح اللوائح مدة تصل إلى {days} يومًا للرد على طلب مكتوب. هذه الرسالة إشعار باستلام الطلب وليست قرارًا.',
    rulesLabel: 'قواعد الاسترداد',
    footer: 'Sim Dream LTD',
  },
  es: {
    subject: 'Su solicitud de reembolso de Sim Dream {reference}',
    greeting: 'Hola, {name}:',
    received: 'Hemos recibido su solicitud de reembolso.',
    referenceLabel: 'Su referencia',
    next: 'Una persona del equipo la comparará con las normas de reembolso y le responderá por correo o por teléfono. Las normas permiten hasta {days} días para responder a una solicitud por escrito. Este mensaje es un acuse de recibo, no una decisión.',
    rulesLabel: 'Normas de reembolso',
    footer: 'Sim Dream LTD',
  },
};
