'use client';

import { ExternalLink, Languages } from 'lucide-react';
import type { LiveGoogleReview } from '@/lib/reviews/use-google-reviews';
import { formatReviewDate, reviewDirection, type ReviewLanguage } from '@/lib/reviews/review-language';

export interface ReviewMetaCopy {
  translatedByGoogle: string;
  showOriginal: string;
  showTranslation: string;
  authorProfile: (name: string) => string;
}

interface ReviewMetaProps {
  review: LiveGoogleReview;
  /** Page language: dates are formatted for it. */
  language: ReviewLanguage;
  copy: ReviewMetaCopy;
  showOriginal: boolean;
  onToggleOriginal: () => void;
  size?: 'sm' | 'md';
}

/** The text to show: Google's translation into the page language, or the review as written. */
export function displayedReviewText(review: LiveGoogleReview, showOriginal: boolean): { text: string; language: ReviewLanguage } {
  if (showOriginal && review.original) return review.original;
  return { text: review.quote, language: review.language };
}

/**
 * Author attribution, publish date and the translation switch for a review in the utility-bar
 * dropdown (the only place Google reviews are rendered). Places policy: credit the author (avatar, name, profile link), make readers
 * aware a review was translated, and let them see the original text.
 */
export function ReviewMeta({ review, language, copy, showOriginal, onToggleOriginal, size = 'md' }: ReviewMetaProps) {
  const date = review.publishedAt ? formatReviewDate(review.publishedAt, language) : '';
  const nameClass = size === 'sm' ? 'text-xs font-semibold text-white' : 'font-semibold text-slate-100';
  const metaClass = size === 'sm' ? 'text-[11px] text-slate-400' : 'text-xs text-slate-400';
  const avatarClass = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-sm';
  const authorDirection = reviewDirection(review.original?.language ?? review.language);
  const author = review.authorUrl ? (
    <a
      href={review.authorUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={copy.authorProfile(review.author)}
      className={`${nameClass} inline-flex items-center gap-1 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded`}
      lang={review.language}
      dir={authorDirection}
    >
      <span>{review.author}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
    </a>
  ) : (
    <span className={nameClass} lang={review.language} dir={authorDirection}>
      {review.author}
    </span>
  );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {review.authorPhotoUrl ? (
          // Google Maps author photo (policy minimum for a review is the avatar); never a Next image, which is unoptimized here anyway.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.authorPhotoUrl}
            alt=""
            width={size === 'sm' ? 28 : 36}
            height={size === 'sm' ? 28 : 36}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={`${avatarClass} shrink-0 rounded-full bg-slate-800 object-cover`}
          />
        ) : (
          <span
            aria-hidden="true"
            className={`${avatarClass} inline-flex shrink-0 items-center justify-center rounded-full bg-sky-500/15 font-bold text-sky-200`}
          >
            {review.author.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          {author}
          {date || review.relativeTime ? (
            <p className={metaClass}>
              {date ? (
                <time dateTime={review.publishedAt} dir="ltr">
                  {date}
                </time>
              ) : null}
              {date && review.relativeTime ? <span aria-hidden="true"> · </span> : null}
              {review.relativeTime ? <span lang={language}>{review.relativeTime}</span> : null}
            </p>
          ) : null}
        </div>
      </div>

      {review.original ? (
        <div className="flex items-center gap-2">
          {!showOriginal ? <span className={`${metaClass} inline-flex items-center gap-1`}>
            <Languages className="h-3 w-3" aria-hidden="true" />
            {copy.translatedByGoogle}
          </span> : null}
          <button
            type="button"
            data-review-toggle-original
            aria-pressed={showOriginal}
            onClick={onToggleOriginal}
            className={`${size === 'sm' ? 'text-[11px]' : 'text-xs'} min-h-9 rounded-lg px-2 font-semibold text-sky-300 underline decoration-sky-500/50 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`}
          >
            {showOriginal ? copy.showTranslation : copy.showOriginal}
          </button>
        </div>
      ) : null}
    </div>
  );
}
