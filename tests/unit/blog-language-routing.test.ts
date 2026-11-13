import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BlogIndexView } from '@/components/blog/BlogIndexView';
import { getAllBlogPosts } from '@/lib/data/blog-posts';
import { LanguageProvider, type Language } from '@/lib/i18n/language-context';
import { extractPathLocale } from '@/lib/i18n/language-preference';

function renderBlogIndex(language: Language): string {
  const posts = getAllBlogPosts().slice(0, 2);
  return renderToStaticMarkup(
    React.createElement(LanguageProvider, {
      initialLanguage: language,
      children: React.createElement(BlogIndexView, { initialPosts: posts }),
    })
  );
}

describe('extractPathLocale', () => {
  it('extracts supported locale prefixes from Wix Multilingual paths', () => {
    expect(extractPathLocale('/en/blog')).toBe('en');
    expect(extractPathLocale('/ru/blog')).toBe('ru');
    expect(extractPathLocale('/he')).toBe('he');
    expect(extractPathLocale('/fr/')).toBe('fr');
    expect(extractPathLocale('/ar/pro')).toBe('ar');
    expect(extractPathLocale('/es/experiences')).toBe('es');
  });

  it('returns null for unprefixed, unsupported, or nested locale segments', () => {
    expect(extractPathLocale('/blog')).toBeNull();
    expect(extractPathLocale('/post/en/slug')).toBeNull();
    expect(extractPathLocale('/english/blog')).toBeNull();
    expect(extractPathLocale('/de/blog')).toBeNull();
    expect(extractPathLocale('')).toBeNull();
    expect(extractPathLocale(null)).toBeNull();
    expect(extractPathLocale(undefined)).toBeNull();
  });
});

describe('BlogIndexView hero localization', () => {
  it('renders the original Hebrew hero copy by default', () => {
    const html = renderBlogIndex('he');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('יומן הטיסה של סים דרים · FLIGHT DECK JOURNAL');
    expect(html).toContain('מאמרים, מדריכים ותובנות מתא הטייס');
    expect(html).toContain('ידע תעופתי אמיתי');
  });

  it('localizes the hero header and direction for English and Russian', () => {
    const enHtml = renderBlogIndex('en');
    expect(enHtml).toContain('dir="ltr"');
    expect(enHtml).toContain('SIM DREAM FLIGHT DECK JOURNAL');
    expect(enHtml).toContain('Articles, Guides &amp; Cockpit Insights');
    expect(enHtml).not.toContain('מאמרים, מדריכים ותובנות מתא הטייס');

    const ruHtml = renderBlogIndex('ru');
    expect(ruHtml).toContain('dir="ltr"');
    expect(ruHtml).toContain('БОРТОВОЙ ЖУРНАЛ SIM DREAM');
    expect(ruHtml).toContain('Статьи, руководства и заметки из кабины');
    expect(ruHtml).not.toContain('מאמרים, מדריכים ותובנות מתא הטייס');
  });

  it('keeps Arabic hero copy RTL and free of Hebrew characters', () => {
    const arHtml = renderBlogIndex('ar');
    expect(arHtml).toContain('dir="rtl"');
    expect(arHtml).toContain('مقالات وأدلة ورؤى من قمرة القيادة');
    expect(arHtml).not.toContain('מאמרים, מדריכים ותובנות מתא הטייס');
  });
});
