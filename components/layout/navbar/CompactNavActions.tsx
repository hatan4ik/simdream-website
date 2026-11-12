'use client';

import React from 'react';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { CockpitToneSwitcher } from '../CockpitToneSwitcher';
import { UiThemeSwitcher } from '../UiThemeSwitcher';
import { WhatsAppAction } from '../WhatsAppAction';
import { NavBookLink } from './NavBookLink';
import type { NavbarMobileMenu } from './use-navbar-menus';

/** Tablet and phone navigation stays deliberately simple and touch-first. */
export function CompactNavActions({ menu }: { menu: NavbarMobileMenu }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-1.5 xl:hidden">
      <div className="flex items-center gap-1.5 md:hidden">
        <div className="hidden sm:flex items-center gap-1.5">
          <UiThemeSwitcher variant="compact" />
          <CockpitToneSwitcher variant="compact" />
        </div>
        {/* From 360px WhatsApp lives beside Book, between the logo and the menu, which frees the
            top bar for the reviews, the social icons and the language selector. On narrower
            screens (no room beside Book) and from md up it stays in the top bar. */}
        <span className="hidden min-[360px]:contents">
          <WhatsAppAction placement="navbar" />
        </span>
        <NavBookLink compact />
      </div>
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={menu.toggle}
        aria-label={menu.open ? t.nav.closeMenu : t.nav.openMenu}
        aria-expanded={menu.open}
        aria-controls="mobile-navigation"
        data-mobile-menu-trigger
        className={`min-w-12 min-h-12 inline-flex items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 touch-manipulation cursor-pointer ${
          menu.open
            ? 'border-sky-400 bg-sky-500/20 text-white'
            : 'border-slate-700 bg-slate-900/80 text-slate-100 hover:border-slate-500 hover:bg-slate-800 hover:text-white'
        }`}
      >
        {menu.open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </div>
  );
}
