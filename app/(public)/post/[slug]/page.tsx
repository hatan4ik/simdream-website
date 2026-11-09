import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowRight, UserCheck } from 'lucide-react';
import {
  getAllBlogPosts,
  getBlogPostBySlug,
  getRelatedBlogPosts,
  BLOG_CATEGORIES,
} from '@/lib/data/blog-posts';
import { BlogContentRenderer } from '@/components/blog/BlogContentRenderer';
import { BlogConversionCta } from '@/components/blog/BlogConversionCta';
import { BlogCard } from '@/components/blog/BlogCard';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((post) => ({
    slug: encodeURIComponent(post.slug),
  }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return { title: 'מאמר לא נמצא | SimDream' };

  const canonicalUrl = `https://www.simdream.co.il/post/${encodeURIComponent(post.slug)}`;

  return {
    title: `${post.title} | בלוג סימולטור טיסה SimDream`,
    description: post.excerpt,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: canonicalUrl,
      type: 'article',
      publishedTime: post.datePublished,
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

export default async function SinglePostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const categoryMeta =
    BLOG_CATEGORIES.find((c) => c.id === post.category) ?? BLOG_CATEGORIES[0]!;

  const formattedDate = new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(post.datePublished));

  const relatedPosts = getRelatedBlogPosts(post, 3);
  const canonicalUrl = `https://www.simdream.co.il/post/${encodeURIComponent(post.slug)}`;

  // JSON-LD Structured Data for Google rich results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: [post.coverImage],
    datePublished: post.datePublished,
    dateModified: post.datePublished,
    inLanguage: 'he-IL',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    author: {
      '@type': 'Organization',
      name: 'Sim Dream Aviation Team',
      url: 'https://www.simdream.co.il',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Sim Dream LTD',
      url: 'https://www.simdream.co.il',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.simdream.co.il/brand/simdream-logo.png',
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="min-h-screen bg-slate-950 pt-8 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="נתיב ניווט"
            className="flex items-center gap-2 text-xs text-slate-400 mb-8"
          >
            <Link href="/" className="hover:text-white transition-colors">
              ראשי
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white transition-colors">
              יומן הטיסה
            </Link>
            <span>/</span>
            <span className="text-slate-300 font-medium truncate max-w-[200px] sm:max-w-none">
              {categoryMeta.labelHe}
            </span>
          </nav>

          {/* Article Header */}
          <header className="mb-10 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${categoryMeta.badgeColor}`}
              >
                {categoryMeta.labelHe}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{post.readingTimeMinutes} דקות קריאה</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <time dateTime={post.datePublished}>{formattedDate}</time>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {post.title}
            </h1>

            <p className="text-slate-300 text-lg sm:text-xl leading-relaxed font-medium">
              {post.excerpt}
            </p>

            {/* Author Byline */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-800/80">
              <div className="w-10 h-10 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">קברניטי וצוות המבצעים | סים דרים</p>
                <p className="text-xs text-slate-400">מרכז הדרכה והדמיית טיסה מסחרית, תל אביב</p>
              </div>
            </div>
          </header>

          {/* Hero Cover Image */}
          <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl mb-12 bg-slate-900">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
              className="object-cover"
            />
          </div>

          {/* Main Article Content */}
          <div className="prose prose-invert max-w-none">
            <BlogContentRenderer nodes={post.contentNodes} />
          </div>

          {/* Contextual In-Cockpit Conversion Box */}
          <BlogConversionCta target={post.ctaTarget} />

          {/* Back to Blog Button */}
          <div className="my-10 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-bold text-white transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>חזרה לכל המאמרים ביומן הטיסה</span>
            </Link>
          </div>

          {/* Related Articles Section */}
          {relatedPosts.length > 0 && (
            <aside aria-label="מאמרים נוספים שיעניינו אותך" className="mt-16 pt-12 border-t border-slate-800">
              <h2 className="text-2xl font-extrabold text-white mb-8">
                מאמרים נוספים שיעניינו אותך
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((related) => (
                  <BlogCard key={related.id} post={related} />
                ))}
              </div>
            </aside>
          )}
        </div>
      </article>
    </>
  );
}

