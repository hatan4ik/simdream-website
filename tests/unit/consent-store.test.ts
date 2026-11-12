import { describe, expect, it, vi } from 'vitest';
import {
  CONSENT_STORAGE_KEY,
  createConsentStore,
  loadScriptWhenConsented,
  parseConsentRecord,
  syncConsentToWix,
  toWixConsentPolicy,
  whenConsented,
  type StorageLike,
  type WixConsentTarget,
} from '@/lib/consent';
import type { ScriptHost } from '@/lib/consent/gating';

/** A site that uses every optional category, so the tests can exercise all of them. */
const ALL = ['necessary', 'preferences', 'analytics', 'marketing'] as const;

class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

function clock(start: string) {
  let current = new Date(start);
  return {
    now: () => current,
    set(next: string) {
      current = new Date(next);
    },
  };
}

describe('consent store', () => {
  it('starts undecided and denies every optional category', () => {
    const store = createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ALL });
    expect(store.getConsent()).toBeNull();
    expect(store.hasConsent('necessary')).toBe(true);
    expect(store.hasConsent('analytics')).toBe(false);
  });

  it('persists "accept all" under the single storage key and survives a new store (a reload)', () => {
    const storage = new MemoryStorage();
    createConsentStore({ storage, categoriesInUse: ALL }).acceptAll();
    expect([...storage.data.keys()]).toEqual([CONSENT_STORAGE_KEY]);
    const reloaded = createConsentStore({ storage, categoriesInUse: ALL });
    expect(reloaded.hasConsent('analytics')).toBe(true);
    expect(reloaded.hasConsent('marketing')).toBe(true);
    expect(reloaded.hasConsent('preferences')).toBe(true);
  });

  it('persists "reject non-essential" as an explicit decision', () => {
    const storage = new MemoryStorage();
    const store = createConsentStore({ storage, categoriesInUse: ALL });
    store.rejectNonEssential();
    const reloaded = createConsentStore({ storage, categoriesInUse: ALL });
    expect(reloaded.getConsent()).not.toBeNull();
    expect(reloaded.hasConsent('analytics')).toBe(false);
  });

  it('saves exactly the chosen categories', () => {
    const store = createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ALL });
    store.savePreferences({ analytics: true });
    expect(store.hasConsent('analytics')).toBe(true);
    expect(store.hasConsent('marketing')).toBe(false);
    store.savePreferences({ marketing: true });
    expect(store.hasConsent('analytics')).toBe(false);
    expect(store.hasConsent('marketing')).toBe(true);
  });

  it('withdrawal switches everything optional off and stamps a new decision time', () => {
    const time = clock('2026-03-01T08:00:00.000Z');
    const store = createConsentStore({ storage: new MemoryStorage(), now: time.now, categoriesInUse: ALL });
    const accepted = store.acceptAll();
    time.set('2026-04-02T09:30:00.000Z');
    const withdrawn = store.withdraw();
    expect(store.hasConsent('analytics')).toBe(false);
    expect(store.hasConsent('marketing')).toBe(false);
    expect(withdrawn.decidedAt).toBe('2026-04-02T09:30:00.000Z');
    expect(withdrawn.decidedAt).not.toBe(accepted.decidedAt);
  });

  it('records consent only for the categories the site uses ("accept all" accepts what was offered)', () => {
    const store = createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ['necessary', 'analytics'] });
    expect(store.acceptAll().categories).toEqual({ necessary: true, preferences: false, analytics: true, marketing: false });
    expect(store.savePreferences({ marketing: true, analytics: false }).categories).toEqual({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
    });
  });

  it('with nothing optional in use (the shipped configuration) never records an optional yes', () => {
    const store = createConsentStore({ storage: new MemoryStorage() });
    expect(store.acceptAll().categories).toEqual({ necessary: true, preferences: false, analytics: false, marketing: false });
    expect(store.hasConsent('analytics')).toBe(false);
  });

  it('records "got it" on the informational notice with nothing optional on', () => {
    const store = createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ALL });
    const record = store.acknowledge();
    expect(record.categories).toEqual({ necessary: true, preferences: false, analytics: false, marketing: false });
    expect(store.getConsent()).toEqual(record);
  });

  it('forgets the decision on clear, so the banner asks again', () => {
    const storage = new MemoryStorage();
    const store = createConsentStore({ storage, categoriesInUse: ALL });
    store.acceptAll();
    store.clear();
    expect(store.getConsent()).toBeNull();
    expect(storage.data.size).toBe(0);
  });

  it('treats a decision older than 12 months as undecided and denies optional categories again', () => {
    const time = clock('2026-01-10T00:00:00.000Z');
    const storage = new MemoryStorage();
    const store = createConsentStore({ storage, now: time.now, categoriesInUse: ALL });
    store.acceptAll();
    time.set('2026-12-31T00:00:00.000Z');
    expect(store.hasConsent('analytics')).toBe(true);
    time.set('2027-01-10T00:00:00.000Z');
    expect(store.getConsent()).toBeNull();
    expect(store.hasConsent('analytics')).toBe(false);
  });

  it('treats a decision for another consent version as undecided', () => {
    const storage = new MemoryStorage();
    createConsentStore({ storage, version: 1, categoriesInUse: ALL }).acceptAll();
    const next = createConsentStore({ storage, version: 2, categoriesInUse: ALL });
    expect(next.getConsent()).toBeNull();
    expect(next.hasConsent('analytics')).toBe(false);
  });

  it('treats corrupt stored text as undecided', () => {
    const storage = new MemoryStorage();
    storage.setItem(CONSENT_STORAGE_KEY, '{"version":1,"decidedAt":"nope"}');
    expect(createConsentStore({ storage, categoriesInUse: ALL }).getConsent()).toBeNull();
  });

  it('returns the same object for the same stored decision (React snapshot identity)', () => {
    const store = createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ALL });
    store.acceptAll();
    expect(store.getConsent()).toBe(store.getConsent());
  });

  it('notifies subscribers on every change and stops after unsubscribe', () => {
    const store = createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ALL });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.acceptAll();
    store.withdraw();
    store.clear();
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    store.acceptAll();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('keeps the decision for the page session when storage refuses to write', () => {
    const blocked: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    const store = createConsentStore({ storage: blocked, categoriesInUse: ALL });
    expect(() => store.rejectNonEssential()).not.toThrow();
    expect(store.getConsent()).not.toBeNull();
    store.acceptAll();
    expect(store.hasConsent('analytics')).toBe(true);
  });

  it('works memory-only when there is no storage at all', () => {
    const store = createConsentStore({ storage: null, categoriesInUse: ALL });
    store.acceptAll();
    expect(store.hasConsent('marketing')).toBe(true);
    expect(parseConsentRecord(JSON.stringify(store.getConsent()))).not.toBeNull();
  });
});

