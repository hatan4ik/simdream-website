'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Cookie,
  Database,
  UserCheck,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/i18n/language-context';
import { FACILITY_INFO } from '@/lib/config/facility-info';

export function PrivacyPolicyContentView() {
  const { language } = useLanguage();
  const isHe = language === 'he';

  return (
    <main className="flex-1 py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <header className="space-y-4 border-b border-slate-800 pb-8">
        <Badge variant="emerald">
          {isHe ? 'מדיניות פרטיות וקובצי COOKIE • SIM DREAM ISRAEL' : 'OFFICIAL PRIVACY & COOKIE POLICY'}
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {isHe ? 'מדיניות פרטיות ואבטחת מידע – סימדרים ישראל' : 'Privacy & Cookie Policy — Sim Dream Israel'}
        </h1>
        <p className="text-sm text-slate-300 font-mono">
          {FACILITY_INFO.legalNameHe} • {FACILITY_INFO.legalNameEn} •{' '}
          {isHe ? `ח.פ. ${FACILITY_INFO.companyRegistrationNumber}` : `Company Reg. (ח.פ.) ${FACILITY_INFO.companyRegistrationNumber}`}
        </p>
        <p className="text-xs text-slate-400">
          {isHe
            ? `כתובת: ${FACILITY_INFO.address.streetHe}, ${FACILITY_INFO.address.cityHe} | דוא״ל פרטיות: ${FACILITY_INFO.contact.email}`
            : `Address: ${FACILITY_INFO.address.streetEn}, ${FACILITY_INFO.address.cityEn} | Privacy Contact: ${FACILITY_INFO.contact.email}`}
        </p>
      </header>

      {/* Sections */}
      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <Card className="p-6 space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-400" />
            <span>
              {isHe ? '1. איסוף מידע ומטרות השימוש' : '1. Information We Collect & Purpose of Processing'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm">
            {isHe
              ? 'בעת ביצוע הזמנת טיסה, רכישת שובר מתנה או פנייה בטופס יצירת הקשר באתרים simdream.co.il ו-simdream.aero, אנו אוספים את הפרטים הנדרשים למתן השירות: שם מלא, כתובת דוא״ל, מספר טלפון/וואטסאפ, מועד הטיסה המבוקש והערות להזמנה. המידע משמש לניהול יומן הטיסות, שליחת אישורי הזמנה ושוברים דיגיטליים, תיאום שינויים ומתן שירות לקוחות.'
              : 'When you book a flight simulator session, purchase a gift voucher, or submit an inquiry on simdream.co.il or simdream.aero, we collect your name, email address, phone/WhatsApp number, selected flight schedule, and optional notes. This data is used strictly to dispatch your session, deliver booking confirmations and digital gift vouchers, and provide customer support.'}
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cookie className="w-5 h-5 text-amber-400" />
            <span>
              {isHe
                ? '2. קובצי Cookie וטכנולוגיות מעקב'
                : '2. Cookies & Tracking Technologies'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm">
            {isHe
              ? 'האתר עושה שימוש בקובצי Cookie (עוגיות) ובאחסון מקומי בדפדפן לצורך תפעולו השוטף והתקין, שמירת העדפות שפה ותצוגה, ניתוח תעבורת גולשים ושיפור חוויית המשתמש. הגלישה באתר או לחיצה על אישור בהודעת העוגיות מהווה הסכמה לשימוש זה בהתאם למדיניות הפרטיות. ניתן לשנות את הגדרות ה-Cookies בכל עת דרך הגדרות הדפדפן.'
              : 'Our website uses cookies and local storage technologies to ensure reliable booking functionality, remember your language and cockpit display preferences, analyze site traffic, and improve user experience. By using the site or accepting the cookie notice, you consent to our cookie practices. You may disable or clear cookies at any time in your browser settings.'}
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <span>
              {isHe
                ? '3. אבטחת מידע וסליקת אשראי (PCI-DSS)'
                : '3. Payment Security & Data Protection (PCI-DSS)'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm">
            {isHe
              ? 'תשלומים בכרטיסי אשראי באתר מתבצעים באמצעות ספקי סליקה חיצוניים מאובטחים העומדים בתקן האבטחה הבינלאומי PCI-DSS ובפרוטוקול הצפנה SSL. פרטי כרטיס האשראי המלאים אינם נשמרים בשרתי המרכז.'
              : 'All online credit card transactions are processed through encrypted PCI-DSS compliant payment gateways over TLS/SSL. Full credit card numbers and CVV security codes are never stored on Sim Dream servers.'}
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-400" />
            <span>
              {isHe
                ? '4. זכויות עיון, תיקון והסרה (חוק הגנת הפרטיות)'
                : '4. Your Rights Under Israeli Privacy Law'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm">
            {isHe
              ? 'בהתאם לחוק הגנת הפרטיות, התשמ״א-1981 (לרבות תיקון 13), כל אדם זכאי לעיין במידע האישי המוחזק עליו, לבקש את תיקונו או את מחיקתו מרשימות התפוצה. למימוש זכויות אלו ניתן לפנות אלינו בדוא״ל desk@simdream.co.il או בטלפון 055-507-1307.'
              : 'In accordance with the Israeli Protection of Privacy Law, 5741-1981, you have the right to review, update, or request deletion of your personal information held by us. To exercise these rights, please contact us at desk@simdream.co.il or +972-55-507-1307.'}
          </p>
        </Card>
      </div>

      {/* Contact & Cross-Link Box */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-300">
        <div className="space-y-1">
          <p className="font-bold text-white">
            {isHe ? 'יצירת קשר בנושאי פרטיות ואבטחת מידע' : 'Privacy & Data Protection Officer Contact'}
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
          href="/rules"
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono font-semibold shrink-0"
        >
          {isHe ? 'לתקנון ותנאי השימוש ←' : 'View Facility Rules (תקנון) →'}
        </Link>
      </div>
    </main>
  );
}

