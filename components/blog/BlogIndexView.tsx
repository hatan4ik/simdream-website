'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Compass, BookOpen, Loader2 } from 'lucide-react';
import {
  BLOG_CATEGORIES,
  getBlogCategoryLabel,
  type BlogPost,
  type BlogCategory,
} from '@/lib/data/blog-categories';
import { useLanguage } from '@/lib/i18n/language-context';
import { BlogCard } from './BlogCard';

interface BlogIndexViewProps {
  initialPosts: readonly BlogPost[];
}

const UI_COPY: Record<
  string,
  {
    featuredBadge: string;
    allArticles: string;
    searchPlaceholder: string;
    noResultsTitle: string;
    noResultsText: string;
    resetSearch: string;
  }
> = {
  he: {
    featuredBadge: 'מאמר מומלץ מהקוקפיט',
    allArticles: 'כל המאמרים',
    searchPlaceholder: 'חיפוש מאמרים ונושאים...',
    noResultsTitle: 'לא נמצאו מאמרים התואמים לחיפוש',
    noResultsText: 'נסו לבחור קטגוריה אחרת או לנקות את שורת החיפוש.',
    resetSearch: 'הצגת כל המאמרים',
  },
  en: {
    featuredBadge: 'Featured Cockpit Dispatch',
    allArticles: 'All Articles',
    searchPlaceholder: 'Search flight articles & briefings...',
    noResultsTitle: 'No articles match your search',
    noResultsText: 'Try choosing another category or clearing the search box.',
    resetSearch: 'Show all articles',
  },
  ru: {
    featuredBadge: 'Рекомендуемая статья из кабины',
    allArticles: 'Все статьи',
    searchPlaceholder: 'Поиск статей и тем...',
    noResultsTitle: 'Статьи по запросу не найдены',
    noResultsText: 'Попробуйте выбрать другую категорию или очистить строку поиска.',
    resetSearch: 'Показать все статьи',
  },
  fr: {
    featuredBadge: 'Article vedette du cockpit',
    allArticles: 'Tous les articles',
    searchPlaceholder: 'Rechercher des articles et sujets...',
    noResultsTitle: 'Aucun article ne correspond à votre recherche',
    noResultsText: 'Essayez de choisir une autre catégorie ou de réinitialiser la recherche.',
    resetSearch: 'Afficher tous les articles',
  },
  es: {
    featuredBadge: 'Artículo destacado de la cabina',
    allArticles: 'Todos los artículos',
    searchPlaceholder: 'Buscar artículos y temas...',
    noResultsTitle: 'No se encontraron artículos que coincidan con la búsqueda',
    noResultsText: 'Intente elegir otra categoría o borrar el cuadro de búsqueda.',
    resetSearch: 'Mostrar todos los artículos',
  },
  ar: {
    featuredBadge: 'مقال مميز من قمرة القيادة',
    allArticles: 'جميع المقالات',
    searchPlaceholder: 'البحث في المقالات والمواضيع...',
    noResultsTitle: 'لم يتم العثور على مقالات مطابقة للبحث',
    noResultsText: 'جرب اختيار فئة أخرى أو مسح شريط البحث.',
    resetSearch: 'عرض جميع المقالات',
  },
};

export function BlogIndexView({ initialPosts }: BlogIndexViewProps) {
  const { language, languageResolved } = useLanguage();
  const [posts, setPosts] = useState<readonly BlogPost[]>(initialPosts);
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(false);

  const lang = language || 'he';
  const isRTL = lang === 'he' || lang === 'ar';
  const copy = UI_COPY[lang] || UI_COPY.en!;

  // When language preference is resolved or toggled, fetch the localized article catalog
  useEffect(() => {
    if (!languageResolved) return;

    let cancelled = false;
    setIsLoadingLanguage(true);

    fetch(`/api/blog?lang=${encodeURIComponent(lang)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data.posts) && data.posts.length > 0) {
          setPosts(data.posts);
        }
      })
      .catch(() => {
        // Fallback remains with currently loaded posts
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLanguage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lang, languageResolved]);

  const featuredPost = posts[0];

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory =
        selectedCategory === 'all' || post.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [posts, selectedCategory, searchQuery]);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-12">
      {/* Featured Spotlight Article */}
      {selectedCategory === 'all' && !searchQuery && featuredPost && (
        <section aria-label={copy.featuredBadge}>
          <div className="flex items-center gap-2 mb-4 text-xs font-mono font-bold text-sky-400 uppercase tracking-widest">
            <Compass className="w-4 h-4" />
            <span>{copy.featuredBadge}</span>
            {isLoadingLanguage && <Loader2 className="w-3.5 h-3.5 animate-spin ms-2 text-slate-500" />}
          </div>
          <BlogCard post={featuredPost} featured />
        </section>
      )}

      {/* Interactive Category & Search Controls */}
      <section
        aria-label="Filter and search blog articles"
        className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-md"
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              {copy.allArticles} ({posts.length})
            </button>
            {BLOG_CATEGORIES.map((cat) => {
              const count = posts.filter((p) => p.category === cat.id).length;
              const active = selectedCategory === cat.id;
              const label = getBlogCategoryLabel(cat.id, lang);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    active
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'bg-slate-950/60 border border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3 pointer-events-none" />
            <input
              type="search"
              placeholder={copy.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-10 pe-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section aria-label="Articles Grid">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-slate-800">
            <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">{copy.noResultsTitle}</h3>
            <p className="text-sm text-slate-400 mb-4">{copy.noResultsText}</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
            >
              {copy.resetSearch}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
