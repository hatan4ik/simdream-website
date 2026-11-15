import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { importEdges, importEdgesOf, rel } from './_support/import-graph';
import { REPO_ROOT, parseSource, sourceFiles, walk } from './_support/source';

/**
 * The browser/server boundary of the Wix adapters (AGENTS.md §6.7).
 *
 *  - `lib/wix/cart-v2-shared.ts` holds the environment-neutral Cart V2 mechanics both adapters use. It
 *    imports no value at all and so can create no Wix client: every function that talks to Wix takes the
 *    caller's `fetchWithAuth`.
 *  - The shared module, the other shared Cart V2 mechanics (`lib/wix/checkout-prefill.ts`,
 *    `lib/wix/cart-note.ts`) and the browser adapters never mention the `process` global, in any form.
 *  - Browser code never reaches a server module. The entries are every `'use client'` file, the browser
 *    adapters (`lib/wix/booking-checkout-client.ts`, `lib/wix/booking-cart-create.ts`, `lib/booking/client/*`)
 *    and the shared module. Following value imports, re-exports and `import()` at any depth, none of them may
 *    reach a module that imports `server-only` or one of SERVER_MODULES.
 *  - The walk resolves every relative and `@/` specifier, or fails: an unresolved one would hide every
 *    import behind it.
 *
 * Each rule is shown to fire on a planted violation (the `catches …` tests), so a green run means the
 * rule held, not that it could not see.
 *
 * Not covered: imports of packages under node_modules (the walk stays inside app/, components/ and lib/),
 * `import type` (erased at build time), `require()`, an `import()` whose argument is not a string literal,
 * and environment reads in modules the browser reaches indirectly (`lib/wix/catalog.ts` reads optional plan
 * ids; only the modules in ENVIRONMENT_FREE are held to no `process` at all).
 */

const file = (repoRelative: string) => path.join(REPO_ROOT, repoRelative);
const planted = (repoRelative: string, text: string) => parseSource(file(repoRelative), text);

const SHARED_MODULE = file('lib/wix/cart-v2-shared.ts');
const BIRTHDAY_PRICING_CONFIG = file('lib/wix/birthday-pricing-config.ts');
const SERVER_ADAPTERS = [file('lib/wix/gift-cards.ts')];
const BROWSER_ADAPTERS = [
  file('lib/wix/booking-checkout-client.ts'),
  file('lib/wix/booking-cart-create.ts'),
  ...sourceFiles('lib/booking/client'),
];

/** Modules that never mention `process`: the shared Cart V2 mechanics and the browser adapters. */
const ENVIRONMENT_FREE = [SHARED_MODULE, file('lib/wix/checkout-prefill.ts'), file('lib/wix/cart-note.ts'), ...BROWSER_ADAPTERS];

/** Server modules without a `server-only` marker that browser code must still never reach, and why. */
const SERVER_MODULES: Readonly<Record<string, string>> = {
  'lib/wix/birthday-pricing-config.ts':
    "reads the pricing provider's secrets; unmarked on purpose because plain-Node `npm run wix:readiness` imports it",
  'lib/wix/gift-cards.ts': 'the server Gift Card adapter',
  'lib/wix/client.ts':
    "the process-wide anonymous-visitor client; the browser's Wix session is lib/wix/member-client.ts (AGENTS.md §6.7)",
  'lib/stripe.ts': 'reads STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET',
  'lib/sendgrid.ts': 'reads SENDGRID_API_KEY',
};

type ImportGraph = ReadonlyMap<string, readonly string[]>;

function valueGraph(edges: ReturnType<typeof importEdges>): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.typeOnly) continue;
    graph.set(edge.from, [...(graph.get(edge.from) ?? []), edge.to]);
  }
  return graph;
}

const valueImports = valueGraph(importEdges());

function hasUseClientDirective(source: ts.SourceFile): boolean {
  for (const statement of source.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) return false;
    if (statement.expression.text === 'use client') return true;
  }
  return false;
}

const CLIENT_ENTRIES = [
  ...new Set([
    ...sourceFiles('app', 'components', 'lib').filter((entry) => hasUseClientDirective(parseSource(entry))),
    ...BROWSER_ADAPTERS,
    SHARED_MODULE,
  ]),
];

