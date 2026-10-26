import type { Locator, Page } from '@playwright/test';
import { expect, type Language } from '../../support/e2e';
import { waitUntilInteractive } from './hydration';

/** Tailwind `lg`: below it the inline links collapse into the drawer (tablets included, E2E-11). */
const DRAWER_BREAKPOINT_PX = 1024;
/** Tailwind `sm`: below it the language and theme controls live inside the drawer (UX-1). */
const DRAWER_CONTROLS_BREAKPOINT_PX = 640;

const NATIVE_LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  he: 'עברית',
  ru: 'Русский',
  fr: 'Français',
  ar: 'العربية',
};

/** Global header and footer shared by every public page. */
export class SiteChrome {
  readonly navbar: Locator;
  readonly footer: Locator;

  constructor(readonly page: Page) {
    this.navbar = page
      .getByRole('navigation')
      .filter({ has: page.getByRole('link', { name: /SIM DREAM/ }) });
    this.footer = page.getByRole('contentinfo');
  }

  get usesDrawer(): boolean {
    return (this.page.viewportSize()?.width ?? 1280) < DRAWER_BREAKPOINT_PX;
  }

  /** On phones the language and theme controls are inside the drawer. */
  get controlsInDrawer(): boolean {
    return (this.page.viewportSize()?.width ?? 1280) < DRAWER_CONTROLS_BREAKPOINT_PX;
  }

  /** The drawer toggle, found by the drawer it controls (its accessible name is localized). */
  menuToggle(): Locator {
    return this.navbar.locator('button[aria-controls="mobile-navigation"]');
  }

  /** Opens the drawer unless it is already open (a second click would close it). */
  async openMenu(how: 'click' | 'tap' = 'click'): Promise<void> {
    const toggle = this.menuToggle();
    await waitUntilInteractive(toggle);
    if ((await toggle.getAttribute('aria-expanded')) === 'true') return;
    await (how === 'tap' ? toggle.tap() : toggle.click());
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }

  /** Makes the language and theme controls visible: on phones they are inside the drawer. */
  async revealHeaderControls(): Promise<void> {
    if (this.controlsInDrawer) await this.openMenu();
  }

  homeLink(): Locator {
    return this.navbar.getByRole('link', { name: /SIM DREAM/ });
  }

  /** Primary navigation link; opens the drawer first on narrow screens. */
  async primaryLink(name: string): Promise<Locator> {
    const link = this.navbar.getByRole('link', { name, exact: true });
    if (this.usesDrawer) {
      await this.openMenu();
      await expect(link).toBeVisible();
    }
    return link;
  }

  /** "Book a Flight" on desktop, shortened to "Book" in the compact header. */
  bookCta(): Locator {
    return this.navbar.getByRole('link', { name: /^Book\b/ });
  }

  footerLink(name: string): Locator {
    return this.footer.getByRole('link', { name, exact: true }).first();
  }

  /** The visible language menu button (its name is the current code plus native language name). */
  languageButton(): Locator {
    return this.navbar.locator('button[aria-haspopup="true"]').filter({ visible: true }).first();
  }

  async switchLanguage(language: Language): Promise<void> {
    await this.revealHeaderControls();
    await waitUntilInteractive(this.languageButton());
    await this.languageButton().click();
    await this.navbar.getByRole('button', { name: NATIVE_LANGUAGE_NAMES[language] }).click();
  }

  themeButton(name: string | RegExp = /Switch UI Interface/): Locator {
    return this.navbar.getByRole('button', { name }).filter({ visible: true }).first();
  }

  async toggleTheme(): Promise<void> {
    await this.revealHeaderControls();
    await waitUntilInteractive(this.themeButton());
    await this.themeButton().click();
  }

  html(): Locator {
    return this.page.locator('html');
  }
}
