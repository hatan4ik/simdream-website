'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, Star, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language } from '@/lib/i18n/translations';
import { reviewDirection } from '@/lib/reviews/review-language';
import { useGoogleReviews, type LiveGoogleReviewsSnapshot } from '@/lib/reviews/use-google-reviews';
import { displayedReviewText, ReviewMeta } from '@/components/reviews/ReviewMeta';
import { LanguageSelector } from './LanguageSelector';
import { SOCIAL_CHANNELS } from './social-channels';
import { WhatsAppAction } from './WhatsAppAction';

import {
  DROPDOWN_REVIEW_LIMIT,
  GOOGLE_REVIEW_POLICY_URL,
  REVIEWS_BAR_COPY,
  REVIEW_NOUNS,
} from './live-metar-bar-copy';

function reviewNoun(language: Language, count: number): string {
  const nouns = REVIEW_NOUNS[language];
  return nouns[new Intl.PluralRules(localeFor(language)).select(count)] ?? nouns.other;
}

/** Five stars filled to the rating (partial for 4.6, as Google draws it); always left-to-right. */
function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5" dir="ltr" aria-hidden="true" data-google-stars>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, rating - index));
        return (
          <span key={index} className="relative inline-block h-3.5 w-3.5 sm:h-4 sm:w-4" data-google-star data-star-fill={fill.toFixed(2)}>
            <Star className="absolute inset-0 h-3.5 w-3.5 text-slate-600 sm:h-4 sm:w-4" />
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="h-3.5 w-3.5 max-w-none shrink-0 fill-amber-400 text-amber-400 sm:h-4 sm:w-4" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Same order and weight as Google's own rating row: large score, stars, grey count. */
function RatingRow({ snapshot, language, formattedCount }: { snapshot: LiveGoogleReviewsSnapshot; language: Language; formattedCount: string }) {
  return (
    <>
      {/* The score is dropped only on the narrowest phones, where it stays in the accessible name. */}
      <span data-google-rating-value className="hidden shrink-0 text-base font-light leading-none tabular-nums text-slate-300 min-[380px]:inline min-[420px]:text-xl" translate="no">
        {snapshot.overallRating.toFixed(1)}
      </span>
      <RatingStars rating={snapshot.overallRating} />
      <span data-google-review-count className="shrink-0 whitespace-nowrap text-slate-400">
        {formattedCount}
        <span className="hidden sm:inline"> {reviewNoun(language, snapshot.totalReviewsCount)}</span>
      </span>
    </>
  );
}

function localeFor(language: Language): string {
  return (
    {
      en: 'en',
      he: 'he-IL',
      ru: 'ru',
      fr: 'fr',
      ar: 'ar',
      es: 'es',
      de: 'de-DE',
    } satisfies Record<Language, string>
  )[language];
}

/**
 * Persistent site utility bar. The rating row always shows a grade, five stars and a review count.
 * With Google review texts it opens a dropdown of recent reviews; without them (live numbers but no
 * text, or the labelled last-known rating while the server has no Google data) it is a plain link to
 * the Google profile. Review texts are never invented.
 */
export function LiveMetarBar() {
  const { language } = useLanguage();
  const copy = REVIEWS_BAR_COPY[language];
  const snapshot = useGoogleReviews();
  const [isOpen, setIsOpen] = useState(false);
  const [originals, setOriginals] = useState<Record<string, boolean>>({});
  const reviewsPanelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reviews = snapshot.reviews.slice(0, 10);
  // The dropdown is a short, scannable list; the full set stays one click away on Google.
  const dropdownReviews = reviews.slice(0, DROPDOWN_REVIEW_LIMIT);
  const formattedCount = new Intl.NumberFormat(localeFor(language)).format(snapshot.totalReviewsCount);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  return (
    <aside
      data-site-utility-bar
      data-utility-language={language}
      aria-label={copy.sectionLabel}
      className="relative z-[60] w-full border-b border-slate-800/80 bg-slate-950 px-3 text-slate-200 sm:px-4"
    >
      {/* One centred cluster (reviews | quick links) that shares the navbar's column, so the top bar
          no longer pins reviews and icons to opposite screen edges on wide desktops. */}
      <div
        data-site-utility-bar-inner
        className="mx-auto flex min-h-11 max-w-7xl flex-wrap items-center justify-center gap-x-2 sm:flex-nowrap sm:justify-between lg:justify-center lg:gap-x-6"
      >
        {/* A phone keeps the rating and the quick links on one centred row and only wraps them when
            the screen is too narrow for both; nothing is ever drawn on top of anything else. */}
        <div className="max-w-full flex-none sm:relative sm:min-w-0 sm:flex-1 lg:flex-none">
          {reviews.length > 0 ? (
            <button
              ref={triggerRef}
              type="button"
              data-google-reviews-trigger
              aria-expanded={isOpen}
              aria-controls={reviewsPanelId}
              onClick={() => setIsOpen((open) => !open)}
              className="flex min-h-11 w-auto min-w-0 items-center justify-center gap-1.5 rounded-lg px-1 text-sm transition-colors hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-inset touch-manipulation sm:w-full sm:gap-2.5 sm:px-2 lg:w-auto"
            >
              <RatingRow snapshot={snapshot} language={language} formattedCount={formattedCount} />
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-sky-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
              <span className="sr-only">
                {isOpen ? copy.close : copy.open}. {copy.rating(snapshot.overallRating.toFixed(1), formattedCount)}
              </span>
            </button>
          ) : (
            <a
              href={snapshot.directReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-google-rating-summary
              data-google-rating-live={snapshot.live ? 'true' : 'false'}
              className="flex min-h-11 w-auto min-w-0 items-center justify-center gap-1.5 rounded-lg px-1 text-sm transition-colors hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-inset touch-manipulation sm:w-full sm:gap-2.5 sm:px-2 lg:w-auto"
            >
              <RatingRow snapshot={snapshot} language={language} formattedCount={formattedCount} />
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden="true" />
              <span className="sr-only">
                {copy.rating(snapshot.overallRating.toFixed(1), formattedCount)}. {copy.unavailable}
              </span>
            </a>
          )}
          {isOpen && reviews.length > 0 ? (
            <section
              id={reviewsPanelId}
              data-google-reviews-panel
              aria-label={copy.heading}
              className="absolute inset-x-0 top-full z-10 border-b border-slate-700 bg-slate-950 shadow-2xl sm:inset-x-auto sm:start-0 sm:w-[min(32rem,calc(100vw-2rem))] sm:rounded-b-2xl sm:border sm:border-t-0"
            >
              <div className="max-h-[min(70svh,34rem)] overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">{copy.heading}</h2>
                    <p className="mt-0.5 text-xs text-slate-400">{copy.rating(snapshot.overallRating.toFixed(1), formattedCount)}</p>
                    <p data-reviews-ordering className="mt-0.5 text-[11px] text-slate-400">{copy.orderingNotice}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      requestAnimationFrame(() => triggerRef.current?.focus());
                    }}
                    aria-label={copy.close}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 touch-manipulation"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <ol className="grid gap-2.5">
                  {dropdownReviews.map((review, index) => {
                    const filledStars = Math.max(0, Math.min(5, Math.round(review.rating)));
                    const showOriginal = Boolean(originals[review.id]);
                    const shown = displayedReviewText(review, showOriginal);
                    return (
                      <li key={review.id}>
                        <article className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-0.5" role="img" aria-label={copy.individualRating(review.rating)}>
                              {Array.from({ length: 5 }, (_, starIndex) => (
                                <Star
                                  key={starIndex}
                                  className={`h-3.5 w-3.5 ${starIndex < filledStars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                                  aria-hidden="true"
                                />
                              ))}
                            </div>
                            <span className="shrink-0 text-[11px] text-slate-400">{copy.review(index + 1, dropdownReviews.length)}</span>
                          </div>
                          <blockquote className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-slate-200" lang={shown.language} dir={reviewDirection(shown.language)}>
                            “{shown.text}”
                          </blockquote>
                          <footer className="mt-2.5 border-t border-slate-800 pt-2.5">
                            <ReviewMeta
                              review={review}
                              language={language}
                              copy={copy}
                              size="sm"
                              showOriginal={showOriginal}
                              onToggleOriginal={() => setOriginals((state) => ({ ...state, [review.id]: !state[review.id] }))}
                            />
                          </footer>
                        </article>
                      </li>
                    );
                  })}
                </ol>

                <a
                  href={snapshot.directReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-sky-300 underline decoration-sky-500/50 underline-offset-4 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <span>{copy.readAll}</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <p className="mt-1 px-2 text-[11px] text-slate-400">
                  {copy.policyNote}{' '}
                  <a href={GOOGLE_REVIEW_POLICY_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-slate-300">
                    {copy.policyLink}
                  </a>
                </p>
              </div>
            </section>
          ) : null}
        </div>

        <span className="hidden h-5 w-px shrink-0 bg-slate-800 lg:block" aria-hidden="true" data-top-bar-divider />

        <div
          className="flex min-h-11 shrink-0 items-center justify-center sm:justify-end"
          data-top-bar-social-links
        >
          {SOCIAL_CHANNELS.map(({ name, href, icon: Icon, iconClassName, hoverClassName }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              data-top-bar-social-link={name.toLowerCase()}
              aria-label={name}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 touch-manipulation ${iconClassName} ${hoverClassName}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </a>
          ))}
          <span className="contents min-[360px]:hidden md:contents">
            <WhatsAppAction placement="utility" />
          </span>
          <LanguageSelector />
        </div>
      </div>

    </aside>
  );
}
