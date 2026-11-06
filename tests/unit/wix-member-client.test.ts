import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeSessionStorage {
  clear(): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

function fakeBrowser() {
  const values = new Map<string, string>();
  const listeners = new Map<string, Set<EventListener>>();
  const sessionStorage: FakeSessionStorage = {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
  return {
    sessionStorage,
    addEventListener: (name: string, listener: EventListener) => {
      const current = listeners.get(name) ?? new Set<EventListener>();
      current.add(listener);
      listeners.set(name, current);
    },
    dispatchEvent: (event: Event) => {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
      return true;
    },
  };
}

async function loadMemberClient(renewToken = vi.fn()) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_WIX_CLIENT_ID', 'wix-test-client-id');
  vi.stubEnv('NODE_ENV', 'test');
  const browser = fakeBrowser();
  vi.stubGlobal('window', browser);

  vi.doMock('@wix/sdk', () => ({
    OAuthStrategy: (options: unknown) => options,
    createClient: (config: { auth: { tokenStorage: { getTokens(): unknown; setTokens(value: unknown): void } } }) => ({
      auth: {
        getTokens: () => config.auth.tokenStorage.getTokens(),
        setTokens: (tokens: unknown) => config.auth.tokenStorage.setTokens(tokens),
        renewToken,
      },
    }),
  }));
  return { browser, memberClient: await import('@/lib/wix/member-client') };
}

const VALID_TOKENS = {
  accessToken: { value: 'valid-wix-member-access-token', expiresAt: Math.floor(Date.now() / 1_000) + 600 },
  refreshToken: { value: 'member-refresh-token', role: 'MEMBER' },
};

afterEach(() => {
  vi.doUnmock('@wix/sdk');
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Wix member browser session', () => {
  it('keeps a valid access token tab-scoped and returns it for same-origin API calls', async () => {
    const { browser, memberClient } = await loadMemberClient();
    expect(memberClient.isWixBrowserClientConfigured()).toBe(true);
    const client = memberClient.getWixMemberClient();
    client.auth.setTokens(VALID_TOKENS as never);

    await expect(memberClient.getWixMemberAccessToken()).resolves.toBe(VALID_TOKENS.accessToken.value);
    expect(browser.sessionStorage.getItem('simdream_wix_member_tokens')).toContain(VALID_TOKENS.accessToken.value);
  });

  it('renews an expired token and clears the session when renewal is refused', async () => {
    const renewed = {
      accessToken: { value: 'renewed-wix-member-access-token', expiresAt: Math.floor(Date.now() / 1_000) + 600 },
      refreshToken: { value: 'renewed-refresh-token', role: 'MEMBER' },
    };
    const renewToken = vi.fn().mockResolvedValueOnce(renewed).mockRejectedValueOnce(new Error('expired refresh'));
    const { browser, memberClient } = await loadMemberClient(renewToken);
    const client = memberClient.getWixMemberClient();
    client.auth.setTokens({
      ...VALID_TOKENS,
      accessToken: { value: 'expired-wix-member-access-token', expiresAt: 1 },
    } as never);

    await expect(memberClient.getWixMemberAccessToken()).resolves.toBe(renewed.accessToken.value);
    expect(renewToken).toHaveBeenCalledTimes(1);

    client.auth.setTokens({
      ...renewed,
      accessToken: { value: 'expired-again', expiresAt: 1 },
    } as never);
    await expect(memberClient.getWixMemberAccessToken()).resolves.toBeNull();
    expect(browser.sessionStorage.getItem('simdream_wix_member_tokens')).toBeNull();
  });

  it('notifies shared auth state and clears OAuth state on explicit sign-out', async () => {
    const { browser, memberClient } = await loadMemberClient();
    const listener = vi.fn();
    browser.addEventListener(memberClient.WIX_MEMBER_SESSION_CHANGED_EVENT, listener);
    const client = memberClient.getWixMemberClient();
    client.auth.setTokens(VALID_TOKENS as never);
    browser.sessionStorage.setItem(memberClient.wixMemberOAuthStorageKey(), 'pending-pkce-state');

    memberClient.notifyWixMemberSessionChanged();
    memberClient.clearWixMemberSession();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(browser.sessionStorage.getItem('simdream_wix_member_tokens')).toBeNull();
    expect(browser.sessionStorage.getItem(memberClient.wixMemberOAuthStorageKey())).toBeNull();
  });

  it('fails safely for incomplete or corrupt session storage', async () => {
    const { browser, memberClient } = await loadMemberClient();
    const client = memberClient.getWixMemberClient();
    client.auth.setTokens({
      accessToken: { value: 'access-without-refresh', expiresAt: Math.floor(Date.now() / 1_000) + 600 },
      refreshToken: { value: '', role: 'NONE' },
    } as never);
    expect(browser.sessionStorage.getItem('simdream_wix_member_tokens')).toBeNull();

    browser.sessionStorage.setItem('simdream_wix_member_tokens', '{not-json');
    await expect(memberClient.getWixMemberAccessToken()).resolves.toBeNull();
  });
});
