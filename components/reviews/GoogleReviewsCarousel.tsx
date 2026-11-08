'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Star } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language, LocalizedRecord } from '@/lib/i18n/translations';
import { useGoogleReviews } from '@/lib/reviews/use-google-reviews';

interface ReviewCarouselCopy {
  badge: string;
  title: string;
  subtitle: string;
  googleReview: string;
  readAll: string;
  previous: string;
  next: string;
  pause: string;
  resume: string;
  rating: (value: number) => string;
  position: (current: number, total: number) => string;
}

const REVIEW_COPY: LocalizedRecord<ReviewCarouselCopy> = {
  en: {
    badge: 'GOOGLE REVIEWS',
    title: 'Guest feedback from Google',
    subtitle: 'Recent public reviews, loaded from our Google Business Profile.',
    googleReview: 'Google review',
    readAll: 'Read all reviews on Google',
    previous: 'Previous review',
    next: 'Next review',
    pause: 'Pause review carousel',
    resume: 'Resume review carousel',
    rating: (value) => `${value} out of 5 stars`,
    position: (current, total) => `Review ${current} of ${total}`,
  },
  he: {
    badge: 'ביקורות Google',
    title: 'משוב אורחים מ-Google',
    subtitle: 'ביקורות ציבוריות עדכניות, הנטענות מפרופיל העסק שלנו ב-Google.',
    googleReview: 'ביקורת Google',
    readAll: 'לכל הביקורות ב-Google',
    previous: 'לביקורת הקודמת',
    next: 'לביקורת הבאה',
    pause: 'השהיית קרוסלת הביקורות',
    resume: 'חידוש קרוסלת הביקורות',
    rating: (value) => `${value} מתוך 5 כוכבים`,
    position: (current, total) => `ביקורת ${current} מתוך ${total}`,
  },
  ru: {
    badge: 'ОТЗЫВЫ GOOGLE',
    title: 'Отзывы гостей из Google',
    subtitle: 'Актуальные публичные отзывы, загружаемые из профиля компании в Google.',
    googleReview: 'Отзыв Google',
    readAll: 'Все отзывы в Google',
    previous: 'Предыдущий отзыв',
    next: 'Следующий отзыв',
    pause: 'Остановить карусель отзывов',
    resume: 'Продолжить карусель отзывов',
    rating: (value) => `${value} из 5 звёзд`,
    position: (current, total) => `Отзыв ${current} из ${total}`,
  },
  fr: {
    badge: 'AVIS GOOGLE',
    title: 'Les avis de nos visiteurs sur Google',
    subtitle: 'Avis publics récents chargés depuis notre fiche d’établissement Google.',
    googleReview: 'Avis Google',
    readAll: 'Voir tous les avis sur Google',
    previous: 'Avis précédent',
    next: 'Avis suivant',
    pause: 'Mettre en pause le carrousel d’avis',
    resume: 'Reprendre le carrousel d’avis',
    rating: (value) => `${value} sur 5 étoiles`,
    position: (current, total) => `Avis ${current} sur ${total}`,
  },
  ar: {
    badge: 'تقييمات Google',
    title: 'آراء الضيوف من Google',
    subtitle: 'تقييمات عامة حديثة تُحمّل من ملف نشاطنا التجاري على Google.',
    googleReview: 'تقييم Google',
    readAll: 'عرض جميع التقييمات على Google',
    previous: 'التقييم السابق',
    next: 'التقييم التالي',
    pause: 'إيقاف شريط التقييمات مؤقتاً',
    resume: 'استئناف شريط التقييمات',
    rating: (value) => `${value} من 5 نجوم`,
    position: (current, total) => `التقييم ${current} من ${total}`,
  },
  es: {
    badge: 'RESEÑAS DE GOOGLE',
    title: 'Opiniones de visitantes en Google',
    subtitle: 'Reseñas públicas recientes de nuestro perfil de empresa en Google.',
    googleReview: 'Reseña de Google',
    readAll: 'Leer todas las reseñas en Google',
    previous: 'Reseña anterior',
    next: 'Siguiente reseña',
    pause: 'Pausar el carrusel de reseñas',
    resume: 'Reanudar el carrusel de reseñas',
    rating: (value) => `${value} de 5 estrellas`,
    position: (current, total) => `Reseña ${current} de ${total}`,
  },
};

