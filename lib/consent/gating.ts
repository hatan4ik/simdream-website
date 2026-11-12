import { getDefaultConsentStore } from './default-store';
import type { ConsentStore } from './store';
import type { ConsentCategory } from './types';

/**
 * Runs `callback` once, as soon as `category` is allowed: immediately when it already is, otherwise
 * when the visitor grants it. Returns a function that cancels the wait.
 *
 * NOT USED ANYWHERE YET. It exists so that the day a tracker is added it is wired through consent
 * instead of around it. Withdrawal does not undo what the callback already started: stopping a
 * tracker that has loaded needs the tracker's own opt-out call or a page reload.
 */
export function whenConsented(
  category: ConsentCategory,
  callback: () => void,
  store: ConsentStore = getDefaultConsentStore()
): () => void {
  if (store.hasConsent(category)) {
    callback();
    return () => undefined;
  }
  let done = false;
  const unsubscribe = store.subscribe(() => {
    if (done || !store.hasConsent(category)) return;
    done = true;
    unsubscribe();
    callback();
  });
  return () => {
    done = true;
    unsubscribe();
  };
}

/** The slice of `document` that `loadScriptWhenConsented` touches (a test passes a fake). */
export interface ScriptHost {
  head: { appendChild(node: unknown): unknown };
  querySelector(selector: string): unknown;
  createElement(tag: 'script'): {
    src: string;
    async: boolean;
    setAttribute(name: string, value: string): void;
  };
}

export interface LoadScriptWhenConsentedOptions {
  category: ConsentCategory;
  src: string;
  /** The per-request CSP nonce (app/layout.tsx reads it from the `x-nonce` header). */
  nonce?: string;
  host?: ScriptHost;
  store?: ConsentStore;
}

/** Escapes the two characters that could end a quoted attribute selector early. */
function escapeAttributeValue(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

/**
 * Appends `<script src async nonce>` to the head once, after consent for `category`. A second call
 * for the same `src` adds nothing. The CSP (proxy.ts) must also allow the script's origin first.
 *
 * NOT USED ANYWHERE YET, see `whenConsented`.
 */
export function loadScriptWhenConsented({
  category,
  src,
  nonce,
  host = document as unknown as ScriptHost,
  store,
}: LoadScriptWhenConsentedOptions): () => void {
  return whenConsented(
    category,
    () => {
      if (host.querySelector(`script[data-consent-src="${escapeAttributeValue(src)}"]`)) return;
      const script = host.createElement('script');
      script.src = src;
      script.async = true;
      script.setAttribute('data-consent-src', src);
      if (nonce) script.setAttribute('nonce', nonce);
      host.head.appendChild(script);
    },
    store
  );
}
