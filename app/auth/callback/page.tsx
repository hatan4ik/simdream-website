'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Plane } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const next = useMemo(() => safeRedirectPath(searchParams.get('next')), [searchParams]);
  const code = searchParams.get('code');

  useEffect(() => {
    const completeAuthentication = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError('Member authentication is not configured for this environment.');
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError('This sign-in link has expired or was already used. Please start again.');
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('We could not finish your sign-in. Please return to the member login page.');
        return;
      }

      const response = await fetch('/api/membership/bootstrap', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (!response.ok && response.status !== 403) {
        setError('Your account was created, but purchase history is temporarily unavailable. Please try again shortly.');
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
        <h1 className="text-xl font-black text-white">Member sign-in needs attention</h1>
        <p className="text-sm text-slate-400">{error}</p>
        <Link href="/login"><Button>Return to member login</Button></Link>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full p-8 space-y-5 text-center">
      <Plane className="w-8 h-8 text-sky-400 mx-auto -rotate-45 animate-pulse" />
      <h1 className="text-xl font-black text-white">Preparing your flight deck</h1>
      <p className="text-sm text-slate-400">Securely connecting your member profile and purchase history.</p>
    </Card>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 hud-grid">
      <Suspense
        fallback={
          <Card className="max-w-md w-full p-8 space-y-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-sky-400 mx-auto" />
            <p className="text-sm text-slate-400">Completing secure member sign-in…</p>
          </Card>
        }
      >
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