/** Every file reachable from `entries` by value imports, mapped to the file that first reached it. */
function reachableFrom(entries: readonly string[], graph: ImportGraph = valueImports): Map<string, string | null> {
  const reachedBy = new Map<string, string | null>(entries.map((entry) => [entry, null]));
  const queue = [...entries];
  for (let current = queue.shift(); current; current = queue.shift()) {
    for (const next of graph.get(current) ?? []) {
      if (reachedBy.has(next)) continue;
      reachedBy.set(next, current);
      queue.push(next);
    }
  }
  return reachedBy;
}

/** `entry -> … -> target`, the import chain the walk followed. */
function importChain(reachedBy: Map<string, string | null>, target: string): string {
  const names: string[] = [];
  for (let at: string | null | undefined = target; at; at = reachedBy.get(at)) names.unshift(rel(at));
  return names.join(' -> ');
}

/** The import chain to each of SERVER_MODULES that `reach` contains. */
function serverModulesReached(reach: Map<string, string | null>): string[] {
  return Object.keys(SERVER_MODULES)
    .map(file)
    .filter((target) => reach.has(target))
    .map((target) => importChain(reach, target));
}

function importsServerOnly(source: ts.SourceFile): boolean {
  return source.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === 'server-only'
  );
}

/**
 * Every mention of the `process` global, as `line: expression`. Any mention counts, not only
 * `process.env.NAME`: destructuring, an alias, `process['env']`, `globalThis.process` and
 * `Object.entries(process.env)` read the environment just as well. Comments do not count.
 *
 * No module in ENVIRONMENT_FREE reads the environment today, so there is no exception: a legitimate
 * `NEXT_PUBLIC_*` or `NODE_ENV` read would need its own per-file entry naming that exact expression and why.
 */
function processReferences(source: ts.SourceFile): string[] {
  const found: string[] = [];
  walk(source, (node) => {
    const mentionsProcess =
      (ts.isIdentifier(node) && node.text === 'process') ||
      (ts.isStringLiteralLike(node) &&
        node.text === 'process' &&
        ts.isElementAccessExpression(node.parent) &&
        node.parent.argumentExpression === node);
    if (!mentionsProcess) return;
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    found.push(`${line + 1}: ${node.parent.getText(source)}`);
  });
  return found;
}

/** Imports that put code in a bundle: any import that is not `import type` or all-`type` specifiers. */
function valueImportSpecifiers(source: ts.SourceFile): string[] {
  return source.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return [];
    const clause = statement.importClause;
    const named = clause?.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements : null;
    const typeOnly =
      clause !== undefined &&
      (clause.isTypeOnly || (!clause.name && named !== null && named.length > 0 && named.every((element) => element.isTypeOnly)));
    return typeOnly ? [] : [statement.moduleSpecifier.text];
  });
}

/** Planted environment reads, one per form the `process` rule must catch. */
const PLANTED_ENVIRONMENT_READS = [
  'export const key = process.env.WIX_API_KEY;',
  "export const key = process.env['WIX_API_KEY'];",
  'export const key = process?.env?.WIX_API_KEY;',
  'const { env } = process;\nexport const key = env.WIX_API_KEY;',
  'const { env: { WIX_API_KEY } } = process;\nexport const key = WIX_API_KEY;',
  'const proc = process;\nexport const key = proc.env.WIX_API_KEY;',
  "export const key = process['env'].WIX_API_KEY;",
  'export const key = globalThis.process.env.WIX_API_KEY;',
  "export const key = globalThis['process'].env.WIX_API_KEY;",
  'export const all = Object.entries(process.env);',
];

/** A planted browser file at `components/planted/Planted.tsx` with the given imports. */
function plantedClientReach(imports: string): Map<string, string | null> {
  const entry = file('components/planted/Planted.tsx');
  const graph = new Map(valueImports);
  for (const [from, targets] of valueGraph(importEdgesOf(entry, planted(rel(entry), `'use client';\n${imports}\n`)))) {
    graph.set(from, targets);
  }
  return reachableFrom([entry], graph);
}

const browserReach = reachableFrom(CLIENT_ENTRIES);

