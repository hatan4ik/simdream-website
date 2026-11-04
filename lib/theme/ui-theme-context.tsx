'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Three interfaces (AGENTS.md §1.5):
 *   cockpit – Cockpit Night: dark slate, cerulean and orange accents (default)
 *   brand   – SimDream Day: cloud white with the brand colours
 *   studio  – Clean Studio: the daylight palette restyled after apple.com's mobile site
 *             (white surfaces, 17px tight type, pill buttons, slim translucent nav)
 * `studio` is layered on `brand`: the document carries data-ui="brand" plus data-look="studio",
 * so every daylight override keeps applying and globals.css adds only the studio restyle.
 */
export type UiTheme = 'cockpit' | 'brand' | 'studio';

export const THEME_ORDER: readonly UiTheme[] = ['cockpit', 'brand', 'studio'];

interface UiThemeContextType {
  theme: UiTheme;
  setTheme: (theme: UiTheme) => void;
  /** Advances to the next interface in THEME_ORDER. */
  toggleTheme: () => void;
  /** Light interfaces (brand and studio). */
  isBrandTheme: boolean;
  isStudioTheme: boolean;
}

const UiThemeContext = createContext<UiThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'simdream_ui_theme';

/** Page backgrounds per theme (app/globals.css --background); also the browser-chrome tint. */
export const THEME_COLORS: Record<UiTheme, string> = {
  cockpit: '#070b14',
  brand: '#f8fafc',
  studio: '#ffffff',
};

function isUiTheme(value: unknown): value is UiTheme {
  return THEME_ORDER.includes(value as UiTheme);
}

/**
 * Applies the theme to the document: the data-ui / data-look attributes the stylesheet keys
 * on, and the theme-color meta that Android Chrome paints its toolbar with (Safari samples
 * the page instead, so the sticky navbar's own background carries the tint there).
 * public/theme-bootstrap.js does the same before first paint.
 */
function applyThemeToDocument(theme: UiTheme): void {
  const root = document.documentElement;
  root.setAttribute('data-ui', theme === 'cockpit' ? 'cockpit' : 'brand');
  if (theme === 'studio') root.setAttribute('data-look', 'studio');
  else root.removeAttribute('data-look');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

/** The theme the bootstrap script already applied, read back from the document. */
function themeFromDocument(): UiTheme {
  const root = document.documentElement;
  if (root.getAttribute('data-look') === 'studio') return 'studio';
  return root.getAttribute('data-ui') === 'brand' ? 'brand' : 'cockpit';
}

export function UiThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<UiTheme>('cockpit');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      const initial = isUiTheme(savedTheme) ? savedTheme : themeFromDocument();
      if (initial !== 'cockpit') {
        setThemeState(initial);
        applyThemeToDocument(initial);
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
    setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]);
  };

  return (
    <UiThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isBrandTheme: theme !== 'cockpit',
        isStudioTheme: theme === 'studio',
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

