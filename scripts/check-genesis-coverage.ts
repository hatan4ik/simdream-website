import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

/**
 * Measures how completely a blueprint document (a "genesis prompt") describes this codebase.
 * The checklist is extracted from the source itself, so it grows with the code instead of
 * relying on anyone's memory. Each item passes when the document mentions it.
 *
 *   npx tsx scripts/check-genesis-coverage.ts [doc.md ...]     (default: GENESIS.md)
 *   npx tsx scripts/check-genesis-coverage.ts --require GENESIS.md
 *     exits non-zero unless that document covers every item, has no known-false claim,
 *     and carries the exact source fingerprint for the current review surface.
 *   npx tsx scripts/check-genesis-coverage.ts --fingerprint
 *     prints the current review-surface hash without modifying a file.
 *   npx tsx scripts/check-genesis-coverage.ts --stamp GENESIS.md
 *     deliberately re-stamps the canonical document after a human source review.
 *   npx tsx scripts/check-genesis-coverage.ts --unique GENESIS.md OTHER.md ...
 *     lists checklist items the other documents cover that the first one does not.
 */

const CANONICAL_GENESIS = 'GENESIS.md';
const FINGERPRINT_MARKER = /<!-- GENESIS-SOURCE-FINGERPRINT: sha256:([a-f0-9]{64}) -->/;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.sql', '.json', '.md', '.yml', '.yaml', '.sh']);
const SOURCE_DIRECTORIES = ['app', 'components', 'lib', 'scripts', 'tests', 'types', '.github/workflows'];
const SOURCE_FILES = [
  '.env.example',
  'AGENTS.md',
  'ARCHITECTURE.md',
  'CALENDAR_LOCALIZATION.md',
  'DASHBOARD_REPRODUCTION_SPEC.md',
  'KANTOROVICH_SCHEDULER_SPEC.md',
  'README.md',
  'TESTING.md',
  'next.config.mjs',
  'package-lock.json',
  'package.json',
  'playwright.config.ts',
  'postcss.config.mjs',
  'proxy.ts',
  'tailwind.config.ts',
  'tsconfig.json',
  'vitest.config.ts',
];

/** Passes when any pattern matches, or when every pattern matches if `allOf` is set. */
type Item = { category: string; label: string; patterns: RegExp[]; allOf?: boolean };

const read = (path: string) => readFileSync(path, 'utf8');
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const literal = (text: string) => new RegExp(escape(text), 'i');

function walk(dir: string, match: (path: string) => boolean): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === 'node_modules' ? [] : walk(path, match);
    return match(path) ? [path] : [];
  });
}

function extension(path: string): string {
  const index = path.lastIndexOf('.');
  return index >= 0 ? path.slice(index) : '';
}

/**
 * The fingerprint does not try to infer that prose correctly explains a code
 * change—that remains a reviewer responsibility. It does make every covered
 * source change visible to CI until a reviewer deliberately reads and stamps
 * GENESIS.md again.
 */
