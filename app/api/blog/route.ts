import { NextResponse } from 'next/server';
import { listWixBlogPosts } from '@/lib/wix/blog';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from '@/lib/i18n/language-preference';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // `language` first; `lang` stays as a legacy alias (Wix Multilingual strips `?lang=he` at the edge).
    const requestedLang = searchParams.get('language') ?? searchParams.get('lang');
    const lang = isSupportedLanguage(requestedLang) ? requestedLang : DEFAULT_LANGUAGE;

    const posts = await listWixBlogPosts({ language: lang });

    return NextResponse.json(
      { posts, language: lang, count: posts.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown blog fetch error';
    return NextResponse.json({ error: message, posts: [] }, { status: 500 });
  }
}
