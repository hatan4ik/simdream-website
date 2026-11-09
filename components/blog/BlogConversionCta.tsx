import React from 'react';
import Link from 'next/link';
import { Plane, Award, Gift, Compass, HeartPulse, ArrowLeft } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandLogo';
import { buttonClassName } from '@/components/ui/Button';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import type { BlogCtaTarget } from '@/lib/data/blog-posts';

interface BlogConversionCtaProps {
  target: BlogCtaTarget;
}

interface CtaConfig {
  badge: string;
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const CTA_MAP: Record<BlogCtaTarget, CtaConfig> = {
  pro: {
    badge: 'הכשרת טייסים מקצועית',
    title: 'מתכוננים לראיון בחברת תעופה? התאמנו ב-Boeing 737 אמיתי',
    description:
      'הדרכה 1 על 1 עם קברניטי חברות תעופה פעילים, תרגול תקלות מנוע V1, גישות מורכבות ו-Raw Data Flying בסימולטור מסחרי מדויק.',
    buttonLabel: 'צפו במסלולי ההכנה PRO',
    href: '/pro',
    icon: Award,
    accentColor: 'from-sky-950/40 border-sky-500/40 text-sky-400',
  },
  experiences: {
    badge: 'אתגרי טיסה בינלאומיים',
    title: 'רוצים לחוות נחיתה בקאי טאק, אינסברוק או פארו?',
    description:
      'קחו פיקוד על 70 טון של מטוסי בואינג 737 בלמעלה מ-24,000 שדות תעופה בעולם עם מזג אוויר חי או קיצוני, בליווי קברניט אישי.',
    buttonLabel: 'גלו את נתיבי העולם',
    href: '/experiences#world-routes',
    icon: Compass,
    accentColor: 'from-orange-950/40 border-orange-500/40 text-orange-400',
  },
  vouchers: {
    badge: 'מתנה בלתי נשכחת',
    title: 'מחפשים מתנה מיוחדת ליום הולדת, דייט או יום נישואין?',
    description:
      'העניקו שובר טיסה יוקרתי או גיפט קארד דיגיטלי מעוצב לתא הטייס של בואינג 737. תקף ל-12 חודשים עם תיאום מועד גמיש.',
    buttonLabel: 'הזמנת שובר מתנה עכשיו',
    href: '/vouchers',
    icon: Gift,
    accentColor: 'from-amber-950/40 border-amber-500/40 text-amber-400',
  },
  fear_of_flying: {
    badge: 'התמודדות עם חרדת טיסה',
    title: 'רוצים לעלות לטיסה הבאה שלכם ברוגע וביטחון מלא?',
    description:
      'קורס ייחודי 1-על-1 בתא הטייס יחד עם קברניט מנוסה: הבנת כל רעש, תנודה ומערכת בטיחות במטוס עד לפירוק החשש.',
    buttonLabel: 'למידע על סדנת פחד טיסה',
    href: '/fear-of-flying',
    icon: HeartPulse,
    accentColor: 'from-emerald-950/40 border-emerald-500/40 text-emerald-400',
  },
  general_booking: {
    badge: 'חוויית פיקוד מלאה',
    title: 'הגשימו חלום: הטיסו בואינג 737 אמיתי בלב תל אביב',
    description:
      'חוויית טיסה סוחפת ומלאה של 60 דקות עם קברניט צמוד. אפס ניסיון קודם נדרש – רק תשוקה להמריא.',
    buttonLabel: 'הזמנת טיסה ביומן',
    href: '/book?package=pkg-captain-60',
    icon: Plane,
    accentColor: 'from-sky-950/40 border-sky-500/40 text-sky-400',
  },
};

export function BlogConversionCta({ target }: BlogConversionCtaProps) {
  const cta = CTA_MAP[target] ?? CTA_MAP.general_booking;
  const Icon = cta.icon;

  return (
    <aside
      aria-label={cta.title}
      className={`my-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-br ${cta.accentColor} to-slate-950 border shadow-2xl relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-slate-900/80 border border-slate-700/60 mb-3">
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{cta.badge}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-2">
            {cta.title}
          </h3>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {cta.description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
          <Link
            href={cta.href}
            className={buttonClassName('primary', 'lg')}
          >
            <BrandMark className="w-5 h-5 shrink-0" />
            <span>{cta.buttonLabel}</span>
            <ArrowLeft className="w-4 h-4 shrink-0" />
          </Link>
          <a
            href={FACILITY_INFO.contact.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName('secondary', 'md')}
          >
            <span>לייעוץ ישיר ב-WhatsApp</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
