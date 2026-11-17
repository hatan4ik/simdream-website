import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(path.resolve(__dirname, '..', '..', 'app/globals.css'), 'utf8');

/** The declarations of every rule whose selector is exactly `selector`, joined. */
function declarations(selector: string): string {
  const found: string[] = [];
  for (let at = css.indexOf(`\n${selector} {`); at !== -1; at = css.indexOf(`\n${selector} {`, at + 1)) {
    found.push(css.slice(at, css.indexOf('}', at)));
  }
  expect(found.length, `a rule for ${selector}`).toBeGreaterThan(0);
  return found.join('\n');
}

describe('browser-drawn UI follows the active theme', () => {
  it('draws form controls and pickers dark in Cockpit Night, light in the daylight themes', () => {
    expect(declarations('html[data-ui="cockpit"]')).toContain('color-scheme: dark');
    expect(declarations('html[data-ui="brand"]')).toContain('color-scheme: light');
  });

  it('gives Clean Studio its white scrollbar track through the scrollbar variable', () => {
    expect(declarations('html[data-ui="brand"][data-look="studio"]')).toContain('--scrollbar-track: #ffffff');
  });

  it('no longer styles the Studio track through ::-webkit-scrollbar-track, which scrollbar-color overrides', () => {
    expect(css).not.toMatch(/data-look="studio"\]\s+::-webkit-scrollbar-track/);
  });
});
