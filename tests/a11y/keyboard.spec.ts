import type { Page } from '@playwright/test';
import { expect, preferTheme, type UiTheme } from '../support/e2e';
import {
  checkoutButton,
  findBookableDate,
  openStorefrontOn,
  openWizardStep,
  PAYMENTS_UNAVAILABLE_MESSAGE,
  selectStorefrontDate,
  stripDayButton,
  wizardToggle,
} from '../usability/support/booking';
import { test } from '../usability/support/fixtures';
import {
  describeActiveElement,
  freezeCssMotion,
  gotoSettled,
  isFocused,
  isolateFromThirdParties,
  storefrontSlotButtons,
  tabTo,
} from '../usability/support/page';

const BLUEPRINT_TRIGGER = "What's Included / Mission Blueprint ↗";
/** Generous bound for focus effects that should be synchronous, so expected failures fail fast. */
const FOCUS_SETTLE = { timeout: 2_000 };

test.describe.configure({ timeout: 120_000 });
// Reduced motion freezes the review carousel so focus paths stay stable (see the carousel test).
test.use({ reducedMotion: 'reduce' });

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
});

function checkoutRequest(page: Page) {
  return page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/api/checkout' && request.method() === 'POST'
  );
}

test.describe('keyboard-only booking journey', () => {
  test('completes the one-page storefront up to payment using only the keyboard', async ({ page, request }) => {
    const { date, openStartTimes } = await findBookableDate(request);
    await gotoSettled(page, '/book');

    await tabTo(page, stripDayButton(page, date));
    await selectStorefrontDate(page, date, () => page.keyboard.press('Enter'));
    const selectedWindow = page.getByText(/^Selected Window: \d{2}:\d{2}–/);
    const preselected = (await selectedWindow.innerText()).slice('Selected Window: '.length, 'Selected Window: '.length + 5);
    const startTime = openStartTimes.find((time) => time !== preselected);
    expect(startTime, 'a second open slot to choose by keyboard').toBeDefined();
    await tabTo(page, page.getByRole('button', { name: `${startTime} Up to`, exact: false }));
    await page.keyboard.press('Enter');
    await expect(selectedWindow).toHaveText(new RegExp(`^Selected Window: ${startTime}–`));

    await tabTo(page, page.getByLabel('Pilot Full Name *'));
    await page.keyboard.type('Dana Keyboard');
    await page.keyboard.press('Tab');
    await page.keyboard.type('dana.keyboard@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('054-555-0101');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio', { name: 'First-Timer' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Sim Enthusiast' })).toBeChecked();

    await tabTo(page, checkoutButton(page));
    const submitted = checkoutRequest(page);
    await page.keyboard.press('Enter');
    const sent = await submitted;

    expect(sent.postDataJSON()).toMatchObject({
      kind: 'booking',
      bookingDate: date,
      startTime,
      pilotName: 'Dana Keyboard',
      pilotEmail: 'dana.keyboard@example.com',
      pilotPhone: '054-555-0101',
      experienceLevel: 'enthusiast',
    });
    expect((await sent.response())?.status()).toBe(503);
    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE_MESSAGE }).first()).toBeVisible();
  });

  test('completes the guided wizard, including an add-on, using only the keyboard', async ({ page, request }) => {
    const { date } = await findBookableDate(request);
    await gotoSettled(page, '/book');

    await tabTo(page, wizardToggle(page));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Choose Flight Date & Operational Slot' })).toBeVisible();
    await tabTo(page, stripDayButton(page, date));
    const slotsLoaded = page.waitForResponse((response) => response.url().includes(`/api/slots?date=${date}`));
    await page.keyboard.press('Enter');
    await slotsLoaded;
    const wizardSlot = page.getByRole('button', { name: /\d{2}:\d{2} – \d{2}:\d{2} \(60m\)$/ }).last();
    await tabTo(page, wizardSlot);
    await page.keyboard.press('Enter');
    const continueToAddons = page.getByRole('button', { name: 'Continue to Add-ons' });
    await expect(continueToAddons).toBeEnabled();
    await tabTo(page, continueToAddons);
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { level: 1, name: 'Cockpit Upgrades & Commemoratives' })).toBeVisible();
    const firstAddon = page.getByRole('checkbox', { disabled: false }).first();
    await tabTo(page, firstAddon);
    await page.keyboard.press('Space');
    await expect(firstAddon).toBeChecked();
    await tabTo(page, page.getByRole('button', { name: 'Continue to Pilot Details' }));
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { name: 'Pilot in Command Details' })).toBeVisible();
    await tabTo(page, page.getByPlaceholder('e.g. Capt. Nathanel S.'));
    await page.keyboard.type('Dana Wizard');
    await page.keyboard.press('Tab');
    await page.keyboard.type('dana.wizard@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('054-555-0102');
    await tabTo(page, checkoutButton(page));
    const submitted = checkoutRequest(page);
    await page.keyboard.press('Enter');
    const sent = await submitted;

    const body = sent.postDataJSON() as { bookingDate: string; addons: string[]; pilotName: string };
    expect(body).toMatchObject({ bookingDate: date, pilotName: 'Dana Wizard' });
    expect(body.addons).toHaveLength(1);
    expect((await sent.response())?.status()).toBe(503);
    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE_MESSAGE }).first()).toBeVisible();
  });

  const SELECTION_CONTROLS = [
    { control: 'departure slot', pick: (page: Page) => storefrontSlotButtons(page).nth(1) },
    { control: 'calendar day', pick: (page: Page, date: string) => stripDayButton(page, date) },
  ];
  for (const { control, pick } of SELECTION_CONTROLS) {
    test(`exposes the selected ${control} to assistive technology`, async ({ page, request }) => {
      const { date } = await findBookableDate(request);
      await openStorefrontOn(page, date);
      const target = pick(page, date);
      await target.click();

      await expect
        .poll(
          () =>
            target.evaluate((element) =>
              ['aria-pressed', 'aria-checked', 'aria-selected', 'aria-current'].some((attribute) => {
                const value = element.getAttribute(attribute);
                return value !== null && value !== 'false';
              })
            ),
          FOCUS_SETTLE
        )
        .toBe(true);
    });
  }
});

