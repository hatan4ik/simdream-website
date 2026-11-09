import { readFileSync } from 'node:fs';
import type { Locator } from '@playwright/test';
import { expect, LANGUAGES, preferLanguage } from '../support/e2e';
import { test } from './support/fixtures';
import { gotoSettled, isolateFromThirdParties } from './support/page';

test.use({ reducedMotion: 'no-preference', video: 'off' });

const DIRECT_URL = 'https://search.google.com/local/reviews?placeid=test';
// The offline fallback is refreshed weekly by automation (google-rating-refresh.yml): read it, never pin it.
const KNOWN: { overallRating: number; totalReviewsCount: number } = JSON.parse(
  readFileSync(new URL('../../lib/reviews/last-known-rating.json', import.meta.url), 'utf8')
);
const KNOWN_GRADE = KNOWN.overallRating.toFixed(1);
// The bar formats counts for the locale (1,234), so the expectations do too.
const KNOWN_COUNT = KNOWN.totalReviewsCount.toLocaleString('en-US');
const KNOWN_COUNT_LABEL = `${KNOWN_COUNT} reviews`;

function snapshot(totalReviewsCount: number, reviewCount = 3, overallRating = 4.9) {
  return {
    overallRating,
    totalReviewsCount,
    directReviewsUrl: DIRECT_URL,
    reviews: Array.from({ length: reviewCount }, (_, index) => ({
      id: `review-${index + 1}`,
      author: `Reviewer ${index + 1}`,
      rating: index === 2 ? 4 : 5,
      quote: `Google review number ${index + 1}.`,
      publishedAt: `2026-11-0${(index % 9) + 1}T10:00:00Z`,
      original: index === 0 ? { text: 'ביקורת Google מספר אחת.', language: 'he' } : null,
      relativeTime: 'a week ago',
      language: 'en',
    })),
  };
}

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('expected a visible element');
  return rect;
}

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  await page.route('**/api/reviews*', (route) => route.fulfill({ json: snapshot(127) }));
});

test('shows the rating the way Google does (score, five stars, grey count) and opens the recent reviews', async ({ page }) => {
  await gotoSettled(page, '/');

  const trigger = page.getByRole('button', { name: 'Show recent Google reviews' });
  await expect(trigger.locator('[data-google-rating-value]')).toHaveText('4.9');
  await expect(trigger.locator('[data-google-star]')).toHaveCount(5);
  // Four full stars and 90% of the fifth, exactly as Google draws a 4.9.
  const fills = await trigger.locator('[data-google-star]').evaluateAll((stars) => stars.map((star) => star.getAttribute('data-star-fill')));
  expect(fills).toEqual(['1.00', '1.00', '1.00', '1.00', '0.90']);
  await expect(trigger.locator('[data-google-review-count]')).toHaveText('127 reviews');

  await trigger.click();
  await expect(page.locator('[data-google-reviews-trigger]')).toHaveAttribute('aria-expanded', 'true');
  const panel = page.locator('[data-google-reviews-panel]');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('article')).toHaveCount(3);
  await expect(panel.getByRole('link', { name: 'Read all reviews on Google' })).toHaveAttribute('target', '_blank');

  await panel.getByRole('button', { name: 'Close Google reviews' }).click();
  await expect(panel).toBeHidden();
});

test('reads "review" or "reviews" correctly for the count', async ({ page }) => {
  await page.route('**/api/reviews*', (route) => route.fulfill({ json: snapshot(1, 1, 5) }));
  await gotoSettled(page, '/');
  await expect(page.locator('[data-google-review-count]')).toHaveText('1 review');
  await expect(page.locator('[data-google-rating-value]')).toHaveText('5.0');
});

for (const language of LANGUAGES) {
  test(`labels the review count in the visitor's language (${language})`, async ({ page }) => {
    await preferLanguage(page, language);
    await gotoSettled(page, '/');

    const label = page.locator('[data-google-review-count]');
    await expect(label).toBeVisible();
    const nouns = {
      en: /reviews$/,
      he: /ביקורות$/,
      ru: /отзывов$/,
      fr: /avis$/,
      ar: /تقييمًا$/,
      es: /reseñas$/,
    } as const;
    await expect(label).toHaveText(nouns[language as keyof typeof nouns]);
    // No cross-script contamination: the count label carries only its own language's script.
    const text = (await label.textContent()) ?? '';
    if (language === 'ar') expect(text).not.toMatch(/[֐-׿]/);
    if (language === 'he') expect(text).not.toMatch(/[؀-ۿ]/);
  });
}

