'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';

/**
 * The Flight Deck has one customer identity authority: Wix Members. The Wix
 * login page owns email registration, recovery, and enabled social providers,
 * then returns through the PKCE callback at `/wix/members/callback`.
 */
export default function LoginPage() {
  const { t, isRTL } = useLanguage();
  const { startWixMemberSignIn } = useAuth();
  const copy = t.member.login;
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const beginSignIn = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      await startWixMemberSignIn('/dashboard');
    } catch {
      setHasError(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8 hud-grid">
      <Card className="w-full max-w-md space-y-6 border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
        <div className="space-y-2 text-center">
          <BrandMark className="mx-auto h-14 w-14" />
          <h1 className="text-2xl font-black text-white">{copy.signInTitle}</h1>
          <p className="text-xs text-slate-400">{copy.signInSubtitle}</p>
        </div>

        {hasError && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{copy.requestFailed}</span>
          </div>
        )}

        <div className="space-y-3">
          <Button type="button" size="md" isLoading={isLoading} onClick={() => void beginSignIn()} className="w-full">
            <ShieldCheck className="h-4 w-4" />
            <span>{copy.signInSubmit}</span>
            <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
          <p className="text-center text-xs text-slate-400">{copy.guestLine}</p>
        </div>

        <p className="text-center text-xs text-slate-400">
          <Link href="/book" className="font-semibold text-sky-400 hover:text-sky-300 hover:underline">
            {copy.guestLink}
          </Link>
        </p>
      </Card>
    </div>
  );
}
