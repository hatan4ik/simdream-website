import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Every contact field the visitor types is announced to the browser, so autofill can fill it. */
const CONTACT_FIELDS: Array<{ file: string; id: string; name: string; autoComplete: string }> = [
  { file: 'components/booking/PilotManifestForm.tsx', id: '-pilot-name', name: 'pilotName', autoComplete: 'name' },
  { file: 'components/booking/PilotManifestForm.tsx', id: '-pilot-email', name: 'pilotEmail', autoComplete: 'email' },
  { file: 'components/booking/PilotManifestForm.tsx', id: '-pilot-phone', name: 'pilotPhone', autoComplete: 'tel' },
  { file: 'app/(public)/workshops/page.tsx', id: '-company', name: 'companyName', autoComplete: 'organization' },
  { file: 'app/(public)/workshops/page.tsx', id: '-contact', name: 'contactName', autoComplete: 'name' },
  { file: 'app/(public)/workshops/page.tsx', id: '-email', name: 'email', autoComplete: 'email' },
  { file: 'app/(public)/workshops/page.tsx', id: '-phone', name: 'phone', autoComplete: 'tel' },
];

function inputTag(source: string, idSuffix: string): string {
  // Anchor on the input's own `id=`, not the label's `htmlFor=` that names the same suffix.
  const at = source.search(new RegExp(`\\bid=\\{\`\\$\\{\\w+\\}${idSuffix}\`\\}`));
  expect(at, `an input with id ending ${idSuffix}`).toBeGreaterThan(-1);
  const start = source.lastIndexOf('<input', at);
  return source.slice(start, source.indexOf('/>', at));
}

describe('contact fields announce themselves to browser autofill', () => {
  for (const field of CONTACT_FIELDS) {
    it(`${field.file} ${field.id} carries name and autoComplete`, () => {
      const tag = inputTag(readFileSync(path.join(REPO_ROOT, field.file), 'utf8'), field.id);
      expect(tag).toContain(`name="${field.name}"`);
      expect(tag).toContain(`autoComplete="${field.autoComplete}"`);
    });
  }
});
