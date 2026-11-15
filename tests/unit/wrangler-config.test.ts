import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from './_support/source';

/**
 * The Wix-hosted Worker is bundled with `wrangler deploy --dry-run` (npm run wix:build) and released
 * by the Wix CLI, so wrangler.jsonc configures only the bundle: no variables, secrets, bindings,
 * routes or edge rules. Wix hosting owns those, and every abuse control lives in application code
 * (SECURITY.md, "Edge controls on the Wix-hosted Worker"). A key added here would be a second,
 * unreviewed source of configuration; extend this pin only together with that section.
 */
function readWranglerConfig(): Record<string, unknown> {
  const file = path.join(REPO_ROOT, 'wrangler.jsonc');
  const { config, error } = ts.parseConfigFileTextToJson(file, readFileSync(file, 'utf8'));
  if (error) throw new Error(`wrangler.jsonc is not valid JSONC: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`);
  return config as Record<string, unknown>;
}

describe('wrangler.jsonc for the Wix-hosted Worker', () => {
  const config = readWranglerConfig();

  it('declares only the bundle settings present today: no vars, secrets, bindings, routes or environments', () => {
    expect(Object.keys(config).sort()).toEqual(
      ['$schema', 'assets', 'compatibility_date', 'compatibility_flags', 'main', 'name'].sort()
    );
  });

  it('binds only the static assets directory, as ASSETS', () => {
    expect(config.assets).toEqual({ directory: '.open-next/assets', binding: 'ASSETS' });
    expect(config.main).toBe('.open-next/worker.js');
  });
});
