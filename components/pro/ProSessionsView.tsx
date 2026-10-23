'use client';

import React from 'react';
import Link from 'next/link';
import {
  Plane,
  Clock,
  Award,
  CheckCircle2,
  ArrowRight,
  Compass,
  ShieldCheck,
  Gauge,
  Users,
  Radio,
  Sparkles,
} from 'lucide-react';
import { getLocalizedPackages } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

export function ProSessionsView() {
  const { language, isRTL } = useLanguage();
  const isHe = language === 'he';

  // Pull all PRO Training packages (60 PRO, 90 PRO, 120 PRO)
  const proPackages = getLocalizedPackages(language).filter((p) => p.category === 'training');

  const proModules = isHe
    ? [
        {
          icon: Gauge,
          title: 'הטסת Raw Data ידנית (ללא Flight Director)',
          desc: 'תרגול מדויק של טבלאות Pitch & Thrust, שמירת גובה ומהירות בפניות 45°, היחלצות מהזדקרות ועבודת אוויר לפי דרישות בוחני חברות התעופה.',
        },
        {
          icon: Compass,
          title: 'גישות מכשירים: ILS, RNAV ו-RNP-AR',
          desc: 'הזנת תוכנית טיסה מלאה ב-FMS/CDU, תהליכי יציאה והצטרפות (SID/STAR), מעגלי המתנה (Holdings) והנמכות מכשירים בראות מוגבלת ורוחות צד.',
        },
        {
          icon: ShieldCheck,
          title: 'תקלת מנוע ב-V1 (V1 Cut) ונהלי QRH',
          desc: 'תרגול אובדן מנוע בהמראה, שמירת ציר מסלול, גישת ILS במנוע בודד (Single-Engine ILS), הליכה סביב (Go-Around) וחלוקת עבודה בצוות (PF/PM).',
        },
        {
          icon: Users,
          title: 'גמישות צוותית: מדריך כ-PM או צוות של 2 טייסים',
          desc: 'מדריך הסימולטור יכול לתפקד כקצין ראשון (PM/PNF) או לפנות את המושב הימני לטייס שותף / מדריך אישי מטעמכם לאימון MCC מלא.',
        },
      ]
    : [
        {
          icon: Gauge,
          title: 'Raw Data Manual Flight (Flight Director OFF)',
          desc: 'Master Boeing 737 pitch-and-thrust power tables, steep 45° bank turns, altitude/airspeed tolerances, and stall recovery to strict airline checkride standards.',
        },
        {
          icon: Compass,
          title: 'Precision & Non-Precision IFR (ILS, RNAV, RNP-AR)',
          desc: 'Full FMS/CDU route initialization, SID/STAR transitions, published holding patterns, and raw-data ILS & LOC/DME approaches in low-visibility crosswinds.',
        },
        {
          icon: ShieldCheck,
          title: 'V1 Engine Failure (V1 Cut) & QRH Abnormal Flows',
          desc: 'Engine failure at takeoff decision speed, rudder trim discipline, Single-Engine ILS approach, single-engine go-around, and structured QRH checklist execution.',
        },
        {
          icon: Users,
          title: 'Flexible Crew Seat: Instructor as PM or Bring Your Partner',
          desc: 'Our instructor can serve as your Pilot Monitoring (PM) or cede the right seat to your crew partner or personal flight examiner for two-crew training.',
        },
      ];

  return (
    <main className="flex-1 py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* 1. PRO SESSIONS HERO */}
      <section className="text-center max-w-4xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-xs font-mono text-amber-300 font-bold">
          <Award className="w-4 h-4 text-amber-400" />
          <span>
            {isHe
              ? 'חבילות PRO מקצועיות לטייסים ומועמדים לחברות תעופה • 60 / 90 / 120 דקות'
              : 'PRO PILOT TRAINING & AIRLINE INTERVIEW PREP • 60 / 90 / 120 MIN'}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          {isHe
            ? 'אימוני PRO והכנה למבדקי סימולטור בחברות תעופה'
            : 'PRO Sessions — Professional Pilot Training & Airline Assessment Prep'}
        </h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          {isHe
            ? 'מיועד לטייסים בעלי רישיון (PPL / CPL / ATPL), בוגרי קורסי טיס ומועמדים למיוני קבלה בחברות תעופה (אל על, ישראייר, ארקיע וחברות אירופאיות). תרגול גישות מכשירים, הטסת Raw Data ותקלות מנוע בתא טייס בואינג 737 MAX בקנה מידה 1:1.'
            : 'Engineered for licensed pilots (PPL / CPL / ATPL), cadets, and airline applicants preparing for simulator screening evaluations (El Al, Arkia, Israir, Ryanair, Wizz Air & European carriers). Train in a 1:1 scale Boeing 737 MAX flight deck with instant IOS approach resets.'}
        </p>
      </section>

      {/* 2. PRO TRAINING PACKAGES GRID (60 PRO, 90 PRO, 120 PRO) */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <Badge variant="amber">
              {isHe ? 'בלוקים מקצועיים להזמנה ישירה' : 'OFFICIAL PRO TRAINING TIERS'}
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2">
              {isHe ? 'בחרו את חבילת ה-PRO שלכם (60 / 90 / 120 דקות)' : 'Select Your PRO Training Block'}
            </h2>
          </div>
          <Link href="/experiences" className="text-xs font-mono text-sky-400 hover:underline">
            {isHe
              ? 'מחפשים חבילת חוויה או מתנה לקהל הרחב? לחצו כאן ←'
              : 'Looking for Recreational & Gift Flight Packages? View Standard Packages →'}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {proPackages.map((pkg) => (
            <Card
              key={pkg.id}
              glow={pkg.featured}
              borderAccent={pkg.featured ? 'amber' : 'sky'}
              className="flex flex-col justify-between relative overflow-hidden"
            >
              {pkg.badge && (
                <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                  <Badge variant={pkg.featured ? 'amber' : 'sky'}>{pkg.badge}</Badge>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {pkg.durationMinutes} {isHe ? 'דקות אימון PRO נטו' : 'MINUTES PRO SIMULATOR BLOCK'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white">{pkg.title}</h3>
                </div>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{pkg.description}</p>

                {/* Price Box */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-white font-mono">
                        {formatCurrency(pkg.priceIls)}
                      </span>
                      <span className="text-xs text-slate-400 font-mono ml-1 rtl:mr-1">
                        {isHe ? '/ סשן PRO' : '/ PRO session'}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">~${pkg.priceUsd} USD</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2.5 text-[11px] text-emerald-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" />
                      <span>{isHe ? 'עמדת IOS לאיפוס גישות מיידי' : 'Instant IOS Approach Resets'}</span>
                    </span>
                  </div>
                </div>

                {/* Syllabus Highlights */}
                <div className="space-y-2">
                  <p className="text-[11px] font-mono uppercase text-amber-300 font-bold">
                    {isHe ? 'סילבוס ודגשי האימון:' : 'PRO Syllabus & Included Profiles:'}
                  </p>
                  <ul className="space-y-2 text-xs text-slate-200">
                    {pkg.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Direct Booking Launch */}
              <div className="pt-8 mt-auto">
                <Link href={`/book?package=${pkg.slug}`}>
                  <Button
                    variant={pkg.featured ? 'primary' : 'secondary'}
                    className={`w-full font-bold justify-between ${
                      pkg.featured
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300'
                        : ''
                    }`}
                  >
                    <span>
                      {isHe
                        ? `הזמנת ${pkg.title} (${formatCurrency(pkg.priceIls)})`
                        : `Book ${pkg.title} (${formatCurrency(pkg.priceIls)})`}
                    </span>
                    <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 3. CORE TRAINING MODULES FOR PILOTS */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <Badge variant="sky">{isHe ? 'מתודולוגיית אימון PRO' : 'AIRLINE CHECKRIDE METHODOLOGY'}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {isHe ? 'מה מתרגלים בסשן PRO?' : 'What You Will Train in Your PRO Session'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {proModules.map((mod, i) => {
            const IconComp = mod.icon;
            return (
              <Card key={i} borderAccent="sky" className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <IconComp className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">{mod.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{mod.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. BOTTOM BRIDGE TO ABOUT & B2B WORKSHOPS */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left rtl:md:text-right">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-400 font-bold uppercase">
            <Sparkles className="w-4 h-4" />
            <span>{isHe ? 'רוצים להכיר את המרכז או לתאם סדנת מנהלים?' : 'EXPLORE MORE AT SIM DREAM TEL AVIV'}</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            {isHe
              ? 'קראו אודות חווית הטיסה שלנו או הזמינו סדנת CRM לצוותי הנהלה'
              : 'Learn About Our Center or Inquire About B2B Corporate CRM Workshops'}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link href="/about">
            <Button variant="secondary" size="sm">
              <span>{isHe ? 'אודות Sim Dream ומפרט כללי' : 'About Us & Facility Specs'}</span>
            </Button>
          </Link>
          <Link href="/workshops">
            <Button variant="outline" size="sm">
              <span>{isHe ? 'סדנאות CRM לחברות (B2B)' : 'Corporate CRM Workshops (B2B)'}</span>
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}

