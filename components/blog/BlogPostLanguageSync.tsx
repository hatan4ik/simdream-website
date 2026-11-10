'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage, type Language } from '@/lib/i18n/language-context';
import { isSupportedLanguage } from '@/lib/i18n/language-preference';

interface BlogPostLanguageSyncProps {
  siblingSlugs?: Record<string, string>;
  currentLang?: string;
}

/**
 * Synchronizes the website language state with the current article's language,
 * and navigates to the sibling translated article when the user toggles the language dropdown.
 */
export function BlogPostLanguageSync({
  siblingSlugs = {},
  currentLang = 'he',
}: BlogPostLanguageSyncProps) {
  const router = useRouter();
  const { language, setLanguage, languageResolved } = useLanguage();
  const initialMountRef = useRef(true);

  // 1. When directly loading a post with a distinct language (e.g. English, Russian),
  // sync the site language selector if it differs from the article language.
  useEffect(() => {
    if (!languageResolved) return;

    if (
      currentLang &&
      currentLang !== language &&
      isSupportedLanguage(currentLang)
    ) {
      setLanguage(currentLang as Language);
    }
  }, [currentLang, language, languageResolved, setLanguage]);

  // 2. When the visitor actively toggles the language dropdown in the navbar:
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }

    if (!language || language === currentLang) return;

    const targetSlug = siblingSlugs[language];
    if (targetSlug && targetSlug !== siblingSlugs[currentLang]) {
      router.push(`/post/${encodeURIComponent(targetSlug)}`);
    }
  }, [language, currentLang, siblingSlugs, router]);

  return null;
}
