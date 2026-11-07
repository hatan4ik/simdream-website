'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, Star, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language } from '@/lib/i18n/translations';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { useGoogleReviews } from '@/lib/reviews/use-google-reviews';
import { LanguageSelector } from './LanguageSelector';
import { SOCIAL_CHANNELS } from './social-channels';
import { WhatsAppAction } from './WhatsAppAction';

interface ReviewsBarCopy {
  sectionLabel: string;
  open: string;
  close: string;
  heading: string;
  readAll: string;
  unavailable: string;
  rating: (rating: string, count: string) => string;
  individualRating: (rating: number) => string;
  review: (current: number, total: number) => string;
}

const REVIEWS_BAR_COPY: Record<Language, ReviewsBarCopy> = {
  en: {
    sectionLabel: 'Google reviews and quick links',
    open: 'Show recent Google reviews',
    close: 'Close Google reviews',
    heading: 'Recent Google reviews',
    readAll: 'Read all reviews on Google',
    unavailable: 'Open Sim Dream reviews on Google',
    rating: (rating, count) => `${rating} stars from ${count} Google reviews`,
    individualRating: (rating) => `${rating} out of 5 stars`,
    review: (current, total) => `Review ${current} of ${total}`,
  },
  he: {
    sectionLabel: 'ביקורות Google וקישורים מהירים',
    open: 'הצגת ביקורות Google עדכניות',
    close: 'סגירת ביקורות Google',
    heading: 'ביקורות Google עדכניות',
    readAll: 'לכל הביקורות ב-Google',
    unavailable: 'לצפייה בביקורות Sim Dream ב-Google',
    rating: (rating, count) => `${rating} כוכבים מתוך ${count} ביקורות Google`,
    individualRating: (rating) => `${rating} מתוך 5 כוכבים`,
    review: (current, total) => `ביקורת ${current} מתוך ${total}`,
  },
  ru: {
    sectionLabel: 'Отзывы Google и быстрые ссылки',
    open: 'Показать свежие отзывы Google',
    close: 'Закрыть отзывы Google',
    heading: 'Свежие отзывы Google',
    readAll: 'Все отзывы в Google',
    unavailable: 'Открыть отзывы Sim Dream в Google',
    rating: (rating, count) => `${rating} звезды: ${count} отзывов Google`,
    individualRating: (rating) => `${rating} из 5 звёзд`,
    review: (current, total) => `Отзыв ${current} из ${total}`,
  },
  fr: {
    sectionLabel: 'Avis Google et liens rapides',
    open: 'Afficher les avis Google récents',
    close: 'Fermer les avis Google',
    heading: 'Avis Google récents',
    readAll: 'Voir tous les avis sur Google',
    unavailable: 'Ouvrir les avis Sim Dream sur Google',
    rating: (rating, count) => `${rating} étoiles sur ${count} avis Google`,
    individualRating: (rating) => `${rating} sur 5 étoiles`,
    review: (current, total) => `Avis ${current} sur ${total}`,
  },
  ar: {
    sectionLabel: 'تقييمات Google وروابط سريعة',
    open: 'عرض أحدث تقييمات Google',
    close: 'إغلاق تقييمات Google',
    heading: 'أحدث تقييمات Google',
    readAll: 'عرض جميع التقييمات على Google',
    unavailable: 'فتح تقييمات Sim Dream على Google',
    rating: (rating, count) => `${rating} نجوم من ${count} تقييمات Google`,
    individualRating: (rating) => `${rating} من 5 نجوم`,
    review: (current, total) => `التقييم ${current} من ${total}`,
  },
  es: {
    sectionLabel: 'Reseñas de Google y enlaces rápidos',
    open: 'Mostrar reseñas recientes de Google',
    close: 'Cerrar reseñas de Google',
    heading: 'Reseñas recientes de Google',
    readAll: 'Leer todas las reseñas en Google',
    unavailable: 'Abrir reseñas de Sim Dream en Google',
    rating: (rating, count) => `${rating} estrellas de ${count} reseñas de Google`,
    individualRating: (rating) => `${rating} de 5 estrellas`,
    review: (current, total) => `Reseña ${current} de ${total}`,
  },
};

function reviewDirection(language: Language): 'rtl' | 'ltr' {
  return language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
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
    } satisfies Record<Language, string>
  )[language];
}

