'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { LANGUAGES, Language } from '@/lib/i18n/translations';

export function LanguageSelector({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const { language, setLanguage, currentLanguageInfo } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-200 font-mono transition-colors shadow-sm"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {/* The visible code plus the native language name form the accessible name (WCAG 2.5.3). */}
        <span className="text-sm leading-none" aria-hidden="true">{currentLanguageInfo.flag}</span>
        <span className="font-bold uppercase">{currentLanguageInfo.code}</span>
        <span className="sr-only">{currentLanguageInfo.nativeName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-44 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl py-1.5 z-50 text-xs font-mono">
          <div className="px-3 py-1.5 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
            Select Language
          </div>

          <div className="py-1">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as Language);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left rtl:text-right hover:bg-slate-800 transition-colors ${
                    isSelected ? 'text-sky-400 bg-sky-500/10 font-bold' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

