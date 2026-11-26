import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from './language-preference';
import type { Language } from './translations';

/**
 * The inline script in `app/layout.tsx` that hides the page for one hand-over only: the server always renders
 * Hebrew, so a visitor whose browser holds another saved language would otherwise see Hebrew flash before
 * `LanguageProvider` restores their choice. `html[data-language-pending='true'] body` hides it (app/globals.css).
 *
 * A first-time visitor, a Hebrew visitor, one whose storage is blocked and one on a routed locale URL
 * (`/en/...`, rendered in that language by the server) have nothing to hand over, so they get no attribute and
 * see the server HTML straight away instead of waiting for the client bundle to hydrate. The 3 s timer is the
 * fail-safe for a blocked or broken bundle; `LanguageProvider` removes the attribute as soon as it has resolved.
 *
 * Imports only the light `language-preference` module, never `translations.ts` (worker-bundle rules).
 */
const FAIL_SAFE_MS = 3000;

export function languagePreferenceBootstrap(routedLanguage: Language | undefined): string | null {
  if (routedLanguage) return null;
  const supported = JSON.stringify(LANGUAGE_CODES);
  return (
    `(()=>{try{const s=localStorage.getItem('simdream_lang');` +
    `if(!s||s===${JSON.stringify(DEFAULT_LANGUAGE)}||${supported}.indexOf(s)<0)return;` +
    `const r=document.documentElement;r.setAttribute('data-language-pending','true');` +
    `window.setTimeout(()=>r.removeAttribute('data-language-pending'),${FAIL_SAFE_MS})}catch{}})()`
  );
}
