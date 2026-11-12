'use client';

import React from 'react';
import { CockpitToneSwitcher } from '../CockpitToneSwitcher';
import { UiThemeSwitcher } from '../UiThemeSwitcher';
import { NavBookLink } from './NavBookLink';
import { UserMenu } from './UserMenu';
import type { NavbarMenus } from './use-navbar-menus';

type DesktopNavActionsProps = {
  menus: Pick<NavbarMenus, 'desktop' | 'user'>;
};

/**
 * Tablet and desktop actions (from md): theme and tone switches, the account menu and Book. Focusing or
 * pressing anything here dismisses an open flyout, so the two never stack.
 */
export function DesktopNavActions({ menus }: DesktopNavActionsProps) {
  return (
    <div
      data-navbar-actions
      className="hidden md:flex shrink-0 items-center gap-1.5"
      onFocus={menus.desktop.dismiss}
      onPointerDown={menus.desktop.dismiss}
    >
      <UiThemeSwitcher variant="compact" />
      <CockpitToneSwitcher variant="compact" />
      <UserMenu menu={menus.user} />
      <NavBookLink />
    </div>
  );
}
