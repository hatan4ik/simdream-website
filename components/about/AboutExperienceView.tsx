'use client';

import React from 'react';
import Link from 'next/link';
import {
  Plane,
  UserCheck,
  Globe,
  Sparkles,
  Users,
  ShieldCheck,
  Clock,
  MapPin,
  Award,
  ArrowRight,
  ChevronDown,
  Compass,
  HeartHandshake,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/i18n/language-context';
import { FACILITY_INFO } from '@/lib/config/facility-info';

export function AboutExperienceView() {
  const { t, language, isRTL } = useLanguage();
  const isHe = language === 'he';

  const missionSteps = isHe
    ? [
        {
          step: '01',
          title: 'תדריך קברניט אישי (Pre-Flight Briefing)',
          desc: 'מתיישבים במושב הקברניט (מושב שמאל) לצד מדריך טיסה מוסמך. בוחרים יחד את שדות התעופה בעולם, תנאי מזג האוויר (יום, שקיעה או סערה) ופרופיל המשימה המותאם לגיל ולרמת הניסיון שלכם.',
          badge: 'מותאם אישית 1-על-1',
        },
        {
          step: '02',
          title: 'דחף מנועים והמראה (Takeoff & Climb)',
          desc: 'מקבלים אישור המראה ממגדל הפיקוח, דוחפים את מצערות המנועים קדימה, חשים את האצת המטוס על המסלול מול תצוגה פנורמית היקפית של 220° ומבצעים רוטציה והמראה לשחקים.',
          badge: 'שליטה מלאה בידיים שלכם',
        },
        {
          step: '03',
          title: 'נחיתות אייקוניות ברחבי העולם (World Approaches)',
          desc: 'מטיסים את הבואינג 737 אל נחיתות מרהיבות בנתב״ג, סנט מארטן מעל החוף, אינסברוק בין הרי האלפים, ניו יורק JFK, טוקיו או דובאי – עם אפשרות לתרגל רוחות צד ותקלות מרתקות.',
          badge: '45,000+ שדות תעופה',
        },
        {
          step: '04',
          title: 'אורחים בתא הטייס ותחקיר סיום (Jumpseat & Debrief)',
          desc: 'עד 2 מלווים (בני משפחה או חברים) יושבים איתכם בתוך הקוקפיט ללא תוספת תשלום, מצלמים רגעים בלתי נשכחים ומסיימים עם סיכום טיסה מקצועי.',
          badge: 'עד 2 מלווים חינם',
        },
      ]
    : [
        {
          step: '01',
          title: 'Personal Captain’s Briefing (Pre-Flight)',
          desc: 'Take the Left Seat (Captain’s position) alongside your personal commercial pilot instructor. Together you select your departure and arrival airports, time of day, weather conditions, and flight plan tailored to your goals.',
          badge: '1-on-1 Pilot Guidance',
        },
        {
          step: '02',
          title: 'Thrust Set & Takeoff Roll',
          desc: 'Advance the dual thrust levers, track the runway centerline across the 220° wrap-around horizon, rotate at V-speed, and climb out under full manual control.',
          badge: 'Hands-On Flight Control',
        },
        {
          step: '03',
          title: 'Iconic World Approaches & Weather Challenges',
          desc: 'Fly thrilling approaches into Ben Gurion (TLV), St. Maarten Maho Beach, Innsbruck Alps, Madeira, JFK, or Hong Kong Kai Tak — in clear skies, golden sunset, or dramatic crosswinds.',
          badge: '45,000+ Global Airports',
        },
        {
          step: '04',
          title: 'Cockpit Jumpseat Guests & Post-Flight Debrief',
          desc: 'Bring up to 2 family members or friends inside the cockpit observer seats free of charge to share the excitement, take photos & videos, and celebrate your landing.',
          badge: 'Up to 2 Guests Free',
        },
      ];

  const audienceProfiles = isHe
    ? [
        {
          icon: Users,
          accent: 'sky' as const,
          title: 'חוויה ראשונה, משפחות ונוער (מגיל 10+)',
          desc: 'אין צורך בשום ניסיון קודם! המדריך מלווה אתכם צעד אחר צעד. מתאים לילדים ובני נוער מגיל 10 ומעלה (גילאי 10–15 בליווי מבוגר), ימי הולדת, בר/בת מצווה ומתנות בלתי נשכחות.',
        },
        {
          icon: Compass,
          accent: 'emerald' as const,
          title: 'חובבי תעופה וטייסים מתלמדים',
          desc: 'תרגול נהלי תא טייס, גישות מכשירים (ILS / RNAV), התמודדות עם מזג אוויר קיצוני והכנה למבדקי מיון לחברות תעופה בסביבה מדויקת בקנה מידה 1:1.',
        },
        {
          icon: HeartHandshake,
          accent: 'amber' as const,
          title: 'התגברות על חרדת טיסה (Fearless Flying)',
          desc: 'מפגש רגוע ומעצים בגובה העיניים שבו מבינים כיצד מטוס נוסעים מתמודד עם כיסי אוויר, מה משמעות הקולות בתא הטייס וכיצד מערכות הגיבוי שומרות על בטיחות הטיסה.',
        },
        {
          icon: Briefcase,
          accent: 'purple' as const,
          title: 'סדנאות מנהלים וגיבוש צוותים (Corporate CRM)',
          desc: 'סדנאות מנהיגות וקבלת החלטות תחת לחץ המבוססות על מתודולוגיית Crew Resource Management מעולם התעופה המסחרית – אידיאלי לצוותי הנהלה והייטק.',
        },
      ]
    : [
        {
          icon: Users,
          accent: 'sky' as const,
          title: 'First-Time Flyers, Families & Youth (Age 10+)',
          desc: 'Zero prior flying experience needed. Your instructor adapts every moment to your pace. Ideal for ages 10+ (ages 10–15 accompanied by an adult), birthdays, Bar/Bat Mitzvahs, and unforgettable gifts.',
        },
        {
          icon: Compass,
          accent: 'emerald' as const,
          title: 'Aviation Enthusiasts & Student Pilots',
          desc: 'Practice real airline flows, ILS & RNAV instrument approaches, challenging crosswind landings, and airline simulator assessment preparation in an authentic 1:1 flight deck.',
        },
        {
          icon: HeartHandshake,
          accent: 'amber' as const,
          title: 'Fear of Flying Relief (Fearless Flying)',
          desc: 'Demystify turbulence, aircraft sounds, and redundant safety systems in a calm, supportive session guided by an experienced pilot who puts you in control.',
        },
        {
          icon: Briefcase,
          accent: 'purple' as const,
          title: 'Executive Leadership & Corporate CRM Teams',
          desc: 'Action-packed Crew Resource Management (CRM) workshops translating airline cockpit communication, workload delegation, and crisis decision-making to business leadership.',
        },
      ];

  return (
    <main className="flex-1 py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* 1. HERO: ABOUT SIM DREAM ISRAEL & THE FLIGHT EXPERIENCE */}
      <section className="text-center max-w-4xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-xs font-mono text-sky-400">
          <Plane className="w-3.5 h-3.5 -rotate-45" />
          <span>
            {isHe
              ? 'אודות סים דרים ישראל • חווית הטסה בקנה מידה 1:1 בתל אביב'
              : 'ABOUT SIM DREAM ISRAEL • TEL AVIV FLIGHT EXPERIENCE CENTER'}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          {isHe
            ? 'הגשמת חלום הטיסה בלב תל אביב – אתם במושב הקברניט'
            : 'Where Aviation Dreams Take Flight in the Heart of Tel Aviv'}
        </h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          {isHe
            ? 'מרכז Sim Dream (מערכות הדמיה סימולטורים ישראל סיםדרים בע״מ, גרשון ש"ץ 36 תל אביב) הוקם כדי לפתוח את דלת תא הטייס של מטוס הנוסעים הפופולרי בעולם – בואינג 737 – לקהל הרחב, למשפחות, לחובבי תעופה ולצוותי הנהלה, בליווי אישי של טייסים ומדריכים מנוסים.'
            : 'Founded in central Tel Aviv (Gershon Shatz 36), Sim Dream Israel opens the locked cockpit door of the world’s iconic commercial airliner — the Boeing 737 — to first-time flyers, families, aviation lovers, and corporate teams under 1-on-1 commercial pilot guidance.'}
        </p>

        {/* Key Trust Pillars Strip */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300">
            <Award className="w-4 h-4 text-amber-400" />
            <span>5.0★ Google Rating (390+ Verified Pilots)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>{isHe ? 'גיל מינימלי: 10+ (ללא צורך בניסיון)' : 'Minimum Age: 10+ (Zero Experience Needed)'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sky-300">
            <MapPin className="w-4 h-4 text-sky-400" />
            <span>{isHe ? 'גרשון ש"ץ 36, תל אביב (ליד רכבת השלום ותחנת יהודית)' : 'Gershon Shatz 36, Tel Aviv (4m from Yehudit Light Rail)'}</span>
          </span>
        </div>
      </section>

      {/* 2. HOW YOUR FLIGHT SESSION WORKS (STEP-BY-STEP MISSION TIMELINE) */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <Badge variant="sky">{isHe ? 'מהלך הטיסה שלכם' : 'HOW YOUR SESSION WORKS'}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {isHe ? 'מה קורה מרגע הכניסה לתא הטייס?' : 'From Pre-Flight Briefing to Touchdown'}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            {isHe
              ? 'כל סשן מתוכנן כחוויה אישית וסוחפת שבה אתם מטיסים את המטוס בעצמכם בליווי צמוד של מדריך.'
              : 'Every flight session is a personalized, hands-on mission where you fly the aircraft from the Captain’s seat.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {missionSteps.map((item) => (
            <Card key={item.step} glow borderAccent="sky" className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black font-mono text-sky-400">{item.step}</span>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 font-semibold">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white leading-snug">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 3. WHO CAN FLY AT SIM DREAM? */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <Badge variant="emerald">{isHe ? 'למי מתאימה החוויה?' : 'DESIGNED FOR EVERY FLYER'}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {isHe ? 'מותאם אישית לכל גיל, מטרה ורמת ניסיון' : 'Tailored to Your Experience Level & Goals'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {audienceProfiles.map((profile, idx) => {
            const IconComponent = profile.icon;
            return (
              <Card key={idx} borderAccent={profile.accent} className="flex items-start gap-4 p-6">
                <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">{profile.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{profile.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. ESSENTIAL VISITOR & BOOKING HIGHLIGHTS */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase font-bold">
              <Clock className="w-4 h-4" />
              <span>{isHe ? 'שעות פעילות והגעה' : 'Operating Hours & Arrival'}</span>
            </div>
            <p className="text-sm font-bold text-white">
              {isHe
                ? 'א׳–ה׳ 10:00–23:00 • ו׳ 09:00–16:00 • שבת 19:00–24:00'
                : 'Sun–Thu 10:00–23:00 • Fri 09:00–16:00 • Sat 19:00–24:00'}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isHe
                ? 'יש להגיע 5 דקות לפני מועד הסשן שהוזמן. הזמן כולל תדריך קברניט בתא הטייס.'
                : 'Please arrive 5 minutes prior to your scheduled slot. Session duration includes your cockpit briefing.'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs uppercase font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{isHe ? 'גילאים ומלווים' : 'Age Policy & Companions'}</span>
            </div>
            <p className="text-sm font-bold text-white">
              {isHe
                ? 'הטסה מגיל 10+ • עד 2 מלווים חינם בתא הטייס'
                : 'Fly from Age 10+ • Up to 2 Free Cockpit Guests'}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isHe
                ? 'משתתפים בגילאי 10–15 בליווי מבוגר (18+). ביצוע הזמנה באתר מגיל 18 ומעלה.'
                : 'Pilots aged 10–15 require an accompanying adult (18+). Online booking requires age 18+.'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase font-bold">
              <Globe className="w-4 h-4" />
              <span>{isHe ? 'מיקום ונגישות תחבורתית' : 'Central Tel Aviv Location'}</span>
            </div>
            <p className="text-sm font-bold text-white">
              {isHe ? 'גרשון ש"ץ 36, תל אביב-יפו' : 'Gershon Shatz St 36, Tel Aviv-Yafo'}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isHe
                ? '4 דקות הליכה מתחנת הרכבת הקלה יהודית (הקו האדום) ו-8 דקות מתחנת רכבת השלום.'
                : '4-minute walk from Yehudit Light Rail Station (Red Line) & 8-minute walk from HaShalom Train Station.'}
            </p>
          </div>
        </div>
      </section>

      {/* 5. CTA BOX */}
      <section className="text-center bg-gradient-to-r from-sky-900/30 via-slate-900/80 to-sky-900/30 border border-sky-500/30 rounded-2xl p-8 sm:p-10 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-black text-white">{t.cta.title}</h2>
        <p className="text-slate-300 max-w-xl mx-auto text-sm">{t.cta.subtitle}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/book">
            <Button size="lg" className="font-bold">
              <span>{t.cta.bookFlight}</span>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </Link>
          <Link href="/experiences">
            <Button variant="secondary" size="lg">
              <span>{t.experiences.viewAll}</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* 6. SMALL-PRINT TECHNICAL SPECIFICATIONS (COMPACT COLLAPSIBLE <details> FOOTNOTE) */}
      <section className="pt-4 border-t border-slate-900">
        <details className="group rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-400">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-mono text-xs text-slate-400 hover:text-slate-200">
            <span>
              {isHe
                ? 'מפרט טכני כללי של תא הטייס (באותיות קטנות לחובבי תעופה)'
                : 'Fine-Print Simulator Specifications & Environment Summary (Optional Technical Note)'}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180 shrink-0"
            />
          </summary>
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] leading-relaxed text-slate-400">
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {isHe ? 'תצוגה פנורמית ומבנה' : 'Visual & Cabin Environment'}
              </p>
              <p>
                {isHe
                  ? 'תא טייס סגור בקנה מידה 1:1 של בואינג 737 עם מסך הקרנה פנורמי מעוגל בזווית 220° ברזולוציית 4K, תאורת יום/לילה דינמית ומערכת שמע היקפית.'
                  : '1:1 scale enclosed Boeing 737 flight deck shell with a 220° seamless curved 4K visual projection dome, dynamic day/dusk/night lighting, and spatial cockpit audio.'}
              </p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {isHe ? 'הגאים, מצערות ומכשור' : 'Flight Controls & Avionics'}
              </p>
              <p>
                {isHe
                  ? 'הגאים ודוושות כיוון מקושרים מכנית בעלי משוב עומס, מצערות ממונעות אוטומטית, פאנל טייס אוטומטי, מחשב ניווט וניהול טיסה וצגי טיסה דיגיטליים.'
                  : 'Dual mechanically linked control columns and rudder pedals with control-loading feedback, motorized autothrottle levers, mode control panel, dual flight management computers, and digital flight displays.'}
              </p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {isHe ? 'מאגר שדות תעופה והבהרה רגולטורית' : 'Global Scenery & Facility Notice'}
              </p>
              <p>
                {isHe
                  ? `מעל 45,000 שדות תעופה בעולם וסימולציית מזג אוויר בזמן אמת. הסימולטור מופעל על ידי ${FACILITY_INFO.legalNameHe} (ח.פ. ${FACILITY_INFO.companyRegistrationNumber}) כמתקן חוויה ובידור ואינו מהווה מוסד הכשרה או רישוי טיס רשמי.`
                  : `Over 45,000 global airports with real-time weather synthesis. Operated by ${FACILITY_INFO.legalNameEn} (C.N. ${FACILITY_INFO.companyRegistrationNumber}) strictly as an experiential and entertainment facility, not for official flight certification hours.`}
              </p>
            </div>
          </div>
        </details>
      </section>
    </main>
  );
}

