import type { LucideIcon } from 'lucide-react';
import type { translations } from '@/lib/i18n/translations';
import { SOCIAL_CHANNELS } from '../social-channels';

/**
 * The header's destinations as plain data: the four desktop flyout groups, the flat list of the phone
 * drawer, the drawer's "About" group, and the active-route rules. No React and no I/O, so the whole
 * model is unit-tested in Node (tests/unit/navbar-navigation-model.test.ts). The labels come from the
 * i18n dictionary (and `getOffersNavLabel` for Offers); the destinations live only here.
 */

type Copy = (typeof translations)['en'];

export type NavigationGroupId = 'experiences' | 'professional' | 'visit' | 'social';

export type NavigationItem = {
  name: string;
  href: string;
  external?: boolean;
  icon?: LucideIcon;
  iconClassName?: string;
};

export type NavigationGroup = {
  id: NavigationGroupId;
  label: string;
  items: NavigationItem[];
};

/** A plain internal destination (the drawer's flat list and its "About" group). */
export type NavigationLink = Pick<NavigationItem, 'name' | 'href'>;

/** Display order of the desktop triggers, and the order Left/Right arrows walk through them. */
export const NAVIGATION_GROUP_IDS: NavigationGroupId[] = ['experiences', 'professional', 'visit', 'social'];

/** The flat list shown first in the phone and tablet drawer. */
export function buildNavigationLinks(t: Copy, offersLabel: string): NavigationLink[] {
  return [
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
}

/** The desktop flyout groups: each trigger label with the destinations in its panel. */
export function buildNavigationGroups(t: Copy, offersLabel: string): NavigationGroup[] {
  const socialLinks: NavigationItem[] = SOCIAL_CHANNELS.map(({ name, href, icon, iconClassName }) => ({
    name,
    href,
    external: true,
    icon,
    iconClassName,
  }));

  return [
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
}

/** The links inside the drawer's "About" disclosure. The cookie-settings entry follows them (it is an action, not a route). */
export function buildAboutLinks(t: Copy): NavigationLink[] {
  return [
    { name: t.nav.about, href: '/about' },
    { name: t.nav.contact, href: '/contact' },
    { name: t.footer.termsRules, href: '/rules' },
    { name: t.footer.privacyPolicy, href: '/privacy-policy' },
  ];
}

/** `/simulator` permanently redirects to `/pro`, so the Professional entry stays lit on both. */
export function isNavPathActive(pathname: string, path: string): boolean {
  return pathname === path || (path === '/pro' && pathname === '/simulator');
}

/** A desktop trigger is lit while the visitor is on any of its destinations. */
export function isNavGroupActive(group: NavigationGroup, pathname: string): boolean {
  return group.items.some((item) => isNavPathActive(pathname, item.href));
}
