'use client';

import React from 'react';
import Link from 'next/link';
import { Award, LogOut, ShieldAlert, User } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { DEMO_MODE_ENABLED } from './demo-mode';
import type { NavbarUserMenu } from './use-navbar-menus';
import { useNavbarMember } from './use-navbar-member';

/** The account button and its dropdown (tablet and desktop; phones get the same links at the top of the drawer). */
export function UserMenu({ menu }: { menu: NavbarUserMenu }) {
  const { t } = useLanguage();
  const { user, isAdmin, logout, setDemoUser, memberName } = useNavbarMember();

  return (
    <div className="relative">
      <button
        ref={menu.triggerRef}
        type="button"
        data-user-menu-trigger
        onClick={menu.toggle}
        onKeyDown={menu.onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-controls={menu.menuId}
        className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 touch-manipulation cursor-pointer"
      >
        <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-sky-400'}`} aria-hidden="true" />
        <User className="w-4 h-4" aria-hidden="true" />
        {user && (
          <span data-member-name className="hidden lg:block max-w-36 truncate text-sm font-medium text-slate-100">
            {memberName}
          </span>
        )}
        <span className="sr-only">{user ? memberName : t.nav.pilotLogin}</span>
      </button>

      {menu.open && (
        <div
          ref={menu.menuRef}
          id={menu.menuId}
          role="menu"
          aria-label={user ? memberName : t.nav.pilotLogin}
          className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-60 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl py-2 z-50 text-xs"
        >
          <div className="px-3 py-2 border-b border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-mono">{user ? t.member.dashboard.secureBadge : t.nav.pilotLogin}</p>
            <p data-member-name className="font-semibold text-white truncate">{user ? memberName : t.nav.pilotLogin}</p>
            {user?.email && user.email !== memberName && <p className="mt-0.5 truncate text-slate-400" dir="ltr">{user.email}</p>}
            {user && (
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono text-[10px]">
                {isAdmin ? 'DISPATCHER (ADMIN)' : 'PILOT IN COMMAND'}
              </span>
            )}
          </div>

          <Link
            href={user ? '/dashboard' : '/login'}
            role="menuitem"
            onClick={() => menu.close()}
            className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus-visible:bg-slate-800"
          >
            <Award className="w-4 h-4 text-sky-400" />
            <span>{user ? t.nav.logbook : t.nav.pilotLogin}</span>
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => menu.close()}
              className="flex items-center gap-2 px-3 py-2 text-amber-300 hover:text-amber-200 hover:bg-slate-800 focus:outline-none focus-visible:bg-slate-800"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{t.nav.adminBoard}</span>
            </Link>
          )}

          {DEMO_MODE_ENABLED && (
            <div className="px-3 py-1.5 border-t border-slate-800 mt-1">
              <p className="text-[10px] text-slate-400 mb-1">Quick Demo Switcher:</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDemoUser('pilot');
                    menu.close();
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                >
                  {t.nav.pilotMode}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDemoUser('admin');
                    menu.close();
                  }}
                  className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 rounded text-[10px]"
                >
                  {t.nav.adminMode}
                </button>
              </div>
            </div>
          )}

          {user && <div className="border-t border-slate-800 mt-1 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                logout();
                menu.close();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-slate-800 text-left rtl:text-right focus:outline-none focus-visible:bg-slate-800"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.nav.logout}</span>
            </button>
          </div>}
        </div>
      )}
    </div>
  );
}
