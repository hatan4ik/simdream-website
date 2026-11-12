import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES } from '@/lib/i18n/language-preference';
import { LANGUAGES } from '@/lib/i18n/translations';
import { REPO_ROOT, parseSource, sourceFiles } from './_support/source';

/**
 * Guards for the Wix worker budget (docs/modules/wix-bundle-diet.md). The worker is bundled from
 * every server chunk, and a module that two Turbopack layers both import is bundled twice, so a
 * large table that a server component reaches by accident costs its size once per layer.
 */

const relative = (file: string) => path.relative(REPO_ROOT, file).split(path.sep).join('/');

/** True when the file imports a value (not only types) from a module whose specifier matches. */
function importsValueFrom(file: string, matches: (specifier: string) => boolean): boolean {
  const source = parseSource(file);
  return source.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return false;
    if (!matches(statement.moduleSpecifier.text)) return false;
    const clause = statement.importClause;
    if (!clause) return true; // side-effect import
    if (clause.isTypeOnly) return false;
    if (clause.name) return true; // default import
    const bindings = clause.namedBindings;
    if (!bindings) return true;
    if (ts.isNamespaceImport(bindings)) return true;
    return bindings.elements.some((element) => !element.isTypeOnly);
  });
}

describe('language codes (kept outside translations.ts)', () => {
  it('lists the interface languages in the order of LANGUAGES', () => {
    expect([...LANGUAGE_CODES]).toEqual(LANGUAGES.map((language) => language.code));
  });
});

describe('the root layout graph does not bundle the translation tables a second time', () => {
  // These files run in the React Server Components layer for every page. `translations.ts` is
  // 380 KB: a value import from it here put a second copy into the worker (0.30 MiB, measured).
  const serverEntryFiles = [
    path.join(REPO_ROOT, 'app/layout.tsx'),
    ...sourceFiles('lib/seo'),
    ...sourceFiles('components/seo'),
  ];

  it('scans real files', () => {
    expect(serverEntryFiles.length).toBeGreaterThan(5);
    expect(serverEntryFiles.some((file) => relative(file) === 'lib/seo/structured-data.ts')).toBe(true);
  });

  it.each(serverEntryFiles.map((file) => [relative(file), file] as const))(
    '%s imports no value from lib/i18n/translations',
    (_name, file) => {
      const text = readFileSync(file, 'utf8');
      expect(text.length).toBeGreaterThan(0);
      expect(importsValueFrom(file, (specifier) => /(^|\/)i18n\/translations$/.test(specifier))).toBe(false);
    }
  );
});
