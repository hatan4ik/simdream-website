'use client';

import { createClient, OAuthStrategy, type TokenStorage, type Tokens } from '@wix/sdk';
import { redirects } from '@wix/redirects';
import { members } from '@wix/members';
import { orders, plansV3 } from '@wix/pricing-plans';
import wixManagedProject from '../../wix.config.json';

const MEMBER_TOKENS_KEY = 'simdream_wix_member_tokens';
const MEMBER_OAUTH_DATA_KEY = 'simdream_wix_member_oauth_data';

const EMPTY_TOKENS: Tokens = {
  accessToken: { value: '', expiresAt: 0 },
  refreshToken: { value: '', role: 'NONE' },
};

function isTokens(value: unknown): value is Tokens {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as {
    accessToken?: { value?: unknown; expiresAt?: unknown };
    refreshToken?: { value?: unknown; role?: unknown };
  };
  return (
    typeof candidate.accessToken?.value === 'string' &&
    typeof candidate.accessToken?.expiresAt === 'number' &&
    typeof candidate.refreshToken?.value === 'string' &&
    typeof candidate.refreshToken?.role === 'string'
  );
}

const sessionTokenStorage: TokenStorage = {
  getTokens(): Tokens {
    try {
      const raw = window.sessionStorage.getItem(MEMBER_TOKENS_KEY);
      if (!raw) return EMPTY_TOKENS;
      const parsed: unknown = JSON.parse(raw);
      return isTokens(parsed) ? parsed : EMPTY_TOKENS;
    } catch {
      return EMPTY_TOKENS;
    }
  },
  setTokens(tokens: Tokens): void {
    if (!tokens.accessToken.value || !tokens.refreshToken.value) {
      window.sessionStorage.removeItem(MEMBER_TOKENS_KEY);
      return;
    }
    window.sessionStorage.setItem(MEMBER_TOKENS_KEY, JSON.stringify(tokens));
  },
};

const clientId =
  process.env.NEXT_PUBLIC_WIX_CLIENT_ID ||
  (process.env.NODE_ENV === 'production' && typeof wixManagedProject.appId === 'string'
    ? wixManagedProject.appId
    : undefined);

export type WixMemberClient = ReturnType<typeof createWixMemberClient>;

function createWixMemberClient() {
  if (!clientId) {
    throw new Error('Wix member access is not configured for this environment.');
  }
  return createClient({
    modules: { redirects, members, orders, plansV3 },
    auth: OAuthStrategy({ clientId, tokenStorage: sessionTokenStorage }),
  });
}

let cachedClient: WixMemberClient | null = null;

/** Browser-only client. It holds a member session in tab-scoped storage. */
export function getWixMemberClient(): WixMemberClient {
  if (!cachedClient) cachedClient = createWixMemberClient();
  return cachedClient;
}

export function clearWixMemberSession(): void {
  window.sessionStorage.removeItem(MEMBER_TOKENS_KEY);
  window.sessionStorage.removeItem(MEMBER_OAUTH_DATA_KEY);
  cachedClient?.auth.setTokens(EMPTY_TOKENS);
}

export function wixMemberOAuthStorageKey(): string {
  return MEMBER_OAUTH_DATA_KEY;
}
