'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, LANGUAGES, LanguageInfo, translations, SupportedLanguage } from './translations';
import {
  DEFAULT_LANGUAGE,
  languageDirection,
  resolveLanguagePreference,
} from './language-preference';

export type { Language, SupportedLanguage };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  t: typeof translations['en'];
  currentLanguageInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export { DEFAULT_LANGUAGE } from './language-preference';

function applyDocumentLanguage(lang: Language) {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = languageDirection(lang);
  document.documentElement.lang = lang;
}

function persistLanguagePreference(language: Language) {
  try {
    localStorage.setItem('simdream_lang', language);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  // A non-sensitive preference cookie lets the server render a returning
  // visitor's chosen language on the first paint. This prevents a translated
  // page from reflowing after hydration while preserving the Hebrew default.
  document.cookie = `simdream_lang=${encodeURIComponent(language)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('simdream_lang');
    } catch {
      // Keep the server-provided language when storage is unavailable.
    }
    const selectedLanguage = resolveLanguagePreference(saved ?? initialLanguage);
    setLanguageState(selectedLanguage);
    applyDocumentLanguage(selectedLanguage);
    persistLanguagePreference(selectedLanguage);
  }, [initialLanguage]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    persistLanguagePreference(lang);
    applyDocumentLanguage(lang);
  };

  const dir = languageDirection(language);
  const isRTL = dir === 'rtl';
  const t = translations[language] || translations.en;
  const currentLanguageInfo =
    LANGUAGES.find((l) => l.code === language) ||
    LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE) ||
    LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        dir,
        isRTL,
        t,
        currentLanguageInfo,
      }}
    >
      <div dir={dir} className={isRTL ? 'font-hebrew' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
