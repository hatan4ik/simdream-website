'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  MapPin,
  Pause,
  Play,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/i18n/language-context';

import { FACILITY_INFO } from '@/lib/config/facility-info';
import { getSortedGoogleReviews, GoogleReview } from '@/lib/data/google-reviews-data';

export const GOOGLE_MAPS_REVIEW_URL = FACILITY_INFO.googleReviewsDirectUrl;

interface ReviewItem {
  quote: string;
  author: string;
  role: string;
  highlightPill?: string;
  relativeTime?: string;
}

interface GoogleReviewsRotatorProps {
  badge: string;
  title: string;
  subtitle: string;
  items?: ReviewItem[];
}

const AVATAR_GRADIENTS = [
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
];

const RELATIVE_DATES: Record<string, string[]> = {
  en: ['1 week ago', '2 weeks ago', '3 weeks ago', '1 month ago', '1 month ago', '2 months ago', '2 months ago', '3 months ago', '3 months ago'],
  he: ['לפני שבוע', 'לפני שבועיים', 'לפני 3 שבועות', 'לפני חודש', 'לפני חודש', 'לפני חודשיים', 'לפני חודשיים', 'לפני 3 חודשים', 'לפני 3 חודשים'],
  ru: ['1 неделю назад', '2 недели назад', '3 недели назад', '1 месяц назад', '1 месяц назад', '2 месяца назад', '2 месяца назад', '3 месяца назад', '3 месяца назад'],
  fr: ['Il y a 1 semaine', 'Il y a 2 semaines', 'Il y a 3 semaines', 'Il y a 1 mois', 'Il y a 1 mois', 'Il y a 2 mois', 'Il y a 2 mois', 'Il y a 3 mois', 'Il y a 3 mois'],
  ar: ['قبل أسبوع', 'قبل أسبوعين', 'قبل 3 أسابيع', 'قبل شهر', 'قبل شهر', 'قبل شهرين', 'قبل شهرين', 'قبل 3 أشهر', 'قبل 3 أشهر'],
};

const UI_LABELS: Record<
  string,
  {
    viewOnGoogle: string;
    googleRatingLabel: string;
    locationLabel: string;
    prevSlide: string;
    nextSlide: string;
    pauseRotation: string;
    resumeRotation: string;
    slideGroupLabel: string;
    longestReviewBadge: string;
  }
