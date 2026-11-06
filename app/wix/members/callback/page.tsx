'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { OauthData } from '@wix/sdk';
import {
  getWixMemberClient,
  notifyWixMemberSessionChanged,
  wixMemberOAuthStorageKey,
} from '@/lib/wix/member-client';
import { useAuth } from '@/lib/auth/auth-context';

function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string') return '/subscriptions';
  try {
    const target = new URL(value, window.location.origin);
    if (target.origin !== window.location.origin) return '/subscriptions';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/subscriptions';
  }
}

export default function WixMemberCallbackPage() {
  const router = useRouter();
  const { refreshWixMemberSession } = useAuth();
  const [message, setMessage] = useState('Completing your Wix member sign-in…');

  useEffect(() => {
    let active = true;
    async function completeLogin() {
      try {
        const client = getWixMemberClient();
        const raw = window.sessionStorage.getItem(wixMemberOAuthStorageKey());
        if (!raw) throw new Error('No Wix member login state was found.');
        const oAuthData = JSON.parse(raw) as OauthData;
        const returned = client.auth.parseFromUrl();
        if (returned.error) throw new Error(returned.errorDescription || returned.error);
        const tokens = await client.auth.getMemberTokens(returned.code, returned.state, oAuthData);
        client.auth.setTokens(tokens);
        window.sessionStorage.removeItem(wixMemberOAuthStorageKey());
        // Do not return to the app until the authenticated Wix profile has
        // reached the shared AuthProvider. This prevents an otherwise-successful
        // OAuth completion from appearing as a guest session outside checkout.
        const member = await refreshWixMemberSession();
        if (!member) throw new Error('Wix member profile could not be loaded.');
        notifyWixMemberSessionChanged();
        // This optimizes Wix-hosted pages such as native checkout. The Flight
        // Deck itself is authenticated by the member token above, so a cookie
        // pre-warm failure must never turn a completed Google/Wix login into a
        // guest session or block the return navigation.
        void client.auth.sessions.syncToWixPages({ force: true }).catch(() => undefined);
        router.replace(safeReturnPath(oAuthData.originalUri));
      } catch {
        if (active) setMessage('Wix member sign-in could not be completed. Please return to subscriptions and try again.');
      }
    }
    void completeLogin();
    return () => {
      active = false;
    };
  }, [refreshWixMemberSession, router]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <div className="space-y-3 text-slate-300">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-400" />
        <p className="text-sm">{message}</p>
      </div>
    </main>
  );
}
