'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, Clock, UserCheck, ChevronDown, FileText, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useLanguage } from '@/lib/i18n/language-context';
import { LanguageSelector } from './LanguageSelector';
import { UiThemeSwitcher } from './UiThemeSwitcher';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { useLiveFacilityStatus } from '@/lib/config/use-live-facility-status';
import { useClientValue } from '@/lib/ui/use-client-value';

export function Footer() {
  const { t, language } = useLanguage();
  const liveStatus = useLiveFacilityStatus();
  // Read in the browser: a render-time read froze the build year into prerendered pages (E2E-12).
  const year = useClientValue(() => new Date().getFullYear());

  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand & Mission */}
          <div className="space-y-4">
            <div>
              <BrandLogo className="h-7 w-auto" />
              <p className="mt-1.5 text-[10px] tracking-widest text-orange-400 uppercase font-bold">{t.nav.brandSub}</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.footer.missionDesc}
            </p>
            {/* Reserved height so the status appearing after mount causes no layout shift. */}
            <div className="min-h-6 pt-2">
              {liveStatus && (
                <div
                  className={`flex items-center gap-2 text-xs font-mono ${
                    liveStatus.isOpen ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      liveStatus.isOpen ? 'bg-emerald-500 motion-safe:animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span>
                    {language === 'he'
                      ? liveStatus.statusHeadlineHe
                      : language === 'ru'
                      ? (liveStatus.isOpen ? 'ОТКРЫТО • По предварительной записи' : 'ЗАКРЫТО • Бронирование 24/7')
                      : language === 'fr'
                      ? (liveStatus.isOpen ? 'OUVERT • Sur réservation préalable' : 'FERMÉ • Réservation en ligne 24/7')
                      : language === 'ar'
                      ? (liveStatus.isOpen ? 'مفتوح ويعمل • بالحجز المسبق' : 'مغلق حالياً • الحجز متاح 24/7')
                      : liveStatus.statusHeadlineEn}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <UiThemeSwitcher variant="compact" />
              <LanguageSelector />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-xs font-mono font-bold tracking-widest text-slate-200 uppercase mb-4">
              {t.footer.flightExperiences}
            </h2>
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
            <h2 className="text-xs font-mono font-bold tracking-widest text-slate-200 uppercase mb-4">
              {t.footer.aviationCorporate}
            </h2>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/about" className="hover:text-sky-400 transition-colors">
                  {t.nav.about}
                </Link>
              </li>
              <li>
                <Link href="/pro" className="hover:text-sky-400 transition-colors">
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
                  <span>{t.footer.termsRules}</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-sky-400 transition-colors flex items-center gap-1.5 text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{t.footer.privacyPolicy}</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-sky-400 transition-colors">
                  {t.nav.logbook}
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-amber-400 transition-colors text-slate-400">
                  {t.nav.adminBoard}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Hours */}
          <div>
            <h2 className="text-xs font-mono font-bold tracking-widest text-slate-200 uppercase mb-4">
              {t.footer.locationHours}
            </h2>
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
                  <span className="text-[11px] text-slate-400">{t.contact.addressNote}</span>
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
                  {t.footer.minAgeLabel}
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

        {/* Official Facility Rules & Privacy Policy Summary Drawer at the Bottom */}
        <div className="border-t border-slate-900 mt-12 pt-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <details
              {...({ name: 'footer-legal' } as React.DetailsHTMLAttributes<HTMLDetailsElement>)}
              className="group rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-3 text-xs"
            >
              <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-mono text-slate-300 hover:text-white">
                <span className="flex items-center gap-2">
                  <FileText aria-hidden="true" className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{t.footer.rulesDrawerTitle}</span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180 shrink-0"
                />
              </summary>
              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-[11px] leading-relaxed text-slate-400">
                <p>{t.footer.rulesPoint1}</p>
                <p>{t.footer.rulesPoint2}</p>
                <p>{t.footer.rulesPoint3}</p>
                <p className="pt-1">
                  <Link href="/rules" className="text-sky-400 hover:underline font-mono font-semibold">
                    {t.footer.readFullRules}
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
                  <span>{t.footer.privacyDrawerTitle}</span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180 shrink-0"
                />
              </summary>
              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-[11px] leading-relaxed text-slate-400">
                <p>{t.footer.privacyPoint1}</p>
                <p>{t.footer.privacyPoint2}</p>
                <p className="pt-1">
                  <Link href="/privacy-policy" className="text-emerald-400 hover:underline font-mono font-semibold">
                    {t.footer.readFullPrivacy}
                  </Link>
                </p>
              </div>
            </details>
          </div>
        </div>

        {/* Bottom Bar & Disclaimer */}
        <div className="border-t border-slate-900 mt-6 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1">
            <p>
              &copy; {year} {FACILITY_INFO.legalNameEn} (ח.פ. / Reg.{' '}
              {FACILITY_INFO.companyRegistrationNumber}). {t.footer.rightsReserved}
            </p>
            <Link href="/rules" className="text-slate-400 hover:text-sky-400 underline underline-offset-2">
              {t.footer.termsRules}
            </Link>
            <Link href="/privacy-policy" className="text-slate-400 hover:text-sky-400 underline underline-offset-2">
              {t.footer.privacyPolicy}
            </Link>
            <Link href="/pro" className="text-slate-400 hover:text-sky-400 underline underline-offset-2">
              {t.footer.proTraining}
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
