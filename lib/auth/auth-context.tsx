'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import { DEMO_USERS } from '../db/seed-data';
import { isSupabaseConfigured, supabase } from '../supabaseClient';

const isProduction = process.env.NODE_ENV === 'production';

export type SocialAuthProvider = 'google' | 'facebook' | 'apple';

/** Provider brand names. They stay in Latin script in every language. */
export const SOCIAL_PROVIDER_LABELS: Record<SocialAuthProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
  apple: 'Apple',
};

/**
 * Stable, machine-readable outcome of an auth action. The UI localizes it
 * through `t.member.auth[code]`; `message` is only the English fallback.
 */
export type AuthResultCode =
  | 'authNotConfigured'
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'registrationNotConfigured'
  | 'passwordTooShort'
  | 'signupFailed'
  | 'confirmEmailToActivate'
  | 'socialAuthNotConfigured'
  | 'providerUnavailable'
  | 'recoveryNotConfigured'
  | 'recoveryFailed'
  | 'recoveryEmailSent';

/** Values for `{placeholder}` tokens in the copy for a result code. */
export interface AuthResultParams {
  provider?: string;
}

export interface AuthActionResult {
  success: boolean;
  /** Present on every result that carries something to tell the visitor. */
  code?: AuthResultCode;
  /** English fallback copy for `code`, already interpolated. */
  message?: string;
  params?: AuthResultParams;
  needsEmailConfirmation?: boolean;
}

/** English fallback copy, kept identical to the `en` entries of `member.auth`. */
const AUTH_RESULT_FALLBACK_COPY: Record<AuthResultCode, string> = {
  authNotConfigured: 'Member authentication is not configured.',
  invalidCredentials: 'Email or password is incorrect.',
  emailNotConfirmed: 'Please confirm your email address before signing in.',
  registrationNotConfigured: 'Member registration is not configured yet.',
  passwordTooShort: 'Use a password with at least 12 characters.',
  signupFailed: 'We could not create the member profile. Please try again.',
  confirmEmailToActivate: 'Check your email to confirm your address and activate your member profile.',
  socialAuthNotConfigured: 'Member authentication is not configured yet.',
  providerUnavailable: '{provider} sign-in is unavailable. Please use email or try again later.',
  recoveryNotConfigured: 'Password recovery is not configured yet.',
  recoveryFailed: 'We could not send a recovery email. Please try again later.',
  recoveryEmailSent: 'If an account exists for this email, a recovery link is on its way.',
};

/** Replaces `{name}` tokens with the matching params; unknown tokens are left untouched. */
export function formatAuthCopy(template: string, params: AuthResultParams = {}): string {
  const values = params as Record<string, string | undefined>;
  return template.replace(/\{(\w+)\}/g, (token, name: string) => values[name] ?? token);
}

function authResult(
  success: boolean,
  code: AuthResultCode,
  extra: { params?: AuthResultParams; needsEmailConfirmation?: boolean } = {}
): AuthActionResult {
  return { success, code, message: formatAuthCopy(AUTH_RESULT_FALLBACK_COPY[code], extra.params), ...extra };
}

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  signup: (fullName: string, email: string, password: string) => Promise<AuthActionResult>;
  loginWithProvider: (provider: SocialAuthProvider) => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  logout: () => void;
  setDemoUser: (type: 'pilot' | 'admin') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function profileFromUser(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  profile?: Record<string, unknown> | null
): UserProfile {
  return {
    id: user.id,
    email: user.email || '',
    fullName:
      typeof profile?.full_name === 'string'
        ? profile.full_name
        : typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : (user.email || 'Pilot').split('@')[0],
    phone: typeof profile?.phone_number === 'string' ? profile.phone_number : undefined,
    // Roles are only read from the authenticated user's protected profile row;
    // user metadata and an email string can never grant administrative access.
    role: profile?.role === 'admin' ? 'admin' : 'user',
    totalHours: typeof profile?.total_flight_hours === 'number' ? profile.total_flight_hours : 0,
    totalFlights: typeof profile?.total_flights === 'number' ? profile.total_flights : 0,
    pilotLicense: typeof profile?.pilot_license === 'string' ? profile.pilot_license : undefined,
    createdAt: typeof profile?.created_at === 'string' ? profile.created_at : new Date().toISOString(),
  };
}

