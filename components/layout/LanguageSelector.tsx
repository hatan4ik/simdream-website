'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/language-context';
import { LANGUAGES, Language } from '@/lib/i18n/translations';
import { localizeInternalHref } from '@/lib/i18n/locale-routing';

/**
 * Language is a choice, not an action menu. The compact header control therefore exposes an
 * accessible listbox with roving keyboard focus, while the visual treatment stays understated.
 */
/**
 * `placement` decides which way the listbox opens. The header's inline selector drops down;
 * the phone drawer's selector must open upward, because the drawer lives inside the sticky
 * header and anything that hangs below the viewport there can never be scrolled into reach,
 * so the last languages became untappable once the drawer grew.
 */
export function LanguageSelector({
  variant = 'compact',
  placement = 'down',
}: {
  variant?: 'compact' | 'full';
  placement?: 'down' | 'up';
}) {
  const { language, setLanguage, currentLanguageInfo } = useLanguage();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = Math.max(0, LANGUAGES.findIndex((item) => item.code === language));

  const close = (restoreFocus = false) => {
    setIsOpen(false);
    setFocusIndex(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const open = (index: number | null = null) => {
    setIsOpen(true);
    setFocusIndex(index);
  };

  const choose = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    // The browser URL is the public language contract with Wix. Read it at the
    // click boundary so the destination retains the current path, query and hash.
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const nextHref = localizeInternalHref(currentHref, nextLanguage);
    if (nextHref !== currentHref) router.push(nextHref);
    close();
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        close(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  // Move focus immediately after the option is committed. Using a passive
  // effect here left keyboard users on the trigger on some React scheduling
  // paths, even though the listbox was visibly open.
  useLayoutEffect(() => {
    if (!isOpen || focusIndex === null) return;
    optionRefs.current[focusIndex]?.focus();
  }, [focusIndex, isOpen]);

  const moveFocus = (from: number, delta: number) => {
    const next = (from + delta + LANGUAGES.length) % LANGUAGES.length;
    setFocusIndex(next);
  };

  return (
    <div data-language-selector className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        data-language-selector-trigger
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            open(selectedIndex);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            open(LANGUAGES.length - 1);
          } else if (event.key === 'Escape') {
            close(true);
          }
        }}
        className={`flex min-h-11 items-center gap-1.5 rounded-full text-xs text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 touch-manipulation cursor-pointer ${
          variant === 'full' ? 'w-full justify-between px-3 py-2.5' : 'min-w-11 justify-center px-1.5 py-1.5 sm:px-2.5'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
      >
        <Globe className="h-4 w-4 text-sky-400" aria-hidden="true" />
        {variant === 'full' && <span className="font-medium">{currentLanguageInfo.nativeName}</span>}
        {variant === 'compact' && (
          <>
            <span className="font-semibold uppercase tracking-wide" aria-hidden="true">{currentLanguageInfo.code}</span>
            <span className="sr-only">{currentLanguageInfo.nativeName}</span>
          </>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''} ${variant === 'compact' ? 'hidden sm:block' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={currentLanguageInfo.nativeName}
          onKeyDown={(event) => {
            const current = focusIndex ?? selectedIndex;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              moveFocus(current, 1);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              moveFocus(current, -1);
            } else if (event.key === 'Home') {
              event.preventDefault();
              setFocusIndex(0);
            } else if (event.key === 'End') {
              event.preventDefault();
              setFocusIndex(LANGUAGES.length - 1);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              close(true);
            }
          }}
          data-placement={placement}
          className={`absolute right-0 rtl:right-auto rtl:left-0 w-48 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl py-1.5 z-50 text-xs ${
            placement === 'up' ? 'bottom-full mb-2' : 'mt-2'
          }`}
        >
          {LANGUAGES.map((lang, index) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => choose(lang.code as Language)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    choose(lang.code as Language);
                  }
                }}
                className={`w-full min-h-11 flex items-center justify-between px-3 py-2 text-left rtl:text-right hover:bg-slate-800 focus:outline-none focus-visible:bg-slate-800 transition-colors touch-manipulation cursor-pointer ${
                  isSelected ? 'text-sky-400 bg-sky-500/10 font-bold' : 'text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