describe('consent gating helpers', () => {
  it('runs the callback at once when the category is already allowed', () => {
    const store = createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ALL });
    store.acceptAll();
    const callback = vi.fn();
    whenConsented('analytics', callback, store);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('waits for consent, runs once, and ignores later changes', () => {
    const store = createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ALL });
    const callback = vi.fn();
    whenConsented('analytics', callback, store);
    expect(callback).not.toHaveBeenCalled();
    store.rejectNonEssential();
    expect(callback).not.toHaveBeenCalled();
    store.savePreferences({ analytics: true });
    store.acceptAll();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled before consent arrives', () => {
    const store = createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ALL });
    const callback = vi.fn();
    const cancel = whenConsented('marketing', callback, store);
    cancel();
    store.acceptAll();
    expect(callback).not.toHaveBeenCalled();
  });

  it('never runs a callback for necessary-only decisions on an optional category', () => {
    const store = createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ALL });
    const callback = vi.fn();
    whenConsented('marketing', callback, store);
    store.savePreferences({ analytics: true });
    expect(callback).not.toHaveBeenCalled();
  });

  function fakeHost(): ScriptHost & { scripts: Array<{ src: string; async: boolean; attributes: Record<string, string> }> } {
    const scripts: Array<{ src: string; async: boolean; attributes: Record<string, string> }> = [];
    return {
      scripts,
      head: { appendChild: (node) => scripts.push(node as (typeof scripts)[number]) },
      querySelector: (selector) => {
        const match = /data-consent-src="(.*)"\]$/.exec(selector);
        return scripts.find((script) => script.attributes['data-consent-src'] === match?.[1].replace(/\\(["\\])/g, '$1')) ?? null;
      },
      createElement: () => {
        const element = {
          src: '',
          async: false,
          attributes: {} as Record<string, string>,
          setAttribute(name: string, value: string) {
            element.attributes[name] = value;
          },
        };
        return element;
      },
    };
  }

  it('loads a script only after consent, once, with its nonce', () => {
    const store = createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ALL });
    const host = fakeHost();
    loadScriptWhenConsented({ category: 'analytics', src: 'https://example.test/a.js', nonce: 'abc123', host, store });
    expect(host.scripts).toHaveLength(0);
    store.rejectNonEssential();
    expect(host.scripts).toHaveLength(0);
    store.acceptAll();
    expect(host.scripts).toHaveLength(1);
    expect(host.scripts[0]).toMatchObject({ src: 'https://example.test/a.js', async: true });
    expect(host.scripts[0].attributes.nonce).toBe('abc123');
    loadScriptWhenConsented({ category: 'analytics', src: 'https://example.test/a.js', nonce: 'abc123', host, store });
    expect(host.scripts).toHaveLength(1);
  });
});

