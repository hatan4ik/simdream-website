import { execFileSync } from 'node:child_process';
import path from 'node:path';
import ts from 'typescript';

/**
 * Report-only list of the exports under lib/ and components/ that no other file in the repository
 * imports (app/, tests/, scripts/, tools/ and the root configs included). It reads the real module graph
 * through the TypeScript compiler, so an export counts as used when another file reaches it through:
 *
 *  - a named, default or `import type` import, resolved through any chain of `export *` / `export { … }`
 *    barrels to the declaration it names;
 *  - a namespace import (`import * as ns`): each `ns.member` it reads, or every export when the namespace
 *    object itself is used; a namespace re-exported with `export * as ns` and imported by name: every export;
 *  - an `import('…').Type` type, or a dynamic `import('…')` (every export of the target: a loader may read
 *    any member, and `next/dynamic` reads `default`).
 *
 * Re-exports are not reported (the declaration they name is), and a use inside the declaring file does
 * not count. app/ exports are never reported: Next.js reads page, layout, route and metadata exports by
 * convention. An `import()` whose specifier is not a string literal cannot be resolved and is printed as
 * a warning.
 *
 *   npm run check:unused-exports              print the list, exit 0
 *   npm run check:unused-exports -- --max 40  also exit 1 when more than 40 are listed
 */

export interface UnusedExport {
  /** Repository-relative, `/`-separated. */
  file: string;
  line: number;
  name: string;
  kind: string;
}

export interface UnusedExportReport {
  unused: UnusedExport[];
  warnings: string[];
  scannedFiles: number;
  /** Exports declared in the export directories, used or not. */
  candidates: number;
}

export interface UnusedExportOptions {
  root: string;
  /** Repository-relative source files: every file whose imports count, and the candidates among them. */
  files: readonly string[];
  /** Directories whose exports are checked. */
  exportDirectories: readonly string[];
  compilerOptions: ts.CompilerOptions;
}

const SOURCE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

const posix = (root: string, file: string) => path.relative(root, file).split(path.sep).join('/');

function declarationKind(declaration: ts.Declaration | undefined): string {
  if (!declaration) return 'other';
  if (ts.isFunctionDeclaration(declaration)) return 'function';
  if (ts.isVariableDeclaration(declaration)) return 'variable';
  if (ts.isClassDeclaration(declaration)) return 'class';
  if (ts.isInterfaceDeclaration(declaration)) return 'interface';
  if (ts.isTypeAliasDeclaration(declaration)) return 'type';
  if (ts.isEnumDeclaration(declaration)) return 'enum';
  if (ts.isModuleDeclaration(declaration)) return 'namespace';
  return 'other';
}

