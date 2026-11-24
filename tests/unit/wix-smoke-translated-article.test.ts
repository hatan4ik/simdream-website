import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import blogSlugMap from '@/lib/data/blog-slug-map.json';
import { SHORT_SLUG_BY_TID } from '@/lib/data/blog-short-slugs';
import { REPO_ROOT } from './_support/source';

// After a Wix publish the smoke check must prove a TRANSLATED blog article comes back in its own language.
// A rejected Wix query makes the resolver fall back to the local Hebrew article, so every translation rendered
// in Hebrew on staging for hours (2026-11-24) while the smoke checks, which only fetched Hebrew pages, stayed
// green. The check reads the self-referencing canonical: the fallback points it at the Hebrew page.
const WORKFLOWS = ['.github/workflows/ci.yml', '.github/workflows/wix-release.yml', '.github/workflows/wix-rollback.yml'];

describe('Wix publish smoke checks cover a translated blog article', () => {
  for (const workflow of WORKFLOWS) {
    const source = readFileSync(path.join(REPO_ROOT, workflow), 'utf8');

    it(`${workflow} requests an English article and checks its canonical`, () => {
      const request = source.match(/"\$SITE_URL\/post\/en\/([a-z0-9-]+)"/);
      expect(request, 'a request to $SITE_URL/post/en/<slug>').not.toBeNull();
      const slug = request![1]!;
      expect(source).toContain(`rel="canonical" href="[^"]*/post/en/${slug}"`);
    });

    it(`${workflow} uses an article that really has an English translation`, () => {
      const slug = source.match(/"\$SITE_URL\/post\/en\/([a-z0-9-]+)"/)?.[1];
      const translationId = Object.entries(SHORT_SLUG_BY_TID).find(([, short]) => short === slug)?.[0];
      expect(translationId, `short slug "${slug}" in SHORT_SLUG_BY_TID`).toBeDefined();
      const group = (blogSlugMap.byTranslationId as Record<string, Record<string, string>>)[translationId!];
      expect(group?.en, 'an English slug for that translation group').toBeTruthy();
    });
  }
});