async function getProfileForAuthenticatedUser(user: User): Promise<UserProfile> {
  if (!supabase) return profileFromUser(user);
  const { data } = await supabase
    .from('profiles')
    .select('full_name, phone_number, role, total_flight_hours, total_flights, pilot_license, created_at')
    .eq('id', user.id)
    .maybeSingle();
  return profileFromUser(user, data as Record<string, unknown> | null);
}

function authRedirect(path: '/auth/callback' | '/auth/reset-password'): string {
  return `${window.location.origin}${path}`;
}

async function bootstrapMember(accessToken: string): Promise<void> {
  await fetch('/api/membership/bootstrap', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const hydrateSession = async (session: Session) => {
      try {
        // This is idempotent. It creates the customer profile if a legacy user
        // predates the database trigger and securely claims prior guest orders.
        await bootstrapMember(session.access_token);
        const profile = await getProfileForAuthenticatedUser(session.user);
        if (active) setUser(profile);
      } catch {
        // Authentication remains valid if the customer-data sync is briefly
        // unavailable; protected APIs still enforce verified ownership.
        if (active) setUser(profileFromUser(session.user));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (isSupabaseConfigured && supabase) {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          void hydrateSession(data.session);
        } else if (active) {
          setIsLoading(false);
        }
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        if (session) {
          setIsLoading(true);
          void hydrateSession(session);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      });

      return () => {
        active = false;
        listener.subscription.unsubscribe();
      };
    }

    if (!isProduction) {
      try {
        const saved = localStorage.getItem('simdream_demo_user');
        if (saved && active) setUser(JSON.parse(saved) as UserProfile);
      } catch {
        localStorage.removeItem('simdream_demo_user');
      }
    }
    if (active) setIsLoading(false);
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthActionResult> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          return authResult(false, 'invalidCredentials');
        }
        if (!data.session) {
          return authResult(false, 'emailNotConfirmed', { needsEmailConfirmation: true });
        }
        // Avoid a signed-in-but-empty Flight Deck while the idempotent member
        // bootstrap request finishes in the auth-state listener.
        setUser(profileFromUser(data.user));
        return { success: true };
      }

      // Local-only simulation. It cannot be enabled in a production bundle.
      if (!isProduction) {
        const matched = DEMO_USERS.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
        if (matched && password.length > 0) {
          setUser(matched);
          localStorage.setItem('simdream_demo_user', JSON.stringify(matched));
          return { success: true };
        }
      }
      return authResult(false, 'authNotConfigured');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (fullName: string, email: string, password: string): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured || !supabase) {
      return authResult(false, 'registrationNotConfigured');
    }
    if (password.length < 12) {
      return authResult(false, 'passwordTooShort');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim().slice(0, 120) },
        emailRedirectTo: authRedirect('/auth/callback'),
      },
    });
    if (error) return authResult(false, 'signupFailed');
    if (data.session && data.user) {
      setUser(profileFromUser(data.user));
      return { success: true };
    }
    return authResult(true, 'confirmEmailToActivate', { needsEmailConfirmation: true });
  };

  const loginWithProvider = async (provider: SocialAuthProvider): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured || !supabase) {
      return authResult(false, 'socialAuthNotConfigured');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${authRedirect('/auth/callback')}?next=/dashboard` },
    });
    return error
      ? authResult(false, 'providerUnavailable', { params: { provider: SOCIAL_PROVIDER_LABELS[provider] } })
      : { success: true };
  };

  const resetPassword = async (email: string): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured || !supabase) {
      return authResult(false, 'recoveryNotConfigured');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirect('/auth/reset-password'),
    });
    // Do not disclose whether an address has a member account.
    return error ? authResult(false, 'recoveryFailed') : authResult(true, 'recoveryEmailSent');
  };

  const logout = () => {
    setUser(null);
    if (!isProduction) localStorage.removeItem('simdream_demo_user');
    if (isSupabaseConfigured && supabase) void supabase.auth.signOut();
  };

  const setDemoUser = (type: 'pilot' | 'admin'): boolean => {
    if (isProduction || isSupabaseConfigured) return false;
    const selected = type === 'admin' ? DEMO_USERS[1] : DEMO_USERS[0];
    setUser(selected);
    localStorage.setItem('simdream_demo_user', JSON.stringify(selected));
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        signup,
        loginWithProvider,
        resetPassword,
        logout,
        setDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
