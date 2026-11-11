'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

export type UiTheme = 'cockpit' | 'brand' | 'studio';
export type CockpitTone = 'classic' | 'cobalt' | 'squadron';

export const THEME_ORDER: readonly UiTheme[] = ['cockpit', 'brand', 'studio'];
export const COCKPIT_TONE_ORDER: readonly CockpitTone[] = ['classic', 'cobalt', 'squadron'];

interface UiThemeContextType {
  theme: UiTheme;
  setTheme: (theme: UiTheme) => void;
  /** Advances to the next interface in THEME_ORDER. */
  toggleTheme: () => void;
  cockpitTone: CockpitTone;
  setCockpitTone: (tone: CockpitTone) => void;
  /** Switches to cockpit (if currently in a light theme) and cycles cockpit tones. */
  cycleCockpitTone: () => void;
  /** Light interfaces (brand and studio). */
  isBrandTheme: boolean;
  isStudioTheme: boolean;
}

const UiThemeContext = createContext<UiThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'simdream_ui_theme';
export const COCKPIT_TONE_STORAGE_KEY = 'simdream_cockpit_tone';

export const COCKPIT_TONE_COLORS: Record<
  CockpitTone,
  { chrome: string; canvas: string; card: string; well: string; border: string }
> = {
  classic: {
    chrome: '#020617',
    canvas: '#070b14',
    card: '#0f172a',
    well: '#1e293b',
    border: '#1e293b',
  },
  cobalt: {
    chrome: '#091428',
    canvas: '#0C1A33',
    card: '#13264A',
    well: '#1B335E',
    border: '#28467A',
  },
  squadron: {
    chrome: '#0C1D38',
    canvas: '#102547',
    card: '#17325E',
    well: '#21437A',
    border: '#315896',
  },
};

/** Page backgrounds per theme (app/globals.css --background); also the browser-chrome tint. */
export const THEME_COLORS: Record<UiTheme, string> = {
  cockpit: COCKPIT_TONE_COLORS.classic.canvas,
  brand: '#f8fafc',
  studio: '#ffffff',
};

function isValidTheme(value: string | null): value is UiTheme {
  return value === 'cockpit' || value === 'brand' || value === 'studio';
}

function isValidCockpitTone(value: string | null): value is CockpitTone {
  return value === 'classic' || value === 'cobalt' || value === 'squadron';
}

function applyThemeToDocument(theme: UiTheme, cockpitTone: CockpitTone): void {
  const root = document.documentElement;
  root.setAttribute('data-ui', theme === 'cockpit' ? 'cockpit' : 'brand');
  if (theme === 'studio') root.setAttribute('data-look', 'studio');
  else root.removeAttribute('data-look');

  if (theme === 'cockpit') root.setAttribute('data-cockpit-tone', cockpitTone);
  else root.removeAttribute('data-cockpit-tone');

  const metaColor =
    theme === 'cockpit' ? COCKPIT_TONE_COLORS[cockpitTone].canvas : THEME_COLORS[theme];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', metaColor);
}

/**
 * Provides active UI interface state, Cockpit Night palette tone, and DOM synchronization.
 */
export function UiThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<UiTheme>('brand');
  const [cockpitTone, setCockpitToneState] = useState<CockpitTone>('classic');
  const themeRef = useRef<UiTheme>('brand');
  const toneRef = useRef<CockpitTone>('classic');

  useEffect(() => {
    let initialTheme: UiTheme = 'brand';
    let initialTone: CockpitTone = 'classic';
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (isValidTheme(savedTheme)) {
        initialTheme = savedTheme;
      }
      const savedTone = localStorage.getItem(COCKPIT_TONE_STORAGE_KEY);
      if (isValidCockpitTone(savedTone)) {
        initialTone = savedTone;
      }
    } catch {
      // Storage unavailable (private browsing / restricted context)
    }

    themeRef.current = initialTheme;
    toneRef.current = initialTone;
    if (initialTheme !== 'brand') {
      setThemeState(initialTheme);
    }
    if (initialTone !== 'classic') {
      setCockpitToneState(initialTone);
    }
    applyThemeToDocument(initialTheme, initialTone);
  }, []);

  const setTheme = (newTheme: UiTheme) => {
    themeRef.current = newTheme;
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Storage unavailable
    }
    applyThemeToDocument(newTheme, toneRef.current);
  };

  const toggleTheme = () => {
    const nextIndex = (THEME_ORDER.indexOf(themeRef.current) + 1) % THEME_ORDER.length;
    setTheme(THEME_ORDER[nextIndex]);
  };

  const setCockpitTone = (newTone: CockpitTone) => {
    toneRef.current = newTone;
    themeRef.current = 'cockpit';
    setCockpitToneState(newTone);
    setThemeState('cockpit');
    try {
      localStorage.setItem(COCKPIT_TONE_STORAGE_KEY, newTone);
      localStorage.setItem(THEME_STORAGE_KEY, 'cockpit');
    } catch {
      // Storage unavailable
    }
    applyThemeToDocument('cockpit', newTone);
  };

  const cycleCockpitTone = () => {
    if (themeRef.current !== 'cockpit') {
      const entryTone = toneRef.current === 'classic' ? 'cobalt' : toneRef.current;
      setCockpitTone(entryTone);
      return;
    }
    const nextIndex = (COCKPIT_TONE_ORDER.indexOf(toneRef.current) + 1) % COCKPIT_TONE_ORDER.length;
    setCockpitTone(COCKPIT_TONE_ORDER[nextIndex]);
  };

  const isBrandTheme = theme !== 'cockpit';
  const isStudioTheme = theme === 'studio';

  return (
    <UiThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        cockpitTone,
        setCockpitTone,
        cycleCockpitTone,
        isBrandTheme,
        isStudioTheme,
      }}
    >
      {children}
    </UiThemeContext.Provider>
  );
}

/**
 * Reads and updates the active UI interface theme and Cockpit Night palette tone.
 */
export function useUiTheme() {
  const context = useContext(UiThemeContext);
  if (!context) {
    throw new Error('useUiTheme must be used within UiThemeProvider');
  }
  return context;
}