test('picks up the current count on every refresh and when a long-open tab is shown again', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/reviews*', (route) => {
    calls += 1;
    return route.fulfill({ json: snapshot(421 + calls) });
  });
  await page.clock.install();
  await gotoSettled(page, '/');
  await expect(page.locator('[data-google-review-count]')).toHaveText('422 reviews');

  // A refresh asks Google (through the server) again and shows the new count.
  await page.reload();
  await expect(page.locator('[data-google-review-count]')).toHaveText('423 reviews');

  // Returning to a tab that has sat open for more than a minute refreshes the count too.
  await page.clock.fastForward(61_000);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('[data-google-review-count]')).toHaveText('424 reviews');

  // A failed refresh keeps the last good numbers on screen instead of blanking them.
  await page.route('**/api/reviews*', (route) => route.fulfill({ status: 500, json: { error: 'down' } }));
  await page.clock.fastForward(61_000);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('[data-google-review-count]')).toHaveText('424 reviews');
});

test('sits in one centred column on a wide Mac screen', async ({ page }) => {
  await page.setViewportSize({ width: 1558, height: 700 });
  await gotoSettled(page, '/');

  const trigger = page.locator('[data-google-reviews-trigger]');
  await expect(trigger.locator('[data-google-star]')).toHaveCount(5);

  // The top bar and the navbar share the 80rem column, so neither stretches to the screen edges.
  const barInner = await box(page.locator('[data-site-utility-bar-inner]'));
  const navInner = await box(page.locator('[data-site-navbar-inner]'));
  expect(barInner.width).toBeLessThanOrEqual(1280);
  expect(navInner.width).toBeLessThanOrEqual(1280);
  expect(Math.abs(barInner.x - navInner.x)).toBeLessThanOrEqual(1);

  // Reviews and quick links form one cluster centred on the page rather than pinned apart.
  const reviews = await box(trigger);
  const links = await box(page.locator('[data-top-bar-social-links]'));
  const clusterCentre = (reviews.x + links.x + links.width) / 2;
  expect(Math.abs(clusterCentre - 1558 / 2)).toBeLessThanOrEqual(4);
  expect(links.x - (reviews.x + reviews.width)).toBeLessThanOrEqual(60);

  // From the tablet width up WhatsApp stays in the top bar, not in the navbar.
  await expect(page.locator('[data-site-utility-bar] [data-whatsapp-action]')).toBeVisible();
  await expect(page.locator('[data-site-navbar] [data-whatsapp-action]')).toBeHidden();

  // The logo sits well inside the screen, not against the left edge.
  const logo = await box(page.locator('[data-site-navbar] a[href="/"]').first());
  expect(logo.x).toBeGreaterThan(120);
});

test('opens a compact dropdown under the rating with a short list of reviews', async ({ page }) => {
  await page.route('**/api/reviews*', (route) => route.fulfill({ json: snapshot(127, 4) }));
  await page.setViewportSize({ width: 1558, height: 700 });
  await gotoSettled(page, '/');

  const trigger = page.locator('[data-google-reviews-trigger]');
  await trigger.click();
  const panel = page.locator('[data-google-reviews-panel]');
  await expect(panel).toBeVisible();

  const triggerBox = await box(trigger);
  const panelBox = await box(panel);
  expect(panelBox.width).toBeLessThanOrEqual(520);
  expect(panelBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height - 2);
  expect(Math.abs(panelBox.x - triggerBox.x)).toBeLessThanOrEqual(2);
  // "A couple of recent reviews": three of the four supplied, with the rest one click away on Google.
  await expect(panel.getByRole('article')).toHaveCount(3);
  await expect(panel.getByRole('link', { name: 'Read all reviews on Google' })).toBeVisible();
});

async function expectNoOverlap(items: { name: string; locator: Locator }[]) {
  const boxes = await Promise.all(items.map(async ({ name, locator }) => ({ name, ...(await box(locator)) })));
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlaps = a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
      expect(overlaps, `${a.name} overlaps ${b.name}`).toBe(false);
    }
  }
}

