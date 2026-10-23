'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  ShieldCheck,
  Clock,
  UserCheck,
  AlertTriangle,
  Scale,
  Ticket,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/i18n/language-context';
import { FACILITY_INFO } from '@/lib/config/facility-info';

export function RulesContentView() {
  const { language } = useLanguage();
  const isHe = language === 'he';

  return (
    <main className="flex-1 py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <header className="space-y-4 border-b border-slate-800 pb-8">
        <Badge variant="sky">
          {isHe ? 'תקנון ותנאי שימוש רשמיים • SIM DREAM ISRAEL' : 'OFFICIAL FACILITY RULES & TERMS OF USE'}
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {isHe ? 'תקנון ותנאי שימוש – סימדרים ישראל' : 'Facility Rules, Terms & Conditions — Sim Dream Israel'}
        </h1>
        <p className="text-sm text-slate-300 font-mono">
          {FACILITY_INFO.legalNameHe} • {FACILITY_INFO.legalNameEn} •{' '}
          {isHe ? `ח.פ. ${FACILITY_INFO.companyRegistrationNumber}` : `Company Reg. (ח.פ.) ${FACILITY_INFO.companyRegistrationNumber}`}
        </p>
        <p className="text-xs text-slate-400">
          {isHe
            ? `כתובת המרכז: ${FACILITY_INFO.address.streetHe}, ${FACILITY_INFO.address.cityHe} | אתרים רשמיים: simdream.co.il, simdream.aero`
            : `Facility Address: ${FACILITY_INFO.address.streetEn}, ${FACILITY_INFO.address.cityEn} | Official Domains: simdream.co.il, simdream.aero`}
        </p>
      </header>

      {/* Quick Operational Highlights */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card borderAccent="amber" className="p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase">
            <UserCheck className="w-4 h-4" />
            <span>{isHe ? 'גילאים וליווי מבוגר' : 'Age Requirements'}</span>
          </div>
          <p className="text-sm font-bold text-white">
            {isHe ? 'כניסה לסימולטור מגיל 10+' : 'Simulator Entry: Age 10+'}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isHe
              ? 'ילדים בגילאי 10–15 מחויבים בליווי מבוגר. ביצוע הזמנה ותשלום באתר מגיל 18 ומעלה.'
              : 'Participants aged 10–15 require adult supervision. Online booking & payment require age 18+.'}
          </p>
        </Card>

        <Card borderAccent="sky" className="p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-bold uppercase">
            <Clock className="w-4 h-4" />
            <span>{isHe ? 'הגעה ואיחורים' : 'Arrival & Punctuality'}</span>
          </div>
          <p className="text-sm font-bold text-white">
            {isHe ? 'הגעה 5 דקות לפני תחילת הסשן' : 'Arrive 5 Minutes Before Slot'}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isHe
              ? 'איחור העולה על 10 דקות עלול לגרור קיצור של זמן הסשן (ללא החזר כספי) או דחיית המועד בכפוף לדמי שינוי.'
              : 'Delays over 10 minutes may result in a shortened session (without refund for lost time) or rescheduling fees.'}
          </p>
        </Card>

        <Card borderAccent="emerald" className="p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>{isHe ? 'אופי השירות והתדריך' : 'Nature of Service'}</span>
          </div>
          <p className="text-sm font-bold text-white">
            {isHe ? 'מתקן חוויה ובידור בליווי מדריך' : 'Experiential Facility & Briefing'}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isHe
              ? 'משך השירות כולל תדריך מקדים בתא הטייס. הסימולטור הוא מתקן בידור ואינו מיועד להכשרה מקצועית או רישוי.'
              : 'Session duration includes pre-flight briefing. The simulator is an entertainment facility, not for official licensing.'}
          </p>
        </Card>
      </section>

      {/* Full Legal Clauses */}
      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        {/* Section 1: Definitions */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            <span>{isHe ? '1. הגדרות' : '1. Definitions (הגדרות)'}</span>
          </h2>
          <dl className="space-y-3 text-xs sm:text-sm">
            <div>
              <dt className="font-bold text-white inline">
                {isHe ? '1.1 המרכז: ' : '1.1 The Center (המרכז): '}
              </dt>
              <dd className="inline">
                {isHe
                  ? 'Simulation Systems (Israel) Sim Dream LTD (מערכות הדמיה סימולטורים (ישראל) סיםדרים בע״מ), ח.פ. 516651031, כתובת: גרשון ש״ץ 36, תל-אביב-יפו, 6701772.'
                  : 'Simulation Systems (Israel) Sim Dream LTD, Israeli Company Registration No. (ח.פ.) 516651031, located at Gershon Shatz St 36, Tel Aviv-Yafo, 6701772, Israel.'}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-white inline">
                {isHe ? '1.2 סימולטור: ' : '1.2 The Simulator (סימולטור): '}
              </dt>
              <dd className="inline">
                {isHe
                  ? 'תא-טייס מדמה (תצוגה פנורמית / VR) עם תוכנה המדמה מערכות אמיתיות. הסימולטור הינו מתקן בידור וחוויה ואינו מיועד לצורכי הכשרה מקצועית או אימונים רשמיים.'
                  : 'A replica cockpit simulation system with panoramic visual projection and software simulating aircraft systems. It is strictly an entertainment and experiential facility and is not intended for professional pilot certification or official training hours.'}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-white inline">
                {isHe ? '1.3 שירות / סשן: ' : '1.3 Service / Session (שירות / סשן): '}
              </dt>
              <dd className="inline">
                {isHe
                  ? 'פעילות חווייתית או הדרכתית בסימולטור, המתקיימת בליווי מדריך מטעם המרכז.'
                  : 'An experiential or instructional flight simulator activity accompanied by a Center instructor.'}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-white inline">
                {isHe ? '1.4 משך שירות: ' : '1.4 Session Duration (משך שירות): '}
              </dt>
              <dd className="inline">
                {isHe
                  ? 'זמן השימוש בסימולטור בהתאם לחבילה שנרכשה, כולל תדריך מקדים (Briefing).'
                  : 'Total time in the simulator according to the booked package, including the pre-flight briefing.'}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-white inline">
                {isHe ? '1.5 שובר מתנה ושובר חיצוני: ' : '1.5 Gift Vouchers & External Vouchers: '}
              </dt>
              <dd className="inline">
                {isHe
                  ? 'כרטיס או קובץ PDF בעל מספר מזהה, תוקף, סוג סימולטור ומשך סשן, או שובר שנרכש מגוף שלישי (הכפוף לתקנון זה).'
                  : 'A numbered card or PDF certificate specifying validity, simulator type, and session duration, or a third-party voucher (subject to these rules).'}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-white inline">
                {isHe ? '1.6 הסכמה לתקנון (Accept): ' : '1.6 Acceptance of Terms (Accept): '}
              </dt>
              <dd className="inline">
                {isHe
                  ? 'עצם התשלום עבור הזמנה, רכישת שובר או מימוש שובר באתר מהווים הסכמה מלאה ומחייבת לתקנון זה.'
                  : 'Completing payment or redeeming a voucher constitutes full and binding agreement to these Facility Rules and Terms of Use.'}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-white inline">
                {isHe ? '1.7 לקוח / מזמין ומבקר: ' : '1.7 Customer & Visitor: '}
              </dt>
              <dd className="inline">
                {isHe
                  ? '״לקוח / מזמין״ – אדם כשיר משפטית מעל גיל 18 המבצע הזמנה, משלם או מממש שובר. ״מבקר״ – כל אדם השוהה במתחם המרכז (מלווים, בני משפחה או אורחים).'
                  : '“Customer” — a legally competent adult aged 18+ who places an order, pays, or redeems a voucher. “Visitor” — any companion, family member, or guest present inside the Center.'}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Section 2: General Principles */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-400" />
            <span>{isHe ? '2. עקרונות כלליים' : '2. General Principles (עקרונות כלליים)'}</span>
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm list-disc list-inside">
            <li>
              {isHe
                ? '2.1 השירותים כוללים: (א) סשנים חווייתיים או הדרכתיים בסימולטור; (ב) שימוש זמני בחללים, בציוד ובמערכות המרכז; (ג) שירותי ערך מוסף ותוספות בהסכמה.'
                : '2.1 Services include: (a) experiential/instructional simulator sessions; (b) temporary use of the Center’s spaces, equipment, and systems; (c) optional value-added add-ons.'}
            </li>
            <li>
              {isHe
                ? '2.2 הלקוח והמבקרים מתחייבים לשמור על הוראות התקנון, כללי הבטיחות והנחיות צוות המדריכים בכל עת.'
                : '2.2 Customers and visitors agree to abide by these rules, safety instructions, and staff guidance at all times.'}
            </li>
            <li>
              {isHe
                ? '2.3 המרכז רשאי לדחות או לשנות מועד פעילות עקב תחזוקה, תקלה טכנית או כוח עליון (מלחמה, מצב ביטחוני, מגפה, אסון טבע, שביתה כללית וכד׳), תוך תיאום מועד חלופי מול הלקוח.'
                : '2.3 The Center reserves the right to postpone or reschedule a session due to technical maintenance, calibration, or Force Majeure, while offering an alternative mutually coordinated slot.'}
            </li>
          </ul>
        </Card>

        {/* Section 3: Booking, Payment, Arrival & Age Policy */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>
              {isHe
                ? '3. הזמנה, תשלום, מועד שירות, איחורים וגילאים'
                : '3. Bookings, Payments, Punctuality & Age Rules'}
            </span>
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm list-disc list-inside">
            <li>
              {isHe
                ? '3.1 ביצוע הזמנה מתבצע באתר (simdream.co.il / simdream.aero) ומחייב גיל 18 ומעלה והחזקת אמצעי תשלום תקף.'
                : '3.1 Online bookings must be completed by an adult aged 18 or older holding a valid payment method.'}
            </li>
            <li>
              {isHe
                ? '3.2 אישור הזמנה נשלח אוטומטית בדוא״ל; סירוב עסקה מצד חברת האשראי מבטל את ההזמנה באופן מיידי.'
                : '3.2 Booking confirmation is sent automatically via email; credit card authorization refusal immediately voids the reservation.'}
            </li>
            <li>
              {isHe
                ? '3.3 תחילת השירות: נחשבת מהרגע שבו הלקוח מתיישב בתא הסימולטור והמדריך מתחיל את התדריך המקדים (Briefing).'
                : '3.3 Start of Service: Deemed to begin the moment the participant takes their seat in the simulator cockpit and the instructor commences the pre-flight briefing.'}
            </li>
            <li>
              {isHe
                ? '3.4 הגעה ואיחורים: חובה להגיע למרכז כ-5 דקות לפני מועד תחילת הסשן. איחור העולה על 10 דקות עלול לגרור קיצור של זמן הסשן (ללא החזר כספי על הזמן שאבד) או דחיית המועד בכפוף לתשלום דמי שינוי.'
                : '3.4 Arrival & Late Policy: Participants must arrive at the Center 5 minutes prior to their scheduled session time. An accumulated delay exceeding 10 minutes may result in a shortened flight session (without refund for the lost time) or rescheduling to another slot subject to a change/postponement fee.'}
            </li>
            <li>
              {isHe
                ? '3.5 גילאים: הכניסה לסימולטור מותרת החל מגיל 10 ומעלה. ילדים בגילאי 10–15 מחויבים בליווי מבוגר (מעל גיל 18).'
                : '3.5 Minimum Age: Entry to fly the simulator is permitted from age 10 and up (10+). Children aged 10–15 must be accompanied by an adult (18+).'}
            </li>
          </ul>
        </Card>

        {/* Section 4: Cancellations, Vouchers & Consumer Protection */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-5 h-5 text-sky-400" />
            <span>
              {isHe
                ? '4. ביטולים, שינויי מועד ושוברי מתנה'
                : '4. Cancellations, Rescheduling & Gift Vouchers'}
            </span>
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm list-disc list-inside">
            <li>
              {isHe
                ? '4.1 ביטול עסקה ייעשה בהתאם להוראות חוק הגנת הצרכן, התשמ״א-1981 והתקנות שהותקנו מכוחו (לרבות דמי ביטול בשיעור 5% ממחיר העסקה או 100 ₪, לפי הנמוך מביניהם, בכפוף למועדים הקבועים בחוק לשירותי בילוי ופנאי).'
                : '4.1 Transaction cancellations are governed by the Israeli Consumer Protection Law, 5741-1981 (including statutory cancellation fees of the lesser of 5% or 100 NIS where applicable to scheduled leisure services).'}
            </li>
            <li>
              {isHe
                ? '4.2 מימוש שובר מתנה מותנה בתיאום מועד מראש באתר או מול מוקד ההזמנות ובכפוף לזמינות המועדים בלוח הטיסות.'
                : '4.2 Gift vouchers must be redeemed by booking a slot in advance online or via Flight Dispatch, subject to schedule availability.'}
            </li>
          </ul>
        </Card>

        {/* Section 5: Safety & Facility Conduct */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>
              {isHe
                ? '5. בטיחות, התנהגות במתחם והגבלת אחריות'
                : '5. Safety, Cockpit Conduct & Liability'}
            </span>
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm list-disc list-inside">
            <li>
              {isHe
                ? '5.1 המדריך המלווה הינו בעל הסמכות הבלעדית בתא הטייס ובמתחם לגבי ניהול הסשן ונהלי הבטיחות. אין להכניס מזון או שתייה לתוך תא הטייס.'
                : '5.1 The accompanying instructor holds full authority over cockpit safety and session flow. Food and open beverages are not permitted inside the flight deck.'}
            </li>
            <li>
              {isHe
                ? '5.2 הכניסה לסימולטור אסורה למי שנמצא תחת השפעת אלכוהול או סמים, ולסובלים מרגישות רפואית חריפה להבהובי אור (אפילפסיה פוטוסנסיטיבית).'
                : '5.2 Entry is prohibited under the influence of alcohol or drugs, or for individuals with severe untreated photosensitive epilepsy.'}
            </li>
          </ul>
        </Card>
      </div>

      {/* Contact Footer Box */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-300">
        <div className="space-y-1">
          <p className="font-bold text-white">
            {isHe ? 'שאלות לגבי התקנון או הזמנה קיימת?' : 'Questions Regarding Facility Rules or an Existing Booking?'}
          </p>
          <div className="flex flex-wrap items-center gap-4 font-mono text-slate-400">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              {FACILITY_INFO.address.streetEn}, Tel Aviv
            </span>
            <a href={FACILITY_INFO.contact.phoneHref} className="inline-flex items-center gap-1 hover:text-sky-400">
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              {FACILITY_INFO.contact.phoneDisplay}
            </a>
            <a href={FACILITY_INFO.contact.emailHref} className="inline-flex items-center gap-1 hover:text-sky-400">
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              {FACILITY_INFO.contact.email}
            </a>
          </div>
        </div>
        <Link
          href="/privacy-policy"
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono font-semibold shrink-0"
        >
          {isHe ? 'למדיניות הפרטיות ←' : 'View Privacy Policy →'}
        </Link>
      </div>
    </main>
  );
}