describe('Wix consent policy adapter', () => {
  const record = () => createConsentStore({ storage: new MemoryStorage(), categoriesInUse: ALL }).savePreferences({ analytics: true, preferences: true });

  it('maps our categories onto the documented Wix policy shape', () => {
    expect(toWixConsentPolicy(record().categories)).toEqual({
      essential: true,
      functional: true,
      analytics: true,
      advertising: false,
      dataToThirdParty: false,
    });
  });

  it('does nothing while the feature flag is off (the default)', () => {
    const setConsentPolicy = vi.fn();
    const target: WixConsentTarget = { consentPolicyManager: { setConsentPolicy }, addEventListener: vi.fn() };
    expect(syncConsentToWix(record, { target })).toBe('disabled');
    expect(setConsentPolicy).not.toHaveBeenCalled();
  });

  it('sends the policy when the Wix manager is on the page', () => {
    const setConsentPolicy = vi.fn();
    const target: WixConsentTarget = { consentPolicyManager: { setConsentPolicy }, addEventListener: vi.fn() };
    expect(syncConsentToWix(record, { enabled: true, target })).toBe('synced');
    expect(setConsentPolicy).toHaveBeenCalledWith({
      essential: true,
      functional: true,
      analytics: true,
      advertising: false,
      dataToThirdParty: false,
    });
  });

  it('waits for Wix\'s consentPolicyManagerReady event when the manager is not there yet', () => {
    let ready: (() => void) | undefined;
    const target: WixConsentTarget = {
      addEventListener: (_type, listener) => {
        ready = listener;
      },
    };
    expect(syncConsentToWix(record, { enabled: true, target })).toBe('waiting');
    const setConsentPolicy = vi.fn();
    target.consentPolicyManager = { setConsentPolicy };
    ready?.();
    expect(setConsentPolicy).toHaveBeenCalledTimes(1);
  });

  it('reports failure instead of throwing when Wix rejects the call', () => {
    const target: WixConsentTarget = {
      consentPolicyManager: {
        setConsentPolicy: () => {
          throw new Error('boom');
        },
      },
      addEventListener: vi.fn(),
    };
    expect(syncConsentToWix(record, { enabled: true, target })).toBe('failed');
  });
});