> = {
  en: {
    viewOnGoogle: 'Read All 390+ Verified Reviews on Google Maps ↗',
    googleRatingLabel: '5.0 out of 5 Stars based on 390+ Google Reviews',
    locationLabel: 'SimDream Boeing 737 MAX • Gershon Shatz St 36, Tel Aviv-Yafo',
    prevSlide: 'Show previous Google reviews',
    nextSlide: 'Show next Google reviews',
    pauseRotation: 'Pause review rotation',
    resumeRotation: 'Resume automatic review rotation',
    slideGroupLabel: 'Show review set',
    longestReviewBadge: 'In-Depth Verified Review',
  },
  he: {
    viewOnGoogle: 'קראו את כל 390+ הביקורות המאומתות ב-Google Maps ↗',
    googleRatingLabel: 'דירוג 5.0 כוכבים מושלם מתוך 5 מבוסס על +390 ביקורות Google',
    locationLabel: 'SimDream בואינג 737 MAX • גרשון ש"ץ 36, תל אביב-יפו',
    prevSlide: 'הצג ביקורות קודמות',
    nextSlide: 'הצג ביקורות הבאות',
    pauseRotation: 'השהה החלפת ביקורות אוטומטית',
    resumeRotation: 'חדש החלפת ביקורות אוטומטית',
    slideGroupLabel: 'הצג קבוצת ביקורות',
    longestReviewBadge: 'ביקורת מעמיקה מאומתת',
  },
  ru: {
    viewOnGoogle: 'Читать все 390+ отзывов в Google Maps ↗',
    googleRatingLabel: 'Рейтинг 5.0 из 5 звезд на основе 390+ отзывов Google',
    locationLabel: 'SimDream Boeing 737 MAX • Гершон Шац 36, Тель-Авив',
    prevSlide: 'Предыдущие отзывы Google',
    nextSlide: 'Следующие отзывы Google',
    pauseRotation: 'Приостановить ротацию отзывов',
    resumeRotation: 'Возобновить ротацию отзывов',
    slideGroupLabel: 'Показать группу отзывов',
    longestReviewBadge: 'Подробный отзыв',
  },
  fr: {
    viewOnGoogle: 'Consulter les 390+ avis vérifiés sur Google Maps ↗',
    googleRatingLabel: '5.0 étoiles sur 5 basé sur plus de 390 avis Google',
    locationLabel: 'SimDream Boeing 737 MAX • 36 rue Gershon Shatz, Tel Aviv',
    prevSlide: 'Afficher les avis Google précédents',
    nextSlide: 'Afficher les avis Google suivants',
    pauseRotation: 'Mettre en pause la rotation des avis',
    resumeRotation: 'Reprendre la rotation automatique des avis',
    slideGroupLabel: 'Afficher le groupe d’avis',
    longestReviewBadge: 'Avis détaillé vérifié',
  },
  ar: {
    viewOnGoogle: 'قراءة جميع التقييمات (+390) الموثقة على خرائط Google ↗',
    googleRatingLabel: 'تقييم 5.0 من 5 نجوم بناءً على أكثر من 390 مراجعة Google',
    locationLabel: 'SimDream بوينغ 737 ماكس • شارع غيرشون شاتس 36، تل أبيب',
    prevSlide: 'عرض تقييمات Google السابقة',
    nextSlide: 'عرض تقييمات Google التالية',
    pauseRotation: 'إيقاف التدوير التلقائي للتقييمات',
    resumeRotation: 'استئناف التدوير التلقائي للتقييمات',
    slideGroupLabel: 'عرض مجموعة التقييمات',
    longestReviewBadge: 'مراجعة مفصلة موثقة',
  },
};

