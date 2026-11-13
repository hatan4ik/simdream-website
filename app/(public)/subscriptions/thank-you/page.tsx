'use client';

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { CheckCircle2, Calendar, Phone, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language, LocalizedRecord } from '@/lib/i18n/translations';

interface ThankYouCopy {
  badge: string;
  title: string;
  subtitle: string;
  orderRefLabel: string;
  nextStepsTitle: string;
  step1: string;
  step2: string;
  step3: string;
  dashboardButton: string;
  calendarButton: string;
  dispatchNotice: string;
}

const THANK_YOU_COPY: LocalizedRecord<ThankYouCopy> = {
  he: {
    badge: 'הרכישה הושלמה',
    title: 'ברוכים הבאים למועדון הטיסה של Sim Dream!',
    subtitle:
      'מסלול הטיסה שלכם אושר בהצלחה. כל הטיסות הכלולות פעילות כעת, ואפשר לתאם אותן בבואינג 737 בקצב שלכם.',
    orderRefLabel: 'מספר ההזמנה',
    nextStepsTitle: 'השלבים הבאים לטיסה הראשונה',
    step1: 'פרטי ההזמנה והקבלה נשלחו לכתובת האימייל שלכם.',
    step2: 'באפשרותכם לתאם את הטיסה הראשונה ישירות ביומן או מול מחלקת המבצעים.',
    step3: 'בכל מפגש תיהנו מהדרכה אישית 1-על-1 עם קברניט פעיל בחברת תעופה.',
    dashboardButton: 'ללוח הבקרה שלי',
    calendarButton: 'לתיאום טיסה ביומן',
    dispatchNotice: 'זקוקים לעזרה או לתיאום מיוחד? מחלקת המבצעים עומדת לרשותכם.',
  },
  en: {
    badge: 'PURCHASE CONFIRMED',
    title: 'Welcome to the Sim Dream Flight Club!',
    subtitle:
      'Your Boeing 737 flight track is confirmed. Your included flights are active now, and you book each one whenever it suits you.',
    orderRefLabel: 'Order Reference',
    nextStepsTitle: 'Next Steps to Take Command',
    step1: 'Your confirmation and receipt have been sent to your email address.',
    step2: 'Schedule your first flight session directly via the calendar or with Dispatch.',
    step3: 'Every session includes 1-on-1 coaching with an active commercial airline captain.',
    dashboardButton: 'Go to Flight Deck',
    calendarButton: 'Open Flight Calendar',
    dispatchNotice: 'Need custom scheduling or assistance? Dispatch is on standby for you.',
  },
  ru: {
    badge: 'ПОКУПКА ПОДТВЕРЖДЕНА',
    title: 'Добро пожаловать в лётный клуб Sim Dream!',
    subtitle:
      'Ваша лётная программа на Boeing 737 подтверждена. Все включённые полёты активны, и вы бронируете каждый из них, когда вам удобно.',
    orderRefLabel: 'Номер заказа',
    nextStepsTitle: 'Следующие шаги для полётов',
    step1: 'Подтверждение и чек отправлены на вашу электронную почту.',
    step2: 'Вы можете забронировать первую сессию через календарь или диспетчера.',
    step3: 'Каждое занятие проходит один на один с действующим капитаном авиалиний.',
    dashboardButton: 'В личный кабинет',
    calendarButton: 'Открыть расписание',
    dispatchNotice: 'Нужна помощь с расписанием? Диспетчер всегда на связи.',
  },
  fr: {
    badge: 'ACHAT CONFIRMÉ',
    title: 'Bienvenue au Club des Commandants Sim Dream !',
    subtitle:
      'Votre parcours de vol Boeing 737 est confirmé. Vos vols inclus sont actifs dès maintenant et vous réservez chacun d’eux quand cela vous convient.',
    orderRefLabel: 'Référence de commande',
    nextStepsTitle: 'Prochaines étapes pour planifier vos vols',
    step1: 'Votre confirmation et votre reçu ont été envoyés par e-mail.',
    step2: 'Planifiez votre première séance directement sur le calendrier ou avec le Dispatch.',
    step3: 'Chaque séance comprend un coaching 1-sur-1 avec un commandant de ligne actif.',
    dashboardButton: 'Accéder à mon espace',
    calendarButton: 'Consulter le calendrier',
    dispatchNotice: 'Besoin d’aide ou d’un créneau sur mesure ? Le Dispatch est à votre écoute.',
  },
  ar: {
    badge: 'تم تأكيد الشراء',
    title: 'أهلاً بكم في نادي طيران Sim Dream!',
    subtitle:
      'تم تأكيد مسار طيرانكم على بوينغ 737. رحلاتكم المشمولة مفعلة الآن، وتحجزون كل واحدة منها في الوقت الذي يناسبكم.',
    orderRefLabel: 'رقم مرجع الطلب',
    nextStepsTitle: 'الخطوات التالية لخوض التجربة',
    step1: 'أُرسلت تفاصيل الطلب والإيصال إلى بريدكم الإلكتروني.',
    step2: 'يمكنكم حجز الجلسة الأولى عبر التقويم مباشرة أو بالتنسيق مع قسم العمليات.',
    step3: 'تتضمن كل جلسة تدريباً فردياً 1-على-1 مع كابتن خطوط جوية نشط.',
    dashboardButton: 'لوحة التحكم',
    calendarButton: 'فتح تقويم الطيران',
    dispatchNotice: 'هل تحتاجون لمساعدة في الجدولة؟ قسم العمليات في خدمتكم دائماً.',
  },
  de: {
    badge: 'KAUF BESTÄTIGT',
    title: 'Willkommen im Sim Dream Flight Club!',
    subtitle:
      'Ihr Boeing 737 Flugprogramm ist bestätigt. Ihre enthaltenen Flüge sind ab sofort aktiv und Sie buchen jeden Flug flexibel nach Ihrem Zeitplan.',
    orderRefLabel: 'Bestellnummer',
    nextStepsTitle: 'Nächste Schritte ins Cockpit',
    step1: 'Ihre Bestätigung und der Zahlungsbeleg wurden an Ihre E-Mail-Adresse gesendet.',
    step2: 'Vereinbaren Sie Ihre erste Flugsession direkt über den Kalender oder über unsere Disposition.',
    step3: 'Jede Session beinhaltet ein 1-zu-1-Coaching mit einem aktiven Verkehrspiloten.',
    dashboardButton: 'Zum Flight Deck',
    calendarButton: 'Flugkalender öffnen',
    dispatchNotice: 'Benötigen Sie individuelle Terminhilfe? Unser Dispatch ist für Sie da.',
  },
};

