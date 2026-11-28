import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, expectThemeApplied, LANGUAGES, preferLanguage, preferTheme, RTL_LANGUAGES, type Language, type UiTheme } from '../support/e2e';
import { WCAG_A_AA_TAGS } from '../a11y/support/axe-baseline';
import { test } from './support/fixtures';
import { expectLanguageRendered, freezeCssMotion, gotoSettled, isolateFromThirdParties } from './support/page';

// The home page route gate sends a visitor into the six funnels (AGENTS.md §2). It reads as two
// groups: flights for everyone (Experiences, Vouchers, Flight Tracks) and specialist programmes
// (PRO, Fear of Flying, Workshops). Experiences and PRO are the anchors of their groups; the other
// four are secondary. The layout is source-ordered: what a keyboard or a screen reader meets first
// is what the eye meets first, in both writing directions. These tests read the painted geometry.
test.use({ reducedMotion: 'reduce', video: 'off', viewport: { width: 1440, height: 900 } });

const GATE = '[data-route-gate]';
const ROUTES = ['/experiences', '/vouchers', '/subscriptions', '/pro', '/fear-of-flying', '/workshops'];
const GROUPS = [
  { id: 'consumer', routes: ['/experiences', '/vouchers', '/subscriptions'] },
  { id: 'specialist', routes: ['/pro', '/fear-of-flying', '/workshops'] },
];
const WIDTHS = [320, 390, 820, 1024, 1440, 1920];

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
}
interface CardBox extends Box {
  href: string | null;
  kind: string | null;
  /** Distance from the bottom of the card's readout panel to the top of its link row; null without a panel. */
  readoutGap: number | null;
}
interface GroupBox extends Box {
  id: string | null;
  cards: CardBox[];
}
interface Layout {
  groups: GroupBox[];
  /** Text that is wider than its own box, clipped by it, or sticks out of its card: "<route>: <text>". */
  cutOff: string[];
  /** Cards that reach past either edge of the screen (the page clips sideways overflow, so it never scrolls). */
  offScreen: string[];
  /** Pixels of horizontal page scroll. */
  pageOverflow: number;
}

