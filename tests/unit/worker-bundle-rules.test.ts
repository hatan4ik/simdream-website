import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES } from '@/lib/i18n/language-preference';
import { LANGUAGES } from '@/lib/i18n/translations';
import { importEdges, importEdgesOf, rel } from './_support/import-graph';
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

/**
 * The Wix birthday routes (claim, pricing provider, offer capabilities) share one server chunk holding
 * `lib/wix/birthday-pricing-server.ts` and the `lib/wix/birthday-*` modules it imports, and one copy of
 * zod. Turbopack emits identical chunks under different names when routes reach the same modules in a
 * different order, and esbuild then bundles each name: measured 2026-11-15, the claim route importing
 * `birthday-claim-request` before `birthday-pricing-server` gave it its own copy of the birthday chunk
 * and of zod; moving that import removed 192,176 B from the worker (docs/modules/wix-bundle-diet.md,
 * section 7). So a route reaches those modules through `birthday-pricing-server` first: no import
 * before it may reach them.
 */
describe('the Wix birthday routes reach their shared modules through birthday-pricing-server first', () => {
  const server = path.join(REPO_ROOT, 'lib/wix/birthday-pricing-server.ts');
  const valueEdgesOf = (file: string) =>
    importEdgesOf(file).filter((edge) => !edge.typeOnly && !edge.dynamicImport && !edge.dynamicSsrFalse);
  const reachCache = new Map<string, Set<string>>();
  const reachable = (file: string): Set<string> => {
    const known = reachCache.get(file);
    if (known) return known;
    const reached = new Set<string>([file]);
    reachCache.set(file, reached);
    for (const edge of valueEdgesOf(file)) for (const target of reachable(edge.to)) reached.add(target);
    return reached;
  };
  const shared = [...reachable(server)].filter((file) => /^lib\/wix\/birthday-[a-z-]+\.ts$/.test(relative(file)));
  const routes = sourceFiles('app').filter(
    (file) => /\/route\.ts$/.test(file) && valueEdgesOf(file).some((edge) => edge.to === server)
  );

  it('finds the shared modules and the routes that import them', () => {
    expect(shared.map(relative)).toEqual(expect.arrayContaining(['lib/wix/birthday-pricing-server.ts', 'lib/wix/birthday-claim-request.ts']));
    expect(routes.map(relative)).toEqual(
      expect.arrayContaining([
        'app/api/offers/capabilities/route.ts',
        'app/api/wix/birthday-pricing/v1/calculate-price/route.ts',
        'app/api/wix/birthday/claim/route.ts',
      ])
    );
  });

  it.each(routes.map((file) => [relative(file), file] as const))(
    '%s imports nothing before birthday-pricing-server that reaches a lib/wix/birthday-* module',
    (_name, file) => {
      const edges = valueEdgesOf(file);
      const serverAt = edges.findIndex((edge) => edge.to === server);
      const early = edges
        .slice(0, serverAt)
        .filter((edge) => shared.some((module) => reachable(edge.to).has(module)))
        .map((edge) => relative(edge.to));
      expect(early).toEqual([]);
    }
  );
});
