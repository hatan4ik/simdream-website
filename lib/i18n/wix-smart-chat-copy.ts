import type { Language } from './translations';

/** Copy for the custom headless UI backed by Wix AI Site-Chat. */
export const WIX_SMART_CHAT_COPY: Record<Language, {
  launcher: string;
  title: string;
  status: string;
  greeting: string;
  placeholder: string;
  send: string;
  close: string;
  loading: string;
  unavailable: string;
  retry: string;
}> = {
  en: {
    launcher: 'Open Wix Smart Chat',
    title: 'Sim Dream Smart Chat',
    status: 'Powered by Wix AI Site-Chat',
    greeting: 'Ask about a flight, a subscription, availability, or preparing for an airline interview.',
    placeholder: 'Type your question…',
    send: 'Send message',
    close: 'Close chat',
    loading: 'Connecting to the Sim Dream assistant…',
    unavailable: 'Smart Chat is not available right now. Please try again shortly or use our contact page.',
    retry: 'Retry',
  },
  he: {
    launcher: 'פתיחת הצ׳אט החכם של Wix',
    title: 'הצ׳אט החכם של Sim Dream',
    status: 'מופעל באמצעות Wix AI Site-Chat',
    greeting: 'אפשר לשאול על טיסה, מנוי, זמינות או הכנה לראיון חברת תעופה.',
    placeholder: 'כתבו את השאלה שלכם…',
    send: 'שליחת הודעה',
    close: 'סגירת הצ׳אט',
    loading: 'מתחברים לעוזר של Sim Dream…',
    unavailable: 'הצ׳אט החכם אינו זמין כרגע. נסו שוב בקרוב או עברו לעמוד יצירת הקשר.',
    retry: 'ניסיון חוזר',
  },
  ru: {
    launcher: 'Открыть Wix Smart Chat',
    title: 'Умный чат Sim Dream',
    status: 'Работает на Wix AI Site-Chat',
    greeting: 'Спросите о полёте, подписке, доступности сеансов или подготовке к интервью в авиакомпании.',
    placeholder: 'Введите ваш вопрос…',
    send: 'Отправить сообщение',
    close: 'Закрыть чат',
    loading: 'Подключаемся к помощнику Sim Dream…',
    unavailable: 'Умный чат сейчас недоступен. Попробуйте позже или воспользуйтесь страницей контактов.',
    retry: 'Повторить',
  },
  fr: {
    launcher: 'Ouvrir le chat intelligent Wix',
    title: 'Chat intelligent Sim Dream',
    status: 'Propulsé par Wix AI Site-Chat',
    greeting: 'Posez une question sur un vol, un abonnement, les disponibilités ou la préparation à un entretien de compagnie aérienne.',
    placeholder: 'Saisissez votre question…',
    send: 'Envoyer le message',
    close: 'Fermer le chat',
    loading: 'Connexion à l’assistant Sim Dream…',
    unavailable: 'Le chat intelligent est indisponible pour le moment. Réessayez bientôt ou utilisez notre page de contact.',
    retry: 'Réessayer',
  },
  ar: {
    launcher: 'فتح دردشة Wix الذكية',
    title: 'دردشة Sim Dream الذكية',
    status: 'مدعومة من Wix AI Site-Chat',
    greeting: 'اسأل عن رحلة أو اشتراك أو المواعيد المتاحة أو الاستعداد لمقابلة في شركة طيران.',
    placeholder: 'اكتب سؤالك…',
    send: 'إرسال الرسالة',
    close: 'إغلاق الدردشة',
    loading: 'جارٍ الاتصال بمساعد Sim Dream…',
    unavailable: 'الدردشة الذكية غير متاحة حالياً. حاول مرة أخرى قريباً أو استخدم صفحة التواصل.',
    retry: 'إعادة المحاولة',
  },
};
