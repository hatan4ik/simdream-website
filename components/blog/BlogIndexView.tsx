'use client';

import React, { useState, useMemo } from 'react';
import { Search, Compass, BookOpen, Filter } from 'lucide-react';
import { BLOG_CATEGORIES, type BlogPost, type BlogCategory } from '@/lib/data/blog-posts';
import { BlogCard } from './BlogCard';

interface BlogIndexViewProps {
  initialPosts: readonly BlogPost[];
}

export function BlogIndexView({ initialPosts }: BlogIndexViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const featuredPost = initialPosts[0];

  const filteredPosts = useMemo(() => {
    return initialPosts.filter((post) => {
      const matchesCategory =
        selectedCategory === 'all' || post.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [initialPosts, selectedCategory, searchQuery]);

  return (
    <div className="space-y-12">
      {/* Featured Spotlight Article (only when no active filter/search) */}
      {selectedCategory === 'all' && !searchQuery && featuredPost && (
        <section aria-label="מאמר מומלץ">
          <div className="flex items-center gap-2 mb-4 text-xs font-mono font-bold text-sky-400 uppercase tracking-widest">
            <Compass className="w-4 h-4" />
            <span>מאמר מומלץ מהקוקפיט</span>
          </div>
          <BlogCard post={featuredPost} featured />
        </section>
      )}

      {/* Interactive Category & Search Controls */}
      <section
        aria-label="סינון וחיפוש מאמרים"
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
              כל המאמרים ({initialPosts.length})
            </button>
            {BLOG_CATEGORIES.map((cat) => {
              const count = initialPosts.filter((p) => p.category === cat.id).length;
              const active = selectedCategory === cat.id;
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
                  {cat.labelHe} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3 pointer-events-none" />
            <input
              type="search"
              placeholder="חיפוש מאמרים ונושאים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-10 pe-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section aria-label="רשימת מאמרים">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-slate-800">
            <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">לא נמצאו מאמרים התואמים לחיפוש</h3>
            <p className="text-sm text-slate-400 mb-4">נסו לבחור קטגוריה אחרת או לנקות את שורת החיפוש.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
            >
              הצגת כל המאמרים
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

