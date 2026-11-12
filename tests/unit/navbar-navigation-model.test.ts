import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CONSENT_LINK_LABEL } from '@/components/consent/link-label';
import { MobileAboutGroup } from '@/components/layout/navbar/MobileAboutGroup';
import {
  NAVIGATION_GROUP_IDS,
  buildAboutLinks,
  buildNavigationGroups,
  buildNavigationLinks,
  isNavGroupActive,
  isNavPathActive,
} from '@/components/layout/navbar/navigation-model';
import type { NavbarMobileMenu } from '@/components/layout/navbar/use-navbar-menus';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { getOffersNavLabel } from '@/lib/offers/nav-label';
import { translations, type Language } from '@/lib/i18n/translations';

/**
 * The header's destinations (components/layout/navbar/navigation-model.ts) and the drawer's "About" group.
 * The flyouts, the drawer and the footer must never drift apart, and the cookie-settings entry the phone
 * drawer carries (phones have no footer) must exist, last, in every language.
 */
const LANGUAGES: Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es'];
const HEBREW = /[֐-׿]/;
const ARABIC = /[؀-ۿ]/;

const model = (language: Language) => {
  const t = translations[language];
  const offersLabel = getOffersNavLabel(language);
  return {
    t,
    groups: buildNavigationGroups(t, offersLabel),
    links: buildNavigationLinks(t, offersLabel),
    about: buildAboutLinks(t),
    offersLabel,
  };
};

