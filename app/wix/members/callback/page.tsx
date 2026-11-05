'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { OauthData } from '@wix/sdk';
import { getWixMemberClient, wixMemberOAuthStorageKey } from '@/lib/wix/member-client';

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
        await client.auth.sessions.syncToWixPages({ force: true });
        window.sessionStorage.removeItem(wixMemberOAuthStorageKey());
        router.replace(safeReturnPath(oAuthData.originalUri));
      } catch {
        if (active) setMessage('Wix member sign-in could not be completed. Please return to subscriptions and try again.');
      }
    }
    void completeLogin();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <div className="space-y-3 text-slate-300">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-400" />
        <p className="text-sm">{message}</p>
      </div>
    </main>
  );
}
