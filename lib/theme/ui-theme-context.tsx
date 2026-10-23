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

export function UiThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<UiTheme>('cockpit');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as UiTheme | null;
      if (savedTheme === 'brand' || savedTheme === 'cockpit') {
        setThemeState(savedTheme);
        document.documentElement.setAttribute('data-ui', savedTheme);
      } else {
        const currentAttr = document.documentElement.getAttribute('data-ui') as UiTheme | null;
        if (currentAttr === 'brand') {
          setThemeState('brand');
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
    document.documentElement.setAttribute('data-ui', newTheme);
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

