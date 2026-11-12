'use client';

import { useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  Headphones,
  MapPin,
  Monitor,
  Send,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClassName } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  GROUND_SCHOOL_TUITION_ILS,
  groundSchoolCopy,
  type GroundSchoolModality,
  type GroundSchoolPathway,
} from '@/lib/data/ground-school';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language } from '@/lib/i18n/translations';

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  pathway: GroundSchoolPathway;
  modality: GroundSchoolModality;
  focusTopics: string;
  consent: boolean;
};

const initialFormState: FormState = {
  fullName: '',
  email: '',
  phone: '',
  pathway: 'faa',
  modality: 'hybrid',
  focusTopics: '',
  consent: false,
};

const advantageIcons = [MapPin, Headphones, UsersRound, BookOpenCheck] as const;
const formatIcons = [Monitor, MapPin, CalendarDays] as const;

const priceLocales: Record<Language, string> = {
  he: 'he-IL',
  en: 'en-IL',
  ru: 'ru-IL',
  fr: 'fr-IL',
  ar: 'ar-IL-u-nu-latn',
  es: 'es-IL',
};

function publicTuition(language: Language): string {
  return new Intl.NumberFormat(priceLocales[language], {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(GROUND_SCHOOL_TUITION_ILS);
}

/**
 * A cohort-information request, intentionally isolated from the simulator
 * checkout: no payment is taken and no training seat is asserted by this form.
 */
export function GroundSchoolView() {
  const { language, isRTL, t } = useLanguage();
  const c = groundSchoolCopy(language);
  const fieldId = useId();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/ground-school/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          focusTopics: form.focusTopics.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(responseBody?.error || c.formError);
      }
      setSubmitted(true);
      setForm(initialFormState);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : c.formError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <section aria-labelledby="ground-school-title" className="mx-auto max-w-4xl text-center">
        <Badge variant="sky">{c.heroBadge}</Badge>
        <h1 id="ground-school-title" className="mt-5 text-pretty text-4xl font-black tracking-tight text-white sm:text-6xl">
          {c.heroTitle}
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-pretty text-base leading-8 text-slate-300 sm:text-lg">{c.heroSubtitle}</p>
        <a
          href="#enrollment"
          data-ui-control="button"
          data-button-variant="primary"
          className={buttonClassName('primary', 'lg', 'mt-8')}
        >
          {c.heroCta}
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </a>
      </section>

      <section aria-labelledby="ground-school-overview" className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div className="space-y-4">
          <Badge variant="emerald">{c.overviewBadge}</Badge>
          <h2 id="ground-school-overview" className="text-pretty text-3xl font-black tracking-tight text-white sm:text-4xl">
            {c.overviewTitle}
          </h2>
          <p className="max-w-3xl text-pretty text-base leading-8 text-slate-300">{c.overview}</p>
        </div>
        <Card borderAccent="sky" className="space-y-4 p-6 sm:p-8">
          <GraduationCap className="h-10 w-10 text-sky-400" aria-hidden="true" />
          <p className="text-lg font-semibold leading-7 text-white">{c.supportTitle}</p>
          <p className="text-sm leading-7 text-slate-300">{c.supportDescription}</p>
        </Card>
      </section>

      <section aria-labelledby="ground-school-advantages">
        <h2 id="ground-school-advantages" className="text-pretty text-3xl font-black tracking-tight text-white sm:text-4xl">
          {c.advantagesTitle}
        </h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.advantages.map((advantage, index) => {
            const Icon = advantageIcons[index];
            return (
              <Card key={advantage.title} borderAccent="sky" className="space-y-3 p-5">
                <Icon className="h-6 w-6 text-sky-400" aria-hidden="true" />
                <h3 className="text-lg font-bold text-white">{advantage.title}</h3>
                <p className="text-sm leading-6 text-slate-300">{advantage.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="ground-school-schedule" className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
        <Badge variant="amber">{c.scheduleBadge}</Badge>
        <h2 id="ground-school-schedule" className="mt-4 text-pretty text-3xl font-black tracking-tight text-white sm:text-4xl">
          {c.scheduleTitle}
        </h2>
        <p className="mt-3 max-w-4xl text-pretty leading-7 text-slate-300">{c.scheduleSubtitle}</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {c.modules.map((module, index) => (
            <li key={module.week} className="relative border-s-2 border-sky-400/60 ps-5">
              <span className="text-sm font-semibold text-sky-400">{module.week}</span>
              <h3 className="mt-1 text-lg font-bold text-white">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{module.description}</p>
              <span className="sr-only">{index + 1} of {c.modules.length}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ground-school-format" className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)]">
        <div>
          <h2 id="ground-school-format" className="text-pretty text-3xl font-black tracking-tight text-white sm:text-4xl">
            {c.formatTitle}
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {c.formatItems.map((item, index) => {
              const Icon = formatIcons[index];
              return (
                <li key={item} className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm font-semibold text-slate-100">
                  <Icon className="h-5 w-5 shrink-0 text-sky-400" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <Card borderAccent="emerald" className="flex flex-col justify-center gap-2 p-6 sm:p-8">
          <span className="text-sm font-semibold uppercase tracking-wide text-emerald-400">{c.tuitionLabel}</span>
          <p className="text-4xl font-black tracking-tight text-white" dir="ltr">{publicTuition(language)}</p>
          <p className="text-sm leading-6 text-slate-300">{c.tuitionDetail}</p>
        </Card>
      </section>

      <section id="enrollment" aria-labelledby="ground-school-request" className="scroll-mt-28 grid gap-8 rounded-3xl border border-sky-500/25 bg-sky-500/5 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,1.1fr)]">
        <div className="space-y-4">
          <Badge variant="sky">{c.navLabel}</Badge>
          <h2 id="ground-school-request" className="text-pretty text-3xl font-black tracking-tight text-white sm:text-4xl">
            {c.requestTitle}
          </h2>
          <p className="text-pretty leading-7 text-slate-300">{c.requestDescription}</p>
          <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <p className="font-semibold">{c.disclosureTitle}</p>
              <p className="mt-1 text-amber-100/90">{c.disclosure}</p>
            </div>
          </div>
        </div>

        {submitted ? (
          <div role="status" aria-live="polite" className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" aria-hidden="true" />
            <h3 className="mt-4 text-2xl font-bold text-white">{c.formSuccessTitle}</h3>
            <p className="mt-3 max-w-md leading-7 text-slate-300">{c.formSuccessDescription}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" aria-describedby={`${fieldId}-privacy`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-slate-100" htmlFor={`${fieldId}-name`}>
                {c.formName}
                <input id={`${fieldId}-name`} name="fullName" value={form.fullName} onChange={(event) => update('fullName', event.target.value)} autoComplete="name" required maxLength={120} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none transition-colors placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-100" htmlFor={`${fieldId}-email`}>
                {c.formEmail}
                <input id={`${fieldId}-email`} name="email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" required maxLength={254} dir="ltr" className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none transition-colors placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30" />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-slate-100" htmlFor={`${fieldId}-phone`}>
              {c.formPhone}
              <input id={`${fieldId}-phone`} name="phone" type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" required minLength={6} maxLength={32} dir="ltr" className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none transition-colors placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-slate-100" htmlFor={`${fieldId}-pathway`}>
                {c.formPathway}
                <select id={`${fieldId}-pathway`} name="pathway" value={form.pathway} onChange={(event) => update('pathway', event.target.value as GroundSchoolPathway)} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30">
                  {(Object.keys(c.pathwayOptions) as GroundSchoolPathway[]).map((pathway) => <option key={pathway} value={pathway}>{c.pathwayOptions[pathway]}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-100" htmlFor={`${fieldId}-modality`}>
                {c.formModality}
                <select id={`${fieldId}-modality`} name="modality" value={form.modality} onChange={(event) => update('modality', event.target.value as GroundSchoolModality)} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30">
                  {(Object.keys(c.modalityOptions) as GroundSchoolModality[]).map((modality) => <option key={modality} value={modality}>{c.modalityOptions[modality]}</option>)}
                </select>
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-slate-100" htmlFor={`${fieldId}-focus`}>
              {c.formFocus}
              <textarea id={`${fieldId}-focus`} name="focusTopics" value={form.focusTopics} onChange={(event) => update('focusTopics', event.target.value)} maxLength={2_000} rows={4} placeholder={c.formFocusPlaceholder} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-white outline-none transition-colors placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30" />
            </label>
            <div className="flex items-start gap-3">
              <input id={`${fieldId}-consent`} name="consent" type="checkbox" checked={form.consent} onChange={(event) => update('consent', event.target.checked)} required className="mt-1 h-5 w-5 shrink-0 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-2 focus:ring-sky-400" />
              <label htmlFor={`${fieldId}-consent`} className="text-sm leading-6 text-slate-300">{c.formConsent}</label>
            </div>
            <p id={`${fieldId}-privacy`} className="text-sm text-slate-400">
              <Link href="/privacy-policy" className="text-sky-400 underline underline-offset-4 hover:text-sky-300">{t.footer.privacyPolicy}</Link>
            </p>
            {errorMessage && <p role="alert" className="flex gap-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-100"><CircleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />{errorMessage}</p>}
            <Button type="submit" isLoading={isSubmitting} className="w-full" disabled={!form.consent}>
              <Send className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} aria-hidden="true" />
              {isSubmitting ? c.formSubmitting : c.formSubmit}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