/**
 * Persistent site utility bar. It deliberately carries only independently
 * verified Google review data; when the backend lacks Google credentials, the
 * control links to the public Google profile rather than inventing a rating.
 */
export function LiveMetarBar() {
  const { language } = useLanguage();
  const copy = REVIEWS_BAR_COPY[language];
  const snapshot = useGoogleReviews();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const reviewsPanelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reviews = snapshot?.reviews.slice(0, 10) ?? [];
  const activeReview = reviews[activeIndex] ?? reviews[0];
  const formattedCount = snapshot
    ? new Intl.NumberFormat(localeFor(language)).format(snapshot.totalReviewsCount)
    : '';

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(reviews.length - 1, 0)));
  }, [reviews.length]);

  useEffect(() => {
    if (reviews.length < 2 || isOpen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % reviews.length);
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [isOpen, reviews.length]);

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
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          {snapshot && activeReview ? (
            <button
              ref={triggerRef}
              type="button"
              data-google-reviews-trigger
              aria-expanded={isOpen}
              aria-controls={reviewsPanelId}
              aria-label={isOpen ? copy.close : copy.open}
              onClick={() => setIsOpen((open) => !open)}
              className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg text-left text-xs transition-colors hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-inset touch-manipulation rtl:text-right"
            >
              <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    className={`h-3.5 w-3.5 ${index < Math.round(snapshot.overallRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                  />
                ))}
              </span>
              <span className="shrink-0 font-semibold text-white" translate="no">Google</span>
              <span className="shrink-0 font-semibold text-amber-200">{snapshot.overallRating.toFixed(1)}</span>
              <span className="shrink-0 text-slate-400">({formattedCount})</span>
              <span className="min-w-0 truncate text-slate-400" aria-hidden="true">
                “{activeReview.quote}”
              </span>
              <ChevronDown
                className={`ms-auto h-4 w-4 shrink-0 text-sky-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
              <span className="sr-only" aria-live="polite">
                {copy.rating(snapshot.overallRating.toFixed(1), formattedCount)}
              </span>
            </button>
          ) : (
            <a
              href={FACILITY_INFO.googleReviewsDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.unavailable}
              className="flex min-h-11 items-center gap-2 rounded-lg text-xs font-semibold text-sky-300 transition-colors hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-inset touch-manipulation"
            >
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span translate="no">Google</span>
              <span className="text-slate-300">{copy.heading}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>

        <div className="flex min-h-11 shrink-0 items-center justify-end" data-top-bar-social-links>
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
          <WhatsAppAction />
          <LanguageSelector />
        </div>
      </div>

      {snapshot && isOpen ? (
        <section
          id={reviewsPanelId}
          data-google-reviews-panel
          aria-label={copy.heading}
          className="absolute inset-x-0 top-full border-b border-slate-700 bg-slate-950/98 shadow-2xl backdrop-blur"
        >
          <div className="mx-auto max-h-[min(75svh,42rem)] max-w-7xl overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 sm:py-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">{copy.heading}</h2>
                <p className="mt-0.5 text-xs text-slate-400">{copy.rating(snapshot.overallRating.toFixed(1), formattedCount)}</p>
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

            <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {reviews.map((review, index) => {
                const filledStars = Math.max(0, Math.min(5, Math.round(review.rating)));
                return (
                  <li key={review.id}>
                    <article className="h-full rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-0.5" aria-label={copy.individualRating(review.rating)}>
                          {Array.from({ length: 5 }, (_, starIndex) => (
                            <Star
                              key={starIndex}
                              className={`h-3.5 w-3.5 ${starIndex < filledStars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                        <span className="shrink-0 text-[11px] text-slate-500">{copy.review(index + 1, reviews.length)}</span>
                      </div>
                      <blockquote className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-200" lang={review.language} dir={reviewDirection(review.language)}>
                        “{review.quote}”
                      </blockquote>
                      <footer className="mt-3 border-t border-slate-800 pt-3">
                        <p className="text-xs font-semibold text-white" lang={review.language} dir={reviewDirection(review.language)}>{review.author}</p>
                        {review.relativeTime ? (
                          <p className="mt-0.5 text-[11px] text-slate-400" lang={review.language} dir={reviewDirection(review.language)}>{review.relativeTime}</p>
                        ) : null}
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
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-sky-300 underline decoration-sky-500/50 underline-offset-4 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <span>{copy.readAll}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
