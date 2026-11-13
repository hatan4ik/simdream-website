import React from 'react';
import type { Metadata } from 'next';
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
        <BlogIndexView initialPosts={posts} />
      </div>
    </div>
  );
}