function ThankYouContent() {
  const searchParams = useSearchParams();
  const { language, isRTL } = useLanguage();
  const copy = THANK_YOU_COPY[language] || THANK_YOU_COPY.en;
  const planOrderId = searchParams.get('planOrderId') || searchParams.get('orderId');

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignored if canvas unsupported
    }
  }, []);

  return (
    <div className="flex-1 w-full min-w-0 py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
          <CheckCircle2 className="h-8 w-8 text-sky-400" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{copy.badge}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {copy.title}
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
          {copy.subtitle}
        </p>
      </div>

      {planOrderId && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
          <span className="text-xs text-slate-400 block mb-1">{copy.orderRefLabel}</span>
          <span className="font-mono text-sm sm:text-base font-bold text-sky-400" dir="ltr">
            {planOrderId}
          </span>
        </div>
      )}

      {/* Next Steps Box */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950 p-6 sm:p-8 space-y-6">
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-sky-400" />
          <span>{copy.nextStepsTitle}</span>
        </h2>

        <ul className="space-y-4 text-xs sm:text-sm text-slate-300">
          <li className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-400 font-mono text-xs font-bold">
              1
            </span>
            <span className="leading-snug">{copy.step1}</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-400 font-mono text-xs font-bold">
              2
            </span>
            <span className="leading-snug">{copy.step2}</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-400 font-mono text-xs font-bold">
              3
            </span>
            <span className="leading-snug">{copy.step3}</span>
          </li>
        </ul>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <Link href="/dashboard" className="flex-1">
            <Button variant="primary" className="w-full">
              <span>{copy.dashboardButton}</span>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </Link>
          <Link href="/book" className="flex-1">
            <Button variant="outline" className="w-full">
              <Calendar className="w-4 h-4" />
              <span>{copy.calendarButton}</span>
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        {copy.dispatchNotice}{' '}
        <Link href="/contact" className="text-sky-400 underline hover:text-sky-300">
          Sim Dream Dispatch
        </Link>
      </p>
    </div>
  );
}

export default function SubscriptionThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading confirmation...
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
