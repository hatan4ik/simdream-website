'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plane, Lock, Mail, ShieldAlert, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, setDemoUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const success = await login(email);
    setIsLoading(false);

    if (success) {
      if (email.includes('admin')) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleQuickDemo = (type: 'pilot' | 'admin') => {
    setDemoUser(type);
    if (type === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 hud-grid">
      <Card className="max-w-md w-full p-8 space-y-6 shadow-2xl border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center mx-auto shadow-glow">
            <Plane className="w-6 h-6 text-white -rotate-45" />
          </div>
          <h1 className="text-2xl font-black text-white">Pilot Flight Deck Login</h1>
          <p className="text-xs text-slate-400">
            Access your flight hours logbook, certificates, and upcoming missions
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-mono uppercase text-slate-400 font-semibold">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pilot@simdream.co.il"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-9 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-mono uppercase text-slate-400 font-semibold">Password</label>
              <a href="#" className="text-sky-400 hover:underline text-[10px]">
                Forgot clearance?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-9 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <Button type="submit" size="md" isLoading={isLoading} className="w-full font-bold">
            <span>Sign In to Flight Deck</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <p className="text-[11px] font-mono text-slate-400 text-center uppercase tracking-wider">
            Quick Instant Demo Access:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickDemo('pilot')}
              className="p-2.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 font-mono text-center transition-colors"
            >
              <span className="block font-bold">Pilot Account</span>
              <span className="text-[10px] text-slate-400">View Logbook</span>
            </button>

            <button
              onClick={() => handleQuickDemo('admin')}
              className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-center transition-colors"
            >
              <span className="block font-bold">Admin Dispatch</span>
              <span className="text-[10px] text-slate-400">Manage Center</span>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400">
          <span>Don't have a profile yet? </span>
          <Link href="/book" className="text-sky-400 hover:underline font-semibold">
            Book a flight
          </Link>
        </div>
      </Card>
    </div>
  );
}

