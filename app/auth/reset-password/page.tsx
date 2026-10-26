'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Plane } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/i18n/language-context';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

/**
 * Notices are stored as translation keys, not resolved strings, so an error or
 * the success notice re-renders in the visitor's language if it changes.
 */
type ResetPasswordErrorKey =
  | 'errorNotConfigured'
  | 'errorLinkInvalid'
  | 'errorTooShort'
  | 'errorMismatch'
  | 'errorUpdateFailed';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.member.resetPassword;
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdated, setIsUpdated] = useState(false);
  const [error, setError] = useState<ResetPasswordErrorKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadRecoverySession = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError('errorNotConfigured');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('errorLinkInvalid');
        return;
      }
      setReady(true);
    };
    void loadRecoverySession();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsUpdated(false);
    if (password.length < 12) {
      setError('errorTooShort');
      return;
    }
    if (password !== confirmPassword) {
      setError('errorMismatch');
      return;
    }
    if (!supabase) return;
    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);
    if (updateError) {
      setError('errorUpdateFailed');
      return;
    }
    setIsUpdated(true);
    router.replace('/dashboard');
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 hud-grid">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center mx-auto shadow-glow">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">{copy.title}</h1>
          <p className="text-xs text-slate-400">{copy.subtitle}</p>
        </div>

        {error && <p className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs">{copy[error]}</p>}
        {isUpdated && <p className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">{copy.successUpdated}</p>}

        {ready && (
          <form onSubmit={submit} className="space-y-4">
            <input
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={copy.newPasswordPlaceholder}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <input
              type="password"
              required
              minLength={12}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={copy.confirmPasswordPlaceholder}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              <Plane className="w-4 h-4 -rotate-45" />
              <span>{copy.submit}</span>
            </Button>
          </form>
        )}

        {!ready && !error && <p className="text-center text-sm text-slate-400">{copy.validating}</p>}
        <Link href="/login" className="block text-center text-xs text-sky-400 hover:underline">{copy.returnToLogin}</Link>
      </Card>
    </div>
  );
}
