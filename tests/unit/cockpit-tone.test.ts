import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COCKPIT_TONE_COLORS,
  COCKPIT_TONE_ORDER,
  COCKPIT_TONE_STORAGE_KEY,
  THEME_COLORS,
  THEME_ORDER,
} from '@/lib/theme/ui-theme-context';
import { LANGUAGES, translations } from '@/lib/i18n/translations';

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => Number.parseInt(clean.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('Cockpit Night palette tones', () => {
  it('defines classic, cobalt, and squadron palettes with classic matching default cockpit & tailwind token', () => {
    expect(COCKPIT_TONE_ORDER).toEqual(['classic', 'cobalt', 'squadron']);
    expect(THEME_ORDER).toEqual(['cockpit', 'brand', 'studio']);
    expect(COCKPIT_TONE_STORAGE_KEY).toBe('simdream_cockpit_tone');
    expect(COCKPIT_TONE_COLORS.classic.canvas).toBe('#070b14');
    expect(THEME_COLORS.cockpit).toBe(COCKPIT_TONE_COLORS.classic.canvas);
    expect(COCKPIT_TONE_COLORS.cobalt.canvas).toBe('#0C1A33');
    expect(COCKPIT_TONE_COLORS.squadron.canvas).toBe('#102547');

    const tailwindConfig = fs.readFileSync(path.join(process.cwd(), 'tailwind.config.ts'), 'utf8');
    expect(tailwindConfig).toContain('darkest: "#070b14"');
    expect(tailwindConfig).not.toContain('#050811');
  });

  it('ships non-empty localized labels for all cockpit tones in all 6 languages', () => {
    for (const { code } of LANGUAGES) {
      const uiTheme = translations[code].uiTheme;
      expect(uiTheme.toneClassic.trim().length).toBeGreaterThan(0);
      expect(uiTheme.toneCobalt.trim().length).toBeGreaterThan(0);
      expect(uiTheme.toneSquadron.trim().length).toBeGreaterThan(0);
      expect(uiTheme.toneLabel.trim().length).toBeGreaterThan(0);
      expect(uiTheme.switchToneLabel.trim().length).toBeGreaterThan(0);
      expect(new Set([uiTheme.toneClassic, uiTheme.toneCobalt, uiTheme.toneSquadron]).size).toBe(3);
    }
  });

  it('bootstraps simdream_cockpit_tone pre-paint in public/theme-bootstrap.js', () => {
    const bootstrap = fs.readFileSync(path.join(process.cwd(), 'public/theme-bootstrap.js'), 'utf8');
    expect(bootstrap).toContain('simdream_cockpit_tone');
    expect(bootstrap).toContain('data-cockpit-tone');
    expect(bootstrap).toContain("'cobalt'");
    expect(bootstrap).toContain("'squadron'");
  });

  it('satisfies WCAG 2.1 AA (>= 4.5:1) contrast on Cobalt-Navy and Squadron Mid-Navy surface ramps', () => {
    // Warmer Cobalt-Navy with lifted muted slate (#a9b9ce), sky-400 (#56b9e9), orange-400 (#ff7c4b)
    for (const bg of Object.values(COCKPIT_TONE_COLORS.cobalt).slice(0, 4)) {
      expect(contrastRatio('#f1f5f9', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#a9b9ce', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#56b9e9', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#ff7c4b', bg)).toBeGreaterThanOrEqual(4.5);
    }

    // Squadron Mid-Navy with lifted muted slate (#cbd5e1), sky-300 (#91d0f2), orange-300 (#ffab89)
    for (const bg of Object.values(COCKPIT_TONE_COLORS.squadron).slice(0, 4)) {
      expect(contrastRatio('#f1f5f9', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#cbd5e1', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#91d0f2', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#ffab89', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#6ee7b7', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#fcd34d', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#fca5a5', bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('paints the primary action brand orange with a chrome-navy label in the two navy tones only', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const token = (name: string) => new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6});`, 'i').exec(css)?.[1] ?? '';
    const orange500 = token('orange-500');
    const orange400 = token('orange-400');
    expect(orange500).toBe('#ff5500');

    // Every rule that colours a primary Button from the orange scale is scoped to Cobalt and Squadron:
    // Classic Night, SimDream Day and Clean Studio keep the cerulean pill.
    const NAVY_TONES = 'html[data-ui="cockpit"]:is([data-cockpit-tone="cobalt"], [data-cockpit-tone="squadron"])';
    const PRIMARY = '[data-ui-control="button"][data-button-variant="primary"]';
    const orangePrimaryRules = [...css.matchAll(/([^{};]+)\{([^{}]*)\}/g)]
      .map(([, prelude, body]) => ({ prelude: prelude!.trim(), body: body! }))
      .filter(({ prelude, body }) => prelude.includes(PRIMARY) && body.includes('--color-orange-'));
    expect(orangePrimaryRules.length).toBeGreaterThan(0);
    for (const { prelude } of orangePrimaryRules) {
      expect(prelude.split('html').length - 1, prelude).toBe(prelude.split(NAVY_TONES).length - 1);
    }

    const bodyOf = (selector: string) => orangePrimaryRules.find(({ prelude }) => prelude === selector)?.body ?? '';
    const resting = bodyOf(`${NAVY_TONES} ${PRIMARY}`);
    expect(resting).toContain('background-color: var(--color-orange-500) !important');
    expect(resting).toContain('border-color: var(--color-orange-500) !important');
    expect(resting).toContain('color: var(--cockpit-chrome) !important');
    const hover = bodyOf(`${NAVY_TONES} ${PRIMARY}:hover`);
    expect(hover).toContain('background-color: var(--color-orange-400) !important');

    // White on #FF5500 is 3.2:1, below WCAG AA for the 14-21px regular label; the chrome navy passes
    // on the resting fill and on the lighter hover fill.
    expect(contrastRatio('#ffffff', orange500)).toBeLessThan(4.5);
    for (const tone of ['cobalt', 'squadron'] as const) {
      expect(contrastRatio(COCKPIT_TONE_COLORS[tone].chrome, orange500)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(COCKPIT_TONE_COLORS[tone].chrome, orange400)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
