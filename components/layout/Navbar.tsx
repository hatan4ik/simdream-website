'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useLanguage } from '@/lib/i18n/language-context';
import { getOffersNavLabel } from '@/lib/offers/nav-label';
import {
  CompactNavActions,
  DesktopNavActions,
  DesktopNavPanel,
  DesktopNavTriggers,
  MobileNavigation,
  buildAboutLinks,
  buildNavigationGroups,
  buildNavigationLinks,
  useNavbarMenus,
} from './navbar/index';

/**
 * A compact, Apple-inspired navigation model: clear categories with a full-width detail
 * panel on larger screens. The actual labels and destinations stay in the i18n dictionary.
 *
 * This file only orchestrates: the destinations come from `navbar/navigation-model.ts`, every open/close
 * and keyboard rule from `useNavbarMenus`, and each visible part is its own component under `navbar/`
 * (see `navbar/index.ts` and docs/modules/navbar-modular.md). The import says `./navbar/index` on purpose:
 * on a case-insensitive file system (macOS, Windows) a bare `./navbar` would resolve to this very file.
 */
export function Navbar() {
  const pathname = usePathname();
  const { t, isRTL, language } = useLanguage();
  const menus = useNavbarMenus({ pathname, isRTL });
  const offersLabel = getOffersNavLabel(language);
  const navigationGroups = buildNavigationGroups(t, offersLabel);

  return (
    <nav
      ref={menus.navbarRef}
      data-site-navbar
      className="sticky top-0 z-50 relative bg-slate-950/85 backdrop-blur-lg border-b border-slate-800/80"
      onMouseLeave={menus.desktop.onPointerExit}
    >
      {/* Same 80rem column as the utility bar and the page content, so on a wide Mac screen the logo,
          menu and actions sit together in the middle instead of at the far screen edges. */}
      <div data-site-navbar-inner className="max-w-7xl mx-auto px-3 min-[380px]:px-4 sm:px-6 lg:px-8">
        <div data-site-navbar-row className="flex items-center justify-between gap-2 sm:gap-3 h-20">
          {/* The header shows the brand image alone, with no tagline beneath it in any language
              (AGENTS.md §1). The link's accessible name comes from the logo's alt text. */}
          {/* The logo is the one element that yields when the row is too tight (a 360px phone with a
              long short Book label): it scales down proportionally instead of pushing the menu
              trigger off screen. With room to spare nothing changes, so no layout shifts by a pixel. */}
          <Link href="/" className="flex items-center group min-w-0 shrink">
            <BrandLogo className="h-6 sm:h-7 w-auto min-w-0 object-contain group-hover:opacity-90 transition-opacity" priority />
          </Link>

          <DesktopNavTriggers groups={navigationGroups} pathname={pathname} menu={menus.desktop} />
          <DesktopNavActions menus={menus} />
          <CompactNavActions menu={menus.mobile} />
        </div>
      </div>

      <DesktopNavPanel groups={navigationGroups} pathname={pathname} menu={menus.desktop} />
      <MobileNavigation
        links={buildNavigationLinks(t, offersLabel)}
        aboutLinks={buildAboutLinks(t)}
        pathname={pathname}
        menu={menus.mobile}
      />
    </nav>
  );
}
