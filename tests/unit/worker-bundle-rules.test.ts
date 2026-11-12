import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES } from '@/lib/i18n/language-preference';
import { LANGUAGES } from '@/lib/i18n/translations';
import { importEdges, rel } from './_support/import-graph';
import { REPO_ROOT, parseSource, sourceFiles } from './_support/source';

/**
 * Guards for the Wix worker budget (docs/modules/wix-bundle-diet.md). The worker is bundled from
 * every server chunk, and a module that two Turbopack layers both import is bundled twice, so a
 * large table that a server component reaches by accident costs its size once per layer.
 */

const relative = rel;

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

/**
 * The server renders the Hebrew default and nothing else (`app/layout.tsx` passes DEFAULT_LANGUAGE; a
 * visitor's saved language is restored in the browser). So text in the other five languages is never
 * needed in the worker. A module whose file name ends in `Intl`, `-intl` or `.intl` is CLIENT-ONLY: it
 * may be reached only through `next/dynamic(() => import(...), { ssr: false })` (Next keeps such an
 * import out of the server module graph) or from another client-only module. A plain `import()` in a
 * client component is NOT enough: the server bundle still includes that chunk.
 */
const CLIENT_ONLY_NAME = /(Intl|-intl|\.intl)\.tsx?$/;
const isClientOnly = (file: string) => CLIENT_ONLY_NAME.test(file);

/** Per-language copy that must be client-only for every language except Hebrew. */
const NON_HEBREW_COPY = /^lib\/legal\/content\/[a-z-]+\.(en|ru|fr|ar|es)\.ts$/;

describe('non-Hebrew copy stays out of the server graph', () => {
  const edges = importEdges();
  const clientOnlyFiles = [...new Set(edges.map((edge) => edge.to).filter(isClientOnly))];

  it('finds the client-only modules', () => {
    const names = clientOnlyFiles.map(relative);
    expect(names).toContain('lib/legal/loaders-intl.ts');
    expect(names).toContain('components/legal/rules/RulesBodyIntl.tsx');
    expect(names).toContain('components/legal/privacy/PrivacyBodyIntl.tsx');
    expect(names).toContain('components/booking/MediaReleaseLoaderIntl.tsx');
  });

  it.each(clientOnlyFiles.map((file) => [relative(file), file] as const))(
    '%s is imported only through dynamic(..., { ssr: false }) or by another client-only module',
    (_name, file) => {
      const offenders = edges
        .filter((edge) => edge.to === file && !edge.typeOnly && !edge.dynamicSsrFalse && !isClientOnly(edge.from))
        .map((edge) => `${relative(edge.from)} ${edge.dynamicImport ? 'import()' : 'import'} (not ssr: false)`);
      expect(offenders).toEqual([]);
    }
  );

  it('keeps every non-Hebrew legal body behind a client-only loader', () => {
    const importers = edges
      .filter((edge) => NON_HEBREW_COPY.test(relative(edge.to)) && !edge.typeOnly && !isClientOnly(edge.from))
      .map((edge) => `${relative(edge.from)} -> ${relative(edge.to)}`);
    expect(importers).toEqual([]);
  });
});
