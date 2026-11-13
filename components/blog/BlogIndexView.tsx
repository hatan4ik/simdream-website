'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Compass, BookOpen, Loader2 } from 'lucide-react';
import {
  BLOG_CATEGORIES,
  getBlogCategoryLabel,
  type BlogPost,
  type BlogCategory,
} from '@/lib/data/blog-categories';
import { useLanguage, type Language } from '@/lib/i18n/language-context';
import { BlogCard } from './BlogCard';

interface BlogIndexViewProps {
  initialPosts: readonly BlogPost[];
}

const UI_COPY: Record<
  Language,
  {
    heroBadge: string;
    heroTitle: string;
    heroSubtitle: string;
    featuredBadge: string;
    allArticles: string;
    searchPlaceholder: string;
    noResultsTitle: string;
    noResultsText: string;
    resetSearch: string;
  }
> = {
  he: {
    heroBadge: 'יומן הטיסה של סים דרים · FLIGHT DECK JOURNAL',
    heroTitle: 'מאמרים, מדריכים ותובנות מתא הטייס',
    heroSubtitle:
      'ידע תעופתי אמיתי, הסברים על מערכות בואינג 737, מדריכי גישות ונחיתות מאתגרות בעולם, והכנה מעשית למיוני חברות תעופה – היישר מהקברניטים של Sim Dream.',
    featuredBadge: 'מאמר מומלץ מהקוקפיט',
    allArticles: 'כל המאמרים',
    searchPlaceholder: 'חיפוש מאמרים ונושאים...',
    noResultsTitle: 'לא נמצאו מאמרים התואמים לחיפוש',
    noResultsText: 'נסו לבחור קטגוריה אחרת או לנקות את שורת החיפוש.',
    resetSearch: 'הצגת כל המאמרים',
  },
  en: {
    heroBadge: 'SIM DREAM FLIGHT DECK JOURNAL',
    heroTitle: 'Articles, Guides & Cockpit Insights',
    heroSubtitle:
      'Authentic aviation knowledge, Boeing 737 systems briefings, challenging global approach and landing guides, and practical airline assessment prep — straight from the Sim Dream captains.',
    featuredBadge: 'Featured Cockpit Dispatch',
    allArticles: 'All Articles',
    searchPlaceholder: 'Search flight articles & briefings...',
    noResultsTitle: 'No articles match your search',
    noResultsText: 'Try choosing another category or clearing the search box.',
    resetSearch: 'Show all articles',
  },
  ru: {
    heroBadge: 'БОРТОВОЙ ЖУРНАЛ SIM DREAM · FLIGHT DECK JOURNAL',
    heroTitle: 'Статьи, руководства и заметки из кабины',
    heroSubtitle:
      'Подлинные авиационные знания, разбор систем Boeing 737, гиды по сложным заходам и посадкам в аэропортах мира и практическая подготовка к отборам в авиакомпании — напрямую от командиров Sim Dream.',
    featuredBadge: 'Рекомендуемая статья из кабины',
    allArticles: 'Все статьи',
    searchPlaceholder: 'Поиск статей и тем...',
    noResultsTitle: 'Статьи по запросу не найдены',
    noResultsText: 'Попробуйте выбрать другую категорию или очистить строку поиска.',
    resetSearch: 'Показать все статьи',
  },
  fr: {
    heroBadge: 'JOURNAL DE BORD SIM DREAM · FLIGHT DECK JOURNAL',
    heroTitle: 'Articles, guides et retours du cockpit',
    heroSubtitle:
      'Connaissances aéronautiques authentiques, explications sur les systèmes du Boeing 737, guides d’approches et d’atterrissages exigeants dans le monde entier et préparation pratique aux sélections des compagnies — directement par les commandants de bord de Sim Dream.',
    featuredBadge: 'Article vedette du cockpit',
    allArticles: 'Tous les articles',
    searchPlaceholder: 'Rechercher des articles et sujets...',
    noResultsTitle: 'Aucun article ne correspond à votre recherche',
    noResultsText: 'Essayez de choisir une autre catégorie ou de réinitialiser la recherche.',
    resetSearch: 'Afficher tous les articles',
  },
  es: {
    heroBadge: 'DIARIO DE VUELO DE SIM DREAM · FLIGHT DECK JOURNAL',
    heroTitle: 'Artículos, guías e ideas desde la cabina',
    heroSubtitle:
      'Conocimiento aeronáutico real, explicaciones sobre los sistemas del Boeing 737, guías de aproximaciones y aterrizajes desafiantes en todo el mundo y preparación práctica para selecciones de aerolíneas — directamente de los comandantes de Sim Dream.',
    featuredBadge: 'Artículo destacado de la cabina',
    allArticles: 'Todos los artículos',
    searchPlaceholder: 'Buscar artículos y temas...',
    noResultsTitle: 'No se encontraron artículos que coincidan con la búsqueda',
    noResultsText: 'Intente elegir otra categoría o borrar el cuadro de búsqueda.',
    resetSearch: 'Mostrar todos los artículos',
  },
  ar: {
    heroBadge: 'سجل رحلات سيم دريم · FLIGHT DECK JOURNAL',
    heroTitle: 'مقالات وأدلة ورؤى من قمرة القيادة',
    heroSubtitle:
      'معرفة طيران حقيقية، شروحات لأنظمة بوينغ 737، أدلة الاقتراب والهبوط في أصعب مطارات العالم، وإعداد عملي لمقابلات شركات الطيران — مباشرة من قباطنة Sim Dream.',
    featuredBadge: 'مقال مميز من قمرة القيادة',
    allArticles: 'جميع المقالات',
    searchPlaceholder: 'البحث في المقالات والمواضيع...',
    noResultsTitle: 'لم يتم العثور على مقالات مطابقة للبحث',
    noResultsText: 'جرب اختيار فئة أخرى أو مسح شريط البحث.',
    resetSearch: 'عرض جميع المقالات',
  },
  de: {
    heroBadge: 'SIM DREAM COCKPIT-JOURNAL · FLIGHT DECK JOURNAL',
    heroTitle: 'Artikel, Leitfäden & Einblicke aus dem Cockpit',
    heroSubtitle:
      'Fundiertes Luftfahrtwissen, Erklärungen zu Boeing 737 Systemen, Guides für anspruchsvolle Anflüge und Landungen weltweit sowie praxisnahe Vorbereitung auf Airline-Assessments – direkt von den Sim Dream Kapitänen.',
    featuredBadge: 'Empfohlener Cockpit-Beitrag',
    allArticles: 'Alle Artikel',
    searchPlaceholder: 'Artikel & Themen durchsuchen...',
    noResultsTitle: 'Keine Artikel zu Ihrer Suche gefunden',
    noResultsText: 'Wählen Sie eine andere Kategorie oder leeren Sie das Suchfeld.',
    resetSearch: 'Alle Artikel anzeigen',
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

    fetch(`/api/blog?language=${encodeURIComponent(lang)}`)
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
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Hero */}
      <header className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono uppercase tracking-widest mb-4">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{copy.heroBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          {copy.heroTitle}
        </h1>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
          {copy.heroSubtitle}
        </p>
      </header>

      {/* Interactive Blog Catalog */}
      <main className="space-y-12">
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
      </main>
    </div>
  );
}
