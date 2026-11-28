import type { Locator, Page } from '@playwright/test';
import { expect, type Language } from '../../support/e2e';
import { waitUntilInteractive } from './hydration';

/** Tailwind `xl`: the grouped desktop flyouts become the touch-first drawer below this width. */
const DRAWER_BREAKPOINT_PX = 1280;
/** Tailwind `sm`: below it the compact theme control lives inside the drawer. */
const DRAWER_CONTROLS_BREAKPOINT_PX = 640;
/** How many times the desktop flyout lookup goes round the triggers before it gives up. */
const FLYOUT_LOOKUP_PASSES = 3;

const NATIVE_LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  he: 'עברית',
  ru: 'Русский',
  fr: 'Français',
  ar: 'العربية',
  es: 'Español',
  de: 'Deutsch',
};

/** Global header and footer shared by every public page. */
export class SiteChrome {
  readonly navbar: Locator;
  readonly utilityBar: Locator;
  readonly footer: Locator;

  constructor(readonly page: Page) {
    this.navbar = page
      .getByRole('navigation')
      .filter({ has: page.getByRole('link', { name: /SIM DREAM/ }) });
    this.utilityBar = page.locator('[data-site-utility-bar]');
    this.footer = page.getByRole('contentinfo');
  }

  get usesDrawer(): boolean {
    return (this.page.viewportSize()?.width ?? 1280) < DRAWER_BREAKPOINT_PX;
  }

  /** The compact theme control moves into the drawer on phones. */
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

  /**
   * Primary navigation link; opens the drawer first when the header is collapsed. Decided by
   * what is rendered, not by window width: a classic scrollbar (WebKit desktop) narrows the
   * layout viewport below `xl` even in a 1280px window, so the drawer is showing there.
   */
  async primaryLink(name: string): Promise<Locator> {
    // `page.goto()` can resolve while the streamed header is still being
    // attached. Start from the always-present brand link so the responsive
    // desktop/mobile branch is decided from the hydrated navbar, not an empty
    // pre-commit locator snapshot.
    await waitUntilInteractive(this.homeLink());
    // Desktop flyout destinations follow the WAI menu-button model and therefore expose
    // `menuitem`; the touch drawer remains ordinary links. Both are navigational destinations.
    const link = this.navbar
      .getByRole('link', { name, exact: true })
      .or(this.navbar.getByRole('menuitem', { name, exact: true }));
    if (this.usesDrawer || (await this.menuToggle().isVisible())) {
      await this.openMenu();
      await expect(link).toBeVisible();
    } else if (!(await link.isVisible())) {
      const triggers = this.navbar.locator('button[data-navbar-menu-trigger]');
      // Desktop flyouts deliberately open on pointer entry. Follow the same customer gesture here;
      // keyboard semantics are covered by the dedicated accessibility suite. On a loaded CI runner
      // WebKit needs seconds for each hover and sometimes never delivers one, so the lookup is
      // bounded by passes over the triggers, not by a clock: a slow pointer only makes it slower,
      // and a lost hover costs one more pass (tests/e2e/site-chrome-flyout.spec.ts).
      let found = false;
      for (let pass = 0; pass < FLYOUT_LOOKUP_PASSES && !found; pass += 1) {
        for (let index = 0; index < (await triggers.count()) && !found; index += 1) {
          const trigger = triggers.nth(index);
          await waitUntilInteractive(trigger);
          await trigger.hover();
          // The hover's state update commits after the event, so wait for it instead of reading once.
          const opened = await expect(trigger)
            .toHaveAttribute('aria-expanded', 'true', { timeout: 1_500 })
            .then(
              () => true,
              () => false
            );
          // The expanded trigger and its panel are one state and one commit (activeDesktopMenu),
          // so an open flyout without the link means "not in this flyout": no further wait.
          if (opened) found = await link.isVisible();
        }
      }
      if (!found) throw new Error(`"${name}" did not appear in any header flyout in ${FLYOUT_LOOKUP_PASSES} passes`);
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
    return this.utilityBar.locator('button[data-language-selector-trigger]').filter({ visible: true }).first();
  }

  async switchLanguage(language: Language): Promise<void> {
    await waitUntilInteractive(this.languageButton());
    await this.languageButton().click();
    await this.page.getByRole('option', { name: NATIVE_LANGUAGE_NAMES[language] }).click();
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