test.describe('bypass blocks', () => {
  for (const route of ['/', '/book']) {
    test(`offers a skip-to-content link as the first Tab stop on ${route}`, async ({ page }) => {
      await gotoSettled(page, route);
      await page.keyboard.press('Tab');

      const firstStop = page.locator(':focus');
      await expect(firstStop).toHaveAccessibleName(/skip to (main )?content/i, FOCUS_SETTLE);
      const href = (await firstStop.getAttribute('href')) ?? '';
      expect(href).toMatch(/^#[\w-]+$/);
      await expect(page.locator(href)).toHaveCount(1);
    });
  }
});

/** Reads the focused element's own and parent's styles while focused and after blur. */
async function probeFocusIndicator(page: Page): Promise<{ label: string; indicated: boolean } | null> {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) return null;
    const label = `<${element.tagName.toLowerCase()}> "${(element.getAttribute('aria-label') ?? element.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50)}"`;
    // Focus inside an iframe is drawn by the embedded document.
    if (element.tagName === 'IFRAME') return { label, indicated: true };
    const properties = [
      'outline-style',
      'outline-width',
      'outline-color',
      'box-shadow',
      'border-top-color',
      'border-bottom-color',
      'background-color',
      'color',
      'text-decoration-line',
    ];
    const snapshot = (target: Element | null) => {
      if (!target) return '';
      const style = getComputedStyle(target);
      return properties.map((property) => style.getPropertyValue(property)).join('|');
    };
    const focused = snapshot(element) + snapshot(element.parentElement);
    element.blur();
    const blurred = snapshot(element) + snapshot(element.parentElement);
    element.focus();
    return { label, indicated: focused !== blurred };
  });
}

test.describe('visible focus', () => {
  const THEMES: readonly UiTheme[] = ['cockpit', 'brand'];
  const ROUTES = ['/', '/book', '/vouchers', '/contact', '/workshops', '/login'];
  const TAB_STOPS = 60;

  for (const theme of THEMES) {
    for (const route of ROUTES) {
      test(`shows a focus indicator on every Tab stop of ${route} (${theme})`, async ({ page }) => {
        await preferTheme(page, theme);
        await gotoSettled(page, route);
        await freezeCssMotion(page);

        const withoutIndicator: string[] = [];
        let stops = 0;
        for (let press = 0; press < TAB_STOPS; press += 1) {
          await page.keyboard.press('Tab');
          const probe = await probeFocusIndicator(page);
          if (!probe) break;
          stops += 1;
          if (!probe.indicated) withoutIndicator.push(probe.label);
        }

        expect(stops, 'the page should expose a meaningful number of Tab stops').toBeGreaterThan(10);
        expect(withoutIndicator).toEqual([]);
      });
    }
  }

  test('keeps the focused control out from under the sticky header when tabbing backwards on /book', async ({
    page,
    request,
  }) => {
    const { date } = await findBookableDate(request);
    await openStorefrontOn(page, date);
    await freezeCssMotion(page);
    await tabTo(page, checkoutButton(page));

    const hidden: string[] = [];
    for (let press = 0; press < 40; press += 1) {
      await page.keyboard.press('Shift+Tab');
      const obscured = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body) return null;
        const box = element.getBoundingClientRect();
        const inset = 2;
        const points: Array<[number, number]> = [
          [box.left + box.width / 2, box.top + box.height / 2],
          [box.left + inset, box.top + inset],
          [box.right - inset, box.top + inset],
          [box.left + inset, box.bottom - inset],
          [box.right - inset, box.bottom - inset],
        ];
        const coveredByHeader = points.every(([x, y]) => {
          const topmost = document.elementFromPoint(x, y);
          return topmost !== null && !element.contains(topmost) && topmost.closest('nav') !== null;
        });
        return coveredByHeader ? (element.textContent ?? '').trim().slice(0, 40) || element.tagName : null;
      });
      if (obscured) hidden.push(obscured);
    }

    expect(hidden).toEqual([]);
  });
});

