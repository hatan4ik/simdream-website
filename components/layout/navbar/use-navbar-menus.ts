'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { NAVIGATION_GROUP_IDS, type NavigationGroupId } from './navigation-model';

const HORIZONTAL_MENU_KEYS = {
  ltr: { forward: 'ArrowRight', backward: 'ArrowLeft' },
  rtl: { forward: 'ArrowLeft', backward: 'ArrowRight' },
} as const;

export type UseNavbarMenusOptions = {
  /** The current route; a change of route closes every open menu. */
  pathname: string;
  /** Only used to mirror the Left/Right arrow keys between the desktop triggers, never to pick display text. */
  isRTL: boolean;
};

/**
 * All of the header's open/close state and its keyboard and focus behaviour, in one place:
 * the desktop flyouts (one open at a time, opened by hover, click or keyboard), the account menu and
 * the phone drawer. At most one of the flyout and the account menu is open; the drawer is independent.
 *
 *  - Route change closes everything. A pointer press outside the `<nav>` closes everything.
 *  - Escape closes the drawer first, then the account menu, then a flyout, and returns focus to the
 *    trigger that opened it (the drawer's, the account menu's or the flyout's).
 *  - A flyout opened by hover survives the click that usually follows (`clickTrigger`).
 *
 * There is no scroll lock: the header never had one (the drawer is an absolutely positioned panel with its
 * own overscroll containment) and this hook does not add one.
 *
 * Presentation stays in the components; they only read this return value. Move behaviour here, never into
 * the markup. The three groups (`desktop`, `user`, `mobile`) are typed with the `Navbar*Menu` aliases below.
 */
export function useNavbarMenus({ pathname, isRTL }: UseNavbarMenusOptions) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDesktopMenu, setActiveDesktopMenu] = useState<NavigationGroupId | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
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

  /**
   * Closes the drawer for an action that opens a modal dialog (the cookie settings). Focus goes back to the
   * drawer's trigger NOW, in the same event: the dialog records the focused element when it mounts and
   * returns focus there when it closes, and the focused entry is about to be unmounted with the drawer.
   * A deferred (animation-frame) focus, as `closeMobileMenu(true)` does, would race the dialog and steal
   * the focus it has just taken.
   */
  const closeMobileMenuForDialog = () => {
    mobileMenuTriggerRef.current?.focus();
    setMobileMenuOpen(false);
  };

  const openDesktopMenu = (id: NavigationGroupId, focusItem = false) => {
    setUserDropdownOpen(false);
    setActiveDesktopMenu(id);
    if (focusItem) focusDesktopMenuItem(id);
  };

  const toggleDesktopMenuFromClick = (id: NavigationGroupId, isOpen: boolean) => {
    if (isOpen && hoverOpenedMenuRef.current === id) {
      hoverOpenedMenuRef.current = null; // the click confirms the hover-opened menu; the next click closes it
      return;
    }
    if (isOpen) closeDesktopMenu();
    else openDesktopMenu(id);
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

  const handleDesktopTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, id: NavigationGroupId) => {
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

  const handleDesktopMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
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

  const handleUserTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openUserMenu(true);
    }
  };

  return {
    /** Ref of the `<nav>`: "outside the header" is measured against it. */
    navbarRef,
    desktop: {
      /** The open flyout group, or null. */
      activeId: activeDesktopMenu,
      /** The `id` of a group's panel, referenced by its trigger's `aria-controls`. */
      panelId: desktopMenuId,
      /** Ref callback for a group's trigger button (arrow keys and focus return use it). */
      registerTrigger: (id: NavigationGroupId) => (element: HTMLButtonElement | null) => {
        desktopTriggerRefs.current[id] = element;
      },
      /** Pointer enters a trigger: opens its flyout and remembers it was hover-opened. */
      hoverTrigger: (id: NavigationGroupId) => {
        if (activeDesktopMenu !== id) hoverOpenedMenuRef.current = id;
        openDesktopMenu(id);
      },
      /** Click on a trigger: confirms a hover-opened flyout, otherwise toggles it. */
      clickTrigger: (id: NavigationGroupId) => toggleDesktopMenuFromClick(id, activeDesktopMenu === id),
      onTriggerKeyDown: handleDesktopTriggerKeyDown,
      onPanelKeyDown: handleDesktopMenuKeyDown,
      /** Closes the open flyout (a destination was chosen). */
      close: closeDesktopMenu,
      /** Dismisses the flyout when focus or a press lands on the header's action buttons. */
      dismiss: () => setActiveDesktopMenu(null),
      /** Pointer leaves the `<nav>`: closes a pointer-opened flyout, keeps a keyboard-opened one. */
      onPointerExit: closeDesktopMenuOnPointerExit,
    },
    user: {
      open: userDropdownOpen,
      /** The `id` of the account menu, referenced by its trigger's `aria-controls`. */
      menuId: `user-navigation-${menuUid}`,
      menuRef: userMenuRef,
      triggerRef: userTriggerRef,
      toggle: () => (userDropdownOpen ? closeUserMenu() : openUserMenu()),
      onTriggerKeyDown: handleUserTriggerKeyDown,
      close: closeUserMenu,
    },
    mobile: {
      open: mobileMenuOpen,
      triggerRef: mobileMenuTriggerRef,
      toggle: () => setMobileMenuOpen((open) => !open),
      /** Closes the drawer after a link was chosen (the route change takes focus from there). */
      close: closeMobileMenu,
      /** Closes the drawer for an action that opens a modal dialog; see `closeMobileMenuForDialog`. */
      closeForDialog: closeMobileMenuForDialog,
    },
  };
}

export type NavbarMenus = ReturnType<typeof useNavbarMenus>;
export type NavbarDesktopMenu = NavbarMenus['desktop'];
export type NavbarUserMenu = NavbarMenus['user'];
export type NavbarMobileMenu = NavbarMenus['mobile'];
