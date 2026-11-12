/**
 * Tiny open/close state for the consent settings dialog, kept outside React so any control in the
 * page (the footer link, the privacy policy page, the banner) can open it without a provider.
 * `useSyncExternalStore` in components/consent subscribes to it.
 */
let open = false;
const listeners = new Set<() => void>();

function set(next: boolean): void {
  if (open === next) return;
  open = next;
  for (const listener of [...listeners]) listener();
}

export const openConsentSettings = (): void => set(true);
export const closeConsentSettings = (): void => set(false);
export const isConsentSettingsOpen = (): boolean => open;

export function subscribeConsentSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
