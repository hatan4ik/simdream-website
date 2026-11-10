import { describe, expect, it } from 'vitest';
import { loadApp } from '../support/app';
import { apiRequest, readJson } from '../support/http';

describe('GET /api/blog (multilingual blog catalog feed)', () => {
  it('serves the default Hebrew blog posts with public cache headers', async () => {
    const app = await loadApp();
    const { GET } = await app.routes.blog();

    const response = await GET(apiRequest('/api/blog'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('public');

    const body = (await readJson(response)).body as {
      posts: Array<{ id: string; title: string; slug: string; language: string }>;
      language: string;
      count: number;
    };

    expect(body.language).toBe('he');
    expect(body.count).toBeGreaterThan(0);
    expect(body.posts.length).toBe(body.count);
    expect(body.posts[0]?.slug).toBeTruthy();
    expect(body.posts[0]?.title).toBeTruthy();
  });

  it.each(['en', 'ru', 'fr', 'es', 'ar'] as const)(
    'accepts query parameter ?lang=%s and answers with matching language',
    async (lang) => {
      const app = await loadApp();
      const { GET } = await app.routes.blog();

      const response = await GET(apiRequest(`/api/blog?lang=${lang}`));
      expect(response.status).toBe(200);

      const body = (await readJson(response)).body as {
        posts: Array<{ id: string; title: string; slug: string; language: string }>;
        language: string;
        count: number;
      };

      expect(body.language).toBe(lang);
      expect(body.count).toBeGreaterThan(0);
    }
  );

  it('falls back cleanly to default language on an unsupported language parameter', async () => {
    const app = await loadApp();
    const { GET } = await app.routes.blog();

    const response = await GET(apiRequest('/api/blog?lang=unsupported_locale_123'));
    expect(response.status).toBe(200);

    const body = (await readJson(response)).body as {
      language: string;
      count: number;
    };

    expect(body.language).toBe('he');
    expect(body.count).toBeGreaterThan(0);
  });

  it('answers 500 with error details when underlying blog resolution throws', async () => {
    const app = await loadApp();
    const route = await app.routes.blog();
    
    // Simulate invalid request object causing an exception
    const response = await route.GET({} as Request);
    expect(response.status).toBe(500);

    const body = (await readJson(response)).body as { error: string; posts: unknown[] };
    expect(body.error).toBeTruthy();
    expect(body.posts).toEqual([]);
  });
});
