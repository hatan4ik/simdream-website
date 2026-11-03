import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Small, deterministic guard for the type-safety rules that TypeScript itself
 * does not forbid: unsafe `any` escapes and suppressed compiler errors.
 *
 * This complements `tsc --noEmit`; it is intentionally narrow so it does not
 * pretend to be a general-purpose formatter or style linter.
 */
const SOURCE_DIRECTORIES = ['app', 'components', 'lib', 'scripts', 'types'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const IGNORED_DIRECTORIES = new Set(['node_modules', '.next', '.next-test']);
const FORBIDDEN_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'unsafe any type escape', pattern: /\bas\s+any\b|:\s*any\b/ },
  { label: 'TypeScript suppression', pattern: /@ts-(?:ignore|nocheck)\b/ },
];

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return IGNORED_DIRECTORIES.has(entry) ? [] : filesUnder(path);
    }
    const extension = path.slice(path.lastIndexOf('.'));
    return SOURCE_EXTENSIONS.has(extension) ? [path] : [];
  });
}

const violations = SOURCE_DIRECTORIES.flatMap((directory) =>
  filesUnder(directory).flatMap((file) => {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    return lines.flatMap((line, index) =>
      FORBIDDEN_PATTERNS.filter(({ pattern }) => pattern.test(line)).map(
        ({ label }) => `${relative('.', file)}:${index + 1}: ${label}`,
      ),
    );
  }),
);

if (violations.length > 0) {
  console.error('Type hygiene violations found:\n' + violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Type hygiene passed: no unsafe any escapes or TypeScript suppressions.');
}
