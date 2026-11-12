import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowRight, ArrowLeft, UserCheck } from 'lucide-react';
import {
  getRelatedBlogPosts,
  BLOG_CATEGORIES,
  getBlogCategoryLabel,
  type BlogPost,
} from '@/lib/data/blog-posts';
import { getBlogAuthor } from '@/lib/data/blog-authors';
import { BLOG_SEO_LANGS, isBlogSeoLang, resolveShortSlug } from '@/lib/data/blog-seo';
import {
  BLOG_BREADCRUMB_LABELS,
  BLOG_LANGUAGE_LOCALES,
  buildBlogBreadcrumbJsonLd,
  buildBlogPostingJsonLd,
} from '@/lib/seo/blog-structured-data';
import { blogPostPath } from '@/lib/seo/site-routes';
import type { SupportedLanguage } from '@/lib/i18n/translations';
import { isSupportedLanguage } from '@/lib/i18n/language-preference';
import { BlogContentRenderer } from './BlogContentRenderer';
import { BlogConversionCta } from './BlogConversionCta';
import { BlogCard } from './BlogCard';
import { BlogPostLanguageSync } from './BlogPostLanguageSync';

const READ_TIME_LABELS: Record<SupportedLanguage, string> = {
  he: 'דקות קריאה',
  en: 'min read',
  ru: 'мин чтения',
  fr: 'min de lecture',
  es: 'min de lectura',
  ar: 'دقائق قراءة',
};

const BACK_TO_BLOG_LABELS: Record<SupportedLanguage, string> = {
  he: 'חזרה לכל המאמרים ביומן הטיסה',
  en: 'Back to all articles in Flight Deck Journal',
  ru: 'Назад ко всем статьям в Бортовом журнале',
  fr: 'Retour à tous les articles du Journal de bord',
  es: 'Volver a todos los artículos del Diario de cabina',
  ar: 'العودة إلى جميع مقالات يومية قمرة القيادة',
};

const RELATED_POSTS_TITLES: Record<SupportedLanguage, string> = {
  he: 'מאמרים נוספים שיעניינו אותך',
  en: 'More articles you might like',
  ru: 'Другие статьи, которые могут вас заинтересовать',
  fr: 'Autres articles qui pourraient vous intéresser',
  es: 'Otros artículos que podrían interesarte',
  ar: 'مقالات أخرى قد تهمك',
};

const BREADCRUMB_NAV_LABELS: Record<SupportedLanguage, string> = {
  he: 'נתיב ניווט',
  en: 'Breadcrumb navigation',
  ru: 'Навигационная цепочка',
  fr: "Fil d'Ariane",
  es: 'Ruta de navegación',
  ar: 'مسار التنقل',
};

interface BlogPostPageViewProps {
  post: BlogPost;
}

export function BlogPostPageView({ post }: BlogPostPageViewProps) {
  const lang: SupportedLanguage =
    post.language && isSupportedLanguage(post.language) ? post.language : 'he';
  const seoLang = isBlogSeoLang(lang) ? lang : 'he';
  const isRTL = lang === 'he' || lang === 'ar';

  const categoryMeta =
    BLOG_CATEGORIES.find((c) => c.id === post.category) ?? BLOG_CATEGORIES[0]!;
  const categoryLabel = getBlogCategoryLabel(post.category, lang);

  const locale = BLOG_LANGUAGE_LOCALES[seoLang];
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(post.datePublished));

  const relatedPosts = getRelatedBlogPosts(post, 3).map((related) => ({
    ...related,
    canonicalPath: blogPostPath(related.slug, 'he'),
  }));
  const author = getBlogAuthor(post.authorId);

  const blogPostingJsonLd = buildBlogPostingJsonLd(post);
  const breadcrumbJsonLd = buildBlogBreadcrumbJsonLd(post);
  const breadcrumbLabels = BLOG_BREADCRUMB_LABELS[seoLang];

  const shortSlug = post.shortSlug || resolveShortSlug(post.translationId || post.slug);
  const siblingPaths: Record<string, string> = {};
  for (const l of BLOG_SEO_LANGS) {
    siblingPaths[l] = blogPostPath(shortSlug, l);
  }

  const readTimeSuffix = READ_TIME_LABELS[lang];
  const backToBlogText = BACK_TO_BLOG_LABELS[lang];
  const relatedTitle = RELATED_POSTS_TITLES[lang];
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const authorName = lang === 'he' ? author.nameHe : author.nameEn;
  const authorRole = lang === 'he' ? author.roleHe : author.roleEn;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <BlogPostLanguageSync
        siblingSlugs={post.siblingSlugs}
        siblingPaths={siblingPaths}
        currentLang={lang}
      />

      <article dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-950 pt-8 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label={BREADCRUMB_NAV_LABELS[lang]}
            className="flex items-center gap-2 text-xs text-slate-400 mb-8"
          >
            <Link href="/" className="hover:text-white transition-colors">
              {breadcrumbLabels.home}
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white transition-colors">
              {breadcrumbLabels.blog}
            </Link>
            <span>/</span>
            <span className="text-slate-300 font-medium truncate max-w-[200px] sm:max-w-none">
              {categoryLabel || categoryMeta.labelHe}
            </span>
          </nav>

          <header className="mb-10 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${categoryMeta.badgeColor}`}
              >
                {categoryLabel || categoryMeta.labelHe}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {post.readingTimeMinutes} {readTimeSuffix}
                </span>
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

            <div className="flex items-center gap-3 pt-4 border-t border-slate-800/80">
              <div className="w-10 h-10 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{authorName}</p>
                <p className="text-xs text-slate-400">{authorRole}</p>
              </div>
            </div>
          </header>

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

          <div className="prose prose-invert max-w-none">
            <BlogContentRenderer nodes={post.contentNodes} />
          </div>

          <BlogConversionCta target={post.ctaTarget} />

          <div className="my-10 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-bold text-white transition-colors"
            >
              <BackArrow className="w-4 h-4" />
              <span>{backToBlogText}</span>
            </Link>
          </div>

          {relatedPosts.length > 0 && (
            <aside aria-label={relatedTitle} className="mt-16 pt-12 border-t border-slate-800">
              <h2 className="text-2xl font-extrabold text-white mb-8">{relatedTitle}</h2>
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