describe('the Wix browser boundary', () => {
  it('walks real client entries into lib/wix', () => {
    const entries = CLIENT_ENTRIES.map(rel);
    expect(entries.length).toBeGreaterThan(50);
    expect(entries).toContain('lib/wix/member-client.ts');
    expect(entries).toContain('lib/booking/client/wix-checkout-cart.ts');
    const reached = [...browserReach.keys()].map(rel);
    expect(reached).toContain('lib/wix/checkout-prefill.ts');
    expect(reached).toContain('lib/wix/catalog.ts');
  });

  it('detects what it guards against (a transitive config import, a server-only marker)', () => {
    const serverReach = reachableFrom([file('app/api/wix/birthday/claim/route.ts')]);
    expect(serverReach.has(BIRTHDAY_PRICING_CONFIG)).toBe(true);
    expect(importsServerOnly(parseSource(file('lib/wix/booking-checkout.ts')))).toBe(true);
    expect(processReferences(parseSource(BIRTHDAY_PRICING_CONFIG))).not.toEqual([]);
  });

  it.each(PLANTED_ENVIRONMENT_READS)('catches the planted environment read %j', (code) => {
    expect(processReferences(planted('lib/wix/planted.ts', code))).not.toEqual([]);
  });

  it('does not count a comment or a string that only names process', () => {
    const source = planted('lib/wix/planted.ts', "// process.env.WIX_API_KEY is read on the server.\nexport const label = 'process.env';\n");
    expect(processReferences(source)).toEqual([]);
  });

  it.each(Object.keys(SERVER_MODULES))('catches a planted browser import of %s', (target) => {
    const specifier = `@/${target.replace(/\.tsx?$/, '')}`;
    expect(serverModulesReached(plantedClientReach(`import * as planted from '${specifier}';`))).toContain(
      `components/planted/Planted.tsx -> ${target}`
    );
  });

  it('catches a planted browser import that reaches lib/wix/client.ts through the lib/wix barrel', () => {
    expect(serverModulesReached(plantedClientReach("import { getWixClient } from '@/lib/wix';"))).toContain(
      'components/planted/Planted.tsx -> lib/wix/index.ts -> lib/wix/client.ts'
    );
  });

  it('fails on a planted relative or @/ import it cannot resolve, and resolves assets and packages', () => {
    const at = 'lib/wix/planted.ts';
    expect(() => importEdgesOf(file(at), planted(at, "import { a } from './does-not-exist';"))).toThrow(
      "lib/wix/planted.ts: cannot resolve import './does-not-exist'"
    );
    expect(() => importEdgesOf(file(at), planted(at, "export * from '@/lib/wix/does-not-exist';"))).toThrow(
      "cannot resolve import '@/lib/wix/does-not-exist'"
    );
    expect(() => importEdgesOf(file(at), planted(at, "const late = () => import('../does-not-exist');"))).toThrow(
      "cannot resolve import '../does-not-exist'"
    );
    expect(() => importEdgesOf(file(at), planted(at, "import { a } from '@/lib/wix';"))).not.toThrow();
    expect(
      importEdgesOf(file(at), planted(at, "import config from '../../wix.config.json';\nimport { z } from 'zod';"))
    ).toEqual([]);
  });

  it('keeps both Wix adapters on the one shared Cart V2 module', () => {
    for (const adapter of [file('lib/wix/booking-checkout-client.ts'), file('lib/wix/booking-cart-create.ts'), ...SERVER_ADAPTERS]) {
      expect(valueImports.get(adapter) ?? [], rel(adapter)).toContain(SHARED_MODULE);
    }
  });

  it('the shared Cart V2 module imports no value and is no server-only module', () => {
    const source = parseSource(SHARED_MODULE);
    expect(valueImportSpecifiers(source)).toEqual([]);
    expect(importsServerOnly(source)).toBe(false);
  });

  it.each(ENVIRONMENT_FREE.map((module) => [rel(module), module] as const))('%s never mentions process', (_name, module) => {
    expect(processReferences(parseSource(module))).toEqual([]);
  });

  it('no browser-reachable module imports server-only', () => {
    const offenders = [...browserReach.keys()]
      .filter((reached) => importsServerOnly(parseSource(reached)))
      .map((reached) => importChain(browserReach, reached));
    expect(offenders).toEqual([]);
  });

  it(`no browser-reachable module reaches a server module (${Object.keys(SERVER_MODULES).join(', ')})`, () => {
    expect(serverModulesReached(browserReach)).toEqual([]);
  });
});