function sourceFingerprint(): string {
  const files = [
    ...SOURCE_FILES.filter((file) => statSync(file).isFile()),
    ...SOURCE_DIRECTORIES.flatMap((dir) => walk(dir, (file) => SOURCE_EXTENSIONS.has(extension(file)))),
  ].sort();
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(relative('.', file).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(read(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function stamp(doc: string): void {
  const text = read(doc);
  const fingerprint = sourceFingerprint();
  if (!FINGERPRINT_MARKER.test(text)) {
    throw new Error(`${doc} has no GENESIS-SOURCE-FINGERPRINT marker.`);
  }
  writeFileSync(doc, text.replace(FINGERPRINT_MARKER, `<!-- GENESIS-SOURCE-FINGERPRINT: sha256:${fingerprint} -->`));
  console.log(`Stamped ${doc} with ${fingerprint}. Review the source changes before committing this update.`);
}

/** App Router path for a page or route file: route groups such as (public) are not URL segments. */
const routeOf = (file: string, base: string) =>
  '/' + relative(base, file).split('/').slice(0, -1).filter((segment) => !/^\(.*\)$/.test(segment)).join('/');

function checklist(): Item[] {
  const items: Item[] = [];
  const add = (category: string, label: string, ...patterns: RegExp[]) =>
    items.push({ category, label, patterns: patterns.length ? patterns : [literal(label)] });
  const addAll = (category: string, label: string, ...patterns: RegExp[]) => items.push({ category, label, patterns, allOf: true });

  for (const file of walk('app', (p) => p.endsWith('/page.tsx'))) {
    const route = routeOf(file, 'app').replace(/\/$/, '') || '/';
    if (route === '/') continue; // every document mentions the root
    add('Page routes', route, new RegExp(`${escape(route)}(?![\\w/-])`, 'i'));
  }

  for (const file of walk('app/api', (p) => p.endsWith('/route.ts'))) {
    const route = routeOf(file, 'app');
    const source = read(file);
    const methods = [...source.matchAll(/export (?:async )?function (GET|POST|PATCH|PUT|DELETE)/g)].map((m) => m[1]);
    // Dynamic segments may be written [bookingReference], [ref] or :ref.
    const pattern = escape(route).replace(/\\\[[^\]]+\\\]/g, '(?:\\[[^\\]]+\\]|:\\w+)');
    add('API routes', `${route} (${methods.join(', ')})`, new RegExp(`${pattern}(?![\\w-])`, 'i'));
  }

  const schema = read('lib/db/schema.sql');
  for (const [, table] of schema.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)/g)) add('Database', `table ${table}`, literal(table));
  for (const [, fn] of schema.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)/g)) add('Database', `function ${fn}`, literal(fn));
  add('Database', 'EXCLUDE overlap constraint', /EXCLUDE USING gist|exclusion constraint|EXCLUDE constraint/i);
  add('Database', 'row level security', /row[- ]level security|\bRLS\b/i);
  for (const file of readdirSync('lib/db/migrations').sort()) {
    const number = file.slice(0, 3);
    add('Database', `migration ${file}`, new RegExp(`\\b${number}\\b|${escape(file)}`, 'i'));
  }

  for (const [, name] of read('.env.example').matchAll(/^([A-Z][A-Z0-9_]+)=/gm)) add('Environment', name);
  add('Environment', 'ALLOW_IN_MEMORY_STORE');

  // Catalog: each package id and its price (written with or without a thousands separator).
  const seed = read('lib/db/seed-data.ts');
  const packages = [...seed.matchAll(/id: '(pkg-[a-z0-9-]+)'[\s\S]*?priceIls: (\d+)/g)];
  for (const [, id, price] of packages) {
    add('Catalog', id, literal(id));
    const formatted = Number(price).toLocaleString('en-US');
    add('Catalog', `price ₪${formatted} (${id})`, new RegExp(`(?<![\\d,])(${escape(formatted)}|${price})(?![\\d,])`));
  }

  // Domain logic: exported functions of the scheduler, checkout and auth modules.
  for (const file of [...walk('lib/scheduler', (p) => p.endsWith('.ts')), 'lib/booking/checkout-service.ts']) {
    for (const [, name] of read(file).matchAll(/^export (?:async )?function (\w+)/gm)) add('Domain functions', `${name}()`, literal(name));
  }
  add('Domain functions', 'requireAdmin (admin guard)', /requireAdmin|admin[- ]guard/i);

  // Modules and components by file name.
  for (const file of walk('lib', (p) => /\.(ts|tsx)$/.test(p))) {
    const name = file.split('/').pop()!.replace(/\.(ts|tsx)$/, '');
    add('Library modules', relative('.', file), new RegExp(`\\b${escape(name)}\\b`, 'i'));
  }
  for (const file of walk('components', (p) => p.endsWith('.tsx'))) {
    const name = file.split('/').pop()!.replace('.tsx', '');
    add('Components', name);
  }
  add('Entry points', 'proxy.ts');
  add('Entry points', 'next.config.mjs', /next\.config/i);
  add('Entry points', 'app/sitemap.ts', /sitemap/i);
  add('Entry points', 'app/robots.ts', /robots/i);

  // Quality framework: Playwright projects, npm scripts and CI workflows.
  const playwright = read('playwright.config.ts');
  for (const [, name] of playwright.matchAll(/\{ name: '([\w-]+)'/g)) add('Quality gates', `Playwright project ${name}`, literal(name));
  const scripts = JSON.parse(read('package.json')).scripts as Record<string, string>;
  for (const name of Object.keys(scripts).filter((n) => n.startsWith('test:') || n === 'start:local')) add('Quality gates', `npm run ${name}`, literal(name));
  for (const file of readdirSync('.github/workflows')) add('Quality gates', `.github/workflows/${file}`, literal(file));
  add('Quality gates', 'axe-core accessibility', /axe/i);
  add('Quality gates', 'autocannon load smoke', /autocannon/i);
  add('Quality gates', 'Lighthouse budgets', /lighthouse/i);

  // Invariants from AGENTS.md that a rebuild must reproduce exactly.
  const invariants: Array<[string, RegExp]> = [
    ['buffer 20→45 min', buffer(20, 45)],
    ['buffer 45→60 min', buffer(45, 60)],
    ['buffer 60→75 min', buffer(60, 75)],
    ['buffer 90→105 min', buffer(90, 105)],
    ['buffer 120→150 min', buffer(120, 150)],
    ['buffer 240→255 min', buffer(240, 255)],
    ['Sun–Thu 10:00–23:00', /10:00\s*[–-]\s*23:00/],
    ['Friday 09:00–16:00', /09:00\s*[–-]\s*16:00/],
    ['Friday 15:15 closer', /15:15/],
    ['Saturday 19:00–24:00', /19:00\s*[–-]\s*(24:00|00:00|midnight)/i],
    ['45 min promo forbidden on Saturday', /promo[^\n]{0,80}(forbidden|not|never|Sun[–-]Fri)/i],
    ['zero-slot badge "0 slots open today"', /0 slots open/i],
    ['"Check Next Day" recovery', /Check Next Day/i],
    ['strikethrough booked slots', /strikethrough/i],
    ['never hide sold-out packages', /never hide|do not (filter|hide)/i],
    ['noise-free: zero add-ons for PRO / fear of flying', /zero add-on|addons\s*=\s*\[\]|no add-ons/i],
    ['default level atpl', /\batpl\b/],
    ['default level beginner', /\bbeginner\b/],
    ['/simulator → /pro 301', /\/simulator/],
    ['/training → /pro 301', /\/training/],
    ['/about is a separate customer-story page', /\/about[^\n]{0,120}(story|separate|canonical customer)/i],
    ['no isRTL text ternaries', /isRTL/],
    ['telemetry stays dir="ltr"', /dir="ltr"|dir=ltr|LTR/],
    ['brand cerulean #2096C7', /#2096C7/i],
    ['brand orange #FF5500', /#FF5500/i],
    ['fail-closed production (503)', /fail[- ]closed/i],
    ['webhook is the only path to paid', /webhook[^\n]{0,120}(only|authority|verified)/i],
    ['server-authoritative pricing', /server[- ](authoritative|recomputes|side pric)|recompute/i],
    ['exact email matching for member linking', /exact(ly)?[^\n]{0,40}email|email[^\n]{0,40}exact/i],
    ['Israel clock for departed slots', /Israel (clock|time)|Asia\/Jerusalem/i],
    ['month calendar default, optional week view', /month[^\n]{0,60}(grid|view|calendar)/i],
    ['Basic auth on /admin', /Basic auth/i],
    ['security headers (HSTS, CSP)', /HSTS|Strict-Transport-Security/i],
  ];
  for (const [label, pattern] of invariants) add('Invariants', label, pattern);
  addAll('Invariants', 'all five languages (Hebrew, English, Russian, French, Arabic)', /Hebrew|\bhe\b/, /English|\ben\b/, /Russian|\bru\b/, /French|\bfr\b/, /Arabic|\bar\b/);

  return items;
}

/** A flight of `flight` minutes reserving `reserved` minutes, written in prose ("20-minute … 45") or a table row. */
function buffer(flight: number, reserved: number): RegExp {
  return new RegExp(`\\b${flight}[\\s-]*(?:min|minute|m)\\w*\\b[^\\n]{0,60}?\\b${reserved}\\b(?![\\d,])`, 'i');
}

/** A line that reports a false claim as corrected is not making it. */
const CORRECTION_CONTEXT = /\b(no longer|not|never|earlier|drafts?|superseded|conflicts?|incorrect|inaccura\w*|corrected|historical|there is no|rejects?|forbidden|avoid)\b/i;

/** Claims that were true once or never, and contradict the current code. */
const KNOWN_FALSE: Array<[string, RegExp]> = [
  ['/about redirects to /pro (it is a standalone page now)', /\/about[^\n]{0,60}(redirect|→\s*\/pro|->\s*\/pro)|redirect[^\n]{0,60}\/about\b/i],
  ['14-day ribbon is the default calendar (it is a month grid)', /14[- ]day (date )?ribbon(?![^\n]{0,60}(no longer|replac|instead|optional|superseded))/i],
  ['old Tailwind sky blue presented as the brand colour', /Royal Aviation Blue|brand[^\n]{0,40}#0284c7/i],
  ['middleware.ts (Next 16 uses proxy.ts)', /\bmiddleware\.ts\b/],
  ['Next.js 14', /Next\.?js 14/i],
  ['PDF boarding pass delivery (not implemented)', /PDF boarding[- ]pass/i],
];

const isMissing = (item: Item, text: string) =>
  !(item.allOf ? item.patterns.every((p) => p.test(text)) : item.patterns.some((p) => p.test(text)));

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--fingerprint') {
    console.log(sourceFingerprint());
    return;
  }
  if (args[0] === '--stamp') {
    stamp(args[1] || CANONICAL_GENESIS);
    return;
  }
  if (args[0] === '--unique') {
    const [canonical, ...others] = args.slice(1);
    const items = checklist();
    const base = read(canonical);
    for (const other of others) {
      const text = read(other);
      const unique = items.filter((item) => isMissing(item, base) && !isMissing(item, text));
      console.log(`${other}: ${unique.length} item(s) not in ${canonical}${unique.length ? `: ${unique.map((u) => u.label).join('; ')}` : ''}`);
    }
    return;
  }
  const required = args[0] === '--require' ? args[1] : undefined;
  if (args[0] === '--require' && !required) {
    throw new Error('Usage: --require GENESIS.md');
  }
  const docs = required ? [required] : args.length ? args : [CANONICAL_GENESIS];
  const items = checklist();
  const categories = [...new Set(items.map((i) => i.category))];
  let failed = false;

  for (const doc of docs) {
    const text = read(doc);
    const missing = items.filter((item) => isMissing(item, text));
    const lines = text.split('\n');
    const falseClaims = KNOWN_FALSE.flatMap(([label, pattern]) =>
      lines.flatMap((line, index) => (pattern.test(line) && !CORRECTION_CONTEXT.test(line) ? [`${label} — line ${index + 1}`] : []))
    );
    const expectedFingerprint = sourceFingerprint();
    const stampedFingerprint = text.match(FINGERPRINT_MARKER)?.[1];
    const fingerprintMismatch = stampedFingerprint !== expectedFingerprint;
    const covered = items.length - missing.length;
    console.log(`\n${doc}: ${covered}/${items.length} items (${((covered / items.length) * 100).toFixed(1)}%), ${falseClaims.length} known-false claim(s), fingerprint ${fingerprintMismatch ? '✗ stale or missing' : '✓ current'}`);
    for (const category of categories) {
      const inCategory = items.filter((i) => i.category === category);
      const gaps = missing.filter((i) => i.category === category);
      console.log(`  ${gaps.length ? '✗' : '✓'} ${category}: ${inCategory.length - gaps.length}/${inCategory.length}${gaps.length ? `  missing: ${gaps.map((g) => g.label).join('; ')}` : ''}`);
    }
    for (const claim of falseClaims) console.log(`  ⚠ ${claim}`);
    if (fingerprintMismatch) {
      console.log(`  ⚠ expected GENESIS-SOURCE-FINGERPRINT sha256:${expectedFingerprint}`);
    }
    if (required && (missing.length || falseClaims.length || fingerprintMismatch)) failed = true;
  }
  if (failed) process.exit(1);
}

main();