test.describe('no keyboard traps', () => {
  for (const route of ['/', '/book', '/contact', '/vouchers']) {
    test(`lets Tab travel through and out of ${route}`, async ({ page }) => {
      await gotoSettled(page, route);
      const tabbable = await page.evaluate(
        () =>
          [...document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, iframe, [tabindex]')].filter(
            (element) => element.tabIndex >= 0 && element.checkVisibility()
          ).length
      );
      expect(tabbable).toBeGreaterThan(10);

      const limit = tabbable + 25;
      let leftThePage = false;
      for (let press = 0; press < limit && !leftThePage; press += 1) {
        await page.keyboard.press('Tab');
        leftThePage = (await describeActiveElement(page)) === '<body>';
      }
      expect(leftThePage, `focus should pass the last control within ${limit} Tab presses`).toBe(true);

      await page.keyboard.press('Shift+Tab');
      expect(await describeActiveElement(page)).not.toBe('<body>');
    });
  }
});

test.describe('Mission Blueprint dialog', () => {
  async function openWizardBlueprintByKeyboard(page: Page) {
    await openWizardStep(page, 1);
    const trigger = page.getByRole('button', { name: BLUEPRINT_TRIGGER, exact: true });
    await tabTo(page, trigger);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: /Captain's Command Flight/ });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  test('opens from the storefront package cards with the keyboard', async ({ page }) => {
    await gotoSettled(page, '/book');
    await tabTo(page, page.getByRole('button', { name: BLUEPRINT_TRIGGER, exact: true }).first());
    await page.keyboard.press('Enter');

    await expect(page.getByRole('dialog')).toBeVisible(FOCUS_SETTLE);
  });

  test('moves focus into the dialog when it opens', async ({ page }) => {
    const dialog = await openWizardBlueprintByKeyboard(page);

    await expect(dialog.locator(':focus')).toHaveCount(1, FOCUS_SETTLE);
  });

  test('keeps Tab focus inside the open dialog', async ({ page }) => {
    const dialog = await openWizardBlueprintByKeyboard(page);
    await dialog.getByRole('button', { name: 'Close dialog' }).focus();

    const escaped: string[] = [];
    for (let press = 0; press < 6; press += 1) {
      await page.keyboard.press('Tab');
      if (!(await dialog.evaluate((element) => element.contains(document.activeElement)))) {
        escaped.push(await describeActiveElement(page));
      }
    }
    expect(escaped).toEqual([]);
  });

  test('closes on Escape in the guided wizard', async ({ page }) => {
    const dialog = await openWizardBlueprintByKeyboard(page);
    await dialog.getByRole('button', { name: 'Close dialog' }).focus();
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden(FOCUS_SETTLE);
  });

  test('returns focus to the trigger when the dialog closes', async ({ page }) => {
    const dialog = await openWizardBlueprintByKeyboard(page);
    await dialog.getByRole('button', { name: 'Close dialog' }).focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();

    await expect(page.getByRole('button', { name: BLUEPRINT_TRIGGER, exact: true })).toBeFocused(FOCUS_SETTLE);
  });

  test('closes on Escape in the storefront', async ({ page }) => {
    await gotoSettled(page, '/book');
    // Opened with the mouse: the keyboard path is broken (UX-3).
    await page.getByRole('button', { name: BLUEPRINT_TRIGGER, exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close dialog' }).focus();
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden(FOCUS_SETTLE);
  });
});

test.describe('mobile navigation menu', () => {
  // Wide enough for the whole mobile navbar cluster (UX-1 clips it below 454px), narrow enough for md:hidden.
  test.use({ viewport: { width: 600, height: 900 } });

  test('names the menu toggle and exposes whether the drawer is expanded', async ({ page }) => {
    await gotoSettled(page, '/');
    const menuToggle = page.getByRole('button', { name: /menu/i });

    await expect(menuToggle).toHaveAttribute('aria-expanded', 'false', FOCUS_SETTLE);
    await menuToggle.click();
    await expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('review carousel', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('keeps keyboard focus on a review link while the carousel would auto-rotate', async ({ page }) => {
    await page.clock.install();
    await gotoSettled(page, '/');
    const reviewLink = page.getByRole('link', { name: 'Read All 390+ Verified Reviews on Google Maps ↗' }).nth(1);
    await tabTo(page, reviewLink, { maxPresses: 120 });
    expect(await isFocused(reviewLink)).toBe(true);

    await page.clock.runFor(8_000);

    expect(await describeActiveElement(page)).not.toBe('<body>');
  });
});
