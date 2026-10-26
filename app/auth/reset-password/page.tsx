'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, KeyRound, Plane } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadRecoverySession = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError('Password recovery is not configured for this environment.');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('This recovery link is invalid or has expired. Request a new link from member login.');
        return;
      }
      setReady(true);
    };
    void loadRecoverySession();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 12) {
      setError('Use a password with at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (!supabase) return;
    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);
    if (updateError) {
      setError('We could not update your password. Request a new recovery link and try again.');
      return;
    }
    setMessage('Password updated. Redirecting to your flight deck…');
    router.replace('/dashboard');
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 hud-grid">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center mx-auto shadow-glow">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Set a new password</h1>
          <p className="text-xs text-slate-400">Choose a strong password for your Sim Dream member profile.</p>
        </div>

        {error && <p className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs">{error}</p>}
        {message && <p className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">{message}</p>}

        {ready && (
          <form onSubmit={submit} className="space-y-4">
            <input
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password (12+ characters)"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <input
              type="password"
              required
              minLength={12}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              <Plane className="w-4 h-4 -rotate-45" />
              <span>Save new password</span>
            </Button>
          </form>
        )}

        {!ready && !error && <p className="text-center text-sm text-slate-400">Validating your recovery link…</p>}
        <Link href="/login" className="block text-center text-xs text-sky-400 hover:underline">Return to member login</Link>
      </Card>
    </div>
  );
}
