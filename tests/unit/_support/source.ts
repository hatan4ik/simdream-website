import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Every .ts/.tsx file under the given repo-relative directories. */
export function sourceFiles(...directories: string[]): string[] {
  const walk = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
      return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [full] : [];
    });
  return directories.flatMap((directory) => walk(path.join(REPO_ROOT, directory)));
}

export function parseSource(file: string, text = readFileSync(file, 'utf8')): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

export function location(node: ts.Node): string {
  const source = node.getSourceFile();
  const { line } = source.getLineAndCharacterOfPosition(node.getStart());
  return `${path.relative(REPO_ROOT, source.fileName)}:${line + 1}`;
}

export function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  node.forEachChild((child) => walk(child, visit));
}

/** Literal text a node renders or produces: string literals, template chunks and JSX text. */
export function literalTexts(node: ts.Node): string[] {
  const texts: string[] = [];
  walk(node, (child) => {
    if (
      ts.isStringLiteral(child) ||
      ts.isNoSubstitutionTemplateLiteral(child) ||
      ts.isTemplateHead(child) ||
      ts.isTemplateMiddle(child) ||
      ts.isTemplateTail(child) ||
      ts.isJsxText(child)
    ) {
      texts.push(child.text);
    }
  });
  return texts;
}

export type LiteralValue = string | number | boolean | null | LiteralValue[] | { [key: string]: LiteralValue };

/** Converts a literal expression (objects, arrays, strings, numbers) to a plain value. */
export function literalValue(node: ts.Expression): LiteralValue {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
    return literalValue(node.expression);
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((element) => literalValue(element));
  if (ts.isObjectLiteralExpression(node)) {
    const value: { [key: string]: LiteralValue } = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
        throw new Error(`Unsupported property at ${location(property)}`);
      }
      value[property.name.text] = literalValue(property.initializer);
    }
    return value;
  }
  throw new Error(`Not a literal at ${location(node)}: ${node.getText().slice(0, 60)}`);
}

/** The initializer of a top-level `const NAME = ...` declaration, as a plain value. */
export function readConstLiteral(repoRelativeFile: string, name: string): LiteralValue {
  const source = parseSource(path.join(REPO_ROOT, repoRelativeFile));
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) {
        return literalValue(declaration.initializer);
      }
    }
  }
  throw new Error(`const ${name} not found in ${repoRelativeFile}`);
}
