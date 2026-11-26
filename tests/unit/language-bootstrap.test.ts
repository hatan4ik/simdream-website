import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { languagePreferenceBootstrap } from '../../lib/i18n/language-bootstrap';
import { REPO_ROOT } from './_support/source';

// The server always renders Hebrew, so the body is hidden for the hand-over to a saved language only when
// there is a hand-over to hide. A first-time or Hebrew visitor must see the server HTML immediately: it must
// never wait for the client bundle to download, parse and hydrate (docs/DECISIONS.md, first-paint decision).

interface FakeDocument {
  documentElement: { setAttribute: ReturnType<typeof vi.fn>; removeAttribute: ReturnType<typeof vi.fn> };
}

function runBootstrap(script: string, storage: { getItem: (key: string) => string | null }) {
  const document: FakeDocument = {
    documentElement: { setAttribute: vi.fn(), removeAttribute: vi.fn() },
  };
  const timers: Array<{ callback: () => void; delay: number }> = [];
  const window = { setTimeout: (callback: () => void, delay: number) => timers.push({ callback, delay }) };
  new Function('localStorage', 'document', 'window', script)(storage, document, window);
  return { root: document.documentElement, timers };
}

const storageWith = (value: string | null) => ({ getItem: (key: string) => (key === 'simdream_lang' ? value : null) });

describe('languagePreferenceBootstrap', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not hide the page for a first-time visitor with no saved language', () => {
    const script = languagePreferenceBootstrap(undefined);
    expect(script).not.toBeNull();
    const { root, timers } = runBootstrap(script!, storageWith(null));
    expect(root.setAttribute).not.toHaveBeenCalled();
    expect(timers).toHaveLength(0);
  });

  it('does not hide the page when the saved language is Hebrew, the language the server renders', () => {
    const { root } = runBootstrap(languagePreferenceBootstrap(undefined)!, storageWith('he'));
    expect(root.setAttribute).not.toHaveBeenCalled();
  });

  it.each(['en', 'ru', 'fr', 'ar', 'es', 'de'])('hides only the hand-over to a saved %s and reveals it after the fail-safe', (saved) => {
    const { root, timers } = runBootstrap(languagePreferenceBootstrap(undefined)!, storageWith(saved));
    expect(root.setAttribute).toHaveBeenCalledWith('data-language-pending', 'true');
    expect(timers).toHaveLength(1);
    expect(timers[0].delay).toBe(3000);
    timers[0].callback();
    expect(root.removeAttribute).toHaveBeenCalledWith('data-language-pending');
  });

  it('ignores an unsupported saved value instead of hiding the page', () => {
    const { root } = runBootstrap(languagePreferenceBootstrap(undefined)!, storageWith('klingon'));
    expect(root.setAttribute).not.toHaveBeenCalled();
  });

  it('never throws when storage is blocked, and leaves the page visible', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    const { root } = runBootstrap(languagePreferenceBootstrap(undefined)!, blocked);
    expect(root.setAttribute).not.toHaveBeenCalled();
  });

  it('emits no script when the server already rendered a routed locale, because nothing is handed over', () => {
    expect(languagePreferenceBootstrap('en')).toBeNull();
    expect(languagePreferenceBootstrap('ru')).toBeNull();
  });
});

describe('app/layout.tsx wiring', () => {
  const layout = readFileSync(path.join(REPO_ROOT, 'app/layout.tsx'), 'utf8');

  it('builds the bootstrap from the routed locale and emits it with the request nonce only when there is one', () => {
    expect(layout).toContain('languagePreferenceBootstrap(routedLanguage)');
    expect(layout).toMatch(/\{languageBootstrap && <script nonce=\{nonce\} dangerouslySetInnerHTML=\{\{ __html: languageBootstrap \}\} \/>\}/);
  });

  it('no longer carries an unconditional inline hide', () => {
    expect(layout).not.toContain("setAttribute('data-language-pending'");
  });
});
