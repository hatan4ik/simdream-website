import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { buildLlmsTxt } from '@/lib/seo/llms-txt';
import { PUBLIC_SITE_ROUTES } from '@/lib/seo/site-routes';
import { REPO_ROOT, sourceFiles } from './_support/source';

/**
 * /refund is deliberately unlisted (product decision): reachable by URL, from the rules refund
 * clause and from confirmation emails, and from nowhere else. These checks keep it that way.
 * (tests/unit/route-coverage.test.ts also proves any app/(public) page is noindex or in the sitemap.)
 */
const read = (file: string) => readFileSync(path.join(REPO_ROOT, file), 'utf8');

describe('the /refund page is unlisted', () => {
  it('asks search engines not to index it or follow its links', () => {
    expect(read('app/(public)/refund/layout.tsx')).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  });

  it('is not in the shared route registry, so it cannot reach the sitemap, llms.txt or the structured data', () => {
    expect(PUBLIC_SITE_ROUTES.map((route) => route.path)).not.toContain('/refund');
    expect(sitemap().map((entry) => entry.url).filter((url) => /\/refund/.test(url))).toEqual([]);
    expect(buildLlmsTxt()).not.toMatch(/\/refund/);
    expect(read('public/llms.txt')).not.toMatch(/\/refund/);
  });

  it('is not advertised by robots.txt either (a Disallow line would publish the URL and hide the noindex)', () => {
    const rules = robots().rules;
    const text = JSON.stringify(rules);
    expect(text).not.toMatch(/refund/);
  });

  it('is linked from no navigation, footer, SEO or other page component', () => {
    const linkers = sourceFiles('app', 'components', 'lib')
      .map((file) => path.relative(REPO_ROOT, file))
      .filter((file) => !/^(components\/refund|lib\/refund|app\/\(public\)\/refund|app\/api\/refund-requests)\//.test(file))
      .filter((file) => /['"`]\/refund(?:['"`/?#])/.test(read(file)));
    // The rules page refund clause is the one intended entry point (added with the rules rewrite).
    // The rules refund clause is the only deliberate link; its path constant lives in lib/legal/anchors.ts.
    expect(linkers.filter((file) => !/^(components\/legal\/RulesContentView\.tsx|lib\/legal\/anchors\.ts)$/.test(file))).toEqual([]);
  });

  it('keeps the private-data API out of the browser cache and the crawl', () => {
    expect(read('app/api/refund-requests/route.ts')).toContain("'Cache-Control': 'no-store'");
    expect(JSON.stringify(robots().rules)).toContain('/api');
  });
});