export function findUnusedExports(options: UnusedExportOptions): UnusedExportReport {
  const { root, compilerOptions } = options;
  const absolute = options.files.map((file) => path.resolve(root, file));
  const program = ts.createProgram(absolute, compilerOptions);
  const checker = program.getTypeChecker();
  const sources = absolute
    .map((file) => program.getSourceFile(file))
    .filter((source): source is ts.SourceFile => source !== undefined);

  const resolve = (symbol: ts.Symbol): ts.Symbol =>
    symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declaredIn = (symbol: ts.Symbol) => new Set((symbol.declarations ?? []).map((declaration) => declaration.getSourceFile()));
  /** A whole file's module (what `export * as ns` and `import()` name), not a `namespace` declaration. */
  const isFileModule = (symbol: ts.Symbol) => (symbol.declarations ?? []).some((declaration) => ts.isSourceFile(declaration));

  /**
   * Declarations some import form reaches. Only import forms are visited, so a use inside the declaring
   * file never lands here.
   */
  const used = new Set<ts.Symbol>();
  const warnings: string[] = [];
  const markedModules = new Set<ts.Symbol>();
  /** Every export of a file module, and of each `export * as ns` namespace inside it. */
  const markModule = (moduleSymbol: ts.Symbol | undefined) => {
    if (!moduleSymbol || markedModules.has(moduleSymbol)) return;
    markedModules.add(moduleSymbol);
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const target = resolve(exported);
      if (isFileModule(target)) markModule(target);
      else used.add(target);
    }
  };
  const markSymbol = (symbol: ts.Symbol | undefined) => {
    if (!symbol) return;
    const target = resolve(symbol);
    if (isFileModule(target)) markModule(target);
    else used.add(target);
  };

  for (const source of sources) {
    /** Each `local.member` read marks that member; any other use of `local` marks the whole module. */
    const markNamespaceUses = (local: ts.Identifier, moduleSymbol: ts.Symbol | undefined) => {
      const localSymbol = checker.getSymbolAtLocation(local);
      const visit = (node: ts.Node): void => {
        if (ts.isIdentifier(node) && node !== local && node.text === local.text && checker.getSymbolAtLocation(node) === localSymbol) {
          const parent = node.parent;
          if (ts.isPropertyAccessExpression(parent) && parent.expression === node) markSymbol(checker.getSymbolAtLocation(parent.name));
          else if (ts.isQualifiedName(parent) && parent.left === node) markSymbol(checker.getSymbolAtLocation(parent.right));
          else markModule(moduleSymbol);
        }
        node.forEachChild(visit);
      };
      visit(source);
    };

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && node.importClause) {
        const clause = node.importClause;
        const moduleSymbol = checker.getSymbolAtLocation(node.moduleSpecifier);
        if (clause.name) markSymbol(checker.getSymbolAtLocation(clause.name));
        const bindings = clause.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) markSymbol(checker.getSymbolAtLocation(element.name));
        } else if (bindings && ts.isNamespaceImport(bindings)) {
          markNamespaceUses(bindings.name, moduleSymbol);
        }
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        markModule(checker.getSymbolAtLocation(node.moduleReference.expression));
      } else if (ts.isImportTypeNode(node)) {
        const qualifier = node.qualifier;
        const member = qualifier && checker.getSymbolAtLocation(ts.isQualifiedName(qualifier) ? qualifier.right : qualifier);
        if (member) markSymbol(member);
        else if (ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
          markModule(checker.getSymbolAtLocation(node.argument.literal));
        }
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const [argument] = node.arguments;
        if (argument && ts.isStringLiteralLike(argument)) markModule(checker.getSymbolAtLocation(argument));
        else {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          warnings.push(`${posix(root, source.fileName)}:${line + 1}: import() with a non-literal specifier; its target exports may be reported unused`);
        }
      }
      node.forEachChild(visit);
    };
    visit(source);
  }

  const exportDirectories = options.exportDirectories.map((directory) => `${directory.replace(/\/+$/, '')}/`);
  const unused: UnusedExport[] = [];
  let candidates = 0;
  for (const source of sources) {
    const file = posix(root, source.fileName);
    if (source.isDeclarationFile || !exportDirectories.some((directory) => file.startsWith(directory))) continue;
    const moduleSymbol = checker.getSymbolAtLocation(source);
    if (!moduleSymbol) continue;
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const target = resolve(exported);
      if (!declaredIn(target).has(source)) continue;
      candidates += 1;
      if (used.has(target)) continue;
      const declaration = target.declarations?.find((candidate) => candidate.getSourceFile() === source);
      const { line } = source.getLineAndCharacterOfPosition((declaration ?? source).getStart(source));
      unused.push({ file, line: line + 1, name: exported.name, kind: declarationKind(declaration) });
    }
  }
  unused.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.name.localeCompare(b.name));
  return { unused, warnings, scannedFiles: sources.length, candidates };
}

/** `--max <n>` or `--max=<n>`, a whole number of at least 0; `null` when absent. */
export function parseMaxArgument(args: readonly string[]): number | null {
  let max: number | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    const value = argument === '--max' ? args[(index += 1)] : argument.startsWith('--max=') ? argument.slice('--max='.length) : undefined;
    if (value === undefined || !/^\d+$/.test(value)) {
      throw new Error(`Usage: check-unused-exports [--max <n>] (n a whole number of at least 0); got "${args.join(' ')}"`);
    }
    max = Number(value);
  }
  return max;
}

export function exitCodeFor(count: number, max: number | null): number {
  return max !== null && count > max ? 1 : 0;
}

/** Every source file git would commit (tracked, or untracked and not ignored), outside node_modules. */
function repositorySourceFiles(root: string): string[] {
  const listed = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
  return [...new Set(listed.split('\0'))].filter(
    (file) => SOURCE_FILE.test(file) && !file.endsWith('.d.ts') && !file.split('/').includes('node_modules')
  );
}

function main(args: readonly string[]): number {
  const started = performance.now();
  const max = parseMaxArgument(args);
  const root = process.cwd();
  const config = ts.getParsedCommandLineOfConfigFile(path.join(root, 'tsconfig.json'), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    },
  });
  if (!config) throw new Error('tsconfig.json could not be read');
  const report = findUnusedExports({
    root,
    files: repositorySourceFiles(root),
    exportDirectories: ['lib', 'components'],
    compilerOptions: { ...config.options, incremental: false, noEmit: true },
  });

  let currentFile = '';
  for (const entry of report.unused) {
    if (entry.file !== currentFile) console.log(`\n${(currentFile = entry.file)}`);
    console.log(`  ${String(entry.line).padStart(4)}  ${entry.name} (${entry.kind})`);
  }
  for (const warning of report.warnings) console.log(`\nwarning: ${warning}`);
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  const files = new Set(report.unused.map((entry) => entry.file)).size;
  console.log(
    `\n${report.unused.length} unused export(s) in ${files} file(s), of ${report.candidates} exports under lib/ and components/; ` +
      `${report.scannedFiles} files scanned in ${seconds}s.`
  );
  const code = exitCodeFor(report.unused.length, max);
  if (code !== 0) console.log(`More than --max ${max}: failing.`);
  return code;
}

if (process.argv[1]?.endsWith('check-unused-exports.ts')) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 2;
  }
}
