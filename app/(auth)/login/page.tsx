'use client';

import React, { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Apple, ArrowRight, AlertCircle, Facebook, Lock, Mail, Plane, UserRound, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth, type SocialAuthProvider } from '@/lib/auth/auth-context';

const demoModeEnabled = process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL;
type MemberMode = 'sign-in' | 'sign-up' | 'recovery';

const providerDetails: Array<{ provider: SocialAuthProvider; label: string; icon: LucideIcon }> = [
  { provider: 'google', label: 'Continue with Google', icon: UserRound },
  { provider: 'facebook', label: 'Continue with Facebook', icon: Facebook },
  { provider: 'apple', label: 'Continue with Apple', icon: Apple },
];

export default function LoginPage() {
  const fieldId = useId();
  const router = useRouter();
  const { login, signup, loginWithProvider, resetPassword, setDemoUser } = useAuth();
  const [mode, setMode] = useState<MemberMode>('sign-in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const switchMode = (nextMode: MemberMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setNotice('');

    const result =
      mode === 'sign-up'
        ? await signup(fullName, email, password)
        : mode === 'recovery'
        ? await resetPassword(email)
        : await login(email, password);

    setIsLoading(false);
    if (!result.success) {
      setError(result.message || 'We could not complete that request. Please try again.');
      return;
    }
    if (result.needsEmailConfirmation || mode === 'recovery') {
      setNotice(result.message || 'Check your email for the next step.');
      return;
    }
    router.push('/dashboard');
  };

  const handleProvider = async (provider: SocialAuthProvider) => {
    setIsLoading(true);
    setError('');
    const result = await loginWithProvider(provider);
    if (!result.success) {
      setError(result.message || 'Social sign-in is unavailable.');
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (type: 'pilot' | 'admin') => {
    if (!setDemoUser(type)) {
      setError('Demo access is only available when local authentication is not configured.');
      return;
    }
    router.push(type === 'admin' ? '/admin' : '/dashboard');
  };

  const isRecovery = mode === 'recovery';
  const isSignup = mode === 'sign-up';
  const title = isRecovery ? 'Recover your member access' : isSignup ? 'Create your member profile' : 'Member Flight Deck Login';
  const subtitle = isRecovery
    ? 'We will send a secure password-recovery link if this email has a member profile.'
    : isSignup
    ? 'Save your paid sessions, receipts, and future reservations in one secure flight deck.'
    : 'Access your sessions, payment receipts, and upcoming missions.';

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 hud-grid">
      <Card className="max-w-md w-full p-8 space-y-6 shadow-2xl border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center mx-auto shadow-glow">
            <Plane className="w-6 h-6 text-white -rotate-45" />
          </div>
          <h1 className="text-2xl font-black text-white">{title}</h1>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">{notice}</div>}

        {!isRecovery && (
          <div className="space-y-2">
            {providerDetails.map(({ provider, label, icon: Icon }) => (
              <Button
                key={provider}
                type="button"
                variant="secondary"
                className="w-full justify-center"
                disabled={isLoading}
                onClick={() => handleProvider(provider)}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Button>
            ))}
            <div className="relative py-2 text-center text-[10px] font-mono text-slate-400 before:absolute before:left-0 before:right-0 before:top-1/2 before:border-t before:border-slate-800">
              <span className="relative bg-slate-900 px-3">OR CONTINUE WITH EMAIL</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isSignup && (
            <div className="space-y-1.5">
              <label htmlFor={`${fieldId}-full-name`} className="font-mono uppercase text-slate-400 font-semibold">Full Name</label>
              <div className="relative">
                <UserRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  id={`${fieldId}-full-name`}
                  type="text"
                  required
                  maxLength={120}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-9 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-email`} className="font-mono uppercase text-slate-400 font-semibold">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                id={`${fieldId}-email`}
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="pilot@example.com"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-9 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {!isRecovery && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor={`${fieldId}-password`} className="font-mono uppercase text-slate-400 font-semibold">Password</label>
                {!isSignup && (
                  <button type="button" onClick={() => switchMode('recovery')} className="text-sky-400 hover:underline text-[10px]">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  id={`${fieldId}-password`}
                  type="password"
                  required
                  minLength={isSignup ? 12 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isSignup ? '12 or more characters' : '••••••••'}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-9 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          <Button type="submit" size="md" isLoading={isLoading} className="w-full font-bold">
            <span>{isRecovery ? 'Send recovery email' : isSignup ? 'Create member profile' : 'Sign in to Flight Deck'}</span>
            {!isRecovery && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>

        <div className="text-center text-xs text-slate-400 space-y-2">
          {isRecovery ? (
            <button type="button" onClick={() => switchMode('sign-in')} className="text-sky-400 hover:underline font-semibold">Return to sign in</button>
          ) : isSignup ? (
            <button type="button" onClick={() => switchMode('sign-in')} className="text-sky-400 hover:underline font-semibold">Already a member? Sign in</button>
          ) : (
            <button type="button" onClick={() => switchMode('sign-up')} className="text-sky-400 hover:underline font-semibold">Create a member profile</button>
          )}
          <p>
            Prefer not to register? <Link href="/book" className="text-sky-400 hover:underline font-semibold">Continue as a guest</Link>.
          </p>
        </div>

        {demoModeEnabled && (
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <p className="text-[11px] font-mono text-slate-400 text-center uppercase tracking-wider">Local demo access</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button onClick={() => handleQuickDemo('pilot')} className="p-2.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 font-mono text-center transition-colors">
                <span className="block font-bold">Pilot Account</span>
                <span className="text-[10px] text-slate-400">View Logbook</span>
              </button>
              <button onClick={() => handleQuickDemo('admin')} className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-center transition-colors">
                <span className="block font-bold">Admin Dispatch</span>
                <span className="text-[10px] text-slate-400">Manage Center</span>
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