for (const language of ['en', 'he'] as const) {
  for (const width of [360, 390, 402]) {
    test(`puts WhatsApp beside Book and keeps stars, count, social icons and language on one row at ${width}px (${language})`, async ({ page }) => {
      await preferLanguage(page, language);
      await page.setViewportSize({ width, height: 800 });
      await gotoSettled(page, '/');

      // WhatsApp sits between the logo and Book, next to Book (mirrored in right-to-left languages).
      const navbar = page.locator('[data-site-navbar]');
      const logo = await box(navbar.locator('a[href="/"]').first());
      const whatsapp = await box(navbar.locator('[data-whatsapp-action]'));
      const book = await box(navbar.locator('a[href="/book"]:visible').first());
      if (language === 'he') {
        expect(book.x + book.width, 'Book sits left of WhatsApp').toBeLessThanOrEqual(whatsapp.x + 0.5);
        expect(whatsapp.x + whatsapp.width, 'WhatsApp sits left of the logo').toBeLessThanOrEqual(logo.x + 0.5);
        expect(whatsapp.x - (book.x + book.width), 'WhatsApp is next to Book').toBeLessThanOrEqual(16);
      } else {
        expect(logo.x + logo.width, 'WhatsApp sits right of the logo').toBeLessThanOrEqual(whatsapp.x + 0.5);
        expect(whatsapp.x + whatsapp.width, 'Book sits right of WhatsApp').toBeLessThanOrEqual(book.x + 0.5);
        expect(book.x - (whatsapp.x + whatsapp.width), 'WhatsApp is next to Book').toBeLessThanOrEqual(16);
      }
      await expect(page.locator('[data-site-utility-bar] [data-whatsapp-action]')).toBeHidden();

      // The top bar is one slim row and nothing is drawn on top of anything else.
      const bar = await box(page.locator('[data-site-utility-bar]'));
      expect(bar.height).toBeLessThanOrEqual(48);
      const items = [
        { name: 'rating', locator: page.locator('[data-google-reviews-trigger]') },
        ...['instagram', 'facebook', 'youtube'].map((channel) => ({
          name: channel,
          locator: page.locator(`[data-top-bar-social-link="${channel}"]`),
        })),
        { name: 'language', locator: page.locator('[data-site-utility-bar] [data-language-selector-trigger]') },
      ];
      await expectNoOverlap(items);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBe(0);
    });
  }
}

test('keeps WhatsApp in the top bar on a 320px screen, where the navbar has no room for it', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await gotoSettled(page, '/');

  await expect(page.locator('[data-site-navbar] [data-whatsapp-action]')).toBeHidden();
  await expect(page.locator('[data-site-utility-bar] [data-whatsapp-action]')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
  const navOverflow = await page.locator('[data-site-navbar]').evaluate((nav) => nav.scrollWidth - nav.clientWidth);
  expect(navOverflow).toBe(0);
});

/**
 * Five yellow stars filled to the last-known grade (all five while it is 5.0, 90% of the last at 4.9, as
 * Google draws it): each filled layer spans its share of the star and its icon has a fill.
 */
async function expectLastKnownStars(rating: Locator) {
  const stars = rating.locator('[data-google-star]');
  await expect(stars).toHaveCount(5);
  const drawn = await stars.evaluateAll((elements) =>
    elements.map((star) => {
      const layer = star.querySelector('span') as HTMLElement;
      const icon = layer.querySelector('svg') as SVGElement;
      return {
        fill: star.getAttribute('data-star-fill'),
        coverage: layer.getBoundingClientRect().width / star.getBoundingClientRect().width,
        filled: getComputedStyle(icon).fill !== 'none',
        amber: icon.getAttribute('class')?.includes('fill-amber-400') ?? false,
      };
    })
  );
  drawn.forEach((star, index) => {
    const share = Math.max(0, Math.min(1, KNOWN.overallRating - index));
    expect(star.fill).toBe(share.toFixed(2));
    expect(star.coverage).toBeCloseTo(share, 1);
    expect(star.filled).toBe(true);
    expect(star.amber).toBe(true);
  });
}

