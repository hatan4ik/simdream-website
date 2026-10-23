'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, LANGUAGES, LanguageInfo, translations } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  t: typeof translations['en'];
  currentLanguageInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('simdream_lang') as Language;
    if (saved && ['en', 'he', 'ru', 'fr', 'ar'].includes(saved)) {
      setLanguageState(saved);
      applyDirection(saved);
    }
  }, []);

  const applyDirection = (lang: Language) => {
    const isRightToLeft = lang === 'he' || lang === 'ar';
    const direction = isRightToLeft ? 'rtl' : 'ltr';
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction;
      document.documentElement.lang = lang;
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('simdream_lang', lang);
    applyDirection(lang);
  };

  const isRTL = language === 'he' || language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const t = translations[language] || translations.en;
  const currentLanguageInfo =
    LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

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