function reviewDirection(language: Language): 'rtl' | 'ltr' {
  return language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Browser-rendered carousel of Google Places data. The browser never receives the
 * Google API key: it fetches our public route, which refreshes from Google server-side.
 * When Google data is unavailable, this component intentionally renders nothing.
 */
export function GoogleReviewsCarousel() {
  const { language, isRTL } = useLanguage();
  const copy = REVIEW_COPY[language] || REVIEW_COPY.en;
  const snapshot = useGoogleReviews();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!snapshot || snapshot.reviews.length < 2 || isPaused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % snapshot.reviews.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [isPaused, snapshot]);

  // The carousel shows review texts only; a rating without texts is the utility bar's job.
  if (snapshot.reviews.length === 0) return null;

  const reviews = snapshot.reviews;
  const activeReview = reviews[activeIndex] || reviews[0];
  const stars = Math.max(0, Math.min(5, Math.round(activeReview.rating)));
  const setPrevious = () => setActiveIndex((index) => (index - 1 + reviews.length) % reviews.length);
  const setNext = () => setActiveIndex((index) => (index + 1) % reviews.length);

  return (
    <section className="border-y border-slate-800 bg-slate-950 px-4 py-14 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div className="space-y-4 text-center lg:text-left rtl:lg:text-right">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">{copy.badge}</p>
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{copy.title}</h2>
          <p className="text-sm leading-relaxed text-slate-300 sm:text-base">{copy.subtitle}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start rtl:lg:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-sm font-bold text-amber-200">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span>{snapshot.overallRating.toFixed(1)}</span>
              <span className="text-amber-100/80">({snapshot.totalReviewsCount})</span>
            </span>
            <a
              href={snapshot.directReviewsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-sky-300 underline decoration-sky-500/50 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              {copy.readAll}
            </a>
          </div>
        </div>

        <figure
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl sm:p-7"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1" aria-label={copy.rating(activeReview.rating)}>
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  className={`h-4 w-4 ${index < stars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="text-xs font-mono text-slate-400">{copy.googleReview}</span>
          </div>

          <blockquote className="mt-5 text-lg font-medium leading-relaxed text-white sm:text-xl" lang={activeReview.language} dir={reviewDirection(activeReview.language)}>
            “{activeReview.quote}”
          </blockquote>

          <figcaption className="mt-6 flex items-center justify-between gap-4 border-t border-slate-800 pt-4">
            <div>
              <p className="font-semibold text-slate-100" lang={activeReview.language} dir={reviewDirection(activeReview.language)}>
                {activeReview.author}
              </p>
              {activeReview.relativeTime ? (
                <p className="mt-0.5 text-xs text-slate-400" lang={activeReview.language} dir={reviewDirection(activeReview.language)}>
                  {activeReview.relativeTime}
                </p>
              ) : null}
            </div>
            <span className="text-xs font-mono text-slate-400">{copy.position(activeIndex + 1, reviews.length)}</span>
          </figcaption>

          {reviews.length > 1 ? (
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={setPrevious}
                  aria-label={copy.previous}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-200 hover:border-sky-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <ChevronLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={setNext}
                  aria-label={copy.next}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-200 hover:border-sky-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <ChevronRight className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsPaused((paused) => !paused)}
                aria-label={isPaused ? copy.resume : copy.pause}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-200 hover:border-sky-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                {isPaused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          ) : null}
        </figure>
      </div>
    </section>
  );
}
