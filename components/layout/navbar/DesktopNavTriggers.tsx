'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { isNavGroupActive, type NavigationGroup } from './navigation-model';
import type { NavbarDesktopMenu } from './use-navbar-menus';

type DesktopNavTriggersProps = {
  groups: NavigationGroup[];
  pathname: string;
  menu: NavbarDesktopMenu;
};

/** Large layouts retain quiet top-level choices; each exposes a deliberate full-width panel (DesktopNavPanel). */
export function DesktopNavTriggers({ groups, pathname, menu }: DesktopNavTriggersProps) {
  return (
    <div className="hidden xl:flex flex-1 min-w-0 items-center justify-center gap-0.5">
      {groups.map((group) => {
        const isOpen = menu.activeId === group.id;
        return (
          <button
            key={group.id}
            ref={menu.registerTrigger(group.id)}
            type="button"
            data-navbar-menu-trigger
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls={menu.panelId(group.id)}
            onMouseEnter={() => menu.hoverTrigger(group.id)}
            onClick={() => menu.clickTrigger(group.id)}
            onKeyDown={(event) => menu.onTriggerKeyDown(event, group.id)}
            className={`inline-flex min-h-11 items-center gap-1 px-3 text-sm leading-tight font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
              isNavGroupActive(group, pathname) || isOpen ? 'text-sky-400' : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>{group.label}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
