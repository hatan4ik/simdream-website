'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { initialBlogLanguageSyncState, nextBlogLanguageStep } from '@/lib/blog/language-sync';
import { useLanguage, type Language } from '@/lib/i18n/language-context';
import { isSupportedLanguage } from '@/lib/i18n/language-preference';

interface BlogPostLanguageSyncProps {
  siblingSlugs?: Record<string, string>;
  siblingPaths?: Record<string, string>;
  currentLang?: string;
}

/**
 * Synchronizes the website language state with the current article's language,
 * and navigates to the sibling translated article when the user toggles the language dropdown.
 * The decisions live in `lib/blog/language-sync.ts`: a stale site language right after the article
 * corrected it must never be mistaken for a menu choice, or the page bounces between translations.
 */
export function BlogPostLanguageSync({
  siblingSlugs = {},
  siblingPaths = {},
  currentLang = 'he',
}: BlogPostLanguageSyncProps) {
  const router = useRouter();
  const { language, setLanguage, languageResolved } = useLanguage();
  const stateRef = useRef(initialBlogLanguageSyncState());

  useEffect(() => {
    if (!languageResolved || !language) return;

    const step = nextBlogLanguageStep({ articleLanguage: currentLang, language, supported: isSupportedLanguage }, stateRef.current);
    stateRef.current = step.state;

    if (step.action === 'set-language') {
      setLanguage(step.language as Language);
      return;
    }
    if (step.action !== 'navigate') return;

    const targetPath = siblingPaths[step.language];
    if (targetPath && targetPath !== siblingPaths[currentLang]) {
      router.push(targetPath);
      return;
    }
    const targetSlug = siblingSlugs[step.language];
    if (targetSlug && targetSlug !== siblingSlugs[currentLang]) {
      router.push(`/post/${encodeURIComponent(targetSlug)}`);
    }
  }, [language, currentLang, languageResolved, setLanguage, siblingSlugs, siblingPaths, router]);

  return null;
}
