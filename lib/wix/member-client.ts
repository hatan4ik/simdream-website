'use client';

import { createClient, OAuthStrategy, type TokenStorage, type Tokens } from '@wix/sdk';
import { redirects } from '@wix/redirects';
import { members } from '@wix/members';
import { orders, plansV3 } from '@wix/pricing-plans';
import { messages } from '@wix/ai-site-chat';
import wixManagedProject from '../../wix.config.json';

const MEMBER_TOKENS_KEY = 'simdream_wix_member_tokens';
const MEMBER_OAUTH_DATA_KEY = 'simdream_wix_member_oauth_data';
export const WIX_MEMBER_SESSION_CHANGED_EVENT = 'simdream:wix-member-session-changed';

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

/** Public client-id guard for flows that can run as either a member or an anonymous visitor. */
export function isWixBrowserClientConfigured(): boolean {
  return Boolean(clientId);
}

function createWixMemberClient() {
  if (!clientId) {
    throw new Error('Wix member access is not configured for this environment.');
  }
  return createClient({
    modules: { redirects, members, orders, plansV3, messages },
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

/**
 * Gives the app's own same-origin API routes the short-lived Wix member access
 * token. Routes must verify it with Wix before using any member identity; an
 * email or member id from the browser is never accepted as authentication.
 */
export async function getWixMemberAccessToken(): Promise<string | null> {
  const client = getWixMemberClient();
  const tokens = client.auth.getTokens();
  const token = tokens.accessToken;
  // The Wix SDK represents `expiresAt` as Unix seconds, not JavaScript milliseconds.
  if (token.value && token.expiresAt > Math.floor(Date.now() / 1_000)) return token.value;
  if (!tokens.refreshToken.value) return null;

  try {
    const refreshed = await client.auth.renewToken(tokens.refreshToken);
    client.auth.setTokens(refreshed);
    return refreshed.accessToken.value || null;
  } catch {
    clearWixMemberSession();
    return null;
  }
}

/** Lets the shared React auth state refresh after the OAuth callback or logout. */
export function notifyWixMemberSessionChanged(): void {
  window.dispatchEvent(new Event(WIX_MEMBER_SESSION_CHANGED_EVENT));
}
