'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plane, MapPin, Phone, Mail, Clock, UserCheck, ChevronDown, FileText, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { LanguageSelector } from './LanguageSelector';
import { UiThemeSwitcher } from './UiThemeSwitcher';
import { FACILITY_INFO, getLiveFacilityStatus, LiveFacilityStatus } from '@/lib/config/facility-info';

export function Footer() {
  const { t, language } = useLanguage();
  const [liveStatus, setLiveStatus] = useState<LiveFacilityStatus>(() => getLiveFacilityStatus());

  useEffect(() => {
    setLiveStatus(getLiveFacilityStatus());
    const timer = setInterval(() => setLiveStatus(getLiveFacilityStatus()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center shadow-glow shrink-0">
                <Plane className="w-5 h-5 text-white transform -rotate-45" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white">SIM DREAM LTD</span>
                <p className="text-[10px] tracking-wider text-sky-400 font-mono">BOEING 737 MAX CENTER</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.footer.missionDesc}
            </p>
            <div
              className={`flex items-center gap-2 pt-2 text-xs font-mono ${
                liveStatus.isOpen ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  liveStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>
                {language === 'he' ? liveStatus.statusHeadlineHe : liveStatus.statusHeadlineEn}
              </span>
            </div>

            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <UiThemeSwitcher variant="compact" />
              <LanguageSelector />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-mono font-bold tracking-widest text-slate-200 uppercase mb-4">
              {t.footer.flightExperiences}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/experiences" className="hover:text-sky-400 transition-colors">
                  {t.packages['pkg-discovery-30'].title}
                </Link>
              </li>
              <li>
                <Link href="/experiences" className="hover:text-sky-400 transition-colors">
                  {t.packages['pkg-captain-60'].title}
                </Link>
              </li>
              <li>
                <Link href="/experiences" className="hover:text-sky-400 transition-colors">
                  {t.packages['pkg-ultimate-90'].title}
                </Link>
              </li>
              <li>
                <Link href="/experiences" className="hover:text-sky-400 transition-colors">
                  {t.packages['pkg-assessment-prep-120'].title}
                </Link>
              </li>
              <li>
                <Link href="/experiences" className="hover:text-sky-400 transition-colors">
                  {t.packages['pkg-fear-of-flying-90'].title}
                </Link>
              </li>
              <li>
                <Link href="/vouchers" className="hover:text-sky-400 transition-colors text-sky-400 font-semibold">
                  {t.nav.vouchers} &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Corporate, About & Legal */}
          <div>
            <h4 className="text-xs font-mono font-bold tracking-widest text-slate-200 uppercase mb-4">
              {t.footer.aviationCorporate}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/about" className="hover:text-sky-400 transition-colors">
                  {t.nav.simulator}
                </Link>
              </li>
              <li>
                <Link href="/workshops" className="hover:text-sky-400 transition-colors">
                  {t.nav.workshops}
                </Link>
              </li>
              <li>
                <Link href="/rules" className="hover:text-sky-400 transition-colors flex items-center gap-1.5 text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{language === 'he' ? 'תקנון ותנאי שימוש (Rules)' : 'Facility Rules & Terms (תקנון)'}</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-sky-400 transition-colors flex items-center gap-1.5 text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{language === 'he' ? 'מדיניות פרטיות וקובצי Cookie' : 'Privacy & Cookie Policy'}</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-sky-400 transition-colors">
                  {t.nav.logbook}
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-amber-400 transition-colors text-slate-500">
                  {t.nav.adminBoard}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Hours */}
          <div>
            <h4 className="text-xs font-mono font-bold tracking-widest text-slate-200 uppercase mb-4">
              {t.footer.locationHours}
            </h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <a
                  href={FACILITY_INFO.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 transition-colors"
                >
                  {t.contact.addressLine1}, {t.contact.addressLine2}
                  <br />
                  <span className="text-[11px] text-slate-500">{t.contact.addressNote}</span>
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <a
                  href={FACILITY_INFO.contact.phoneHref}
                  dir="ltr"
                  className="hover:text-sky-400 transition-colors font-mono"
                >
                  {FACILITY_INFO.contact.phoneDisplay} ({FACILITY_INFO.contact.phoneInternational})
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <a
                  href={FACILITY_INFO.contact.emailHref}
                  dir="ltr"
                  className="hover:text-sky-400 transition-colors font-mono"
                >
                  {FACILITY_INFO.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-amber-300 font-mono">
                  {language === 'he'
                    ? `גיל מינימלי להטסה: ${FACILITY_INFO.requirements.minimumAgeYears}+`
                    : `Minimum Pilot Age: ${FACILITY_INFO.requirements.minimumAgeYears}+`}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 font-mono">
                  <p>{t.footer.hoursWeek}</p>
                  <p>{t.footer.hoursFri}</p>
                  <p>{t.footer.hoursSat}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Official Facility Rules (תקנון) & Privacy Policy Summary Drawer at the Bottom */}
        <div className="border-t border-slate-900 mt-12 pt-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <details
              {...({ name: 'footer-legal' } as React.DetailsHTMLAttributes<HTMLDetailsElement>)}
              className="group rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-3 text-xs"
            >
              <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-mono text-slate-300 hover:text-white">
                <span className="flex items-center gap-2">
                  <FileText aria-hidden="true" className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>
                    {language === 'he'
                      ? 'תקנון ותנאי שימוש מרכזיים (simdream.co.il/rules)'
                      : 'Facility Rules & Terms Summary (simdream.co.il/rules)'}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180 shrink-0"
                />
              </summary>
              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-[11px] leading-relaxed text-slate-400">
                <p>
                  {language === 'he'
                    ? `1. המרכז: ${FACILITY_INFO.legalNameHe} (${FACILITY_INFO.legalNameEn}), ח.פ. ${FACILITY_INFO.companyRegistrationNumber}, רח׳ גרשון ש"ץ 36, תל אביב-יפו. הסימולטור הינו מתקן בידור וחוויה בליווי מדריך ואינו מיועד להכשרה מקצועית או רישוי טיס.`
                    : `1. The Center: ${FACILITY_INFO.legalNameEn} (Company Reg. ${FACILITY_INFO.companyRegistrationNumber}), Gershon Shatz St 36, Tel Aviv-Yafo. The simulator is an experiential entertainment facility accompanied by an instructor and not an accredited pilot certification device.`}
                </p>
                <p>
                  {language === 'he'
                    ? '2. גילאים: הכניסה לסימולטור מותרת מגיל 10 ומעלה (10+). ילדים בגילאי 10–15 מחויבים בליווי מבוגר. ביצוע הזמנה ותשלום באתר מחייבים גיל 18 ומעלה.'
                    : '2. Age Policy: Simulator entry is permitted from Age 10+. Children aged 10–15 require adult supervision (18+). Online booking and credit card payment require age 18+.'}
                </p>
                <p>
                  {language === 'he'
                    ? '3. הגעה ואיחורים: חובה להגיע למרכז 5 דקות לפני מועד הסשן. משך השירות כולל תדריך מקדים בתא הטייס. איחור העולה על 10 דקות עלול לגרור קיצור של זמן הסשן (ללא החזר כספי) או דחיית המועד בכפוף לדמי שינוי.'
                    : '3. Arrival & Late Policy: Arrive 5 minutes prior to your scheduled session. Session duration includes the cockpit briefing. Delays over 10 minutes may result in a shortened session without refund or rescheduling subject to a change fee.'}
                </p>
                <p className="pt-1">
                  <Link href="/rules" className="text-sky-400 hover:underline font-mono font-semibold">
                    {language === 'he' ? 'קראו את התקנון המלא ←' : 'Read Full Facility Rules & Terms →'}
                  </Link>
                </p>
              </div>
            </details>

            <details
              {...({ name: 'footer-legal' } as React.DetailsHTMLAttributes<HTMLDetailsElement>)}
              className="group rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-3 text-xs"
            >
              <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-mono text-slate-300 hover:text-white">
                <span className="flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    {language === 'he'
                      ? 'מדיניות פרטיות וקובצי Cookie (simdream.co.il/privacy-policy)'
                      : 'Privacy & Cookie Policy Summary (simdream.co.il/privacy-policy)'}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180 shrink-0"
                />
              </summary>
              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-[11px] leading-relaxed text-slate-400">
                <p>
                  {language === 'he'
                    ? '1. איסוף מידע ואבטחה: פרטים הנמסרים בעת הזמנה או פנייה (שם, דוא״ל, טלפון) משמשים לתיאום הטיסה, שליחת אישורים ושוברים ומתן שירות לקוחות בלבד. סליקת אשראי מתבצעת בתקן PCI-DSS מוצפן ופרטי כרטיס מלאים אינם נשמרים בשרתינו.'
                    : '1. Data & Payment Security: Booking and inquiry details (name, email, phone) are used strictly for flight dispatch, digital vouchers, and customer support. Payments are processed via encrypted PCI-DSS gateways.'}
                </p>
                <p>
                  {language === 'he'
                    ? '2. קובצי Cookie וזכויות פרטיות: האתר משתמש בעוגיות לתפעול תקין, שמירת העדפות שפה וניתוח תנועה. לבירורים או בקשות עיון/הסרה לפי חוק הגנת הפרטיות: desk@simdream.co.il או 055-507-1307.'
                    : '2. Cookies & Privacy Rights: We use cookies to maintain booking state, language preferences, and analytics. For privacy inquiries under Israeli law, contact desk@simdream.co.il or 055-507-1307.'}
                </p>
                <p className="pt-1">
                  <Link href="/privacy-policy" className="text-emerald-400 hover:underline font-mono font-semibold">
                    {language === 'he' ? 'קראו את מדיניות הפרטיות המלאה ←' : 'Read Full Privacy & Cookie Policy →'}
                  </Link>
                </p>
              </div>
            </details>
          </div>
        </div>

        {/* Bottom Bar & Disclaimer */}
        <div className="border-t border-slate-900 mt-6 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1">
            <p>
              &copy; {new Date().getFullYear()} {FACILITY_INFO.legalNameEn} (ח.פ. / Reg.{' '}
              {FACILITY_INFO.companyRegistrationNumber}). {t.footer.rightsReserved}
            </p>
            <Link href="/rules" className="text-slate-400 hover:text-sky-400 underline underline-offset-2">
              {language === 'he' ? 'תקנון ותנאי שימוש' : 'Terms & Rules'}
            </Link>
            <Link href="/privacy-policy" className="text-slate-400 hover:text-sky-400 underline underline-offset-2">
              {language === 'he' ? 'מדיניות פרטיות' : 'Privacy Policy'}
            </Link>
            <Link href="/about" className="text-slate-400 hover:text-sky-400 underline underline-offset-2">
              {language === 'he' ? 'אודות' : 'About Us'}
            </Link>
          </div>
          <p className="max-w-xl text-center md:text-right rtl:md:text-left">
            {t.footer.disclaimer}
          </p>
        </div>
      </div>
    </footer>
  );
}
