'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Award, Calendar, BookOpen, Gift, ShieldAlert, LogOut, Plane } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="flex-1 bg-aviation-darkest py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Pilot Sidebar */}
        <aside className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
          {/* Pilot Profile Summary */}
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-400 flex items-center justify-center font-bold text-lg">
              <Plane className="w-6 h-6 -rotate-45" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm truncate">{user?.fullName || 'Pilot In Command'}</h3>
              <p className="text-[11px] font-mono text-slate-400 truncate">{user?.email || 'pilot@simdream.co.il'}</p>
              <span className="inline-block mt-1 text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                &bull; Status: Active Flyer
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 text-xs">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-sky-500/10 text-sky-400 font-semibold"
            >
              <Award className="w-4 h-4" />
              <span>Pilot Logbook & Missions</span>
            </Link>

            <Link
              href="/book"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Book New Flight Mission</span>
            </Link>

            <Link
              href="/vouchers"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Gift className="w-4 h-4 text-purple-400" />
              <span>Gift Voucher Portal</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-amber-400 hover:bg-amber-950/40 transition-colors"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Admin Dispatch Board</span>
              </Link>
            )}
          </nav>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-slate-800 text-xs text-left transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Dashboard Content Area */}
        <main className="lg:col-span-9">{children}</main>
      </div>
    </div>
  );
}