describe('navigation model: structure', () => {
  const { groups, links, about } = model('en');

  it('keeps the four desktop groups in their trigger order', () => {
    expect(NAVIGATION_GROUP_IDS).toEqual(['experiences', 'professional', 'visit', 'social']);
    expect(groups.map((group) => group.id)).toEqual(NAVIGATION_GROUP_IDS);
  });

  it('lists each group destination in order', () => {
    const hrefs = Object.fromEntries(groups.map((group) => [group.id, group.items.map((item) => item.href)]));
    expect(hrefs.experiences).toEqual(['/experiences', '/offers', '/subscriptions', '/vouchers', '/fear-of-flying']);
    expect(hrefs.professional).toEqual(['/pro', '/ground-school', '/workshops']);
    expect(hrefs.visit).toEqual(['/contact', '/about', '/blog']);
    expect(hrefs.social).toHaveLength(3);
  });

  it('keeps the drawer list in its order, with Offers second', () => {
    expect(links.map((link) => link.href)).toEqual([
      '/experiences',
      '/offers',
      '/subscriptions',
      '/pro',
      '/ground-school',
      '/workshops',
      '/vouchers',
      '/contact',
      '/fear-of-flying',
      '/blog',
    ]);
  });

  it('exposes the same internal destinations in the drawer and the flyouts, About aside', () => {
    const flyoutHrefs = groups
      .filter((group) => group.id !== 'social')
      .flatMap((group) => group.items.map((item) => item.href))
      .filter((href) => href !== '/about');
    expect([...flyoutHrefs].sort()).toEqual(links.map((link) => link.href).sort());
    expect(groups.find((group) => group.id === 'visit')?.items.some((item) => item.href === '/about')).toBe(true);
    expect(about.map((link) => link.href)).toEqual(['/about', '/contact', '/rules', '/privacy-policy']);
  });

  it('opens each social channel in a new tab with its own icon', () => {
    const social = groups.find((group) => group.id === 'social')?.items ?? [];
    expect(social.map((item) => item.name)).toEqual(['Instagram', 'Facebook', 'YouTube']);
    for (const item of social) {
      expect(item.external).toBe(true);
      expect(item.href).toMatch(/^https:\/\//);
      expect(item.icon).toBeDefined();
    }
  });

  it('lists every destination once per group', () => {
    for (const group of groups) {
      const hrefs = group.items.map((item) => item.href);
      expect(new Set(hrefs).size, group.id).toBe(hrefs.length);
    }
  });
});

describe('navigation model: copy in all six languages', () => {
  it.each(LANGUAGES)('labels every entry in %s from the dictionary', (language) => {
    const { t, groups, links, about, offersLabel } = model(language);
    expect(groups.map((group) => group.label)).toEqual([t.nav.experiences, t.nav.simulator, t.nav.contact, t.nav.socialMedia]);
    for (const entry of [...groups.flatMap((group) => group.items), ...links, ...about]) {
      expect(entry.name.trim(), `${language} ${entry.href}`).not.toBe('');
    }
    expect(links[1].name).toBe(offersLabel);
    expect(groups[0].items[1].name).toBe(offersLabel);
  });

  it('never mixes Hebrew into Arabic or Arabic into Hebrew', () => {
    const labels = (language: Language) => {
      const { groups, links, about } = model(language);
      return [...groups.map((group) => group.label), ...groups.flatMap((group) => group.items.map((item) => item.name)), ...links.map((link) => link.name), ...about.map((link) => link.name)].join(' ');
    };
    expect(labels('ar')).not.toMatch(HEBREW);
    expect(labels('he')).not.toMatch(ARABIC);
  });
});

describe('active route rules', () => {
  const { groups } = model('en');

  it('matches a route exactly, never by prefix', () => {
    expect(isNavPathActive('/offers', '/offers')).toBe(true);
    expect(isNavPathActive('/offers/birthday', '/offers')).toBe(false);
    expect(isNavPathActive('/', '/offers')).toBe(false);
  });

  it('keeps Professional lit on /simulator, which redirects to /pro', () => {
    expect(isNavPathActive('/simulator', '/pro')).toBe(true);
    expect(isNavPathActive('/pro', '/pro')).toBe(true);
    expect(isNavPathActive('/simulator', '/workshops')).toBe(false);
  });

  it('lights a group trigger while the visitor is on one of its destinations', () => {
    const byId = Object.fromEntries(groups.map((group) => [group.id, group]));
    expect(isNavGroupActive(byId.experiences, '/offers')).toBe(true);
    expect(isNavGroupActive(byId.experiences, '/pro')).toBe(false);
    expect(isNavGroupActive(byId.professional, '/simulator')).toBe(true);
    expect(isNavGroupActive(byId.visit, '/about')).toBe(true);
    expect(isNavGroupActive(byId.social, '/')).toBe(false);
  });
});

describe('the drawer About group carries the cookie settings (phones have no footer)', () => {
  const menu: NavbarMobileMenu = {
    open: true,
    triggerRef: { current: null },
    toggle: () => undefined,
    close: () => undefined,
    closeForDialog: () => undefined,
  };

  const render = (language: Language) =>
    renderToStaticMarkup(
      React.createElement(LanguageProvider, {
        initialLanguage: language,
        children: React.createElement(MobileAboutGroup, { links: buildAboutLinks(translations[language]), menu }),
      })
    );

  it.each(LANGUAGES)('renders it after the privacy-policy link, as a 44px entry, in %s', (language) => {
    const html = render(language);
    const label = CONSENT_LINK_LABEL[language];
    const privacy = html.indexOf('href="/privacy-policy"');
    const button = html.indexOf('data-consent-settings-link');
    expect(privacy).toBeGreaterThan(-1);
    expect(button).toBeGreaterThan(privacy);
    expect(html.indexOf(`>${label}</button>`)).toBeGreaterThan(button);
    // Nothing follows the button inside the group: it is the last entry.
    expect(html.slice(button).match(/<a /g) ?? []).toHaveLength(0);
    const buttonTag = /<button[^>]*data-consent-settings-link[^>]*>/.exec(html)?.[0] ?? '';
    expect(buttonTag).toContain('type="button"');
    expect(buttonTag).toContain('min-h-11');
  });

  it('styles the button with the same classes as its sibling links', () => {
    const html = render('en');
    const linkClass = /<a [^>]*href="\/privacy-policy"[^>]*class="([^"]*)"/.exec(html)?.[1] ?? /<a [^>]*class="([^"]*)"[^>]*href="\/privacy-policy"/.exec(html)?.[1] ?? '';
    const buttonClass = /<button[^>]*class="([^"]*)"[^>]*data-consent-settings-link|<button[^>]*data-consent-settings-link[^>]*class="([^"]*)"/.exec(html);
    const classes = (buttonClass?.[1] ?? buttonClass?.[2] ?? '').split(/\s+/);
    expect(linkClass).not.toBe('');
    for (const token of linkClass.split(/\s+/)) expect(classes, token).toContain(token);
  });

  it('never mixes Hebrew into Arabic or Arabic into Hebrew', () => {
    expect(render('ar')).not.toMatch(HEBREW);
    expect(render('he')).not.toMatch(ARABIC);
  });
});
