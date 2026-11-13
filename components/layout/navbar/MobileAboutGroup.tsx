'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { ConsentSettingsLink } from '@/components/consent';
import { useLanguage } from '@/lib/i18n/language-context';
import type { NavigationLink } from './navigation-model';
import type { NavbarMobileMenu } from './use-navbar-menus';
import { useLocalizedInternalHref } from './use-localized-internal-href';

/** The classes every entry of this group shares, so the cookie-settings button reads exactly like its sibling links. */
const ABOUT_ENTRY_CLASS =
  'flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400';

type MobileAboutGroupProps = {
  links: NavigationLink[];
  menu: NavbarMobileMenu;
};

/**
 * The drawer's localized "About" disclosure. Phones have no footer, so this group also carries the
 * footer's legal entries: terms, privacy and, last, "Cookie settings" (the only way back to the consent
 * choice on a phone).
 */
export function MobileAboutGroup({ links, menu }: MobileAboutGroupProps) {
  const { t } = useLanguage();
  const localHref = useLocalizedInternalHref();
  return (
    <details className="group border-t border-slate-800 pt-3">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl px-3 text-base font-medium text-slate-200 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
        <span>{t.nav.about}</span>
        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-1 grid gap-1 border-l border-slate-800 pl-2 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-2">
        {links.map((link) => (
          <Link key={link.href} href={localHref(link.href)} onClick={() => menu.close()} className={ABOUT_ENTRY_CLASS}>
            {link.name}
          </Link>
        ))}
        {/* The button belongs to components/consent and takes no click callback, so this layout-neutral
            wrapper hears the click that bubbles up from it (also from Enter and Space) and closes the drawer.
            The dialog then opens over the page and hands focus back to the drawer's trigger when it closes. */}
        <div className="contents" onClick={menu.closeForDialog}>
          <ConsentSettingsLink className={`${ABOUT_ENTRY_CLASS} w-full cursor-pointer text-start`} />
        </div>
      </div>
    </details>
  );
}
