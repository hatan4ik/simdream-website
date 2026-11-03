'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type UiTheme = 'cockpit' | 'brand';

interface UiThemeContextType {
  theme: UiTheme;
  setTheme: (theme: UiTheme) => void;
  toggleTheme: () => void;
  isBrandTheme: boolean;
}

const UiThemeContext = createContext<UiThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'simdream_ui_theme';

/** Page backgrounds per theme (app/globals.css --background); also the browser-chrome tint. */
export const THEME_COLORS: Record<UiTheme, string> = {
  cockpit: '#070b14',
  brand: '#f8fafc',
};

/**
 * Applies the theme to the document: the data-ui attribute the stylesheet keys on, and the
 * theme-color meta that Android Chrome paints its toolbar with (Safari samples the page
 * instead, so the sticky navbar's own background carries the tint there).
 */
function applyThemeToDocument(theme: UiTheme): void {
  document.documentElement.setAttribute('data-ui', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

export function UiThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<UiTheme>('cockpit');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as UiTheme | null;
      if (savedTheme === 'brand' || savedTheme === 'cockpit') {
        setThemeState(savedTheme);
        applyThemeToDocument(savedTheme);
      } else {
        const currentAttr = document.documentElement.getAttribute('data-ui') as UiTheme | null;
        if (currentAttr === 'brand') {
          setThemeState('brand');
          applyThemeToDocument('brand');
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setTheme = (newTheme: UiTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage errors
    }
    applyThemeToDocument(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'cockpit' ? 'brand' : 'cockpit';
    setTheme(nextTheme);
  };

  return (
    <UiThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isBrandTheme: theme === 'brand',
      }}
    >
      {children}
    </UiThemeContext.Provider>
  );
}

export function useUiTheme() {
  const context = useContext(UiThemeContext);
  if (!context) {
    throw new Error('useUiTheme must be used within a UiThemeProvider');
  }
  return context;
}

