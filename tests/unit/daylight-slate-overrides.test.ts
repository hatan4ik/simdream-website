import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { daylightSlateOverrides, slateFillClasses, uncoveredSlateFills } from './_support/daylight-slate';
import { literalTexts, parseSource, REPO_ROOT, sourceFiles } from './_support/source';

/**
 * Brand Daylight recolours the cockpit's slate fills class by class (app/globals.css, under
 * `html[data-ui="brand"]`), and Clean Studio is layered on top of it. A fill whose exact class has no
 * override stays near-black while its text is remapped to dark ink: the phone menu panel
 * (`bg-slate-950/98`, missing next to /95) was unreadable in daylight for exactly that reason, and the
 * axe suite could not see it because axe reports a translucent, overlapping panel as "incomplete".
 *
 * This guard reads every slate fill class used by the application source and requires an override for
 * each one whose shade Brand Daylight already re-colours.
 */

/**
 * Accepted exceptions: class -> why it may stay dark in daylight. Keep this list short. An entry that
 * is no longer used, or that gained an override, fails the test so the list cannot go stale.
 */
const ALLOWED_UNCOVERED: Readonly<Record<string, string>> = {
  'from-slate-950/80':
    'components/blog/BlogCard.tsx: scrim over the cover photo (lg:hidden). It carries no text, so staying dark is correct in every theme.',
  // Visible daylight defects found by this guard (dark gradient stops under dark ink), fixed in the next commit.
  'from-slate-900/60': 'app/(public)/subscriptions/page.tsx: pillar cards have a dark top edge.',
  'via-slate-900/60': 'components/experiences/WorldRoutesSection.tsx: the route-choice panel has a dark middle band.',
  'to-slate-950/80': 'components/experiences/WorldRoutesSection.tsx: the route-choice panel has a dark bottom edge.',
  'via-slate-950/90': 'components/pro/ProSessionsView.tsx: the recommended PRO card has a dark middle band (changes the /pro visual baselines).',
};

const GLOBALS_CSS = readFileSync(path.join(REPO_ROOT, 'app/globals.css'), 'utf8');

/** Slate fill classes by the files that use them. Comments are ignored: only string, template and JSX text count. */
function slateFillsInSource(): Map<string, string[]> {
  const used = new Map<string, string[]>();
  for (const file of sourceFiles('app', 'components', 'lib')) {
    const relative = path.relative(REPO_ROOT, file);
    for (const text of literalTexts(parseSource(file))) {
      for (const className of slateFillClasses(text)) {
        used.set(className, [...(used.get(className) ?? []), relative]);
      }
    }
  }
  return used;
}

describe('slate fill class extraction', () => {
  it('finds plain, opacity, variant and gradient-stop fills', () => {
    expect(
      slateFillClasses(
        'flex bg-slate-950/98 hover:bg-slate-900/40 md:focus-visible:bg-slate-800 from-slate-900/60 via-slate-950 to-slate-950/80'
      )
    ).toEqual([
      'bg-slate-950/98',
      'hover:bg-slate-900/40',
      'md:focus-visible:bg-slate-800',
      'from-slate-900/60',
      'via-slate-950',
      'to-slate-950/80',
    ]);
  });

  it('ignores neighbours that are not slate fills', () => {
    expect(slateFillClasses('bg-slate-950/98x text-slate-300 border-slate-800 bg-sky-500/10 xbg-slate-900 bg-slate-950/[0.98]')).toEqual([]);
  });
});

describe('Brand Daylight override extraction', () => {
  const css = `
    /* bg-slate-950/55 only appears in this comment */
    html[data-ui="brand"] .bg-slate-950\\/70,
    html[data-ui="brand"] .bg-slate-950\\/95 { background-color: #fff !important; }
    html[data-ui="brand"] .hover\\:bg-slate-900\\/60:hover { background-color: #f1f5f9 !important; }
    html[data-ui="brand"] .group:hover .group-hover\\:bg-slate-700 { background-color: #e2e8f0 !important; }
    html[data-ui="brand"] .fixed.inset-0.bg-slate-950\\/80 { background-color: rgba(15, 23, 42, 0.45) !important; }
    html[data-look="studio"] .bg-slate-950\\/98 { background-color: #fff !important; }
    html[data-ui="cockpit"] .bg-slate-950\\/99 { background-color: #000 !important; }
    @media (min-width: 640px) {
      html[data-ui="brand"] .sm\\:bg-slate-900 { background-color: #fff !important; }
    }
  `;

  it('reads single-class subjects under the brand scope, including pseudo-classes and media queries', () => {
    expect([...daylightSlateOverrides(css)].sort()).toEqual([
      'bg-slate-950/70',
      'bg-slate-950/95',
      'group-hover:bg-slate-700',
      'hover:bg-slate-900/60',
      'sm:bg-slate-900',
    ]);
  });

  it('does not count comments, other scopes or compound scrim selectors as coverage', () => {
    const overrides = daylightSlateOverrides(css);
    for (const className of ['bg-slate-950/55', 'bg-slate-950/98', 'bg-slate-950/99', 'bg-slate-950/80']) {
      expect(overrides.has(className), className).toBe(false);
    }
  });

  it('reports a fill whose opacity has no override, but only for shades daylight already recolours', () => {
    const overrides = daylightSlateOverrides(css);
    const used = ['bg-slate-950/95', 'bg-slate-950/98', 'hover:bg-slate-900/40', 'bg-slate-500', 'bg-slate-600/50'];
    expect(uncoveredSlateFills(used, overrides, new Set())).toEqual(['bg-slate-950/98', 'hover:bg-slate-900/40']);
    expect(uncoveredSlateFills(used, overrides, new Set(['bg-slate-950/98']))).toEqual(['hover:bg-slate-900/40']);
  });
});

describe('Brand Daylight covers every slate fill the application uses', () => {
  const used = slateFillsInSource();
  const overrides = daylightSlateOverrides(GLOBALS_CSS);

  it('scans real source and real overrides (the guard is not vacuous)', () => {
    expect(used.size).toBeGreaterThan(15);
    expect(used.has('bg-slate-950')).toBe(true);
    expect(overrides.has('bg-slate-950/95')).toBe(true);
    expect(overrides.size).toBeGreaterThan(40);
  });

  it('has an html[data-ui="brand"] override for every (utility, shade, opacity) in use', () => {
    const uncovered = uncoveredSlateFills(used.keys(), overrides, new Set(Object.keys(ALLOWED_UNCOVERED))).map(
      (className) => `${className}  (${[...new Set(used.get(className))].join(', ')})`
    );
    expect(
      uncovered,
      'Add the class to its html[data-ui="brand"] group in app/globals.css (same value as its /95 or /90 neighbour), ' +
        'or list it in ALLOWED_UNCOVERED with the reason it may stay dark in daylight'
    ).toEqual([]);
  });

  it('keeps the allow-list honest', () => {
    const uncovered = new Set(uncoveredSlateFills(used.keys(), overrides, new Set()));
    for (const className of Object.keys(ALLOWED_UNCOVERED)) {
      expect(used.has(className), `${className} is no longer used: remove it from ALLOWED_UNCOVERED`).toBe(true);
      expect(uncovered.has(className), `${className} now has a daylight override: remove it from ALLOWED_UNCOVERED`).toBe(true);
    }
  });
});
