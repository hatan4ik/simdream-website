import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REPO_ROOT } from './_support/source';

// The Supabase SDK is about 56 KiB of gzipped JavaScript. The root auth provider reaches it, so a static
// import puts it on every page, also on the Wix deployment, where Supabase is not configured and the code
// can never run. The browser must load it only when a Supabase call is actually made.

const SERVER_ONLY = new Set(['lib/db/supabase-admin.ts']);

function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(relative);
    return /\.(ts|tsx)$/.test(entry.name) ? [relative] : [];
  });
}

describe('the Supabase SDK stays out of the initial browser bundle', () => {
  it('is never imported as a value by a module the browser can reach', () => {
    const offenders = ['app', 'components', 'lib']
      .flatMap(sourceFiles)
      .filter((file) => !SERVER_ONLY.has(file))
      .filter((file) => /^import\s+(?!type\b)[^;]*from\s+'@supabase\/supabase-js'/m.test(readFileSync(path.join(REPO_ROOT, file), 'utf8')));

    expect(offenders).toEqual([]);
  });
});

describe('loadSupabase', () => {
  const evaluated = vi.fn();
  const createClient = vi.fn((url: string) => ({ url }));

  async function load(env: { url?: string; key?: string }) {
    vi.resetModules();
    evaluated.mockClear();
    createClient.mockClear();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', env.url ?? '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', env.key ?? '');
    vi.doMock('@supabase/supabase-js', () => {
      evaluated();
      return { createClient };
    });
    return import('@/lib/supabaseClient');
  }

  afterEach(() => {
    vi.doUnmock('@supabase/supabase-js');
    vi.unstubAllEnvs();
  });

  it('resolves null and never loads the SDK when Supabase is not configured', async () => {
    const { isSupabaseConfigured, loadSupabase } = await load({});

    expect(isSupabaseConfigured).toBe(false);
    await expect(loadSupabase()).resolves.toBeNull();
    expect(evaluated).not.toHaveBeenCalled();
  });

  it('does not load the SDK until the first call, then creates one client for every caller', async () => {
    const { isSupabaseConfigured, loadSupabase } = await load({ url: 'https://project.supabase.co', key: 'anon-key' });

    expect(isSupabaseConfigured).toBe(true);
    expect(evaluated).not.toHaveBeenCalled();

    const [first, second] = await Promise.all([loadSupabase(), loadSupabase()]);

    expect(first).toBe(second);
    expect(first).toEqual({ url: 'https://project.supabase.co' });
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith('https://project.supabase.co', 'anon-key');
  });

  it('tries again after a failed load instead of keeping the failure', async () => {
    const { loadSupabase } = await load({ url: 'https://project.supabase.co', key: 'anon-key' });
    createClient.mockImplementationOnce(() => {
      throw new Error('chunk failed');
    });

    await expect(loadSupabase()).rejects.toThrow('chunk failed');
    await expect(loadSupabase()).resolves.toEqual({ url: 'https://project.supabase.co' });
  });
});
