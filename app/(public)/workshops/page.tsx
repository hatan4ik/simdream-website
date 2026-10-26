'use client';

import React, { useId, useState } from 'react';
import {
  Users,
  Shield,
  Compass,
  CheckCircle2,
  Send,
  Building2,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CorporateGoal } from '@/types';
import { useLanguage } from '@/lib/i18n/language-context';

export default function WorkshopsPage() {
  const { t, isRTL } = useLanguage();
  const fieldId = useId();
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    teamSize: '8',
    targetDate: '',
    primaryGoal: 'high_stress_decision_making' as CorporateGoal,
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/workshops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The API expects a numeric team size and omits optional fields left blank.
        body: JSON.stringify({
          ...formData,
          teamSize: Number(formData.teamSize),
          targetDate: formData.targetDate || undefined,
          message: formData.message.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to submit inquiry');
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full min-w-0 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">
      {/* Header */}
      <div className="text-center max-w-4xl mx-auto space-y-4">
        <Badge variant="amber">{t.workshops.badge}</Badge>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
          {t.workshops.title}
        </h1>
        <p className="text-slate-300 text-lg leading-relaxed">
          {t.workshops.subtitle}
        </p>
      </div>

      {/* 3 Pillars of Aviation CRM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card glow borderAccent="amber" className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">{t.workshops.pillar2Title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            {t.workshops.pillar2Desc}
          </p>
        </Card>

        <Card glow borderAccent="sky" className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Threat & Error Management (TEM)</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            {t.workshops.description}
          </p>
        </Card>

        <Card glow borderAccent="emerald" className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">{t.workshops.pillar1Title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            {t.workshops.pillar1Desc}
          </p>
        </Card>
      </div>

      {/* Workshop Formats */}
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-black text-white">{t.workshops.formatsTitle}</h2>
          <p className="text-slate-400 text-sm">{t.workshops.formatsSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="sky">{t.workshops.mod1Badge}</Badge>
                <h3 className="text-2xl font-bold text-white mt-2">{t.workshops.mod1Title}</h3>
                <p className="text-xs font-mono text-slate-400">{t.workshops.mod1Meta}</p>
              </div>
              <span className="text-2xl font-black text-white font-mono">₪4,500</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300">
              {t.workshops.mod1Points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="amber">{t.workshops.mod2Badge}</Badge>
                <h3 className="text-2xl font-bold text-white mt-2">{t.workshops.mod2Title}</h3>
                <p className="text-xs font-mono text-slate-400">{t.workshops.mod2Meta}</p>
              </div>
              <span className="text-2xl font-black text-white font-mono">₪8,500</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300">
              {t.workshops.mod2Points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Inquiry Form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 sm:p-12 space-y-8 max-w-4xl mx-auto shadow-2xl">
        <div className="text-center space-y-2">
          <Badge variant="emerald">{t.workshops.inquiryBadge}</Badge>
          <h2 className="text-3xl font-black text-white">{t.workshops.inquiryTitle}</h2>
          <p className="text-slate-400 text-sm">
            {t.workshops.inquirySubtitle}
          </p>
        </div>

        {submitSuccess ? (
          <div className="p-8 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">{t.workshops.inquirySuccessTitle}</h3>
            <p className="text-slate-300 text-sm max-w-md mx-auto">
              {t.workshops.inquirySuccessMsg} <strong>{formData.email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div role="alert" className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor={`${fieldId}-company`} className="text-xs font-mono uppercase text-slate-300 font-semibold">
                  {t.workshops.companyName}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 rtl:left-auto rtl:right-3 top-3.5" />
                  <input
                    id={`${fieldId}-company`}
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder={t.workshops.companyPlaceholder}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-10 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor={`${fieldId}-contact`} className="text-xs font-mono uppercase text-slate-300 font-semibold">
                  {t.workshops.contactName}
                </label>
                <input
                  id={`${fieldId}-contact`}
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder={t.workshops.contactPlaceholder}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor={`${fieldId}-email`} className="text-xs font-mono uppercase text-slate-300 font-semibold">
                  {t.workshops.workEmail}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 rtl:left-auto rtl:right-3 top-3.5" />
                  <input
                    id={`${fieldId}-email`}
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sharon@company.com"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-10 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor={`${fieldId}-phone`} className="text-xs font-mono uppercase text-slate-300 font-semibold">
                  {t.workshops.workPhone}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 rtl:left-auto rtl:right-3 top-3.5" />
                  <input
                    id={`${fieldId}-phone`}
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+972-54-000-0000"
                    dir="ltr"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-10 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 text-left rtl:text-right"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor={`${fieldId}-team-size`} className="text-xs font-mono uppercase text-slate-300 font-semibold">
                  {t.workshops.teamSize}
                </label>
                <select
                  id={`${fieldId}-team-size`}
                  value={formData.teamSize}
                  onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="6">{t.workshops.teamSizeOptions[0]}</option>
                  <option value="8">{t.workshops.teamSizeOptions[1]}</option>
                  <option value="12">{t.workshops.teamSizeOptions[2]}</option>
                  <option value="20">{t.workshops.teamSizeOptions[3]}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor={`${fieldId}-target-date`} className="text-xs font-mono uppercase text-slate-300 font-semibold">
                  {t.workshops.targetDate}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3 rtl:left-auto rtl:right-3 top-3.5" />
                  <input
                    id={`${fieldId}-target-date`}
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-10 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor={`${fieldId}-goal`} className="text-xs font-mono uppercase text-slate-300 font-semibold">
                {t.workshops.primaryGoal}
              </label>
              <select
                id={`${fieldId}-goal`}
                value={formData.primaryGoal}
                onChange={(e) => setFormData({ ...formData, primaryGoal: e.target.value as CorporateGoal })}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="high_stress_decision_making">{t.workshops.goalHighStress}</option>
                <option value="leadership">{t.workshops.goalFlattening}</option>
                <option value="team_communication">{t.workshops.goalCommunication}</option>
                <option value="vip_incentive">{t.workshops.goalTeamBonding}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor={`${fieldId}-notes`} className="text-xs font-mono uppercase text-slate-300 font-semibold">
                {t.workshops.additionalNotes}
              </label>
              <textarea
                id={`${fieldId}-notes`}
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t.workshops.additionalNotesPlaceholder}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              className="w-full font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-glowAmber"
            >
              <Send className="w-4 h-4 text-slate-950" />
              <span>{isSubmitting ? t.workshops.submitting : t.workshops.submitInquiry}</span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
