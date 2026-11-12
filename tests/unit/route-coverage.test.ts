import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { getAllBlogPosts } from '@/lib/data/blog-posts';
import { BLOG_SEO_LANGS } from '@/lib/data/blog-seo';
import { PUBLIC_SITE_ROUTES, blogPostPath } from '@/lib/seo/site-routes';
import { REPO_ROOT } from './_support/source';

/**
 * Every public page is either in the sitemap or deliberately kept out of the index, and the
 * sitemap never advertises a page that is noindex, a redirect, or missing. The 39 blog
 * articles are expanded from the corpus, so the dynamic `/post/[slug]` route is covered too.
 */

const APP = path.join(REPO_ROOT, 'app');
const PUBLIC_GROUP = path.join(APP, '(public)');
const BASE_URL = FACILITY_INFO.primaryDomain;

interface PageFile {
  route: string;
  file: string;
  noindex: boolean;
  redirect: boolean;
}

function pageFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(full);
    return entry.name === 'page.tsx' ? [full] : [];
  });
}

/** App Router path for a page file: route groups such as (public) are not URL segments. */
function routeOf(file: string): string {
  const segments = path
    .relative(APP, path.dirname(file))
    .split(path.sep)
    .filter((segment) => segment && !/^\(.*\)$/.test(segment));
  return `/${segments.join('/')}`;
}

/** `robots: { index: false }` on the page or on a layout in the same directory (the login pattern). */
const NOINDEX = /robots:\s*\{[^}]*\bindex:\s*false/;

function describePage(file: string): PageFile {
  const page = readFileSync(file, 'utf8');
  const layout = path.join(path.dirname(file), 'layout.tsx');
  const sources = [page, existsSync(layout) ? readFileSync(layout, 'utf8') : ''];
  return {
    route: routeOf(file),
    file: path.relative(REPO_ROOT, file),
    noindex: sources.some((source) => NOINDEX.test(source)),
    redirect: /\bredirect\(\s*['"`]/.test(page),
  };
}

const publicPages = [path.join(APP, 'page.tsx'), ...pageFiles(PUBLIC_GROUP)].map(describePage);
const posts = getAllBlogPosts();

/** Static pages plus the dynamic article route expanded to all 6-language short canonical URLs. */
function expand(page: PageFile): PageFile[] {
  if (page.route === '/post/[...segments]') {
    return BLOG_SEO_LANGS.flatMap((lang) =>
      posts.map((post) => ({ ...page, route: blogPostPath(post.slug, lang) }))
    );
  }
  if (page.route.includes('[')) throw new Error(`Teach route-coverage.test.ts how to expand ${page.route}`);
  return [page];
}

const indexablePages = publicPages.flatMap(expand);
const sitemapPaths = sitemap().map((entry) => {
  expect(entry.url.startsWith(BASE_URL)).toBe(true);
  return entry.url.slice(BASE_URL.length) || '/';
});

describe('public route coverage: sitemap vs app/(public)', () => {
  it('reads every public page (sanity)', () => {
    expect(publicPages.map((p) => p.route)).toEqual(
      expect.arrayContaining(['/', '/book', '/blog', '/post/[...segments]', '/fear-of-flying', '/subscriptions', '/vouchers'])
    );
    expect(posts).toHaveLength(39);
  });

  it('lists every public page in the sitemap unless it is explicitly noindex or a redirect', () => {
    const set = new Set(sitemapPaths);
    const uncovered = indexablePages.filter((page) => !page.noindex && !page.redirect && !set.has(page.route));
    expect(uncovered.map((page) => `${page.route} (${page.file})`)).toEqual([]);
  });

  it('never advertises a noindex, redirecting or missing page in the sitemap', () => {
    const byRoute = new Map(indexablePages.map((page) => [page.route, page]));
    const offenders = sitemapPaths.flatMap((route) => {
      const page = byRoute.get(route);
      if (!page) return [`${route}: no page under app/(public)`];
      if (page.noindex) return [`${route}: noindex (${page.file})`];
      if (page.redirect) return [`${route}: redirect (${page.file})`];
      return [];
    });
    expect(offenders).toEqual([]);
  });

  it('contains every static route of the shared registry exactly once, and no duplicates', () => {
    for (const route of PUBLIC_SITE_ROUTES) expect(sitemapPaths.filter((p) => p === route.path)).toHaveLength(1);
    expect(new Set(sitemapPaths).size).toBe(sitemapPaths.length);
  });

  it('includes all 39 blog articles across all 6 languages as clean ASCII short URLs', () => {
    const articleEntries = sitemapPaths.filter((p) => p.startsWith('/post/'));
    expect(articleEntries).toHaveLength(39 * BLOG_SEO_LANGS.length);
    const expected = BLOG_SEO_LANGS.flatMap((lang) =>
      posts.map((post) => blogPostPath(post.slug, lang))
    );
    expect(new Set(articleEntries)).toEqual(new Set(expected));
    for (const route of articleEntries) expect(route).not.toMatch(/[\u0590-\u05FF\s%]/);
  });

  it('keeps post-checkout confirmations, the redirect alias and login out of the index', () => {
    const byRoute = new Map(publicPages.map((page) => [page.route, page]));
    expect(byRoute.get('/book/success')?.noindex).toBe(true);
    expect(byRoute.get('/subscriptions/thank-you')?.noindex).toBe(true);
    expect(byRoute.get('/simulator')?.redirect).toBe(true);
    expect(describePage(path.join(APP, '(auth)', 'login', 'page.tsx')).noindex).toBe(true);
  });

  it('never lists member, admin, auth or Wix callback pages', () => {
    const privateRoutes = pageFiles(APP)
      .map(describePage)
      .map((page) => page.route)
      .filter((route) => !publicPages.some((page) => page.route === route));
    expect(privateRoutes).toEqual(
      expect.arrayContaining(['/login', '/dashboard', '/admin', '/auth/callback', '/wix/members/callback'])
    );
    for (const route of privateRoutes) expect(sitemapPaths, route).not.toContain(route);
  });
});
