import { createConsentStore, type ConsentStore } from './store';

let defaultStore: ConsentStore | null = null;

/**
 * The one store the app uses. Created on first use, in the browser it reads localStorage; during
 * server rendering it is memory-only and nothing ever writes to it (every writer is a click handler).
 */
export function getDefaultConsentStore(): ConsentStore {
  defaultStore ??= createConsentStore();
  return defaultStore;
}
