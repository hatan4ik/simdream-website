import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConsentDialog } from '@/components/consent/ConsentDialog';
import { PackageInclusionsDialog } from '@/components/scheduler/PackageInclusionsDialog';
import { BOOKING_BLUEPRINT_COPY } from '@/lib/i18n/booking-blueprint-copy';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const read = (file: string) => readFileSync(path.join(REPO_ROOT, file), 'utf8');

const consentHtml = renderToStaticMarkup(
  React.createElement(LanguageProvider, { initialLanguage: 'en', children: React.createElement(ConsentDialog, {}) }),
);
const inclusionsHtml = renderToStaticMarkup(
  React.createElement(PackageInclusionsDialog, {
    pkg: SIMULATOR_PACKAGES[0],
    copy: BOOKING_BLUEPRINT_COPY.en,
    isRTL: false,
    onClose: () => undefined,
    onSelect: () => undefined,
    overlayClassName: 'overlay',
    panelClassName: 'panel',
    selectButtonClassName: 'select',
  }),
);

describe('modal dialogs are native <dialog> elements', () => {
  it.each([
    ['consent settings', consentHtml, 'consent-dialog-title'],
    ['package inclusions', inclusionsHtml, 'blueprint-modal-title'],
  ])('%s is a <dialog> named by its heading, with no ARIA the element already provides', (_name, html, titleId) => {
    expect(html).toMatch(/<dialog\b/);
    expect(html).toContain(`aria-labelledby="${titleId}"`);
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('aria-modal');
  });

  it('keeps the consent dialog hook for the privacy tests', () => {
    expect(consentHtml).toContain('data-consent-dialog');
  });

  it('no longer carries the hand-written focus traps the platform replaces', () => {
    expect(existsSync(path.join(REPO_ROOT, 'lib/ui/use-modal-focus.ts'))).toBe(false);
    expect(existsSync(path.join(REPO_ROOT, 'components/consent/use-dialog-focus.ts'))).toBe(false);
    for (const file of [
      'components/scheduler/AmazonFlightStorefront.tsx',
      'components/scheduler/KantorovichCalendarScheduler.tsx',
      'components/scheduler/PackageInclusionsDialog.tsx',
      'components/consent/ConsentDialog.tsx',
    ]) {
      expect(read(file), file).not.toMatch(/useModalFocus|useDialogFocus|aria-modal/);
    }
  });

  it('stops the page scrolling under a modal with overscroll containment, never a body lock', () => {
    const css = read('app/globals.css');
    expect(css).toMatch(/dialog:modal\s*\{[^}]*overscroll-behavior:\s*contain/);
    expect(css).toMatch(/dialog::backdrop\s*\{[^}]*overflow:\s*hidden[^}]*overscroll-behavior:\s*contain/);
  });
});
