import React from 'react';
import type { Metadata } from 'next';
import { BookOpen, Sparkles } from 'lucide-react';
import { getAllBlogPosts } from '@/lib/data/blog-posts';
import { BlogIndexView } from '@/components/blog/BlogIndexView';

export const metadata: Metadata = {
  title: 'בלוג תעופה וסימולטור טיסה בואינג 737 | סים דרים ישראל',
  description:
    'מאמרים, מדריכים ותובנות מתא הטייס: הכנה למיוני טייסים, מדריכי נחיתות מורכבות, מערכות בואינג 737, התמודדות עם חרדת טיסה ורעיונות למתנות מיוחדות.',
  keywords: [
    'בלוג תעופה',
    'סימולטור טיסה תל אביב',
    'הכנה לראיון טייס',
    'נחיתת רוח צד בואינג 737',
    'פחד טיסה',
    'שובר מתנה לסימולטור',
  ],
  alternates: {
    canonical: 'https://www.simdream.co.il/blog',
  },
  openGraph: {
    title: 'בלוג תעופה וסימולטור טיסה בואינג 737 | SimDream',
    description:
      'מדריכים ותובנות מתא הטייס של בואינג 737: טיפים לקברניטים, מיוני חברות תעופה ואתגרי נחיתה בינלאומיים.',
    url: 'https://www.simdream.co.il/blog',
    type: 'website',
  },
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <div className="min-h-screen bg-slate-950 pt-10 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Hero */}
        <header className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono uppercase tracking-widest mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>יומן הטיסה של סים דרים · FLIGHT DECK JOURNAL</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            מאמרים, מדריכים ותובנות מתא הטייס
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            ידע תעופתי אמיתי, הסברים על מערכות בואינג 737, מדריכי גישות ונחיתות מאתגרות בעולם,
            והכנה מעשית למיוני חברות תעופה – היישר מהקברניטים של Sim Dream.
          </p>
        </header>

        {/* Interactive Blog Catalog */}
        <main>
          <BlogIndexView initialPosts={posts} />
        </main>
      </div>
    </div>
  );
}