export function GoogleReviewsRotator({
  badge,
  title,
  subtitle,
  items,
}: GoogleReviewsRotatorProps) {
  const { language, isRTL } = useLanguage();
  const labels = UI_LABELS[language] || UI_LABELS.en;
  const dates = RELATIVE_DATES[language] || RELATIVE_DATES.en;

  // Use passed items if provided and non-empty, otherwise use local cached verified reviews
  // ALWAYS SORT DESCENDING BY LENGTH: Longest, most detailed reviews appear first!
  const sortedItems: ReviewItem[] = React.useMemo(() => {
    const rawList = items && items.length > 0 ? items : getSortedGoogleReviews(language);
    return [...rawList].sort((a, b) => b.quote.length - a.quote.length);
  }, [items, language]);

  const cardsPerPage = 3;
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / cardsPerPage));

  const [activePage, setActivePage] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  // Rotation remounts the cards, so it must pause while keyboard focus is inside the carousel.
  const [hasFocusWithin, setHasFocusWithin] = useState<boolean>(false);

  const nextPage = useCallback(() => {
    setActivePage((prev) => (prev + 1) % totalPages);
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setActivePage((prev) => (prev - 1 + totalPages) % totalPages);
  }, [totalPages]);

  // Auto-rotate every 6 seconds unless paused, hovered, or reduced-motion enabled
  useEffect(() => {
    if (isPaused || isHovering || hasFocusWithin || totalPages <= 1) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const timer = setInterval(() => {
      nextPage();
    }, 7000);

    return () => clearInterval(timer);
  }, [isPaused, isHovering, hasFocusWithin, totalPages, nextPage]);

  const visibleItems = sortedItems.slice(
    activePage * cardsPerPage,
    activePage * cardsPerPage + cardsPerPage
  );

  return (
    <section
      className="py-24 px-4 sm:px-6 lg:px-8 bg-aviation-darkest relative overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocus={() => setHasFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHasFocusWithin(false);
      }}
    >
      <div className="max-w-7xl mx-auto space-y-12">
        {/* SECTION HEADER + GOOGLE MAPS LIVE VERIFICATION BANNER */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <Badge variant="emerald">{badge}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {title}
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Official Google Maps Rating Summary Pill & Direct Link */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
            <div className="flex items-center gap-3.5">
              {/* Google "G" Emblem */}
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-md shrink-0">
                <svg
                  aria-hidden="true"
                  className="w-7 h-7"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-white">5.0</span>
                  <div className="flex text-amber-400 gap-0.5" aria-hidden="true">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    (390+)
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin aria-hidden="true" className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>{labels.locationLabel}</span>
                </p>
              </div>
            </div>

            <a
              href={GOOGLE_MAPS_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-mono font-bold transition-all shrink-0"
            >
              <span>{labels.viewOnGoogle}</span>
              <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* ROTATING 3-CARD REVIEW GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visibleItems.map((item, idx) => {
            const globalIdx = activePage * cardsPerPage + idx;
            const gradient = AVATAR_GRADIENTS[globalIdx % AVATAR_GRADIENTS.length];
            const relativeDate = dates[globalIdx % dates.length];
            const initials = item.author
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <Card
                key={`${activePage}-${idx}-${item.author}`}
                glow
                borderAccent="sky"
                className="flex flex-col justify-between space-y-5 transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Reviewer Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0`}
                        aria-hidden="true"
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-white text-sm">{item.author}</p>
                          <CheckCircle2
                            aria-hidden="true"
                            className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                          />
                        </div>
                        <p className="text-[11px] font-mono text-slate-400">{item.role}</p>
                      </div>
                    </div>

                    {/* Small Google Maps link icon */}
                    <a
                      href={GOOGLE_MAPS_REVIEW_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={labels.viewOnGoogle}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/40 text-slate-400 hover:text-sky-300 transition-colors"
                    >
                      <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* 5 Stars + Relative Timestamp */}
                  <div className="flex items-center justify-between">
                    <div className="flex text-amber-400 gap-1" aria-hidden="true">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {item.relativeTime || relativeDate}
                    </span>
                  </div>

                  {item.highlightPill && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px] font-mono font-semibold text-amber-300">
                      <span>★ {item.highlightPill}</span>
                    </div>
                  )}

                  {/* Review Quote */}
                  <blockquote className="text-sm text-slate-200 leading-relaxed">
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>
                </div>

                {/* Verified Google Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-emerald-400 font-semibold">
                    ✓ Google Maps Verified
                  </span>
                  <span>Boeing 737 MAX • TLV</span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* CAROUSEL ROTATION CONTROLS & PROGRESS INDICATORS */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Page Dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, pageIdx) => {
              const isCurrent = pageIdx === activePage;
              return (
                // 24x24 hit area around the small visual dot (WCAG 2.5.8 target size).
                <button
                  key={pageIdx}
                  type="button"
                  onClick={() => setActivePage(pageIdx)}
                  aria-label={`${labels.slideGroupLabel} ${pageIdx + 1} / ${totalPages}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  className="group inline-flex h-6 min-w-6 items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 rounded-full transition-all ${
                      isCurrent ? 'w-8 bg-sky-400' : 'w-2.5 bg-slate-800 group-hover:bg-slate-700'
                    }`}
                  />
                </button>
              );
            })}
            <span className="text-xs font-mono text-slate-400 ml-2">
              {activePage * cardsPerPage + 1}–
              {Math.min((activePage + 1) * cardsPerPage, sortedItems.length)} / {sortedItems.length}
            </span>
          </div>

          {/* Pause / Prev / Next Controls */}
          <div className="flex items-center gap-2">
            {/* The visible, localized action is the accessible name (WCAG 2.5.3 label in name). */}
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              {isPaused ? (
                <>
                  <Play aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{labels.resumeRotation}</span>
                </>
              ) : (
                <>
                  <Pause aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" />
                  <span>{labels.pauseRotation}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={prevPage}
              aria-label={labels.prevSlide}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-sky-500/50 text-slate-200 transition-colors"
            >
              <ChevronLeft
                aria-hidden="true"
                className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={nextPage}
              aria-label={labels.nextSlide}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-sky-500/50 text-slate-200 transition-colors"
            >
              <ChevronRight
                aria-hidden="true"
                className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
