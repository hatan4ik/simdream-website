import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TEST_ADMIN, TEST_STRIPE } from '../support/test-env';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CLIENT_BUNDLE = join(ROOT, '.next', 'static');
const MAX_SCANNED_BYTES = 5 * 1024 * 1024;

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function isBinary(content: Buffer): boolean {
  return content.subarray(0, 8000).includes(0);
}

/** Names that only exist on the server; their presence in client code means a server module leaked into a bundle. */
const SERVER_ONLY_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'service_role',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SENDGRID_API_KEY',
  'GOOGLE_PLACES_API_KEY',
  'ADMIN_PASSWORD',
  'ADMIN_USER',
  'requireSupabaseAdmin',
];

/** Shapes of real credentials. Lengths exclude documentation placeholders such as `sk_test_...`. */
const SECRET_SHAPES: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Stripe secret key', pattern: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { name: 'Stripe webhook secret', pattern: /\bwhsec_[A-Za-z0-9]{16,}/g },
  { name: 'SendGrid API key', pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g },
  { name: 'JWT (Supabase key)', pattern: /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/g },
  { name: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { name: 'Slack token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
];

/** Deliberately fake, format-only values from the shared test harness. */
const KNOWN_TEST_FIXTURES = new Set<string>([TEST_STRIPE.secretKey, TEST_STRIPE.webhookSecret]);
/**
 * Test fixtures elsewhere must declare themselves fake in the value itself. Real
 * credentials are random strings and never contain these words.
 */
const DECLARED_FAKE = /simdream|fake|dummy|notareal/i;

function secretShapedValues(content: string): Array<{ name: string; value: string }> {
  return SECRET_SHAPES.flatMap(({ name, pattern }) =>
    [...content.matchAll(pattern)].map((match) => ({ name, value: match[0] }))
  ).filter(({ value }) => !KNOWN_TEST_FIXTURES.has(value) && !DECLARED_FAKE.test(value));
}

describe('client bundle (.next/static)', () => {
  const files = existsSync(CLIENT_BUNDLE) ? walk(CLIENT_BUNDLE) : [];
  const scripts = files.filter((file) => file.endsWith('.js'));

  it('exists and contains client JavaScript to scan', () => {
    expect(scripts.length).toBeGreaterThan(0);
  });

  it.each(SERVER_ONLY_NAMES)('never references the server-only name %s', (name) => {
    const offenders = files.filter((file) => readFileSync(file, 'utf8').includes(name)).map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  });

  it.each(['sk_live_', 'sk_test_', 'rk_live_', 'whsec_'])('never contains the Stripe secret prefix %s', (prefix) => {
    const offenders = files.filter((file) => readFileSync(file, 'utf8').includes(prefix)).map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  });

  it('never contains a secret-shaped value or the test admin password', () => {
    const findings = files.flatMap((file) => {
      const content = readFileSync(file, 'utf8');
      const shaped = SECRET_SHAPES.flatMap(({ name, pattern }) =>
        [...content.matchAll(pattern)].map((match) => `${relative(ROOT, file)}: ${name} ${match[0].slice(0, 12)}…`)
      );
      return content.includes(TEST_ADMIN.password) ? [...shaped, `${relative(ROOT, file)}: admin password`] : shaped;
    });
    expect(findings).toEqual([]);
  });

  it('ships no source maps to browsers', () => {
    expect(files.filter((file) => file.endsWith('.map')).map((file) => relative(ROOT, file))).toEqual([]);
  });
});

describe('repository contents', () => {
  // Tracked files plus untracked files that are not ignored: everything a commit could include.
  const candidates = git('ls-files', '--cached', '--others', '--exclude-standard', '-z')
    .split('\0')
    .filter(Boolean)
    .filter((file) => existsSync(join(ROOT, file)) && statSync(join(ROOT, file)).isFile());

  it('lists committable files to scan', () => {
    expect(candidates).toContain('package.json');
  });

  it('contains no secret-shaped credential in any committable file', () => {
    const findings = candidates.flatMap((file) => {
      const path = join(ROOT, file);
      if (statSync(path).size > MAX_SCANNED_BYTES) return [];
      const content = readFileSync(path);
      if (isBinary(content)) return [];
      return secretShapedValues(content.toString('utf8')).map(({ name, value }) => `${file}: ${name} ${value.slice(0, 12)}…`);
    });
    expect(findings).toEqual([]);
  });

  it.each(['.env.local', '.env', '.env.production.local', '.env.development.local'])(
    'git-ignores %s so local secrets cannot be committed',
    (file) => {
      const result = spawnSync('git', ['check-ignore', '--quiet', '--no-index', file], { cwd: ROOT });
      expect(result.status, `git check-ignore exit status for ${file}`).toBe(0);
    }
  );

  it('does not track .env.local', () => {
    expect(git('ls-files', '--', '.env.local').trim()).toBe('');
  });

  it('keeps the .env.example template trackable and free of real values', () => {
    const result = spawnSync('git', ['check-ignore', '--quiet', '--no-index', '.env.example'], { cwd: ROOT });
    expect(result.status).toBe(1);
    expect(secretShapedValues(readFileSync(join(ROOT, '.env.example'), 'utf8'))).toEqual([]);
  });
});
