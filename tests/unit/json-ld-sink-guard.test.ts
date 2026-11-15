import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT, location, parseSource, sourceFiles, walk } from './_support/source';

function isJsonStringifyCall(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'JSON' &&
    node.expression.name.text === 'stringify'
  );
}

/**
 * Locations of every `dangerouslySetInnerHTML` whose value runs `JSON.stringify` itself. A bare
 * `JSON.stringify` leaves `</script>` intact, so a string that comes from outside the repo (a live
 * Wix Blog title, for instance) can close the JSON-LD script early and inject markup. JSON-LD goes
 * through `serializeJsonLd()`, which escapes `<`.
 */
function stringifySinks(file: string, text = readFileSync(file, 'utf8')): string[] {
  const sinks: string[] = [];
  walk(parseSource(file, text), (node) => {
    if (!ts.isJsxAttribute(node) || node.name.getText() !== 'dangerouslySetInnerHTML') return;
    let found = false;
    walk(node, (child) => {
      if (isJsonStringifyCall(child)) found = true;
    });
    if (found) sinks.push(location(node));
  });
  return sinks;
}

describe('JSON-LD injection sink guard', () => {
  it('flags a bare JSON.stringify passed to dangerouslySetInnerHTML, including a hand-rolled escape', () => {
    const file = path.join(REPO_ROOT, 'components/__guard-fixture__.tsx');
    const bare = `export const A = () => <script dangerouslySetInnerHTML={{ __html: JSON.stringify(x) }} />;`;
    const handRolled = `export const B = () => <script dangerouslySetInnerHTML={{ __html: JSON.stringify(x).replace(/</g, '\\\\u003c') }} />;`;
    const safe = `export const C = () => <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(x) }} />;`;
    const unrelated = `export const D = () => <script>{JSON.stringify(x)}</script>;`;

    expect(stringifySinks(file, bare)).toHaveLength(1);
    expect(stringifySinks(file, handRolled)).toHaveLength(1);
    expect(stringifySinks(file, safe)).toEqual([]);
    expect(stringifySinks(file, unrelated)).toEqual([]);
  });

  it('finds no component or route that passes JSON.stringify straight to dangerouslySetInnerHTML', () => {
    const sinks = sourceFiles('components', 'app').flatMap((file) => stringifySinks(file));
    expect(sinks, 'use serializeJsonLd() from lib/seo/structured-data for JSON-LD scripts').toEqual([]);
  });
});
