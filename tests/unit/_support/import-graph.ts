import { existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { REPO_ROOT, parseSource, sourceFiles, walk } from './source';

export interface ImportEdge {
  from: string;
  to: string;
  /** `import type`, or every specifier is `type`: erased at build time, so it puts nothing in a bundle. */
  typeOnly: boolean;
  /** A `next/dynamic(() => import(...), { ssr: false })` call: the target stays out of the server graph. */
  dynamicSsrFalse: boolean;
  /** A dynamic `import()` that is not wrapped in `next/dynamic` with `ssr: false`. */
  dynamicImport: boolean;
}

export const rel = (file: string) => path.relative(REPO_ROOT, file).split(path.sep).join('/');

function resolveSpecifier(from: string, specifier: string): string | null {
  const base = specifier.startsWith('@/')
    ? path.join(REPO_ROOT, specifier.slice(2))
    : specifier.startsWith('.')
      ? path.resolve(path.dirname(from), specifier)
      : null;
  if (!base) return null;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx'), base]) {
    if (/\.tsx?$/.test(candidate) && existsSync(candidate)) return candidate;
  }
  return null;
}

/** True when this `import()` sits in `dynamic(loader, { ssr: false })`. */
function isDynamicSsrFalse(call: ts.CallExpression): boolean {
  let node: ts.Node | undefined = call.parent;
  while (node && !ts.isCallExpression(node)) node = node.parent;
  if (!node || !ts.isCallExpression(node)) return false;
  if (!(ts.isIdentifier(node.expression) && node.expression.text === 'dynamic')) return false;
  const options = node.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) return false;
  return options.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === 'ssr' &&
      property.initializer.kind === ts.SyntaxKind.FalseKeyword
  );
}

/** Every import edge between source files under `directories` (app, components, lib by default). */
export function importEdges(directories: string[] = ['app', 'components', 'lib']): ImportEdge[] {
  const edges: ImportEdge[] = [];
  for (const file of sourceFiles(...directories)) {
    const source = parseSource(file);
    walk(source, (node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const to = resolveSpecifier(file, node.moduleSpecifier.text);
        if (!to) return;
        let typeOnly = false;
        if (ts.isImportDeclaration(node) && node.importClause) {
          const clause = node.importClause;
          const named = clause.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements : null;
          typeOnly = clause.isTypeOnly || (!clause.name && named !== null && named.length > 0 && named.every((element) => element.isTypeOnly));
        }
        if (ts.isExportDeclaration(node) && node.isTypeOnly) typeOnly = true;
        edges.push({ from: file, to, typeOnly, dynamicSsrFalse: false, dynamicImport: false });
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const argument = node.arguments[0];
        if (!argument || !ts.isStringLiteral(argument)) return;
        const to = resolveSpecifier(file, argument.text);
        if (!to) return;
        const ssrFalse = isDynamicSsrFalse(node);
        edges.push({ from: file, to, typeOnly: false, dynamicSsrFalse: ssrFalse, dynamicImport: !ssrFalse });
      }
    });
  }
  return edges;
}
