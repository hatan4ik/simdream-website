'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { isNavPathActive, type NavigationGroup } from './navigation-model';
import type { NavbarDesktopMenu } from './use-navbar-menus';

type DesktopNavPanelProps = {
  groups: NavigationGroup[];
  pathname: string;
  menu: NavbarDesktopMenu;
};

/** The full-width flyout under the header for the open group (xl and up). Renders nothing while none is open. */
export function DesktopNavPanel({ groups, pathname, menu }: DesktopNavPanelProps) {
  const { t } = useLanguage();
  if (!menu.activeId) return null;
  const group = groups.find((candidate) => candidate.id === menu.activeId);

  return (
    <div
      id={menu.panelId(menu.activeId)}
      role="menu"
      aria-label={group?.label}
      data-navbar-menu-panel
      onKeyDown={menu.onPanelKeyDown}
      className="hidden xl:block absolute inset-x-0 top-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-2xl shadow-2xl"
    >
      <div className="max-w-5xl mx-auto grid grid-cols-[minmax(13rem,1fr)_minmax(0,2fr)] gap-10 px-6 py-7">
        <div>
          <p data-navbar-menu-heading className="text-xs font-semibold tracking-wide text-sky-400">
            {group?.label}
          </p>
          <p className="mt-2 max-w-52 text-sm leading-6 text-slate-400">{t.nav.brandSub}</p>
        </div>
        <div className="grid gap-1">
          {group?.items.map((item) => {
            const Icon = item.icon;
            const itemClassName = `group flex min-h-12 items-center justify-between rounded-xl px-4 text-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              isNavPathActive(pathname, item.href) ? 'bg-sky-500/10 text-sky-400' : 'text-slate-100 hover:bg-slate-900 hover:text-white'
            }`;
            const itemContents = (
              <>
                <span className="inline-flex items-center gap-3">
                  {Icon && <Icon className={`h-5 w-5 ${item.iconClassName ?? 'text-sky-400'}`} aria-hidden="true" />}
                  {item.name}
                </span>
                {item.external ? (
                  <ExternalLink className="h-4 w-4 text-sky-400" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true" className="text-sky-400 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                    →
                  </span>
                )}
              </>
            );

            return item.external ? (
              <a
                key={item.href}
                href={item.href}
                role="menuitem"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => menu.close()}
                className={itemClassName}
              >
                {itemContents}
              </a>
            ) : (
              <Link key={item.href} href={item.href} role="menuitem" onClick={() => menu.close()} className={itemClassName}>
                {itemContents}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
