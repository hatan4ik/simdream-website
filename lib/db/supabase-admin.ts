import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hasUsableValue } from '@/lib/config/server-env';

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasUsableValue(url) || !hasUsableValue(serviceRoleKey)) {
    return null;
  }

  client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function requireSupabaseAdmin(): SupabaseClient {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Persistent storage is not configured.');
  }
  return admin;
}
