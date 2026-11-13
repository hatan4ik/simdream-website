'use client';

import { usePathname } from 'next/navigation';
import {
  PRIMARY_WIX_LANGUAGE,
  languageFromLocalePathname,
  localizeInternalHref,
} from '@/lib/i18n/locale-routing';

/**
 * Keeps client-side navigation inside the locale the visitor explicitly selected.
 * The path is the source of truth: it wins over a stale local preference during hydration.
 */
export function useLocalizedInternalHref(): (href: string) => string {
  const pathname = usePathname();
  const language = languageFromLocalePathname(pathname ?? '/') ?? PRIMARY_WIX_LANGUAGE;

  return (href: string) => localizeInternalHref(href, language);
}
