import 'server-only';

import { isProduction } from '@/lib/config/server-env';
import { requireSupabaseAdmin } from '@/lib/db/supabase-admin';
import type { VerifiedMemberIdentity } from './member-ownership';

export type AuthenticatedUser = VerifiedMemberIdentity;

export async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';

  if (!token) return null;
  const { data, error } = await requireSupabaseAdmin().auth.getUser(token);
  if (error || !data.user?.email) return null;
  const rawName = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name;
  return {
    id: data.user.id,
    email: data.user.email,
    emailVerified: Boolean(data.user.email_confirmed_at),
    fullName: typeof rawName === 'string' ? rawName.trim().slice(0, 120) : undefined,
  };
}

/** Local simulator only. It is deliberately unavailable in production. */
export function getDevelopmentDemoEmail(request: Request): string | null {
  if (isProduction) return null;
  const value = request.headers.get('x-simdream-demo-email')?.trim().toLowerCase();
  return value && value.includes('@') ? value : null;
}
