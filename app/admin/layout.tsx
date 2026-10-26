'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Calendar,
  Users,
  Gift,
  Plane,
  Radio,
  FileCheck,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth/auth-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const links = [
    { name: 'Dispatch Board', href: '/admin', icon: Radio },
    { name: 'Bookings Manifest', href: '/admin/bookings', icon: Calendar },
    { name: 'Corporate CRM Pipeline', href: '/admin/workshops', icon: Users },
    { name: 'Voucher Terminal', href: '/admin/vouchers', icon: Gift },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex-1 bg-aviation-darkest py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="space-y-6">
        {/* Top Operational Status Header */}
        <div className="rounded-2xl border border-amber-500/40 bg-slate-900/90 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-glowAmber">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">SIM DREAM DISPATCH COMMAND</h1>
                <Badge variant="amber">ADMIN ACCESS</Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                OPERATIONAL BASE: TEL AVIV (LLBG) &bull; SIMULATOR 1: BOEING 737 MAX 8
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-xs font-mono text-slate-400 hover:text-sky-400 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950"
            >
              Switch to Pilot View
            </Link>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all ${
                  active
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glowAmber'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Content Area */}
        <div>{children}</div>
      </div>
    </div>
  );
}

