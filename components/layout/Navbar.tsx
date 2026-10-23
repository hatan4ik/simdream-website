'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plane, Menu, X, User, ShieldAlert, Award, Calendar, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { LanguageSelector } from './LanguageSelector';
import { UiThemeSwitcher } from './UiThemeSwitcher';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAdmin, logout, setDemoUser } = useAuth();
  const { t, isRTL } = useLanguage();

  const navLinks = [
    { name: t.nav.experiences, href: '/experiences' },
    { name: t.nav.simulator, href: '/about' },
    { name: t.nav.workshops, href: '/workshops' },
    { name: t.nav.vouchers, href: '/vouchers' },
    { name: t.nav.contact, href: '/contact' },
  ];

  const isActive = (path: string) =>
    pathname === path || (path === '/about' && pathname === '/simulator');

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-lg border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform shrink-0">
              <Plane className="w-6 h-6 text-white transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white">SIM DREAM</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                  737 MAX
                </span>
              </div>
              <p className="text-[10px] tracking-widest text-slate-400 uppercase font-mono">
                {t.nav.brandSub}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive(link.href)
                    ? 'text-sky-400 bg-sky-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Actions: UI Interface Switcher, Language Selector, User Menu & Book Button */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* UI Interface Switcher */}
            <UiThemeSwitcher variant="compact" />

            {/* Language Selector */}
            <LanguageSelector />

            {/* Quick Demo Switcher / User Profile */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-sky-400'}`} />
                <span className="font-medium">{user ? user.fullName : t.nav.pilotLogin}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl py-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-mono">Signed in as</p>
                    <p className="font-semibold text-white truncate">{user?.email || 'Guest'}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono text-[10px]">
                      {isAdmin ? 'DISPATCHER (ADMIN)' : 'PILOT IN COMMAND'}
                    </span>
                  </div>

                  <Link
                    href="/dashboard"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    <Award className="w-4 h-4 text-sky-400" />
                    <span>{t.nav.logbook}</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-amber-300 hover:text-amber-200 hover:bg-slate-800"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>{t.nav.adminBoard}</span>
                    </Link>
                  )}

                  <div className="px-3 py-1.5 border-t border-slate-800 mt-1">
                    <p className="text-[10px] text-slate-500 mb-1">Quick Demo Switcher:</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setDemoUser('pilot');
                          setUserDropdownOpen(false);
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                      >
                        {t.nav.pilotMode}
                      </button>
                      <button
                        onClick={() => {
                          setDemoUser('admin');
                          setUserDropdownOpen(false);
                        }}
                        className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 rounded text-[10px]"
                      >
                        {t.nav.adminMode}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 mt-1 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-slate-800 text-left rtl:text-right"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t.nav.logout}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main Booking CTA */}
            <Link href="/book">
              <Button variant="primary" size="md" className="font-semibold">
                <Calendar className="w-4 h-4" />
                <span>{t.nav.bookFlight}</span>
              </Button>
            </Link>
          </div>

          {/* Mobile Menu & Language Toggle */}
          <div className="flex items-center gap-1.5 md:hidden">
            <UiThemeSwitcher variant="compact" />
            <LanguageSelector />
            <Link href="/book">
              <Button variant="primary" size="sm">
                {t.nav.bookFlight.split(' ')[0]}
              </Button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-6 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-base font-medium ${
                  isActive(link.href) ? 'text-sky-400 bg-sky-500/10' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-300 hover:bg-slate-900"
            >
              {t.nav.logbook}
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-amber-400 hover:bg-slate-900"
              >
                {t.nav.adminBoard}
              </Link>
            )}
          </div>

          {/* UI Interface Switcher for Mobile Drawer */}
          <div className="pt-2 border-t border-slate-800">
            <UiThemeSwitcher variant="full" />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Demo Role:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setDemoUser('pilot')}
                className="px-2.5 py-1 text-xs rounded bg-sky-500/20 text-sky-400"
              >
                {t.nav.pilotMode}
              </button>
              <button
                onClick={() => setDemoUser('admin')}
                className="px-2.5 py-1 text-xs rounded bg-amber-500/20 text-amber-400"
              >
                {t.nav.adminMode}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
