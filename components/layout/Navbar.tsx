'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  User,
  ShieldAlert,
  Award,
  Calendar,
  ChevronDown,
  ExternalLink,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { buttonClassName } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { getOffersNavLabel } from '@/lib/offers/nav-label';
import { UiThemeSwitcher } from './UiThemeSwitcher';
import { CockpitToneSwitcher } from './CockpitToneSwitcher';
import { WhatsAppAction } from './WhatsAppAction';
import { SOCIAL_CHANNELS } from './social-channels';

const demoModeEnabled = process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL;

type NavigationGroupId = 'experiences' | 'professional' | 'visit' | 'social';
type NavigationItem = {
  name: string;
  href: string;
  external?: boolean;
  icon?: LucideIcon;
  iconClassName?: string;
};

const NAVIGATION_GROUP_IDS: NavigationGroupId[] = ['experiences', 'professional', 'visit', 'social'];
const HORIZONTAL_MENU_KEYS = {
  ltr: { forward: 'ArrowRight', backward: 'ArrowLeft' },
  rtl: { forward: 'ArrowLeft', backward: 'ArrowRight' },
} as const;

/**
 * A compact, Apple-inspired navigation model: clear categories with a full-width detail
 * panel on larger screens. The actual labels and destinations stay in the i18n dictionary.
 */
