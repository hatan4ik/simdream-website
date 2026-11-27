import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your_supabase_project_url')
);

let client: Promise<SupabaseClient> | undefined;

/**
 * The browser Supabase client, or null when Supabase is not configured. The SDK (about 56 KiB gzipped) is
 * fetched on the first call and never before: the root auth provider reaches this module, so a static
 * import would put the SDK on every page, also where it is not configured and can never run. Every caller
 * shares one client; a failed load is not kept, so the next call tries again.
 */
export function loadSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  client ??= import('@supabase/supabase-js')
    .then(({ createClient }) => createClient(supabaseUrl, supabaseAnonKey))
    .catch((error: unknown) => {
      client = undefined;
      throw error;
    });
  return client;
}
