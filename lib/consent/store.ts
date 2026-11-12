import { CONSENT_CATEGORIES_IN_USE, CONSENT_RENEWAL_MONTHS, CONSENT_STORAGE_KEY, CONSENT_VERSION } from './config';
import {
  createConsentRecord,
  isCategoryAllowed,
  isConsentCurrent,
  optionalCategoriesInUse,
  parseConsentRecord,
  serializeConsentRecord,
} from './record';
import type { ConsentCategory, ConsentRecord, OptionalConsentCategory } from './types';

/** The part of `Storage` the store needs; a test passes an in-memory implementation. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ConsentStoreOptions {
  /** Where the record lives. `null` keeps it in memory only. Default: the browser's localStorage. */
  storage?: StorageLike | null;
  /** Clock seam for tests. */
  now?: () => Date;
  version?: number;
  renewalMonths?: number;
  /**
   * The categories the site really uses. Consent is only ever recorded for these: "accept all"
   * accepts exactly what was offered, and a choice for a category that is not in use is dropped.
   */
  categoriesInUse?: readonly ConsentCategory[];
}

export type ConsentChoices = Partial<Record<OptionalConsentCategory, boolean>>;

export interface ConsentStore {
  /** The current decision, or `null` when there is none, it is for an older version or it has expired. */
  getConsent(): ConsentRecord | null;
  hasConsent(category: ConsentCategory): boolean;
  /** Called after every change, including one made in another tab. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  acceptAll(): ConsentRecord;
  rejectNonEssential(): ConsentRecord;
  /** Saves exactly the given choices; an omitted optional category is off. */
  savePreferences(choices: ConsentChoices): ConsentRecord;
  /** Records "Got it" on the informational notice: nothing optional is in use, so nothing optional is on. */
  acknowledge(): ConsentRecord;
  /** Withdraws every optional category and stamps the withdrawal as the new decision. */
  withdraw(): ConsentRecord;
  /** Forgets the decision entirely, so the banner asks again. */
  clear(): void;
}

/** localStorage, or `null` where the browser refuses it (some private modes, blocked site data). */
export function resolveBrowserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function createConsentStore(options: ConsentStoreOptions = {}): ConsentStore {
  const storage = options.storage === undefined ? resolveBrowserStorage() : options.storage;
  const now = options.now ?? (() => new Date());
  const rules = {
    version: options.version ?? CONSENT_VERSION,
    renewalMonths: options.renewalMonths ?? CONSENT_RENEWAL_MONTHS,
  };
  const offered = optionalCategoriesInUse(options.categoriesInUse ?? CONSENT_CATEGORIES_IN_USE);

  // When the browser refuses to persist, the decision still holds for this page session.
  let memoryRaw: string | null = null;
  let storageBroken = storage === null;
  let cachedRaw: string | null | undefined;
  let cachedRecord: ConsentRecord | null = null;
  const listeners = new Set<() => void>();
  let detachStorageListener: (() => void) | null = null;

  function readRaw(): string | null {
    if (storage && !storageBroken) {
      try {
        return storage.getItem(CONSENT_STORAGE_KEY);
      } catch {
        storageBroken = true;
      }
    }
    return memoryRaw;
  }

  function writeRaw(value: string | null): void {
    memoryRaw = value;
    if (!storage || storageBroken) return;
    try {
      if (value === null) storage.removeItem(CONSENT_STORAGE_KEY);
      else storage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {
      storageBroken = true;
    }
  }

  function notify(): void {
    for (const listener of [...listeners]) listener();
  }

  function getConsent(): ConsentRecord | null {
    const raw = readRaw();
    // Same raw text, same object: useSyncExternalStore compares snapshots by identity.
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedRecord = parseConsentRecord(raw);
    }
    return cachedRecord && isConsentCurrent(cachedRecord, now(), rules) ? cachedRecord : null;
  }

  function commit(choices: ConsentChoices): ConsentRecord {
    const offeredChoices: ConsentChoices = {};
    for (const category of offered) offeredChoices[category] = choices[category] === true;
    const record = createConsentRecord(offeredChoices, now(), rules.version);
    writeRaw(serializeConsentRecord(record));
    notify();
    return record;
  }

  function attachStorageListener(): void {
    if (detachStorageListener || typeof window === 'undefined' || storage === null) return;
    const onStorage = (event: StorageEvent) => {
      // `key === null` is storage.clear() in another tab.
      if (event.key === null || event.key === CONSENT_STORAGE_KEY) notify();
    };
    window.addEventListener('storage', onStorage);
    detachStorageListener = () => window.removeEventListener('storage', onStorage);
  }

  return {
    getConsent,
    hasConsent: (category) => isCategoryAllowed(getConsent(), category),
    subscribe(listener) {
      listeners.add(listener);
      attachStorageListener();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && detachStorageListener) {
          detachStorageListener();
          detachStorageListener = null;
        }
      };
    },
    acceptAll: () => commit({ preferences: true, analytics: true, marketing: true }), // filtered to what is offered
    rejectNonEssential: () => commit({}),
    savePreferences: (choices) => commit(choices),
    acknowledge: () => commit({}),
    withdraw: () => commit({}),
    clear() {
      writeRaw(null);
      notify();
    },
  };
}