async function readLayout(page: Page): Promise<Layout> {
  return page.locator(GATE).evaluate((gate) => {
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
    };
    const cutOff: string[] = [];
    const offScreen: string[] = [];
    const screenWidth = document.documentElement.clientWidth;
    for (const card of gate.querySelectorAll('a[href]')) {
      const cardBox = card.getBoundingClientRect();
      if (cardBox.left < -1 || cardBox.right > screenWidth + 1) offScreen.push(String(card.getAttribute('href')));
      for (const text of card.querySelectorAll('h3, p, span')) {
        const rect = text.getBoundingClientRect();
        // A block box reports content wider than itself whatever its overflow value (a long word that
        // does not wrap, or an ellipsis); an inline box reports 0 for both widths and stays quiet.
        const widerThanItsBox = text.scrollWidth > text.clientWidth + 1;
        const clippedInHeight = getComputedStyle(text).overflowY !== 'visible' && text.scrollHeight > text.clientHeight + 1;
        const leavesCard =
          rect.left < cardBox.left - 1 || rect.right > cardBox.right + 1 || rect.top < cardBox.top - 1 || rect.bottom > cardBox.bottom + 1;
        if (widerThanItsBox || clippedInHeight || leavesCard) cutOff.push(`${card.getAttribute('href')}: ${text.textContent?.trim()}`);
      }
    }
    return {
      groups: [...gate.querySelectorAll('[data-route-group]')].map((group) => ({
        id: group.getAttribute('data-route-group'),
        ...box(group),
        cards: [...group.querySelectorAll('a[href]')].map((card) => {
          const panel = card.querySelector('[data-route-telemetry]');
          const linkRow = card.firstElementChild?.lastElementChild;
          return {
            href: card.getAttribute('href'),
            kind: card.getAttribute('data-route-card'),
            readoutGap: panel && linkRow ? linkRow.getBoundingClientRect().top - panel.getBoundingClientRect().bottom : null,
            ...box(card),
          };
        }),
      })),
      cutOff,
      offScreen,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

async function openHome(page: Page, baseURL: string | undefined, language: Language, theme: UiTheme = 'cockpit'): Promise<void> {
  await isolateFromThirdParties(page, baseURL);
  await preferTheme(page, theme);
  await preferLanguage(page, language);
  await gotoSettled(page, '/');
  await expectLanguageRendered(page, language);
  await freezeCssMotion(page);
  await page.locator(GATE).scrollIntoViewIfNeeded();
}

const near = (a: number, b: number) => Math.abs(a - b) <= 1.5;

test.describe('home route gate: contract', () => {
  test('keeps the six funnels in reading order, each one a single link', async ({ page, baseURL }) => {
    await openHome(page, baseURL, 'en');
    const links = page.locator(`${GATE} a[href]`);
    expect(await links.evaluateAll((all) => all.map((link) => link.getAttribute('href')))).toEqual(ROUTES);
    await expect(page.locator(`${GATE} a[href] :is(a, button, input, select, [role="button"], [tabindex])`)).toHaveCount(0);
    await expect(page.locator(`${GATE} [tabindex]`)).toHaveCount(0);
    for (const route of ROUTES) {
      await expect(page.locator(`${GATE} a[href="${route}"] h3`), `one heading in the ${route} card`).toHaveCount(1);
      await expect(page.locator(`${GATE} a[href="${route}"] h3`)).not.toBeEmpty();
    }
  });

  test('shows two groups, everyone first and specialists second, each led by its one anchor', async ({ page, baseURL }) => {
    await openHome(page, baseURL, 'en');
    const { groups } = await readLayout(page);
    expect(groups.map((group) => group.id)).toEqual(GROUPS.map((group) => group.id));
    for (const [index, expected] of GROUPS.entries()) {
      expect(groups[index].cards.map((card) => card.href), expected.id).toEqual(expected.routes);
      expect(groups[index].cards.map((card) => card.kind), expected.id).toEqual(['anchor', 'secondary', 'secondary']);
    }
    await expect(page.locator(`${GATE} a[data-route-card="anchor"] [data-route-telemetry]`), 'one readout panel per anchor').toHaveCount(2);
    await expect(page.locator(`${GATE} [data-route-telemetry]`), 'no readout panel on a secondary route').toHaveCount(2);
  });
});

test.describe('home route gate: layout', () => {
  for (const language of ['en', 'he', 'ar'] as const) {
    for (const width of [1024, 1440]) {
      test(`${language} at ${width}px: the anchor leads its group and the two secondary routes stack beside it`, async ({ page, baseURL }) => {
        await page.setViewportSize({ width, height: 900 });
        await openHome(page, baseURL, language);
        const { groups } = await readLayout(page);
        expect(groups).toHaveLength(2);
        const rtl = RTL_LANGUAGES.includes(language);
        for (const group of groups) {
          const [anchor, first, second] = group.cards;
          const label = `${group.id} group`;
          expect(anchor.width, `${label}: the anchor is clearly wider`).toBeGreaterThan(first.width * 1.25);
          expect(near(first.width, second.width), `${label}: the secondary routes are equal`).toBe(true);
          expect(near(first.left, second.left), `${label}: the secondary routes share a column`).toBe(true);
          expect(first.bottom, `${label}: reading order runs down the column`).toBeLessThanOrEqual(second.top);
          expect(near(anchor.top, first.top), `${label}: the column starts level with the anchor`).toBe(true);
          expect(near(anchor.bottom, second.bottom), `${label}: the column ends level with the anchor`).toBe(true);
          // The stretched anchor keeps its readouts on the link row (a fixed 24px), with no blank band between them.
          expect(anchor.readoutGap, `${label}: the readouts rest on the link row`).not.toBeNull();
          expect(Math.abs((anchor.readoutGap ?? 0) - 24), `${label}: the readouts rest on the link row`).toBeLessThanOrEqual(2);
          if (rtl) {
            expect(near(anchor.right, group.right), `${label}: the anchor starts at the right edge`).toBe(true);
            expect(first.right, `${label}: the secondary routes follow on the left`).toBeLessThan(anchor.left);
          } else {
            expect(near(anchor.left, group.left), `${label}: the anchor starts at the left edge`).toBe(true);
            expect(first.left, `${label}: the secondary routes follow on the right`).toBeGreaterThan(anchor.right);
          }
        }
        expect(groups[1].top, 'the specialist group sits below').toBeGreaterThanOrEqual(groups[0].bottom);
      });
    }
  }

  for (const language of ['en', 'ar'] as const) {
    test(`${language} on a tablet: the anchor takes the full row and the secondary routes share the next`, async ({ page, baseURL }) => {
      await page.setViewportSize({ width: 820, height: 1180 });
      await openHome(page, baseURL, language);
      const { groups, offScreen } = await readLayout(page);
      expect(groups).toHaveLength(2);
      expect(offScreen).toEqual([]);
      for (const group of groups) {
        const [anchor, first, second] = group.cards;
        expect(near(anchor.width, group.width), `${group.id}: anchor row`).toBe(true);
        expect(near(first.top, second.top), `${group.id}: one row`).toBe(true);
        expect(near(first.width, second.width), `${group.id}: equal halves`).toBe(true);
        expect(first.top).toBeGreaterThanOrEqual(anchor.bottom);
        if (RTL_LANGUAGES.includes(language)) expect(first.left, `${group.id}: first on the right`).toBeGreaterThanOrEqual(second.right);
        else expect(first.right, `${group.id}: first on the left`).toBeLessThanOrEqual(second.left);
      }
    });
  }

  for (const language of ['en', 'ar'] as const) {
    for (const width of [320, 390]) {
      test(`${language} on a ${width}px phone: the six routes are one column in reading order`, async ({ page, baseURL }) => {
        await page.setViewportSize({ width, height: 844 });
        await openHome(page, baseURL, language);
        const layout = await readLayout(page);
        expect(layout.groups).toHaveLength(2);
        const cards = layout.groups.flatMap((group) => group.cards.map((card) => ({ ...card, groupWidth: group.width })));
        expect(cards.map((card) => card.href)).toEqual(ROUTES);
        for (const [index, card] of cards.entries()) {
          expect(near(card.width, card.groupWidth), `${card.href} fills the column`).toBe(true);
          if (index > 0) expect(card.top, `${card.href} follows the card before it`).toBeGreaterThanOrEqual(cards[index - 1].bottom);
        }
        expect(layout.offScreen, 'every card is inside the screen').toEqual([]);
        expect(layout.pageOverflow).toBeLessThanOrEqual(0);
      });
    }
  }
});

test.describe('home route gate: seven languages in the three themes', () => {
  // Clean Studio sets 17px system type and SimDream Day its own weights, so each theme is measured.
  for (const theme of ['cockpit', 'brand', 'studio'] as const) {
    for (const language of LANGUAGES) {
      test(`${theme}, ${language}: no text is cut off and no card leaves the screen, 320px to 1920px`, async ({ page, baseURL }) => {
        await openHome(page, baseURL, language, theme);
        await expectThemeApplied(page, theme);
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          const layout = await readLayout(page);
          expect(layout.cutOff, `${language} at ${width}px`).toEqual([]);
          expect(layout.offScreen, `${language} at ${width}px`).toEqual([]);
          expect(layout.pageOverflow, `${language} at ${width}px`).toBeLessThanOrEqual(0);
          expect(layout.groups.flatMap((group) => group.cards.map((card) => card.href))).toEqual(ROUTES);
        }
      });
    }
  }
});

test.describe('home route gate: cockpit readouts', () => {
  // The readouts are Latin-script aviation text. Inside a right-to-left paragraph the browser moves
  // their leading digits to the far end ("ON-1 AIRLINE PILOT-1"), so they stay left-to-right (AGENTS.md §5.3).
  for (const language of RTL_LANGUAGES) {
    test(`${language}: the readouts of both anchors keep left-to-right order`, async ({ page, baseURL }) => {
      await openHome(page, baseURL, language);
      const panels = page.locator(`${GATE} a[data-route-card="anchor"] [data-route-telemetry]`);
      await expect(panels).toHaveCount(2);
      const directions = await panels.evaluateAll((all) =>
        all.flatMap((panel) => [panel, ...panel.querySelectorAll('span')]).map((element) => getComputedStyle(element).direction)
      );
      expect([...new Set(directions)]).toEqual(['ltr']);
    });
  }
});

test.describe('home route gate: corner tint', () => {
  // The tint sits in the anchor's inline-end top corner and fades toward the middle of the card. Its
  // curve and its fade are physical properties, so both are mirrored for right-to-left pages;
  // unmirrored, the tint ends in a hard straight edge inside the card.
  for (const language of ['en', 'he', 'ar'] as const) {
    test(`${language}: the tint curves and fades toward the inside of the card`, async ({ page, baseURL }) => {
      await openHome(page, baseURL, language);
      const tints = await page.locator(`${GATE} [data-route-backdrop]`).evaluateAll((all) =>
        all.map((tint) => {
          const style = getComputedStyle(tint);
          return { left: parseFloat(style.borderBottomLeftRadius), right: parseFloat(style.borderBottomRightRadius), image: style.backgroundImage };
        })
      );
      expect(tints).toHaveLength(2);
      for (const tint of tints) {
        if (RTL_LANGUAGES.includes(language)) {
          expect(tint.right, 'curved on the inner (right) side').toBeGreaterThan(0);
          expect(tint.left, 'square on the outer (left) side').toBe(0);
          expect(tint.image).toMatch(/to (right bottom|bottom right)/);
        } else {
          expect(tint.left, 'curved on the inner (left) side').toBeGreaterThan(0);
          expect(tint.right, 'square on the outer (right) side').toBe(0);
          expect(tint.image).toMatch(/to (left bottom|bottom left)/);
        }
      }
    });
  }
});

test.describe('home route gate: themes and tones (axe, WCAG 2.x A/AA)', () => {
  const CASES: readonly { name: string; theme: UiTheme; tone?: 'classic' | 'cobalt' | 'squadron' }[] = [
    { name: 'Classic Night', theme: 'cockpit', tone: 'classic' },
    { name: 'Cobalt Navy', theme: 'cockpit', tone: 'cobalt' },
    { name: 'Squadron Mid-Navy', theme: 'cockpit', tone: 'squadron' },
    { name: 'SimDream Day', theme: 'brand' },
    { name: 'Clean Studio', theme: 'studio' },
  ];
  for (const { name, theme, tone } of CASES) {
    for (const language of ['en', 'he'] as const) {
      test(`${name}, ${language}: no violations`, async ({ page, baseURL }) => {
        if (tone) {
          await page.addInitScript((savedTone) => {
            try {
              window.localStorage.setItem('simdream_cockpit_tone', savedTone);
            } catch {
              /* sandboxed frame */
            }
          }, tone);
        }
        await openHome(page, baseURL, language, theme);
        await expectThemeApplied(page, theme);
        if (tone) await expect(page.locator('html')).toHaveAttribute('data-cockpit-tone', tone);
        // The anchors carry a decorative corner tint (sky-500 at 5%). axe cannot judge text that another
        // element overlaps and reports it as "incomplete", so the tint is hidden for the scan. Blending
        // that tint into the surface lowers a ratio by up to 6.4% at night and 5.3% by day, so text
        // whose box meets the tint must clear AA with 7% to spare. The tint itself is pinned here: a
        // stronger one has to revisit that margin.
        const tints = page.locator(`${GATE} [data-route-backdrop]`);
        await expect(tints).toHaveCount(2);
        for (const tint of await tints.all()) await expect(tint).toHaveClass(/(^|\s)from-sky-500\/5(\s|$)/);
        await tints.evaluateAll((all) => {
          for (const tint of all) (tint as HTMLElement).style.visibility = 'hidden';
        });
        const axe = await new AxeBuilder({ page }).include(GATE).withTags(WCAG_A_AA_TAGS).analyze();
        expect(axe.violations.map((violation) => `${violation.id}: ${violation.nodes.length} node(s)`)).toEqual([]);
        // An "incomplete" colour-contrast result means axe could not measure the text and skipped it.
        const contrastTargets = (results: typeof axe.violations) =>
          results.filter((result) => result.id === 'color-contrast').flatMap((result) => result.nodes.map((node) => node.target.join(' ')));
        expect(contrastTargets(axe.incomplete), 'text whose contrast axe could not measure').toEqual([]);
        const measured = axe.passes
          .filter((result) => result.id === 'color-contrast')
          .flatMap((result) =>
            result.nodes.flatMap((node) =>
              node.any.map((check) => ({ selector: node.target.join(' '), ratio: Number((check.data as { contrastRatio?: number })?.contrastRatio) }))
            )
          )
          .filter((entry) => Number.isFinite(entry.ratio));
        // 43 text nodes today: the section header, six cards and the two readout panels.
        expect(measured.length, 'text nodes whose contrast axe measured').toBeGreaterThanOrEqual(40);
        const underTint = await page.evaluate(
          ({ entries, gate }) => {
            const tintBoxes = [...document.querySelectorAll(`${gate} [data-route-backdrop]`)].map((tint) => tint.getBoundingClientRect());
            return entries
              .filter(({ selector }) => {
                const box = document.querySelector(selector)?.getBoundingClientRect();
                return Boolean(box) && tintBoxes.some((tint) => box!.left < tint.right && box!.right > tint.left && box!.top < tint.bottom && box!.bottom > tint.top);
              })
              .map(({ ratio }) => ratio);
          },
          { entries: measured, gate: GATE }
        );
        expect(underTint.length, 'measured text that meets the corner tint').toBeGreaterThanOrEqual(2);
        expect(Math.min(...underTint), 'lowest contrast of text that meets the corner tint').toBeGreaterThanOrEqual(4.5 * 1.07);
      });
    }
  }
});
