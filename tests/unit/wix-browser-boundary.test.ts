import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { importEdges, rel } from './_support/import-graph';
import { REPO_ROOT, parseSource, sourceFiles, walk } from './_support/source';

/**
 * The browser/server boundary of the Wix adapters (AGENTS.md §6.7).
 *
 *  - `lib/wix/cart-v2-shared.ts` holds the environment-neutral Cart V2 mechanics both adapters use. It
 *    imports no value at all, reads no `process.env` and so can create no Wix client: every function that
 *    talks to Wix takes the caller's `fetchWithAuth`.
 *  - Browser code never reaches a server module. The entries are every `'use client'` file, the browser
 *    adapters (`lib/wix/booking-checkout-client.ts`, `lib/wix/booking-cart-create.ts`, `lib/booking/client/*`)
 *    and the shared module. Following value imports, re-exports and `import()` at any depth, none of them may
 *    reach a module that imports `server-only`, the server Gift Card adapter, or
 *    `lib/wix/birthday-pricing-config.ts`. That module has no `server-only` marker on purpose (plain-Node
 *    `npm run wix:readiness` imports it) but reads the pricing provider's secrets from the environment.
 *
 * Not covered: imports of packages under node_modules (the walk stays inside app/, components/ and lib/),
 * `import type` (erased at build time), and environment reads in modules the browser reaches indirectly
 * (`lib/wix/catalog.ts` reads optional plan ids; only the shared module and the adapters are held to no reads).
 */

const file = (repoRelative: string) => path.join(REPO_ROOT, repoRelative);

const SHARED_MODULE = file('lib/wix/cart-v2-shared.ts');
const BIRTHDAY_PRICING_CONFIG = file('lib/wix/birthday-pricing-config.ts');
const SERVER_ADAPTERS = [file('lib/wix/gift-cards.ts')];
const BROWSER_ADAPTERS = [
  file('lib/wix/booking-checkout-client.ts'),
  file('lib/wix/booking-cart-create.ts'),
  ...sourceFiles('lib/booking/client'),
];

const valueImports = new Map<string, string[]>();
for (const edge of importEdges()) {
  if (edge.typeOnly) continue;
  valueImports.set(edge.from, [...(valueImports.get(edge.from) ?? []), edge.to]);
}

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
function reachableFrom(entries: readonly string[]): Map<string, string | null> {
  const reachedBy = new Map<string, string | null>(entries.map((entry) => [entry, null]));
  const queue = [...entries];
  for (let current = queue.shift(); current; current = queue.shift()) {
    for (const next of valueImports.get(current) ?? []) {
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

function importsServerOnly(source: ts.SourceFile): boolean {
  return source.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === 'server-only'
  );
}

/** Each `process.env.NAME` or `process.env[...]` read in the file. */
function environmentReads(source: ts.SourceFile): string[] {
  const reads: string[] = [];
  walk(source, (node) => {
    if (!(ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))) return;
    const target = node.expression;
    if (!ts.isPropertyAccessExpression(target) || target.name.text !== 'env') return;
    if (!ts.isIdentifier(target.expression) || target.expression.text !== 'process') return;
    reads.push(ts.isPropertyAccessExpression(node) ? node.name.text : node.argumentExpression.getText(source));
  });
  return reads;
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
    expect(environmentReads(parseSource(BIRTHDAY_PRICING_CONFIG))).toContain('name');
  });

  it('keeps both Wix adapters on the one shared Cart V2 module', () => {
    for (const adapter of [file('lib/wix/booking-checkout-client.ts'), file('lib/wix/booking-cart-create.ts'), ...SERVER_ADAPTERS]) {
      expect(valueImports.get(adapter) ?? [], rel(adapter)).toContain(SHARED_MODULE);
    }
  });

  it('the shared Cart V2 module imports no value and reads no environment', () => {
    const source = parseSource(SHARED_MODULE);
    expect(valueImportSpecifiers(source)).toEqual([]);
    expect(environmentReads(source)).toEqual([]);
    expect(importsServerOnly(source)).toBe(false);
  });

  it.each(BROWSER_ADAPTERS.map((adapter) => [rel(adapter), adapter] as const))('%s reads no process.env', (_name, adapter) => {
    expect(environmentReads(parseSource(adapter))).toEqual([]);
  });

  it('no browser-reachable module imports server-only', () => {
    const offenders = [...browserReach.keys()]
      .filter((reached) => importsServerOnly(parseSource(reached)))
      .map((reached) => importChain(browserReach, reached));
    expect(offenders).toEqual([]);
  });

  it('no browser-reachable module imports lib/wix/birthday-pricing-config.ts or a server Wix adapter', () => {
    const offenders = [BIRTHDAY_PRICING_CONFIG, ...SERVER_ADAPTERS]
      .filter((target) => browserReach.has(target))
      .map((target) => importChain(browserReach, target));
    expect(offenders).toEqual([]);
  });
});
