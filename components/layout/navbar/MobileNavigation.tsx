'use client';

import React from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { CockpitToneSwitcher } from '../CockpitToneSwitcher';
import { UiThemeSwitcher } from '../UiThemeSwitcher';
import { DEMO_MODE_ENABLED } from './demo-mode';
import { MobileAboutGroup } from './MobileAboutGroup';
import { isNavPathActive, type NavigationLink } from './navigation-model';
import type { NavbarMobileMenu } from './use-navbar-menus';
import { useNavbarMember } from './use-navbar-member';

type MobileNavigationProps = {
  /** The flat list of destinations. */
  links: NavigationLink[];
  /** The links inside the "About" disclosure. */
  aboutLinks: NavigationLink[];
  pathname: string;
  menu: NavbarMobileMenu;
};

/**
 * The phone and tablet drawer (`#mobile-navigation`, below xl): the member entry, the destinations, the
 * "About" group, the interface switches and, in local development only, the demo role switcher.
 * Rendered while `menu.open`; the trigger that controls it lives in CompactNavActions.
 */
export function MobileNavigation({ links, aboutLinks, pathname, menu }: MobileNavigationProps) {
  const { t } = useLanguage();
  const { user, isAdmin, setDemoUser, memberName } = useNavbarMember();
  if (!menu.open) return null;

  return (
    <div
      id="mobile-navigation"
      data-mobile-navigation
      aria-label={t.nav.openMenu}
      className="xl:hidden absolute inset-x-0 top-full z-[70] max-h-[calc(100svh-8rem)] overflow-y-auto overscroll-contain border-t border-slate-700 bg-slate-950/98 px-4 pt-3 pb-safe-area-4 space-y-3 shadow-2xl backdrop-blur-xl"
    >
      <Link
        href={user ? '/dashboard' : '/login'}
        onClick={() => menu.close()}
        className="flex min-h-14 items-center gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-slate-100 hover:bg-sky-500/10"
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${user ? (isAdmin ? 'bg-amber-400' : 'bg-sky-400') : 'bg-slate-500'}`} aria-hidden="true" />
        <User className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span data-member-name className="block truncate text-sm font-semibold">{user ? memberName : t.nav.pilotLogin}</span>
          {user?.email && user.email !== memberName && <span className="block truncate text-xs text-slate-400" dir="ltr">{user.email}</span>}
        </span>
      </Link>
      <div className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => menu.close()}
            className={`block min-h-12 px-3 py-3 rounded-xl text-base font-medium ${
              isNavPathActive(pathname, link.href) ? 'text-sky-400 bg-sky-500/10' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            {link.name}
          </Link>
        ))}
        <Link
          href={user ? '/dashboard' : '/login'}
          onClick={() => menu.close()}
          className="block min-h-12 px-3 py-3 rounded-xl text-base font-medium text-slate-300 hover:bg-slate-900"
        >
          {user ? t.nav.logbook : t.nav.pilotLogin}
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => menu.close()}
            className="block min-h-12 px-3 py-3 rounded-xl text-base font-medium text-amber-400 hover:bg-slate-900"
          >
            {t.nav.adminBoard}
          </Link>
        )}
      </div>

      <MobileAboutGroup links={aboutLinks} menu={menu} />

      <div className="pt-2 border-t border-slate-800 space-y-2.5">
        <UiThemeSwitcher variant="full" />
        <CockpitToneSwitcher variant="full" />
      </div>

      {DEMO_MODE_ENABLED && (
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Demo Role:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDemoUser('pilot')}
              className="px-2.5 py-1 text-xs rounded bg-sky-500/20 text-sky-400"
            >
              {t.nav.pilotMode}
            </button>
            <button
              type="button"
              onClick={() => setDemoUser('admin')}
              className="px-2.5 py-1 text-xs rounded bg-amber-500/20 text-amber-400"
            >
              {t.nav.adminMode}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
