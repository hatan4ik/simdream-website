import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exitCodeFor, findUnusedExports, parseMaxArgument, type UnusedExportReport } from '../../scripts/check-unused-exports';

/**
 * scripts/check-unused-exports.ts on a planted mini-repository. Each `lib/` and `components/` export is
 * reached in one way the script must recognise (named, default, `export *` barrel, `export * as` barrel,
 * namespace member, `import type`, `import('…').Type`, dynamic `import()` (also of an `export * as` barrel),
 * imported only from `app/`), or is reached by nothing; only the last kind may be reported.
 */
const FIXTURE: Record<string, string> = {
  'lib/plain.ts': [
    'export const viaNamedImport = 1;',
    'export const neverImported = 2;',
    'export const usedOnlyInOwnFile = 3;',
    'export const localUser = usedOnlyInOwnFile + 1;',
  ].join('\n'),
  'lib/barrel/impl.ts': 'export function viaStarBarrel() {}\nexport function behindBarrelUnused() {}',
  'lib/barrel/index.ts': "export * from './impl';",
  'lib/grouped/impl.ts': 'export const viaGroupedNamespace = 1;',
  'lib/grouped/index.ts': "export * as grouped from './impl';",
  'lib/lazy-grouped/impl.ts': 'export const viaLazyGroupedNamespace = 1;',
  'lib/lazy-grouped/index.ts': "export * as lazyGrouped from './impl';",
  'lib/namespaced.ts': 'export const viaNamespaceMember = 1;\nexport const namespaceUnused = 2;',
  'lib/types.ts': 'export interface ViaTypeOnlyImport { a: number; run?: () => void }\nexport type UnusedType = string;',
  'lib/import-type-node.ts': 'export interface ViaImportTypeNode { b: string }',
  'lib/lazy.ts': 'export default function lazyDefault() {}\nexport const lazyNamed = 1;',
  'lib/renamed.ts': 'const inner = 1;\nexport { inner as renamedExport };',
  'lib/default-export.ts': 'export default function viaDefaultImport() {}',
  'components/only-from-app.tsx': "export const OnlyFromApp = 'x';",
  'components/loader.ts': [
    "export const load = () => import('../lib/lazy');",
    "const name = 'plain';",
    'export const loadAny = () => import(`../lib/${name}`);',
    "export const loadGrouped = () => import('../lib/lazy-grouped');",
  ].join('\n'),
  'app/page.tsx': [
    "import { viaStarBarrel } from '@/lib/barrel';",
    "import { OnlyFromApp } from '@/components/only-from-app';",
    "export const metadata = { title: 'x' };",
    'export default function Page() { viaStarBarrel(); return OnlyFromApp; }',
  ].join('\n'),
  'tests/plain.test.ts': [
    "import { viaNamedImport, localUser } from '../lib/plain';",
    "import { load, loadAny, loadGrouped } from '../components/loader';",
    "import { grouped } from '../lib/grouped';",
    "import { renamedExport } from '../lib/renamed';",
    'export const all = [viaNamedImport, localUser, load, loadAny, loadGrouped, grouped.viaGroupedNamespace, renamedExport];',
  ].join('\n'),
  'scripts/tool.ts': [
    "import type { ViaTypeOnlyImport } from '../lib/types';",
    "import viaDefault from '../lib/default-export';",
    "import * as ns from '../lib/namespaced';",
    "export const value: ViaTypeOnlyImport = { a: ns.viaNamespaceMember, run: viaDefault };",
    "export let typed: import('../lib/import-type-node').ViaImportTypeNode | undefined;",
  ].join('\n'),
};

const COMPILER_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  jsx: ts.JsxEmit.Preserve,
  noEmit: true,
  skipLibCheck: true,
  types: [],
  paths: { '@/*': ['./*'] },
};

let root = '';
let report: UnusedExportReport;

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'unused-exports-'));
  for (const [file, text] of Object.entries(FIXTURE)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), `${text}\n`);
  }
  COMPILER_OPTIONS.baseUrl = root;
  report = findUnusedExports({
    root,
    files: Object.keys(FIXTURE),
    exportDirectories: ['lib', 'components'],
    compilerOptions: COMPILER_OPTIONS,
  });
});

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

describe('check-unused-exports', () => {
  it('reports exactly the lib/ and components/ exports no other file imports', () => {
    expect(report.unused.map(({ file, name }) => `${file} ${name}`)).toEqual([
      'lib/barrel/impl.ts behindBarrelUnused',
      'lib/namespaced.ts namespaceUnused',
      'lib/plain.ts neverImported',
      'lib/plain.ts usedOnlyInOwnFile',
      'lib/types.ts UnusedType',
    ]);
  });

  it('gives each finding its line and declaration kind', () => {
    expect(report.unused.find((entry) => entry.name === 'neverImported')).toEqual({
      file: 'lib/plain.ts',
      line: 2,
      name: 'neverImported',
      kind: 'variable',
    });
    expect(report.unused.find((entry) => entry.name === 'UnusedType')?.kind).toBe('type');
  });

  it('never reports an app/ export or a re-export, and counts what it scanned', () => {
    expect(report.unused.filter((entry) => entry.file.startsWith('app/') || entry.file.endsWith('index.ts'))).toEqual([]);
    expect(report.scannedFiles).toBe(Object.keys(FIXTURE).length);
    expect(report.candidates).toBe(21);
  });

  it('warns about an import() it cannot resolve instead of guessing', () => {
    expect(report.warnings).toEqual(['components/loader.ts:3: import() with a non-literal specifier; its target exports may be reported unused']);
  });

  it('reads --max as a non-negative whole number', () => {
    expect(parseMaxArgument([])).toBeNull();
    expect(parseMaxArgument(['--max', '12'])).toBe(12);
    expect(parseMaxArgument(['--max=0'])).toBe(0);
    for (const bad of [['--max'], ['--max', '-1'], ['--max', '1.5'], ['--max=many'], ['--other']]) {
      expect(() => parseMaxArgument(bad), bad.join(' ')).toThrow(/--max/);
    }
  });

  it('exits 0 when report-only or within --max, and 1 above it', () => {
    expect(exitCodeFor(250, null)).toBe(0);
    expect(exitCodeFor(5, 5)).toBe(0);
    expect(exitCodeFor(6, 5)).toBe(1);
  });
});
