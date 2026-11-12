/**
 * The header's parts. `components/layout/Navbar.tsx` is the orchestrator: it builds the navigation model,
 * calls `useNavbarMenus` once and hands each part its slice of the menu state.
 *
 *   navigation-model.ts   destinations, groups and active-route rules (pure, unit-tested)
 *   use-navbar-menus.ts   open/close state, Escape, outside click, route change, focus and arrow keys
 *   DesktopNavTriggers / DesktopNavPanel   the xl-and-up group triggers and their flyout
 *   DesktopNavActions / UserMenu / NavBookLink   the md-and-up actions: switches, account menu, Book
 *   CompactNavActions     the phone and tablet cluster (WhatsApp, short Book, menu trigger)
 *   MobileNavigation / MobileAboutGroup   the drawer (#mobile-navigation) and its "About" group
 *
 * Details and the verification record: docs/modules/navbar-modular.md.
 */
export { CompactNavActions } from './CompactNavActions';
export { DesktopNavActions } from './DesktopNavActions';
export { DesktopNavPanel } from './DesktopNavPanel';
export { DesktopNavTriggers } from './DesktopNavTriggers';
export { MobileNavigation } from './MobileNavigation';
export { buildAboutLinks, buildNavigationGroups, buildNavigationLinks } from './navigation-model';
export { useNavbarMenus } from './use-navbar-menus';
export type { NavbarMenus } from './use-navbar-menus';
