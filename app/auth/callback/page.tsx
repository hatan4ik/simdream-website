'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Plane } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { useLanguage } from '@/lib/i18n/language-context';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

/**
 * Failure states are stored as translation keys, not resolved strings, so the
 * message follows the visitor's language (including the saved language that
 * loads after hydration) without re-running the single-use code exchange.
 */
type CallbackErrorKey =
  | 'errorNotConfigured'
  | 'errorLinkExpired'
  | 'errorSessionMissing'
  | 'errorHistoryUnavailable';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const copy = t.member.callback;
  const [error, setError] = useState<CallbackErrorKey | null>(null);
  const next = useMemo(() => safeRedirectPath(searchParams.get('next')), [searchParams]);
  const code = searchParams.get('code');

  useEffect(() => {
    const completeAuthentication = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError('errorNotConfigured');
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError('errorLinkExpired');
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('errorSessionMissing');
        return;
      }

      const response = await fetch('/api/membership/bootstrap', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (!response.ok && response.status !== 403) {
        setError('errorHistoryUnavailable');
        return;
      }
      router.replace(next);
    };

    void completeAuthentication();
  }, [code, next, router]);

  if (error) {
    return (
      <Card className="max-w-md w-full p-8 space-y-5 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <h1 className="text-xl font-black text-white">{copy.errorTitle}</h1>
        <p className="text-sm text-slate-400">{copy[error]}</p>
        <Link href="/login"><Button>{copy.returnToLogin}</Button></Link>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full p-8 space-y-5 text-center">
      <Plane className="w-8 h-8 text-sky-400 mx-auto -rotate-45 animate-pulse" />
      <h1 className="text-xl font-black text-white">{copy.preparingTitle}</h1>
      <p className="text-sm text-slate-400">{copy.preparingDescription}</p>
    </Card>
  );
}

function AuthCallbackFallback() {
  const { t } = useLanguage();
  return (
    <Card className="max-w-md w-full p-8 space-y-4 text-center">
      <CheckCircle2 className="w-8 h-8 text-sky-400 mx-auto" />
      <p className="text-sm text-slate-400">{t.member.callback.loadingFallback}</p>
    </Card>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 hud-grid">
      <Suspense fallback={<AuthCallbackFallback />}>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
