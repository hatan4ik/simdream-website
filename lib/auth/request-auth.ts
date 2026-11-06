import 'server-only';

import { isProduction } from '@/lib/config/server-env';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import type { VerifiedMemberIdentity } from './member-ownership';
import { getWixMemberIdentity } from '@/lib/wix/member-auth';

export type AuthenticatedUser = VerifiedMemberIdentity & { provider?: 'supabase' | 'wix' };

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
  return token || null;
}

export async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(request);
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user?.email) {
      const rawName = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name;
      return {
        id: data.user.id,
        email: data.user.email,
        emailVerified: Boolean(data.user.email_confirmed_at),
        fullName: typeof rawName === 'string' ? rawName.trim().slice(0, 120) : undefined,
        provider: 'supabase',
      };
    }
  }

  // A Wix token is never decoded or trusted locally. The Wix Members endpoint
  // resolves the caller's own profile before any data route uses its identity.
  return getWixMemberIdentity(token);
}

/** Local simulator only. It is deliberately unavailable in production. */
export function getDevelopmentDemoEmail(request: Request): string | null {
  if (isProduction) return null;
  const value = request.headers.get('x-simdream-demo-email')?.trim().toLowerCase();
  return value && value.includes('@') ? value : null;
}