test('shows the grade, five full yellow stars and the count even when Google has no data to give', async ({ page }) => {
  // The server answers "no data" (no Places key, or a failed refresh): the bar must still show a rating.
  await page.route('**/api/reviews*', (route) =>
    route.fulfill({ json: { overallRating: 0, totalReviewsCount: 0, directReviewsUrl: DIRECT_URL, reviews: [] } })
  );
  await gotoSettled(page, '/');

  const bar = page.locator('[data-site-utility-bar]');
  const summary = bar.locator('[data-google-rating-summary]');
  await expect(summary).toHaveAttribute('data-google-rating-live', 'false');
  await expect(summary).toHaveAttribute('href', /search\.google\.com\/local\/reviews\?placeid=/);
  await expect(summary).toHaveAttribute('target', '_blank');
  await expect(summary.locator('[data-google-rating-value]')).toHaveText(KNOWN_GRADE);
  await expect(summary.locator('[data-google-review-count]')).toHaveText(KNOWN_COUNT_LABEL);
  await expectLastKnownStars(summary);
  // No review text exists to show, so there is no dropdown and nothing is invented.
  await expect(bar.locator('[data-google-reviews-trigger]')).toHaveCount(0);
  await expect(summary).toHaveAccessibleName(new RegExp(`${KNOWN_GRADE.replace('.', '\\.')} stars from ${KNOWN_COUNT} Google reviews`));
});

test('keeps the grade, stars and count on screen when the review service is down', async ({ page }) => {
  await page.route('**/api/reviews*', (route) => route.fulfill({ status: 500, json: { error: 'down' } }));
  await gotoSettled(page, '/');

  const summary = page.locator('[data-google-rating-summary]');
  await expect(summary.locator('[data-google-rating-value]')).toHaveText(KNOWN_GRADE);
  await expect(summary.locator('[data-google-review-count]')).toHaveText(KNOWN_COUNT_LABEL);
  await expectLastKnownStars(summary);
});

test("replaces the last-known rating with Google's own numbers when only the rating is supplied", async ({ page }) => {
  // Google returned a rating and a count but no review texts: still live, still a plain link.
  const liveCount = KNOWN.totalReviewsCount + 1; // always differs from the fallback, whatever the last refresh wrote
  await page.route('**/api/reviews*', (route) => route.fulfill({ json: snapshot(liveCount, 0, 4.8) }));
  await gotoSettled(page, '/');

  const summary = page.locator('[data-google-rating-summary]');
  await expect(summary).toHaveAttribute('data-google-rating-live', 'true');
  await expect(summary).toHaveAttribute('href', DIRECT_URL);
  await expect(summary.locator('[data-google-rating-value]')).toHaveText('4.8');
  await expect(summary.locator('[data-google-review-count]')).toHaveText(`${liveCount.toLocaleString('en-US')} reviews`);
  await expect(page.locator('[data-site-utility-bar]')).not.toContainText(KNOWN_COUNT_LABEL);
});

for (const language of ['en', 'he'] as const) {
  test(`shows the grade beside the stars on a 390px phone without wrapping (${language})`, async ({ page }) => {
    await page.route('**/api/reviews*', (route) =>
      route.fulfill({ json: { overallRating: 0, totalReviewsCount: 0, directReviewsUrl: DIRECT_URL, reviews: [] } })
    );
    await preferLanguage(page, language);
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoSettled(page, '/');

    const summary = page.locator('[data-google-rating-summary]');
    await expect(summary.locator('[data-google-rating-value]')).toBeVisible();
    await expect(summary.locator('[data-google-rating-value]')).toHaveText(KNOWN_GRADE);
    await expect(summary.locator('[data-google-review-count]')).toBeVisible();
    await expectLastKnownStars(summary);
    expect((await box(page.locator('[data-site-utility-bar]'))).height).toBeLessThanOrEqual(48);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
}

test('shows each review\u2019s date and lets the reader switch between Google\u2019s translation and the original', async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  await page.route('**/api/reviews*', (route) => route.fulfill({ json: snapshot(127) }));
  await gotoSettled(page, '/');
  await page.locator('[data-google-reviews-trigger]').click();
  const panel = page.locator('[data-google-reviews-panel]');
  await expect(panel.locator('[data-reviews-ordering]')).toHaveText('The five newest Google reviews, newest first (updated twice a day).');
  const first = panel.getByRole('article').first();
  await expect(first.locator('time')).toHaveAttribute('datetime', '2026-11-01T10:00:00Z');
  await expect(first.locator('time')).toHaveText(/2026/);
  await expect(first).toContainText('Translated by Google');
  const toggle = first.locator('[data-review-toggle-original]');
  await expect(toggle).toHaveText('Show original');
  await toggle.click();
  await expect(first.locator('blockquote')).toHaveText(/ביקורת Google מספר אחת/);
  await expect(first.locator('blockquote')).toHaveAttribute('dir', 'rtl');
  await expect(toggle).toHaveText('Show translation');
  // A review Google did not translate offers no switch.
  await expect(panel.getByRole('article').nth(1).locator('[data-review-toggle-original]')).toHaveCount(0);
});
