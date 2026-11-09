import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Calendar, ArrowLeft } from 'lucide-react';
import { BLOG_CATEGORIES, type BlogPost } from '@/lib/data/blog-categories';

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  const categoryMeta =
    BLOG_CATEGORIES.find((c) => c.id === post.category) ?? BLOG_CATEGORIES[0]!;

  const formattedDate = new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(post.datePublished));

  const postUrl = `/post/${encodeURIComponent(post.slug)}`;

  if (featured) {
    return (
      <article className="group relative rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 transition-all duration-300 overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12">
        <div className="relative aspect-[16/9] lg:aspect-auto lg:col-span-7 overflow-hidden min-h-[260px]">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent lg:hidden" />
        </div>

        <div className="p-6 sm:p-8 lg:p-10 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${categoryMeta.badgeColor}`}
              >
                {categoryMeta.labelHe}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{post.readingTimeMinutes} דק׳ קריאה</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white group-hover:text-sky-400 transition-colors leading-tight mb-3">
              <Link href={postUrl} className="focus:outline-none focus:underline">
                {post.title}
              </Link>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base line-clamp-3 leading-relaxed mb-6">
              {post.excerpt}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <time dateTime={post.datePublished}>{formattedDate}</time>
            </span>
            <Link
              href={postUrl}
              className="inline-flex items-center gap-1 text-sm font-bold text-sky-400 group-hover:text-sky-300 transition-colors"
            >
              <span>קראו עוד</span>
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 transition-all duration-300 overflow-hidden flex flex-col h-full shadow-lg hover:shadow-sky-500/5">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border backdrop-blur-md shadow ${categoryMeta.badgeColor}`}
          >
            {categoryMeta.labelHe}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 flex flex-col justify-between flex-grow">
        <div>
          <div className="flex items-center gap-3 text-xs text-slate-400 mb-2.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{post.readingTimeMinutes} דק׳ קריאה</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <time dateTime={post.datePublished}>{formattedDate}</time>
            </span>
          </div>

          <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors leading-snug line-clamp-2 mb-2">
            <Link href={postUrl} className="focus:outline-none focus:underline">
              {post.title}
            </Link>
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed mb-4">
            {post.excerpt}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <Link
            href={postUrl}
            className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 group-hover:text-sky-300 transition-colors"
          >
            <span>לקריאת המאמר המלא</span>
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}