export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDesktopMenu, setActiveDesktopMenu] = useState<NavigationGroupId | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAdmin, logout, setDemoUser } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const offersLabel = getOffersNavLabel(language);
  const memberName = user?.fullName || user?.email || t.member.dashboard.defaultPilotName;
  const navbarRef = useRef<HTMLElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopTriggerRefs = useRef<Record<NavigationGroupId, HTMLButtonElement | null>>({
    experiences: null,
    professional: null,
    visit: null,
    social: null,
  });
  const menuUid = useId();

  const navLinks = [
    { name: t.nav.experiences, href: '/experiences' },
    { name: offersLabel, href: '/offers' },
    { name: t.nav.subscriptions, href: '/subscriptions' },
    { name: t.nav.simulator, href: '/pro' },
    { name: t.nav.workshops, href: '/workshops' },
    { name: t.nav.vouchers, href: '/vouchers' },
    { name: t.nav.contact, href: '/contact' },
    { name: t.nav.fearOfFlying, href: '/fear-of-flying' },
    { name: t.nav.blog, href: '/blog' },
  ];

  const socialLinks: NavigationItem[] = SOCIAL_CHANNELS.map(({ name, href, icon, iconClassName }) => ({
    name,
    href,
    external: true,
    icon,
    iconClassName,
  }));

  const navigationGroups: Array<{
    id: NavigationGroupId;
    label: string;
    items: NavigationItem[];
  }> = [
    {
      id: 'experiences',
      label: t.nav.experiences,
      items: [
        { name: t.nav.experiences, href: '/experiences' },
        { name: offersLabel, href: '/offers' },
        { name: t.nav.subscriptions, href: '/subscriptions' },
        { name: t.nav.vouchers, href: '/vouchers' },
        { name: t.nav.fearOfFlying, href: '/fear-of-flying' },
      ],
    },
    {
      id: 'professional',
      label: t.nav.simulator,
      items: [
        { name: t.nav.simulator, href: '/pro' },
        { name: t.nav.workshops, href: '/workshops' },
      ],
    },
    {
      id: 'visit',
      label: t.nav.contact,
      items: [
        { name: t.nav.contact, href: '/contact' },
        { name: t.nav.about, href: '/about' },
        { name: t.nav.blog, href: '/blog' },
      ],
    },
    {
      id: 'social',
      label: t.nav.socialMedia,
      items: socialLinks,
    },
  ];

  const isActive = (path: string) => pathname === path || (path === '/pro' && pathname === '/simulator');
  const activeGroup = (group: (typeof navigationGroups)[number]) => group.items.some((item) => isActive(item.href));
  const desktopMenuId = (id: NavigationGroupId) => `desktop-navigation-${menuUid}-${id}`;

  const focusDesktopMenuItem = (id: NavigationGroupId, edge: 'first' | 'last' = 'first') => {
    requestAnimationFrame(() => {
      const links = document.querySelectorAll<HTMLElement>(`#${CSS.escape(desktopMenuId(id))} [role="menuitem"]`);
      const target = edge === 'last' ? links[links.length - 1] : links[0];
      target?.focus();
    });
  };

  // A flyout opened by hovering must survive the click that usually follows: the pointer
  // reaches the trigger (hover opens the menu) before the button is pressed, so a plain
  // toggle closed the menu on every mouse click, and Firefox could never open one by clicking.
  const hoverOpenedMenuRef = useRef<NavigationGroupId | null>(null);

  const closeDesktopMenu = (restoreFocus = false) => {
    const trigger = activeDesktopMenu ? desktopTriggerRefs.current[activeDesktopMenu] : null;
    hoverOpenedMenuRef.current = null;
    setActiveDesktopMenu(null);
    if (restoreFocus) requestAnimationFrame(() => trigger?.focus());
  };

  const closeMobileMenu = (restoreFocus = false) => {
    setMobileMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => mobileMenuTriggerRef.current?.focus());
  };

  const toggleDesktopMenuFromClick = (id: NavigationGroupId, isOpen: boolean) => {
    if (isOpen && hoverOpenedMenuRef.current === id) {
      hoverOpenedMenuRef.current = null; // the click confirms the hover-opened menu; the next click closes it
      return;
    }
    if (isOpen) closeDesktopMenu();
    else openDesktopMenu(id);
  };

  const openDesktopMenu = (id: NavigationGroupId, focusItem = false) => {
    setUserDropdownOpen(false);
    setActiveDesktopMenu(id);
    if (focusItem) focusDesktopMenuItem(id);
  };

  const closeUserMenu = (restoreFocus = false) => {
    setUserDropdownOpen(false);
    if (restoreFocus) requestAnimationFrame(() => userTriggerRef.current?.focus());
  };

  const openUserMenu = (focusItem = false) => {
    setActiveDesktopMenu(null);
    setUserDropdownOpen(true);
    if (focusItem) {
      requestAnimationFrame(() => userMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    }
  };

  useEffect(() => {
    // Navigation must never leave a previous route's menu or drawer open.
    setMobileMenuOpen(false);
    setActiveDesktopMenu(null);
    setUserDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!navbarRef.current?.contains(event.target as Node)) {
        setMobileMenuOpen(false);
        setActiveDesktopMenu(null);
        setUserDropdownOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mobileMenuOpen) {
        event.preventDefault();
        closeMobileMenu(true);
      } else if (userDropdownOpen) {
        event.preventDefault();
        closeUserMenu(true);
      } else if (activeDesktopMenu) {
        event.preventDefault();
        closeDesktopMenu(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeDesktopMenu, mobileMenuOpen, userDropdownOpen]);

  const handleDesktopTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, id: NavigationGroupId) => {
    const position = NAVIGATION_GROUP_IDS.indexOf(id);
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDesktopMenu(id, true);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      openDesktopMenu(id);
      focusDesktopMenuItem(id, 'last');
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      // Direction is only used for physical keyboard layout, never to choose display text.
      const direction = (['ltr', 'rtl'] as const)[Number(isRTL)];
      const delta = event.key === HORIZONTAL_MENU_KEYS[direction].forward ? 1 : -1;
      const targetId = NAVIGATION_GROUP_IDS[(position + delta + NAVIGATION_GROUP_IDS.length) % NAVIGATION_GROUP_IDS.length];
      desktopTriggerRefs.current[targetId]?.focus();
    }
  };

  const handleDesktopMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const menuItems = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDesktopMenu(true);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      menuItems[event.key === 'Home' ? 0 : menuItems.length - 1]?.focus();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      menuItems[(currentIndex + delta + menuItems.length) % menuItems.length]?.focus();
    }
  };

  const closeDesktopMenuOnPointerExit = () => {
    // A keyboard-opened flyout must stay available even if a synthetic pointer-leave fires.
    // The document-level outside-pointer handler still closes pointer-only flyouts as expected.
    if (!navbarRef.current?.contains(document.activeElement)) {
      hoverOpenedMenuRef.current = null;
      setActiveDesktopMenu(null);
    }
  };

  return (
    <nav
      ref={navbarRef}
      data-site-navbar
      className="sticky top-0 z-50 relative bg-slate-950/85 backdrop-blur-lg border-b border-slate-800/80"
      onMouseLeave={closeDesktopMenuOnPointerExit}
    >
      {/* Same 80rem column as the utility bar and the page content, so on a wide Mac screen the logo,
          menu and actions sit together in the middle instead of at the far screen edges. */}
      <div data-site-navbar-inner className="max-w-7xl mx-auto px-3 min-[380px]:px-4 sm:px-6 lg:px-8">
        <div data-site-navbar-row className="flex items-center justify-between gap-2 sm:gap-3 h-20">
          {/* The header shows the brand image alone, with no tagline beneath it in any language
              (AGENTS.md §1). The link's accessible name comes from the logo's alt text. */}
          <Link href="/" className="flex items-center group shrink-0">
            <BrandLogo className="h-6 sm:h-7 w-auto group-hover:opacity-90 transition-opacity" priority />
          </Link>

          {/* Large layouts retain quiet top-level choices; each exposes a deliberate full-width panel. */}
          <div className="hidden xl:flex flex-1 min-w-0 items-center justify-center gap-0.5">
            {navigationGroups.map((group) => {
              const isOpen = activeDesktopMenu === group.id;
              return (
                <button
                  key={group.id}
                  ref={(element) => {
                    desktopTriggerRefs.current[group.id] = element;
                  }}
                  type="button"
                  data-navbar-menu-trigger
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  aria-controls={desktopMenuId(group.id)}
                  onMouseEnter={() => {
                    if (activeDesktopMenu !== group.id) hoverOpenedMenuRef.current = group.id;
                    openDesktopMenu(group.id);
                  }}
                  onClick={() => toggleDesktopMenuFromClick(group.id, isOpen)}
                  onKeyDown={(event) => handleDesktopTriggerKeyDown(event, group.id)}
                  className={`inline-flex min-h-11 items-center gap-1 px-3 text-sm leading-tight font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                    activeGroup(group) || isOpen ? 'text-sky-400' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <div
            data-navbar-actions
            className="hidden md:flex shrink-0 items-center gap-1.5"
            onFocus={() => setActiveDesktopMenu(null)}
            onPointerDown={() => setActiveDesktopMenu(null)}
          >
            <UiThemeSwitcher variant="compact" />
            <CockpitToneSwitcher variant="compact" />
            <div className="relative">
              <button
                ref={userTriggerRef}
                type="button"
                data-user-menu-trigger
                onClick={() => (userDropdownOpen ? closeUserMenu() : openUserMenu())}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openUserMenu(true);
                  }
                }}
                aria-haspopup="menu"
                aria-expanded={userDropdownOpen}
                aria-controls={`user-navigation-${menuUid}`}
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

              {userDropdownOpen && (
                <div
                  ref={userMenuRef}
                  id={`user-navigation-${menuUid}`}
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
                    onClick={() => closeUserMenu()}
                    className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus-visible:bg-slate-800"
                  >
                    <Award className="w-4 h-4 text-sky-400" />
                    <span>{user ? t.nav.logbook : t.nav.pilotLogin}</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      role="menuitem"
                      onClick={() => closeUserMenu()}
                      className="flex items-center gap-2 px-3 py-2 text-amber-300 hover:text-amber-200 hover:bg-slate-800 focus:outline-none focus-visible:bg-slate-800"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>{t.nav.adminBoard}</span>
                    </Link>
                  )}

                  {demoModeEnabled && (
                    <div className="px-3 py-1.5 border-t border-slate-800 mt-1">
                      <p className="text-[10px] text-slate-400 mb-1">Quick Demo Switcher:</p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDemoUser('pilot');
                            closeUserMenu();
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                        >
                          {t.nav.pilotMode}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDemoUser('admin');
                            closeUserMenu();
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
                        closeUserMenu();
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

            <Link
              href="/book"
              data-ui-control="button"
              data-button-variant="primary"
              className={buttonClassName('primary', 'sm', 'min-h-11 whitespace-nowrap')}
            >
              {t.nav.bookFlight}
            </Link>
          </div>

          {/* Tablet and phone navigation stays deliberately simple and touch-first. */}
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
              <Link
                href="/book"
                data-ui-control="button"
                data-button-variant="primary"
                className={buttonClassName('primary', 'sm', 'min-h-11 px-3')}
              >
                {t.nav.bookFlight.split(' ')[0]}
              </Link>
            </div>
            <button
              ref={mobileMenuTriggerRef}
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              data-mobile-menu-trigger
              className={`min-w-12 min-h-12 inline-flex items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 touch-manipulation cursor-pointer ${
                mobileMenuOpen
                  ? 'border-sky-400 bg-sky-500/20 text-white'
                  : 'border-slate-700 bg-slate-900/80 text-slate-100 hover:border-slate-500 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {activeDesktopMenu && (
        <div
          id={desktopMenuId(activeDesktopMenu)}
          role="menu"
          aria-label={navigationGroups.find((group) => group.id === activeDesktopMenu)?.label}
          data-navbar-menu-panel
          onKeyDown={handleDesktopMenuKeyDown}
          className="hidden xl:block absolute inset-x-0 top-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-2xl shadow-2xl"
        >
          <div className="max-w-5xl mx-auto grid grid-cols-[minmax(13rem,1fr)_minmax(0,2fr)] gap-10 px-6 py-7">
            <div>
              <p data-navbar-menu-heading className="text-xs font-semibold tracking-wide text-sky-400">
                {navigationGroups.find((group) => group.id === activeDesktopMenu)?.label}
              </p>
              <p className="mt-2 max-w-52 text-sm leading-6 text-slate-400">{t.nav.brandSub}</p>
            </div>
            <div className="grid gap-1">
              {navigationGroups
                .find((group) => group.id === activeDesktopMenu)
                ?.items.map((item) => {
                  const Icon = item.icon;
                  const itemClassName = `group flex min-h-12 items-center justify-between rounded-xl px-4 text-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isActive(item.href) ? 'bg-sky-500/10 text-sky-400' : 'text-slate-100 hover:bg-slate-900 hover:text-white'
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
                      onClick={() => closeDesktopMenu()}
                      className={itemClassName}
                    >
                      {itemContents}
                    </a>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => closeDesktopMenu()}
                      className={itemClassName}
                    >
                      {itemContents}
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          data-mobile-navigation
          aria-label={t.nav.openMenu}
          className="xl:hidden absolute inset-x-0 top-full z-[70] max-h-[calc(100svh-8rem)] overflow-y-auto overscroll-contain border-t border-slate-700 bg-slate-950/98 px-4 pt-3 pb-safe-area-4 space-y-3 shadow-2xl backdrop-blur-xl"
        >
          <Link
            href={user ? '/dashboard' : '/login'}
            onClick={() => closeMobileMenu()}
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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => closeMobileMenu()}
                className={`block min-h-12 px-3 py-3 rounded-xl text-base font-medium ${
                  isActive(link.href) ? 'text-sky-400 bg-sky-500/10' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <Link
              href={user ? '/dashboard' : '/login'}
              onClick={() => closeMobileMenu()}
              className="block min-h-12 px-3 py-3 rounded-xl text-base font-medium text-slate-300 hover:bg-slate-900"
            >
              {user ? t.nav.logbook : t.nav.pilotLogin}
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => closeMobileMenu()}
                className="block min-h-12 px-3 py-3 rounded-xl text-base font-medium text-amber-400 hover:bg-slate-900"
              >
                {t.nav.adminBoard}
              </Link>
            )}
          </div>

          <details className="group border-t border-slate-800 pt-3">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl px-3 text-base font-medium text-slate-200 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
              <span>{t.nav.about}</span>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-1 grid gap-1 border-l border-slate-800 pl-2 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-2">
              {[
                { name: t.nav.about, href: '/about' },
                { name: t.nav.contact, href: '/contact' },
                { name: t.footer.termsRules, href: '/rules' },
                { name: t.footer.privacyPolicy, href: '/privacy-policy' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => closeMobileMenu()}
                  className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </details>

          <div className="pt-2 border-t border-slate-800 space-y-2.5">
            <UiThemeSwitcher variant="full" />
            <CockpitToneSwitcher variant="full" />
          </div>

          {demoModeEnabled && (
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
      )}
    </nav>
  );
}
