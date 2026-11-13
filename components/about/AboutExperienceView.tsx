'use client';

import React from 'react';
import Link from 'next/link';
import {
  Plane,
  Clock,
  Award,
  Users,
  Compass,
  HeartHandshake,
  Briefcase,
  UserCheck,
  ShieldCheck,
  Globe,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Facebook,
  Instagram,
  Youtube,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/i18n/language-context';
import { type Language, type LocalizedRecord } from '@/lib/i18n/translations';
import { FACILITY_INFO } from '@/lib/config/facility-info';

import { ABOUT_COPY } from './about-copy';

export function AboutExperienceView() {
  const { t, language, isRTL } = useLanguage();
  const copy = ABOUT_COPY[language] || ABOUT_COPY.en;

  const profileIcons = [Users, Compass, HeartHandshake, Briefcase];
  const profileAccents = ['sky', 'emerald', 'amber', 'purple'] as const;

  return (
    <div className="flex-1 w-full min-w-0 py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* 1. HERO: ABOUT SIM DREAM ISRAEL & THE FLIGHT EXPERIENCE */}
      <section className="text-center max-w-4xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-xs font-mono text-sky-400">
          <Plane className="w-3.5 h-3.5 -rotate-45" />
          <span>{copy.heroBadge}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          {copy.heroTitle}
        </h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          {copy.heroSubtitle}
        </p>

        {/* Key Trust Pillars Strip */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{copy.ratingLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>{copy.minAgePillar}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sky-300">
            <MapPin className="w-4 h-4 text-sky-400" />
            <span>{copy.locationPillar}</span>
          </span>
        </div>
      </section>

      {/* 2. HOW YOUR FLIGHT SESSION WORKS (STEP-BY-STEP MISSION TIMELINE) */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <Badge variant="sky">{copy.stepsBadge}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {copy.stepsTitle}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            {copy.stepsSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {copy.missionSteps.map((item) => (
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
          <Badge variant="emerald">{copy.audienceBadge}</Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            {copy.audienceTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {copy.audienceProfiles.map((profile, idx) => {
            const IconComponent = profileIcons[idx] || Users;
            const accent = profileAccents[idx] || 'sky';
            return (
              <Card key={idx} borderAccent={accent} className="flex items-start gap-4 p-6">
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
              <span>{copy.hoursTitle}</span>
            </div>
            <p className="text-sm font-bold text-white">{copy.hoursVal}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{copy.hoursDesc}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs uppercase font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{copy.ageTitle}</span>
            </div>
            <p className="text-sm font-bold text-white">{copy.ageVal}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{copy.ageDesc}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase font-bold">
              <Globe className="w-4 h-4" />
              <span>{copy.locTitle}</span>
            </div>
            <p className="text-sm font-bold text-white">{copy.locVal}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{copy.locDesc}</p>
          </div>
        </div>
      </section>

      {/* 5. Official Social Channels */}
      <section aria-labelledby="official-socials" className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-6 sm:p-8 text-center space-y-5">
        <div className="max-w-2xl mx-auto space-y-2">
          <h2 id="official-socials" className="text-2xl sm:text-3xl font-black text-white">
            {copy.socialTitle}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">{copy.socialSubtitle}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={FACILITY_INFO.social.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-orange-500 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Instagram aria-hidden="true" className="h-5 w-5 text-[#E4405F]" />
            <span>Instagram</span>
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
          </a>
          <a
            href={FACILITY_INFO.social.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-sky-500 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Facebook aria-hidden="true" className="h-5 w-5 text-[#1877F2]" />
            <span>Facebook</span>
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
          </a>
          <a
            href={FACILITY_INFO.social.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-orange-500 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Youtube aria-hidden="true" className="h-5 w-5 text-[#FF0000]" />
            <span>YouTube</span>
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
          </a>
        </div>
      </section>

      {/* 6. CTA BOX */}
      <section className="text-center bg-gradient-to-r from-sky-900/30 via-slate-900/80 to-sky-900/30 border border-sky-500/30 rounded-2xl p-8 sm:p-10 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-black text-white">{t.cta.title}</h2>
        <p className="text-slate-300 max-w-xl mx-auto text-sm">{t.cta.subtitle}</p>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          <Link href="/book">
            <Button size="lg">{t.cta.bookFlight}</Button>
          </Link>
          <Link href="/experiences">
            <Button variant="outline" size="lg">{t.experiences.viewAll}</Button>
          </Link>
        </div>
      </section>

      {/* 7. SMALL-PRINT TECHNICAL SPECIFICATIONS (COMPACT COLLAPSIBLE <details> FOOTNOTE) */}
      <section className="pt-4 border-t border-slate-900">
        <details className="group rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-[11px] text-slate-400">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-mono text-xs text-slate-400 hover:text-slate-200">
            <span>{copy.specsSummary}</span>
            <ChevronDown
              aria-hidden="true"
              className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180 shrink-0"
            />
          </summary>
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] leading-relaxed text-slate-400">
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.specsVisualsTitle}
              </p>
              <p>{copy.specsVisualsDesc}</p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.specsControlsTitle}
              </p>
              <p>{copy.specsControlsDesc}</p>
            </div>
            <div>
              <p className="font-mono text-slate-300 font-semibold mb-1">
                {copy.specsNoticeTitle}
              </p>
              <p>{copy.specsNoticeDesc}</p>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
