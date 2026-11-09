import { readFileSync } from 'node:fs';
import { expect, test } from '../support/e2e';
import { getBlogAuthor } from '../../lib/data/blog-authors';
import type { BlogPost } from '../../lib/data/blog-categories';
import { blogPostPath } from '../../lib/seo/site-routes';

/**
 * The served pages honour the SEO contract the unit tests check in source: the article page
 * carries the E-E-A-T structured data, the generated llms.txt is really published at
 * /llms.txt, and post-checkout confirmations tell crawlers not to index them.
 */

// Playwright's ESM loader cannot import the JSON corpus through lib/data/blog-posts.ts
// without import attributes, so the newest article is read straight from the file.
const corpus = JSON.parse(
  readFileSync(new URL('../../lib/data/blog-posts.json', import.meta.url), 'utf8')
) as BlogPost[];
const post = [...corpus].sort((a, b) => b.datePublished.localeCompare(a.datePublished))[0]!;
const author = getBlogAuthor(post.authorId);

type JsonLd = Record<string, unknown> & { '@type'?: string };

async function readJsonLd(page: import('@playwright/test').Page): Promise<JsonLd[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return scripts.map((text) => JSON.parse(text) as JsonLd);
}

test.describe('blog article structured data', () => {
  test('BlogPosting names a Person author and omits an invented dateModified', async ({ page }) => {
    await page.goto(blogPostPath(post.slug));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(post.title);

    const posting = (await readJsonLd(page)).find((entry) => entry['@type'] === 'BlogPosting');
    expect(posting).toBeDefined();
    expect(posting!.datePublished).toBe(post.datePublished);
    if (post.dateModified) expect(posting!.dateModified).toBe(post.dateModified);
    else expect(posting).not.toHaveProperty('dateModified');

    const person = posting!.author as JsonLd;
    expect(person['@type']).toBe('Person');
    expect(person.name).toBe(author.nameHe);
    expect(person.sameAs).toEqual([...author.sameAs]);
    // The visible byline and the schema come from the same registry entry.
    await expect(page.getByText(author.nameHe, { exact: true })).toBeVisible();
  });

  test('BreadcrumbList follows Home → Blog → article in Hebrew', async ({ page }) => {
    await page.goto(blogPostPath(post.slug));
    const breadcrumb = (await readJsonLd(page)).find((entry) => entry['@type'] === 'BreadcrumbList');
    expect(breadcrumb).toBeDefined();
    const items = breadcrumb!.itemListElement as Array<{ position: number; name: string; item: string }>;
    expect(items.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(items[2]!.name).toBe(post.title);
    expect(items[1]!.item).toMatch(/\/blog$/);
    const nav = page.getByRole('navigation', { name: 'נתיב ניווט' });
    await expect(nav.getByRole('link', { name: items[0]!.name })).toBeVisible();
    await expect(nav.getByRole('link', { name: items[1]!.name })).toBeVisible();
  });
});

test.describe('robots directives', () => {
  // Crawlers read the served HTML, so this checks the document rather than a hydrated page.
  async function robotsMeta(request: import('@playwright/test').APIRequestContext, route: string) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    const html = await response.text();
    return [...html.matchAll(/<meta\s+name="robots"\s+content="([^"]*)"/g)].map((match) => match[1]!);
  }

  for (const route of ['/book/success', '/subscriptions/thank-you']) {
    test(`${route} is noindex while its parent page stays indexable`, async ({ request }) => {
      const confirmation = await robotsMeta(request, route);
      expect(confirmation.some((content) => /noindex/.test(content)), confirmation.join(' | ')).toBe(true);
      const parent = await robotsMeta(request, route.split('/').slice(0, 2).join('/'));
      expect(parent.length).toBeGreaterThan(0);
      expect(parent.every((content) => !/noindex/.test(content)), parent.join(' | ')).toBe(true);
    });
  }
});

test('llms.txt is served from the generated file', async ({ request }) => {
  const response = await request.get('/llms.txt');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('- **Sunday – Saturday (every day)**: 09:00 – 24:00');
  expect(body).toContain('Google Rating (last known)');
  expect(body).toContain('https://www.simdream.co.il/fear-of-flying');
  expect(body).toContain(blogPostPath(post.slug));
});
